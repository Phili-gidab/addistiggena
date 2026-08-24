import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketStatus, TicketType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

/** Guarantee window: 5 days from COMPLETED (spec section 5). */
const GUARANTEE_DAYS = 5;
/** Support refund auto-approval cap in ETB; above it routes to Ops/Admin (spec section 5). */
const DEFAULT_REFUND_CAP_ETB = 500;

const TICKET_INCLUDE = {
  booking: {
    select: {
      id: true,
      status: true,
      completedAt: true,
      category: { select: { nameEn: true, nameAm: true } },
      customer: { select: { id: true, name: true, phone: true, telegramChatId: true } },
      provider: { select: { user: { select: { id: true, name: true, phone: true } } } },
    },
  },
  openedBy: { select: { id: true, name: true, phone: true, role: true } },
  resolvedBy: { select: { id: true, name: true, role: true } },
} as const;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  guaranteeUntil(completedAt: Date | null): Date | null {
    if (!completedAt) return null;
    return new Date(completedAt.getTime() + GUARANTEE_DAYS * 24 * 60 * 60 * 1000);
  }

  async refundCapEtb(): Promise<number> {
    const row = await this.prisma.appConfig.findUnique({ where: { key: 'support_refund_cap_etb' } });
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) ? n : DEFAULT_REFUND_CAP_ETB;
  }

  /** Customer dispute ("something is wrong") or guarantee claim; technician safety flag. */
  async open(user: AuthUser, bookingId: string, type: TicketType, note: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: { select: { userId: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isCustomer = booking.customerId === user.userId;
    const isProvider = booking.provider?.userId === user.userId;
    if (!isCustomer && !isProvider) throw new ForbiddenException('Not a party to this booking');

    if (type === 'GUARANTEE_CLAIM') {
      if (!isCustomer) throw new ForbiddenException('Only the customer can file a guarantee claim');
      if (!['COMPLETED', 'PAID'].includes(booking.status)) {
        throw new BadRequestException('Guarantee claims apply to completed jobs');
      }
      const until = this.guaranteeUntil(booking.completedAt);
      if (!until || until.getTime() < Date.now()) {
        throw new BadRequestException(`The ${GUARANTEE_DAYS}-day guarantee window has closed`);
      }
    } else {
      if (['CANCELLED', 'EXPIRED'].includes(booking.status)) {
        throw new BadRequestException('This booking is no longer active');
      }
    }

    const existing = await this.prisma.supportTicket.findFirst({
      where: { bookingId, type, status: { in: ['OPEN', 'RE_INSPECTION'] } },
    });
    if (existing) {
      throw new BadRequestException('A ticket of this type is already open for this booking');
    }

    const [ticket] = await this.prisma.$transaction([
      this.prisma.supportTicket.create({
        data: { bookingId, openedById: user.userId, type, note },
        include: TICKET_INCLUDE,
      }),
      this.prisma.booking.update({ where: { id: bookingId }, data: { disputedAt: new Date() } }),
    ]);
    return ticket;
  }

  async mine(user: AuthUser) {
    return this.prisma.supportTicket.findMany({
      where: { openedById: user.userId },
      include: TICKET_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async queue(status?: TicketStatus) {
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : { status: { in: ['OPEN', 'RE_INSPECTION'] } },
      include: TICKET_INCLUDE,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  /** Support schedules a re-inspection (guarantee flow REOPENED to RE_INSPECTION). */
  async reinspect(actor: AuthUser, id: string, note?: string) {
    const ticket = await this.getOpen(id);
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: 'RE_INSPECTION', resolutionNote: note ?? ticket.resolutionNote },
      include: TICKET_INCLUDE,
    });
    const jobRef = ticket.bookingId.slice(-6);
    this.notifications.notify(
      updated.booking.customer,
      `Addis Tiggena: የድጋሚ ምርመራ ተይዟል · a re-inspection has been scheduled for job #${jobRef}. Our team will contact you.`,
    );
    this.audit.log(actor, 'TICKET_REINSPECT', 'SupportTicket', id, note);
    return updated;
  }

  /** Close the loop: RESOLVED with notes (and an optional recorded refund) or REJECTED. */
  async close(
    actor: AuthUser,
    id: string,
    outcome: 'RESOLVED' | 'REJECTED',
    resolutionNote: string,
    refundEtb?: number,
  ) {
    const ticket = await this.getOpen(id);
    if (outcome === 'RESOLVED' && refundEtb && actor.role === 'SUPPORT_AGENT') {
      const cap = await this.refundCapEtb();
      if (refundEtb > cap) {
        throw new ForbiddenException(
          `Refunds above the ETB ${cap} cap need an Operations Manager or Super Admin`,
        );
      }
    }
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: outcome,
        resolutionNote,
        refundEtb: outcome === 'RESOLVED' ? refundEtb : undefined,
        resolvedById: actor.userId,
        resolvedAt: new Date(),
      },
      include: TICKET_INCLUDE,
    });
    // clear the dispute badge once nothing is open on the booking anymore
    const stillOpen = await this.prisma.supportTicket.count({
      where: { bookingId: ticket.bookingId, status: { in: ['OPEN', 'RE_INSPECTION'] } },
    });
    if (stillOpen === 0) {
      await this.prisma.booking.update({
        where: { id: ticket.bookingId },
        data: { disputedAt: null },
      });
    }
    const jobRef = ticket.bookingId.slice(-6);
    const refundNote =
      refundEtb && outcome === 'RESOLVED' ? ` Recorded refund: ETB ${refundEtb}.` : '';
    this.notifications.notify(
      updated.booking.customer,
      outcome === 'RESOLVED'
        ? `Addis Tiggena: ጉዳይዎ ተፈትቷል · your report on job #${jobRef} is resolved. ${resolutionNote}${refundNote}`
        : `Addis Tiggena: job #${jobRef} - ${resolutionNote}`,
    );
    this.audit.log(actor, `TICKET_${outcome}`, 'SupportTicket', id, resolutionNote, {
      refundEtb: refundEtb ?? null,
    });
    return updated;
  }

  private async getOpen(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!['OPEN', 'RE_INSPECTION'].includes(ticket.status)) {
      throw new BadRequestException('Ticket is already closed');
    }
    return ticket;
  }
}

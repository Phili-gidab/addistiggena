import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { ProvidersService } from '../providers/providers.service';
import { AUTO_CONFIRM_MS, PaymentsService } from '../payments/payments.service';
import {
  CancelBookingDto,
  CompleteBookingDto,
  CreateBookingDto,
  SendMessageDto,
} from './bookings.dto';

const OFFER_WINDOW_MS = 90_000; // provider has 90 seconds to respond (proposal §4.2)

/** Average urban travel speed used for the ETA estimate - Addis traffic, mixed transport. */
const AVG_SPEED_KMH = 18;

/** Advisory-lock key so only ONE api instance runs the sweep at a time (multi-replica safe). */
const SWEEP_LOCK_KEY = 874203001;

/** How the booking + relations are returned to clients - contact fields limited to id/name/phone.
 *  telegramChatId is dispatch-internal and must never appear in an HTTP response. */
const PUBLIC_INCLUDE = {
  category: true,
  customer: { select: { id: true, name: true, phone: true } },
  provider: { include: { user: { select: { id: true, name: true, phone: true } } } },
  payment: true,
  review: true,
} satisfies Prisma.BookingInclude;

/** Allowed transitions: action → { from-states, actor } */
const TRANSITIONS: Record<
  string,
  { from: BookingStatus[]; actor: 'provider' | 'customer'; to: BookingStatus; stamp: keyof Booking }
> = {
  accept: { from: ['REQUESTED'], actor: 'provider', to: 'ACCEPTED', stamp: 'acceptedAt' },
  reject: { from: ['REQUESTED'], actor: 'provider', to: 'REJECTED', stamp: 'updatedAt' },
  enroute: { from: ['ACCEPTED'], actor: 'provider', to: 'EN_ROUTE', stamp: 'enRouteAt' },
  arrive: { from: ['ACCEPTED', 'EN_ROUTE'], actor: 'provider', to: 'ARRIVED', stamp: 'arrivedAt' },
  start: { from: ['ARRIVED'], actor: 'provider', to: 'IN_PROGRESS', stamp: 'startedAt' },
  complete: { from: ['IN_PROGRESS'], actor: 'provider', to: 'COMPLETED', stamp: 'completedAt' },
};

/** Status changes mirrored to the customer over SMS/Telegram (proposal §3: connectivity resilience). */
const STATUS_MIRRORS: Partial<Record<string, (b: { id: string }) => string>> = {
  accept: (b) => `Addis Tiggena: ባለሙያው ተቀብሏል · your technician accepted job #${b.id.slice(-6)}`,
  enroute: (b) => `Addis Tiggena: ባለሙያው በመንገድ ላይ ነው · technician en route for job #${b.id.slice(-6)}`,
  arrive: (b) => `Addis Tiggena: ባለሙያው ደርሷል · technician arrived for job #${b.id.slice(-6)}`,
  complete: (b) =>
    `Addis Tiggena: ስራው ተጠናቋል · job #${b.id.slice(-6)} completed - open the app to pay`,
};

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class BookingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingsService.name);
  private sweepTimer?: NodeJS.Timeout;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly providers: ProvidersService,
    private readonly payments: PaymentsService,
  ) {}

  /** Background sweep: expire lapsed 90s offers (re-dispatching) and auto-confirm stale COMPLETED jobs. */
  onModuleInit() {
    this.sweepTimer = setInterval(() => void this.sweep(), 15_000);
    this.sweepTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  private async sweep() {
    if (this.sweeping) return; // don't overlap slow sweeps within this process
    this.sweeping = true;
    try {
      // Cross-instance mutual exclusion: a transaction-scoped advisory lock means at
      // most one api replica processes each tick (auto-released at transaction end).
      await this.prisma.$transaction(
        async (tx) => {
          const rows = await tx.$queryRaw<{ locked: boolean }[]>`
            SELECT pg_try_advisory_xact_lock(${SWEEP_LOCK_KEY}) AS "locked"`;
          if (!rows[0]?.locked) return;
          await this.sweepOnce();
        },
        { timeout: 60_000 },
      );
    } catch (err) {
      this.logger.error(`Sweep failed: ${(err as Error).message}`);
    } finally {
      this.sweeping = false;
    }
  }

  private async sweepOnce() {
    // 1) offers whose 90s window lapsed → mark EXPIRED, cascade to the next candidate
    const lapsed = await this.prisma.booking.findMany({
      where: { status: 'REQUESTED', offerExpiresAt: { lt: new Date() } },
      select: { id: true },
    });
    for (const b of lapsed) {
      await this.prisma.bookingOffer.updateMany({
        where: { bookingId: b.id, outcome: 'PENDING' },
        data: { outcome: 'EXPIRED' },
      });
      await this.offerToNext(b.id);
    }
    if (lapsed.length > 0) this.logger.log(`Re-dispatched ${lapsed.length} lapsed offer(s)`);

    // 2) auto-dispatch bookings stranded before their first offer (dispatch crashed mid-create)
    const stranded = await this.prisma.booking.findMany({
      where: {
        status: 'REQUESTED',
        offerExpiresAt: null,
        createdAt: { lt: new Date(Date.now() - 30_000) },
      },
      select: { id: true },
    });
    for (const b of stranded) await this.offerToNext(b.id);

    // 3) COMPLETED jobs past the 30-minute window → auto-confirm as cash
    const stale = await this.prisma.booking.findMany({
      where: { status: 'COMPLETED', completedAt: { lt: new Date(Date.now() - AUTO_CONFIRM_MS) } },
      select: { id: true },
    });
    for (const b of stale) {
      await this.payments
        .autoConfirmCash(b.id)
        .catch((err) =>
          this.logger.error(`Auto-confirm of ${b.id} failed: ${(err as Error).message}`),
        );
    }
  }

  async create(customerId: string, dto: CreateBookingDto) {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || !category.isActive) throw new BadRequestException('Unknown service category');

    if (dto.providerId) {
      const provider = await this.prisma.providerProfile.findUnique({
        where: { id: dto.providerId },
      });
      if (!provider || provider.verificationStatus !== 'VERIFIED' || !provider.isAvailable) {
        throw new BadRequestException('Selected technician is not available');
      }
      if (provider.categoryId !== dto.categoryId) {
        throw new BadRequestException('Technician does not offer this service');
      }
    }

    const created = await this.prisma.booking.create({
      data: {
        customerId,
        providerId: dto.providerId,
        categoryId: dto.categoryId,
        lat: dto.lat,
        lng: dto.lng,
        landmarkNote: dto.landmarkNote,
        description: dto.description,
        priceQuoteEtb: category.priceFloorEtb,
        offerExpiresAt: dto.providerId ? new Date(Date.now() + OFFER_WINDOW_MS) : null,
      },
    });

    if (dto.providerId) {
      // Customer picked this technician directly - record the offer and alert them.
      await this.prisma.bookingOffer.create({
        data: {
          bookingId: created.id,
          providerId: dto.providerId,
          expiresAt: created.offerExpiresAt!,
        },
      });
      this.notifyProvider(
        dto.providerId,
        `Addis Tiggena: አዲስ ስራ · new ${category.nameEn} job #${created.id.slice(-6)} - respond within 90s`,
      );
      return this.getPublic(created.id);
    }

    // "First available" - dispatch to the best-ranked nearby technician (proposal §4.1 step 04).
    // Never fail the request after the row exists: the sweeper rescues stranded bookings.
    try {
      return await this.offerToNext(created.id);
    } catch (err) {
      this.logger.error(`Initial dispatch of ${created.id} failed: ${(err as Error).message}`);
      return this.getPublic(created.id);
    }
  }

  private getPublic(id: string) {
    return this.prisma.booking.findUnique({ where: { id }, include: PUBLIC_INCLUDE });
  }

  private notifyProvider(providerId: string, text: string) {
    this.prisma.providerProfile
      .findUnique({
        where: { id: providerId },
        select: { user: { select: { phone: true, telegramChatId: true } } },
      })
      .then((p) => p && this.notifications.notify(p.user, text))
      .catch(() => {});
  }

  /**
   * Offer cascade: assign the next best candidate not yet offered this job, or expire
   * the booking when the pool is exhausted / nobody is online. All writes are guarded
   * on the exact pre-read state (status + providerId + offerExpiresAt), so a concurrent
   * accept, cancel, or competing cascade makes this call a harmless no-op.
   */
  private async offerToNext(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        category: true,
        customer: { select: { phone: true, telegramChatId: true } },
        offers: { select: { providerId: true } },
      },
    });
    if (!booking || booking.status !== 'REQUESTED') return this.getPublic(bookingId);

    // claim guard: the booking must still look exactly like what we just read
    const claim: Prisma.BookingWhereInput = {
      id: bookingId,
      status: 'REQUESTED',
      providerId: booking.providerId,
      offerExpiresAt: booking.offerExpiresAt,
    };

    const exclude = booking.offers.map((o) => o.providerId);
    const [next] = await this.providers.candidates(
      booking.lat,
      booking.lng,
      booking.categoryId,
      exclude,
    );

    if (!next) {
      const { count } = await this.prisma.booking.updateMany({
        where: claim,
        data: { status: 'EXPIRED', providerId: null, offerExpiresAt: null },
      });
      if (count > 0) {
        this.notifications.notify(
          booking.customer,
          `Addis Tiggena: ይቅርታ · no ${booking.category.nameEn} technician is available right now for job #${bookingId.slice(-6)} - please try again shortly`,
        );
        this.logger.log(
          `Booking ${bookingId} expired: candidate pool exhausted (${exclude.length} offered)`,
        );
      }
      return this.getPublic(bookingId);
    }

    const expiresAt = new Date(Date.now() + OFFER_WINDOW_MS);
    const { count } = await this.prisma.booking.updateMany({
      where: claim,
      data: { providerId: next.id, offerExpiresAt: expiresAt },
    });
    if (count === 0) {
      // someone else (accept, cancel, or a competing cascade) won the race - do nothing
      return this.getPublic(bookingId);
    }
    await this.prisma.bookingOffer.create({
      data: { bookingId, providerId: next.id, expiresAt },
    });
    this.notifications.notify(
      { phone: next.phone, telegramChatId: next.telegramChatId },
      `Addis Tiggena: አዲስ ስራ · new ${booking.category.nameEn} job #${bookingId.slice(-6)} ~${(next.distanceM / 1000).toFixed(1)}km away - respond within 90s`,
    );
    return this.getPublic(bookingId);
  }

  async mine(user: AuthUser) {
    if (user.role === 'PROVIDER') {
      const profile = await this.prisma.providerProfile.findUnique({
        where: { userId: user.userId },
      });
      if (!profile) return [];
      return this.prisma.booking.findMany({
        where: { providerId: profile.id },
        include: { category: true, customer: { select: { id: true, name: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }
    return this.prisma.booking.findMany({
      where: { customerId: user.userId },
      include: {
        category: true,
        provider: { include: { user: { select: { name: true } } } },
        payment: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getForParty(id: string, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: PUBLIC_INCLUDE,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const isCustomer = booking.customerId === user.userId;
    const isProvider = booking.provider?.user.id === user.userId;
    if (!isCustomer && !isProvider && user.role !== 'ADMIN') {
      throw new ForbiddenException('Not a party to this booking');
    }
    return booking;
  }

  async transition(id: string, action: keyof typeof TRANSITIONS, user: AuthUser, dto?: CompleteBookingDto) {
    const rule = TRANSITIONS[action];
    const booking = await this.getForParty(id, user);

    if (rule.actor === 'provider' && booking.provider?.user.id !== user.userId) {
      throw new ForbiddenException('Only the assigned technician can do this');
    }
    if (!rule.from.includes(booking.status)) {
      throw new BadRequestException(`Cannot ${action} a booking in ${booking.status} state`);
    }
    if (action === 'accept' && booking.offerExpiresAt && booking.offerExpiresAt < new Date()) {
      await this.prisma.bookingOffer.updateMany({
        where: { bookingId: id, providerId: booking.providerId ?? undefined, outcome: 'PENDING' },
        data: { outcome: 'EXPIRED' },
      });
      await this.offerToNext(id);
      throw new BadRequestException('Offer expired - the 90-second window has passed');
    }

    // A reject is not terminal: record the verdict and cascade to the next technician.
    // The guarded updateMany means that if the sweeper already expired this offer and
    // cascaded, the reject becomes a no-op instead of double-firing the cascade.
    if (action === 'reject') {
      const { count } = await this.prisma.bookingOffer.updateMany({
        where: { bookingId: id, providerId: booking.providerId ?? undefined, outcome: 'PENDING' },
        data: { outcome: 'REJECTED' },
      });
      if (count === 0) return this.getPublic(id);
      return this.offerToNext(id);
    }

    const now = new Date();
    const data: Record<string, unknown> = { status: rule.to };
    if (rule.stamp !== 'updatedAt') data[rule.stamp as string] = now;
    if (action === 'complete' && dto?.finalPriceEtb !== undefined) {
      data.finalPriceEtb = dto.finalPriceEtb;
    }
    if (action === 'accept') data.offerExpiresAt = null;

    // Optimistic guard: only commit if the booking is still in the state we validated -
    // pinned to this provider - so a concurrent sweep/cascade/cancel can't be clobbered.
    const guard: Prisma.BookingWhereInput = {
      id,
      status: { in: rule.from },
      providerId: booking.providerId,
      ...(action === 'accept'
        ? { OR: [{ offerExpiresAt: null }, { offerExpiresAt: { gte: now } }] }
        : {}),
    };
    const { count } = await this.prisma.booking.updateMany({ where: guard, data });
    if (count === 0) {
      throw new BadRequestException(
        `Booking state changed - cannot ${action} anymore (refresh to see the latest status)`,
      );
    }

    if (action === 'accept') {
      await this.prisma.bookingOffer.updateMany({
        where: { bookingId: id, providerId: booking.providerId ?? undefined, outcome: 'PENDING' },
        data: { outcome: 'ACCEPTED' },
      });
    }
    if (action === 'complete' && booking.providerId) {
      await this.prisma.providerProfile.update({
        where: { id: booking.providerId },
        data: { jobsCompleted: { increment: 1 } },
      });
    }

    // fire-and-forget mirror to the customer for key transitions (SMS + Telegram)
    const mirror = STATUS_MIRRORS[action];
    if (mirror && booking.customer) {
      this.notifications.notifyUserId(booking.customer.id, mirror(booking)).catch(() => {});
    }
    return this.getPublic(id);
  }

  /** Current technician position + ETA for an active booking - polled by the customer app. */
  async track(id: string, user: AuthUser) {
    const booking = await this.getForParty(id, user);
    const active: BookingStatus[] = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
    if (!booking.provider || !active.includes(booking.status)) {
      return { tracking: false as const };
    }
    const p = await this.prisma.providerProfile.findUnique({
      where: { id: booking.provider.id },
      select: { lat: true, lng: true, locationUpdatedAt: true },
    });
    if (p?.lat == null || p?.lng == null) return { tracking: false as const };
    const distanceM = Math.round(haversineM(p.lat, p.lng, booking.lat, booking.lng));
    const enRoute = booking.status === 'ACCEPTED' || booking.status === 'EN_ROUTE';
    return {
      tracking: true as const,
      lat: p.lat,
      lng: p.lng,
      updatedAt: p.locationUpdatedAt,
      distanceM,
      // straight-line estimate at Addis average speed; null once the technician is on site
      etaMinutes: enRoute
        ? Math.max(1, Math.round((distanceM / 1000 / AVG_SPEED_KMH) * 60))
        : null,
      booking: { lat: booking.lat, lng: booking.lng },
    };
  }

  // ── In-app chat (proposal §5.1 / §5.2 In-App Communication) ────────────────

  async messages(id: string, user: AuthUser) {
    await this.getForParty(id, user);
    return this.prisma.message.findMany({
      where: { bookingId: id },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async sendMessage(id: string, user: AuthUser, dto: SendMessageDto) {
    const booking = await this.getForParty(id, user);
    const closed: BookingStatus[] = ['REJECTED', 'EXPIRED', 'CANCELLED', 'PAID'];
    if (closed.includes(booking.status)) {
      throw new BadRequestException('Chat is closed for this booking');
    }
    return this.prisma.message.create({
      data: { bookingId: id, senderId: user.userId, text: dto.text },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
  }

  async cancel(id: string, user: AuthUser, dto: CancelBookingDto) {
    const booking = await this.getForParty(id, user);
    if (booking.customerId !== user.userId) {
      throw new ForbiddenException('Only the customer can cancel');
    }
    const cancellable: BookingStatus[] = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'];
    if (!cancellable.includes(booking.status)) {
      throw new BadRequestException(`Cannot cancel a booking in ${booking.status} state`);
    }
    // Guarded write: a booking that advanced (e.g. technician started) can't be cancelled
    // by a stale click, and the offer bookkeeping happens atomically with the cancel.
    const { count } = await this.prisma.$transaction(async (tx) => {
      const res = await tx.booking.updateMany({
        where: { id, status: { in: cancellable } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: dto.reason },
      });
      if (res.count > 0) {
        await tx.bookingOffer.updateMany({
          where: { bookingId: id, outcome: 'PENDING' },
          data: { outcome: 'SUPERSEDED' },
        });
      }
      return res;
    });
    if (count === 0) {
      throw new BadRequestException('Booking state changed - it can no longer be cancelled');
    }
    if (booking.provider) {
      this.notifications.notify(
        { phone: booking.provider.user.phone },
        `Addis Tiggena: ስራው ተሰርዟል · job #${booking.id.slice(-6)} was cancelled by the customer`,
      );
    }
    return this.getPublic(id);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PayoutStatus, Prisma, ReviewState, VerificationStatus } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

class VerdictDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class CommissionDto {
  @IsNumber()
  @Min(0)
  @Max(0.5)
  rate: number;
}

class ProviderQueueQuery {
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;
}

class PayoutQueueQuery {
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Provider verification queue (proposal §4.3 step 01) ────────────────────

  @Get('providers')
  providers(@Query() query: ProviderQueueQuery) {
    return this.prisma.providerProfile.findMany({
      where: { verificationStatus: query.status ?? 'PENDING' },
      include: { user: { select: { name: true, phone: true } }, category: true, documents: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('providers/:id/verify')
  verify(@Param('id') id: string) {
    return this.setVerification(id, 'VERIFIED');
  }

  @Post('providers/:id/reject')
  reject(@Param('id') id: string, @Body() dto: VerdictDto) {
    return this.setVerification(id, 'REJECTED', dto.note);
  }

  @Post('providers/:id/suspend')
  suspend(@Param('id') id: string, @Body() dto: VerdictDto) {
    return this.setVerification(id, 'SUSPENDED', dto.note);
  }

  private async setVerification(id: string, status: VerificationStatus, note?: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
    if (!profile) throw new NotFoundException('Provider not found');

    const [updated] = await this.prisma.$transaction([
      this.prisma.providerProfile.update({
        where: { id },
        data: {
          verificationStatus: status,
          verificationNote: note ?? null,
          // suspension/rejection forces the technician offline
          ...(status === 'VERIFIED' ? {} : { isAvailable: false }),
        },
      }),
      // mirror the verdict onto the pending documents so the review trail is complete
      this.prisma.providerDocument.updateMany({
        where: { providerId: id, state: 'PENDING' },
        data:
          status === 'VERIFIED'
            ? { state: 'APPROVED' }
            : status === 'REJECTED'
              ? { state: 'REJECTED', reviewNote: note ?? null }
              : {},
      }),
    ]);

    const messages: Record<VerificationStatus, string> = {
      VERIFIED:
        'Addis Tiggena: ተረጋግጠዋል · your technician profile is verified - go online to receive jobs!',
      REJECTED: `Addis Tiggena: ማመልከቻዎ ውድቅ ሆኗል · your application was rejected${note ? ` - ${note}` : ''}. You can re-apply with corrected documents.`,
      SUSPENDED: `Addis Tiggena: መለያዎ ታግዷል · your account is suspended${note ? ` - ${note}` : ''}.`,
      PENDING: 'Addis Tiggena: your application is back in review.',
    };
    this.notifications.notifyUserId(profile.user.id, messages[status]).catch(() => {});
    return updated;
  }

  // ── Booking oversight ──────────────────────────────────────────────────────

  @Get('bookings')
  bookings() {
    return this.prisma.booking.findMany({
      include: {
        category: true,
        customer: { select: { name: true, phone: true } },
        provider: { include: { user: { select: { name: true, phone: true } } } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ── Review moderation (published after 24h review, proposal §4.1) ──────────

  @Get('reviews')
  reviews() {
    return this.prisma.review.findMany({
      where: { state: 'PENDING' },
      include: { booking: { include: { provider: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('reviews/:id/publish')
  async publishReview(@Param('id') id: string) {
    return this.moderateReview(id, 'PUBLISHED');
  }

  @Post('reviews/:id/reject')
  async rejectReview(@Param('id') id: string) {
    return this.moderateReview(id, 'REJECTED');
  }

  private async moderateReview(id: string, state: ReviewState) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.state !== 'PENDING') throw new BadRequestException('Review already moderated');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.review.update({ where: { id }, data: { state } });
      if (state === 'PUBLISHED' && review.booking.providerId) {
        const provider = await tx.providerProfile.findUniqueOrThrow({
          where: { id: review.booking.providerId },
        });
        const newCount = provider.ratingCount + 1;
        const newAvg = (provider.ratingAvg * provider.ratingCount + review.stars) / newCount;
        await tx.providerProfile.update({
          where: { id: provider.id },
          data: { ratingCount: newCount, ratingAvg: Math.round(newAvg * 100) / 100 },
        });
      }
      return updated;
    });
  }

  // ── Payout processing (proposal §4.4 steps 09-10) ──────────────────────────

  @Get('payouts')
  payouts(@Query() query: PayoutQueueQuery) {
    return this.prisma.payout.findMany({
      where: { status: query.status ?? 'REQUESTED' },
      include: {
        wallet: {
          include: { provider: { include: { user: { select: { name: true, phone: true } } } } },
        },
      },
      orderBy: { requestedAt: 'asc' },
      take: 100,
    });
  }

  @Post('payouts/:id/process')
  async processPayout(@Param('id') id: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'REQUESTED') throw new BadRequestException('Payout already handled');
    // In production this is where the Telebirr/bank transfer API is called.
    return this.prisma.payout.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  @Post('payouts/:id/reject')
  async rejectPayout(@Param('id') id: string, @Body() dto: VerdictDto) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'REQUESTED') throw new BadRequestException('Payout already handled');
    // refund the reserved funds back to the wallet
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payout.update({
        where: { id },
        data: { status: 'REJECTED', processedAt: new Date() },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: payout.walletId,
          type: 'ADJUSTMENT',
          amountEtb: payout.amountEtb,
          note: `Payout rejected${dto.note ? ` - ${dto.note}` : ''} (refund)`,
        },
      });
      await tx.wallet.update({
        where: { id: payout.walletId },
        data: { balanceEtb: { increment: payout.amountEtb } },
      });
      return updated;
    });
  }

  // ── Analytics & KPI reporting (proposal §4.3 step 05) ──────────────────────

  @Get('analytics')
  async analytics() {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const [
      totalBookings,
      paidBookings,
      revenue,
      customers,
      verifiedProviders,
      pendingProviders,
      daily,
      byCategory,
    ] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: 'PAID' } }),
      this.prisma.payment.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amountEtb: true, commissionEtb: true },
      }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.providerProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
      this.prisma.providerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>(Prisma.sql`
        SELECT date_trunc('day', d)::date AS day,
               COUNT(b."id") AS count
        FROM generate_series(${since}::timestamp, now(), interval '1 day') AS d
        LEFT JOIN "Booking" b ON date_trunc('day', b."createdAt") = date_trunc('day', d)
        GROUP BY 1 ORDER BY 1`),
      this.prisma.booking.groupBy({ by: ['categoryId'], _count: { _all: true } }),
    ]);

    const categories = await this.prisma.serviceCategory.findMany({
      where: { id: { in: byCategory.map((c) => c.categoryId) } },
      select: { id: true, nameEn: true, nameAm: true },
    });
    const catName = new Map(categories.map((c) => [c.id, c]));

    return {
      totals: {
        bookings: totalBookings,
        paidBookings,
        grossRevenueEtb: revenue._sum.amountEtb ?? 0,
        commissionEtb: revenue._sum.commissionEtb ?? 0,
        customers,
        verifiedProviders,
        pendingProviders,
      },
      daily: daily.map((d) => ({ day: d.day, count: Number(d.count) })),
      byCategory: byCategory
        .map((c) => ({
          categoryId: c.categoryId,
          name: catName.get(c.categoryId)?.nameEn ?? '?',
          nameAm: catName.get(c.categoryId)?.nameAm ?? '',
          count: c._count._all,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  // ── Platform configuration ─────────────────────────────────────────────────

  @Get('config/commission')
  async commission() {
    const row = await this.prisma.appConfig.findUnique({ where: { key: 'commission_rate' } });
    return { rate: Number(row?.value ?? 0.1) };
  }

  @Put('config/commission')
  async setCommission(@Body() dto: CommissionDto) {
    await this.prisma.appConfig.upsert({
      where: { key: 'commission_rate' },
      update: { value: String(dto.rate) },
      create: { key: 'commission_rate', value: String(dto.rate) },
    });
    return { rate: dto.rate };
  }
}

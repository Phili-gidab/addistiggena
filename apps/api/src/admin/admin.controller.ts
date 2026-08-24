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
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PayoutStatus, Prisma, ReviewState, Role, VerificationStatus } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { normalizePhone } from '../auth/auth.dto';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, STAFF_ROLES } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { BookingsService } from '../bookings/bookings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

/** Roles Super Admin may hand out (spec section 3: only role that creates admin-level accounts). */
const CREATABLE_STAFF_ROLES = ['ADMIN', 'OPS_MANAGER', 'VERIFICATION_OFFICER', 'SUPPORT_AGENT'];

/** GPS stall detection threshold while EN_ROUTE (spec section 5). */
const GPS_STALL_MS = 15 * 60 * 1000;

class CreateStaffDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(9, 20)
  phone: string;

  @IsString()
  @Length(3, 40)
  @Matches(/^[a-z0-9._-]+$/i, { message: 'username: letters, digits, dot, dash, underscore only' })
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsIn(CREATABLE_STAFF_ROLES)
  role: Role;
}

class CategoryUpdateDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceFloorEtb?: number;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  nameAm?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  icon?: string;

  /** named sub-services, e.g. ["Mitad repair", "Socket & breaker fix"] */
  @IsOptional()
  @IsString({ each: true })
  subServices?: string[];
}

class CategoryCreateDto {
  @IsString()
  @Length(2, 80)
  nameEn: string;

  @IsString()
  @Length(1, 80)
  nameAm: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  icon?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceFloorEtb?: number;

  @IsOptional()
  @IsString({ each: true })
  subServices?: string[];
}

class RefundCapDto {
  @IsNumber()
  @Min(0)
  capEtb: number;
}

class AssignBookingDto {
  @IsString()
  providerId: string;

  @IsString()
  @Length(3, 500)
  reason: string;
}

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
@Roles(...STAFF_ROLES)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly bookingsService: BookingsService,
    private readonly audit: AuditService,
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
  @Roles('ADMIN', 'VERIFICATION_OFFICER')
  verify(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    this.audit.log(actor, 'PROVIDER_VERIFY', 'ProviderProfile', id);
    return this.setVerification(id, 'VERIFIED');
  }

  @Post('providers/:id/reject')
  @Roles('ADMIN', 'VERIFICATION_OFFICER')
  reject(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: VerdictDto) {
    this.audit.log(actor, 'PROVIDER_REJECT', 'ProviderProfile', id, dto.note);
    return this.setVerification(id, 'REJECTED', dto.note);
  }

  @Post('providers/:id/suspend')
  @Roles('ADMIN', 'OPS_MANAGER', 'VERIFICATION_OFFICER')
  suspend(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: VerdictDto) {
    this.audit.log(actor, 'PROVIDER_SUSPEND', 'ProviderProfile', id, dto.note);
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
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT')
  reviews() {
    return this.prisma.review.findMany({
      where: { state: 'PENDING' },
      include: { booking: { include: { provider: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('reviews/:id/publish')
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT')
  async publishReview(@Param('id') id: string) {
    return this.moderateReview(id, 'PUBLISHED');
  }

  @Post('reviews/:id/reject')
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT')
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
  @Roles('ADMIN')
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
  @Roles('ADMIN')
  async processPayout(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    this.audit.log(actor, 'PAYOUT_PROCESS', 'Payout', id);
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
  @Roles('ADMIN')
  async rejectPayout(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: VerdictDto,
  ) {
    this.audit.log(actor, 'PAYOUT_REJECT', 'Payout', id, dto.note);
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
  @Roles('ADMIN', 'OPS_MANAGER')
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
  @Roles('ADMIN', 'OPS_MANAGER')
  async setCommission(@CurrentUser() actor: AuthUser, @Body() dto: CommissionDto) {
    this.audit.log(actor, 'COMMISSION_SET', 'AppConfig', 'commission_rate', String(dto.rate));
    await this.prisma.appConfig.upsert({
      where: { key: 'commission_rate' },
      update: { value: String(dto.rate) },
      create: { key: 'commission_rate', value: String(dto.rate) },
    });
    return { rate: dto.rate };
  }

  // -- Ops queue: escalated dispatches + GPS-stalled en-route jobs (spec section 5) --

  @Get('ops/queue')
  @Roles('ADMIN', 'OPS_MANAGER')
  async opsQueue() {
    const stallBefore = new Date(Date.now() - GPS_STALL_MS);
    const include = {
      category: { select: { nameEn: true, nameAm: true } },
      customer: { select: { name: true, phone: true } },
      provider: {
        select: {
          id: true,
          locationUpdatedAt: true,
          user: { select: { name: true, phone: true } },
        },
      },
    } as const;
    const [escalated, enRoute] = await Promise.all([
      this.prisma.booking.findMany({
        where: { status: 'REQUESTED', escalatedAt: { not: null } },
        include,
        orderBy: { escalatedAt: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: { status: 'EN_ROUTE', enRouteAt: { lt: stallBefore } },
        include,
        orderBy: { enRouteAt: 'asc' },
      }),
    ]);
    const stalled = enRoute.filter(
      (b) => !b.provider?.locationUpdatedAt || b.provider.locationUpdatedAt < stallBefore,
    );
    return { escalated, stalled };
  }

  @Post('bookings/:id/assign')
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT')
  async assignBooking(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignBookingDto,
  ) {
    this.audit.log(actor, 'BOOKING_ASSIGN', 'Booking', id, dto.reason, {
      providerId: dto.providerId,
    });
    return this.bookingsService.assign(id, dto.providerId);
  }

  // -- Staff accounts (spec section 3: Super Admin only) ----------------------

  @Get('staff')
  @Roles('ADMIN')
  staff() {
    return this.prisma.user.findMany({
      where: { role: { in: CREATABLE_STAFF_ROLES as Role[] } },
      select: { id: true, name: true, phone: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('staff')
  @Roles('ADMIN')
  async createStaff(@CurrentUser() actor: AuthUser, @Body() dto: CreateStaffDto) {
    const phone = normalizePhone(dto.phone);
    const username = dto.username.toLowerCase();
    const clash = await this.prisma.user.findFirst({
      where: { OR: [{ phone }, { username }] },
      select: { id: true },
    });
    if (clash) throw new BadRequestException('Phone or username already in use');
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone,
        username,
        passwordHash: hashSync(dto.password, 10),
        role: dto.role,
        language: 'EN',
      },
      select: { id: true, name: true, phone: true, username: true, role: true, createdAt: true },
    });
    this.audit.log(actor, 'STAFF_CREATE', 'User', user.id, undefined, {
      role: dto.role,
      username,
    });
    return user;
  }

  // -- Audit log (spec section 8: every manual override, with reason) ---------

  @Get('audit')
  @Roles('ADMIN')
  auditLog() {
    return this.prisma.auditLog.findMany({
      include: { actor: { select: { name: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // -- Support refund cap (spec section 5) ------------------------------------

  @Get('config/refund-cap')
  async refundCap() {
    const row = await this.prisma.appConfig.findUnique({
      where: { key: 'support_refund_cap_etb' },
    });
    return { capEtb: Number(row?.value ?? 500) };
  }

  // -- Role-scoped dashboard KPIs (spec section 6 stat cards) -----------------

  @Get('overview')
  async overview() {
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const stallBefore = new Date(now - GPS_STALL_MS);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      activeJobs,
      awaitingDispatch,
      escalated,
      techniciansOnline,
      arrivals,
      openTickets,
      activeClaims,
      resolvedToday,
      resolvedWeek,
      pendingApplications,
      approvedThisWeek,
      flaggedForReview,
      enRouteOld,
    ] = await Promise.all([
      this.prisma.booking.count({
        where: { status: { in: ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] } },
      }),
      this.prisma.booking.count({ where: { status: 'REQUESTED' } }),
      this.prisma.booking.count({ where: { status: 'REQUESTED', escalatedAt: { not: null } } }),
      this.prisma.providerProfile.count({
        where: { isAvailable: true, verificationStatus: 'VERIFIED' },
      }),
      this.prisma.booking.findMany({
        where: { arrivedAt: { not: null, gte: weekAgo }, acceptedAt: { not: null } },
        select: { acceptedAt: true, arrivedAt: true },
        take: 200,
      }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'RE_INSPECTION'] } } }),
      this.prisma.supportTicket.count({
        where: { type: 'GUARANTEE_CLAIM', status: { in: ['OPEN', 'RE_INSPECTION'] } },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['RESOLVED', 'REJECTED'] }, resolvedAt: { gte: todayStart } },
      }),
      this.prisma.supportTicket.findMany({
        where: { resolvedAt: { not: null, gte: weekAgo } },
        select: { createdAt: true, resolvedAt: true },
        take: 200,
      }),
      this.prisma.providerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.providerProfile.count({
        where: { verificationStatus: 'VERIFIED', updatedAt: { gte: weekAgo } },
      }),
      this.prisma.providerProfile.count({ where: { verificationStatus: 'SUSPENDED' } }),
      this.prisma.booking.count({ where: { status: 'EN_ROUTE', enRouteAt: { lt: stallBefore } } }),
    ]);

    const avg = (xs: number[]) =>
      xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
    const avgArrivalMin = avg(
      arrivals.map((a) => (a.arrivedAt!.getTime() - a.acceptedAt!.getTime()) / 60000),
    );
    const avgResolutionMin = avg(
      resolvedWeek.map((t) => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 60000),
    );
    void dayAgo;

    return {
      ops: { activeJobs, awaitingDispatch, escalated, stalledEnRoute: enRouteOld, techniciansOnline, avgArrivalMin },
      support: { openTickets, activeClaims, resolvedToday, avgResolutionMin },
      verification: { pendingApplications, approvedThisWeek, flaggedForReview },
    };
  }

  // -- Technician directory (spec section 6: "Technicians (all)") -------------

  @Get('technicians')
  @Roles('ADMIN', 'OPS_MANAGER', 'VERIFICATION_OFFICER', 'SUPPORT_AGENT')
  async technicians() {
    const rows = await this.prisma.providerProfile.findMany({
      include: {
        user: { select: { name: true, phone: true } },
        category: { select: { nameEn: true, nameAm: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 300,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.user.name,
      phone: r.user.phone,
      category: r.category,
      subCity: r.subCity,
      verificationStatus: r.verificationStatus,
      isAvailable: r.isAvailable,
      ratingAvg: r.ratingAvg,
      ratingCount: r.ratingCount,
      jobs: r._count.bookings,
      lat: r.lat,
      lng: r.lng,
      locationUpdatedAt: r.locationUpdatedAt,
      createdAt: r.createdAt,
    }));
  }

  // -- Categories & pricing management (spec section 6 sidebar item) ----------

  @Get('categories')
  @Roles('ADMIN', 'OPS_MANAGER')
  adminCategories() {
    return this.prisma.serviceCategory.findMany({ orderBy: { nameEn: 'asc' } });
  }

  @Post('categories')
  @Roles('ADMIN', 'OPS_MANAGER')
  async createCategory(@CurrentUser() actor: AuthUser, @Body() dto: CategoryCreateDto) {
    const base = dto.nameEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40);
    let slug = base || 'category';
    for (let i = 2; await this.prisma.serviceCategory.findUnique({ where: { slug } }); i++) {
      slug = `${base}-${i}`;
    }
    const cat = await this.prisma.serviceCategory.create({
      data: {
        slug,
        nameEn: dto.nameEn,
        nameAm: dto.nameAm,
        icon: dto.icon ?? 'toolbox',
        priceFloorEtb: dto.priceFloorEtb ?? 250,
        subServices: (dto.subServices ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 30),
      },
    });
    this.audit.log(actor, 'CATEGORY_CREATE', 'ServiceCategory', cat.id, dto.nameEn);
    return cat;
  }

  @Put('categories/:id')
  @Roles('ADMIN', 'OPS_MANAGER')
  async updateCategory(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: CategoryUpdateDto,
  ) {
    const cat = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    this.audit.log(actor, 'CATEGORY_UPDATE', 'ServiceCategory', id, undefined, {
      priceFloorEtb: dto.priceFloorEtb ?? null,
      isActive: dto.isActive ?? null,
    });
    return this.prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(dto.priceFloorEtb != null ? { priceFloorEtb: dto.priceFloorEtb } : {}),
        ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
        ...(dto.nameEn ? { nameEn: dto.nameEn } : {}),
        ...(dto.nameAm ? { nameAm: dto.nameAm } : {}),
        ...(dto.icon ? { icon: dto.icon } : {}),
        ...(dto.subServices
          ? { subServices: dto.subServices.map((x) => x.trim()).filter(Boolean).slice(0, 30) }
          : {}),
      },
    });
  }

  // -- Settings: refund cap is editable by Admin/Ops (spec section 5) ---------

  @Put('config/refund-cap')
  @Roles('ADMIN', 'OPS_MANAGER')
  async setRefundCap(@CurrentUser() actor: AuthUser, @Body() dto: RefundCapDto) {
    this.audit.log(actor, 'REFUND_CAP_SET', 'AppConfig', 'support_refund_cap_etb', String(dto.capEtb));
    await this.prisma.appConfig.upsert({
      where: { key: 'support_refund_cap_etb' },
      update: { value: String(dto.capEtb) },
      create: { key: 'support_refund_cap_etb', value: String(dto.capEtb) },
    });
    return { capEtb: dto.capEtb };
  }
}

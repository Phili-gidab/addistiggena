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
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
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
import { Response } from 'express';
import {
  DepositMethod,
  DepositStatus,
  DocumentType,
  Prisma,
  ReviewState,
  Role,
  VerificationStatus,
} from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { normalizePhone } from '../auth/auth.dto';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, STAFF_ROLES } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { BookingsService } from '../bookings/bookings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

/** Everything the console shows about a staff account - never the password. */
const STAFF_FIELDS = {
  id: true,
  name: true,
  phone: true,
  username: true,
  role: true,
  subCity: true,
  disabledAt: true,
  createdAt: true,
} as const;

/** Roles Super Admin may hand out (spec section 3: only role that creates admin-level accounts). */
const CREATABLE_STAFF_ROLES = [
  'ADMIN',
  'OPS_MANAGER',
  'VERIFICATION_OFFICER',
  'SUPPORT_AGENT',
  'FINANCE_OFFICER',
  'SUBCITY_COORDINATOR',
];

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

  /** Required for SUBCITY_COORDINATOR - the sub-city they are responsible for. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  subCity?: string;
}

/** Onboarding a technician in the office/field, rather than waiting for them to
 *  self-register on the website. They sign in with phone OTP like any other
 *  technician, so no password is issued here. */
class CreateTechnicianDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(9, 20)
  phone: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  subCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  woreda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  yearsExperience?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  serviceRadiusKm?: number;

  /** Mark verified straight away (staff vetted the documents in person). */
  @IsOptional()
  @IsIn([true, false])
  verified?: boolean;

  /** Optional home base - without it dispatch cannot reach them until they go
   *  online in the app, which pings their GPS. */
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

/** Call-centre booking: staff take a job over the phone for a customer. */
class StaffBookingDto {
  @IsString()
  @Length(9, 20)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

  @IsString()
  categoryId: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  landmarkNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

/** Dispatch rules a Super Admin can tune without a redeploy. */
class DispatchRulesDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  offerWindowMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  escalateAfterAttempts?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(180)
  arrivalTargetMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  workingHours?: string;

  /** Deposit balance a technician must hold to keep being offered jobs. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  minWalletBalanceEtb?: number;
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

class DepositQueueQuery {
  @IsOptional()
  @IsEnum(DepositStatus)
  status?: DepositStatus;
}

/** Finance recording a top-up they can see on the company bank statement. */
class RecordDepositDto {
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @IsNumber()
  @Min(1)
  amountEtb: number;

  @IsEnum(DepositMethod)
  method: DepositMethod;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reference: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  /** Set when the officer has the slip in hand and is crediting immediately. */
  @IsOptional()
  @IsBoolean()
  confirmNow?: boolean;
}

/** Editing an existing staff account. Every field is optional - only what
 *  changed is sent. Password is only set when a reset was asked for. */
class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  subCity?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;
}

/** Staff uploading a document on a technician's behalf - the file is already
 *  in object storage via POST /uploads, this records what it is. */
class StaffDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  @IsNotEmpty()
  objectKey: string;
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

  /**
   * Upload paperwork on a technician's behalf. Most applicants bring their
   * Fayda ID and CoC certificate to the office in person, or send a photo over
   * the phone, so the verification desk needs to file it themselves rather than
   * wait for the technician to work out the app. The file itself goes through
   * POST /uploads first; this records what it is and who it belongs to.
   */
  @Post('providers/:id/documents')
  @Roles('ADMIN', 'VERIFICATION_OFFICER', 'OPS_MANAGER')
  async uploadDocumentFor(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: StaffDocumentDto,
  ) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Technician not found');
    const doc = await this.prisma.providerDocument.create({
      data: { providerId: id, type: dto.type, objectKey: dto.objectKey },
    });
    this.audit.log(actor, 'DOCUMENT_UPLOAD', 'ProviderProfile', id, dto.type);
    return doc;
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

  // ── Deposits: technicians pre-fund the commission they owe ─────────────────
  // The technician takes the customer's cash, so the platform never pays them
  // out. Instead they top up a wallet and each settled job debits commission.
  // Only a CONFIRMED deposit moves a balance - finance matches the reference
  // against the bank statement first.

  @Get('deposits')
  @Roles('ADMIN', 'FINANCE_OFFICER')
  deposits(@Query() query: DepositQueueQuery) {
    return this.prisma.deposit.findMany({
      where: query.status ? { status: query.status } : {},
      include: {
        wallet: {
          include: {
            provider: {
              include: { user: { select: { name: true, phone: true } }, category: true },
            },
          },
        },
        recordedBy: { select: { name: true, username: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  /** Wallet balances, lowest first - who is about to stop receiving jobs. */
  @Get('wallets')
  @Roles('ADMIN', 'FINANCE_OFFICER')
  async wallets() {
    const [rows, floorRow] = await Promise.all([
      this.prisma.wallet.findMany({
        include: {
          provider: {
            include: { user: { select: { name: true, phone: true } }, category: true },
          },
        },
        orderBy: { balanceEtb: 'asc' },
        take: 200,
      }),
      this.prisma.appConfig.findUnique({ where: { key: 'min_wallet_balance_etb' } }),
    ]);
    const floor = Number(floorRow?.value ?? 0);
    return {
      minBalanceEtb: Number.isFinite(floor) ? floor : 0,
      wallets: rows.map((w) => ({
        id: w.id,
        balanceEtb: Number(w.balanceEtb),
        blocked: Number(w.balanceEtb) < (Number.isFinite(floor) ? floor : 0),
        technician: w.provider.user.name ?? w.provider.user.phone,
        phone: w.provider.user.phone,
        trade: w.provider.category?.nameEn ?? null,
      })),
    };
  }

  /** Finance records a deposit they can see on the bank statement. */
  @Post('deposits')
  @Roles('ADMIN', 'FINANCE_OFFICER')
  async recordDeposit(@CurrentUser() actor: AuthUser, @Body() dto: RecordDepositDto) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id: dto.providerId },
    });
    if (!profile) throw new NotFoundException('Technician not found');
    const wallet = await this.prisma.wallet.upsert({
      where: { providerId: profile.id },
      update: {},
      create: { providerId: profile.id },
    });
    const clash = await this.prisma.deposit.findFirst({
      where: { walletId: wallet.id, reference: dto.reference.trim(), status: { not: 'REJECTED' } },
    });
    if (clash) throw new BadRequestException('That reference is already recorded');

    const deposit = await this.prisma.deposit.create({
      data: {
        walletId: wallet.id,
        amountEtb: new Prisma.Decimal(dto.amountEtb),
        method: dto.method,
        reference: dto.reference.trim(),
        note: dto.note?.trim() || null,
        recordedById: actor.userId,
      },
    });
    this.audit.log(actor, 'DEPOSIT_RECORD', 'Deposit', deposit.id, `${dto.amountEtb} ETB`);
    return dto.confirmNow ? this.confirmDeposit(actor, deposit.id) : deposit;
  }

  @Post('deposits/:id/confirm')
  @Roles('ADMIN', 'FINANCE_OFFICER')
  async confirmDeposit(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    const deposit = await this.prisma.deposit.findUnique({ where: { id } });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.status !== 'PENDING') throw new BadRequestException('Deposit already handled');
    this.audit.log(actor, 'DEPOSIT_CONFIRM', 'Deposit', id, `${deposit.amountEtb} ETB`);

    const settled = await this.prisma.$transaction(async (tx) => {
      // conditional claim: two officers confirming at once must credit once
      const { count } = await tx.deposit.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'CONFIRMED', settledAt: new Date(), recordedById: actor.userId },
      });
      if (count === 0) return null;
      await tx.walletTransaction.create({
        data: {
          walletId: deposit.walletId,
          type: 'DEPOSIT',
          amountEtb: deposit.amountEtb,
          note: `Deposit confirmed - ${deposit.method.replace(/_/g, ' ').toLowerCase()} ref ${deposit.reference}`,
        },
      });
      return tx.wallet.update({
        where: { id: deposit.walletId },
        data: { balanceEtb: { increment: deposit.amountEtb } },
        include: { provider: { include: { user: true } } },
      });
    });
    if (!settled) throw new BadRequestException('Deposit already handled');

    this.notifications.notify(
      settled.provider.user,
      `Addis Tiggena: ${deposit.amountEtb} ETB deposit confirmed. Balance ${settled.balanceEtb} ETB.`,
    );
    return this.prisma.deposit.findUnique({ where: { id } });
  }

  @Post('deposits/:id/reject')
  @Roles('ADMIN', 'FINANCE_OFFICER')
  async rejectDeposit(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: VerdictDto,
  ) {
    const deposit = await this.prisma.deposit.findUnique({ where: { id } });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.status !== 'PENDING') throw new BadRequestException('Deposit already handled');
    this.audit.log(actor, 'DEPOSIT_REJECT', 'Deposit', id, dto.note);
    // nothing was ever credited, so rejecting only closes the row
    return this.prisma.deposit.update({
      where: { id },
      data: {
        status: 'REJECTED',
        settledAt: new Date(),
        recordedById: actor.userId,
        note: dto.note ?? deposit.note,
      },
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
      select: STAFF_FIELDS,
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
    if (dto.role === 'SUBCITY_COORDINATOR' && !dto.subCity) {
      throw new BadRequestException('A sub-city coordinator needs a sub-city');
    }
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone,
        username,
        passwordHash: hashSync(dto.password, 10),
        role: dto.role,
        subCity: dto.role === 'SUBCITY_COORDINATOR' ? dto.subCity : null,
        language: 'EN',
      },
      select: STAFF_FIELDS,
    });
    this.audit.log(actor, 'STAFF_CREATE', 'User', user.id, undefined, {
      role: dto.role,
      username,
    });
    return user;
  }

  /** Edit an existing staff account: details, role, sub-city, password reset. */
  @Put('staff/:id')
  @Roles('ADMIN')
  async updateStaff(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const member = await this.prisma.user.findUnique({ where: { id } });
    if (!member || !CREATABLE_STAFF_ROLES.includes(member.role)) {
      throw new NotFoundException('Staff account not found');
    }
    const role = dto.role ?? member.role;
    const subCity = dto.subCity ?? member.subCity;
    if (role === 'SUBCITY_COORDINATOR' && !subCity) {
      throw new BadRequestException('A sub-city coordinator needs a sub-city');
    }
    // The last enabled Super Admin must stay a Super Admin, or nobody can
    // administer the platform again.
    if (member.role === 'ADMIN' && role !== 'ADMIN') {
      await this.assertNotLastAdmin(id, 'change the role of');
    }
    if (dto.phone) {
      const phone = normalizePhone(dto.phone);
      const clash = await this.prisma.user.findFirst({
        where: { phone, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new BadRequestException('That phone is already in use');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        phone: dto.phone ? normalizePhone(dto.phone) : undefined,
        role: dto.role ?? undefined,
        subCity: role === 'SUBCITY_COORDINATOR' ? subCity : null,
        passwordHash: dto.password ? hashSync(dto.password, 10) : undefined,
      },
      select: STAFF_FIELDS,
    });
    this.audit.log(actor, 'STAFF_UPDATE', 'User', id, undefined, {
      role: updated.role,
      passwordReset: Boolean(dto.password),
    });
    return updated;
  }

  /**
   * Disable rather than delete: the account keeps its audit trail and the
   * bookings and tickets it touched, but sign-in is refused from now on.
   */
  @Post('staff/:id/disable')
  @Roles('ADMIN')
  async disableStaff(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: VerdictDto,
  ) {
    const member = await this.prisma.user.findUnique({ where: { id } });
    if (!member || !CREATABLE_STAFF_ROLES.includes(member.role)) {
      throw new NotFoundException('Staff account not found');
    }
    if (member.id === actor.userId) {
      throw new BadRequestException('You cannot disable your own account');
    }
    if (member.role === 'ADMIN') await this.assertNotLastAdmin(id, 'disable');
    if (member.disabledAt) throw new BadRequestException('Account is already disabled');

    this.audit.log(actor, 'STAFF_DISABLE', 'User', id, dto.note);
    return this.prisma.user.update({
      where: { id },
      data: { disabledAt: new Date() },
      select: STAFF_FIELDS,
    });
  }

  @Post('staff/:id/enable')
  @Roles('ADMIN')
  async enableStaff(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    const member = await this.prisma.user.findUnique({ where: { id } });
    if (!member || !CREATABLE_STAFF_ROLES.includes(member.role)) {
      throw new NotFoundException('Staff account not found');
    }
    this.audit.log(actor, 'STAFF_ENABLE', 'User', id);
    return this.prisma.user.update({
      where: { id },
      data: { disabledAt: null },
      select: STAFF_FIELDS,
    });
  }

  /** Refuses to leave the platform with no way back in. */
  private async assertNotLastAdmin(id: string, action: string) {
    const others = await this.prisma.user.count({
      where: { role: 'ADMIN', disabledAt: null, id: { not: id } },
    });
    if (others === 0) {
      throw new BadRequestException(
        `This is the only active Super Admin - you cannot ${action} it. Promote another account first.`,
      );
    }
  }

  // -- Technician onboarding (staff-created accounts) -------------------------

  @Post('technicians')
  @Roles('ADMIN', 'OPS_MANAGER', 'VERIFICATION_OFFICER')
  async createTechnician(@CurrentUser() actor: AuthUser, @Body() dto: CreateTechnicianDto) {
    const phone = normalizePhone(dto.phone);
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || !category.isActive) throw new BadRequestException('Unknown service category');

    const existing = await this.prisma.user.findUnique({
      where: { phone },
      include: { providerProfile: { select: { id: true } } },
    });
    if (existing?.providerProfile) {
      throw new BadRequestException('That phone already belongs to a technician');
    }
    if (existing && existing.role !== 'CUSTOMER') {
      throw new BadRequestException('That phone belongs to a staff account');
    }

    // An existing customer can become a technician - keep their account and
    // history instead of refusing the number.
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { role: 'PROVIDER', name: dto.name },
        })
      : await this.prisma.user.create({
          data: { name: dto.name, phone, role: 'PROVIDER', language: 'AM' },
        });

    const profile = await this.prisma.providerProfile.create({
      data: {
        userId: user.id,
        categoryId: dto.categoryId,
        bio: dto.bio,
        subCity: dto.subCity,
        woreda: dto.woreda,
        yearsExperience: dto.yearsExperience,
        serviceRadiusKm: dto.serviceRadiusKm ?? 10,
        verificationStatus: dto.verified ? 'VERIFIED' : 'PENDING',
        // never online until they say so in the app
        isAvailable: false,
        lat: dto.lat,
        lng: dto.lng,
      },
    });
    if (dto.lat !== undefined && dto.lng !== undefined) {
      await this.prisma.$executeRaw`UPDATE "ProviderProfile" SET "location" = ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography WHERE "id" = ${profile.id}`;
    }
    await this.prisma.wallet.create({ data: { providerId: profile.id } });

    this.audit.log(actor, 'TECHNICIAN_CREATE', 'ProviderProfile', profile.id, undefined, {
      phone,
      category: category.nameEn,
      verified: !!dto.verified,
    });
    this.notifications.notify(
      { phone, telegramChatId: null },
      `Addis Tiggena: እንኳን ደህና መጡ · your technician account is ready. Sign in with this phone number at ${process.env.WEB_PUBLIC_URL ?? 'addistiggena.com'} or in the app.`,
    );
    return { id: profile.id, userId: user.id, name: user.name, phone, verificationStatus: profile.verificationStatus };
  }

  // -- Finance workspace (spec section 2: Finance Officer) --------------------

  /** Today's money in one call: what customers paid, the commission we earned,
   *  the deposits waiting to be checked, and the exceptions a human has to chase. */
  @Get('finance')
  @Roles('ADMIN', 'FINANCE_OFFICER')
  async finance() {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [collected, depositsPending, depositsToday, arrears, unpaidJobs, openRefunds, queue] =
      await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'CONFIRMED', confirmedAt: { gte: dayStart } },
        _sum: { amountEtb: true, commissionEtb: true },
        _count: { _all: true },
      }),
      this.prisma.deposit.aggregate({
        where: { status: 'PENDING' },
        _sum: { amountEtb: true },
        _count: { _all: true },
      }),
      this.prisma.deposit.aggregate({
        where: { status: 'CONFIRMED', settledAt: { gte: dayStart } },
        _sum: { amountEtb: true },
        _count: { _all: true },
      }),
      // technicians who have run their commission balance into the red
      this.prisma.wallet.aggregate({
        where: { balanceEtb: { lt: 0 } },
        _sum: { balanceEtb: true },
        _count: { _all: true },
      }),
      // completed long ago but still unpaid - the classic exception to chase
      this.prisma.booking.count({
        where: { status: 'COMPLETED', completedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['OPEN', 'RE_INSPECTION'] }, refundEtb: { not: null } },
      }),
      this.prisma.booking.findMany({
        where: { OR: [{ status: 'PAID', paidAt: { gte: dayStart } }, { status: 'COMPLETED' }] },
        include: {
          category: { select: { nameEn: true } },
          payment: { select: { amountEtb: true, commissionEtb: true, gateway: true, status: true } },
          provider: { select: { user: { select: { name: true } } } },
        },
        orderBy: { completedAt: 'desc' },
        take: 60,
      }),
    ]);

    return {
      collectedTodayEtb: Number(collected._sum.amountEtb ?? 0),
      commissionTodayEtb: Number(collected._sum.commissionEtb ?? 0),
      completedToday: collected._count._all,
      depositsPendingEtb: Number(depositsPending._sum.amountEtb ?? 0),
      depositsPendingCount: depositsPending._count._all,
      depositsTodayEtb: Number(depositsToday._sum.amountEtb ?? 0),
      depositsTodayCount: depositsToday._count._all,
      arrearsEtb: Math.abs(Number(arrears._sum.balanceEtb ?? 0)),
      arrearsCount: arrears._count._all,
      exceptions: { unpaidJobs, openRefunds },
      queue: queue.map((b) => {
        const paid = Number(b.payment?.amountEtb ?? 0);
        const fee = Number(b.payment?.commissionEtb ?? 0);
        return {
          id: b.id,
          ref: b.id.slice(-6).toUpperCase(),
          category: b.category.nameEn,
          technician: b.provider?.user?.name ?? null,
          customerPaidEtb: paid,
          commissionEtb: fee,
          /** cash the technician keeps at the door - never touches our account */
          technicianKeepsEtb: paid ? paid - fee : null,
          gateway: b.payment?.gateway ?? null,
          state: b.status === 'PAID' ? 'READY' : 'PAYMENT_ISSUE',
          completedAt: b.completedAt,
        };
      }),
    };
  }

  /** The same day's rows as a CSV the finance desk can file or import. */
  @Get('finance/export')
  @Roles('ADMIN', 'FINANCE_OFFICER')
  async financeExport(@Res({ passthrough: true }) res: Response) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const rows = await this.prisma.booking.findMany({
      where: { status: { in: ['PAID', 'COMPLETED'] }, completedAt: { gte: dayStart } },
      include: {
        category: { select: { nameEn: true } },
        payment: true,
        customer: { select: { name: true, phone: true } },
        provider: { select: { user: { select: { name: true, phone: true } } } },
      },
      orderBy: { completedAt: 'asc' },
    });

    const esc = (v: unknown) => {
      const t = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const lines = [
      [
        'booking',
        'completed_at',
        'service',
        'customer',
        'customer_phone',
        'technician',
        'technician_phone',
        'status',
        'gateway',
        'customer_paid_etb',
        'commission_etb',
        'technician_keeps_etb',
      ].join(','),
    ];
    for (const b of rows) {
      const paid = Number(b.payment?.amountEtb ?? 0);
      const fee = Number(b.payment?.commissionEtb ?? 0);
      lines.push(
        [
          b.id.slice(-6).toUpperCase(),
          b.completedAt?.toISOString() ?? '',
          b.category.nameEn,
          b.customer?.name ?? '',
          b.customer?.phone ?? '',
          b.provider?.user?.name ?? '',
          b.provider?.user?.phone ?? '',
          b.status,
          b.payment?.gateway ?? '',
          paid || '',
          fee || '',
          paid ? paid - fee : '',
        ]
          .map(esc)
          .join(','),
      );
    }
    const day = dayStart.toISOString().slice(0, 10);
    res.set({
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="addis-tiggena-finance-' + day + '.csv"',
    });
    return lines.join('\n');
  }

  // -- Support: the customer behind a case ------------------------------------

  /** Everything a support agent needs on one screen: who they are, their repair
   *  history, what they paid, and every case opened on their account. */
  @Get('customers/:id/context')
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT')
  async customerContext(@Param('id') id: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, createdAt: true, language: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const [bookings, tickets] = await Promise.all([
      this.prisma.booking.findMany({
        where: { customerId: id },
        include: {
          category: { select: { nameEn: true, nameAm: true } },
          payment: { select: { amountEtb: true, gateway: true, status: true } },
          provider: { select: { user: { select: { name: true, phone: true } } } },
          review: { select: { stars: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.supportTicket.findMany({
        where: { booking: { customerId: id } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const paid = bookings.filter((b) => b.payment?.status === 'CONFIRMED');
    return {
      customer,
      stats: {
        bookings: bookings.length,
        completed: bookings.filter((b) => ['COMPLETED', 'PAID'].includes(b.status)).length,
        cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
        lifetimeSpendEtb: paid.reduce((sum, b) => sum + Number(b.payment?.amountEtb ?? 0), 0),
        openCases: tickets.filter((t) => ['OPEN', 'RE_INSPECTION'].includes(t.status)).length,
      },
      bookings: bookings.map((b) => ({
        id: b.id,
        ref: b.id.slice(-6).toUpperCase(),
        status: b.status,
        category: b.category.nameEn,
        technician: b.provider?.user?.name ?? null,
        technicianPhone: b.provider?.user?.phone ?? null,
        amountEtb: b.payment ? Number(b.payment.amountEtb) : null,
        gateway: b.payment?.gateway ?? null,
        stars: b.review?.stars ?? null,
        createdAt: b.createdAt,
        completedAt: b.completedAt,
      })),
      cases: tickets.map((t) => ({
        id: t.id,
        bookingId: t.bookingId,
        type: t.type,
        status: t.status,
        note: t.note,
        resolutionNote: t.resolutionNote,
        refundEtb: t.refundEtb ? Number(t.refundEtb) : null,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt,
      })),
    };
  }

  // -- Call-centre booking (spec section 4: phone orders) ---------------------

  /** Take a booking over the phone. An unknown number becomes a customer
   *  account, so the caller keeps the same history as an app user. */
  @Post('bookings')
  @Roles('ADMIN', 'OPS_MANAGER', 'SUPPORT_AGENT', 'SUBCITY_COORDINATOR')
  async createBookingForCustomer(@CurrentUser() actor: AuthUser, @Body() dto: StaffBookingDto) {
    const phone = normalizePhone(dto.phone);
    let customer = await this.prisma.user.findUnique({ where: { phone } });
    if (customer && !['CUSTOMER', 'PROVIDER'].includes(customer.role)) {
      throw new BadRequestException('That phone belongs to a staff account');
    }
    if (!customer) {
      customer = await this.prisma.user.create({
        data: { phone, name: dto.customerName ?? null, role: 'CUSTOMER', language: 'AM' },
      });
    } else if (dto.customerName && !customer.name) {
      customer = await this.prisma.user.update({
        where: { id: customer.id },
        data: { name: dto.customerName },
      });
    }

    const booking = await this.bookingsService.create(customer.id, {
      categoryId: dto.categoryId,
      lat: dto.lat,
      lng: dto.lng,
      landmarkNote: dto.landmarkNote,
      description: dto.description,
    });
    if (!booking) throw new BadRequestException('Could not create the booking');
    this.audit.log(actor, 'BOOKING_CREATE_BY_STAFF', 'Booking', booking.id, undefined, {
      phone,
      category: dto.categoryId,
    });
    return booking;
  }

  // -- Platform controls (Super Admin) ---------------------------------------

  /** One health-and-configuration snapshot: what is switched on, what is
   *  pending, and where the platform's numbers currently sit. */
  @Get('system')
  @Roles('ADMIN')
  async system() {
    const [
      configs,
      pendingVetting,
      openTickets,
      staffCount,
      providers,
      customers,
      bookings,
      lastAudit,
    ] = await Promise.all([
      this.prisma.appConfig.findMany(),
      this.prisma.providerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'RE_INSPECTION'] } } }),
      this.prisma.user.count({ where: { role: { in: CREATABLE_STAFF_ROLES as Role[] } } }),
      this.prisma.providerProfile.count(),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.booking.count(),
      this.prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]));
    return {
      services: {
        // a console SMS provider means OTP codes reach the log, not the customer
        sms: process.env.SMS_PROVIDER ?? 'console',
        smsNotifications: (process.env.SMS_NOTIFICATIONS ?? 'on') !== 'off',
        telegramBot: !!process.env.BOT_TOKEN,
        payments: {
          cash: true,
          chapa: !!process.env.CHAPA_SECRET_KEY,
          telebirr: !!process.env.TELEBIRR_APP_KEY,
        },
      },
      dispatch: {
        offerWindowMinutes: Number(cfg.offer_window_minutes ?? 5),
        escalateAfterAttempts: Number(cfg.escalate_after_attempts ?? 1),
        arrivalTargetMinutes: Number(cfg.arrival_target_minutes ?? 30),
        workingHours: cfg.working_hours ?? '06:00-20:00',
        minWalletBalanceEtb: Number(cfg.min_wallet_balance_etb ?? 0),
      },
      money: {
        commissionRate: Number(cfg.commission_rate ?? 0.14),
        supportRefundCapEtb: Number(cfg.support_refund_cap_etb ?? 500),
      },
      pending: { vetting: pendingVetting, tickets: openTickets },
      scale: { staff: staffCount, technicians: providers, customers, bookings },
      lastAuditEntry: lastAudit?.createdAt ?? null,
    };
  }

  /** Tune dispatch behaviour without a redeploy - every change is audited. */
  @Put('config/dispatch')
  @Roles('ADMIN')
  async setDispatchRules(@CurrentUser() actor: AuthUser, @Body() dto: DispatchRulesDto) {
    const pairs: [string, string][] = [];
    if (dto.offerWindowMinutes !== undefined)
      pairs.push(['offer_window_minutes', String(dto.offerWindowMinutes)]);
    if (dto.escalateAfterAttempts !== undefined)
      pairs.push(['escalate_after_attempts', String(dto.escalateAfterAttempts)]);
    if (dto.arrivalTargetMinutes !== undefined)
      pairs.push(['arrival_target_minutes', String(dto.arrivalTargetMinutes)]);
    if (dto.workingHours !== undefined) pairs.push(['working_hours', dto.workingHours]);
    if (dto.minWalletBalanceEtb !== undefined)
      pairs.push(['min_wallet_balance_etb', String(dto.minWalletBalanceEtb)]);
    if (!pairs.length) throw new BadRequestException('Nothing to change');

    for (const [key, value] of pairs) {
      await this.prisma.appConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    this.audit.log(actor, 'DISPATCH_RULES_UPDATE', 'AppConfig', 'dispatch', undefined, {
      changed: Object.fromEntries(pairs),
    });
    return Object.fromEntries(pairs);
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
      onlineSubCities,
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
      // which sub-cities actually have someone online right now
      this.prisma.providerProfile.findMany({
        where: { isAvailable: true, verificationStatus: 'VERIFIED', subCity: { not: null } },
        select: { subCity: true },
        distinct: ['subCity'],
      }),
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
      ops: {
        activeJobs,
        awaitingDispatch,
        escalated,
        stalledEnRoute: enRouteOld,
        techniciansOnline,
        subCitiesCovered: onlineSubCities.length,
        avgArrivalMin,
      },
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

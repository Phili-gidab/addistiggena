import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGatewayType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CbeBirrGateway,
  ChapaGateway,
  PaymentGatewayDriver,
  TelebirrGateway,
} from './gateways';

/** How long a COMPLETED job waits for customer sign-off before auto-confirming (§4.2 step 08). */
export const AUTO_CONFIRM_MS = 30 * 60_000;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly drivers: Map<PaymentGatewayType, PaymentGatewayDriver>;
  private readonly allowUnsigned: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {
    const list = [
      new TelebirrGateway(config),
      new ChapaGateway(config),
      new CbeBirrGateway(config),
    ];
    this.drivers = new Map(list.map((d) => [d.name, d]));
    // Dev-only escape hatch: local envs have no gateway dashboards to sign webhooks with.
    // Fail closed — requires an explicit NODE_ENV=development, not merely "not production".
    this.allowUnsigned =
      this.config.get<string>('PAYMENTS_ALLOW_UNSIGNED_WEBHOOKS', 'false') === 'true' &&
      this.config.get<string>('NODE_ENV') === 'development';
    if (this.allowUnsigned) {
      this.logger.warn('PAYMENTS_ALLOW_UNSIGNED_WEBHOOKS is on — never enable this in production');
    }
  }

  private async commissionRate(): Promise<number> {
    const row = await this.prisma.appConfig.findUnique({ where: { key: 'commission_rate' } });
    const rate = Number(row?.value ?? this.config.get('COMMISSION_RATE', '0.10'));
    return Number.isFinite(rate) && rate >= 0 && rate < 1 ? rate : 0.1;
  }

  async initiate(bookingId: string, gateway: PaymentGatewayType, customerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== customerId) throw new ForbiddenException('Not your booking');
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Payment is only possible after the job is completed');
    }
    if (booking.payment?.status === 'CONFIRMED') {
      throw new BadRequestException('Booking already paid');
    }
    const amount = booking.finalPriceEtb ?? booking.priceQuoteEtb;
    if (!amount) {
      throw new BadRequestException(
        'No price on this booking — ask the technician to set the final price on completion',
      );
    }

    // Cash: no gateway round-trip; settle immediately, flagged for admin oversight.
    if (gateway === 'CASH') {
      await this.prisma.payment.upsert({
        where: { bookingId },
        update: { gateway, amountEtb: amount },
        create: { bookingId, gateway, amountEtb: amount },
      });
      return this.settle(`CASH-${bookingId}`, true, bookingId);
    }

    const driver = this.drivers.get(gateway);
    if (!driver) throw new BadRequestException(`Unsupported gateway ${gateway}`);
    const checkout = await driver.initiate(amount.toString(), bookingId);

    await this.prisma.payment.upsert({
      where: { bookingId },
      update: { gateway, amountEtb: amount, gatewayRef: checkout.gatewayRef, status: 'PENDING' },
      create: { bookingId, gateway, amountEtb: amount, gatewayRef: checkout.gatewayRef },
    });
    return checkout;
  }

  async handleWebhook(
    gatewayName: string,
    payload: Record<string, unknown>,
    headers: Record<string, string>,
    rawBody?: string,
  ) {
    const type = gatewayName.toUpperCase() as PaymentGatewayType;
    const driver = this.drivers.get(type);
    if (!driver) throw new BadRequestException(`Unknown gateway ${gatewayName}`);
    const result = await driver.verifyWebhook(payload, headers, rawBody);
    if (!result.signatureValid && !this.allowUnsigned) {
      this.logger.warn(`Rejected unsigned/mis-signed ${type} webhook for ref ${result.gatewayRef}`);
      throw new ForbiddenException('Invalid webhook signature');
    }
    if (!result.gatewayRef) throw new BadRequestException('Missing gateway reference');
    return this.settle(result.gatewayRef, result.success);
  }

  /**
   * 30-minute auto-confirm sweep (proposal §4.2 step 08: "customer confirms or
   * auto-confirmed after 30 min"). Jobs still COMPLETED past the window settle as
   * cash so the technician's wallet is credited without waiting on the customer.
   */
  async autoConfirmCash(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking || booking.status !== 'COMPLETED') return { ok: false };
    if (booking.payment?.status === 'CONFIRMED') return { ok: true, idempotent: true };
    // Don't yank a live gateway checkout out from under the customer.
    if (
      booking.payment?.status === 'PENDING' &&
      booking.payment.gateway !== 'CASH' &&
      booking.payment.initiatedAt > new Date(Date.now() - AUTO_CONFIRM_MS)
    ) {
      return { ok: false, deferred: true };
    }
    const amount = booking.finalPriceEtb ?? booking.priceQuoteEtb;
    if (!amount) {
      this.logger.warn(`Cannot auto-confirm booking ${bookingId}: no price set`);
      return { ok: false };
    }
    await this.prisma.payment.upsert({
      where: { bookingId },
      update: { gateway: 'CASH', amountEtb: amount, status: 'PENDING' },
      create: { bookingId, gateway: 'CASH', amountEtb: amount },
    });
    this.logger.log(`Auto-confirming booking ${bookingId} as cash after 30-minute window`);
    return this.settle(`CASH-${bookingId}`, true, bookingId);
  }

  /**
   * Idempotent settlement: confirm payment, mark booking PAID, split commission,
   * credit provider wallet — all in one transaction (money invariants, doc 04).
   */
  private async settle(gatewayRef: string, success: boolean, bookingIdForCash?: string) {
    const payment = bookingIdForCash
      ? await this.prisma.payment.findUnique({ where: { bookingId: bookingIdForCash } })
      : await this.prisma.payment.findUnique({ where: { gatewayRef } });
    if (!payment) throw new NotFoundException(`No payment for ref ${gatewayRef}`);
    if (payment.status === 'CONFIRMED') return { ok: true, idempotent: true };

    if (!success) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      return { ok: false };
    }

    const rate = await this.commissionRate();
    const gross = new Prisma.Decimal(payment.amountEtb);
    const commission = gross.mul(rate).toDecimalPlaces(2);
    const net = gross.sub(commission);

    // The conditional claim INSIDE the transaction is the real idempotency barrier:
    // of N concurrent settlements (webhook retries, sweeper, cash initiate) exactly
    // one flips the payment to CONFIRMED; the rest see count=0 and back off.
    const claimed = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: 'CONFIRMED' } },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          commissionEtb: commission,
          gatewayRef: payment.gatewayRef ?? gatewayRef,
        },
      });
      if (count === 0) return false;
      const booking = await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'PAID', paidAt: new Date() },
      });
      if (booking.providerId) {
        const wallet = await tx.wallet.upsert({
          where: { providerId: booking.providerId },
          update: {},
          create: { providerId: booking.providerId },
        });
        await tx.walletTransaction.createMany({
          data: [
            { walletId: wallet.id, type: 'JOB_CREDIT', amountEtb: gross, bookingId: booking.id },
            {
              walletId: wallet.id,
              type: 'COMMISSION',
              amountEtb: commission.neg(),
              bookingId: booking.id,
              note: `Platform commission @ ${(rate * 100).toFixed(1)}%`,
            },
          ],
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceEtb: { increment: net } },
        });
      }
      return true;
    });
    if (!claimed) return { ok: true, idempotent: true };

    this.logger.log(`Payment ${payment.id} settled: gross=${gross} commission=${commission}`);
    this.sendReceipts(payment.bookingId, gross, net).catch((err) =>
      this.logger.warn(`Receipt dispatch failed: ${(err as Error).message}`),
    );
    return { ok: true };
  }

  /** E-receipt mirrors to both parties (proposal §4.4 step 06). */
  private async sendReceipts(bookingId: string, gross: Prisma.Decimal, net: Prisma.Decimal) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        category: true,
        customer: { select: { phone: true, telegramChatId: true } },
        provider: { include: { user: { select: { phone: true, telegramChatId: true } } } },
      },
    });
    if (!booking) return;
    const jobRef = booking.id.slice(-6);
    this.notifications.notify(
      booking.customer,
      `Addis Tiggena ደረሰኝ · receipt — job #${jobRef} (${booking.category.nameEn}) paid: ETB ${gross.toFixed(2)}. እናመሰግናለን!`,
    );
    if (booking.provider) {
      this.notifications.notify(
        booking.provider.user,
        `Addis Tiggena: ክፍያ ተቀብለዋል · job #${jobRef} paid — ETB ${net.toFixed(2)} credited to your wallet`,
      );
    }
  }
}

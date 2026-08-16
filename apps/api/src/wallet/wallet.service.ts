import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestPayoutDto } from './wallet.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  private async walletByUser(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');
    const wallet = await this.prisma.wallet.upsert({
      where: { providerId: profile.id },
      update: {},
      create: { providerId: profile.id },
    });
    return wallet;
  }

  async me(userId: string) {
    const wallet = await this.walletByUser(userId);
    return this.prisma.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 30 },
        payouts: { orderBy: { requestedAt: 'desc' }, take: 10 },
      },
    });
  }

  /**
   * Funds are reserved (deducted) at request time so a provider cannot queue
   * overlapping payouts against the same balance; a rejection refunds them.
   */
  async requestPayout(userId: string, dto: RequestPayoutDto) {
    const wallet = await this.walletByUser(userId);
    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      if (fresh.balanceEtb.lessThan(dto.amountEtb)) {
        throw new BadRequestException(
          `Insufficient balance - available ${fresh.balanceEtb.toString()} ETB`,
        );
      }
      const payout = await tx.payout.create({
        data: {
          walletId: wallet.id,
          amountEtb: new Prisma.Decimal(dto.amountEtb),
          destination: dto.destination,
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYOUT',
          amountEtb: new Prisma.Decimal(-dto.amountEtb),
          note: `Payout requested to ${dto.destination}`,
        },
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceEtb: { decrement: dto.amountEtb } },
      });
      return payout;
    });
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeclareDepositDto } from './wallet.dto';

/** Balance floor a technician must stay above to keep receiving job offers. */
export const DEFAULT_MIN_WALLET_BALANCE_ETB = 0;

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
        deposits: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  /**
   * The technician has paid into the company account and is telling us so. No
   * money moves here - finance confirms it against the bank statement first,
   * otherwise anyone could credit themselves by filling in a form.
   */
  async declareDeposit(userId: string, dto: DeclareDepositDto) {
    const wallet = await this.walletByUser(userId);
    const duplicate = await this.prisma.deposit.findFirst({
      where: { walletId: wallet.id, reference: dto.reference.trim(), status: { not: 'REJECTED' } },
    });
    if (duplicate) {
      throw new BadRequestException('That reference has already been submitted');
    }
    return this.prisma.deposit.create({
      data: {
        walletId: wallet.id,
        amountEtb: new Prisma.Decimal(dto.amountEtb),
        method: dto.method,
        reference: dto.reference.trim(),
        note: dto.note?.trim() || null,
      },
    });
  }
}

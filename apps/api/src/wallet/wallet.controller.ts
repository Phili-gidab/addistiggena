import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { RequestPayoutDto } from './wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.wallet.me(user.userId);
  }

  @Post('payouts')
  requestPayout(@CurrentUser() user: AuthUser, @Body() dto: RequestPayoutDto) {
    return this.wallet.requestPayout(user.userId, dto);
  }
}

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { IsEnum } from 'class-validator';
import { PaymentGatewayType } from '@prisma/client';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import { AuthUser } from '../auth/jwt.strategy';
import { PaymentsService } from './payments.service';

class InitiatePaymentDto {
  @IsEnum(PaymentGatewayType)
  gateway: PaymentGatewayType;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':bookingId/initiate')
  @UseGuards(JwtAuthGuard)
  initiate(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.payments.initiate(bookingId, dto.gateway, user.userId);
  }

  /** Gateway callback — unauthenticated but signature-verified per driver, idempotent. */
  @Post('webhook/:gateway')
  @HttpCode(200)
  webhook(
    @Param('gateway') gateway: string,
    @Body() payload: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.payments.handleWebhook(gateway, payload, headers, req.rawBody?.toString('utf8'));
  }
}

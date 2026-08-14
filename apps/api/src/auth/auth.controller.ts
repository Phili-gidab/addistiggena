import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RefreshDto,
  RequestOtpDto,
  TelegramLinkDto,
  TelegramResumeDto,
  VerifyOtpDto,
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  // ── Bot channel (guarded by the shared BOT_API_KEY header) ─────────────────

  @Post('telegram/link')
  @HttpCode(200)
  telegramLink(@Headers('x-bot-key') botKey: string, @Body() dto: TelegramLinkDto) {
    return this.auth.telegramLink(botKey ?? '', dto.chatId, dto.phone, dto.name);
  }

  @Post('telegram/resume')
  @HttpCode(200)
  telegramResume(@Headers('x-bot-key') botKey: string, @Body() dto: TelegramResumeDto) {
    return this.auth.telegramResume(botKey ?? '', dto.chatId);
  }
}

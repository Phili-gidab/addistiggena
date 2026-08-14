import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';
import { normalizePhone } from './auth.dto';

export interface JwtPayload {
  sub: string;
  role: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  private hash(code: string): string {
    const salt = this.config.get<string>('JWT_SECRET', 'dev-secret');
    return createHash('sha256').update(`${salt}:${code}`).digest('hex');
  }

  async requestOtp(rawPhone: string): Promise<{ sent: boolean; devCode?: string }> {
    const phone = normalizePhone(rawPhone);
    const cooldown = Number(this.config.get('OTP_RESEND_COOLDOWN_SECONDS', 60));
    const ttl = Number(this.config.get('OTP_TTL_SECONDS', 300));

    const recent = await this.prisma.otpCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - cooldown * 1000) } },
    });
    if (recent) {
      throw new HttpException(
        `Please wait ${cooldown}s before requesting another code`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.otpCode.create({
      data: { phone, codeHash: this.hash(code), expiresAt: new Date(Date.now() + ttl * 1000) },
    });
    await this.sms.send(phone, `Addis Tiggena: የማረጋገጫ ኮድዎ / your verification code is ${code}`);
    // Dev convenience only: with the console SMS driver there is no phone to receive the
    // code, so surface it in the response. Fail closed — requires an explicit
    // NODE_ENV=development, not merely "not production".
    if (
      this.config.get<string>('SMS_PROVIDER', 'console') === 'console' &&
      this.config.get<string>('NODE_ENV') === 'development'
    ) {
      return { sent: true, devCode: code };
    }
    return { sent: true };
  }

  async verifyOtp(rawPhone: string, code: string) {
    const phone = normalizePhone(rawPhone);
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new UnauthorizedException('No valid code — request a new one');
    if (otp.attempts >= 5) throw new UnauthorizedException('Too many attempts — request a new code');

    if (otp.codeHash !== this.hash(code)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect code');
    }

    const [, user] = await this.prisma.$transaction([
      this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
      this.prisma.user.upsert({ where: { phone }, update: {}, create: { phone } }),
    ]);

    return { ...this.issueTokens(user.id, user.role), user };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Not a refresh token');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new BadRequestException('User no longer exists');
    return this.issueTokens(user.id, user.role);
  }

  /**
   * Bot-channel login: Telegram itself verified the phone via the contact-share button
   * (we require contact.user_id === sender id bot-side), so no OTP round-trip is needed.
   * Guarded by the shared BOT_API_KEY — only our bot process may call this.
   */
  async telegramLink(botKey: string, chatId: string, rawPhone: string, name?: string) {
    this.assertBotKey(botKey);
    const phone = normalizePhone(rawPhone);
    // a chat id can only point at one account — release it from any previous owner
    await this.prisma.user.updateMany({
      where: { telegramChatId: chatId, NOT: { phone } },
      data: { telegramChatId: null },
    });
    const user = await this.prisma.user.upsert({
      where: { phone },
      update: { telegramChatId: chatId, ...(name ? { name } : {}) },
      create: { phone, telegramChatId: chatId, name },
    });
    return { ...this.issueTokens(user.id, user.role), user };
  }

  /** Re-issue tokens for an already-linked Telegram chat (bot restart, session loss). */
  async telegramResume(botKey: string, chatId: string) {
    this.assertBotKey(botKey);
    const user = await this.prisma.user.findUnique({ where: { telegramChatId: chatId } });
    if (!user) throw new UnauthorizedException('Chat not linked — share your contact first');
    return { ...this.issueTokens(user.id, user.role), user };
  }

  private assertBotKey(botKey: string) {
    const expected = this.config.get<string>('BOT_API_KEY', '');
    // hash both sides → equal-length buffers → constant-time compare (no length leak)
    const a = createHash('sha256').update(botKey).digest();
    const b = createHash('sha256').update(expected).digest();
    if (!expected || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid bot key');
    }
  }

  private issueTokens(userId: string, role: string) {
    const accessToken = this.jwt.sign({ sub: userId, role, type: 'access' });
    const refreshToken = this.jwt.sign(
      { sub: userId, role, type: 'refresh' },
      { expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '30d') },
    );
    return { accessToken, refreshToken };
  }
}

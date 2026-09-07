import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../auth/sms.service';

export interface NotifyTarget {
  phone?: string | null;
  telegramChatId?: string | null;
}

/**
 * Fan-out dispatcher for user-facing notifications: SMS mirror (connectivity
 * resilience, proposal §3) plus Telegram push for accounts linked via the bot.
 * Delivery is fire-and-forget - a failed channel never blocks the request path.
 */
/** Extra payload carried to the app so a tap opens the right screen. */
export interface PushData {
  bookingId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly botToken: string;
  private readonly smsNotifications: boolean;

  constructor(
    private readonly sms: SmsService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.botToken = config.get<string>('BOT_TOKEN', '');
    // Every notify() below is a paid SMS once a gateway is live. Set
    // SMS_NOTIFICATIONS=off to keep the credit for login OTPs only (auth sends
    // those directly, so they are unaffected); Telegram pushes still go out.
    this.smsNotifications = config.get<string>('SMS_NOTIFICATIONS', 'on') !== 'off';
  }

  /**
   * Expo's push service - free, no credentials of ours. A token only exists
   * once the app has been granted permission on a real device, so this is a
   * no-op for anyone who has not installed it.
   */
  private push(phone: string | null | undefined, text: string, data?: PushData): void {
    if (!phone) return;
    this.prisma.user
      .findUnique({ where: { phone }, select: { pushToken: true } })
      .then((u) => {
        if (!u?.pushToken) return;
        return fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            to: u.pushToken,
            title: 'Addis Tiggena',
            body: text.replace(/^Addis Tiggena:\s*/, ''),
            sound: 'default',
            priority: 'high',
            channelId: 'default',
            data: data ?? {},
          }),
        }).then(async (res) => {
          if (!res.ok) this.logger.warn(`Expo push failed: HTTP ${res.status}`);
        });
      })
      .catch((err) => this.logger.warn(`Push to ${phone} failed: ${(err as Error).message}`));
  }

  notify(target: NotifyTarget, text: string, data?: PushData): void {
    this.push(target.phone, text, data);
    if (target.phone && this.smsNotifications) {
      this.sms.send(target.phone, text).catch((err) => {
        this.logger.warn(`SMS to ${target.phone} failed: ${(err as Error).message}`);
      });
    }
    if (target.telegramChatId && this.botToken) {
      fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: target.telegramChatId, text }),
      })
        .then(async (res) => {
          if (!res.ok) this.logger.warn(`Telegram push failed: HTTP ${res.status}`);
        })
        .catch((err) => {
          this.logger.warn(`Telegram push failed: ${(err as Error).message}`);
        });
    }
  }

  async notifyUserId(userId: string, text: string, data?: PushData): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, telegramChatId: true },
    });
    if (user) this.notify(user, text, data);
  }
}

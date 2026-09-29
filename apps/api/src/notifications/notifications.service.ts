import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../auth/sms.service';
import { MESSAGES, MessageKey, MessageVars, smsSegments } from './messages';

/** The brand stamp belongs on an SMS. A push already says who it is from. */
const BRAND_PREFIX = /^(Addis Tiggena|አዲስ ጥገና)( receipt| ደረሰኝ)?:?\s*/;

export interface NotifyTarget {
  phone?: string | null;
  telegramChatId?: string | null;
  /** AM unless the account asked for English */
  language?: 'AM' | 'EN' | null;
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
    // An SMS_ALWAYS or fallen-back SMS_IF_NO_APP message is paid for. The env var is
    // only the default now - the Super Admin turns it on and off from Platform
    // controls, because it costs money and sometimes needs stopping quickly.
    // Login OTPs are sent by auth directly and are never affected.
    this.smsNotifications = config.get<string>('SMS_NOTIFICATIONS', 'on') !== 'off';
  }

  /** Cached briefly - send() runs on every dispatch, accept or complete. */
  private smsSetting = { on: true, readAt: 0 };

  private async smsEnabled(): Promise<boolean> {
    if (Date.now() - this.smsSetting.readAt < 30_000) return this.smsSetting.on;
    try {
      const row = await this.prisma.appConfig.findUnique({ where: { key: 'sms_notifications' } });
      this.smsSetting = {
        on: row ? row.value !== 'off' : this.smsNotifications,
        readAt: Date.now(),
      };
    } catch {
      this.smsSetting = { on: this.smsNotifications, readAt: Date.now() };
    }
    return this.smsSetting.on;
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
            // the heading follows the body, so an Amharic message is Amharic throughout
            title: /[ሀ-፿]/.test(text) ? 'አዲስ ጥገና' : 'Addis Tiggena',
            body: text.replace(BRAND_PREFIX, ''),
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

  /**
   * Send one of the catalogued messages. The tier on the message decides
   * whether it is worth an SMS; everything goes to the app either way.
   */
  send(target: NotifyTarget, key: MessageKey, vars: MessageVars = {}, data?: PushData): void {
    const def = MESSAGES[key];
    const text = target.language === 'EN' ? def.en(vars) : def.am(vars);
    this.push(target.phone, text, data);

    if (target.phone && def.channel !== 'APP_ONLY') {
      this.smsEnabled()
        .then(async (on) => {
          if (!on) return;
          // SMS_IF_NO_APP: the app already carried it, so do not pay twice
          if (def.channel === 'SMS_IF_NO_APP' && (await this.hasApp(target.phone!))) return;
          this.logger.log(
            `SMS ${key} -> ${target.phone} (${smsSegments(text)} part${smsSegments(text) === 1 ? '' : 's'})`,
          );
          return this.sms.send(target.phone!, text);
        })
        .catch((err) => {
          this.logger.warn(`SMS to ${target.phone} failed: ${(err as Error).message}`);
        });
    }

    this.telegram(target, text);
  }

  /** Someone with the app installed has registered a push token. */
  private async hasApp(phone: string): Promise<boolean> {
    try {
      const u = await this.prisma.user.findUnique({
        where: { phone },
        select: { pushToken: true },
      });
      return !!u?.pushToken;
    } catch {
      return false;
    }
  }

  private telegram(target: NotifyTarget, text: string): void {
    if (!target.telegramChatId || !this.botToken) return;
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

  async sendToUserId(
    userId: string,
    key: MessageKey,
    vars: MessageVars = {},
    data?: PushData,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, telegramChatId: true, language: true },
    });
    if (user) this.send(user, key, vars, data);
  }
}

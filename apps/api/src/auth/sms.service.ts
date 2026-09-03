import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

/** Logs SMS to the console - the dev default until a gateway contract is signed. */
class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SMS');
  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`→ ${phone}: ${message}`);
  }
}

/** Placeholder for the Ethio Telecom SMS gateway integration (contract pending). */
class EthioTelecomSmsProvider implements SmsProvider {
  async send(_phone: string, _message: string): Promise<void> {
    throw new Error('Ethio Telecom SMS gateway not configured yet');
  }
}

/**
 * Africa's Talking bulk SMS (proposal §7.2). Activated with SMS_PROVIDER=africastalking
 * plus AT_USERNAME / AT_API_KEY (and optionally AT_SENDER_ID) in the environment.
 */
class AfricasTalkingSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SMS:AfricasTalking');

  constructor(
    private readonly username: string,
    private readonly apiKey: string,
    private readonly senderId?: string,
  ) {}

  async send(phone: string, message: string): Promise<void> {
    const body = new URLSearchParams({ username: this.username, to: phone, message });
    if (this.senderId) body.set('from', this.senderId);
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey: this.apiKey,
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`Africa's Talking responded HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      SMSMessageData?: { Recipients?: { status?: string }[] };
    };
    const status = data.SMSMessageData?.Recipients?.[0]?.status;
    if (status && status !== 'Success') {
      throw new Error(`Africa's Talking rejected the message: ${status}`);
    }
    this.logger.log(`Sent to ${phone}`);
  }
}

/**
 * AfroMessage (afromessage.com) - the Ethiopian bulk-SMS gateway the client
 * subscribed to. We keep generating and verifying OTP codes ourselves (hashed,
 * rate-limited, single-use in the OtpCode table) and use AfroMessage purely as
 * the transport, so no verification state lives outside our database.
 *
 * Activated with SMS_PROVIDER=afromessage plus AFRO_API_KEY, and optionally
 * AFRO_SENDER_NAME / AFRO_IDENTIFIER_ID (the approved sender and its id from
 * the AfroMessage dashboard) and AFRO_CALLBACK for delivery reports.
 */
class AfroMessageSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SMS:AfroMessage');
  private static readonly ENDPOINT = 'https://api.afromessage.com/api/send';

  constructor(
    private readonly apiKey: string,
    private readonly senderName?: string,
    private readonly identifierId?: string,
    private readonly callback?: string,
  ) {}

  async send(phone: string, message: string): Promise<void> {
    // AfroMessage expects the international number without the leading plus.
    const to = phone.replace(/^\+/, '');
    const body: Record<string, string> = { to, message };
    if (this.identifierId) body.from = this.identifierId;
    if (this.senderName) body.sender = this.senderName;
    if (this.callback) body.callback = this.callback;

    const res = await fetch(AfroMessageSmsProvider.ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`AfroMessage responded HTTP ${res.status}: ${raw.slice(0, 200)}`);
    }
    let data: { acknowledge?: string; response?: { errors?: unknown } };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      throw new Error(`AfroMessage returned a non-JSON body: ${raw.slice(0, 200)}`);
    }
    if (data.acknowledge !== 'success') {
      const errors = data.response?.errors;
      throw new Error(
        `AfroMessage rejected the message: ${
          errors ? JSON.stringify(errors).slice(0, 200) : raw.slice(0, 200)
        }`,
      );
    }
    this.logger.log(`Sent to ${phone}`);
  }
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: SmsProvider;

  constructor(config: ConfigService) {
    const name = config.get<string>('SMS_PROVIDER', 'console');
    if (name === 'afromessage') {
      const apiKey = config.get<string>('AFRO_API_KEY', '');
      if (apiKey) {
        this.provider = new AfroMessageSmsProvider(
          apiKey,
          config.get<string>('AFRO_SENDER_NAME') || undefined,
          config.get<string>('AFRO_IDENTIFIER_ID') || undefined,
          config.get<string>('AFRO_CALLBACK') || undefined,
        );
      } else if (config.get<string>('NODE_ENV') === 'production') {
        // Fail hard: a silent console fallback would print plaintext OTP codes
        // into the log stream while users receive nothing.
        throw new Error('SMS_PROVIDER=afromessage requires AFRO_API_KEY in production');
      } else {
        this.logger.warn(
          'SMS_PROVIDER=afromessage but AFRO_API_KEY missing - falling back to console (dev only)',
        );
        this.provider = new ConsoleSmsProvider();
      }
    } else if (name === 'ethiotelecom') {
      this.provider = new EthioTelecomSmsProvider();
    } else if (name === 'africastalking') {
      const username = config.get<string>('AT_USERNAME', '');
      const apiKey = config.get<string>('AT_API_KEY', '');
      if (username && apiKey) {
        this.provider = new AfricasTalkingSmsProvider(
          username,
          apiKey,
          config.get<string>('AT_SENDER_ID') || undefined,
        );
      } else if (config.get<string>('NODE_ENV') === 'production') {
        // Fail hard: silently falling back to console in production would write
        // plaintext OTP codes into the log stream while users receive nothing.
        throw new Error(
          'SMS_PROVIDER=africastalking requires AT_USERNAME and AT_API_KEY in production',
        );
      } else {
        this.logger.warn(
          'SMS_PROVIDER=africastalking but AT_USERNAME/AT_API_KEY missing - falling back to console (dev only)',
        );
        this.provider = new ConsoleSmsProvider();
      }
    } else {
      this.provider = new ConsoleSmsProvider();
    }
  }

  send(phone: string, message: string): Promise<void> {
    return this.provider.send(phone, message);
  }
}

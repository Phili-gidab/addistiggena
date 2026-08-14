import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

/** Logs SMS to the console — the dev default until a gateway contract is signed. */
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

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: SmsProvider;

  constructor(config: ConfigService) {
    const name = config.get<string>('SMS_PROVIDER', 'console');
    if (name === 'ethiotelecom') {
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
          'SMS_PROVIDER=africastalking but AT_USERNAME/AT_API_KEY missing — falling back to console (dev only)',
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

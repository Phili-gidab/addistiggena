import { PaymentGatewayType } from '@prisma/client';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';

export interface CheckoutInfo {
  gatewayRef: string;
  /** What the client needs to open/complete the payment (deep link, USSD code, checkout URL…). */
  checkout: Record<string, string>;
}

export interface WebhookResult {
  gatewayRef: string;
  success: boolean;
  /** true = signature checked out; false = missing/invalid. The service decides whether
   *  unsigned payloads are acceptable (dev only, PAYMENTS_ALLOW_UNSIGNED_WEBHOOKS). */
  signatureValid: boolean;
}

export interface PaymentGatewayDriver {
  readonly name: PaymentGatewayType;
  initiate(amountEtb: string, bookingId: string): Promise<CheckoutInfo>;
  /** rawBody is the exact bytes the gateway sent (Nest rawBody buffer) — always prefer it
   *  over re-serializing the parsed payload, which breaks byte-sensitive HMACs. */
  verifyWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
    rawBody?: string,
  ): Promise<WebhookResult>;
}

function ref(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}

/** Constant-time HMAC-SHA256 comparison over the raw request body (hex or base64 signature). */
function hmacValid(secret: string, data: string, signature?: string): boolean {
  if (!secret || !signature) return false;
  const mac = createHmac('sha256', secret).update(data);
  const sig = signature.trim();
  for (const digest of [mac.digest('hex')]) {
    // compare against hex; recompute for base64 (digest() consumes the hmac, so re-create)
    const candidates = [digest, Buffer.from(digest, 'hex').toString('base64')];
    for (const expected of candidates) {
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(sig, 'utf8');
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
  }
  return false;
}

function header(headers: Record<string, string>, ...names: string[]): string | undefined {
  for (const n of names) {
    const v = headers[n] ?? headers[n.toLowerCase()];
    if (v) return v;
  }
  return undefined;
}

/**
 * Telebirr H5/SuperApp. Until merchant onboarding completes there is no public sandbox,
 * so initiation stays instruction-based — but the webhook is still HMAC-protected via
 * TELEBIRR_WEBHOOK_SECRET so the settlement path is never open to forgery.
 */
export class TelebirrGateway implements PaymentGatewayDriver {
  readonly name = PaymentGatewayType.TELEBIRR;
  constructor(private readonly config: ConfigService) {}

  async initiate(amountEtb: string, bookingId: string): Promise<CheckoutInfo> {
    return {
      gatewayRef: ref('TB'),
      checkout: { method: 'telebirr', amountEtb, bookingId, instruction: 'Authorize in the Telebirr app' },
    };
  }

  async verifyWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
    rawBody?: string,
  ): Promise<WebhookResult> {
    const secret = this.config.get<string>('TELEBIRR_WEBHOOK_SECRET', '');
    const body = rawBody ?? JSON.stringify(payload);
    return {
      gatewayRef: String(payload.gatewayRef ?? ''),
      success: payload.status === 'SUCCESS',
      signatureValid: hmacValid(secret, body, header(headers, 'x-webhook-signature')),
    };
  }
}

/**
 * Chapa (https://developer.chapa.co). With CHAPA_SECRET_KEY set this calls the real
 * transaction/initialize API and returns the hosted checkout URL; without it (local dev)
 * it degrades to an instruction-based stub. Webhook trust is two-layered: HMAC of the raw
 * body against the dashboard webhook secret, then — whenever the secret key is present —
 * the authoritative GET /transaction/verify/{tx_ref}, so a forged or replayed body can
 * never settle a payment Chapa doesn't consider paid.
 */
export class ChapaGateway implements PaymentGatewayDriver {
  readonly name = PaymentGatewayType.CHAPA;
  constructor(private readonly config: ConfigService) {}

  async initiate(amountEtb: string, bookingId: string): Promise<CheckoutInfo> {
    const secretKey = this.config.get<string>('CHAPA_SECRET_KEY', '');
    const txRef = ref('CH');
    if (!secretKey) {
      return {
        gatewayRef: txRef,
        checkout: { method: 'chapa', amountEtb, bookingId, instruction: 'Open the Chapa checkout URL' },
      };
    }

    const apiUrl = this.config.get<string>('API_PUBLIC_URL', 'http://localhost:4001');
    const webUrl = this.config.get<string>('WEB_PUBLIC_URL', 'http://localhost:4000');
    const res = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        amount: amountEtb,
        currency: 'ETB',
        tx_ref: txRef,
        callback_url: `${apiUrl}/payments/webhook/chapa`,
        return_url: `${webUrl}/bookings/${bookingId}`,
        'customization[title]': 'Addis Tiggena',
        'customization[description]': `Job #${bookingId.slice(-6)}`,
      }),
    });
    let data: { status?: string; data?: { checkout_url?: string }; message?: unknown };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      throw new Error(`Chapa initialize returned a non-JSON response (HTTP ${res.status})`);
    }
    if (!res.ok || data.status !== 'success' || !data.data?.checkout_url) {
      throw new Error(`Chapa initialize failed: ${JSON.stringify(data.message ?? data)}`);
    }
    return {
      gatewayRef: txRef,
      checkout: {
        method: 'chapa',
        amountEtb,
        bookingId,
        checkoutUrl: data.data.checkout_url,
        instruction: 'Complete the payment on the Chapa checkout page',
      },
    };
  }

  async verifyWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
    rawBody?: string,
  ): Promise<WebhookResult> {
    const secret = this.config.get<string>('CHAPA_WEBHOOK_SECRET', '');
    const secretKey = this.config.get<string>('CHAPA_SECRET_KEY', '');
    const gatewayRef = String(payload.tx_ref ?? payload.gatewayRef ?? '');
    const body = rawBody ?? JSON.stringify(payload);
    const signature = header(headers, 'chapa-signature', 'x-chapa-signature', 'x-webhook-signature');
    let signatureValid = hmacValid(secret, body, signature);
    const status = String(payload.status ?? '').toLowerCase();
    let success = status === 'success' || payload.status === 'SUCCESS';

    // Authoritative confirmation: never trust the webhook body when we can ask Chapa.
    if (secretKey && gatewayRef) {
      try {
        const res = await fetch(
          `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(gatewayRef)}`,
          {
            headers: { Authorization: `Bearer ${secretKey}` },
            signal: AbortSignal.timeout(10_000),
          },
        );
        const data = (await res.json()) as { status?: string; data?: { status?: string } };
        success = res.ok && data.status === 'success' && data.data?.status === 'success';
        // the verify API call is itself authenticated proof — treat it as a valid signature
        signatureValid = true;
      } catch {
        // verification unavailable → keep HMAC-based result; if that also failed, the
        // service rejects the webhook and the gateway will retry.
        success = signatureValid && success;
      }
    }
    return { gatewayRef, success, signatureValid };
  }
}

/** CBEBirr USSD push — instruction-based until merchant credentials arrive; webhook HMAC-protected. */
export class CbeBirrGateway implements PaymentGatewayDriver {
  readonly name = PaymentGatewayType.CBEBIRR;
  constructor(private readonly config: ConfigService) {}

  async initiate(amountEtb: string, bookingId: string): Promise<CheckoutInfo> {
    return {
      gatewayRef: ref('CB'),
      checkout: { method: 'cbebirr', amountEtb, bookingId, instruction: 'Confirm via CBEBirr USSD prompt' },
    };
  }

  async verifyWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
    rawBody?: string,
  ): Promise<WebhookResult> {
    const secret = this.config.get<string>('CBEBIRR_WEBHOOK_SECRET', '');
    const body = rawBody ?? JSON.stringify(payload);
    return {
      gatewayRef: String(payload.gatewayRef ?? ''),
      success: payload.status === 'SUCCESS',
      signatureValid: hmacValid(secret, body, header(headers, 'x-webhook-signature')),
    };
  }
}

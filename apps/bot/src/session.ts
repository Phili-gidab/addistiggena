import { ApiError, ApiUser, AuthResult, resumeTelegram } from './api';
import type { Lang } from './i18n';

/** Data collected while the booking conversation progresses. */
export interface BookingDraft {
  categoryId: string;
  nameAm: string;
  nameEn: string;
  priceFloorEtb: string | null;
  lat?: number;
  lng?: number;
  description?: string;
}

/** Small state machine for the booking conversation. */
export type Flow =
  | { step: 'idle' }
  | { step: 'awaiting_contact'; draft?: BookingDraft }
  | { step: 'awaiting_location'; draft: BookingDraft }
  | { step: 'awaiting_description'; draft: BookingDraft }
  | { step: 'awaiting_confirm'; draft: BookingDraft };

export interface Session {
  lang: Lang;
  /** True once the user explicitly picked a language in this process run. */
  langChosen?: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: ApiUser;
  flow: Flow;
}

const sessions = new Map<number, Session>();

export function getSession(chatId: number): Session {
  let session = sessions.get(chatId);
  if (!session) {
    session = { lang: 'am', flow: { step: 'idle' } };
    sessions.set(chatId, session);
  }
  return session;
}

/** Thrown when the chat is not linked and needs a contact share to proceed. */
export class AuthRequiredError extends Error {
  constructor() {
    super('Telegram chat is not linked to an account');
    this.name = 'AuthRequiredError';
  }
}

export function applyAuth(session: Session, auth: AuthResult): void {
  session.accessToken = auth.accessToken;
  session.refreshToken = auth.refreshToken;
  session.user = auth.user;
}

/** POST /auth/telegram/resume — restores tokens after e.g. a bot restart. */
async function resume(session: Session, chatId: number): Promise<void> {
  try {
    const auth = await resumeTelegram(String(chatId));
    applyAuth(session, auth);
    if (!session.langChosen && auth.user && auth.user.language) {
      session.lang = auth.user.language === 'EN' ? 'en' : 'am';
    }
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      session.accessToken = undefined;
      session.refreshToken = undefined;
      session.user = undefined;
      throw new AuthRequiredError();
    }
    throw err;
  }
}

/** True when the session holds (or could resume) valid tokens. */
export async function ensureAuth(session: Session, chatId: number): Promise<boolean> {
  if (session.accessToken) return true;
  try {
    await resume(session, chatId);
    return true;
  } catch (err) {
    if (err instanceof AuthRequiredError) return false;
    throw err;
  }
}

/**
 * Run an authenticated API call. On a 401 the chat is resumed once and the
 * call retried; if the chat was never linked an AuthRequiredError is thrown
 * so the caller can re-ask for the user's contact.
 */
export async function withAuth<T>(
  session: Session,
  chatId: number,
  call: (token: string) => Promise<T>,
): Promise<T> {
  if (!session.accessToken) await resume(session, chatId);
  try {
    return await call(session.accessToken as string);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await resume(session, chatId);
      return call(session.accessToken as string);
    }
    throw err;
  }
}

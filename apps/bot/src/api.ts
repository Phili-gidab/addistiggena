import { API_URL, BOT_API_KEY } from './config';

/**
 * Thin typed client for the Addis Tiggena NestJS API (Node 20+ global fetch).
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiUser {
  id: string;
  name?: string | null;
  phone?: string | null;
  language?: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string;
  icon: string | null;
  priceFloorEtb: string | null;
}

export interface Booking {
  id: string;
  status: string;
}

export interface BookingSummary {
  id: string;
  status: string;
  category: { nameEn: string; nameAm: string };
  createdAt: string;
  finalPriceEtb: string | null;
  priceQuoteEtb: string | null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...((init.headers as Record<string, string> | undefined) ?? {}),
      },
    });
  } catch (err) {
    throw new ApiError(0, `API unreachable at ${API_URL}: ${(err as Error).message}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, `API ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const botHeaders = { 'x-bot-key': BOT_API_KEY };
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Link this chat to a user account after a verified contact share. */
export function linkTelegram(chatId: string, phone: string, name?: string): Promise<AuthResult> {
  return request<AuthResult>('/auth/telegram/link', {
    method: 'POST',
    headers: botHeaders,
    body: JSON.stringify({ chatId, phone, ...(name ? { name } : {}) }),
  });
}

/** Restore tokens for an already-linked chat (e.g. after a bot restart). 401 if never linked. */
export function resumeTelegram(chatId: string): Promise<AuthResult> {
  return request<AuthResult>('/auth/telegram/resume', {
    method: 'POST',
    headers: botHeaders,
    body: JSON.stringify({ chatId }),
  });
}

let categoryCache: { at: number; items: Category[] } | null = null;
const CATEGORY_TTL_MS = 60_000;

export async function getCategories(): Promise<Category[]> {
  if (categoryCache && Date.now() - categoryCache.at < CATEGORY_TTL_MS) {
    return categoryCache.items;
  }
  const items = await request<Category[]>('/catalog/categories');
  categoryCache = { at: Date.now(), items };
  return items;
}

export async function findCategory(id: string): Promise<Category | undefined> {
  const items = await getCategories();
  return items.find((c) => c.id === id);
}

export function createBooking(
  token: string,
  input: { categoryId: string; lat: number; lng: number; description?: string; landmarkNote?: string },
): Promise<Booking> {
  return request<Booking>('/bookings', {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify(input),
  });
}

export function fetchMyBookings(token: string): Promise<BookingSummary[]> {
  return request<BookingSummary[]>('/bookings/mine', { headers: bearer(token) });
}

/** Best-effort sync of the chosen language to the user profile; never throws. */
export async function updateLanguage(token: string, lang: 'am' | 'en'): Promise<void> {
  try {
    await request('/users/me', {
      method: 'PATCH',
      headers: bearer(token),
      body: JSON.stringify({ language: lang === 'en' ? 'EN' : 'AM' }),
    });
  } catch (err) {
    console.warn('Language sync failed (non-fatal):', (err as Error).message);
  }
}

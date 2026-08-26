/**
 * API client for the Addis Tiggena platform - React Native flavour of apps/web/lib/api.ts.
 * Tokens live in expo-secure-store; a 401 triggers one silent refresh then a logout event.
 */
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.addistiggena.com';

export type Role =
  | 'CUSTOMER'
  | 'PROVIDER'
  | 'ADMIN'
  | 'OPS_MANAGER'
  | 'VERIFICATION_OFFICER'
  | 'SUPPORT_AGENT';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: Role;
  language?: 'AM' | 'EN';
  username?: string | null;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string;
  priceFloorEtb: string | null;
  subServices?: string[];
}

export interface NearbyProvider {
  id: string;
  name: string | null;
  ratingAvg: number;
  ratingCount: number;
  distanceM: number;
  etaMinutes: number | null;
  bio?: string | null;
}

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAID'
  | 'CANCELLED';

export interface Booking {
  id: string;
  status: BookingStatus;
  createdAt: string;
  description: string | null;
  landmarkNote: string | null;
  lat: number;
  lng: number;
  priceQuoteEtb: string | null;
  finalPriceEtb: string | null;
  offerExpiresAt: string | null;
  escalatedAt?: string | null;
  disputedAt?: string | null;
  photoObjectKey?: string | null;
  paidAt?: string | null;
  completedAt?: string | null;
  category: Category;
  customer?: { id: string; name: string | null; phone: string } | null;
  provider?: {
    id: string;
    ratingAvg?: number;
    ratingCount?: number;
    user?: { id: string; name: string | null; phone: string } | null;
  } | null;
  payment?: { amountEtb: string; gateway: string; status: string } | null;
  review?: { id: string; stars: number; text: string | null; state: string } | null;
}

export interface Ticket {
  id: string;
  type: 'DISPUTE' | 'GUARANTEE_CLAIM' | 'SAFETY';
  status: 'OPEN' | 'RE_INSPECTION' | 'RESOLVED' | 'REJECTED';
  note: string;
  resolutionNote?: string | null;
  createdAt: string;
}

export interface ProviderProfile {
  id: string;
  bio: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  isAvailable: boolean;
  ratingAvg: number;
  ratingCount: number;
  category?: Category;
  serviceRadiusKm: number;
}

export interface Wallet {
  balanceEtb: string;
  transactions?: { id: string; amountEtb: string; type: string; note: string | null; createdAt: string }[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const K_TOKEN = 'tg_token';
const K_REFRESH = 'tg_refresh';
const K_USER = 'tg_user';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let currentUser: User | null = null;
let onSessionLost: (() => void) | null = null;

export const setSessionLostHandler = (fn: () => void) => {
  onSessionLost = fn;
};

export async function loadSession(): Promise<User | null> {
  try {
    const [t, r, u] = await Promise.all([
      SecureStore.getItemAsync(K_TOKEN),
      SecureStore.getItemAsync(K_REFRESH),
      SecureStore.getItemAsync(K_USER),
    ]);
    accessToken = t;
    refreshToken = r;
    currentUser = u ? (JSON.parse(u) as User) : null;
    return accessToken ? currentUser : null;
  } catch {
    return null;
  }
}

export async function saveSession(token: string, user: User, refresh?: string) {
  accessToken = token;
  currentUser = user;
  if (refresh) refreshToken = refresh;
  await Promise.all([
    SecureStore.setItemAsync(K_TOKEN, token),
    SecureStore.setItemAsync(K_USER, JSON.stringify(user)),
    refresh ? SecureStore.setItemAsync(K_REFRESH, refresh) : Promise.resolve(),
  ]);
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  currentUser = null;
  await Promise.all([
    SecureStore.deleteItemAsync(K_TOKEN),
    SecureStore.deleteItemAsync(K_REFRESH),
    SecureStore.deleteItemAsync(K_USER),
  ]);
}

export const getUser = () => currentUser;
export const getToken = () => accessToken;

export const isStaff = (role?: Role | null) =>
  role === 'ADMIN' || role === 'OPS_MANAGER' || role === 'VERIFICATION_OFFICER' || role === 'SUPPORT_AGENT';

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { accessToken: string; refreshToken: string };
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
    await Promise.all([
      SecureStore.setItemAsync(K_TOKEN, body.accessToken),
      SecureStore.setItemAsync(K_REFRESH, body.refreshToken),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    return msg || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function api<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401 && accessToken) {
    if (!retried && (await tryRefresh())) return api<T>(path, init, true);
    await clearSession();
    onSessionLost?.();
    throw new ApiError('Your session expired - please sign in again.', 401);
  }
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Multipart upload of a local image uri; returns the stored objectKey. */
export async function uploadImage(uri: string): Promise<{ objectKey: string; url: string }> {
  const name = uri.split('/').pop() ?? 'photo.jpg';
  const ext = name.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const fd = new FormData();
  // React Native FormData file part
  fd.append('file', { uri, name, type } as unknown as Blob);
  return api<{ objectKey: string; url: string }>('/uploads', { method: 'POST', body: fd });
}

/** Auth-gated image: fetch as blob and return an object URL... RN cannot use
 *  object URLs, so instead we return the uri + headers for <Image source>. */
export const authedImageSource = (objectKey: string) => ({
  uri: `${API_URL}/files/${objectKey}`,
  headers: { authorization: `Bearer ${accessToken}` },
});

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const fmtDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

export const normalizeEtPhone = (raw: string) => {
  const p = raw.replace(/[\s-]/g, '');
  if (/^09\d{8}$/.test(p)) return `+251${p.slice(1)}`;
  if (/^9\d{8}$/.test(p)) return `+251${p}`;
  return p;
};

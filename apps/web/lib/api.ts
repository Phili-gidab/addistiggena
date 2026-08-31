export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';

// ── types (mirror of apps/api responses) ─────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | 'OPS_MANAGER' | 'VERIFICATION_OFFICER' | 'SUPPORT_AGENT';
  language: 'AM' | 'EN';
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string;
  /** Prisma Decimal serialises as string - the "from ETB…" estimate */
  priceFloorEtb: string | null;
  /** named sub-services managed in the admin console */
  subServices?: string[];
}

/**
 * GET /providers/availability - identity-free. Client rule 2026-08-29: the
 * customer never sees WHO the technician is until they accept the job.
 */
export interface CategoryAvailability {
  available: number;
  nearestDistanceM: number | null;
  nearestEtaMinutes: number | null;
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
  description: string | null;
  landmarkNote: string | null;
  lat: number;
  lng: number;
  finalPriceEtb: string | null;
  priceQuoteEtb: string | null;
  /** auto-dispatch: current offer deadline (5-minute window) while REQUESTED */
  offerExpiresAt: string | null;
  photoObjectKey?: string | null;
  /** dispatch escalated to Ops for manual assignment (spec: 3 declines/timeouts) */
  escalatedAt?: string | null;
  /** an open dispute/guarantee ticket exists on this booking */
  disputedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  category: Category;
  customerId: string;
  customer?: { id: string; name: string | null; phone: string };
  provider?: {
    id: string;
    ratingAvg: number;
    user: { id: string; name: string | null; phone: string };
  } | null;
  payment?: { gateway: string; status: string; amountEtb: string; commissionEtb: string | null } | null;
  review?: { stars: number; state: string } | null;
}

export type StaffRole = 'ADMIN' | 'OPS_MANAGER' | 'VERIFICATION_OFFICER' | 'SUPPORT_AGENT';

/** Back-office roles that may open /admin (each sees its own scoped view). */
export function isStaff(role: User['role'] | undefined): role is StaffRole {
  return (
    role === 'ADMIN' ||
    role === 'OPS_MANAGER' ||
    role === 'VERIFICATION_OFFICER' ||
    role === 'SUPPORT_AGENT'
  );
}

export interface Ticket {
  id: string;
  type: 'DISPUTE' | 'GUARANTEE_CLAIM' | 'SAFETY';
  status: 'OPEN' | 'RE_INSPECTION' | 'RESOLVED' | 'REJECTED';
  note: string;
  resolutionNote: string | null;
  refundEtb: string | null;
  createdAt: string;
  resolvedAt: string | null;
  booking: {
    id: string;
    status: BookingStatus;
    completedAt: string | null;
    category: { nameEn: string; nameAm: string };
    customer: { id: string; name: string | null; phone: string };
    provider: { user: { id: string; name: string | null; phone: string } } | null;
  };
  openedBy: { id: string; name: string | null; phone: string; role: string };
  resolvedBy: { id: string; name: string | null; role: string } | null;
}

// ── auth storage ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tg_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tg_refresh');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('tg_user');
  return raw ? (JSON.parse(raw) as User) : null;
}

export function saveSession(token: string, user: User, refreshToken?: string) {
  localStorage.setItem('tg_token', token);
  localStorage.setItem('tg_user', JSON.stringify(user));
  if (refreshToken) localStorage.setItem('tg_refresh', refreshToken);
  window.dispatchEvent(new Event('tg-auth'));
}

export function clearSession() {
  localStorage.removeItem('tg_token');
  localStorage.removeItem('tg_refresh');
  localStorage.removeItem('tg_user');
  window.dispatchEvent(new Event('tg-auth'));
}

// ── fetch helper ─────────────────────────────────────────────────────────────

/** Error thrown by api() carrying the HTTP status so callers can branch on it. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Access tokens live for ~1 h. When a call comes back 401 we silently redeem
 * the 30-day refresh token, retry once, and only if that also fails do we
 * clear the session and bounce the user to /login (instead of the old
 * behaviour of printing a bare "Unauthorized" into the page).
 */
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = getRefreshToken();
    const user = getUser();
    if (!refreshToken || !user) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as { accessToken: string; refreshToken: string };
      saveSession(body.accessToken, user, body.refreshToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    setTimeout(() => (refreshing = null), 0);
  });
  return refreshing;
}

function redirectToLogin() {
  clearSession();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/login?next=${next}`);
  }
}

export async function api<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401 && !path.startsWith('/auth/') && token) {
    if (!retried && (await tryRefresh())) return api<T>(path, init, true);
    redirectToLogin();
    throw new ApiError('Your session expired - please sign in again.', 401);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(msg || `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

/**
 * Raw authenticated fetch with the same silent-refresh-and-retry behaviour as
 * api<T>(), for endpoints that return non-JSON bodies (e.g. /files/:objectKey).
 * Returns the Response so callers can read blobs; never sends "Bearer null".
 */
export async function authorizedFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    throw new ApiError('Your session expired - please sign in again.', 401);
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  if (res.status === 401) {
    if (!retried && (await tryRefresh())) return authorizedFetch(path, init, true);
    redirectToLogin();
    throw new ApiError('Your session expired - please sign in again.', 401);
  }
  return res;
}

export const fmtDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

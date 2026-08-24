'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CategoryBars, DailyBars } from '../../components/charts';
import { StatusBadge } from '../../components/StatusBadge';
import {
  api,
  authorizedFetch,
  Booking,
  Category,
  fmtDate,
  getToken,
  getUser,
  isStaff,
  StaffRole,
  Ticket,
} from '../../lib/api';

const DispatchMap = dynamic(() => import('../../components/DispatchMap'), { ssr: false });

// ── data shapes ──────────────────────────────────────────────────────────────

interface Analytics {
  totals: {
    bookings: number;
    paidBookings: number;
    grossRevenueEtb: string | number;
    commissionEtb: string | number;
    customers: number;
    verifiedProviders: number;
    pendingProviders: number;
  };
  daily: { day: string; count: number }[];
  byCategory: { categoryId: string; name: string; nameAm: string; count: number }[];
}

interface Overview {
  ops: {
    activeJobs: number;
    awaitingDispatch: number;
    escalated: number;
    stalledEnRoute: number;
    techniciansOnline: number;
    avgArrivalMin: number | null;
  };
  support: {
    openTickets: number;
    activeClaims: number;
    resolvedToday: number;
    avgResolutionMin: number | null;
  };
  verification: {
    pendingApplications: number;
    approvedThisWeek: number;
    flaggedForReview: number;
  };
}

interface AdminPayout {
  id: string;
  amountEtb: string;
  destination: string;
  status: string;
  requestedAt: string;
  wallet: { provider: { user: { name: string | null; phone: string } } };
}

interface PendingProvider {
  id: string;
  bio: string | null;
  subCity: string | null;
  woreda: string | null;
  faydaIdNumber: string | null;
  yearsExperience: number | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  verificationStatus: string;
  createdAt: string;
  user: { name: string | null; phone: string };
  category: Category;
  documents: { id: string; type: string; state: string; objectKey: string }[];
}

interface Technician {
  id: string;
  name: string | null;
  phone: string;
  category: { nameEn: string; nameAm: string };
  subCity: string | null;
  verificationStatus: string;
  isAvailable: boolean;
  ratingAvg: number;
  ratingCount: number;
  jobs: number;
  lat: number | null;
  lng: number | null;
  locationUpdatedAt: string | null;
  createdAt: string;
}

interface OpsBooking extends Booking {
  escalatedAt?: string | null;
}

interface StaffAccount {
  id: string;
  name: string | null;
  phone: string;
  username: string | null;
  role: string;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  actorRole: string;
  createdAt: string;
  actor: { name: string | null; username: string | null };
}

interface PendingReview {
  id: string;
  stars: number;
  text: string | null;
  createdAt: string;
  booking: { id: string };
}

// ── role → console configuration (spec section 6) ────────────────────────────

type ViewKey =
  | 'dashboard'
  | 'map'
  | 'bookings'
  | 'technicians'
  | 'verification'
  | 'tickets'
  | 'payouts'
  | 'reviews'
  | 'categories'
  | 'staff'
  | 'audit'
  | 'settings';

const MENU: Record<StaffRole, ViewKey[]> = {
  ADMIN: [
    'dashboard',
    'map',
    'bookings',
    'technicians',
    'verification',
    'tickets',
    'payouts',
    'reviews',
    'categories',
    'staff',
    'audit',
    'settings',
  ],
  OPS_MANAGER: ['dashboard', 'map', 'bookings', 'technicians', 'reviews', 'categories', 'settings'],
  VERIFICATION_OFFICER: ['dashboard', 'verification', 'technicians'],
  SUPPORT_AGENT: ['dashboard', 'tickets', 'bookings', 'technicians', 'reviews'],
};

const VIEW_LABEL: Record<ViewKey, string> = {
  dashboard: 'Dashboard',
  map: 'Live dispatch map',
  bookings: 'Bookings',
  technicians: 'Technicians',
  verification: 'Verification queue',
  tickets: 'Support tickets',
  payouts: 'Payouts',
  reviews: 'Reviews',
  categories: 'Categories & pricing',
  staff: 'Staff & roles',
  audit: 'Audit log',
  settings: 'Settings',
};

/** Sidebar grouping - overview, day-to-day queues, platform configuration. */
const NAV_GROUPS: { label: string; items: ViewKey[] }[] = [
  { label: 'Overview', items: ['dashboard', 'map'] },
  { label: 'Operations', items: ['bookings', 'technicians', 'verification', 'tickets', 'payouts', 'reviews'] },
  { label: 'Platform', items: ['categories', 'staff', 'audit', 'settings'] },
];

const ICONS: Record<ViewKey, React.ReactNode> = (() => {
  const I = (d: React.ReactNode) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d}
    </svg>
  );
  return {
    dashboard: I(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
    map: I(<><path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11Z" /><circle cx="12" cy="10" r="2.6" /></>),
    bookings: I(<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>),
    technicians: I(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /><path d="M17 4.5a3.5 3.5 0 0 1 0 7M21.5 20c-.6-2.6-2.2-4.1-4.3-4.7" /></>),
    verification: I(<><path d="M12 2.5 20 6v5.5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3.5Z" /><path d="m8.7 11.7 2.3 2.3 4.3-4.5" /></>),
    tickets: I(<><path d="M21 11.5c0 4.1-4 7.5-9 7.5-1 0-2-.1-2.9-.4L3 20l1.5-3.6C3.5 15.1 3 13.4 3 11.5 3 7.4 7 4 12 4s9 3.4 9 7.5Z" /></>),
    payouts: I(<><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5h.01M18 14.5h.01" /></>),
    reviews: I(<path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8L12 3Z" />),
    categories: I(<><path d="M3 10.5V4.8C3 3.8 3.8 3 4.8 3h5.7c.5 0 .9.2 1.3.5l8.7 8.7c.7.7.7 1.8 0 2.6l-5.7 5.7c-.7.7-1.8.7-2.6 0l-8.7-8.7a1.8 1.8 0 0 1-.5-1.3Z" /><circle cx="7.5" cy="7.5" r="1.2" /></>),
    staff: I(<><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.8-3.4 3.4-5 6.5-5 1.7 0 3.2.5 4.4 1.4" /><path d="M18.5 14v6M15.5 17h6" /></>),
    audit: I(<><path d="M6 2.5h9l4 4V21.5H6z" /><path d="M15 2.5V7h4M9.5 12h6M9.5 16h6" /></>),
    settings: I(<><path d="M4 21v-6M4 9V3M12 21v-9M12 6V3M20 21v-4M20 11V3" /><path d="M1.5 15h5M9.5 6h5M17.5 17h5" /></>),
  };
})();

const ROLE_TITLES: Record<StaffRole, { en: string; am: string; sub: string }> = {
  ADMIN: {
    en: 'Super Admin',
    am: 'ዋና አስተዳዳሪ',
    sub: 'Full platform control: dispatch, vetting, support, finance, staff, audit.',
  },
  OPS_MANAGER: {
    en: 'Dispatch operations',
    am: 'የስምሪት ክፍል',
    sub: 'Live jobs, stuck dispatches, manual assignment, coverage and pricing.',
  },
  VERIFICATION_OFFICER: {
    en: 'Verification desk',
    am: 'የማረጋገጫ ክፍል',
    sub: 'Technician vetting: approve, reject, suspend - always with a reason code.',
  },
  SUPPORT_AGENT: {
    en: 'Support desk',
    am: 'የደንበኞች ድጋፍ',
    sub: 'Disputes, guarantee claims, re-inspections, customer and technician lookup.',
  },
};

const TICKET_LABEL: Record<Ticket['type'], string> = {
  DISPUTE: 'Dispute',
  GUARANTEE_CLAIM: 'Guarantee claim',
  SAFETY: 'Safety flag',
};

const REQUIRED_DOCS = [
  { type: 'NATIONAL_ID', label: 'Fayda ID' },
  { type: 'WOREDA_RECOMMENDATION', label: 'Woreda letter' },
  { type: 'COC_CERTIFICATE', label: 'CoC pass' },
  { type: 'POLICE_CLEARANCE', label: 'Police clearance' },
];

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

// ── page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [role, setRole] = useState<StaffRole | null>(null);
  const [view, setView] = useState<ViewKey>('dashboard');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [overview, setOverview] = useState<Overview | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [bookings, setBookings] = useState<OpsBooking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [verifStatus, setVerifStatus] = useState('PENDING');
  const [verifRows, setVerifRows] = useState<PendingProvider[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketHistory, setTicketHistory] = useState<Ticket[] | null>(null);
  const [refundCap, setRefundCap] = useState<number | null>(null);
  const [ops, setOps] = useState<{ escalated: OpsBooking[]; stalled: OpsBooking[] } | null>(null);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [cats, setCats] = useState<(Category & { isActive?: boolean })[]>([]);
  const [catEdit, setCatEdit] = useState<Record<string, string>>({});
  const [subsEdit, setSubsEdit] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [rate, setRate] = useState('');
  const [capInput, setCapInput] = useState('');
  const [assignPick, setAssignPick] = useState<Record<string, string>>({});
  const [bookingFilter, setBookingFilter] = useState('');
  const [ticketForm, setTicketForm] = useState<{
    id: string;
    mode: 'resolve' | 'reject';
    note: string;
    refund: string;
  } | null>(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    phone: '',
    username: '',
    password: '',
    role: 'SUPPORT_AGENT',
  });

  const can = useCallback((v: ViewKey, r: StaffRole | null = role) => (r ? MENU[r].includes(v) : false), [role]);

  const load = useCallback(
    (r: StaffRole) => {
      const has = (v: ViewKey) => MENU[r].includes(v);
      api<Overview>('/admin/overview').then(setOverview).catch(() => {});
      if (has('bookings') || has('map')) {
        api<OpsBooking[]>('/admin/bookings').then(setBookings).catch(() => {});
      }
      api<Technician[]>('/admin/technicians').then(setTechnicians).catch(() => {});
      if (r === 'ADMIN' || r === 'OPS_MANAGER') {
        api<Analytics>('/admin/analytics').then(setAnalytics).catch(() => {});
        api<{ escalated: OpsBooking[]; stalled: OpsBooking[] }>('/admin/ops/queue')
          .then(setOps)
          .catch(() => {});
        api<(Category & { isActive?: boolean })[]>('/admin/categories').then(setCats).catch(() => {});
        api<{ rate: number }>('/admin/config/commission')
          .then((res) => setRate(String(res.rate)))
          .catch(() => {});
      }
      if (has('verification')) {
        api<PendingProvider[]>(`/admin/providers?status=${verifStatus}`)
          .then(setVerifRows)
          .catch((e) => setError((e as Error).message));
      }
      if (has('tickets')) {
        api<Ticket[]>('/admin/tickets').then(setTickets).catch(() => {});
        api<{ capEtb: number }>('/admin/config/refund-cap')
          .then((res) => {
            setRefundCap(res.capEtb);
            setCapInput(String(res.capEtb));
          })
          .catch(() => {});
      }
      if (has('payouts')) api<AdminPayout[]>('/admin/payouts').then(setPayouts).catch(() => {});
      if (has('reviews')) api<PendingReview[]>('/admin/reviews').then(setReviews).catch(() => {});
      if (has('staff')) api<StaffAccount[]>('/admin/staff').then(setStaff).catch(() => {});
      if (has('audit')) api<AuditEntry[]>('/admin/audit').then(setAudit).catch(() => {});
    },
    [verifStatus],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/admin');
      return;
    }
    const r = getUser()?.role;
    if (!isStaff(r)) {
      setError('This area requires a staff account. Sign in as admin, ops, verifier or support.');
      return;
    }
    setRole(r);
    load(r);
    const t = setInterval(() => load(r), 30000);
    return () => clearInterval(t);
  }, [load, router]);

  const reload = useCallback(() => {
    const r = getUser()?.role;
    if (isStaff(r)) load(r);
  }, [load]);

  async function act(path: string, body?: object, method: 'POST' | 'PUT' = 'POST') {
    setError('');
    setNotice('');
    try {
      await api(path, { method, body: JSON.stringify(body ?? {}) });
      setNotice('Done.');
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function assign(bookingId: string) {
    const providerId = assignPick[bookingId];
    if (!providerId) {
      setError('Pick a technician first.');
      return;
    }
    const reason = window.prompt('Reason code for this manual assignment (goes to the audit log):');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('A short reason is required - it feeds the audit log.');
      return;
    }
    await act(`/admin/bookings/${bookingId}/assign`, { providerId, reason: reason.trim() });
  }

  async function submitTicketForm() {
    if (!ticketForm) return;
    const { id, mode, note, refund } = ticketForm;
    if (note.trim().length < 3) {
      setError('A resolution note is required - the customer receives it.');
      return;
    }
    const refundEtb = refund.trim() ? Number(refund) : undefined;
    if (refund.trim() && !Number.isFinite(refundEtb)) {
      setError('Refund must be a number.');
      return;
    }
    await act(`/admin/tickets/${id}/${mode}`, {
      resolutionNote: note.trim(),
      ...(mode === 'resolve' ? { refundEtb } : {}),
    });
    setTicketForm(null);
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/admin/staff', { method: 'POST', body: JSON.stringify(newStaff) });
      setNotice(`Staff account "${newStaff.username}" created (${newStaff.role}).`);
      setNewStaff({ name: '', phone: '', username: '', password: '', role: 'SUPPORT_AGENT' });
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function openDocument(objectKey: string) {
    setError('');
    try {
      const res = await authorizedFetch(`/files/${objectKey}`);
      if (!res.ok) throw new Error(`Could not open document (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadTicketHistory() {
    try {
      const [resolved, rejected] = await Promise.all([
        api<Ticket[]>('/admin/tickets?status=RESOLVED'),
        api<Ticket[]>('/admin/tickets?status=REJECTED'),
      ]);
      setTicketHistory(
        [...resolved, ...rejected].sort(
          (a, b) => +new Date(b.resolvedAt ?? b.createdAt) - +new Date(a.resolvedAt ?? a.createdAt),
        ),
      );
    } catch {
      setTicketHistory([]);
    }
  }

  const titles = role ? ROLE_TITLES[role] : null;
  const stuckCount = (overview?.ops.escalated ?? 0) + (overview?.ops.stalledEnRoute ?? 0);
  const badge = (v: ViewKey): number | null => {
    if (!overview) return null;
    if (v === 'verification') return overview.verification.pendingApplications || null;
    if (v === 'tickets') return overview.support.openTickets || null;
    if (v === 'map') return overview.ops.activeJobs + overview.ops.awaitingDispatch || null;
    if (v === 'reviews') return reviews.length || null;
    if (v === 'payouts') return payouts.length || null;
    return null;
  };

  // ── reusable pieces ────────────────────────────────────────────────────────

  const tile = (v: string | number, k: string, hi = false) => (
    <div className={`tile${hi ? ' hi' : ''}`} key={k}>
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  );

  const assignRow = (b: OpsBooking, flavor: 'escalated' | 'stalled') => (
    <div key={b.id} className="booking-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
      <span>
        <span className="what">
          #{b.id.slice(-6).toUpperCase()} · {b.category.nameEn}
          {flavor === 'stalled' && b.provider?.user
            ? ` - ${b.provider.user.name ?? b.provider.user.phone} (no GPS ping 15+ min)`
            : ''}
        </span>
        <span className="when" style={{ display: 'block' }}>
          {b.customer?.name ?? b.customer?.phone ?? 'customer'} ·{' '}
          {flavor === 'escalated'
            ? `escalated after 3 declined/expired offers${b.escalatedAt ? ` · ${fmtDate(b.escalatedAt)}` : ''}`
            : `en route since ${fmtDate(b.createdAt)}`}
        </span>
      </span>
      <span className="row" style={{ gap: '0.4rem' }}>
        <select
          className="input"
          style={{ maxWidth: 220 }}
          value={assignPick[b.id] ?? ''}
          onChange={(e) => setAssignPick((prev) => ({ ...prev, [b.id]: e.target.value }))}
        >
          <option value="">Assign technician…</option>
          {technicians
            .filter((t) => t.verificationStatus === 'VERIFIED')
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name ?? t.phone} · {t.category.nameEn}
                {t.isAvailable ? ' · online' : ''}
              </option>
            ))}
        </select>
        <button className="btn btn-teal btn-sm" onClick={() => assign(b.id)}>
          Assign
        </button>
      </span>
    </div>
  );

  const exceptionsPanel = (
    <div className="panel">
      <h2>Dispatch exceptions ({(ops?.escalated.length ?? 0) + (ops?.stalled.length ?? 0)})</h2>
      {ops && ops.escalated.length === 0 && ops.stalled.length === 0 && (
        <p className="hint">
          No stuck jobs. Escalations land here after 3 declined or expired offers; en-route jobs
          appear when the technician stops sending GPS pings for 15 minutes.
        </p>
      )}
      {ops?.escalated.map((b) => assignRow(b, 'escalated'))}
      {ops?.stalled.map((b) => assignRow(b, 'stalled'))}
    </div>
  );

  const ticketRow = (t: Ticket, history = false) => (
    <div key={t.id} className="booking-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
      <span>
        <span className="what">
          {TICKET_LABEL[t.type]}
          {t.status === 'RE_INSPECTION' ? ' · re-inspection scheduled' : ''}
          {history ? ` · ${t.status.toLowerCase()}` : ''} - #{t.booking.id.slice(-6).toUpperCase()} (
          {t.booking.category.nameEn})
        </span>
        <span className="when" style={{ display: 'block', maxWidth: 460 }}>
          “{t.note}” - {t.openedBy.name ?? t.openedBy.phone} · {fmtDate(t.createdAt)}
          {t.booking.provider?.user
            ? ` · technician: ${t.booking.provider.user.name ?? t.booking.provider.user.phone}`
            : ''}
          {history && t.resolutionNote ? ` · outcome: ${t.resolutionNote}` : ''}
        </span>
        {ticketForm?.id === t.id && (
          <span className="ticket-form">
            <textarea
              rows={2}
              className="input"
              placeholder={
                ticketForm.mode === 'resolve'
                  ? 'Resolution note (sent to the customer)…'
                  : 'Why is this ticket being rejected?…'
              }
              value={ticketForm.note}
              onChange={(e) => setTicketForm({ ...ticketForm, note: e.target.value })}
            />
            {ticketForm.mode === 'resolve' && (
              <input
                className="input"
                style={{ maxWidth: 190 }}
                placeholder={`Refund ETB (optional${refundCap != null && role === 'SUPPORT_AGENT' ? `, cap ${refundCap}` : ''})`}
                inputMode="decimal"
                value={ticketForm.refund}
                onChange={(e) => setTicketForm({ ...ticketForm, refund: e.target.value })}
              />
            )}
            <span className="row" style={{ gap: '0.4rem' }}>
              <button className="btn btn-teal btn-sm" onClick={submitTicketForm}>
                Confirm {ticketForm.mode}
              </button>
              <button className="btn btn-line btn-sm" onClick={() => setTicketForm(null)}>
                Cancel
              </button>
            </span>
          </span>
        )}
      </span>
      {!history && ticketForm?.id !== t.id && (
        <span className="row" style={{ gap: '0.4rem' }}>
          {t.type === 'GUARANTEE_CLAIM' && t.status === 'OPEN' && (
            <button className="btn btn-dark btn-sm" onClick={() => act(`/admin/tickets/${t.id}/reinspect`)}>
              Re-inspection
            </button>
          )}
          <button
            className="btn btn-teal btn-sm"
            onClick={() => setTicketForm({ id: t.id, mode: 'resolve', note: '', refund: '' })}
          >
            Resolve ✓
          </button>
          <button
            className="btn btn-line btn-sm"
            onClick={() => setTicketForm({ id: t.id, mode: 'reject', note: '', refund: '' })}
          >
            Reject
          </button>
        </span>
      )}
    </div>
  );

  // ── views ──────────────────────────────────────────────────────────────────

  const dashboardView = (
    <>
      {role === 'ADMIN' && analytics && (
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {tile(analytics.totals.bookings, 'bookings, all time', true)}
          {tile(`${analytics.totals.grossRevenueEtb} ETB`, 'gross revenue')}
          {tile(`${analytics.totals.commissionEtb} ETB`, 'platform commission')}
          {tile(overview?.ops.activeJobs ?? '…', 'jobs live now')}
          {tile(overview?.support.openTickets ?? '…', 'open tickets')}
          {tile(overview?.verification.pendingApplications ?? '…', 'pending vetting')}
        </div>
      )}
      {role === 'OPS_MANAGER' && (
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {tile(overview?.ops.activeJobs ?? '…', 'active jobs', true)}
          {tile(overview?.ops.awaitingDispatch ?? '…', 'awaiting dispatch')}
          {tile(stuckCount, 'stuck / stalled')}
          {tile(overview?.ops.techniciansOnline ?? '…', 'technicians online')}
          {tile(
            overview?.ops.avgArrivalMin != null ? `${overview.ops.avgArrivalMin} min` : '-',
            'avg arrival (7d)',
          )}
        </div>
      )}
      {role === 'SUPPORT_AGENT' && (
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {tile(overview?.support.openTickets ?? '…', 'open tickets', true)}
          {tile(overview?.support.activeClaims ?? '…', 'guarantee claims active')}
          {tile(overview?.support.resolvedToday ?? '…', 'resolved today')}
          {tile(
            overview?.support.avgResolutionMin != null
              ? `${Math.round(overview.support.avgResolutionMin / 60)}h`
              : '-',
            'avg resolution (7d)',
          )}
        </div>
      )}
      {role === 'VERIFICATION_OFFICER' && (
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {tile(overview?.verification.pendingApplications ?? '…', 'pending applications', true)}
          {tile(overview?.verification.approvedThisWeek ?? '…', 'approved this week')}
          {tile(overview?.verification.flaggedForReview ?? '…', 'suspended / flagged')}
        </div>
      )}

      {/* quick actions (spec: one write action or one jump each) */}
      <div className="qa-row">
        {can('map') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('map')}>
            Live dispatch map
          </button>
        )}
        {(role === 'ADMIN' || role === 'OPS_MANAGER') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('dashboard')}>
            Stuck jobs ({stuckCount})
          </button>
        )}
        {can('verification') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('verification')}>
            Review next application
          </button>
        )}
        {can('tickets') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('tickets')}>
            Ticket queue ({overview?.support.openTickets ?? 0})
          </button>
        )}
        {can('staff') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('staff')}>
            + Create staff account
          </button>
        )}
        {can('audit') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('audit')}>
            Audit log
          </button>
        )}
      </div>

      {/* the role's primary queue sits on the dashboard (spec section 8) */}
      {(role === 'ADMIN' || role === 'OPS_MANAGER') && exceptionsPanel}
      {role === 'SUPPORT_AGENT' && (
        <div className="panel">
          <h2>Open tickets ({tickets.length})</h2>
          {tickets.length === 0 && <p className="hint">No open disputes or guarantee claims.</p>}
          {tickets.slice(0, 5).map((t) => ticketRow(t))}
          {tickets.length > 5 && (
            <button className="btn btn-line btn-sm" onClick={() => setView('tickets')}>
              See all →
            </button>
          )}
        </div>
      )}
      {role === 'VERIFICATION_OFFICER' && verificationTable(verifRows, true)}

      {(role === 'ADMIN' || role === 'OPS_MANAGER') && analytics && (
        <>
          <div className="panel">
            <h2>Bookings - last 14 days</h2>
            <DailyBars data={analytics.daily} />
          </div>
          <div className="panel">
            <h2>Category demand · የአገልግሎት ፍላጎት</h2>
            <CategoryBars data={analytics.byCategory} />
          </div>
        </>
      )}
    </>
  );

  function verificationTable(rows: PendingProvider[] | null, compact = false) {
    return (
      <div className="panel" key="verif">
        <h2>
          Verification queue{rows ? ` (${rows.length})` : ''}
        </h2>
        {!compact && (
          <div className="qa-row">
            {['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                className={`btn btn-sm ${verifStatus === st ? 'btn-dark' : 'btn-line'}`}
                onClick={() => setVerifStatus(st)}
              >
                {st.toLowerCase()}
              </button>
            ))}
          </div>
        )}
        {rows?.length === 0 && <p className="hint">Nothing in this list.</p>}
        {!!rows?.length && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Trade</th>
                  <th>Documents</th>
                  <th>Applied</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.user.name ?? 'Unnamed'}</strong>
                      <div className="hint">{p.user.phone}</div>
                      <div className="hint">
                        {[
                          p.subCity && `${p.woreda ? `Woreda ${p.woreda}, ` : ''}${p.subCity}`,
                          p.faydaIdNumber && `Fayda: ${p.faydaIdNumber}`,
                          p.yearsExperience != null && `${p.yearsExperience} yrs exp.`,
                          p.guarantorName &&
                            `Guarantor: ${p.guarantorName}${p.guarantorPhone ? ` (${p.guarantorPhone})` : ''}`,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'no vetting details submitted'}
                      </div>
                    </td>
                    <td>{p.category.nameEn}</td>
                    <td>
                      {p.documents.length === 0 && <span className="hint">none yet</span>}
                      {p.documents.map((d) => (
                        <button key={d.id} type="button" className="doc-link" onClick={() => openDocument(d.objectKey)}>
                          {d.type.replace(/_/g, ' ').toLowerCase()}
                        </button>
                      ))}
                      <div className="hint" style={{ marginTop: '0.3rem' }}>
                        {REQUIRED_DOCS.map((r) => (
                          <span key={r.type} style={{ marginRight: '0.6rem', whiteSpace: 'nowrap' }}>
                            {p.documents.some((d) => d.type === r.type) ? '✓' : '✗'} {r.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="hint">{fmtDate(p.createdAt)}</td>
                    <td>
                      <span className="row" style={{ justifyContent: 'flex-end' }}>
                        {p.verificationStatus !== 'VERIFIED' && (
                          <button className="btn btn-teal btn-sm" onClick={() => act(`/admin/providers/${p.id}/verify`)}>
                            Verify ✓
                          </button>
                        )}
                        {p.verificationStatus === 'PENDING' && (
                          <button
                            className="btn btn-line btn-sm"
                            onClick={() => {
                              const note = window.prompt('Reason for rejection · ውድቅ የሆነበት ምክንያት');
                              if (note === null) return;
                              act(`/admin/providers/${p.id}/reject`, note.trim() ? { note: note.trim() } : undefined);
                            }}
                          >
                            Reject
                          </button>
                        )}
                        {p.verificationStatus === 'VERIFIED' && (
                          <button
                            className="btn btn-line btn-sm"
                            onClick={() => {
                              const note = window.prompt('Reason for suspension (required):');
                              if (!note || note.trim().length < 3) return;
                              act(`/admin/providers/${p.id}/suspend`, { note: note.trim() });
                            }}
                          >
                            Suspend
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    const q = bookingFilter.trim().toLowerCase();
    if (!q) return true;
    return [
      b.id.slice(-6),
      b.customer?.name,
      b.customer?.phone,
      b.provider?.user?.name,
      b.provider?.user?.phone,
      b.category.nameEn,
      b.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const mapJobs = bookings
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .map((b) => ({
      id: b.id,
      status: b.status,
      lat: b.lat,
      lng: b.lng,
      label: `#${b.id.slice(-6).toUpperCase()} ${b.category.nameEn}`,
      sub: `${b.status} · ${b.customer?.name ?? b.customer?.phone ?? ''}`,
    }));
  const mapTechs = technicians
    .filter((t) => t.isAvailable && t.verificationStatus === 'VERIFIED' && t.lat != null && t.lng != null)
    .map((t) => ({
      id: t.id,
      lat: t.lat!,
      lng: t.lng!,
      label: t.name ?? t.phone,
      sub: `${t.category.nameEn} · online`,
    }));

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1180 }}>
        <h1 className="page-title">{titles ? `${titles.en} · ${titles.am}` : 'Staff console'}</h1>
        <p className="page-sub">{titles?.sub ?? ''}</p>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="ok-box">{notice}</div>}

        {role && (
          <div className="admin-shell">
            <aside className="admin-side">
              <div className="role-tag">{role.replace(/_/g, ' ')}</div>
              <nav className="admin-nav">
                {NAV_GROUPS.map((g) => {
                  const items = g.items.filter((v) => MENU[role].includes(v));
                  if (items.length === 0) return null;
                  return (
                    <div className="nav-group" key={g.label}>
                      <span className="nav-group-label">{g.label}</span>
                      {items.map((v) => (
                        <button
                          key={v}
                          className={view === v ? 'on' : ''}
                          onClick={() => {
                            setView(v);
                            if (v === 'tickets') setTicketHistory(null);
                          }}
                        >
                          <span className="nav-item">
                            <span className="ic">{ICONS[v]}</span>
                            {VIEW_LABEL[v]}
                          </span>
                          {badge(v) != null && <span className="badge">{badge(v)}</span>}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </nav>
            </aside>

            <section className="admin-main">
              <div className="view-head">
                <span className="crumb">
                  {VIEW_LABEL[view]}
                </span>
                <button className="btn btn-line btn-sm" onClick={reload}>
                  ↻ Refresh
                </button>
              </div>
              {view === 'dashboard' && dashboardView}

              {view === 'map' && can('map') && (
                <div className="panel">
                  <h2>
                    Live dispatch map · {mapJobs.length} active job{mapJobs.length === 1 ? '' : 's'},{' '}
                    {mapTechs.length} technician{mapTechs.length === 1 ? '' : 's'} online
                  </h2>
                  <DispatchMap jobs={mapJobs} techs={mapTechs} />
                </div>
              )}

              {view === 'bookings' && (
                <div className="panel">
                  <h2>Bookings ({filteredBookings.length})</h2>
                  <input
                    className="input mb"
                    style={{ maxWidth: 340 }}
                    placeholder="Search ref, customer, phone, technician…"
                    value={bookingFilter}
                    onChange={(e) => setBookingFilter(e.target.value)}
                  />
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ref</th>
                          <th>Service</th>
                          <th>Customer</th>
                          <th>Technician</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.slice(0, 25).map((b) => (
                          <tr key={b.id}>
                            <td className="hint">
                              #{b.id.slice(-6).toUpperCase()}
                              {b.disputedAt && <span title="open ticket"> ⚑</span>}
                            </td>
                            <td>{b.category.nameEn}</td>
                            <td>
                              {b.customer?.name ?? '-'}
                              <div className="hint">{b.customer?.phone}</div>
                            </td>
                            <td>{b.provider?.user?.name ?? '-'}</td>
                            <td>
                              {b.payment
                                ? `${b.payment.amountEtb} ETB`
                                : b.finalPriceEtb
                                  ? `${b.finalPriceEtb} ETB`
                                  : '-'}
                            </td>
                            <td>
                              <StatusBadge status={b.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === 'technicians' && (
                <div className="panel">
                  <h2>Technicians ({technicians.length})</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Trade</th>
                          <th>Sub-city</th>
                          <th>Status</th>
                          <th>Rating</th>
                          <th>Jobs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {technicians.map((t) => (
                          <tr key={t.id}>
                            <td>
                              {t.isAvailable && t.verificationStatus === 'VERIFIED' && (
                                <span style={{ color: 'var(--teal)' }}>● </span>
                              )}
                              {t.name ?? '-'}
                              <div className="hint">{t.phone}</div>
                            </td>
                            <td>{t.category.nameEn}</td>
                            <td>{t.subCity ?? '-'}</td>
                            <td className="hint">{t.verificationStatus.toLowerCase()}</td>
                            <td>{t.ratingCount ? `★ ${t.ratingAvg.toFixed(1)} (${t.ratingCount})` : '-'}</td>
                            <td>{t.jobs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === 'verification' && can('verification') && verificationTable(verifRows)}

              {view === 'tickets' && can('tickets') && (
                <>
                  <div className="panel">
                    <h2>Open tickets ({tickets.length})</h2>
                    {refundCap != null && role === 'SUPPORT_AGENT' && (
                      <p className="hint">
                        You can record refunds up to ETB {refundCap} independently - larger amounts
                        need Ops or the Super Admin.
                      </p>
                    )}
                    {tickets.length === 0 && <p className="hint">No open disputes or guarantee claims.</p>}
                    {tickets.map((t) => ticketRow(t))}
                  </div>
                  <div className="panel">
                    <h2>Resolved history</h2>
                    {ticketHistory === null ? (
                      <button className="btn btn-line btn-sm" onClick={loadTicketHistory}>
                        Load history
                      </button>
                    ) : ticketHistory.length === 0 ? (
                      <p className="hint">No resolved tickets yet.</p>
                    ) : (
                      ticketHistory.slice(0, 20).map((t) => ticketRow(t, true))
                    )}
                  </div>
                </>
              )}

              {view === 'payouts' && can('payouts') && (
                <div className="panel">
                  <h2>Payout queue ({payouts.length})</h2>
                  {payouts.length === 0 && <p className="hint">No payouts waiting.</p>}
                  {payouts.map((p) => (
                    <div key={p.id} className="booking-row" style={{ cursor: 'default' }}>
                      <span>
                        <span className="what">
                          {p.amountEtb} ETB - {p.wallet.provider.user.name ?? p.wallet.provider.user.phone}
                        </span>
                        <span className="when" style={{ display: 'block' }}>
                          → {p.destination} · {fmtDate(p.requestedAt)}
                        </span>
                      </span>
                      <span className="row">
                        <button className="btn btn-teal btn-sm" onClick={() => act(`/admin/payouts/${p.id}/process`)}>
                          Process ✓
                        </button>
                        <button className="btn btn-line btn-sm" onClick={() => act(`/admin/payouts/${p.id}/reject`)}>
                          Reject
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {view === 'reviews' && can('reviews') && (
                <div className="panel">
                  <h2>Review moderation ({reviews.length})</h2>
                  {reviews.length === 0 && <p className="hint">No reviews pending moderation.</p>}
                  {reviews.map((r) => (
                    <div key={r.id} className="booking-row" style={{ cursor: 'default' }}>
                      <span>
                        <span className="what">
                          {'★'.repeat(r.stars)}
                          {'☆'.repeat(5 - r.stars)}
                        </span>
                        <span className="when" style={{ display: 'block' }}>
                          {r.text ?? '(no text)'} - {fmtDate(r.createdAt)}
                        </span>
                      </span>
                      <span className="row">
                        <button className="btn btn-teal btn-sm" onClick={() => act(`/admin/reviews/${r.id}/publish`)}>
                          Publish
                        </button>
                        <button className="btn btn-line btn-sm" onClick={() => act(`/admin/reviews/${r.id}/reject`)}>
                          Reject
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {view === 'categories' && can('categories') && (
                <div className="panel">
                  <h2>Categories & pricing</h2>
                  <p className="hint">
                    The floor price is the &quot;from ETB…&quot; estimate customers see at booking
                    time. Sub-services feed the search box. Changes apply immediately and are
                    audit-logged.
                  </p>
                  <form
                    className="row cat-create"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const nameEn = String(f.get('nameEn') ?? '').trim();
                      const nameAm = String(f.get('nameAm') ?? '').trim();
                      if (nameEn.length < 2 || !nameAm) {
                        setError('English and Amharic names are required.');
                        return;
                      }
                      await act(
                        '/admin/categories',
                        {
                          nameEn,
                          nameAm,
                          priceFloorEtb: Number(f.get('floor') || 250),
                          subServices: String(f.get('subs') ?? '')
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean),
                        },
                        'POST',
                      );
                      (e.target as HTMLFormElement).reset();
                    }}
                  >
                    <input className="input" name="nameEn" style={{ maxWidth: 180 }} placeholder="New category (English)" />
                    <input className="input" name="nameAm" style={{ maxWidth: 160 }} placeholder="ስም (Amharic)" />
                    <input className="input" name="floor" style={{ maxWidth: 110 }} placeholder="Floor ETB" inputMode="numeric" />
                    <input className="input" name="subs" style={{ minWidth: 220, flex: 1 }} placeholder="Sub-services, comma-separated" />
                    <button className="btn btn-dark btn-sm">+ Add category</button>
                  </form>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Floor price (ETB)</th>
                          <th>Sub-services</th>
                          <th>Active</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cats.map((c) => (
                          <tr key={c.id}>
                            <td>
                              {c.nameEn}
                              <div className="hint" style={{ fontFamily: 'var(--font-am)' }}>{c.nameAm}</div>
                            </td>
                            <td>
                              <input
                                className="input"
                                style={{ maxWidth: 110 }}
                                inputMode="numeric"
                                value={catEdit[c.id] ?? String(c.priceFloorEtb ?? '')}
                                onChange={(e) => setCatEdit((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                style={{ minWidth: 220 }}
                                placeholder="Sub-services, comma-separated"
                                value={subsEdit[c.id] ?? (c.subServices ?? []).join(', ')}
                                onChange={(e) => setSubsEdit((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              />
                            </td>
                            <td>{c.isActive === false ? <span className="hint">inactive</span> : 'yes'}</td>
                            <td>
                              <span className="row" style={{ justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-dark btn-sm"
                                  onClick={() =>
                                    act(
                                      `/admin/categories/${c.id}`,
                                      {
                                        priceFloorEtb: Number(catEdit[c.id] ?? c.priceFloorEtb),
                                        subServices: (subsEdit[c.id] ?? (c.subServices ?? []).join(', '))
                                          .split(',')
                                          .map((x: string) => x.trim())
                                          .filter(Boolean),
                                      },
                                      'PUT',
                                    )
                                  }
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-line btn-sm"
                                  onClick={() => act(`/admin/categories/${c.id}`, { isActive: c.isActive === false }, 'PUT')}
                                >
                                  {c.isActive === false ? 'Activate' : 'Deactivate'}
                                </button>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === 'staff' && can('staff') && (
                <div className="panel">
                  <h2>Staff accounts ({staff.length})</h2>
                  {staff.map((m) => (
                    <div key={m.id} className="booking-row" style={{ cursor: 'default' }}>
                      <span>
                        <span className="what">
                          {m.name ?? m.username} · <code>{m.username}</code>
                        </span>
                        <span className="when" style={{ display: 'block' }}>
                          {m.role.replace(/_/g, ' ').toLowerCase()} · {m.phone} · since {fmtDate(m.createdAt)}
                        </span>
                      </span>
                    </div>
                  ))}
                  <form onSubmit={createStaff} className="row" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.8rem' }}>
                    <input className="input" style={{ maxWidth: 160 }} placeholder="Full name" value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
                    <input className="input" style={{ maxWidth: 140 }} placeholder="09… phone" value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} />
                    <input className="input" style={{ maxWidth: 130 }} placeholder="username" value={newStaff.username}
                      onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })} />
                    <input className="input" style={{ maxWidth: 140 }} placeholder="password (8+)" type="password" value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
                    <select className="input" style={{ maxWidth: 190 }} value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
                      <option value="OPS_MANAGER">Operations Manager</option>
                      <option value="VERIFICATION_OFFICER">Verification Officer</option>
                      <option value="SUPPORT_AGENT">Support Agent</option>
                      <option value="ADMIN">Super Admin</option>
                    </select>
                    <button
                      className="btn btn-dark btn-sm"
                      disabled={
                        newStaff.name.length < 2 ||
                        newStaff.phone.length < 9 ||
                        newStaff.username.length < 3 ||
                        newStaff.password.length < 8
                      }
                    >
                      + Create account
                    </button>
                  </form>
                </div>
              )}

              {view === 'audit' && can('audit') && (
                <div className="panel">
                  <h2>Audit log</h2>
                  {audit.length === 0 && <p className="hint">No staff overrides recorded yet.</p>}
                  {audit.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>When</th>
                            <th>Who</th>
                            <th>Action</th>
                            <th>Target</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {audit.slice(0, 40).map((a) => (
                            <tr key={a.id}>
                              <td className="hint">{fmtDate(a.createdAt)}</td>
                              <td>
                                {a.actor.name ?? a.actor.username}
                                <div className="hint">{a.actorRole.replace(/_/g, ' ').toLowerCase()}</div>
                              </td>
                              <td>
                                <code>{a.action}</code>
                              </td>
                              <td className="hint">
                                {a.targetType} #{a.targetId.slice(-6)}
                              </td>
                              <td className="hint" style={{ maxWidth: 240 }}>
                                {a.reason ?? '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {view === 'settings' && can('settings') && (
                <>
                  <div className="panel">
                    <h2>Commission rate</h2>
                    <div className="row">
                      <input className="input" style={{ maxWidth: 140 }} value={rate}
                        onChange={(e) => setRate(e.target.value)} inputMode="decimal" />
                      <button
                        className="btn btn-dark btn-sm"
                        onClick={() => act('/admin/config/commission', { rate: Number(rate) }, 'PUT')}
                      >
                        Save
                      </button>
                      <span className="hint">fraction of gross, e.g. 0.10 = 10% - applies to new settlements</span>
                    </div>
                  </div>
                  <div className="panel">
                    <h2>Support refund cap</h2>
                    <div className="row">
                      <input className="input" style={{ maxWidth: 140 }} value={capInput}
                        onChange={(e) => setCapInput(e.target.value)} inputMode="numeric" />
                      <button
                        className="btn btn-dark btn-sm"
                        onClick={() => act('/admin/config/refund-cap', { capEtb: Number(capInput) }, 'PUT')}
                      >
                        Save
                      </button>
                      <span className="hint">
                        ETB a Support Agent may refund independently - above it routes to Ops/Admin
                      </span>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

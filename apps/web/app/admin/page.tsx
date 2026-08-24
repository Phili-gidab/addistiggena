'use client';

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

interface OpsBooking extends Booking {
  provider?: {
    id: string;
    ratingAvg: number;
    locationUpdatedAt?: string | null;
    user: { id: string; name: string | null; phone: string };
  } | null;
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

// Mandatory checklist from the official vetting protocol.
const REQUIRED_DOCS = [
  { type: 'NATIONAL_ID', label: 'Fayda ID' },
  { type: 'WOREDA_RECOMMENDATION', label: 'Woreda letter' },
  { type: 'COC_CERTIFICATE', label: 'CoC pass' },
  { type: 'POLICE_CLEARANCE', label: 'Police clearance' },
];

interface PendingReview {
  id: string;
  stars: number;
  text: string | null;
  createdAt: string;
  booking: { id: string };
}

/** Which console sections each back-office role sees (spec section 6). */
const SECTIONS: Record<StaffRole, string[]> = {
  ADMIN: [
    'kpis',
    'ops',
    'tickets',
    'payouts',
    'verification',
    'reviews',
    'commission',
    'bookings',
    'staff',
    'audit',
  ],
  OPS_MANAGER: ['kpis', 'ops', 'reviews', 'commission', 'bookings'],
  VERIFICATION_OFFICER: ['verification'],
  SUPPORT_AGENT: ['tickets', 'reviews', 'bookings'],
};

const ROLE_TITLES: Record<StaffRole, { en: string; am: string; sub: string }> = {
  ADMIN: {
    en: 'Operations',
    am: 'አስተዳደር',
    sub: 'Full platform control: dispatch, vetting, support, finance, staff, audit.',
  },
  OPS_MANAGER: {
    en: 'Dispatch operations',
    am: 'የስምሪት ክፍል',
    sub: 'Stuck jobs, manual assignment, live bookings, pricing.',
  },
  VERIFICATION_OFFICER: {
    en: 'Verification desk',
    am: 'የማረጋገጫ ክፍል',
    sub: 'Technician vetting queue: approve, reject, suspend - with reason codes.',
  },
  SUPPORT_AGENT: {
    en: 'Support desk',
    am: 'የደንበኞች ድጋፍ',
    sub: 'Disputes, guarantee claims, re-inspections, booking lookup.',
  },
};

const TICKET_LABEL: Record<Ticket['type'], string> = {
  DISPUTE: 'Dispute',
  GUARANTEE_CLAIM: 'Guarantee claim',
  SAFETY: 'Safety flag',
};

export default function AdminPage() {
  const router = useRouter();
  const [role, setRole] = useState<StaffRole | null>(null);
  const [queue, setQueue] = useState<PendingProvider[] | null>(null);
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refundCap, setRefundCap] = useState<number | null>(null);
  const [ops, setOps] = useState<{ escalated: OpsBooking[]; stalled: OpsBooking[] } | null>(null);
  const [verified, setVerified] = useState<PendingProvider[]>([]);
  const [assignPick, setAssignPick] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [newStaff, setNewStaff] = useState({
    name: '',
    phone: '',
    username: '',
    password: '',
    role: 'SUPPORT_AGENT',
  });

  const load = useCallback((r: StaffRole) => {
    const has = (s: string) => SECTIONS[r].includes(s);
    if (has('verification')) {
      api<PendingProvider[]>('/admin/providers?status=PENDING')
        .then(setQueue)
        .catch((e) => setError((e as Error).message));
    }
    if (has('reviews')) api<PendingReview[]>('/admin/reviews').then(setReviews).catch(() => {});
    if (has('bookings')) api<Booking[]>('/admin/bookings').then(setBookings).catch(() => {});
    if (has('commission')) {
      api<{ rate: number }>('/admin/config/commission').then((res) => setRate(String(res.rate))).catch(() => {});
    }
    if (has('kpis')) api<Analytics>('/admin/analytics').then(setAnalytics).catch(() => {});
    if (has('payouts')) api<AdminPayout[]>('/admin/payouts').then(setPayouts).catch(() => {});
    if (has('tickets')) {
      api<Ticket[]>('/admin/tickets').then(setTickets).catch(() => {});
      api<{ capEtb: number }>('/admin/config/refund-cap').then((res) => setRefundCap(res.capEtb)).catch(() => {});
    }
    if (has('ops')) {
      api<{ escalated: OpsBooking[]; stalled: OpsBooking[] }>('/admin/ops/queue').then(setOps).catch(() => {});
    }
    if (has('ops') || has('tickets')) {
      api<PendingProvider[]>('/admin/providers?status=VERIFIED').then(setVerified).catch(() => {});
    }
    if (has('staff')) api<StaffAccount[]>('/admin/staff').then(setStaff).catch(() => {});
    if (has('audit')) api<AuditEntry[]>('/admin/audit').then(setAudit).catch(() => {});
  }, []);

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
  }, [load, router]);

  const reload = useCallback(() => {
    const r = getUser()?.role;
    if (isStaff(r)) load(r);
  }, [load]);

  async function act(path: string, body?: object) {
    setError('');
    setNotice('');
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
      setNotice('Done.');
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Ops/Support manual assignment: pick a verified technician + mandatory reason code. */
  async function assign(bookingId: string) {
    const providerId = assignPick[bookingId];
    if (!providerId) {
      setError('Pick a technician first.');
      return;
    }
    const reason = window.prompt('Reason code for this manual assignment (logged to audit):');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('A short reason is required - it feeds the audit log.');
      return;
    }
    await act(`/admin/bookings/${bookingId}/assign`, { providerId, reason: reason.trim() });
  }

  async function resolveTicket(t: Ticket) {
    const note = window.prompt('Resolution note (sent to the customer):');
    if (note === null || note.trim().length < 3) return;
    const refundRaw = window.prompt(
      `Recorded refund in ETB - leave empty for none${refundCap != null ? ` (your cap: ${refundCap})` : ''}:`,
      '',
    );
    if (refundRaw === null) return;
    const refundEtb = refundRaw.trim() ? Number(refundRaw) : undefined;
    if (refundRaw.trim() && !Number.isFinite(refundEtb)) {
      setError('Refund must be a number.');
      return;
    }
    await act(`/admin/tickets/${t.id}/resolve`, { resolutionNote: note.trim(), refundEtb });
  }

  async function rejectTicket(t: Ticket) {
    const note = window.prompt('Reason for rejecting this ticket (sent to the customer):');
    if (note === null || note.trim().length < 3) return;
    await act(`/admin/tickets/${t.id}/reject`, { resolutionNote: note.trim() });
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

  // /files/:objectKey requires a Bearer token - fetch with auth and open the blob.
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

  const show = (s: string) => (role ? SECTIONS[role].includes(s) : false);
  const titles = role ? ROLE_TITLES[role] : null;

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
            ? `escalated ${b.escalatedAt ? fmtDate(b.escalatedAt) : ''} after 3 declined/expired offers`
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
          {verified.map((p) => (
            <option key={p.id} value={p.id}>
              {p.user.name ?? p.user.phone} · {p.category.nameEn}
            </option>
          ))}
        </select>
        <button className="btn btn-teal btn-sm" onClick={() => assign(b.id)}>
          Assign
        </button>
      </span>
    </div>
  );

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 920 }}>
        <h1 className="page-title">
          {titles ? `${titles.en} · ${titles.am}` : 'Operations · አስተዳደር'}
        </h1>
        <p className="page-sub">{titles?.sub ?? 'Staff console.'}</p>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="ok-box">{notice}</div>}

        {/* ── KPIs & analytics (Super Admin, Ops) ───────────────────────── */}
        {show('kpis') && analytics && (
          <>
            <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div className="tile hi">
                <div className="v">{analytics.totals.bookings}</div>
                <div className="k">bookings, all time</div>
              </div>
              <div className="tile">
                <div className="v">
                  {analytics.totals.grossRevenueEtb} <small>ETB</small>
                </div>
                <div className="k">gross revenue</div>
              </div>
              <div className="tile">
                <div className="v">
                  {analytics.totals.commissionEtb} <small>ETB</small>
                </div>
                <div className="k">platform commission</div>
              </div>
              <div className="tile">
                <div className="v">{analytics.totals.customers}</div>
                <div className="k">customers</div>
              </div>
              <div className="tile">
                <div className="v">{analytics.totals.verifiedProviders}</div>
                <div className="k">verified technicians</div>
              </div>
            </div>
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

        {/* ── Ops queue: escalated + GPS-stalled (spec section 5 timers) ── */}
        {show('ops') && (
          <div className="panel">
            <h2>
              Dispatch exceptions ({(ops?.escalated.length ?? 0) + (ops?.stalled.length ?? 0)})
            </h2>
            {ops && ops.escalated.length === 0 && ops.stalled.length === 0 && (
              <p className="hint">
                No stuck jobs. Escalations land here after 3 declined or expired offers; en-route
                jobs appear when the technician stops sending GPS pings for 15 minutes.
              </p>
            )}
            {ops?.escalated.map((b) => assignRow(b, 'escalated'))}
            {ops?.stalled.map((b) => assignRow(b, 'stalled'))}
          </div>
        )}

        {/* ── Support tickets: disputes & guarantee claims ───────────────── */}
        {show('tickets') && (
          <div className="panel">
            <h2>Support tickets ({tickets.length})</h2>
            {refundCap != null && role === 'SUPPORT_AGENT' && (
              <p className="hint">
                You can record refunds up to ETB {refundCap} independently - larger amounts need
                Ops or the Super Admin.
              </p>
            )}
            {tickets.length === 0 && <p className="hint">No open disputes or guarantee claims.</p>}
            {tickets.map((t) => (
              <div key={t.id} className="booking-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
                <span>
                  <span className="what">
                    {TICKET_LABEL[t.type]}
                    {t.status === 'RE_INSPECTION' ? ' · re-inspection scheduled' : ''} - #
                    {t.booking.id.slice(-6).toUpperCase()} ({t.booking.category.nameEn})
                  </span>
                  <span className="when" style={{ display: 'block', maxWidth: 460 }}>
                    “{t.note}” - {t.openedBy.name ?? t.openedBy.phone} · {fmtDate(t.createdAt)}
                    {t.booking.provider?.user
                      ? ` · technician: ${t.booking.provider.user.name ?? t.booking.provider.user.phone}`
                      : ''}
                  </span>
                </span>
                <span className="row" style={{ gap: '0.4rem' }}>
                  {t.type === 'GUARANTEE_CLAIM' && t.status === 'OPEN' && (
                    <button
                      className="btn btn-dark btn-sm"
                      onClick={() => act(`/admin/tickets/${t.id}/reinspect`)}
                    >
                      Re-inspection
                    </button>
                  )}
                  <button className="btn btn-teal btn-sm" onClick={() => resolveTicket(t)}>
                    Resolve ✓
                  </button>
                  <button className="btn btn-line btn-sm" onClick={() => rejectTicket(t)}>
                    Reject
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── payout queue ───────────────────────────────────────────────── */}
        {show('payouts') && (
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

        {/* ── Verification queue ─────────────────────────────────────────── */}
        {show('verification') && (
          <div className="panel">
            <h2>Verification queue ({queue?.length ?? '…'})</h2>
            {queue?.length === 0 && <p className="hint">No providers waiting for review.</p>}
            {!!queue?.length && (
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
                    {queue.map((p) => (
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
                            <button
                              key={d.id}
                              type="button"
                              className="doc-link"
                              onClick={() => openDocument(d.objectKey)}
                            >
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
                            <button className="btn btn-teal btn-sm" onClick={() => act(`/admin/providers/${p.id}/verify`)}>
                              Verify ✓
                            </button>
                            <button
                              className="btn btn-line btn-sm"
                              onClick={() => {
                                const note = window.prompt('Reason for rejection (optional) · ውድቅ የሆነበት ምክንያት');
                                if (note === null) return; // cancelled
                                act(`/admin/providers/${p.id}/reject`, note.trim() ? { note: note.trim() } : undefined);
                              }}
                            >
                              Reject
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Review moderation ──────────────────────────────────────────── */}
        {show('reviews') && (
          <div className="panel">
            <h2>Review moderation ({reviews.length})</h2>
            {reviews.length === 0 && <p className="hint">No reviews pending moderation.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="booking-row" style={{ cursor: 'default' }}>
                <span>
                  <span className="what">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
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

        {/* ── Commission ─────────────────────────────────────────────────── */}
        {show('commission') && (
          <div className="panel">
            <h2>Commission rate</h2>
            <div className="row">
              <input
                className="input"
                style={{ maxWidth: 140 }}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
              />
              <button
                className="btn btn-dark btn-sm"
                onClick={async () => {
                  setError('');
                  try {
                    await api('/admin/config/commission', { method: 'PUT', body: JSON.stringify({ rate: Number(rate) }) });
                    setNotice(`Commission set to ${(Number(rate) * 100).toFixed(1)}%`);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Save
              </button>
              <span className="hint">fraction of gross, e.g. 0.10 = 10% - applies to new settlements</span>
            </div>
          </div>
        )}

        {/* ── Recent bookings (lookup) ───────────────────────────────────── */}
        {show('bookings') && (
          <div className="panel">
            <h2>Recent bookings ({bookings.length})</h2>
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
                  {bookings.slice(0, 12).map((b) => (
                    <tr key={b.id}>
                      <td className="hint">
                        #{b.id.slice(-6).toUpperCase()}
                        {b.disputedAt && <span title="open ticket"> ⚑</span>}
                      </td>
                      <td>{b.category.nameEn}</td>
                      <td>{b.customer?.name ?? b.customer?.phone ?? '-'}</td>
                      <td>{b.provider?.user?.name ?? '-'}</td>
                      <td>{b.payment ? `${b.payment.amountEtb} ETB` : b.finalPriceEtb ? `${b.finalPriceEtb} ETB` : '-'}</td>
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

        {/* ── Staff & role management (Super Admin only, spec section 3) ── */}
        {show('staff') && (
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
            <form
              onSubmit={createStaff}
              className="row"
              style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.8rem' }}
            >
              <input
                className="input"
                style={{ maxWidth: 160 }}
                placeholder="Full name"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
              />
              <input
                className="input"
                style={{ maxWidth: 140 }}
                placeholder="09… phone"
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
              />
              <input
                className="input"
                style={{ maxWidth: 130 }}
                placeholder="username"
                value={newStaff.username}
                onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
              />
              <input
                className="input"
                style={{ maxWidth: 140 }}
                placeholder="password (8+)"
                type="password"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
              />
              <select
                className="input"
                style={{ maxWidth: 190 }}
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
              >
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

        {/* ── Audit log (Super Admin only, spec section 8) ───────────────── */}
        {show('audit') && (
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
                    {audit.slice(0, 30).map((a) => (
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
      </div>
    </main>
  );
}

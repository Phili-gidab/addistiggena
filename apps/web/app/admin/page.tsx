'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CategoryBars, DailyBars } from '../../components/charts';
import { StatusBadge } from '../../components/StatusBadge';
import { api, authorizedFetch, Booking, Category, fmtDate, getToken, getUser } from '../../lib/api';

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

export default function AdminPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<PendingProvider[] | null>(null);
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);

  const load = useCallback(() => {
    api<PendingProvider[]>('/admin/providers?status=PENDING').then(setQueue).catch((e) => setError((e as Error).message));
    api<PendingReview[]>('/admin/reviews').then(setReviews).catch(() => {});
    api<Booking[]>('/admin/bookings').then(setBookings).catch(() => {});
    api<{ rate: number }>('/admin/config/commission').then((r) => setRate(String(r.rate))).catch(() => {});
    api<Analytics>('/admin/analytics').then(setAnalytics).catch(() => {});
    api<AdminPayout[]>('/admin/payouts').then(setPayouts).catch(() => {});
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/admin');
      return;
    }
    if (getUser()?.role !== 'ADMIN') {
      setError('This area requires an ADMIN account. Sign in with 0900000001.');
      return;
    }
    load();
  }, [load, router]);

  async function act(path: string, body?: object) {
    setError('');
    setNotice('');
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
      setNotice('Done.');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // /files/:objectKey now requires a Bearer token - plain <a href> would 401,
  // so fetch with auth (silent token refresh included) and open the blob in a
  // new tab.
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

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 920 }}>
        <h1 className="page-title">Operations · አስተዳደር</h1>
        <p className="page-sub">Provider vetting, review moderation, commission, live bookings.</p>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="ok-box">{notice}</div>}

        {/* ── KPIs & analytics (proposal §4.3 step 05) ─────────────────── */}
        {analytics && (
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

        {/* ── payout queue (proposal §4.4 steps 09-10) ─────────────────── */}
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
                    <td className="hint">#{b.id.slice(-6).toUpperCase()}</td>
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
      </div>
    </main>
  );
}

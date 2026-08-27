'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Stars } from '../../components/Stars';
import { StatusBadge } from '../../components/StatusBadge';
import { api, API_URL, ApiError, Booking, Category, fmtDate, getToken, getUser, isStaff } from '../../lib/api';
import { SUB_CITIES } from '../../lib/areas';

interface ProviderDoc {
  id: string;
  type: string;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  objectKey: string;
  createdAt: string;
}

interface Profile {
  id: string;
  bio: string | null;
  subCity: string | null;
  woreda: string | null;
  faydaIdNumber: string | null;
  yearsExperience: number | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  serviceRadiusKm: number;
  isAvailable: boolean;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  /** admin's rejection/suspension reason */
  verificationNote: string | null;
  ratingAvg: number;
  ratingCount: number;
  jobsCompleted: number;
  category: Category;
  wallet: { balanceEtb: string } | null;
  documents: ProviderDoc[];
}

interface WalletDetail {
  balanceEtb: string;
  transactions: { id: string; type: string; amountEtb: string; note: string | null; createdAt: string }[];
  payouts: { id: string; amountEtb: string; destination: string; status: string; requestedAt: string }[];
}

// Official vetting checklist (technician registration & vetting document):
// mandatory - Fayda/Resident ID, Woreda recommendation letter, CoC practical
// pass, Woreda/police clearance; optional - TVET/trade certificate, portfolio.
const DOC_TYPES = [
  { value: 'NATIONAL_ID', label: 'Fayda / Resident ID · መታወቂያ', required: true },
  { value: 'WOREDA_RECOMMENDATION', label: 'Woreda recommendation letter · የወረዳ ደብዳቤ', required: true },
  { value: 'COC_CERTIFICATE', label: 'CoC assessment pass · የCoC ማረጋገጫ', required: true },
  { value: 'POLICE_CLEARANCE', label: 'Police clearance · የፖሊስ ማረጋገጫ', required: true },
  { value: 'TRADE_CERTIFICATE', label: 'TVET / trade certificate (optional)', required: false },
  { value: 'PORTFOLIO', label: 'Portfolio photo (optional)', required: false },
];

export default function ProviderPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // signup form
  const [categoryId, setCategoryId] = useState('');
  const [bio, setBio] = useState('');
  const [radius, setRadius] = useState('5');
  const [subCity, setSubCity] = useState('');
  const [woreda, setWoreda] = useState('');
  const [faydaId, setFaydaId] = useState('');
  const [years, setYears] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');

  // wallet + documents
  const [walletDetail, setWalletDetail] = useState<WalletDetail | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutDest, setPayoutDest] = useState('');
  const [docType, setDocType] = useState('NATIONAL_ID');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api<Profile>('/providers/me')
      .then((p) => {
        setProfile(p);
        setNoProfile(false);
        api<Booking[]>('/bookings/mine').then(setJobs).catch(() => {});
        api<WalletDetail>('/wallet/me').then(setWalletDetail).catch(() => {});
      })
      .catch((e) => {
        // only a real 404 means "no profile yet" - on transient poll errors
        // keep the last good profile instead of flashing the signup form
        if (e instanceof ApiError && e.status === 404) {
          setProfile(null);
          setNoProfile(true);
        }
      });
  }, []);

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api('/wallet/payouts', {
        method: 'POST',
        body: JSON.stringify({ amountEtb: Number(payoutAmount), destination: payoutDest }),
      });
      setNotice(`Payout of ${payoutAmount} ETB requested - processed same-day.`);
      setPayoutAmount('');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function uploadDocument(file: File) {
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? 'Upload failed');
      await api('/providers/me/documents', {
        method: 'POST',
        body: JSON.stringify({ type: docType, objectKey: body.objectKey }),
      });
      setNotice('Document uploaded - our team reviews it within 3-5 days.');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (isStaff(getUser()?.role)) {
      router.replace('/admin');
      return;
    }
    if (!getToken()) {
      router.replace('/login?next=/provider');
      return;
    }
    load();
    api<Category[]>('/catalog/categories').then(setCategories).catch(() => {});
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load, router]);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/providers/me', {
        method: 'PUT',
        body: JSON.stringify({
          categoryId,
          bio: bio || undefined,
          serviceRadiusKm: Number(radius),
          subCity: subCity || undefined,
          woreda: woreda || undefined,
          faydaIdNumber: faydaId || undefined,
          yearsExperience: years ? Number(years) : undefined,
          guarantorName: guarantorName || undefined,
          guarantorPhone: guarantorPhone || undefined,
        }),
      });
      // set an initial base location so matching can find us (browser GPS, else Addis center)
      const setLoc = (lat: number, lng: number) =>
        api('/providers/me/location', { method: 'PUT', body: JSON.stringify({ lat, lng }) }).catch(() => {});
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => setLoc(p.coords.latitude, p.coords.longitude),
          () => setLoc(9.0108, 38.7613),
        );
      } else {
        await setLoc(9.0108, 38.7613);
      }
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailability() {
    if (!profile) return;
    setError('');
    try {
      await api('/providers/me/availability', {
        method: 'PUT',
        body: JSON.stringify({ isAvailable: !profile.isAvailable }),
      });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // REQUESTED = an incoming offer awaiting accept/reject (5-minute window) - surface
  // it above the in-flight jobs so the technician responds in time.
  const offers = jobs.filter((j) => j.status === 'REQUESTED');
  const actionable = jobs.filter((j) =>
    ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(j.status),
  );
  const history = jobs.filter((j) => !offers.includes(j) && !actionable.includes(j));

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <h1 className="page-title">የባለሙያ ሰሌዳ · Technician dashboard</h1>
        <p className="page-sub">Jobs, earnings, and your public profile.</p>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="ok-box">{notice}</div>}

        {/* ── no profile yet: registration ──────────────────────────────── */}
        {noProfile && (
          <div className="panel">
            <h2>Become a technician · ባለሙያ ይሁኑ</h2>
            <p className="hint mb">
              Free to join - skill and trust over certification, no degree required. After
              registration, upload your vetting documents (Fayda ID, Woreda recommendation letter,
              CoC pass, police clearance); once our team verifies them you appear in customer
              searches and start receiving jobs. Clients pay you directly.
            </p>
            <form onSubmit={register}>
              <div className="field">
                <label>Your trade · ሙያዎ</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Choose…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAm} - {c.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="field" style={{ flex: 1, minWidth: 160 }}>
                  <label>Sub-city · ክፍለ ከተማ</label>
                  <select value={subCity} onChange={(e) => setSubCity(e.target.value)}>
                    <option value="">Choose…</option>
                    {SUB_CITIES.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} · {s.nameAm}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 1, minWidth: 120 }}>
                  <label>Woreda · ወረዳ</label>
                  <input placeholder="e.g. 03" value={woreda} onChange={(e) => setWoreda(e.target.value)} maxLength={20} />
                </div>
              </div>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="field" style={{ flex: 1.4, minWidth: 180 }}>
                  <label>Fayda / Resident ID no. · የፋይዳ መታወቂያ ቁጥር</label>
                  <input placeholder="National Digital ID number" value={faydaId} onChange={(e) => setFaydaId(e.target.value)} maxLength={40} />
                </div>
                <div className="field" style={{ flex: 0.6, minWidth: 120 }}>
                  <label>Years of experience</label>
                  <input value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={2} />
                </div>
              </div>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="field" style={{ flex: 1, minWidth: 160 }}>
                  <label>Guarantor name · ዋስ</label>
                  <input placeholder="Local resident or family member" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} maxLength={120} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 160 }}>
                  <label>Guarantor phone</label>
                  <input placeholder="09… or +2519…" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value.trim())} inputMode="tel" maxLength={20} />
                </div>
              </div>
              <div className="field">
                <label>Service radius (km)</label>
                <input value={radius} onChange={(e) => setRadius(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
              </div>
              <div className="field">
                <label>Bio</label>
                <textarea rows={3} placeholder="Specialities, e.g. Electric Mitad repair, wiring…" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <button className="btn btn-primary" disabled={busy || !categoryId} style={{ width: '100%' }}>
                {busy ? 'Registering…' : 'Register · ይመዝገቡ'}
              </button>
            </form>
          </div>
        )}

        {/* ── dashboard ─────────────────────────────────────────────────── */}
        {profile && (
          <>
            {profile.verificationStatus !== 'VERIFIED' && (
              <div className="error-box">
                Verification status: <strong>{profile.verificationStatus}</strong> - you can go
                online once an admin verifies your documents.
                {['REJECTED', 'SUSPENDED'].includes(profile.verificationStatus) &&
                  profile.verificationNote && (
                    <div style={{ marginTop: '0.5rem' }}>
                      ምክንያት · Reason: “{profile.verificationNote}”
                    </div>
                  )}
              </div>
            )}

            {/* incoming REQUESTED offers - 5-minute response window, so show first */}
            {offers.length > 0 && (
              <div className="panel">
                <div className="dispatch-note" style={{ marginBottom: '0.9rem' }}>
                  <strong>{offers.length}</strong> new job offer{offers.length > 1 ? 's' : ''} ·
                  አዲስ የስራ ጥያቄ - respond now (5-minute window)
                </div>
                {offers.map((j) => (
                  <Link key={j.id} href={`/bookings/${j.id}`} className="booking-row">
                    <span>
                      <span className="what">
                        {j.category.nameAm} · {j.customer?.name ?? j.customer?.phone ?? 'Customer'}
                      </span>
                      <span className="when" style={{ display: 'block' }}>
                        {fmtDate(j.createdAt)}
                        {j.landmarkNote ? ` - “${j.landmarkNote}”` : ''}
                      </span>
                    </span>
                    <span className="offer-count">Respond now →</span>
                  </Link>
                ))}
              </div>
            )}

            <div className="tiles">
              <div className="tile hi">
                <div className="v">
                  {profile.wallet?.balanceEtb ?? '0'} <small>ETB</small>
                </div>
                <div className="k">platform wallet · records &amp; payouts</div>
              </div>
              <div className="tile">
                <div className="v">{profile.jobsCompleted}</div>
                <div className="k">jobs completed</div>
              </div>
              <div className="tile">
                <div className="v">{profile.ratingCount ? profile.ratingAvg.toFixed(1) : '-'}</div>
                <div className="k">rating ({profile.ratingCount} reviews)</div>
              </div>
            </div>

            <div className="panel">
              <div className="spread">
                <div>
                  <h2 style={{ marginBottom: '0.2rem' }}>
                    {profile.category.nameAm} · {profile.category.nameEn}
                  </h2>
                  <span className="hint">
                    {profile.serviceRadiusKm} km radius ·{' '}
                    {profile.verificationStatus === 'VERIFIED' ? (
                      <span className="verified">✔ verified</span>
                    ) : (
                      profile.verificationStatus.toLowerCase()
                    )}
                  </span>
                </div>
                <div className="row">
                  <span className="hint">{profile.isAvailable ? 'Online - receiving jobs' : 'Offline'}</span>
                  <button
                    aria-label="availability"
                    className={`toggle${profile.isAvailable ? ' on' : ''}`}
                    onClick={toggleAvailability}
                  />
                </div>
              </div>
            </div>

            {/* ── wallet & payouts ──────────────────────────────────────── */}
            <div className="panel">
              <h2>Wallet · ቦርሳ</h2>
              <form className="row mb" onSubmit={requestPayout}>
                <input
                  className="input"
                  style={{ maxWidth: 150 }}
                  placeholder="Amount (ETB)"
                  inputMode="numeric"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value.replace(/[^\d.]/g, ''))}
                />
                <input
                  className="input"
                  style={{ maxWidth: 240 }}
                  placeholder="Telebirr no. or bank account"
                  value={payoutDest}
                  onChange={(e) => setPayoutDest(e.target.value)}
                />
                <button className="btn btn-teal btn-sm" disabled={!payoutAmount || !payoutDest}>
                  Withdraw · ወጪ
                </button>
                <span className="hint">min 100 ETB · same-day</span>
              </form>
              {walletDetail && walletDetail.payouts.length > 0 && (
                <>
                  <h2 style={{ marginTop: '1rem' }}>Payout requests</h2>
                  {walletDetail.payouts.map((p) => (
                    <div key={p.id} className="booking-row" style={{ cursor: 'default' }}>
                      <span>
                        <span className="what">{p.amountEtb} ETB → {p.destination}</span>
                        <span className="when" style={{ display: 'block' }}>{fmtDate(p.requestedAt)}</span>
                      </span>
                      <span className={`doc-state ${p.status === 'PROCESSED' ? 'APPROVED' : p.status === 'REJECTED' ? 'REJECTED' : 'PENDING'}`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {walletDetail && walletDetail.transactions.length > 0 && (
                <details className="hint data-table mt">
                  <summary>Ledger ({walletDetail.transactions.length} entries)</summary>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Note</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletDetail.transactions.map((t) => (
                        <tr key={t.id}>
                          <td>{t.type}</td>
                          <td style={{ color: Number(t.amountEtb) < 0 ? '#a03020' : 'var(--teal-dark)' }}>
                            {t.amountEtb} ETB
                          </td>
                          <td className="hint">{t.note ?? '-'}</td>
                          <td className="hint">{fmtDate(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </div>

            {/* ── verification documents ────────────────────────────────── */}
            <div className="panel">
              <h2>Verification documents · ማስረጃዎች</h2>
              <p className="hint mb">
                Mandatory for the verified badge: Fayda/Resident ID, Woreda recommendation letter,
                CoC assessment pass, and police clearance.
                {(() => {
                  const missing = DOC_TYPES.filter(
                    (t) => t.required && !profile.documents.some((d) => d.type === t.value),
                  );
                  return missing.length > 0
                    ? ` Missing: ${missing.map((m) => m.label.split(' · ')[0]).join(', ')}.`
                    : ' All mandatory documents submitted ✓';
                })()}
              </p>
              {profile.documents.map((d) => (
                <div key={d.id} className="booking-row" style={{ cursor: 'default' }}>
                  <span>
                    <span className="what">{DOC_TYPES.find((t) => t.value === d.type)?.label ?? d.type}</span>
                    <span className="when" style={{ display: 'block' }}>{fmtDate(d.createdAt)}</span>
                  </span>
                  <span className={`doc-state ${d.state}`}>{d.state}</span>
                </div>
              ))}
              <div className="row mt">
                <select className="input" style={{ maxWidth: 260 }} value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <label className="btn btn-line btn-sm" style={{ cursor: 'pointer' }}>
                  {uploading ? 'Uploading…' : '⇪ Upload file'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: 'none' }}
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadDocument(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                <span className="hint">JPEG, PNG or PDF · max 5 MB</span>
              </div>
            </div>

            <div className="panel">
              <h2>Active jobs</h2>
              {actionable.length === 0 && <p className="hint">No active jobs - stay online to receive requests.</p>}
              {actionable.map((j) => (
                <Link key={j.id} href={`/bookings/${j.id}`} className="booking-row">
                  <span>
                    <span className="what">
                      {j.category.nameAm} · {j.customer?.name ?? j.customer?.phone ?? 'Customer'}
                    </span>
                    <span className="when" style={{ display: 'block' }}>
                      {fmtDate(j.createdAt)}
                      {j.landmarkNote ? ` - “${j.landmarkNote}”` : ''}
                    </span>
                  </span>
                  <StatusBadge status={j.status} />
                </Link>
              ))}
            </div>

            {history.length > 0 && (
              <div className="panel">
                <h2>History</h2>
                {history.slice(0, 8).map((j) => (
                  <Link key={j.id} href={`/bookings/${j.id}`} className="booking-row">
                    <span>
                      <span className="what">{j.category.nameAm}</span>
                      <span className="when" style={{ display: 'block' }}>
                        {fmtDate(j.createdAt)}
                        {j.finalPriceEtb ? ` - ${j.finalPriceEtb} ETB` : ''}
                      </span>
                    </span>
                    <StatusBadge status={j.status} />
                  </Link>
                ))}
              </div>
            )}

            <p className="hint mt">
              <Stars value={profile.ratingAvg} small /> Public profile preview - customers see your
              trade, rating, distance and bio when choosing a technician.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

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
  gender: string | null;
  idType: string | null;
  idNumber: string | null;
  email: string | null;
  residentialSubCity: string | null;
  residentialWoreda: string | null;
  houseNumber: string | null;
  specialization: string | null;
  educationLevel: string | null;
  certifications: string | null;
  guarantorRelation: string | null;
  guarantorSubCity: string | null;
  guarantorWoreda: string | null;
  guarantorHouseNo: string | null;
  guarantorIdNumber: string | null;
  declarationName: string | null;
  declarationSignedAt: string | null;
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
  deposits: {
    id: string;
    amountEtb: string;
    method: string;
    reference: string;
    status: string;
    createdAt: string;
  }[];
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
  const [gender, setGender] = useState('');
  const [idType, setIdType] = useState('FAYDA');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [resSubCity, setResSubCity] = useState('');
  const [resWoreda, setResWoreda] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [certifications, setCertifications] = useState('');
  const [guarantorRelation, setGuarantorRelation] = useState('');
  const [guarantorSubCity, setGuarantorSubCity] = useState('');
  const [guarantorWoreda, setGuarantorWoreda] = useState('');
  const [guarantorHouseNo, setGuarantorHouseNo] = useState('');
  const [guarantorIdNumber, setGuarantorIdNumber] = useState('');
  const [declarationName, setDeclarationName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [years, setYears] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');

  // wallet + documents
  const [walletDetail, setWalletDetail] = useState<WalletDetail | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('BANK_TRANSFER');
  const [depositRef, setDepositRef] = useState('');
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

  /**
   * You keep the customer cash at the door, so nothing is ever paid out to you
   * - what you owe is commission. Pay it into the company account, then enter
   * the reference here. Finance checks it against the bank statement before
   * your balance moves.
   */
  async function declareDeposit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api('/wallet/deposits', {
        method: 'POST',
        body: JSON.stringify({
          amountEtb: Number(depositAmount),
          method: depositMethod,
          reference: depositRef.trim(),
        }),
      });
      setNotice(`${depositAmount} ETB submitted - finance will confirm it shortly.`);
      setDepositAmount('');
      setDepositRef('');
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
          gender: gender || undefined,
          idType: idNumber ? idType : undefined,
          idNumber: idNumber || undefined,
          email: email || undefined,
          residentialSubCity: resSubCity || undefined,
          residentialWoreda: resWoreda || undefined,
          houseNumber: houseNumber || undefined,
          specialization: specialization || undefined,
          yearsExperience: years ? Number(years) : undefined,
          educationLevel: educationLevel || undefined,
          certifications: certifications || undefined,
          guarantorName: guarantorName || undefined,
          guarantorRelation: guarantorRelation || undefined,
          guarantorPhone: guarantorPhone || undefined,
          guarantorSubCity: guarantorSubCity || undefined,
          guarantorWoreda: guarantorWoreda || undefined,
          guarantorHouseNo: guarantorHouseNo || undefined,
          guarantorIdNumber: guarantorIdNumber || undefined,
          declarationName: declarationName || undefined,
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
              <div className="sub-h" style={{ marginTop: '1.1rem' }}>1 · Personal details</div>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="field" style={{ flex: 0.8, minWidth: 130 }}>
                  <label>Gender · ጾታ</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Choose…</option>
                    <option value="MALE">Male · ወንድ</option>
                    <option value="FEMALE">Female · ሴት</option>
                  </select>
                </div>
                <div className="field" style={{ flex: 1, minWidth: 150 }}>
                  <label>ID type · የመታወቂያ ዓይነት</label>
                  <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                    <option value="FAYDA">Fayda / National ID</option>
                    <option value="KEBELE">Kebele ID</option>
                  </select>
                </div>
                <div className="field" style={{ flex: 1.2, minWidth: 160 }}>
                  <label>ID number · የመታወቂያ ቁጥር</label>
                  <input
                    placeholder="ID number"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    maxLength={40}
                  />
                </div>
              </div>
              <div className="field">
                <label>Email address (optional) · ኢመይል</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  maxLength={160}
                />
              </div>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="field" style={{ flex: 1.2, minWidth: 160 }}>
                  <label>Where you live · የመኖሪያ ክፍለ ከተማ</label>
                  <select value={resSubCity} onChange={(e) => setResSubCity(e.target.value)}>
                    <option value="">Choose…</option>
                    {SUB_CITIES.map((x) => (
                      <option key={x.name} value={x.name}>
                        {x.name} · {x.nameAm}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 0.7, minWidth: 110 }}>
                  <label>Woreda · ወረዳ</label>
                  <input value={resWoreda} onChange={(e) => setResWoreda(e.target.value)} maxLength={20} />
                </div>
                <div className="field" style={{ flex: 0.7, minWidth: 110 }}>
                  <label>House no. · የቤት ቁጥር</label>
                  <input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} maxLength={40} />
                </div>
              </div>

              <div className="sub-h" style={{ marginTop: '1.1rem' }}>2 · Professional and technical skills</div>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="field" style={{ flex: 1.5, minWidth: 180 }}>
                  <label>Specialization · ዋና ሙያ</label>
                  <input
                    placeholder="e.g. house wiring and breaker panels"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="field" style={{ flex: 0.5, minWidth: 110 }}>
                  <label>Years of experience</label>
                  <input value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={2} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 150 }}>
                  <label>Education · የትምህርት ደረጃ</label>
                  <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
                    <option value="">Choose…</option>
                    <option value="TVET">TVET · ቴክኒክና ሙያ</option>
                    <option value="DIPLOMA">Diploma · ዲፕሎማ</option>
                    <option value="DEGREE">Degree · ዲግሪ</option>
                    <option value="ABOVE_DEGREE">Above degree</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Certificates or licences held (optional)</label>
                <input
                  placeholder="e.g. CoC Level III, TVET electrical"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  maxLength={300}
                />
              </div>

              <div className="sub-h" style={{ marginTop: '1.1rem' }}>3 · Where you want to work</div>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="field" style={{ flex: 1.2, minWidth: 160 }}>
                  <label>Preferred service sub-city · ክፍለ ከተማ</label>
                  <select value={subCity} onChange={(e) => setSubCity(e.target.value)}>
                    <option value="">Choose…</option>
                    {SUB_CITIES.map((x) => (
                      <option key={x.name} value={x.name}>
                        {x.name} · {x.nameAm}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 0.6, minWidth: 110 }}>
                  <label>Woreda · ወረዳ</label>
                  <input placeholder="e.g. 03" value={woreda} onChange={(e) => setWoreda(e.target.value)} maxLength={20} />
                </div>
                <div className="field" style={{ flex: 0.6, minWidth: 110 }}>
                  <label>Service radius (km)</label>
                  <input value={radius} onChange={(e) => setRadius(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
                </div>
              </div>
              <div className="field">
                <label>About your work (optional)</label>
                <textarea rows={3} placeholder="Specialities, e.g. Electric Mitad repair, wiring…" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>

              <div className="sub-h" style={{ marginTop: '1.1rem' }}>4 · Guarantor and background check</div>
              <p className="hint mb">
                Your emergency contact and guarantor - someone who vouches for you. The verification
                desk may call them.
              </p>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="field" style={{ flex: 1, minWidth: 150 }}>
                  <label>Full name · ስም</label>
                  <input placeholder="Full name" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} maxLength={120} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 150 }}>
                  <label>Relationship · ግንኙነት</label>
                  <input placeholder="e.g. brother, former employer" value={guarantorRelation} onChange={(e) => setGuarantorRelation(e.target.value)} maxLength={60} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 150 }}>
                  <label>Phone · ስልክ ቁጥር</label>
                  <input placeholder="09… or +2519…" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value.trim())} inputMode="tel" maxLength={20} />
                </div>
              </div>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <div className="field" style={{ flex: 1.2, minWidth: 160 }}>
                  <label>Their sub-city · ክፍለ ከተማ</label>
                  <select value={guarantorSubCity} onChange={(e) => setGuarantorSubCity(e.target.value)}>
                    <option value="">Choose…</option>
                    {SUB_CITIES.map((x) => (
                      <option key={x.name} value={x.name}>
                        {x.name} · {x.nameAm}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 0.6, minWidth: 100 }}>
                  <label>Woreda</label>
                  <input value={guarantorWoreda} onChange={(e) => setGuarantorWoreda(e.target.value)} maxLength={20} />
                </div>
                <div className="field" style={{ flex: 0.6, minWidth: 100 }}>
                  <label>House no.</label>
                  <input value={guarantorHouseNo} onChange={(e) => setGuarantorHouseNo(e.target.value)} maxLength={40} />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 140 }}>
                  <label>Their ID number</label>
                  <input value={guarantorIdNumber} onChange={(e) => setGuarantorIdNumber(e.target.value)} maxLength={40} />
                </div>
              </div>

              <div className="declaration">
                <b>የስምምነት ማረጋገጫ · Declaration</b>
                <p>
                  ከላይ የተገለፀው ሙሉ መረጃ እውነተኛ እና የራሴ መሆኑን አረጋግጣለሁ። በፕላትፎርሙ በኩል የተመደብኩበትን የሥራ
                  ትእዛዝ ስቀበል የፕላትፎርሙን መመሪያዎች፣ ደንቦችና ሕጎች አክብሬ ለመሥራት እስማማለሁ፤ በሥራው ወቅት ወይም
                  በሥራው ምክንያት ለሚደርስ ጥፋት፣ ጉዳት ወይም ቸልተኝነት ሙሉ የሕግና የፋይናንስ ኃላፊነት እወስዳለሁ።
                </p>
                <p>
                  I certify that the information above is accurate and true. I consent to the
                  background checks required for onboarding. By accepting a work assignment through
                  the platform I agree to abide by all platform policies, standards and guidelines,
                  and I take full legal and financial liability for any damage, fault or negligence
                  occurring during or because of the service.
                </p>
                <label className="agree">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span>I agree · እስማማለሁ</span>
                </label>
                <div className="field" style={{ marginTop: '0.6rem' }}>
                  <label>Type your full name to sign · ሙሉ ስም ይፃፉ</label>
                  <input
                    placeholder="Your full name"
                    value={declarationName}
                    onChange={(e) => setDeclarationName(e.target.value)}
                    maxLength={120}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                disabled={busy || !categoryId || !agreed || declarationName.trim().length < 3}
                style={{ width: '100%' }}
              >
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
                <div className="k">platform wallet · deposit balance &middot; commission credit</div>
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

            {/* deposit balance: commission credit the technician pre-funds */}
            <div className="panel">
              <h2>Deposit balance</h2>
              <p className="hint mb">
                You collect the full price from the customer in cash. Our commission comes out of
                this balance when a job completes, so keep it topped up - jobs stop being offered
                to you once it runs out. Pay into the company account, then enter the bank
                reference below.
              </p>
              <form className="row mb" onSubmit={declareDeposit}>
                <input
                  className="input"
                  style={{ maxWidth: 150 }}
                  placeholder="Amount (ETB)"
                  inputMode="numeric"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value.replace(/[^\d.]/g, ''))}
                />
                <select
                  className="input"
                  style={{ maxWidth: 170 }}
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                >
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="TELEBIRR">Telebirr</option>
                  <option value="CBE_BIRR">CBE Birr</option>
                  <option value="CASH_OFFICE">Cash at office</option>
                </select>
                <input
                  className="input"
                  style={{ maxWidth: 220 }}
                  placeholder="Bank reference / receipt no."
                  value={depositRef}
                  onChange={(e) => setDepositRef(e.target.value)}
                />
                <button
                  className="btn btn-teal btn-sm"
                  disabled={Number(depositAmount) < 50 || depositRef.trim().length < 3}
                >
                  Submit deposit
                </button>
                <span className="hint">min 50 ETB</span>
              </form>
              {walletDetail && walletDetail.deposits.length > 0 && (
                <>
                  <h2 style={{ marginTop: '1rem' }}>Your deposits</h2>
                  {walletDetail.deposits.map((d) => (
                    <div key={d.id} className="booking-row" style={{ cursor: 'default' }}>
                      <span>
                        <span className="what">
                          {d.amountEtb} ETB - {d.method.replace(/_/g, ' ').toLowerCase()}
                        </span>
                        <span className="when" style={{ display: 'block' }}>
                          ref {d.reference} - {fmtDate(d.createdAt)}
                        </span>
                      </span>
                      <span
                        className={`doc-state ${d.status === 'CONFIRMED' ? 'APPROVED' : d.status === 'REJECTED' ? 'REJECTED' : 'PENDING'}`}
                      >
                        {d.status}
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

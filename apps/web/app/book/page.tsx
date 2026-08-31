'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  api,
  authorizedFetch,
  Booking,
  Category,
  getToken,
  CategoryAvailability,
} from '../../lib/api';
import { SUB_CITIES } from '../../lib/areas';
import { iconFor } from '../../lib/catalog';
import { ARRIVAL, DIAGNOSTIC_FEE, GUARANTEE_DAYS } from '../../lib/content';

const MapPicker = dynamic(() => import('../../components/MapPicker'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 380 }} />,
});

// Meskel Square - a landmark every Addis resident knows
const ADDIS = { lat: 9.0108, lng: 38.7613 };

const WIZ_STEPS = [
  { n: 1, t: 'Service', am: 'አገልግሎት' },
  { n: 2, t: 'Location', am: 'ቦታ' },
  { n: 3, t: 'Dispatch', am: 'ላኪ' },
  { n: 4, t: 'Confirm', am: 'ማረጋገጫ' },
];

function BookWizard() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(params.get('category') ?? '');
  /** the exact service picked on the category page - booked as-is */
  const [service] = useState(params.get('service') ?? '');
  const [pos, setPos] = useState(ADDIS);
  const [geoLocked, setGeoLocked] = useState(false);
  const [subCity, setSubCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [avail, setAvail] = useState<CategoryAvailability | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/book');
      return;
    }
    api<Category[]>('/catalog/categories').then(setCategories).catch(() => {});
  }, [router]);

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authorizedFetch('/uploads', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed - JPEG, PNG or WebP up to 5MB');
      const body = (await res.json()) as { objectKey: string };
      setPhotoKey(body.objectKey);
      setPhotoPreview(URL.createObjectURL(file));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  }

  const category = categories.find((c) => c.id === categoryId);
  const areaLabel = [subCity, neighborhood].filter(Boolean).join(' · ');
  // the API stores one landmark note - prefix it with the mapped service area
  const fullLandmark = [areaLabel, landmark].filter(Boolean).join(' - ');

  async function loadAvailability() {
    setBusy(true);
    setError('');
    try {
      setAvail(
        await api<CategoryAvailability>(
          `/providers/availability?lat=${pos.lat}&lng=${pos.lng}&categoryId=${categoryId}`,
        ),
      );
      setStep(3);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      const booking = await api<Booking>('/bookings', {
        method: 'POST',
        // no providerId: the server dispatches the closest available technician
        body: JSON.stringify({
          categoryId,
          lat: pos.lat,
          lng: pos.lng,
          landmarkNote: fullLandmark || undefined,
          description: [service, description].filter(Boolean).join(' - ') || undefined,
          photoObjectKey: photoKey ?? undefined,
        }),
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 1060 }}>
        <span className="sec-no">Booking · ማስያዝ</span>
        <h1 className="page-title">አገልግሎት ይዘዙ · Book a service</h1>
        <p className="page-sub">Verified professionals, live tracking, digital payment.</p>

        <div className="wiz-rail" role="list" aria-label="Booking steps">
          {WIZ_STEPS.map((s) => (
            <button
              key={s.n}
              role="listitem"
              className={`wiz-step${step === s.n ? ' on' : ''}${step > s.n ? ' done' : ''}`}
              onClick={() => step > s.n && setStep(s.n)}
              disabled={step < s.n}
              aria-current={step === s.n ? 'step' : undefined}
            >
              <span className="n">{step > s.n ? '✓' : s.n}</span>
              <span className="lbl">
                {s.t}
                <small>{s.am}</small>
              </span>
            </button>
          ))}
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="wizard-grid">
          <div>
            {/* step 1 - category */}
            {step === 1 && (
              <div className="panel">
                <h2>Which service? · የትኛው አገልግሎት?</h2>
                <div className="pick-grid">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      className={`pick${categoryId === c.id ? ' selected' : ''}`}
                      onClick={() => setCategoryId(c.id)}
                    >
                      <span className="em" aria-hidden>{iconFor(c.slug)}</span>
                      <span className="en">{c.nameEn}</span>
                      <span className="am">{c.nameAm}</span>
                      {c.priceFloorEtb && (
                        <span className="from">
                          ከ ETB {c.priceFloorEtb} ጀምሮ · from ETB {c.priceFloorEtb}
                        </span>
                      )}
                    </button>
                  ))}
                  {categories.length === 0 && (
                    <div className="skeleton" style={{ height: 120, gridColumn: '1/-1' }} />
                  )}
                </div>
                <div className="mt" style={{ textAlign: 'right' }}>
                  <button className="btn btn-primary" disabled={!categoryId} onClick={() => setStep(2)}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* step 2 - location */}
            {step === 2 && (
              <div className="panel">
                <h2>Where? · የት?</h2>
                <p className="hint mb">
                  Tap the map or drag the pin to your exact gate. Landmark notes help the technician
                  on streets without addresses.
                </p>
                <MapPicker lat={pos.lat} lng={pos.lng} onChange={(lat, lng) => setPos({ lat, lng })} />
                <div className="row mt mb">
                  <button
                    className="btn btn-line btn-sm"
                    onClick={() =>
                      navigator.geolocation?.getCurrentPosition((p) => {
                        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
                        setGeoLocked(true);
                      })
                    }
                  >
                    ⌖ Use my location
                  </button>
                  <span className="hint">
                    {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                  </span>
                </div>
                {/* a GPS fix is exact - the sub-city question is only for manual pins */}
                {geoLocked ? (
                  <p className="hint mb" style={{ color: 'var(--ok-fg)' }}>
                    ✓ Your GPS location is set - no need to pick a sub-city. Add a landmark note so
                    the technician finds your gate faster.
                  </p>
                ) : (
                  <div className="row" style={{ alignItems: 'stretch' }}>
                    <div className="field" style={{ flex: 1, minWidth: 180 }}>
                      <label>Sub-city · ክፍለ ከተማ</label>
                      <select
                        value={subCity}
                        onChange={(e) => {
                          setSubCity(e.target.value);
                          setNeighborhood('');
                        }}
                      >
                        <option value="">Choose…</option>
                        {SUB_CITIES.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name} · {s.nameAm}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ flex: 1, minWidth: 180 }}>
                      <label>Neighborhood · ሰፈር</label>
                      <select
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        disabled={!subCity}
                      >
                        <option value="">{subCity ? 'Choose…' : 'Pick a sub-city first'}</option>
                        {SUB_CITIES.find((s) => s.name === subCity)?.neighborhoods.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="field">
                  <label>Landmark note · ምልክት</label>
                  <input
                    placeholder="e.g. Blue gate behind Edna Mall, 3rd floor"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Describe the problem · ችግሩን ይግለጹ</label>
                  <textarea
                    rows={3}
                    placeholder="Kitchen sink is leaking under the cabinet…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Photo of the problem (optional) · የችግሩ ፎቶ</label>
                  {photoPreview ? (
                    <div className="photo-attach">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Attached problem photo" />
                      <button
                        type="button"
                        className="btn btn-line btn-sm"
                        onClick={() => {
                          setPhotoKey(null);
                          setPhotoPreview(null);
                        }}
                      >
                        Remove photo
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={uploadPhoto}
                      disabled={photoBusy}
                    />
                  )}
                  <p className="hint">
                    {photoBusy
                      ? 'Uploading…'
                      : 'A photo helps the technician arrive with the right tools and parts.'}
                  </p>
                </div>
                <div className="spread">
                  <button className="btn btn-line btn-sm" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button className="btn btn-primary" disabled={busy} onClick={loadAvailability}>
                    {busy ? 'Searching…' : 'Find technicians →'}
                  </button>
                </div>
              </div>
            )}

            {/* step 3 - technician */}
            {step === 3 && (
              <div className="panel">
                <h2>Dispatch · ላኪ</h2>
                {/* Identity-free by design: the customer meets their technician only
                    after that technician accepts (client rule 2026-08-29). */}
                {avail && avail.available > 0 ? (
                  <>
                    <div className="ok-box">
                      <strong>
                        {avail.available} verified{' '}
                        {category?.nameEn.toLowerCase()} technician
                        {avail.available === 1 ? '' : 's'} cover your pin
                      </strong>
                      {avail.nearestEtaMinutes
                        ? ` - the closest is roughly ${avail.nearestEtaMinutes} minutes away.`
                        : '.'}
                    </div>
                    <p className="hint mt">
                      Your request goes to the <strong style={{ color: 'var(--navy)' }}>closest</strong>{' '}
                      one first. They have <strong style={{ color: 'var(--navy)' }}>5 minutes</strong> to
                      accept; if they do not respond, our dispatch team assigns another technician for
                      you. You see their name, photo and rating as soon as the job is accepted.
                    </p>
                  </>
                ) : (
                  <div className="ok-box">
                    No verified {category?.nameEn.toLowerCase()} technician is online in this area
                    right now - you can still post the request and our dispatch team assigns the
                    nearest professional as soon as one is available.
                  </div>
                )}
                <div className="spread mt">
                  <button className="btn btn-line btn-sm" onClick={() => setStep(2)}>
                    ← Back
                  </button>
                  <button className="btn btn-primary" onClick={() => setStep(4)}>
                    Review booking →
                  </button>
                </div>
              </div>
            )}

            {/* step 4 - confirm */}
            {step === 4 && (
              <div className="panel">
                <h2>Confirm · ያረጋግጡ</h2>
                <div className="receipt-row">
                  <span className="k">Service</span>
                  <span className="v">{service || `${category?.nameAm} - ${category?.nameEn}`}</span>
                </div>
                <div className="receipt-row">
                  <span className="k">Technician</span>
                  <span className="v">Closest available - assigned on acceptance</span>
                </div>
                {photoKey && (
                  <div className="receipt-row">
                    <span className="k">Photo</span>
                    <span className="v">Attached ✓</span>
                  </div>
                )}
                <div className="receipt-row">
                  <span className="k">Location</span>
                  <span className="v">
                    {areaLabel || `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`}
                    {landmark && <div className="hint">“{landmark}”</div>}
                  </span>
                </div>
                {description && (
                  <div className="receipt-row">
                    <span className="k">Problem</span>
                    <span className="v" style={{ fontWeight: 400 }}>
                      {description}
                    </span>
                  </div>
                )}
                {category?.priceFloorEtb && (
                  <div className="receipt-row">
                    <span className="k">Estimate</span>
                    <span className="v">
                      ከ ETB {category.priceFloorEtb} ጀምሮ · from ETB {category.priceFloorEtb}
                    </span>
                  </div>
                )}
                <p className="hint mt mb">
                  The nearest verified technician is dispatched - average arrival {ARRIVAL}. When
                  the job is done you pay the technician directly (cash, Telebirr, CBE Birr or
                  mobile banking) at the standard platform rate, and every repair carries a{' '}
                  {GUARANTEE_DAYS}-day guarantee. Cancelling is free until the technician starts
                  traveling; if they arrive and you choose not to proceed, a diagnostic fee of{' '}
                  {DIAGNOSTIC_FEE.min}-{DIAGNOSTIC_FEE.max} ETB applies.
                </p>
                <div className="spread">
                  <button className="btn btn-line btn-sm" onClick={() => setStep(3)}>
                    ← Back
                  </button>
                  <button className="btn btn-primary" disabled={busy} onClick={confirm}>
                    {busy ? 'Booking…' : 'ማስያዣ ያረጋግጡ · Confirm booking'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* live summary - fills in as you go */}
          <aside className="sum-card" aria-label="Booking summary">
            <h3>Your booking · ማስያዣዎ</h3>
            <div className="sum-row">
              <span className="k">Service</span>
              <span className={`v${category ? '' : ' empty'}`}>
                {category ? category.nameAm : '-'}
              </span>
            </div>
            <div className="sum-row">
              <span className="k">Location</span>
              <span className={`v${step > 1 || areaLabel ? '' : ' empty'}`}>
                {areaLabel || (step > 1 ? `${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)}` : '-')}
              </span>
            </div>
            <div className="sum-row">
              <span className="k">Landmark</span>
              <span className={`v${landmark ? '' : ' empty'}`}>{landmark || '-'}</span>
            </div>
            <div className="sum-row">
              <span className="k">Technician</span>
              <span className={`v${step > 2 ? '' : ' empty'}`}>
                {step > 2 ? 'Closest available' : '-'}
              </span>
            </div>
            <p className="sum-note">
              {category?.priceFloorEtb
                ? `ከ ETB ${category.priceFloorEtb} ጀምሮ · from ETB ${category.priceFloorEtb} - final price follows the standard platform range.`
                : 'Price follows the standard platform ranges.'}{' '}
              You pay the technician directly - cash, Telebirr, CBE Birr or mobile banking - and
              every repair carries a {GUARANTEE_DAYS}-day guarantee.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function BookPage() {
  return (
    <Suspense>
      <BookWizard />
    </Suspense>
  );
}

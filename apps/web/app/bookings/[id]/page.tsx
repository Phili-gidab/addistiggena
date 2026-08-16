'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stars } from '../../../components/Stars';
import { StatusBadge } from '../../../components/StatusBadge';
import { api, ApiError, Booking, fmtDistance, getToken, getUser } from '../../../lib/api';

const TrackMap = dynamic(() => import('../../../components/TrackMap'), { ssr: false });

const ACTIVE_STATES = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

interface TrackInfo {
  tracking: boolean;
  lat?: number;
  lng?: number;
  updatedAt?: string | null;
  distanceM?: number;
  /** minutes away while ACCEPTED/EN_ROUTE - null once arrived/started */
  etaMinutes?: number | null;
}

interface ChatMessage {
  id: string;
  text: string;
  createdAt: string;
  sender: { id: string; name: string | null; role: string };
}

const FLOW = [
  { key: 'REQUESTED', t: 'Requested · ተጠይቋል', s: 'Waiting for the technician (90s window)' },
  { key: 'ACCEPTED', t: 'Accepted · ተቀብሏል', s: 'The technician confirmed your job' },
  { key: 'EN_ROUTE', t: 'En route · በመንገድ ላይ', s: 'On the way to your pin' },
  { key: 'ARRIVED', t: 'Arrived · ደርሷል', s: 'At your location' },
  { key: 'IN_PROGRESS', t: 'In progress · በስራ ላይ', s: 'Work underway' },
  { key: 'COMPLETED', t: 'Completed · ተጠናቋል', s: 'Awaiting payment' },
  { key: 'PAID', t: 'Paid · ተከፍሏል', s: 'Receipt issued - thank you!' },
];

const GATEWAYS = ['TELEBIRR', 'CHAPA', 'CBEBIRR', 'CASH'] as const;

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useRef(getUser());

  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  /** provider-side: the offer cascade moved this job to someone else (403) */
  const [reassigned, setReassigned] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [gateway, setGateway] = useState<(typeof GATEWAYS)[number]>('TELEBIRR');
  const [checkout, setCheckout] = useState<{
    gatewayRef: string;
    checkout: { instruction?: string; checkoutUrl?: string } & Record<string, string>;
  } | null>(null);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [price, setPrice] = useState('');
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    api<Booking>(`/bookings/${id}`)
      .then((b) => {
        setError('');
        setBooking(b);
        if (ACTIVE_STATES.includes(b.status)) {
          api<TrackInfo>(`/bookings/${id}/track`).then(setTrack).catch(() => {});
        } else {
          setTrack(null);
        }
        if (!['REJECTED', 'EXPIRED', 'CANCELLED'].includes(b.status)) {
          api<ChatMessage[]>(`/bookings/${id}/messages`).then(setMsgs).catch(() => {});
        }
      })
      .catch((e) => {
        // auto-dispatch cascade: a provider who rejected/expired is no longer a
        // party to the booking - the API answers 403. Show a friendly note
        // instead of a raw error and stop polling.
        if (e instanceof ApiError && e.status === 403 && user.current?.role === 'PROVIDER') {
          setReassigned(true);
        } else {
          setError((e as Error).message);
        }
      });
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=/bookings/${id}`);
      return;
    }
    if (reassigned) return;
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [id, refresh, router, reassigned]);

  // auto-dispatch: 90s offer window - tick every second while an offer is open.
  // Polling may bring a new offerExpiresAt/provider (cascade re-offer); keying the
  // interval on the deadline makes the countdown reset cleanly.
  const offerExpiresAt = booking?.status === 'REQUESTED' ? booking.offerExpiresAt ?? null : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!offerExpiresAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [offerExpiresAt]);
  const offerSecondsLeft = offerExpiresAt
    ? Math.max(0, Math.ceil((new Date(offerExpiresAt).getTime() - now) / 1000))
    : null;

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatText.trim()) return;
    const text = chatText;
    setChatText('');
    try {
      const m = await api<ChatMessage>(`/bookings/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setMsgs((prev) => [...prev, m]);
      setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      setActionErr((err as Error).message);
    }
  }

  if (reassigned) {
    return (
      <main className="page">
        <div className="container" style={{ maxWidth: 680 }}>
          <div className="panel">
            <div className="dispatch-note" style={{ marginBottom: '0.9rem' }}>
              ይህ ስራ ለሌላ ባለሙያ ተላልፏል · This job was passed to another technician.
            </div>
            <Link className="btn btn-primary btn-sm" href="/provider">
              ← Back to dashboard · ወደ ሰሌዳዎ ይመለሱ
            </Link>
          </div>
        </div>
      </main>
    );
  }
  if (error) {
    return (
      <main className="page">
        <div className="container" style={{ maxWidth: 680 }}>
          <div className="error-box">{error}</div>
        </div>
      </main>
    );
  }
  if (!booking) {
    return (
      <main className="page">
        <div className="container" style={{ maxWidth: 680 }}>
          <div className="skeleton" style={{ height: 360 }} />
        </div>
      </main>
    );
  }

  const isCustomer = booking.customerId === user.current?.id;
  const isProvider = booking.provider?.user?.id === user.current?.id;
  const dead = ['CANCELLED', 'REJECTED', 'EXPIRED'].includes(booking.status);
  const flowIdx = FLOW.findIndex((f) => f.key === booking.status);

  async function act(path: string, body?: object) {
    setActionErr('');
    setBusy(true);
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
      setCheckout(null);
      refresh();
    } catch (e) {
      setActionErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function initiatePayment() {
    setActionErr('');
    setBusy(true);
    try {
      const res = await api<{
        gatewayRef?: string;
        checkout?: { instruction?: string; checkoutUrl?: string } & Record<string, string>;
        ok?: boolean;
      }>(`/payments/${booking!.id}/initiate`, { method: 'POST', body: JSON.stringify({ gateway }) });
      if (res.checkout && res.gatewayRef) {
        setCheckout({ gatewayRef: res.gatewayRef, checkout: res.checkout });
      }
      refresh();
    } catch (e) {
      setActionErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 680 }}>
        <div className="spread mb">
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            {booking.category.nameAm}
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '55%', color: 'var(--muted)', display: 'block' }}>
              {booking.category.nameEn} · #{booking.id.slice(-6).toUpperCase()}
            </span>
          </h1>
          <StatusBadge status={booking.status} />
        </div>

        {actionErr && <div className="error-box">{actionErr}</div>}

        {/* ── status ────────────────────────────────────────────────────── */}
        <div className="panel">
          {dead ? (
            booking.status === 'EXPIRED' ? (
              <div className="error-box" style={{ marginBottom: 0 }}>
                No technician available right now - please try again shortly.
                <div style={{ marginTop: '0.7rem' }}>
                  <Link className="btn btn-primary btn-sm" href="/book">
                    + New booking
                  </Link>
                </div>
              </div>
            ) : (
              <div className="error-box" style={{ marginBottom: 0 }}>
                This booking ended: <strong>{booking.status}</strong>
                {booking.status === 'CANCELLED' && ' - you can book again any time.'}
              </div>
            )
          ) : (
            <>
              {isCustomer && booking.status === 'REQUESTED' && (
                <div className="dispatch-note">
                  {booking.provider ? (
                    <>
                      Waiting for technician response
                      {offerSecondsLeft !== null && (
                        <>
                          {' '}
                          - <strong>{offerSecondsLeft}s</strong> left
                        </>
                      )}{' '}
                      · if they don&rsquo;t respond we&rsquo;ll offer the job to the next technician
                      automatically.
                    </>
                  ) : (
                    <>Finding a technician near you…</>
                  )}
                </div>
              )}
              <div className="timeline">
                {FLOW.map((f, i) => (
                  <div key={f.key} className={`tl-item ${i < flowIdx ? 'done' : i === flowIdx ? 'now' : 'todo'}`}>
                    <span className="tl-dot">{i < flowIdx ? '✓' : ''}</span>
                    <span>
                      <span className="t">{f.t}</span>
                      <span className="s" style={{ display: 'block' }}>{f.s}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── live tracking map ─────────────────────────────────────────── */}
        {track?.tracking && track.lat && track.lng && (
          <div className="panel">
            <div className="spread mb">
              <h2 style={{ marginBottom: 0 }}>Live tracking · ቀጥታ ክትትል</h2>
              <span className="hint">
                technician position
                {track.updatedAt
                  ? ` - updated ${new Date(track.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </span>
            </div>
            {track.etaMinutes != null && track.distanceM != null && (
              <p className="mb" style={{ marginTop: 0 }}>
                <span className="dist-chip">
                  ~{track.etaMinutes} min away · {fmtDistance(track.distanceM)}
                </span>
              </p>
            )}
            <TrackMap booking={{ lat: booking.lat, lng: booking.lng }} tech={{ lat: track.lat, lng: track.lng }} />
            <p className="hint" style={{ marginTop: 0 }}>
              <span style={{ color: 'var(--orange)' }}>●</span> your location ·{' '}
              <span style={{ color: 'var(--teal)' }}>●</span> technician - refreshes every few seconds
            </p>
          </div>
        )}

        {/* ── parties & details ─────────────────────────────────────────── */}
        <div className="panel">
          <h2>Details</h2>
          {/* while REQUESTED the provider is merely offered the job - don't show
              them as "your technician" (the dispatch-note countdown covers it) */}
          {booking.provider && booking.status !== 'REQUESTED' && (
            <div className="tech-card mb" style={{ cursor: 'default' }}>
              <span className="avatar">{(booking.provider.user.name ?? 'T').slice(0, 1)}</span>
              <span className="meta">
                <span className="name">
                  {booking.provider.user.name ?? 'Technician'}
                  <span className="verified">✔ verified</span>
                </span>
                <span className="sub">
                  <Stars value={booking.provider.ratingAvg} small /> · your technician
                </span>
              </span>
              <a className="btn btn-teal btn-sm" href={`tel:${booking.provider.user.phone}`}>
                Call
              </a>
            </div>
          )}
          {isProvider && booking.customer && (
            <div className="tech-card mb" style={{ cursor: 'default' }}>
              <span className="avatar" style={{ background: 'var(--navy)' }}>
                {(booking.customer.name ?? 'C').slice(0, 1)}
              </span>
              <span className="meta">
                <span className="name">{booking.customer.name ?? 'Customer'}</span>
                <span className="sub">customer</span>
              </span>
              <a className="btn btn-teal btn-sm" href={`tel:${booking.customer.phone}`}>
                Call
              </a>
            </div>
          )}
          <p className="hint">
            📍 {booking.lat.toFixed(5)}, {booking.lng.toFixed(5)}
            {booking.landmarkNote && <> - “{booking.landmarkNote}”</>}
          </p>
          {!booking.finalPriceEtb && booking.priceQuoteEtb && (
            <p className="hint" style={{ marginTop: '0.4rem' }}>
              Estimate: from ETB {booking.priceQuoteEtb} · ከ ETB {booking.priceQuoteEtb} ጀምሮ -
              final price agreed on completion
            </p>
          )}
          {booking.description && <p className="mt">{booking.description}</p>}
          {booking.payment?.status === 'CONFIRMED' && (
            <div className="ok-box mt" style={{ marginBottom: 0 }}>
              Paid {booking.payment.amountEtb} ETB via {booking.payment.gateway}
              {booking.payment.commissionEtb && <> · platform commission {booking.payment.commissionEtb} ETB</>}
            </div>
          )}
        </div>

        {/* ── digital receipt (printable) ───────────────────────────────── */}
        {booking.payment?.status === 'CONFIRMED' && (
          <div className="panel receipt">
            <div className="receipt-head">
              <span>
                <span className="am">አዲስ ጥገና</span>{' '}
                <span className="ref" style={{ marginLeft: '0.5rem' }}>
                  E-RECEIPT
                </span>
              </span>
              <span className="ref">#{booking.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="receipt-row">
              <span className="k">Service</span>
              <span className="v">
                {booking.category.nameAm} - {booking.category.nameEn}
              </span>
            </div>
            {booking.provider && (
              <div className="receipt-row">
                <span className="k">Technician</span>
                <span className="v">{booking.provider.user.name ?? 'Verified technician'}</span>
              </div>
            )}
            {booking.customer && (
              <div className="receipt-row">
                <span className="k">Customer</span>
                <span className="v">{booking.customer.name ?? booking.customer.phone}</span>
              </div>
            )}
            <div className="receipt-row">
              <span className="k">Date</span>
              <span className="v">
                {new Date(booking.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="receipt-row">
              <span className="k">Paid via</span>
              <span className="v">{booking.payment.gateway}</span>
            </div>
            <div className="receipt-total">
              <span>Total · ጠቅላላ</span>
              <span>{booking.payment.amountEtb} ETB</span>
            </div>
            <p className="receipt-thanks">
              እናመሰግናለን - thank you for choosing Addis Tiggena. Wezete Technology for Amnen
              Promotion, Addis Ababa.
            </p>
            <button className="btn btn-line btn-sm mt no-print" onClick={() => window.print()}>
              🖨 Print / save as PDF
            </button>
          </div>
        )}

        {/* ── provider actions ──────────────────────────────────────────── */}
        {isProvider && !dead && (
          <div className="panel">
            <h2>Technician actions</h2>
            <div className="row">
              {booking.status === 'REQUESTED' && (
                <>
                  <button
                    className="btn btn-teal"
                    disabled={busy || offerSecondsLeft === 0}
                    onClick={() => act(`/bookings/${booking.id}/accept`)}
                  >
                    Accept job
                  </button>
                  <button
                    className="btn btn-line"
                    disabled={busy || offerSecondsLeft === 0}
                    onClick={() => act(`/bookings/${booking.id}/reject`)}
                  >
                    Reject
                  </button>
                  {offerSecondsLeft !== null &&
                    (offerSecondsLeft > 0 ? (
                      <span className="offer-count">Respond within {offerSecondsLeft}s</span>
                    ) : (
                      <span className="offer-count">ጊዜው አልፏል · expired - reassigning…</span>
                    ))}
                </>
              )}
              {booking.status === 'ACCEPTED' && (
                <button className="btn btn-primary" disabled={busy} onClick={() => act(`/bookings/${booking.id}/enroute`)}>
                  I am on my way →
                </button>
              )}
              {['ACCEPTED', 'EN_ROUTE'].includes(booking.status) && (
                <button className="btn btn-dark" disabled={busy} onClick={() => act(`/bookings/${booking.id}/arrive`)}>
                  Mark arrived
                </button>
              )}
              {booking.status === 'ARRIVED' && (
                <button className="btn btn-primary" disabled={busy} onClick={() => act(`/bookings/${booking.id}/start`)}>
                  Start work
                </button>
              )}
              {ACTIVE_STATES.includes(booking.status) && (
                <button
                  className="btn btn-line btn-sm"
                  onClick={() =>
                    navigator.geolocation?.getCurrentPosition((p) =>
                      api('/providers/me/location', {
                        method: 'PUT',
                        body: JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude }),
                      }).then(refresh),
                    )
                  }
                >
                  ⌖ Share my live location
                </button>
              )}
            </div>
            {booking.status === 'IN_PROGRESS' && (
              <div className="row mt">
                <input
                  className="input"
                  style={{ maxWidth: 180 }}
                  placeholder="Final price (ETB)"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
                />
                <button
                  className="btn btn-teal"
                  disabled={busy || !price}
                  onClick={() => act(`/bookings/${booking.id}/complete`, { finalPriceEtb: Number(price) })}
                >
                  Complete job ✓
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── customer: payment ─────────────────────────────────────────── */}
        {isCustomer && booking.status === 'COMPLETED' && (
          <div className="panel">
            <h2>Pay {booking.finalPriceEtb ?? booking.priceQuoteEtb} ETB · ይክፈሉ</h2>
            <p className="hint mb">
              You pay the technician directly - cash, Telebirr, CBE Birr or mobile banking - at the
              standard platform rate. Recording the payment here keeps your 5-day service guarantee
              active and gives you an e-receipt.
            </p>
            <div className="gateways mb">
              {GATEWAYS.map((g) => (
                <button key={g} className={`gw${gateway === g ? ' selected' : ''}`} onClick={() => setGateway(g)}>
                  {g === 'CASH' ? '💵 Cash' : g.charAt(0) + g.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            {!checkout && (
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={initiatePayment}>
                {busy ? 'Starting…' : gateway === 'CASH' ? 'Confirm cash payment' : `Pay with ${gateway.toLowerCase()}`}
              </button>
            )}
            {checkout && (
              <div className="ok-box" style={{ marginBottom: 0 }}>
                {checkout.checkout.checkoutUrl && (
                  <a
                    className="btn btn-primary"
                    style={{ width: '100%', marginBottom: '0.8rem' }}
                    href={checkout.checkout.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Chapa checkout →
                  </a>
                )}
                <strong>{checkout.checkout.instruction}</strong>
                <div className="hint mt" style={{ marginTop: '0.5rem' }}>
                  Ref: <code>{checkout.gatewayRef}</code>
                </div>
                {process.env.NEXT_PUBLIC_DEV_TOOLS === '1' && (
                  <button
                    className="btn btn-teal btn-sm mt"
                    disabled={busy}
                    onClick={() =>
                      act(`/payments/webhook/${gateway.toLowerCase()}`, {
                        gatewayRef: checkout.gatewayRef,
                        status: 'SUCCESS',
                      })
                    }
                  >
                    Simulate gateway confirmation (dev)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── customer: review ──────────────────────────────────────────── */}
        {isCustomer && booking.status === 'PAID' && !booking.review && (
          <div className="panel">
            <h2>Rate your technician · ደረጃ ይስጡ</h2>
            <div className="mb">
              <Stars value={stars} onChange={setStars} />
            </div>
            <div className="field">
              <textarea
                rows={3}
                placeholder="How was the service?"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                act('/reviews', { bookingId: booking.id, stars, text: reviewText || undefined })
              }
            >
              Submit review
            </button>
          </div>
        )}
        {booking.review && (
          <div className="panel">
            <h2>Your review</h2>
            <Stars value={booking.review.stars} small />{' '}
            <span className="hint">
              {booking.review.state === 'PENDING' ? '- published after moderation (24h)' : '- published'}
            </span>
          </div>
        )}

        {/* ── in-app chat ───────────────────────────────────────────────── */}
        {!dead && (isCustomer || isProvider) && (
          <div className="panel">
            <h2>Chat · መልዕክት</h2>
            {msgs.length === 0 && (
              <p className="hint">No messages yet - coordinate arrival details here.</p>
            )}
            <div className="chat-box">
              {msgs.map((m) => (
                <div key={m.id} className={`msg ${m.sender.id === user.current?.id ? 'mine' : 'theirs'}`}>
                  <span className="who">
                    {m.sender.id === user.current?.id ? 'You' : m.sender.name ?? m.sender.role.toLowerCase()}
                  </span>
                  {m.text}
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            {booking.status !== 'PAID' && (
              <form className="chat-input" onSubmit={sendChat}>
                <input
                  className="input"
                  placeholder="Type a message… · መልዕክት ይጻፉ…"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  maxLength={500}
                />
                <button className="btn btn-primary btn-sm" disabled={!chatText.trim()}>
                  Send
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── customer: cancel ──────────────────────────────────────────── */}
        {isCustomer && ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(booking.status) && (
          <div className="panel">
            <button
              className="btn btn-line btn-sm"
              disabled={busy}
              onClick={() => {
                const reason = window.prompt('Why are you cancelling? · ለምን ይሰርዛሉ?');
                if (reason) act(`/bookings/${booking.id}/cancel`, { reason });
              }}
            >
              Cancel booking · ሰርዝ
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

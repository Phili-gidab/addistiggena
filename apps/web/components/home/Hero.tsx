'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Category } from '../../lib/api';
import { catalogBySlug, iconFor } from '../../lib/catalog';
import { GUARANTEE_DAYS, SLOGAN } from '../../lib/content';
import { BAND_IMG, HERO_IMG } from '../../lib/images';
import { finePointer, gsap, reducedMotion, useGSAP } from '../../lib/motion';

const PLACEHOLDERS = [
  'What needs fixing? e.g. Mitad, socket, tap…',
  'Electric Mitad repair…',
  'Leaking pipe in the kitchen…',
  'ቧንቧ ጥገና…',
  'Wi-Fi router keeps dropping…',
  'Door lock replacement…',
  'Electrician in Bole…',
];

/** Rotating pool for the live-dispatch feed on the hero card. */
interface FeedJob {
  ic: string;
  b: string;
  small: string;
  ok: string;
  live?: boolean;
}
const JOB_POOL: FeedJob[] = [
  { ic: '⚡', b: 'Electric Mitad repair', small: 'Bole Medhanialem · today 10:24', ok: '✓ Fixed · 650 ETB' },
  { ic: '🚰', b: 'Pipe leakage repair', small: 'Jemo 1 condominium · en route', ok: '18 min', live: true },
  { ic: '🔌', b: 'Socket & breaker fix', small: 'Piassa · today 11:02', ok: '✓ Fixed · 400 ETB' },
  { ic: '📶', b: 'Wi-Fi router setup', small: 'CMC Michael · en route', ok: '9 min', live: true },
  { ic: '🧊', b: 'Fridge not cooling', small: 'Gerji Mebrat Hail · on site', ok: 'diagnosing', live: true },
  { ic: '🚪', b: 'Door lock replacement', small: 'Lideta condominium · today 09:40', ok: '✓ Fixed · 500 ETB' },
  { ic: '🖥️', b: 'Office printer repair', small: 'Kazanchis · en route', ok: '12 min', live: true },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Module-level so chip keys stay unique even if Fast Refresh or StrictMode
// briefly runs two rotation timers side by side.
let feedUid = 1;

/** Search-first hero: type what's broken, jump straight into booking. */
export function Hero({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const root = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [ph, setPh] = useState(PLACEHOLDERS[0]);
  const [feed, setFeed] = useState(() => [
    { uid: -1, job: JOB_POOL[0] },
    { uid: -2, job: JOB_POOL[1] },
  ]);
  const feedCursor = useRef(2);

  // typewriter placeholder: types and deletes real queries in both scripts
  useEffect(() => {
    if (reducedMotion()) {
      let i = 0;
      const t = setInterval(() => setPh(PLACEHOLDERS[++i % PLACEHOLDERS.length]), 2600);
      return () => clearInterval(t);
    }
    let alive = true;
    (async () => {
      await wait(2200); // let the entrance play before the caret starts
      let i = 1;
      while (alive) {
        const target = PLACEHOLDERS[i % PLACEHOLDERS.length];
        for (let n = 1; n <= target.length && alive; n++) {
          setPh(target.slice(0, n) + '▏');
          await wait(34 + Math.random() * 36);
        }
        if (!alive) break;
        setPh(target);
        await wait(1700);
        for (let n = target.length; n >= 0 && alive; n--) {
          setPh(target.slice(0, n) + '▏');
          await wait(16);
        }
        i++;
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // live-dispatch feed: a new job slides in, the oldest leaves
  useEffect(() => {
    if (reducedMotion()) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      const uid = feedUid++;
      const job = JOB_POOL[feedCursor.current % JOB_POOL.length];
      feedCursor.current += 1;
      setFeed((f) => [{ uid, job }, f[0]]);
    }, 5200);
    return () => clearInterval(t);
  }, []);

  // animate each newly arrived feed chip
  useGSAP(
    () => {
      if (reducedMotion() || feedCursor.current === 2) return;
      const first = feedRef.current?.querySelector('.hero-chip');
      if (!first) return;
      gsap.from(first, { y: -18, autoAlpha: 0, scale: 0.96, duration: 0.55, ease: 'power3.out' });
    },
    { dependencies: [feed], scope: feedRef },
  );

  // entrance: one orchestrated timeline - masked headline lines, rising UI, card + chips.
  // Built synchronously inside the GSAP context so StrictMode's mount-unmount-mount
  // cycle reverts cleanly (an async-created .from() would capture the hidden state).
  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.hero-tagline', { y: 14, autoAlpha: 0, duration: 0.5 }, 0.05)
        .from('[data-hl]', { yPercent: 118, duration: 0.9, stagger: 0.1 }, 0.1)
        .from('.hero-p', { y: 18, autoAlpha: 0, duration: 0.6 }, 0.6)
        .from('.search-bar', { y: 16, scale: 0.97, autoAlpha: 0, duration: 0.55 }, 0.75)
        .from('.hero-stats .hs', { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.07 }, 0.85)
        .from('.hero-card', { x: 44, autoAlpha: 0, duration: 0.9, ease: 'power4.out' }, 0.4)
        .from(
          '.hero-card .brand-badge, .hero-card .hero-chip, .hero-card .btn',
          { y: 20, autoAlpha: 0, duration: 0.55, stagger: 0.09 },
          0.65,
        );
      // count-up stats
      gsap.utils.toArray<HTMLElement>('[data-cnt]').forEach((el, i) => {
        const end = Number(el.dataset.cnt);
        const state = { v: 0 };
        gsap.to(state, {
          v: end,
          duration: 1.1,
          delay: 0.9 + i * 0.08,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = String(Math.round(state.v));
          },
        });
      });

      // desktop-only 3D tilt on the navy card (same context so StrictMode
      // reverts entrance + tilt together - split contexts fight over transform)
      const card = cardRef.current;
      if (!card || !finePointer()) return;
      gsap.set(card, { transformPerspective: 900 });
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power2.out' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power2.out' });
      const move = (e: PointerEvent) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 7);
        rx(((e.clientY - r.top) / r.height - 0.5) * -7);
      };
      const leave = () => {
        rx(0);
        ry(0);
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      return () => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
      };
    },
    { scope: root },
  );

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return categories
      .filter((c) => {
        const entry = catalogBySlug(c.slug);
        const haystack = [c.nameEn, c.nameAm, entry?.scope ?? '', ...(c.subServices ?? []), ...(entry?.services ?? [])]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 6);
  }, [q, categories]);

  const go = (id?: string) =>
    router.push(id ? `/book?category=${id}` : '/book');

  return (
    <section className="hero" ref={root}>
      <span className="hero-bgphoto" aria-hidden>
        {/* Photo: Scott Blake on Unsplash (free license) - faint texture wash */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BAND_IMG} alt="" loading="eager" />
      </span>
      <span className="hero-word" aria-hidden>
        ጥገና
      </span>
      <div className="container hero-grid">
        <div>
          <span className="hero-tagline">{SLOGAN}</span>
          <h1 className="hero-h1">
            <span className="hl-mask">
              <span className="hl-line" data-hl>
                A verified technician,
              </span>
            </span>
            <span className="hl-mask">
              <span className="hl-line b" data-hl>
                at your door in minutes.
              </span>
            </span>
            <span className="hl-mask">
              <span className="hl-line am" data-hl>
                ማንነቱ የተረጋገጠ የጥገና ባለሙያ በደቂቃ ውስጥ በርዎ ላይ
              </span>
            </span>
          </h1>
          <p className="hero-p">
            Mitad, wiring, plumbing, appliances, Wi-Fi - pick a service, pin your location, and the
            nearest Woreda-cleared, CoC-certified technician is dispatched to you. As easy as
            ordering a ride.
          </p>

          <div style={{ position: 'relative' }}>
            <form
              className="search-bar"
              onSubmit={(e) => {
                e.preventDefault();
                go(matches[0]?.id);
              }}
            >
              <span className="ic" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                placeholder={ph}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                aria-label="Search services"
              />
              <button className="btn btn-primary btn-sm" type="submit">
                Find a technician
              </button>
            </form>
            {focused && matches.length > 0 && (
              <div className="search-pop">
                {matches.map((c) => (
                  <button key={c.id} type="button" onMouseDown={() => go(c.id)}>
                    <span className="em">{iconFor(c.slug)}</span>
                    <span>
                      {c.nameEn} · <span style={{ fontFamily: 'var(--font-am)' }}>{c.nameAm}</span>
                    </span>
                    {c.priceFloorEtb && <span className="sub">from ETB {c.priceFloorEtb}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hero-stats">
            <span className="hs">
              <span className="n">
                <span data-cnt="15">15</span>
                <em>-</em>
                <span data-cnt="30">30</span>
                <em>′</em>
              </span>
              <span className="l">Avg. arrival</span>
            </span>
            <span className="hs">
              <span className="n">
                <span data-cnt={GUARANTEE_DAYS}>{GUARANTEE_DAYS}</span>
                <em>-day</em>
              </span>
              <span className="l">Guarantee</span>
            </span>
            <span className="hs">
              <span className="n">
                <span data-cnt="14">14</span>
                <em>h</em>
              </span>
              <span className="l">Open daily · 6am-8pm</span>
            </span>
            <span className="hs">
              <span className="n">
                <span data-cnt="11">11</span>
                <em>/11</em>
              </span>
              <span className="l">Sub-cities covered</span>
            </span>
          </div>
        </div>

        <div className="hero-card" ref={cardRef}>
          <span className="photo" aria-hidden>
            {/* Photo: Emmanuel Ikwuegbu on Unsplash (free license) - electrician at a panel */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_IMG} alt="" loading="eager" />
          </span>
          <span className="glyph" aria-hidden>
            ጥገና
          </span>
          <div className="brand-badge">
            <Image src="/logo.png" alt="Addis Tiggena - Connect, Fix, Care" width={150} height={150} priority />
          </div>
          <div className="hero-feed" ref={feedRef}>
            {feed.map(({ uid, job }) => (
              <div className="hero-chip" key={uid}>
                <span className="ic">{job.ic}</span>
                <span>
                  <b>{job.b}</b>
                  <small>
                    {job.live && <i className="dot" aria-hidden />}
                    {job.small}
                  </small>
                </span>
                <span className="ok">{job.ok}</span>
              </div>
            ))}
          </div>
          <div className="hero-chip">
            <span className="ic ic-ping">✔</span>
            <span>
              <b>Abebe T. - Verified</b>
              <small>Woreda ✓ · CoC ✓ · Fayda ID ✓</small>
            </span>
            <span className="ok">★ 4.9</span>
          </div>
          <Link href="/book" className="btn btn-primary" style={{ width: '100%' }}>
            አገልግሎት ይዘዙ · Book a service
          </Link>
        </div>
      </div>
    </section>
  );
}

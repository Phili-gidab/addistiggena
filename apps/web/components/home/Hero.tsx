'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Category } from '../../lib/api';
import { catalogBySlug, iconFor } from '../../lib/catalog';
import { GUARANTEE_DAYS, SLOGAN } from '../../lib/content';
import { BAND_IMG, HERO_IMG } from '../../lib/images';

const PLACEHOLDERS = [
  'What needs fixing? e.g. Mitad, socket, tap…',
  'Electric Mitad repair…',
  'Leaking pipe in the kitchen…',
  'Wi-Fi router keeps dropping…',
  'Door lock replacement…',
  'Electrician in Bole…',
];

/** Search-first hero: type what's broken, jump straight into booking. */
export function Hero({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [ph, setPh] = useState(0);

  // rotate the search placeholder through real queries
  useEffect(() => {
    const t = setInterval(() => setPh((p) => (p + 1) % PLACEHOLDERS.length), 2600);
    return () => clearInterval(t);
  }, []);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return categories
      .filter((c) => {
        const entry = catalogBySlug(c.slug);
        const haystack = [c.nameEn, c.nameAm, entry?.scope ?? '', ...(entry?.services ?? [])]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 6);
  }, [q, categories]);

  const go = (id?: string) =>
    router.push(id ? `/book?category=${id}` : '/book');

  return (
    <section className="hero">
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
            A verified technician,
            <br />
            <span className="b">at your door in minutes.</span>
            <span className="am">የተረጋገጠ ባለሙያ - በደቂቃዎች ውስጥ በርዎ ላይ።</span>
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
                placeholder={PLACEHOLDERS[ph]}
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
                15<em>–</em>30<em>′</em>
              </span>
              <span className="l">Avg. arrival</span>
            </span>
            <span className="hs">
              <span className="n">
                {GUARANTEE_DAYS}
                <em>-day</em>
              </span>
              <span className="l">Guarantee</span>
            </span>
            <span className="hs">
              <span className="n">
                14<em>h</em>
              </span>
              <span className="l">Open daily · 6am–8pm</span>
            </span>
            <span className="hs">
              <span className="n">
                10<em>/10</em>
              </span>
              <span className="l">Sub-cities covered</span>
            </span>
          </div>
        </div>

        <div className="hero-card">
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
          <div className="hero-chip">
            <span className="ic">⚡</span>
            <span>
              <b>Electric Mitad repair</b>
              <small>Bole Medhanialem · today 10:24</small>
            </span>
            <span className="ok">✓ Fixed · 650 ETB</span>
          </div>
          <div className="hero-chip">
            <span className="ic">🚰</span>
            <span>
              <b>Pipe leakage repair</b>
              <small>Jemo 1 condominium · en route</small>
            </span>
            <span className="ok">18 min</span>
          </div>
          <div className="hero-chip">
            <span className="ic">✔</span>
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

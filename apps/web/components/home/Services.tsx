'use client';

import Link from 'next/link';
import { Category } from '../../lib/api';
import { Dict } from '../../lib/i18n';
import { iconFor } from '../../lib/catalog';
import { FALLBACK_IMG, tradeImg } from '../../lib/images';
import { Reveal } from '../motion/Reveal';

/** "All categories" - icon tile grid with hover photography, one tap to book. */
export function Services({ categories, t }: { categories: Category[]; t: Dict }) {
  return (
    <section className="section" id="services">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <div>
              <span className="sec-kicker">{t.services.kicker}</span>
              <h2 className="sec-title">
                {t.services.title}
                <span className="am">{t.services.sub}</span>
              </h2>
            </div>
            <Link href="/pricing" className="see-all">
              {t.services.seeAll} →
            </Link>
          </div>
        </Reveal>
        <div className="cat-tiles">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={Math.min(i * 0.05, 0.35)}>
              <Link href={`/services/${c.slug}`} className="cat-tile" style={{ display: 'flex', height: '100%' }}>
                <span className="cat-img" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tradeImg(c.slug)}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      if (e.currentTarget.src !== FALLBACK_IMG) e.currentTarget.src = FALLBACK_IMG;
                    }}
                  />
                </span>
                <span className="ic" aria-hidden>
                  {iconFor(c.slug)}
                </span>
                <span className="mid">
                  <span className="en" style={{ display: 'block' }}>
                    {c.nameEn}
                  </span>
                  <span className="am">{c.nameAm}</span>
                  {c.priceFloorEtb && (
                    <span className="from">
                      {t.services.from} {c.priceFloorEtb}
                    </span>
                  )}
                </span>
              </Link>
            </Reveal>
          ))}
          {categories.length === 0 && (
            <p style={{ gridColumn: '1/-1', color: 'var(--muted)' }}>{t.services.offline}</p>
          )}
        </div>
      </div>
    </section>
  );
}

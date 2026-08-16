'use client';

import Link from 'next/link';
import { Category } from '../../lib/api';
import { iconFor } from '../../lib/catalog';
import { FALLBACK_IMG, tradeImg } from '../../lib/images';
import { Reveal } from '../motion/Reveal';

/** "All categories" - icon tile grid with hover photography, one tap to book. */
export function Services({ categories }: { categories: Category[] }) {
  return (
    <section className="section" id="services">
      <div className="container">
        <Reveal>
          <div className="section-head">
            <div>
              <span className="sec-kicker">Services · አገልግሎቶች</span>
              <h2 className="sec-title">
                All categories
                <span className="am">ምን ይጠገን? የሚፈልጉትን ይምረጡ</span>
              </h2>
            </div>
            <Link href="/pricing" className="see-all">
              See full price list →
            </Link>
          </div>
        </Reveal>
        <div className="cat-tiles">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={Math.min(i * 0.05, 0.35)}>
              <Link href={`/book?category=${c.id}`} className="cat-tile" style={{ display: 'flex', height: '100%' }}>
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
                <span>
                  <span className="en" style={{ display: 'block' }}>
                    {c.nameEn}
                  </span>
                  <span className="am">{c.nameAm}</span>
                </span>
                {c.priceFloorEtb && <span className="from">from ETB {c.priceFloorEtb}</span>}
              </Link>
            </Reveal>
          ))}
          {categories.length === 0 && (
            <p style={{ gridColumn: '1/-1', color: 'var(--muted)' }}>
              The API is offline - start it with <code>npm run start:dev -w apps/api</code>.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

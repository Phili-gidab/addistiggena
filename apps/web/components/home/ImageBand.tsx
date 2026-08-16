'use client';

import { useEffect, useRef } from 'react';
import { BAND_IMG } from '../../lib/images';

/**
 * Full-bleed photographic divider. The photo sits taller than its window and
 * is dragged vertically with the scroll (classic parallax) via rAF - no
 * library, disabled under reduced motion.
 */
export function ImageBand() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current!;
    const photo = el.querySelector<HTMLElement>('.img-band-photo')!;
    const word = el.querySelector<HTMLElement>('.img-band-word')!;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.bottom < 0 || r.top > vh) return;
        // -1 (band below viewport) → +1 (band above viewport)
        const p = 1 - (2 * (r.top + r.height / 2)) / (vh + r.height);
        photo.style.transform = `translateY(${p * 9}%)`;
        word.style.transform = `translate(calc(-50% + ${p * -4}%), -50%)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="img-band" ref={ref} aria-label="Craftspeople at work across Addis Ababa">
      <div className="img-band-photo">
        {/* Photo: Scott Blake on Unsplash (free license) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BAND_IMG} alt="" loading="lazy" />
      </div>
      <span className="img-band-word" aria-hidden>
        እንጠግናለን
      </span>
      <span className="img-band-caption">We fix. - every trade, one platform</span>
    </section>
  );
}

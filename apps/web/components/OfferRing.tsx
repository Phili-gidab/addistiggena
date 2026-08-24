'use client';

const R = 15;
const CIRC = 2 * Math.PI * R;

/**
 * Circular countdown for the dispatch offer window (5 min) - the stroke drains
 * second by second and shifts blue → amber → red as time runs out.
 */
const fmt = (s: number) => (s > 99 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s));

export function OfferRing({ seconds, total = 300 }: { seconds: number; total?: number }) {
  const frac = Math.max(0, Math.min(1, seconds / total));
  const tone = frac > 0.45 ? 'var(--blue)' : frac > 0.18 ? '#d9912c' : '#cf4444';
  return (
    <span className="offer-ring" role="timer" aria-label={`${seconds} seconds left`}>
      <svg viewBox="0 0 36 36" width="38" height="38" aria-hidden>
        <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - frac)}
          transform="rotate(-90 18 18)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
      </svg>
      <b>{fmt(seconds)}</b>
    </span>
  );
}

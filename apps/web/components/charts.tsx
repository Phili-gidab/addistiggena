'use client';

import { useState } from 'react';

export interface DayPoint {
  day: string;
  count: number;
}

const W = 640;
const H = 210;
const PAD = { top: 26, right: 8, bottom: 26, left: 30 };

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * Single-series daily bar chart (magnitude over time).
 * Mark spec: thin bars, rounded data-end anchored to the baseline, 2px surface
 * gaps, recessive grid, hover tooltip, selective direct labels (peak + latest).
 */
export function DailyBars({ data }: { data: DayPoint[] }) {
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);
  if (data.length === 0) return null;

  const max = Math.max(1, ...data.map((d) => d.count));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.min(26, slot - 2);
  const peakIdx = data.findIndex((d) => d.count === max);

  const bar = (d: DayPoint, i: number) => {
    const h = (d.count / max) * plotH;
    const x = PAD.left + i * slot + (slot - barW) / 2;
    const y = PAD.top + plotH - h;
    const r = Math.min(4, barW / 2, h);
    // rounded top corners only — the data end; square at the baseline
    const path = `M ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y}
      L ${x + barW - r} ${y} Q ${x + barW} ${y} ${x + barW} ${y + r} L ${x + barW} ${y + h} Z`;
    return (
      <path
        key={d.day}
        d={h > 0 ? path : `M ${x} ${y + h - 1} h ${barW} v 1 h ${-barW} Z`}
        fill="var(--chart-blue)"
        opacity={tip && tip.i !== i ? 0.55 : 1}
        onMouseEnter={() => setTip({ i, x: x + barW / 2, y })}
        onMouseLeave={() => setTip(null)}
      />
    );
  };

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Bookings per day, last 14 days">
        {/* recessive grid: baseline + two guides */}
        {[0, 0.5, 1].map((f) => {
          const y = PAD.top + plotH - f * plotH;
          return (
            <g key={f}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--line)" strokeWidth={f === 0 ? 1.5 : 1} strokeDasharray={f === 0 ? undefined : '3 4'} />
              <text x={PAD.left - 7} y={y + 3} textAnchor="end" fontSize="10" fill="var(--muted)">
                {Math.round(f * max)}
              </text>
            </g>
          );
        })}
        {data.map(bar)}
        {/* selective direct labels: peak and latest day */}
        {[peakIdx, data.length - 1]
          .filter((i, idx, arr) => data[i].count > 0 && arr.indexOf(i) === idx)
          .map((i) => {
            const h = (data[i].count / max) * plotH;
            return (
              <text
                key={`lbl-${i}`}
                x={PAD.left + i * slot + slot / 2}
                y={PAD.top + plotH - h - 7}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--ink)"
              >
                {data[i].count}
              </text>
            );
          })}
        {/* x labels every other day */}
        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text key={`x-${d.day}`} x={PAD.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="9.5" fill="var(--muted)">
              {dayLabel(d.day)}
            </text>
          ) : null,
        )}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}>
          {dayLabel(data[tip.i].day)} — {data[tip.i].count} booking{data[tip.i].count === 1 ? '' : 's'}
        </div>
      )}
      <details className="hint data-table">
        <summary>Data table</summary>
        <table className="table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Bookings</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td>{dayLabel(d.day)}</td>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Ranked bar-list: category demand (label · bar · value per row). */
export function CategoryBars({
  data,
}: {
  data: { categoryId: string; name: string; nameAm: string; count: number }[];
}) {
  if (data.length === 0) return <p className="hint">No bookings yet.</p>;
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="bar-list">
      {data.map((d) => (
        <div className="row" key={d.categoryId}>
          <span className="name">
            {d.nameAm} · {d.name}
          </span>
          <span className="track">
            <span className="fill" style={{ width: `${(d.count / max) * 100}%`, display: 'block' }} />
          </span>
          <span className="val">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { CATALOG, PACKAGES } from '../../lib/catalog';
import { DIAGNOSTIC, fmtRange, PRICE_GROUPS } from '../../lib/pricing';

export const metadata: Metadata = {
  title: 'Price list - Addis Tiggena',
  description:
    'Standard base service price ranges (inspection + labor) in ETB for repairs on Addis Tiggena - fair, transparent reference rates for clients and technicians.',
};

export default function PricingPage() {
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 880 }}>
        <span className="sec-no">Pricing · ግልፅ የዋጋ ተመን</span>
        <h1 className="page-title">Initial base service price list</h1>
        <p className="page-sub" style={{ maxWidth: '64ch' }}>
          All payments are made directly to technicians, and final charges depend on job complexity
          and required spare parts. These rates are <strong>standard price ranges</strong>{' '}
          (inspection + base labor) in Ethiopian Birr - a fair reference for both clients and
          technicians. Spare parts / materials are recommended to be purchased by the client.
        </p>

        {PRICE_GROUPS.map((g, gi) => (
          <div key={g.title} className="panel" style={{ marginBottom: '1.1rem' }}>
            <h2>
              {gi + 1}. {g.title}
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-am)',
                  fontSize: '0.85rem',
                  color: 'var(--muted)',
                  marginTop: '0.25rem',
                }}
              >
                {g.titleAm}
              </span>
            </h2>
            <div className="table-scroll">
              <table className="price-table">
                <thead>
                  <tr>
                    <th>Service item</th>
                    <th>Description / scope</th>
                    <th>Price range</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((i) => (
                    <tr key={i.name}>
                      <td style={{ fontWeight: 600 }}>
                        {i.name}
                        <span className="am-cell">{i.nameAm}</span>
                      </td>
                      <td className="scope">
                        {i.scope}
                        <span className="am-cell">{i.scopeAm}</span>
                      </td>
                      <td className="range">{fmtRange(i)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="panel" style={{ marginBottom: '1.1rem' }}>
          <h2>{PRICE_GROUPS.length + 1}. Diagnostic &amp; call-out fee</h2>
          <p className="hint">
            <strong style={{ color: 'var(--navy)' }}>
              {DIAGNOSTIC.name} · {DIAGNOSTIC.nameAm}: {fmtRange(DIAGNOSTIC)}
            </strong>
            <br />
            Applicable only if the technician arrives and diagnoses the issue, but you choose not
            to proceed with the repair at that time.
          </p>
        </div>

        {/* ── every service, category by category ──────────────────────────── */}
        <span className="sec-no" style={{ marginTop: '2.4rem' }}>
          Full catalog · ሙሉ የአገልግሎት ዝርዝር
        </span>
        <h2 className="page-title" style={{ fontSize: '1.5rem' }}>
          All services by category
        </h2>
        <p className="page-sub" style={{ maxWidth: '64ch' }}>
          Every service line we dispatch for, by category. Where a standard range is not yet
          published, the category base rate applies and the technician quotes on inspection -
          specific prices for each item are being finalized and will appear here.
        </p>

        {CATALOG.map((c) => (
          <div key={c.slug} id={c.slug} className="panel" style={{ marginBottom: '1.1rem' }}>
            <h2>
              {c.icon} {c.nameEn}
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-am)',
                  fontSize: '0.85rem',
                  color: 'var(--muted)',
                  marginTop: '0.25rem',
                }}
              >
                {c.nameAm}
              </span>
            </h2>
            <p className="hint" style={{ marginBottom: '0.7rem' }}>{c.scope}</p>
            <div className="table-scroll">
              <table className="price-table" style={{ margin: '0.2rem 0 0.4rem' }}>
                <tbody>
                  {c.services.map((s) => (
                    <tr key={s}>
                      <td>{s}</td>
                      <td className="range" style={{ width: '38%' }}>
                        Standard rate - quoted on inspection
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="panel">
          <h2>Service packages · የአገልግሎት ፓኬጆች</h2>
          <div className="step-row">
            {PACKAGES.map((p) => (
              <div key={p.name} className="step-card" style={{ border: '1px solid var(--line)' }}>
                <h3>
                  {p.name}
                  <small>{p.nameAm}</small>
                </h3>
                <ul style={{ marginTop: '0.6rem', paddingLeft: '1.1rem', color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                  {p.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt" style={{ textAlign: 'center' }}>
          <Link href="/book" className="btn btn-primary btn-lg">
            አገልግሎት ይዘዙ · Book a service
          </Link>
        </div>
      </div>
    </main>
  );
}

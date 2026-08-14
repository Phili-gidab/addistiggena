import type { Metadata } from 'next';
import Link from 'next/link';
import { PACKAGES } from '../../lib/catalog';
import { DIAGNOSTIC, fmtRange, PRICE_GROUPS } from '../../lib/pricing';

export const metadata: Metadata = {
  title: 'Price list — Addis Tiggena',
  description:
    'Standard base service price ranges (inspection + labor) in ETB for repairs on Addis Tiggena — fair, transparent reference rates for clients and technicians.',
};

export default function PricingPage() {
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 880 }}>
        <span className="sec-no">Pricing · ዋጋዎች</span>
        <h1 className="page-title">Initial base service price list</h1>
        <p className="page-sub" style={{ maxWidth: '64ch' }}>
          All payments are made directly to technicians, and final charges depend on job complexity
          and required spare parts. These rates are <strong>standard price ranges</strong>{' '}
          (inspection + base labor) in Ethiopian Birr — a fair reference for both clients and
          technicians. Spare parts / materials are recommended to be purchased by the client.
        </p>

        {PRICE_GROUPS.map((g, gi) => (
          <div key={g.title} className="panel" style={{ marginBottom: '1.1rem' }}>
            <h2>
              {gi + 1}. {g.title}
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
                      <td style={{ fontWeight: 600 }}>{i.name}</td>
                      <td className="scope">{i.scope}</td>
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
              {DIAGNOSTIC.name}: {fmtRange(DIAGNOSTIC)}
            </strong>
            <br />
            Applicable only if the technician arrives and diagnoses the issue, but you choose not
            to proceed with the repair at that time.
          </p>
        </div>

        <div className="panel">
          <h2>Service packages</h2>
          <div className="step-row">
            {PACKAGES.map((p) => (
              <div key={p.name} className="step-card" style={{ border: '1px solid var(--line)' }}>
                <h3>{p.name}</h3>
                <p style={{ marginTop: '0.6rem' }}>
                  {p.points.join(' · ')}
                </p>
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

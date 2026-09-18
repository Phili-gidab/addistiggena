import type { Metadata } from 'next';
import Link from 'next/link';
import { API_URL, Category } from '../../lib/api';
import { catalogBySlug, iconFor, PACKAGES } from '../../lib/catalog';
import { DIAGNOSTIC, fmtPrice, fmtRange } from '../../lib/pricing';

export const metadata: Metadata = {
  title: 'Price list - Addis Tiggena',
  description:
    'Standard service price ranges (inspection + labor) in ETB for every repair on Addis Tiggena - fair, transparent reference rates for clients and technicians.',
};

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/catalog/categories`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as Category[];
  } catch {
    return [];
  }
}

export default async function PricingPage() {
  const categories = (await getCategories()).filter((c) => c.prices?.length);
  const lines = categories.reduce((n, c) => n + (c.prices?.length ?? 0), 0);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 880 }}>
        <span className="sec-no">Pricing · ግልፅ የዋጋ ተመን</span>
        <h1 className="page-title">Service price list</h1>
        <p className="page-sub" style={{ maxWidth: '64ch' }}>
          {lines} services across {categories.length} categories. All payments are made directly to
          technicians, and final charges depend on job complexity and required spare parts. These
          are <strong>standard price ranges</strong> (inspection + base labor) in Ethiopian Birr -
          a fair reference for both clients and technicians. Spare parts and materials are
          recommended to be purchased by the client.
        </p>

        {categories.length > 0 && (
          <nav className="price-jump" aria-label="Jump to a category">
            {categories.map((c) => (
              <a key={c.slug} href={`#${c.slug}`}>
                {iconFor(c.slug)} {c.nameEn}
              </a>
            ))}
          </nav>
        )}

        {categories.length === 0 && (
          <div className="panel">
            <p className="hint">
              The price list could not be loaded just now. Please refresh in a moment.
            </p>
          </div>
        )}

        {categories.map((c, ci) => (
          <div key={c.slug} id={c.slug} className="panel" style={{ marginBottom: '1.1rem' }}>
            <h2>
              {ci + 1}. {iconFor(c.slug)} {c.nameEn}
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
            {catalogBySlug(c.slug)?.scope && (
              <p className="hint" style={{ marginBottom: '0.6rem' }}>
                {catalogBySlug(c.slug)?.scope}
              </p>
            )}
            <div className="table-scroll">
              <table className="price-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Price range</th>
                  </tr>
                </thead>
                <tbody>
                  {c.prices!.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>
                        {p.nameEn}
                        <span className="am-cell">{p.nameAm}</span>
                      </td>
                      <td className="range">{fmtPrice(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href={`/services/${c.slug}`} className="see-all">
              Book {c.nameEn} →
            </Link>
          </div>
        ))}

        <div className="panel" style={{ marginBottom: '1.1rem' }}>
          <h2>Diagnostic &amp; call-out fee</h2>
          <p className="hint">
            <strong style={{ color: 'var(--navy)' }}>
              {DIAGNOSTIC.name} · {DIAGNOSTIC.nameAm}: {fmtRange(DIAGNOSTIC)}
            </strong>
            <br />
            Applicable only if the technician arrives and diagnoses the issue, but you choose not
            to proceed with the repair at that time.
          </p>
          <p className="hint" style={{ marginTop: '0.6rem' }}>
            Prices marked <strong style={{ color: 'var(--navy)' }}>/ m²</strong> are per square
            metre (በካሬ).
          </p>
        </div>

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

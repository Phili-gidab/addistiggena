import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { API_URL, Category } from '../../../lib/api';
import { catalogBySlug, iconFor } from '../../../lib/catalog';
import { tradeImg } from '../../../lib/images';
import { DIAGNOSTIC, fmtRange, rateGroupFor } from '../../../lib/pricing';

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/catalog/categories`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as Category[];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const cats = await getCategories();
  const c = cats.find((x) => x.slug === params.slug);
  if (!c) return { title: 'Service - Addis Tiggena' };
  return {
    title: `${c.nameEn} · ${c.nameAm} - Addis Tiggena`,
    description: `${catalogBySlug(c.slug)?.scope ?? c.nameEn} Verified technicians across all 11 sub-cities of Addis Ababa, standard published rates and a 5-day guarantee.`.trim(),
  };
}

/** Category page - browse what the trade covers and what it costs. Technicians
 *  are deliberately not listed: a customer meets one only after that technician
 *  accepts the job. Booking is an explicit click on ONE service. */
export default async function ServicePage({ params }: { params: { slug: string } }) {
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === params.slug);
  if (!category) notFound();

  const entry = catalogBySlug(category.slug);
  const services = [...(category.subServices ?? []), ...(entry?.services ?? [])].filter(
    (s, i, arr) => arr.indexOf(s) === i,
  );

  const rateGroup = rateGroupFor(category.slug);

  return (
    <main>
      {/* hero */}
      <section className="svc-hero">
        <span className="svc-hero-photo" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tradeImg(category.slug)} alt="" />
        </span>
        <div className="container svc-hero-body">
          <Link href="/#services" className="svc-back">
            ← All services
          </Link>
          <span className="svc-hero-ic" aria-hidden>
            {iconFor(category.slug)}
          </span>
          <h1>
            {category.nameEn}
            <span className="am">{category.nameAm}</span>
          </h1>
          {entry?.scope && <p className="svc-hero-lede">{entry.scope}</p>}
          <div className="svc-hero-cta">
            <Link href={services.length > 0 ? '#pick' : `/book?category=${category.id}`} className="btn btn-primary btn-lg">
              {services.length > 0 ? 'Choose a service · አገልግሎት ይምረጡ' : 'Book this service · ይዘዙ'}
            </Link>
            {category.priceFloorEtb && (
              <span className="svc-from">from ETB {category.priceFloorEtb}</span>
            )}
          </div>
        </div>
      </section>

      <div className="container svc-grid">
        <div>
          {/* what we fix */}
          {services.length > 0 && (
            <section className="panel mb" id="pick">
              <h2>What we fix · የምንሰራቸው ስራዎች</h2>
              <p className="hint" style={{ marginBottom: '0.7rem' }}>
                Pick the exact job you need - the booking is made for that service.
              </p>
              <ul className="svc-list pick">
                {services.map((s) => (
                  <li key={s}>
                    <Link href={`/book?category=${category.id}&service=${encodeURIComponent(s)}`}>
                      <span>{s}</span>
                      <span className="pick-cta">Book →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* published rates */}
          {rateGroup ? (
            <section className="panel mb">
              <h2>Standard rates · ግልፅ የዋጋ ተመን</h2>
              <div className="table-scroll">
                <table className="price-table">
                  <thead>
                    <tr>
                      <th>Service item</th>
                      <th>Description / scope</th>
                      <th>Price range</th>
                      <th aria-label="Book" />
                    </tr>
                  </thead>
                  <tbody>
                    {rateGroup.items.map((i) => (
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
                        <td className="range">
                          <Link
                            href={`/book?category=${category.id}&service=${encodeURIComponent(i.name)}`}
                            className="btn btn-primary btn-sm"
                          >
                            Book
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="hint">
                Payments go directly to the technician. Final charges depend on job complexity and
                spare parts.{' '}
                <Link href="/pricing" style={{ color: 'var(--blue)', fontWeight: 600 }}>
                  See the full price list →
                </Link>
              </p>
            </section>
          ) : (
            <section className="panel mb">
              <h2>Rates · የዋጋ ተመን</h2>
              <p className="hint">
                {category.priceFloorEtb ? (
                  <>
                    This service starts at <strong style={{ color: 'var(--navy)' }}>ETB {category.priceFloorEtb}</strong>;
                    the technician quotes the exact price on inspection.{' '}
                  </>
                ) : (
                  <>The technician quotes the exact price on inspection. </>
                )}
                If they arrive, diagnose the issue and you choose not to proceed, only the
                diagnostic fee of {fmtRange(DIAGNOSTIC)} applies.{' '}
                <Link href="/pricing" style={{ color: 'var(--blue)', fontWeight: 600 }}>
                  See the full price list →
                </Link>
              </p>
            </section>
          )}

        </div>

        {/* sticky booking rail */}
        <aside className="svc-rail">
          <div className="panel">
            <h2 style={{ fontSize: '1rem' }}>Ready when you are</h2>
            <p className="hint" style={{ marginBottom: '0.9rem' }}>
              Pin your location and the nearest verified {category.nameEn.toLowerCase()} technician
              is dispatched - average arrival 15-30 minutes, with a 5-day guarantee on every repair.
            </p>
            <Link
              href={services.length > 0 ? '#pick' : `/book?category=${category.id}`}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {services.length > 0 ? 'Choose a service →' : 'Book this service →'}
            </Link>
            <Link
              href="/#services"
              className="btn btn-line"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Browse other services
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

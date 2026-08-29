import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Stars } from '../../../components/Stars';
import { API_URL, Category } from '../../../lib/api';
import { catalogBySlug, iconFor } from '../../../lib/catalog';
import { tradeImg } from '../../../lib/images';
import { DIAGNOSTIC, fmtRange, rateGroupFor } from '../../../lib/pricing';

interface FeaturedProvider {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  jobsCompleted: number;
  isAvailable: boolean;
  subCity: string | null;
  yearsExperience: number | null;
  category: { id: string; slug: string };
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/catalog/categories`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as Category[];
  } catch {
    return [];
  }
}

async function getFeatured(): Promise<FeaturedProvider[]> {
  try {
    const res = await fetch(`${API_URL}/catalog/featured`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as FeaturedProvider[];
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
    description: `${catalogBySlug(c.slug)?.scope ?? c.nameEn} Verified technicians across all 11 sub-cities of Addis Ababa, standard published rates and a 5-day guarantee.`,
  };
}

/** Category page - browse what the trade covers, the rates and the verified
 *  technicians. Booking is an explicit click from here, never automatic. */
export default async function ServicePage({ params }: { params: { slug: string } }) {
  const [categories, featured] = await Promise.all([getCategories(), getFeatured()]);
  const category = categories.find((c) => c.slug === params.slug);
  if (!category) notFound();

  const entry = catalogBySlug(category.slug);
  const pros = featured.filter((p) => p.category.slug === category.slug);
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
            <Link href={`/book?category=${category.id}`} className="btn btn-primary btn-lg">
              Book this service · ይህን አገልግሎት ይዘዙ
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
            <section className="panel mb">
              <h2>What we fix · የምንሰራቸው ስራዎች</h2>
              <ul className="svc-list">
                {services.map((s) => (
                  <li key={s}>{s}</li>
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

          {/* technicians */}
          <section className="panel">
            <h2>Verified technicians · የተረጋገጡ ባለሙያዎች</h2>
            {pros.length === 0 ? (
              <p className="hint">
                No technician is featured in this trade yet - book anyway and the nearest available
                professional is dispatched to you.
              </p>
            ) : (
              <div className="svc-pros">
                {pros.map((p) => (
                  <div key={p.id} className="tech-card" style={{ cursor: 'default' }}>
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="avatar avatar-img" src={p.avatarUrl} alt="" />
                    ) : (
                      <span className="avatar">{(p.name ?? 'T').slice(0, 1)}</span>
                    )}
                    <span className="meta">
                      <span className="name">
                        {p.name ?? 'Technician'}
                        <span className="verified">✔ verified</span>
                      </span>
                      <span className="sub">
                        <Stars value={p.ratingAvg} small />{' '}
                        {p.ratingCount > 0 ? `${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : 'New'}{' '}
                        · {p.jobsCompleted} jobs
                        {p.subCity ? ` · ${p.subCity}` : ''}
                        {p.yearsExperience ? ` · ${p.yearsExperience}+ yrs` : ''}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
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
              href={`/book?category=${category.id}`}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Book this service →
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

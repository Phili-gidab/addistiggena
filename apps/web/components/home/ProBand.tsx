import Link from 'next/link';
import { Dict } from '../../lib/i18n';
import { PRO_IMG } from '../../lib/images';

/** "Become a technician" - merit-based onboarding, per the vetting protocol. */
export function ProBand({ t }: { t: Dict }) {
  const steps = [
    { n: '1', title: t.pro.v1t, sub: t.pro.v1 },
    { n: '2', title: t.pro.v2t, sub: t.pro.v2 },
    { n: '3', title: t.pro.v3t, sub: t.pro.v3 },
    { n: '4', title: t.pro.v4t, sub: t.pro.v4 },
    { n: '5', title: t.pro.v5t, sub: t.pro.v5 },
  ];
  return (
    <section className="section" id="pros">
      <div className="container">
        <div className="prob on-dark">
          <div className="prob-figure" aria-hidden>
            {/* Photo: Unsplash (free license) - carpenter at work */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PRO_IMG} alt="" loading="lazy" />
          </div>
          <div>
            <span className="sec-kicker" style={{ color: '#7db8e8' }}>
              {t.pro.kicker}
            </span>
            <h2>{t.pro.title}</h2>
            <p>{t.pro.lede}</p>
            <div className="prob-cta">
              <Link href="/provider" className="btn btn-primary">
                {t.pro.cta} →
              </Link>
              <Link href="/#trust" className="btn btn-ghost">
                {t.pro.cta2}
              </Link>
            </div>
          </div>
          <div className="prob-steps" aria-label={t.pro.vetting}>
            {steps.map((s) => (
              <div key={s.n} className="prob-step">
                <span className="n">{s.n}</span>
                <span>
                  {s.title}
                  <small>{s.sub}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

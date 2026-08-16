import Link from 'next/link';
import { PRO_IMG } from '../../lib/images';

const VETTING_STEPS = [
  { n: '1', t: 'Registration & documents', s: 'Fayda / Resident ID + Woreda recommendation letter' },
  { n: '2', t: 'Skill verification', s: 'Practical CoC assessment at a government center' },
  { n: '3', t: 'Security clearance', s: 'Police clearance + local guarantor reference' },
  { n: '4', t: 'Digital readiness', s: 'Smartphone with GPS + a working toolkit' },
  { n: '5', t: 'Orientation & activation', s: 'Ethics training, app tutorial - then you go live' },
];

/** "Become a technician" - merit-based onboarding, per the vetting protocol. */
export function ProBand() {
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
              For professionals · ለባለሙያዎች
            </span>
            <h2>
              Skill and trust over certification.
              <span className="am">ብቃትዎ ገቢዎ ይሁን - ዲግሪ አያስፈልግም።</span>
            </h2>
            <p>
              No BA, MA or TVET diploma required - whether you learned your craft in school or
              through years of hands-on work, proven skill, verified character, and a smartphone
              are all you need to join. Clients pay you directly; the platform brings you the jobs.
            </p>
            <div className="prob-cta">
              <Link href="/provider" className="btn btn-primary">
                Register as a technician →
              </Link>
              <Link href="/#trust" className="btn btn-ghost">
                How vetting works
              </Link>
            </div>
          </div>
          <div className="prob-steps" aria-label="Vetting pipeline">
            {VETTING_STEPS.map((s) => (
              <div key={s.n} className="prob-step">
                <span className="n">{s.n}</span>
                <span>
                  {s.t}
                  <small>{s.s}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

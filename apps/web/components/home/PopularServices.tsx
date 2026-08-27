import Link from 'next/link';
import { fmtRange, POPULAR } from '../../lib/pricing';

/** Popular repairs with the official standard price ranges - action-first. */
export function PopularServices() {
  return (
    <section className="section alt" id="popular">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">Popular right now</span>
            <h2 className="sec-title">
              Transparent standard rates
              <span className="am">ግልፅ የዋጋ ተመን</span>
            </h2>
          </div>
          <Link href="/pricing" className="see-all">
            Full price list →
          </Link>
        </div>
        <div className="svc-row">
          {POPULAR.map((s) => (
            <Link key={s.name} href="/book" className="svc-card">
              <span className="price-chip">{fmtRange(s)}</span>
              <h3>
                {s.name}
                <span className="am-name">{s.nameAm}</span>
              </h3>
              <p>
                {s.scope}
                <span className="am-scope">{s.scopeAm}</span>
              </p>
              <span className="book">Book this service · አገልግሎቱን ይዘዙ →</span>
            </Link>
          ))}
        </div>
        <p className="hint mt">
          Rates are base inspection + labor ranges set by the platform - you pay the technician
          directly, and spare parts are best purchased by you with the technician&rsquo;s
          specifications.
        </p>
      </div>
    </section>
  );
}

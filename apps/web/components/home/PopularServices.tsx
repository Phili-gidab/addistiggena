import Link from 'next/link';
import { fmtRange, POPULAR } from '../../lib/pricing';

/** Popular repairs with the official standard price ranges — action-first. */
export function PopularServices() {
  return (
    <section className="section alt" id="popular">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">Popular right now</span>
            <h2 className="sec-title">
              Transparent standard rates
              <span className="am">ግልጽ እና ደረጃቸውን የጠበቁ ዋጋዎች</span>
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
              <h3>{s.name}</h3>
              <p>{s.scope}</p>
              <span className="book">Book this service →</span>
            </Link>
          ))}
        </div>
        <p className="hint mt">
          Rates are base inspection + labor ranges set by the platform — you pay the technician
          directly, and spare parts are best purchased by you with the technician&rsquo;s
          specifications.
        </p>
      </div>
    </section>
  );
}

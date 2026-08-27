import { SUB_CITIES } from '../../lib/areas';

/** Geographic coverage - all 11 sub-cities with their neighbourhoods. */
export function Coverage() {
  return (
    <section className="section" id="coverage">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">Coverage · የአገልግሎት ሽፋን</span>
            <h2 className="sec-title">
              All 11 sub-cities of Addis Ababa
              <span className="am">በሁሉም 11 ክፍለ ከተሞች እንገኛለን</span>
            </h2>
          </div>
        </div>
        <p className="cov-note">
          Technicians are matched from your own surroundings - tap a sub-city to see the
          neighbourhoods we map for dispatch.
        </p>
        <div className="cov-grid">
          {SUB_CITIES.map((s) => (
            <details key={s.name} className="cov-card">
              <summary>
                <span className="names">
                  <b>{s.name}</b>
                  <span className="am">{s.nameAm}</span>
                </span>
                <span className="plus" aria-hidden>+</span>
              </summary>
              <ul>
                {s.neighborhoods.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

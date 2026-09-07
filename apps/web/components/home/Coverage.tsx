import { SUB_CITIES } from '../../lib/areas';
import { Dict } from '../../lib/i18n';

/** Geographic coverage - all 11 sub-cities with their neighbourhoods. */
export function Coverage({ t }: { t: Dict }) {
  return (
    <section className="section" id="coverage">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">{t.coverage.kicker}</span>
            <h2 className="sec-title">{t.coverage.title}</h2>
          </div>
        </div>
        <p className="cov-note">{t.coverage.note}</p>
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

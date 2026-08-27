import { TESTIMONIALS } from '../../lib/content';

/** Customer voices - from the official testimonies document. */
export function Testimonials() {
  return (
    <section className="section alt" id="testimonials">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">Customers feedback · የደንበኞች አስተያየት</span>
            <h2 className="sec-title">
              What do our customers say?
              <span className="am">ደንበኞቻችን ምን ይላሉ?</span>
            </h2>
          </div>
        </div>
        <div className="tst-row">
          {TESTIMONIALS.map((t) => (
            <article key={t.name} className="tst-card">
              <span className="stars-line" aria-label="5 star review">★★★★★</span>
              <h3>“{t.title}”</h3>
              <p>{t.text}</p>
              <footer>
                <span className="avatar">{t.name.slice(0, 1)}</span>
                <span>
                  <b>{t.name}</b>
                  <small>{t.role}</small>
                </span>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

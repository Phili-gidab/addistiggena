import { Dict, Lang, QUOTES } from '../../lib/i18n';

/** Customer voices - from the official testimonies document. */
export function Testimonials({ t, lang }: { t: Dict; lang: Lang }) {
  return (
    <section className="section alt" id="testimonials">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">{t.testimonials.kicker}</span>
            <h2 className="sec-title">{t.testimonials.title}</h2>
          </div>
        </div>
        <div className="tst-row">
          {QUOTES[lang].map((q) => (
            <article key={q.name} className="tst-card">
              <span className="stars-line" aria-label="5 star review">★★★★★</span>
              <h3>“{q.title}”</h3>
              <p>{q.text}</p>
              <footer>
                <span className="avatar">{q.name.slice(0, 1)}</span>
                <span>
                  <b>{q.name}</b>
                  <small>{q.role}</small>
                </span>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

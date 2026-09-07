import { Dict } from '../../lib/i18n';

/** Trust strip - the vetting pipeline, straight from the official protocol. */
export function Trust({ t }: { t: Dict }) {
  const cards = [
    { icon: '🏛️', title: t.trust.c1t, body: t.trust.c1 },
    { icon: '🛠️', title: t.trust.c2t, body: t.trust.c2 },
    { icon: '🪪', title: t.trust.c3t, body: t.trust.c3 },
    { icon: '🛡️', title: t.trust.c4t, body: t.trust.c4, hi: true },
  ];
  return (
    <section className="section alt" id="trust">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">{t.trust.kicker}</span>
            <h2 className="sec-title">{t.trust.title}</h2>
          </div>
          <p className="sec-lede">{t.trust.lede}</p>
        </div>
        <div className="trust-row">
          {cards.map((c) => (
            <div key={c.title} className={`trust-chip${c.hi ? ' hi' : ''}`}>
              <span className="dot" aria-hidden>{c.icon}</span>
              <span>
                <b>{c.title}</b>
                <small>{c.body}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

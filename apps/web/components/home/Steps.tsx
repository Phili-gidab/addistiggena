import { Dict } from '../../lib/i18n';

/** "How it works" - four clean numbered cards. */
export function Steps({ t }: { t: Dict }) {
  const steps = [
    { n: '1', title: t.steps.s1t, text: t.steps.s1 },
    { n: '2', title: t.steps.s2t, text: t.steps.s2 },
    { n: '3', title: t.steps.s3t, text: t.steps.s3 },
    { n: '4', title: t.steps.s4t, text: t.steps.s4 },
  ];
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">{t.steps.kicker}</span>
            <h2 className="sec-title">{t.steps.title}</h2>
          </div>
        </div>
        <div className="step-row">
          {steps.map((s) => (
            <article key={s.n} className="step-card">
              <div className="n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

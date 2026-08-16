const STEPS = [
  {
    n: '1',
    en: 'Choose a service',
    am: 'አገልግሎት ይምረጡ',
    text: 'Pick the repair you need - Mitad, wiring, plumbing, appliances, Wi-Fi and more - and describe the problem.',
  },
  {
    n: '2',
    en: 'Pin your location',
    am: 'ቦታዎን ያመልክቱ',
    text: 'Drop a pin, pick your sub-city and add a landmark note - built for Addis Ababa addresses.',
  },
  {
    n: '3',
    en: 'Technician dispatched',
    am: 'ባለሙያ ይላካል',
    text: 'The nearest verified technician in your surroundings accepts and heads over - average arrival 15–30 minutes.',
  },
  {
    n: '4',
    en: 'Pay the technician directly',
    am: 'በቀጥታ ይክፈሉ',
    text: 'Cash, Telebirr, CBE Birr or mobile banking - at the standard platform rate. Every repair carries a 5-day guarantee.',
  },
];

/** "How it works" - four clean numbered cards. */
export function Steps() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">How it works · እንዴት ይሰራል</span>
            <h2 className="sec-title">
              Four steps, one visit
              <span className="am">በአራት ቀላል ደረጃዎች</span>
            </h2>
          </div>
        </div>
        <div className="step-row">
          {STEPS.map((s) => (
            <article key={s.n} className="step-card">
              <div className="n">{s.n}</div>
              <h3>
                {s.en}
                <small>{s.am}</small>
              </h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

import { GUARANTEE_DAYS } from '../../lib/content';

const TRUST = [
  {
    icon: '🏛️',
    t: 'Woreda recommendation',
    tAm: 'የወረዳ የድጋፍ ደብዳቤ',
    s: 'Every technician presents an official clearance letter from their residential Woreda administration.',
    sAm: 'እያንዳንዱ ባለሙያ ከሚኖርበት ወረዳ አስተዳደር ይፋዊ የሥነ ምግባር ማረጋገጫ ደብዳቤ ያቀርባል',
  },
  {
    icon: '🛠️',
    t: 'Government CoC certified',
    tAm: 'በመንግስት CoC የተመሰከረለት',
    s: 'Practical skill validated at government Certificate of Competency assessment centers - per service line.',
    sAm: 'የተግባር ብቃት በመንግስት የሙያ ብቃት ማረጋገጫ (CoC) ማዕከላት በየአገልግሎት ዘርፉ ይረጋገጣል',
  },
  {
    icon: '🪪',
    t: 'Fayda ID verified',
    tAm: 'በፋይዳ መታወቂያ የተረጋገጠ',
    s: 'National Digital ID (Fayda) or Resident ID checked, plus police clearance and a local guarantor on file.',
    sAm: 'የፋይዳ ዲጂታል መታወቂያ ወይም የነዋሪነት መታወቂያ፣ የፖሊስ ማረጋገጫና የአካባቢ ዋስ ተመዝግቧል',
  },
  {
    icon: '🛡️',
    t: `The Tiggena Guarantee - ${GUARANTEE_DAYS} days`,
    tAm: `የጥገና ዋስትና - ${GUARANTEE_DAYS} ቀናት`,
    s: 'If the exact issue reoccurs within 5 days of completion, it is re-inspected and fixed at no additional service cost. If the technician is unresponsive, call us and it will be handled.',
    sAm: 'ችግሩ በ5 ቀናት ውስጥ እንደገና ከተከሰተ ያለ ተጨማሪ የአገልግሎት ክፍያ በድጋሚ ታይቶ ይስተካከላል',
    hi: true,
  },
];

/** Trust strip - the vetting pipeline, straight from the official protocol. */
export function Trust() {
  return (
    <section className="section alt" id="trust">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">Trust &amp; safety · እምነት እና ደህንነት</span>
            <h2 className="sec-title">
              Trust arrives before the technician does
              <span className="am">ባለሙያው ከመድረሱ በፊት እምነት ይደርሳል</span>
            </h2>
          </div>
          <p className="sec-lede">
            Skill and trust over certification - no degree required, but every professional passes
            a 5-step vetting pipeline before their profile goes live.
          </p>
        </div>
        <div className="trust-row">
          {TRUST.map((c) => (
            <div key={c.t} className={`trust-chip${'hi' in c && c.hi ? ' hi' : ''}`}>
              <span className="dot" aria-hidden>{c.icon}</span>
              <span>
                <b>{c.t}</b>
                <span className="am-t">{c.tAm}</span>
                <small>{c.s}</small>
                <span className="am-s">{c.sAm}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

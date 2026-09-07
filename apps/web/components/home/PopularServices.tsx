import Link from 'next/link';
import { Dict, Lang } from '../../lib/i18n';
import { fmtRange, POPULAR } from '../../lib/pricing';

/** Popular repairs with the official standard price ranges - action-first. */
export function PopularServices({ t, lang }: { t: Dict; lang: Lang }) {
  return (
    <section className="section alt" id="popular">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="sec-kicker">{t.popular.kicker}</span>
            <h2 className="sec-title">{t.popular.title}</h2>
          </div>
          <Link href="/pricing" className="see-all">
            {t.popular.seeAll} →
          </Link>
        </div>
        <div className="svc-row">
          {POPULAR.map((s) => (
            <Link key={s.name} href="/book" className="svc-card">
              <span className="price-chip">{fmtRange(s)}</span>
              <h3>{lang === 'am' ? s.nameAm : s.name}</h3>
              <p>{lang === 'am' ? s.scopeAm : s.scope}</p>
              <span className="book">{t.popular.book} →</span>
            </Link>
          ))}
        </div>
        <p className="hint mt">{t.popular.note}</p>
      </div>
    </section>
  );
}

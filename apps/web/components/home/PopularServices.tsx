import Link from 'next/link';
import type { Category } from '../../lib/api';
import { Dict, Lang } from '../../lib/i18n';
import { fmtPrice, popularFrom } from '../../lib/pricing';

/** Popular repairs at their published price - action-first. Prices come from
 *  the live price list, so this can never show a figure the list has dropped. */
export function PopularServices({
  t,
  lang,
  categories,
}: {
  t: Dict;
  lang: Lang;
  categories: Category[];
}) {
  const popular = popularFrom(categories);
  if (popular.length === 0) return null;

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
          {popular.map((s) => (
            <Link
              key={s.id}
              href={`/book?category=${s.category.id}&service=${encodeURIComponent(s.nameEn)}`}
              className="svc-card"
            >
              <span className="price-chip">{fmtPrice(s)}</span>
              <h3>{lang === 'am' ? s.nameAm : s.nameEn}</h3>
              <p>{lang === 'am' ? s.category.nameAm : s.category.nameEn}</p>
              <span className="book">{t.popular.book} →</span>
            </Link>
          ))}
        </div>
        <p className="hint mt">{t.popular.note}</p>
      </div>
    </section>
  );
}

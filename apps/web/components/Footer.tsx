import Image from 'next/image';
import Link from 'next/link';
import { COMPANY, HOURS, SLOGAN } from '../lib/content';
import { dict, Lang } from '../lib/i18n';

/** Site-wide footer - company facts from the official contact/license docs. */
export function Footer({ lang = 'en' }: { lang?: Lang }) {
  const t = dict(lang);
  return (
    <footer className="site-footer on-dark">
      <div className="container">
        <div className="footer-watermark" aria-hidden>
          አዲስ ጥገና
        </div>
        <div className="footer-grid">
          <div className="footer-brand">
            <Image src="/logo.png" alt="Addis Tiggena logo" width={52} height={52} />
            <div className="name">Addis Tiggena · አዲስ ጥገና</div>
            <div className="slogan">{SLOGAN}</div>
            <p>{t.footer.tagline}</p>
          </div>

          <div>
            <h4>{t.nav.services}</h4>
            <div className="footer-links">
              <Link href="/book">{t.hero.cta}</Link>
              <Link href="/#services">{t.services.title}</Link>
              <Link href="/pricing">{t.popular.seeAll}</Link>
              <Link href="/provider">{t.pro.cta}</Link>
              <Link href="/bookings">{t.nav.bookings}</Link>
            </div>
          </div>

          <div>
            <h4>{t.footer.company}</h4>
            <div className="footer-links">
              <Link href="/#story">{t.story.kicker}</Link>
              <Link href="/#coverage">{t.coverage.kicker}</Link>
              <Link href="/faq">{t.nav.faq}</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </div>

          <div>
            <h4>{t.footer.contact}</h4>
            <div className="footer-fact">
              <span className="ic">📍</span>
              <span>{COMPANY.address}</span>
            </div>
            <div className="footer-fact">
              <span className="ic">📞</span>
              <a href={`tel:${COMPANY.phone}`}>{COMPANY.phoneDisplay}</a>
            </div>
            <div className="footer-fact">
              <span className="ic">🕕</span>
              <span>{t.footer.hours}</span>
            </div>
            <div className="footer-fact">
              <span className="ic">🌐</span>
              <span>Social media - coming soon</span>
            </div>
          </div>
        </div>

        <div className="footer-legal">
          <span>
            © {new Date().getFullYear()} {COMPANY.operator} - Addis Tiggena project.{' '}
            {t.footer.rights}
          </span>
          <span>Business License No. {COMPANY.licenseNo}</span>
        </div>
      </div>
    </footer>
  );
}

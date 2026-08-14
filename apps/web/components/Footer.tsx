import Image from 'next/image';
import Link from 'next/link';
import { COMPANY, HOURS, SLOGAN } from '../lib/content';

/** Site-wide footer — company facts from the official contact/license docs. */
export function Footer() {
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
            <p>
              A technology-driven maintenance marketplace connecting verified field technicians
              with homes and businesses across Addis Ababa — a project of {COMPANY.operator}.
            </p>
          </div>

          <div>
            <h4>Platform</h4>
            <div className="footer-links">
              <Link href="/book">Book a service</Link>
              <Link href="/#services">Service categories</Link>
              <Link href="/pricing">Price list</Link>
              <Link href="/provider">Become a technician</Link>
              <Link href="/bookings">My bookings</Link>
            </div>
          </div>

          <div>
            <h4>Company</h4>
            <div className="footer-links">
              <Link href="/#story">Our story</Link>
              <Link href="/#coverage">Coverage areas</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </div>

          <div>
            <h4>Contact</h4>
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
              <span>{HOURS.display}</span>
            </div>
            <div className="footer-fact">
              <span className="ic">🌐</span>
              <span>Social media — coming soon</span>
            </div>
          </div>
        </div>

        <div className="footer-legal">
          <span>
            © {new Date().getFullYear()} {COMPANY.operator} — Addis Tiggena project. All rights
            reserved.
          </span>
          <span>Business License No. {COMPANY.licenseNo}</span>
        </div>
      </div>
    </footer>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { clearSession, getUser, isStaff, User } from '../lib/api';
import { dict, Lang } from '../lib/i18n';
import { lockScroll } from '../lib/motion';
import { LangToggle } from './LangToggle';

const LINKS: { href: string; key: 'services' | 'pricing' | 'faq' | 'bookings' | 'provider' }[] = [
  { href: '/#services', key: 'services' },
  { href: '/pricing', key: 'pricing' },
  { href: '/faq', key: 'faq' },
  { href: '/bookings', key: 'bookings' },
  { href: '/provider', key: 'provider' },
];

/** Staff accounts work in the console - customer/technician links are noise for them. */
const STAFF_HIDDEN = ['/bookings', '/provider'];

export function Header({ lang = 'en' }: { lang?: Lang }) {
  const t = dict(lang).nav;
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const links = isStaff(user?.role) ? LINKS.filter((l) => !STAFF_HIDDEN.includes(l.href)) : LINKS;

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener('tg-auth', sync);
    return () => window.removeEventListener('tg-auth', sync);
  }, []);

  // hide on scroll down, return on scroll up; add shadow once past the fold
  useEffect(() => {
    const el = headerRef.current!;
    let last = 0;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        el.classList.toggle('scrolled', y > 30);
        el.classList.toggle('tucked', y > 160 && y > last);
        last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // mobile menu open/close + close on navigation & Escape
  useEffect(() => {
    lockScroll(open);
    return () => lockScroll(false);
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className="site-header" ref={headerRef}>
        <div className="container">
          <Link href="/" className="wordmark">
            <Image src="/logo.png" alt="Addis Tiggena logo" width={40} height={40} priority />
            <span>
              <span className="name">
                Addis <span className="b">Tiggena</span>
              </span>
              <span className="tag">Connect · Fix · Care</span>
            </span>
          </Link>
          <nav className="nav">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`hide-sm nav-link${pathname === l.href ? ' active' : ''}`}
              >
                {t[l.key]}
              </Link>
            ))}
            {isStaff(user?.role) && (
              <Link href="/admin" className="hide-sm nav-link">
                {t.admin}
              </Link>
            )}
            {user ? (
              <button className="btn btn-ghost btn-sm hide-sm" onClick={() => clearSession()}>
                {user.name ?? user.phone.replace('+251', '0')} · {t.signOut}
              </button>
            ) : (
              <Link href="/login" className="btn btn-ghost btn-sm hide-sm">
                {t.signIn}
              </Link>
            )}
            <LangToggle lang={lang} />
            <Link href="/book" className="btn btn-primary btn-sm">
              {t.book}
            </Link>
            <button
              className={`burger${open ? ' active' : ''}`}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <i />
              <i />
            </button>
          </nav>
        </div>
      </header>

      {/* ── full-screen mobile navigation ─────────────────────────────────── */}
      <div className={`mnav${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="mnav-inner container">
          <div className="mnav-links">
            {links.map((l, i) => (
              <Link key={l.href} href={l.href} className="mnav-link" onClick={() => setOpen(false)}>
                <span className="idx">0{i + 1}</span>
                <span className="en">{t[l.key]}</span>
              </Link>
            ))}
            {isStaff(user?.role) && (
              <Link href="/admin" className="mnav-link" onClick={() => setOpen(false)}>
                <span className="idx">0{links.length + 1}</span>
                <span className="en">{t.admin}</span>
              </Link>
            )}
          </div>
          <div className="mnav-foot">
            {user ? (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  clearSession();
                  setOpen(false);
                }}
              >
                {user.name ?? user.phone.replace('+251', '0')} · {t.signOut}
              </button>
            ) : (
              <Link href="/login" className="btn btn-primary" onClick={() => setOpen(false)}>
                {t.signIn}
              </Link>
            )}
            <LangToggle lang={lang} />
            <span className="mnav-tag">{t.city}</span>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { clearSession, getUser, isStaff, User } from '../lib/api';
import { lockScroll } from '../lib/motion';

const LINKS = [
  { href: '/#services', am: 'አገልግሎቶች', en: 'Services' },
  { href: '/pricing', am: 'ዋጋዎች', en: 'Pricing' },
  { href: '/faq', am: 'ጥያቄዎች', en: 'FAQ' },
  { href: '/bookings', am: 'ማስያዣዎቼ', en: 'My bookings' },
  { href: '/provider', am: 'ለባለሙያዎች', en: 'For technicians' },
];

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

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
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`hide-sm nav-link${pathname === l.href ? ' active' : ''}`}
              >
                {l.en}
              </Link>
            ))}
            {isStaff(user?.role) && (
              <Link href="/admin" className="hide-sm nav-link">
                Admin
              </Link>
            )}
            {user ? (
              <button className="btn btn-ghost btn-sm hide-sm" onClick={() => clearSession()}>
                {user.name ?? user.phone.replace('+251', '0')} · Sign out
              </button>
            ) : (
              <Link href="/login" className="btn btn-ghost btn-sm hide-sm">
                Sign in
              </Link>
            )}
            <Link href="/book" className="btn btn-primary btn-sm">
              Book now
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
            {LINKS.map((l, i) => (
              <Link key={l.href} href={l.href} className="mnav-link" onClick={() => setOpen(false)}>
                <span className="idx">0{i + 1}</span>
                <span className="am">{l.am}</span>
                <span className="en">{l.en}</span>
              </Link>
            ))}
            {isStaff(user?.role) && (
              <Link href="/admin" className="mnav-link" onClick={() => setOpen(false)}>
                <span className="idx">0{LINKS.length + 1}</span>
                <span className="am">አስተዳደር</span>
                <span className="en">Admin</span>
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
                {user.name ?? user.phone.replace('+251', '0')} · Sign out
              </button>
            ) : (
              <Link href="/login" className="btn btn-primary" onClick={() => setOpen(false)}>
                ይግቡ · Sign in
              </Link>
            )}
            <span className="mnav-tag">Addis Ababa · አዲስ አበባ</span>
          </div>
        </div>
      </div>
    </>
  );
}

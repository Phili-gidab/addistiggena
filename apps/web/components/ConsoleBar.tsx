'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearSession, getUser } from '../lib/api';

/**
 * Top bar for the staff console and the technician workspace. Those screens
 * hide the marketing header and footer, so this is what carries the brand,
 * who is signed in, and the way out.
 */
export function ConsoleBar({
  subtitle,
  unread,
  onBell,
}: {
  subtitle: string;
  /** how many feed items the operator has not opened - omitted on /provider */
  unread?: number;
  onBell?: () => void;
}) {
  const router = useRouter();
  const me = getUser();

  return (
    <header className="console-bar">
      <Link href="/" className="console-brand">
        <span className="mark">AT</span>
        <span className="words">
          Addis Tiggena<b>{subtitle}</b>
        </span>
      </Link>
      <div className="console-bar-end">
        {onBell && (
          <button
            type="button"
            className="bell"
            aria-label={unread ? `${unread} new notifications` : 'Notifications'}
            title="What has happened"
            onClick={onBell}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5Z" />
              <path d="M10.3 20a2 2 0 0 0 3.4 0" />
            </svg>
            {!!unread && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
          </button>
        )}
        <span className="who">
          {me?.name ?? me?.phone?.replace('+251', '0')}
          <small>{me?.role ? me.role.replace(/_/g, ' ').toLowerCase() : ''}</small>
        </span>
        <button
          className="btn btn-line btn-sm"
          onClick={() => {
            clearSession();
            router.replace('/login');
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

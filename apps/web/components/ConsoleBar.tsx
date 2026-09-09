'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearSession, getUser } from '../lib/api';

/**
 * Top bar for the staff console and the technician workspace. Those screens
 * hide the marketing header and footer, so this is what carries the brand,
 * who is signed in, and the way out.
 */
export function ConsoleBar({ subtitle }: { subtitle: string }) {
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

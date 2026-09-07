'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Lang, LANG_COOKIE } from '../lib/i18n';

/**
 * EN / አማ switch. The choice is a cookie so the server renders the right
 * language on the next paint - no flash of the wrong copy, and a shared link
 * opens in the reader's own last choice.
 */
export function LangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = (next: Lang) => {
    if (next === lang) return;
    // one year, site-wide
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };

  return (
    <div className="lang-toggle" role="group" aria-label="Language / ቋንቋ" data-pending={pending}>
      <button
        type="button"
        className={lang === 'en' ? 'on' : ''}
        aria-pressed={lang === 'en'}
        onClick={() => set('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={lang === 'am' ? 'on' : ''}
        aria-pressed={lang === 'am'}
        onClick={() => set('am')}
        style={{ fontFamily: 'var(--font-am)' }}
      >
        አማ
      </button>
    </div>
  );
}

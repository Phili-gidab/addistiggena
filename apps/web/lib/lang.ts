import { cookies } from 'next/headers';
import { isLang, Lang, LANG_COOKIE } from './i18n';

/**
 * The reader's language, from the cookie the header toggle writes. Server-only
 * (next/headers) - keep it out of lib/i18n.ts, which client components import.
 */
export function currentLang(): Lang {
  const v = cookies().get(LANG_COOKIE)?.value;
  return isLang(v) ? v : 'en';
}

'use client';

import { usePathname } from 'next/navigation';

/** Routes that are a staff/technician workspace rather than the public site. */
const CONSOLE_ROUTES = ['/admin', '/provider'];

/**
 * The marketing header and footer belong to the public site. On the staff
 * console and the technician workspace they are noise - a "Book now" call to
 * action and a five-column sitemap under a dispatch board - and they push the
 * actual work down the page. Those screens carry their own top bar instead.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '';
  const isConsole = CONSOLE_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));
  return isConsole ? null : <>{children}</>;
}

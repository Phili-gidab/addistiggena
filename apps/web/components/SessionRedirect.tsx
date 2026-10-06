'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getMode, getUser, isStaff } from '../lib/api';

/**
 * Staff who are already signed in have no use for the marketing homepage -
 * send them to the workspace they came to use. Customers are left alone: the
 * homepage is where they browse services and start a booking, so bouncing them
 * off it would break the funnel.
 *
 * A technician is only bounced while they are on their own side. Registering as
 * a technician sets the account's role to PROVIDER for good, so reading the
 * role alone meant a technician could never browse or book a repair for their
 * own home again - the site threw them back to the job board every time.
 *
 * The session lives in localStorage, so this can only run in the browser. The
 * page itself stays a server component and renders normally for everyone else.
 */
export function SessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    if (!user) return;
    if (isStaff(user.role)) router.replace('/admin');
    else if (user.role === 'PROVIDER' && getMode() === 'technician') router.replace('/provider');
  }, [router]);

  return null;
}

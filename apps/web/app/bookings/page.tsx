'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { api, Booking, fmtDate, getToken } from '../../lib/api';

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/bookings');
      return;
    }
    api<Booking[]>('/bookings/mine')
      .then(setBookings)
      .catch((e) => setError((e as Error).message));
  }, [router]);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="spread mb">
          <div>
            <h1 className="page-title">ማስያዣዎቼ · My bookings</h1>
            <p className="page-sub" style={{ marginBottom: 0 }}>
              Every job, live status, receipts and reviews.
            </p>
          </div>
          <Link href="/book" className="btn btn-primary btn-sm">
            + New booking
          </Link>
        </div>

        {error && <div className="error-box">{error}</div>}
        {!bookings && !error && <div className="skeleton" style={{ height: 220 }} />}

        {bookings?.length === 0 && (
          <div className="panel" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '1.2rem', color: 'var(--muted)' }}>
              No bookings yet — your first fix is a minute away.
            </p>
            <Link href="/book" className="btn btn-primary">
              Book a service
            </Link>
          </div>
        )}

        {bookings?.map((b) => (
          <Link key={b.id} href={`/bookings/${b.id}`} className="booking-row">
            <span>
              <span className="what">
                {b.category.nameAm} · {b.category.nameEn}
              </span>
              <span className="when" style={{ display: 'block' }}>
                {fmtDate(b.createdAt)}
                {b.provider?.user?.name ? ` — ${b.provider.user.name}` : ''}
                {b.finalPriceEtb ? ` — ${b.finalPriceEtb} ETB` : ''}
              </span>
            </span>
            <StatusBadge status={b.status} />
          </Link>
        ))}
      </div>
    </main>
  );
}

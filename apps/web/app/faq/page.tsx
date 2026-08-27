import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQ_GROUPS } from '../../lib/faq';

export const metadata: Metadata = {
  title: 'FAQ - Addis Tiggena',
  description:
    'Frequently asked questions about booking, payments, cancellations, guarantees and technician safety on Addis Tiggena.',
};

export default function FaqPage() {
  return (
    <main className="page">
      <div className="container doc-page">
        <span className="sec-no">Help · እገዛ</span>
        <h1 className="page-title">Frequently Asked Questions</h1>
        <p className="page-sub">
          Everything about bookings, pricing, cancellations and our quality guarantees.
        </p>

        {FAQ_GROUPS.map((g, gi) => (
          <div key={g.title} className="faq-group">
            <h2>
              {gi + 1}. {g.title}
            </h2>
            {g.items.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>
                  {item.q}
                  <span className="plus" aria-hidden>+</span>
                </summary>
                <div className="a">{item.a}</div>
              </details>
            ))}
          </div>
        ))}

        <div className="panel mt" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
            Still have a question? We are open 6:00 AM - 8:00 PM, every day.
          </p>
          <Link href="/book" className="btn btn-primary">
            Book a service
          </Link>
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import { COMPANY } from '../../lib/content';

export const metadata: Metadata = {
  title: 'Terms of Service — Addis Tiggena',
  description: 'Terms of Service for the Addis Tiggena platform, operated by Amnen Marketing & Promotion.',
};

export default function TermsPage() {
  return (
    <main className="page">
      <div className="container doc-page">
        <span className="sec-no">Legal</span>
        <h1 className="page-title">Terms of Service</h1>
        <p className="updated">Operated by {COMPANY.operator} · Business License No. {COMPANY.licenseNo}</p>

        <p>
          Welcome to Addis Tiggena, a digital marketplace platform operated as a project under
          Amnen Marketing &amp; Promotion (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;). By downloading, registering, accessing, or using the Addis Tiggena
          application or services (collectively, the &ldquo;Platform&rdquo;), you (&ldquo;User,&rdquo;
          &ldquo;Client,&rdquo; or &ldquo;Technician&rdquo;) agree to be bound by these Terms of
          Service (&ldquo;Terms&rdquo;).
        </p>

        <h2>1. Platform Role &amp; Scope of Services</h2>
        <p>
          <strong>1.1. Marketplace Connectivity:</strong> Addis Tiggena acts as a digital
          intermediary connecting independent, background-checked field technicians
          (&ldquo;Technicians&rdquo;) with clients seeking repair, maintenance, and technical
          services (&ldquo;Clients&rdquo;).
        </p>
        <p>
          <strong>1.2. Independent Service Providers:</strong> Technicians listed on the Platform
          operate as independent contractors, not direct employees or legal agents of Amnen
          Marketing &amp; Promotion.
        </p>

        <h2>2. User Registration &amp; Eligibility</h2>
        <p>
          <strong>2.1. Account Creation:</strong> Users must register an account with accurate
          details, including a valid phone number and full name.
        </p>
        <p>
          <strong>2.2. Technician Verification Prerequisite:</strong> To be listed as an active
          service provider, Technicians must successfully pass our verification process, including
          providing:
        </p>
        <ul>
          <li>An official recommendation/clearance letter from their local Woreda administration.</li>
          <li>Government Certificate of Competency (CoC) practical assessment pass.</li>
          <li>National Digital ID (Fayda) or valid Resident ID.</li>
          <li>Possession of a functional smartphone and standard trade toolkit.</li>
        </ul>

        <h2>3. Bookings, Pricing &amp; Payment</h2>
        <p>
          <strong>3.1. Service Estimates:</strong> Base service rates displayed on the Platform are
          estimates. Final costs may have a small variance depending on on-site inspection,
          complexity, and necessary spare parts.
        </p>
        <p>
          <strong>3.2. Spare Parts &amp; Materials:</strong> The cost of replacement parts is
          separate from service fees. Clients shall purchase parts independently by themselves or
          authorize the Technician to buy them upon presenting a verified receipt.
        </p>
        <p>
          <strong>3.3. Payment Methods:</strong> Payments may be settled directly via approved
          mobile money integration or cash paid directly to the Technician upon job completion.
        </p>

        <h2>4. Cancellation &amp; Reassignment</h2>
        <p>
          <strong>4.1. Free Cancellation:</strong> Clients may cancel a service request free of
          charge before the Technician accepts or begins traveling.
        </p>
        <p>
          <strong>4.2. Late Cancellation Fee:</strong> Cancellations made after a Technician has
          dispatched and is en route may incur a nominal fee to cover travel costs.
        </p>
        <p>
          <strong>4.3. Dispatch Reassignment:</strong> If an assigned Technician becomes
          unavailable, the Platform reserves the right to automatically reassign the task to the
          nearest available verified provider.
        </p>

        <h2>5. Service Guarantees &amp; Quality Control</h2>
        <p>
          <strong>5.1. 5-Day Limited Service Guarantee:</strong> Addis Tiggena offers a 5-day
          guarantee on labor for completed repairs. If the exact same issue reoccurs within 5
          calendar days due to faulty workmanship, an inspection and corrective repair will be
          conducted at no additional labor cost.
        </p>
        <p>
          <strong>5.2. Exclusion:</strong> The guarantee does not cover new damages caused by
          client misuse, power surges, external accidents, or third-party tampering post-repair.
        </p>

        <h2>6. User Conduct &amp; Workplace Safety</h2>
        <p>
          <strong>6.1. Safe Environment:</strong> Clients must provide a safe and reasonable work
          environment for Technicians performing services on their premises.
        </p>
        <p>
          <strong>6.2. Professional Conduct:</strong> Zero tolerance is maintained for harassment,
          fraud, property damage, or unlawful behavior by either party. Violation will result in
          immediate permanent suspension from the Platform and reporting to law enforcement
          authorities.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable Ethiopian laws, Amnen Marketing &amp;
          Promotion and Addis Tiggena shall not be held liable for indirect, incidental, or
          consequential damages resulting from platform downtime, service interruptions, or
          disputes between Clients and Technicians outside the scope of our verified vetting and
          5-day guarantee frameworks.
        </p>

        <h2>8. Account Termination</h2>
        <p>
          We reserve the right to suspend or deactivate any account (Client or Technician)
          immediately if these Terms are violated or if fraudulent activities are detected.
        </p>

        <h2>9. Updates to Terms</h2>
        <p>
          We may revise these Terms from time to time. Continued use of the Addis Tiggena
          application after updates are posted constitutes acceptance of the modified Terms.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          For support, feedback, or dispute resolution: {COMPANY.operator} (Addis Tiggena
          Project), {COMPANY.address} · Phone: {COMPANY.phoneDisplay}.
        </p>
      </div>
    </main>
  );
}

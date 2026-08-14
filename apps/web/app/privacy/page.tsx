import type { Metadata } from 'next';
import { COMPANY } from '../../lib/content';

export const metadata: Metadata = {
  title: 'Privacy Policy — Addis Tiggena',
  description: 'How Addis Tiggena collects, uses, stores and protects the personal data of clients and technicians.',
};

export default function PrivacyPage() {
  return (
    <main className="page">
      <div className="container doc-page">
        <span className="sec-no">Legal</span>
        <h1 className="page-title">Privacy Policy</h1>
        <p className="updated">Operated by {COMPANY.operator} · Addis Ababa, Ethiopia</p>

        <p>
          At Addis Tiggena (a project under Amnen Marketing &amp; Promotion), we respect your
          privacy and are committed to protecting the personal data of both our Clients and
          Technicians. This Privacy Policy explains how we collect, use, store, and safeguard your
          information when you use our application and services.
        </p>

        <h2>1. Information We Collect</h2>
        <p>
          <strong>1.1. Personal Identification Data:</strong>
        </p>
        <ul>
          <li>
            <strong>For Clients:</strong> full name, phone number, physical address / service
            location, and profile picture (optional).
          </li>
          <li>
            <strong>For Technicians:</strong> full name, phone number, residential address, Woreda
            recommendation letters, government CoC assessment credentials, National Digital ID
            (Fayda) / Resident ID, trade specializations, and profile photograph.
          </li>
        </ul>
        <p>
          <strong>1.2. Location Data (Precise &amp; Approximate GPS):</strong> we collect real-time
          location data when the app is running (foreground or background) to enable precise
          dispatching, map routing, estimated arrival times, and seamless connection between
          nearby Technicians and Clients.
        </p>
        <p>
          <strong>1.3. Service &amp; Transaction Information:</strong> details of booked service
          requests, job history, service ratings, reviews, and transaction records.
        </p>
        <p>
          <strong>1.4. Device &amp; Usage Technical Data:</strong> device model, operating system
          version, unique device identifiers, IP address, and app activity logs for system
          maintenance and fraud prevention.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>
            <strong>Connecting Clients and Technicians:</strong> matching service requests with the
            nearest available qualified technician across sub-cities.
          </li>
          <li>
            <strong>Identity &amp; Safety Verification:</strong> reviewing Woreda clearance
            letters, CoC passes, and Fayda ID records during technician onboarding to ensure
            community safety.
          </li>
          <li>
            <strong>In-App Communication &amp; Routing:</strong> allowing Technicians to navigate
            to job sites using map integration and enabling direct contact regarding job status.
          </li>
          <li>
            <strong>Service Duration &amp; Transaction Monitoring:</strong> since payments are made
            directly to technicians, Addis Tiggena does not process or handle direct customer
            funds. We record basic service logs — the duration of time a technician spends at a
            client&rsquo;s location and the final amount collected based on platform rate
            guidelines — strictly for quality control, record keeping, rate compliance, and
            service tracking under our guarantee policy.
          </li>
          <li>
            <strong>Customer Support &amp; Dispute Resolution:</strong> addressing user inquiries,
            investigating service quality issues under our 5-Day Guarantee, and refining platform
            performance.
          </li>
        </ul>

        <h2>3. Information Sharing &amp; Disclosure</h2>
        <p>We value your trust and do not sell or rent your personal information to third parties. Information is shared only under the following strictly defined conditions:</p>
        <ul>
          <li>
            <strong>Between Clients and Matched Technicians:</strong> when a booking is confirmed,
            necessary details (e.g., client name, location address, phone number, and repair
            details) are shared with the assigned Technician to complete the job.
          </li>
          <li>
            <strong>Service Providers &amp; Integration Partners:</strong> third-party tech
            infrastructure partners (such as SMS gateway providers, map routing APIs, and mobile
            payment gateways) process data solely to execute app operations.
          </li>
          <li>
            <strong>Legal Compliance &amp; Security:</strong> we may disclose information if
            required by applicable Ethiopian laws, judicial proceedings, or to protect the safety,
            rights, and property of our users, staff, or the public.
          </li>
        </ul>

        <h2>4. Data Retention &amp; Security Measures</h2>
        <p>
          <strong>Robust Security:</strong> we implement administrative, technical, and physical
          security safeguards (including encrypted data transfer protocols) to protect your
          personal information against unauthorized access, loss, or alteration.
        </p>
        <p>
          <strong>Data Retention:</strong> we retain personal information for as long as your
          account remains active or as needed to comply with legal, regulatory, or operational
          obligations. Official background documents (Woreda clearance and ID records) are stored
          securely in compliance with administrative verification standards.
        </p>

        <h2>5. User Rights &amp; Data Control</h2>
        <ul>
          <li>
            <strong>Access &amp; Update:</strong> view and edit your personal profile information
            directly within the application settings.
          </li>
          <li>
            <strong>Location Permissions:</strong> enable or disable GPS location tracking via your
            smartphone&rsquo;s system settings (note that disabling location services may limit
            functionality during live bookings).
          </li>
          <li>
            <strong>Account Deactivation:</strong> request account deactivation or data deletion by
            contacting our support team.
          </li>
        </ul>

        <h2>6. Children&rsquo;s Privacy</h2>
        <p>
          The Platform is intended for use solely by individuals aged 18 and older. We do not
          knowingly collect or maintain personal information from individuals under the age of 18.
        </p>

        <h2>7. Policy Updates</h2>
        <p>
          We may update this Privacy Policy periodically to reflect changes in platform features,
          technology, or legal requirements. Updated policies will be published with an updated
          &ldquo;Last Updated&rdquo; date.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          {COMPANY.operator} (Addis Tiggena Project) · {COMPANY.address} · Phone:{' '}
          {COMPANY.phoneDisplay}.
        </p>
      </div>
    </main>
  );
}

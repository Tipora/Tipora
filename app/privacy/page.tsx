import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Tipora',
  description: 'How Tipora handles your personal data.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: April 2026</p>

      <div className="mt-8 space-y-6 text-zinc-400 leading-relaxed">
        <h2 className="text-xl font-semibold text-white">1. Data We Collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Account data:</strong> email address, hashed password (via Supabase Auth)</li>
          <li><strong>Payment data:</strong> processed by Stripe — we never see or store card details</li>
          <li><strong>Usage data:</strong> pages visited, features used (anonymous analytics)</li>
        </ul>

        <h2 className="text-xl font-semibold text-white">2. How We Use Your Data</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>To provide and maintain the Service</li>
          <li>To process subscription payments</li>
          <li>To send tip digests and settlement summaries (if opted in)</li>
          <li>To improve our algorithms and user experience</li>
        </ul>

        <h2 className="text-xl font-semibold text-white">3. Data Sharing</h2>
        <p>
          We do not sell your personal data. We share data only with:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Supabase:</strong> database and authentication</li>
          <li><strong>Stripe:</strong> payment processing</li>
          <li><strong>Resend:</strong> transactional emails</li>
          <li><strong>Vercel:</strong> hosting and analytics</li>
        </ul>

        <h2 className="text-xl font-semibold text-white">4. Data Retention</h2>
        <p>
          Account data is retained while your account is active. You may request deletion at any
          time by contacting us. Payment records are retained as required by law.
        </p>

        <h2 className="text-xl font-semibold text-white">5. Your Rights</h2>
        <p>
          Under GDPR, you have the right to access, correct, delete or export your personal data.
          Contact us at privacy@tipora.bet to exercise these rights.
        </p>

        <h2 className="text-xl font-semibold text-white">6. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. We do not use
          third-party advertising cookies.
        </p>
      </div>
    </div>
  );
}

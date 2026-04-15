import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Responsible Gambling — Tipora',
  description: 'Tipora promotes responsible gambling. Get help and support.',
};

export default function ResponsibleGamblingPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-3xl font-bold text-white">Responsible Gambling</h1>

      <div className="mt-8 space-y-6 text-zinc-400 leading-relaxed">
        <p>
          Gambling should be entertaining, not a source of stress. If you choose to bet based on
          our tips, please do so responsibly and within your means.
        </p>

        <h2 className="text-xl font-semibold text-white">Our Principles</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>We never guarantee wins — no tipping service can.</li>
          <li>We publish full P&L including all losses for complete transparency.</li>
          <li>We encourage flat staking (£10/tip) to manage risk.</li>
          <li>We do not target vulnerable individuals or minors.</li>
          <li>Our content is for users aged 18 and over only.</li>
        </ul>

        <h2 className="text-xl font-semibold text-white">Set Your Limits</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Only bet what you can afford to lose.</li>
          <li>Set a daily, weekly or monthly budget and stick to it.</li>
          <li>Never chase losses.</li>
          <li>Take breaks — gambling should not feel like an obligation.</li>
          <li>Use deposit limits and self-exclusion tools offered by your bookmaker.</li>
        </ul>

        <h2 className="text-xl font-semibold text-white">Get Help</h2>
        <p>If you or someone you know is struggling with gambling, these organisations can help:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>GamCare</strong> — <Link href="https://www.gamcare.org.uk" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">gamcare.org.uk</Link> — 0808 8020 133</li>
          <li><strong>BeGambleAware</strong> — <Link href="https://www.begambleaware.org" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">begambleaware.org</Link></li>
          <li><strong>Gambling Therapy</strong> — <Link href="https://www.gamblingtherapy.org" className="text-emerald-400 hover:underline" target="_blank" rel="noopener noreferrer">gamblingtherapy.org</Link></li>
          <li><strong>National Gambling Helpline</strong> — 0808 8020 133 (free, 24/7)</li>
        </ul>
      </div>
    </div>
  );
}

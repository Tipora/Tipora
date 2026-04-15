import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Tipora',
  description: 'Free and Pro plans for Tipora football tips.',
};

const PLANS = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    features: [
      'Top 3 tips daily',
      'Game Acca',
      "Today's P&L only",
      'Basic tip reasons',
    ],
    cta: 'Get Started',
    href: '/tips',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '£9.99',
    period: '/month',
    features: [
      'All 10 tips daily',
      'Game Acca + Weekend Acca',
      'Full P&L history',
      'Confidence breakdowns',
      'Email alerts',
      'Priority support',
    ],
    cta: 'Subscribe',
    href: '/api/stripe/checkout',
    highlighted: true,
  },
];

export default function PricingPage() {
  return (
    <div className="py-12 text-center">
      <h1 className="text-3xl font-bold text-white">Simple Pricing</h1>
      <p className="mt-2 text-zinc-400">Start free. Upgrade when you want the full edge.</p>

      <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-6 text-left ${
              plan.highlighted
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-800 bg-zinc-900/50'
            }`}
          >
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-sm text-zinc-500">{plan.period}</span>
            </div>

            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-zinc-400">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`mt-8 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                plan.highlighted
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                  : 'border border-zinc-700 text-white hover:border-zinc-500'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

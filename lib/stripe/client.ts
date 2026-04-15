import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    });
  }
  return _stripe;
}

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: [
      'Top 3 tips daily',
      'Game Acca',
      "Today's P&L",
    ],
  },
  PRO: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? '',
    price: 9.99,
    features: [
      'All 10 tips daily',
      'Game Acca + Weekend Acca',
      'Full P&L history (day/week/month/season/all-time)',
      'Confidence score breakdowns',
      'Email alerts',
    ],
  },
} as const;

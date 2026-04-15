import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ — Tipora',
  description: 'Frequently asked questions about Tipora football tips.',
};

const FAQS = [
  {
    q: 'How are tips generated?',
    a: 'Our system analyses player trends, team form, xG data, referee profiles and contextual factors like rest days and fixture congestion. Each candidate tip is scored across five dimensions. Only tips scoring 70+ out of 100 are published.',
  },
  {
    q: 'What markets do you cover?',
    a: 'We cover goals (Over 2.5, BTTS), player cards and fouls, player shots and shots on target, corners, match result, clean sheets, and combo markets like goal or assist. We track over 30 individual market types.',
  },
  {
    q: 'How many tips per day?',
    a: 'We publish up to 10 tips per day, ranked by confidence score. On busy matchdays across multiple leagues, competition for those 10 slots is fierce — only the strongest data-backed picks make the cut.',
  },
  {
    q: 'What is the stake size?',
    a: 'All P&L is tracked at a flat £10 per tip. This makes it easy to compare performance across different odds and markets.',
  },
  {
    q: 'What leagues do you cover?',
    a: 'Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Europa League and the World Cup.',
  },
  {
    q: 'What is a Game Acca?',
    a: 'A Game Acca is an accumulator built from 3-5 tips from the same day\'s fixtures. Each leg must score 70+ confidence, and no two legs can come from the same match or be correlated markets.',
  },
  {
    q: 'What is a Weekend Acca?',
    a: 'A Weekend Acca picks 4-6 of the best tips across the full Monday-to-Sunday fixture list, requiring at least 3 different matches and 2 different market types.',
  },
  {
    q: 'What does Free vs Pro include?',
    a: 'Free users see the top 3 tips, the game acca, and today\'s P&L. Pro users (£9.99/month) get all 10 tips, weekend accas, full P&L history, confidence breakdowns and alerts.',
  },
  {
    q: 'Does Tipora place bets for me?',
    a: 'No. Tipora is a tipping and analytics platform. We do not place bets, accept deposits or handle funds. Any betting decisions are entirely your own.',
  },
  {
    q: 'How is P&L calculated?',
    a: 'Every tip is staked at £10. A winning tip at odds of 2.50 returns £25 for a profit of £15. A losing tip loses the £10 stake. ROI is calculated as total profit divided by total staked.',
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-3xl font-bold text-white">Frequently Asked Questions</h1>

      <div className="mt-8 space-y-6">
        {FAQS.map(({ q, a }, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 p-5">
            <h3 className="text-base font-semibold text-white">{q}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Tipora',
  description: 'Learn about Tipora, the data-driven football tipping platform.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-3xl font-bold text-white">About Tipora</h1>

      <div className="mt-8 space-y-6 text-zinc-400 leading-relaxed">
        <p>
          Tipora is a data-driven football tipping service. We analyse trends, expected goals,
          referee profiles and contextual factors to find the angles the market misses.
        </p>

        <h2 className="text-xl font-semibold text-white">How It Works</h2>
        <p>
          Every day, our system ingests data from top European leagues — the Premier League,
          La Liga, Serie A, Bundesliga, Ligue 1, Champions League and Europa League. We track
          player stats, team form, referee tendencies and head-to-head records across thousands
          of data points.
        </p>

        <h2 className="text-xl font-semibold text-white">Confidence Scoring</h2>
        <p>
          Each potential tip is scored across five dimensions: trend strength, expected goals,
          referee profile, contextual factors (rest days, fixture congestion, venue), and value
          versus the bookmaker&apos;s implied probability. Only tips scoring 70 or above out of 100
          are published.
        </p>

        <h2 className="text-xl font-semibold text-white">Full Transparency</h2>
        <p>
          Every tip is tracked and settled. Our P&L tracker shows exactly how every pick performed
          — wins, losses, voids and return on investment. We believe that if you can&apos;t show your
          results, you shouldn&apos;t be tipping.
        </p>

        <h2 className="text-xl font-semibold text-white">What We Are Not</h2>
        <p>
          Tipora does not place bets. We do not accept deposits or handle any funds. We are a
          tipping and analytics platform. Any betting decisions are yours alone.
        </p>
      </div>
    </div>
  );
}

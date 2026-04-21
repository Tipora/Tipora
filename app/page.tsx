import Link from "next/link";
import { createSafeServerClient } from "@/lib/supabase/safe-client";
import { WeekSummary } from "@/components/tracker/WeekSummary";
import { TipOfTheDay } from '@/components/tips/TipOfTheDay';
import { SocialProof } from '@/components/tracker/SocialProof';
import type { Tip } from '@/types/tip';

export const dynamic = 'force-dynamic';

async function getWeekStats() {
  const supabase = await createSafeServerClient();
  if (!supabase) return { wins: 0, losses: 0, voids: 0, totalPL: 0, staked: 0 };

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const from = weekAgo.toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];

  const { data } = await supabase
    .from('tips')
    .select('status, pl')
    .in('status', ['won', 'lost', 'void'])
    .gte('tip_date', from)
    .lte('tip_date', to);

  const tips = data ?? [];
  const wins = tips.filter(t => t.status === 'won').length;
  const losses = tips.filter(t => t.status === 'lost').length;
  const voids = tips.filter(t => t.status === 'void').length;
  const totalPL = tips.reduce((s, t) => s + (t.pl ?? 0), 0) / 100;
  const staked = (wins + losses) * 10;

  return { wins, losses, voids, totalPL, staked };
}

async function getTipOfTheDay(): Promise<{ tip: Tip; home: string; away: string; league: string } | null> {
  const supabase = await createSafeServerClient();
  if (!supabase) return null;

  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('tips')
    .select('*, fixtures(home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name), competitions(name))')
    .eq('tip_date', today)
    .eq('status', 'pending')
    .order('confidence_score', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    tip: data as unknown as Tip,
    home: (data.fixtures as Record<string, Record<string, string>>)?.home_team?.name ?? 'Home',
    away: (data.fixtures as Record<string, Record<string, string>>)?.away_team?.name ?? 'Away',
    league: (data.fixtures as Record<string, Record<string, string>>)?.competitions?.name ?? 'League',
  };
}

async function getAllTimeStats() {
  const supabase = await createSafeServerClient();
  if (!supabase) return { totalTips: 0, totalWins: 0, totalLosses: 0, allTimePL: 0, strikeRate: 0 };

  const { data } = await supabase
    .from('tips')
    .select('status, pl')
    .in('status', ['won', 'lost']);

  const tips = data ?? [];
  const wins = tips.filter(t => t.status === 'won').length;
  const losses = tips.filter(t => t.status === 'lost').length;
  const total = wins + losses;
  const pl = tips.reduce((s, t) => s + (t.pl ?? 0), 0) / 100;

  return {
    totalTips: total,
    totalWins: wins,
    totalLosses: losses,
    allTimePL: pl,
    strikeRate: total > 0 ? (wins / total) * 100 : 0,
  };
}

export default async function HomePage() {
  const [weekStats, tipOfTheDay, allTimeStats] = await Promise.all([
    getWeekStats(),
    getTipOfTheDay(),
    getAllTimeStats(),
  ]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
        Finding the angle<br />
        <span className="text-emerald-400">the market missed.</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-zinc-400">
        Data-driven football tips powered by trends, xG, referee profiles and contextual analysis.
        Full transparency with P&L tracking on every tip.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/tips"
          className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
        >
          Today&apos;s Tips
        </Link>
        <Link
          href="/tracker"
          className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-zinc-500"
        >
          View P&L Tracker
        </Link>
      </div>

      {tipOfTheDay && (
        <div className="mt-14 w-full max-w-2xl px-4">
          <TipOfTheDay
            tip={tipOfTheDay.tip}
            homeTeam={tipOfTheDay.home}
            awayTeam={tipOfTheDay.away}
            leagueName={tipOfTheDay.league}
          />
        </div>
      )}

      <div className="mt-14 w-full flex justify-center px-4">
        <WeekSummary
          wins={weekStats.wins}
          losses={weekStats.losses}
          voids={weekStats.voids}
          totalPL={weekStats.totalPL}
          staked={weekStats.staked}
        />
      </div>

      <div className="mt-6 w-full max-w-4xl px-4">
        <SocialProof
          totalTips={allTimeStats.totalTips}
          totalWins={allTimeStats.totalWins}
          totalLosses={allTimeStats.totalLosses}
          allTimePL={allTimeStats.allTimePL}
          strikeRate={allTimeStats.strikeRate}
        />
      </div>

      <div className="mt-14 grid max-w-4xl gap-8 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 p-6 text-left">
          <div className="mb-3 text-2xl">📊</div>
          <h3 className="text-base font-semibold text-white">Trend-Based Tips</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Every tip backed by real data — player streaks, team form, xG and referee profiles.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-6 text-left">
          <div className="mb-3 text-2xl">🎯</div>
          <h3 className="text-base font-semibold text-white">Confidence Scoring</h3>
          <p className="mt-2 text-sm text-zinc-500">
            0–100 score across 5 dimensions. Only tips scoring 70+ get published.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 p-6 text-left">
          <div className="mb-3 text-2xl">💰</div>
          <h3 className="text-base font-semibold text-white">Full P&L Tracking</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Every tip settled and tracked. Day, week, month, season — full transparency.
          </p>
        </div>
      </div>
    </div>
  );
}

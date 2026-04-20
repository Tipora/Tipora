import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { redirect } from 'next/navigation';
import { TipCard } from '@/components/tips/TipCard';
import { FormStrip } from '@/components/tips/FormStrip';
import { MARKET_LABELS } from '@/lib/utils/markets';
import type { Tip, StatType } from '@/types/tip';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSafeServerClient();
  if (!supabase) return { title: 'Player — Tipora' };
  const { data } = await supabase.from('players').select('name').eq('api_id', parseInt(id)).single();
  return { title: `${data?.name ?? 'Player'} — Tipora` };
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerId = parseInt(id, 10);
  if (isNaN(playerId)) redirect('/tips');

  const supabase = await createSafeServerClient();
  if (!supabase) redirect('/tips');

  // Player info
  const { data: player } = await supabase
    .from('players')
    .select('*, teams:team_id(name)')
    .eq('api_id', playerId)
    .single();

  if (!player) redirect('/tips');

  // Last 10 match stats
  const { data: recentStats } = await supabase
    .from('player_match_stats')
    .select('*, fixtures(kickoff_at, home_team_id, away_team_id, home_score, away_score, status)')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(10);

  const stats = recentStats ?? [];

  // Build form from fixtures the player appeared in
  const form: Array<'W' | 'D' | 'L'> = stats.map(s => {
    const f = s.fixtures;
    if (!f || f.status !== 'FT') return 'D' as const;
    const isHome = s.team_id === f.home_team_id;
    const scored = isHome ? (f.home_score ?? 0) : (f.away_score ?? 0);
    const conceded = isHome ? (f.away_score ?? 0) : (f.home_score ?? 0);
    if (scored > conceded) return 'W' as const;
    if (scored < conceded) return 'L' as const;
    return 'D' as const;
  });

  // Avg stats
  const count = stats.length || 1;
  const avgGoals = stats.reduce((s, x) => s + x.goals, 0) / count;
  const avgAssists = stats.reduce((s, x) => s + x.assists, 0) / count;
  const avgShots = stats.reduce((s, x) => s + x.shots, 0) / count;
  const avgSOT = stats.reduce((s, x) => s + x.shots_on_target, 0) / count;
  const avgFouls = stats.reduce((s, x) => s + x.fouls_committed, 0) / count;
  const avgYellows = stats.reduce((s, x) => s + x.yellow_cards, 0) / count;

  // Player trends
  const { data: trends } = await supabase
    .from('player_trends')
    .select('*')
    .eq('player_id', playerId)
    .order('streak_count', { ascending: false });

  // Tips involving this player
  const { data: playerTips } = await supabase
    .from('tips')
    .select('*, fixtures(kickoff_at, status, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name), competitions(name))')
    .ilike('selection', `${player.name}%`)
    .order('tip_date', { ascending: false })
    .limit(20);

  const tipList = (playerTips ?? []) as unknown as (Tip & { fixtures: Record<string, unknown> })[];

  const teamName = (player.teams as Record<string, string>)?.name ?? 'Unknown';

  return (
    <div>
      {/* Player header */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-2xl font-bold text-emerald-400">
            {player.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{player.name}</h1>
            <p className="text-sm text-zinc-400">{teamName} &middot; {player.position} &middot; {player.nationality}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <FormStrip results={form.slice(0, 5)} label="L5" />
          <FormStrip results={form.slice(0, 10)} label="L10" />
        </div>
      </div>

      {/* Average stats */}
      <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: 'Goals', value: avgGoals },
          { label: 'Assists', value: avgAssists },
          { label: 'Shots', value: avgShots },
          { label: 'SOT', value: avgSOT },
          { label: 'Fouls', value: avgFouls },
          { label: 'Yellows', value: avgYellows },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-zinc-800 p-3 text-center">
            <p className="text-lg font-bold text-white">{s.value.toFixed(1)}</p>
            <p className="text-[10px] uppercase text-zinc-500">{s.label}/gm</p>
          </div>
        ))}
      </div>

      {/* Active trends */}
      {(trends ?? []).length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Active Trends</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {(trends ?? []).filter(t => t.streak_count > 0).map(t => (
              <div key={t.stat_type} className="flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-2.5">
                <span className="text-sm text-zinc-300">{MARKET_LABELS[t.stat_type as StatType] ?? t.stat_type}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-400 font-bold">{t.streak_count} game streak</span>
                  <span className="text-zinc-500">avg {Number(t.avg_last_10).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip history */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Tip History</h2>
        <p className="mt-1 text-sm text-zinc-500">All tips involving {player.name}</p>
      </div>

      {tipList.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-12 text-center">
          <p className="text-zinc-500">No tips generated for this player yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tipList.map(tip => (
            <TipCard
              key={tip.id}
              tip={tip}
              homeTeam={(tip.fixtures?.home_team as Record<string, string>)?.name ?? 'Home'}
              awayTeam={(tip.fixtures?.away_team as Record<string, string>)?.name ?? 'Away'}
              leagueName={(tip.fixtures?.competitions as Record<string, string>)?.name ?? ''}
              kickoff={(tip.fixtures?.kickoff_at as string) ?? ''}
              fixtureStatus={(tip.fixtures?.status as string) ?? ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}

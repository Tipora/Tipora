import type { SupabaseClient } from '@supabase/supabase-js';

export interface SeasonDataPoint {
  matchday: number;
  date: string;
  goals: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  cards: number;
  xg: number;
}

export async function getSeasonStats(
  teamId: number,
  supabase: SupabaseClient
): Promise<SeasonDataPoint[]> {
  const { data: stats } = await supabase
    .from('team_match_stats')
    .select('shots, shots_on_target, corners, fouls, yellow_cards, red_cards, xg, fixtures(kickoff_at, home_team_id, home_score, away_score)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (!stats?.length) return [];

  return stats.map((s, i) => {
    const f = s.fixtures as unknown as { kickoff_at: string; home_team_id: number; home_score: number; away_score: number } | null;
    const isHome = f ? teamId === f.home_team_id : true;
    const goals = f ? (isHome ? f.home_score : f.away_score) ?? 0 : 0;

    return {
      matchday: i + 1,
      date: f?.kickoff_at ? new Date(f.kickoff_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '',
      goals,
      shots: s.shots ?? 0,
      shotsOnTarget: s.shots_on_target ?? 0,
      corners: s.corners ?? 0,
      fouls: s.fouls ?? 0,
      cards: (s.yellow_cards ?? 0) + (s.red_cards ?? 0),
      xg: Number(s.xg) || 0,
    };
  });
}

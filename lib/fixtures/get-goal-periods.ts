import type { SupabaseClient } from '@supabase/supabase-js';

export type GoalPeriod = '0-15' | '16-30' | '31-45' | '46-60' | '61-75' | '76-90';

export interface GoalPeriodStats {
  scoredByPeriod: Record<GoalPeriod, number>;   // count of games with a goal in this period
  concededByPeriod: Record<GoalPeriod, number>;
  gamesAnalysed: number;
}

const EMPTY_PERIODS: Record<GoalPeriod, number> = {
  '0-15': 0, '16-30': 0, '31-45': 0, '46-60': 0, '61-75': 0, '76-90': 0,
};

/**
 * Fetch a team's goal distribution across match periods from the last N fixtures.
 */
export async function getGoalPeriodStats(
  teamId: number,
  supabase: SupabaseClient,
  limit: number = 10
): Promise<GoalPeriodStats> {
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('home_team_id, away_team_id, goals_by_period')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'FT')
    .not('goals_by_period', 'is', null)
    .order('kickoff_at', { ascending: false })
    .limit(limit);

  if (!fixtures?.length) {
    return {
      scoredByPeriod: { ...EMPTY_PERIODS },
      concededByPeriod: { ...EMPTY_PERIODS },
      gamesAnalysed: 0,
    };
  }

  const scored = { ...EMPTY_PERIODS };
  const conceded = { ...EMPTY_PERIODS };

  for (const f of fixtures) {
    const isHome = f.home_team_id === teamId;
    const periods = f.goals_by_period as Record<string, { home: number; away: number }> | null;
    if (!periods) continue;

    for (const key of Object.keys(periods) as GoalPeriod[]) {
      const row = periods[key];
      if (!row) continue;
      const teamGoals = isHome ? (row.home ?? 0) : (row.away ?? 0);
      const oppGoals = isHome ? (row.away ?? 0) : (row.home ?? 0);
      if (teamGoals > 0) scored[key] += teamGoals;
      if (oppGoals > 0) conceded[key] += oppGoals;
    }
  }

  return {
    scoredByPeriod: scored,
    concededByPeriod: conceded,
    gamesAnalysed: fixtures.length,
  };
}

import type { SupabaseClient } from '@supabase/supabase-js';

export interface FirstGoalStats {
  scoredFirstPct: number;
  concededFirstPct: number;
  avgFirstGoalMinute: number;
  scoredFirstWinPct: number;
  concededFirstWinPct: number;
  gamesAnalysed: number;
}

export async function getFirstGoalStats(
  teamId: number,
  isHome: boolean,
  supabase: SupabaseClient
): Promise<FirstGoalStats> {
  const { data: stats } = await supabase
    .from('team_first_goal_stats')
    .select('*')
    .eq('team_id', teamId)
    .single();

  if (!stats) {
    // No data — return zeros and let UI show "insufficient data" rather than fake defaults
    return { scoredFirstPct: 0, concededFirstPct: 0, avgFirstGoalMinute: 0, scoredFirstWinPct: 0, concededFirstWinPct: 0, gamesAnalysed: 0 };
  }

  return {
    scoredFirstPct: Number(isHome ? stats.home_scored_first_pct : stats.away_scored_first_pct),
    concededFirstPct: Number(isHome ? stats.home_conceded_first_pct : stats.away_conceded_first_pct),
    avgFirstGoalMinute: Number(isHome ? stats.home_avg_first_goal_minute : stats.away_avg_first_goal_minute),
    scoredFirstWinPct: Number(stats.scored_first_win_pct),
    concededFirstWinPct: Number(stats.conceded_first_win_pct),
    gamesAnalysed: isHome ? (stats.home_games_sampled ?? 0) : (stats.away_games_sampled ?? 0),
  };
}

/**
 * Recalculate first goal stats for a team from raw fixture data.
 * Called by the trends calculate job.
 */
export async function recalculateFirstGoalStats(
  teamId: number,
  supabase: SupabaseClient
): Promise<void> {
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('home_team_id, away_team_id, home_score, away_score, first_goal_team, first_goal_minute')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'FT')
    .not('first_goal_team', 'is', null)
    .order('kickoff_at', { ascending: false })
    .limit(20);

  if (!fixtures?.length) return;

  const homeGames = fixtures.filter(f => f.home_team_id === teamId);
  const awayGames = fixtures.filter(f => f.away_team_id === teamId);

  function calcPct(games: NonNullable<typeof fixtures>, scoredFirst: boolean) {
    if (!games.length) return 0;
    const hits = games.filter(f => {
      const isHome = f.home_team_id === teamId;
      const teamScoredFirst = (f.first_goal_team === 'home' && isHome) || (f.first_goal_team === 'away' && !isHome);
      return scoredFirst ? teamScoredFirst : !teamScoredFirst;
    }).length;
    return Math.round((hits / games.length) * 100);
  }

  function avgMinute(games: NonNullable<typeof fixtures>) {
    const mins = games.filter(f => f.first_goal_minute != null).map(f => f.first_goal_minute!);
    return mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length * 10) / 10 : 0;
  }

  // When team scores first, how often do they win?
  const allGames = fixtures;
  const scoredFirstGames = allGames.filter(f => {
    const isHome = f.home_team_id === teamId;
    return (f.first_goal_team === 'home' && isHome) || (f.first_goal_team === 'away' && !isHome);
  });
  const scoredFirstWins = scoredFirstGames.filter(f => {
    const isHome = f.home_team_id === teamId;
    const scored = isHome ? (f.home_score ?? 0) : (f.away_score ?? 0);
    const conceded = isHome ? (f.away_score ?? 0) : (f.home_score ?? 0);
    return scored > conceded;
  });

  const concededFirstGames = allGames.filter(f => {
    const isHome = f.home_team_id === teamId;
    return (f.first_goal_team === 'home' && !isHome) || (f.first_goal_team === 'away' && isHome);
  });
  const concededFirstWins = concededFirstGames.filter(f => {
    const isHome = f.home_team_id === teamId;
    const scored = isHome ? (f.home_score ?? 0) : (f.away_score ?? 0);
    const conceded = isHome ? (f.away_score ?? 0) : (f.home_score ?? 0);
    return scored > conceded;
  });

  await supabase.from('team_first_goal_stats').upsert({
    team_id: teamId,
    home_scored_first_pct: calcPct(homeGames, true),
    home_conceded_first_pct: calcPct(homeGames, false),
    home_avg_first_goal_minute: avgMinute(homeGames),
    home_games_sampled: homeGames.length,
    away_scored_first_pct: calcPct(awayGames, true),
    away_conceded_first_pct: calcPct(awayGames, false),
    away_avg_first_goal_minute: avgMinute(awayGames),
    away_games_sampled: awayGames.length,
    scored_first_win_pct: scoredFirstGames.length ? Math.round((scoredFirstWins.length / scoredFirstGames.length) * 100) : 0,
    conceded_first_win_pct: concededFirstGames.length ? Math.round((concededFirstWins.length / concededFirstGames.length) * 100) : 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'team_id' });
}

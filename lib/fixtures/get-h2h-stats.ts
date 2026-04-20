import type { SupabaseClient } from '@supabase/supabase-js';

export interface H2HMatchData {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeShots: number;
  awayShots: number;
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
  homeCards: number;
  awayCards: number;
}

export async function getH2HStats(
  teamAId: number,
  teamBId: number,
  supabase: SupabaseClient,
  limit: number = 10
): Promise<H2HMatchData[]> {
  // Fetch fixtures where these two teams played each other
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, kickoff_at, home_team_id, away_team_id, home_score, away_score, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name)')
    .or(`and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`)
    .eq('status', 'FT')
    .order('kickoff_at', { ascending: false })
    .limit(limit);

  if (!fixtures?.length) return [];

  const results: H2HMatchData[] = [];

  for (const f of fixtures) {
    // Get team match stats for this fixture
    const { data: stats } = await supabase
      .from('team_match_stats')
      .select('team_id, shots, shots_on_target, corners, fouls, yellow_cards, red_cards')
      .eq('fixture_id', f.id);

    const homeStats = stats?.find(s => s.team_id === f.home_team_id);
    const awayStats = stats?.find(s => s.team_id === f.away_team_id);

    results.push({
      date: new Date(f.kickoff_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
      homeTeam: (f.home_team as unknown as Record<string, string>)?.name ?? 'Home',
      awayTeam: (f.away_team as unknown as Record<string, string>)?.name ?? 'Away',
      homeGoals: f.home_score ?? 0,
      awayGoals: f.away_score ?? 0,
      homeShots: homeStats?.shots ?? 0,
      awayShots: awayStats?.shots ?? 0,
      homeCorners: homeStats?.corners ?? 0,
      awayCorners: awayStats?.corners ?? 0,
      homeFouls: homeStats?.fouls ?? 0,
      awayFouls: awayStats?.fouls ?? 0,
      homeCards: (homeStats?.yellow_cards ?? 0) + (homeStats?.red_cards ?? 0),
      awayCards: (awayStats?.yellow_cards ?? 0) + (awayStats?.red_cards ?? 0),
    });
  }

  return results;
}

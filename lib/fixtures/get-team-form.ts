import type { SupabaseClient } from '@supabase/supabase-js';

export interface TeamFormData {
  form5: Array<'W' | 'D' | 'L'>;
  form10: Array<'W' | 'D' | 'L'>;
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
  xgAvg: number;
}

export async function getTeamForm(
  teamId: number,
  supabase: SupabaseClient
): Promise<TeamFormData> {
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('home_team_id, away_team_id, home_score, away_score')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'FT')
    .order('kickoff_at', { ascending: false })
    .limit(10);

  const results: Array<'W' | 'D' | 'L'> = [];
  let totalScored = 0;
  let totalConceded = 0;
  let cleanSheets = 0;

  for (const f of fixtures ?? []) {
    const isHome = f.home_team_id === teamId;
    const scored = isHome ? (f.home_score ?? 0) : (f.away_score ?? 0);
    const conceded = isHome ? (f.away_score ?? 0) : (f.home_score ?? 0);
    totalScored += scored;
    totalConceded += conceded;
    if (conceded === 0) cleanSheets++;
    if (scored > conceded) results.push('W');
    else if (scored === conceded) results.push('D');
    else results.push('L');
  }

  const count = fixtures?.length ?? 0;

  const { data: xgStats } = await supabase
    .from('team_match_stats')
    .select('xg')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(5);

  const xgAvg = xgStats?.length
    ? xgStats.reduce((s, x) => s + (Number(x.xg) || 0), 0) / xgStats.length
    : 1.2;

  return {
    form5: results.slice(0, 5),
    form10: results.slice(0, 10),
    goalsScored: count > 0 ? totalScored / count : 0,
    goalsConceded: count > 0 ? totalConceded / count : 0,
    cleanSheets,
    xgAvg,
  };
}

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlayerMatchStat } from '@/types/player';
import type { StatType, PlayerTrend, TeamTrend } from '@/types/tip';

// ---------------------------------------------------------------------------
// Player trends — last 10 matches for a given stat
// ---------------------------------------------------------------------------

export async function calculatePlayerTrend(
  playerId: number,
  statType: StatType,
  supabase: SupabaseClient
): Promise<PlayerTrend | null> {
  const { data: stats } = await supabase
    .from('player_match_stats')
    .select('*, fixtures(kickoff_at, home_team_id)')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!stats?.length) return null;
  return computePlayerTrendFromRows(playerId, statType, stats as PlayerMatchStatWithFixture[]);
}

/**
 * Optimized batch version: fetch a player's last 10 match stats ONCE,
 * then compute trends for every stat type from the same data.
 */
export async function calculateAllPlayerTrends(
  playerId: number,
  statTypes: StatType[],
  supabase: SupabaseClient
): Promise<PlayerTrend[]> {
  const { data: stats } = await supabase
    .from('player_match_stats')
    .select('*, fixtures(kickoff_at, home_team_id)')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!stats?.length) return [];

  const rows = stats as PlayerMatchStatWithFixture[];
  const results: PlayerTrend[] = [];
  for (const statType of statTypes) {
    const trend = computePlayerTrendFromRows(playerId, statType, rows);
    if (trend) results.push(trend);
  }
  return results;
}

type PlayerMatchStatWithFixture = PlayerMatchStat & { fixtures: { home_team_id: number } };

function computePlayerTrendFromRows(
  playerId: number,
  statType: StatType,
  stats: PlayerMatchStatWithFixture[]
): PlayerTrend | null {
  const values = stats.map(s => getPlayerStatValue(s, statType));

  // Only persist trends where the player has *some* activity in this stat
  if (values.every(v => v === 0)) return null;

  const streak = countStreak(values);

  const homeStats = stats.filter(s => s.team_id === s.fixtures.home_team_id);
  const awayStats = stats.filter(s => s.team_id !== s.fixtures.home_team_id);

  return {
    player_id: playerId,
    stat_type: statType,
    streak_count: streak,
    last_n_games: values,
    avg_last_5: average(values.slice(0, 5)),
    avg_last_10: average(values),
    home_avg: average(homeStats.map(s => getPlayerStatValue(s, statType))),
    away_avg: average(awayStats.map(s => getPlayerStatValue(s, statType))),
  };
}

// ---------------------------------------------------------------------------
// Team trends — last 10 matches for goals, corners, cards, clean sheets, BTTS
// ---------------------------------------------------------------------------

interface TeamMatchRow {
  team_id: number;
  fixture_id: number;
  possession: number;
  shots: number;
  shots_on_target: number;
  corners: number;
  fouls: number;
  yellow_cards: number;
  red_cards: number;
  xg: number | null;
  xg_against: number | null;
  // Advanced
  fouls_first_half?: number;
  fouls_second_half?: number;
  cards_first_half?: number;
  cards_second_half?: number;
  shots_inside_box?: number;
  shots_outside_box?: number;
  offsides?: number;
  aerial_duels_won?: number;
  goalkeeper_saves?: number;
  big_chances?: number;
  big_chances_missed?: number;
  fixtures: {
    kickoff_at: string;
    home_team_id: number;
    away_team_id: number;
    home_score: number | null;
    away_score: number | null;
  };
}

export async function calculateTeamTrend(
  teamId: number,
  statType: StatType,
  supabase: SupabaseClient
): Promise<TeamTrend | null> {
  const { data: stats } = await supabase
    .from('team_match_stats')
    .select('*, fixtures(kickoff_at, home_team_id, away_team_id, home_score, away_score)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!stats?.length) return null;

  const rows = stats as TeamMatchRow[];
  return computeTeamTrendFromRows(teamId, statType, rows);
}

/**
 * Optimized batch version: fetch a team's last 10 matches ONCE,
 * then compute trends for every stat type from the same data.
 * Reduces DB queries from N_statTypes to 1 per team.
 */
export async function calculateAllTeamTrends(
  teamId: number,
  statTypes: StatType[],
  supabase: SupabaseClient
): Promise<TeamTrend[]> {
  const { data: stats } = await supabase
    .from('team_match_stats')
    .select('*, fixtures(kickoff_at, home_team_id, away_team_id, home_score, away_score)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!stats?.length) return [];

  const rows = stats as TeamMatchRow[];
  const results: TeamTrend[] = [];
  for (const statType of statTypes) {
    const trend = computeTeamTrendFromRows(teamId, statType, rows);
    if (trend) results.push(trend);
  }
  return results;
}

function computeTeamTrendFromRows(
  teamId: number,
  statType: StatType,
  rows: TeamMatchRow[]
): TeamTrend | null {
  const values = rows.map(s => getTeamStatValue(s, statType));
  if (values.every(v => v === 0)) return null;

  const hits = values.filter(v => v > 0).length;
  const homeRows = rows.filter(s => s.team_id === s.fixtures.home_team_id);
  const awayRows = rows.filter(s => s.team_id !== s.fixtures.home_team_id);
  const homeHits = homeRows.filter(s => getTeamStatValue(s, statType) > 0).length;
  const awayHits = awayRows.filter(s => getTeamStatValue(s, statType) > 0).length;

  return {
    team_id: teamId,
    stat_type: statType,
    streak_count: countStreak(values),
    hit_rate_last_10: hits / values.length,
    home_hit_rate: homeRows.length ? homeHits / homeRows.length : 0,
    away_hit_rate: awayRows.length ? awayHits / awayRows.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Head-to-head — last 10 meetings between two teams for a stat
// ---------------------------------------------------------------------------

export interface H2HResult {
  team_a_id: number;
  team_b_id: number;
  stat_type: StatType;
  hit_rate_last_10: number;
  avg_value_last_10: number;
}

export async function calculateH2H(
  teamAId: number,
  teamBId: number,
  statType: StatType,
  supabase: SupabaseClient
): Promise<H2HResult | null> {
  // Fixtures where these two teams played each other
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, home_team_id, away_team_id, home_score, away_score, kickoff_at')
    .or(`and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`)
    .eq('status', 'FT')
    .order('kickoff_at', { ascending: false })
    .limit(10);

  if (!fixtures?.length) return null;

  const values = fixtures.map((f: { home_score: number | null; away_score: number | null }) => {
    const total = (f.home_score ?? 0) + (f.away_score ?? 0);
    return getMatchStatValue(f.home_score ?? 0, f.away_score ?? 0, total, statType);
  });

  const hits = values.filter(v => v > 0).length;

  return {
    team_a_id: teamAId,
    team_b_id: teamBId,
    stat_type: statType,
    hit_rate_last_10: hits / values.length,
    avg_value_last_10: average(values),
  };
}

// ---------------------------------------------------------------------------
// Fixture context helpers
// ---------------------------------------------------------------------------

export interface FixtureContext {
  homeRestDays: number;
  awayRestDays: number;
  homeXGAvg: number;
  awayXGAvg: number;
  homeXGAAvg: number;
  awayXGAAvg: number;
  homeGoalsConceded: number;
  awayGoalsConceded: number;
  homeCleanSheetRate: number;
  awayCleanSheetRate: number;
  homeWinRate: number;
  awayWinRate: number;
  isCongested: boolean;
}

export async function getFixtureContext(
  homeTeamId: number,
  awayTeamId: number,
  kickoffAt: string,
  supabase: SupabaseClient
): Promise<FixtureContext> {
  const [homeCtx, awayCtx] = await Promise.all([
    getTeamContext(homeTeamId, kickoffAt, supabase),
    getTeamContext(awayTeamId, kickoffAt, supabase),
  ]);

  return {
    homeRestDays: homeCtx.restDays,
    awayRestDays: awayCtx.restDays,
    homeXGAvg: homeCtx.xgAvg,
    awayXGAvg: awayCtx.xgAvg,
    homeXGAAvg: homeCtx.xgaAvg,
    awayXGAAvg: awayCtx.xgaAvg,
    homeGoalsConceded: homeCtx.goalsConceded,
    awayGoalsConceded: awayCtx.goalsConceded,
    homeCleanSheetRate: homeCtx.cleanSheetRate,
    awayCleanSheetRate: awayCtx.cleanSheetRate,
    homeWinRate: homeCtx.winRate,
    awayWinRate: awayCtx.winRate,
    isCongested: homeCtx.restDays <= 3 || awayCtx.restDays <= 3,
  };
}

interface TeamContext {
  restDays: number;
  xgAvg: number;
  xgaAvg: number;
  goalsConceded: number;
  cleanSheetRate: number;
  winRate: number;
}

async function getTeamContext(
  teamId: number,
  beforeDate: string,
  supabase: SupabaseClient
): Promise<TeamContext> {
  const { data: lastFixture } = await supabase
    .from('fixtures')
    .select('kickoff_at')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'FT')
    .lt('kickoff_at', beforeDate)
    .order('kickoff_at', { ascending: false })
    .limit(1)
    .single();

  const restDays = lastFixture
    ? Math.floor(
        (new Date(beforeDate).getTime() - new Date(lastFixture.kickoff_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 7;

  const { data: xgStats } = await supabase
    .from('team_match_stats')
    .select('xg, xg_against')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(5);

  const xgAvg = xgStats?.length
    ? average(xgStats.map(s => Number(s.xg) || 0))
    : 1.2;
  const xgaAvg = xgStats?.length
    ? average(xgStats.map(s => Number(s.xg_against) || 0))
    : 1.2;

  const { data: recentFixtures } = await supabase
    .from('fixtures')
    .select('home_team_id, home_score, away_score')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('status', 'FT')
    .order('kickoff_at', { ascending: false })
    .limit(10);

  let totalConceded = 0;
  let cleanSheets = 0;
  let wins = 0;
  const count = recentFixtures?.length ?? 0;

  for (const f of recentFixtures ?? []) {
    const isHome = f.home_team_id === teamId;
    const conceded = isHome ? (f.away_score ?? 0) : (f.home_score ?? 0);
    const scored = isHome ? (f.home_score ?? 0) : (f.away_score ?? 0);
    totalConceded += conceded;
    if (conceded === 0) cleanSheets++;
    if (scored > conceded) wins++;
  }

  return {
    restDays,
    xgAvg,
    xgaAvg,
    goalsConceded: count > 0 ? totalConceded / count : 1.2,
    cleanSheetRate: count > 0 ? cleanSheets / count : 0.2,
    winRate: count > 0 ? wins / count : 0.4,
  };
}

// ---------------------------------------------------------------------------
// Stat value extractors
// ---------------------------------------------------------------------------

export function getPlayerStatValue(stat: PlayerMatchStat, type: StatType): number {
  const map: Record<string, number> = {
    // Raw counts (legacy)
    foul_committed: stat.fouls_committed,
    foul_drawn: stat.fouls_drawn,
    yellow_card: stat.yellow_cards,
    red_card: stat.red_cards,
    goal: stat.goals,
    anytime_goalscorer: stat.goals,
    assist: stat.assists,
    shot: stat.shots,
    shot_on_target: stat.shots_on_target,
    // Threshold: fouls
    player_1_plus_foul: stat.fouls_committed >= 1 ? 1 : 0,
    player_2_plus_fouls: stat.fouls_committed >= 2 ? 1 : 0,
    // Threshold: shots
    player_1_plus_shot: stat.shots >= 1 ? 1 : 0,
    player_2_plus_shots: stat.shots >= 2 ? 1 : 0,
    player_3_plus_shots: stat.shots >= 3 ? 1 : 0,
    // Threshold: shots on target
    player_1_plus_sot: stat.shots_on_target >= 1 ? 1 : 0,
    player_2_plus_sot: stat.shots_on_target >= 2 ? 1 : 0,
    // Combo
    score_or_assist: (stat.goals + stat.assists) >= 1 ? 1 : 0,
    // Crosses
    player_1_plus_cross: (stat.crosses_completed ?? 0) >= 1 ? 1 : 0,
    player_2_plus_crosses: (stat.crosses_completed ?? 0) >= 2 ? 1 : 0,
    // Tackles
    player_2_plus_tackles: (stat.tackles ?? 0) >= 2 ? 1 : 0,
    player_3_plus_tackles: (stat.tackles ?? 0) >= 3 ? 1 : 0,
    // Interceptions
    player_1_plus_interception: (stat.interceptions ?? 0) >= 1 ? 1 : 0,
    // Aerial duels
    player_1_plus_aerial: (stat.aerial_duels_won ?? 0) >= 1 ? 1 : 0,
    // Goalkeeper saves
    goalkeeper_3_plus_saves: (stat.saves ?? 0) >= 3 ? 1 : 0,
    goalkeeper_5_plus_saves: (stat.saves ?? 0) >= 5 ? 1 : 0,
  };
  return map[type] ?? 0;
}

function getTeamStatValue(stat: TeamMatchRow, type: StatType): number {
  const f = stat.fixtures;
  const totalGoals = (f.home_score ?? 0) + (f.away_score ?? 0);
  const isHome = stat.team_id === f.home_team_id;
  const ownGoals = isHome ? (f.home_score ?? 0) : (f.away_score ?? 0);
  const oppGoals = isHome ? (f.away_score ?? 0) : (f.home_score ?? 0);

  const totalCards = (stat.yellow_cards ?? 0) + (stat.red_cards ?? 0);
  const totalFouls = stat.fouls ?? 0;

  const map: Record<string, number> = {
    // Card & foul markets
    yellow_card: stat.yellow_cards ?? 0,
    red_card: stat.red_cards ?? 0,
    foul_committed: totalFouls,
    // Corner markets
    over_8_5_corners: (stat.corners ?? 0) > 8.5 ? 1 : 0,
    over_9_5_corners: (stat.corners ?? 0) > 9.5 ? 1 : 0,
    over_10_5_corners: (stat.corners ?? 0) > 10.5 ? 1 : 0,
    // Goal markets
    over_0_5_goals: totalGoals > 0.5 ? 1 : 0,
    over_1_5_goals: totalGoals > 1.5 ? 1 : 0,
    over_2_5_goals: totalGoals > 2.5 ? 1 : 0,
    over_3_5_goals: totalGoals > 3.5 ? 1 : 0,
    btts: (f.home_score ?? 0) > 0 && (f.away_score ?? 0) > 0 ? 1 : 0,
    clean_sheet: oppGoals === 0 ? 1 : 0,
    first_half_goal: 1, // can't determine from FT data, assume hit
    // Result markets
    home_win: isHome ? (ownGoals > oppGoals ? 1 : 0) : 0,
    away_win: !isHome ? (ownGoals > oppGoals ? 1 : 0) : 0,
    draw: ownGoals === oppGoals ? 1 : 0,
    // Shooting (team level)
    shot: stat.shots ?? 0,
    shot_on_target: stat.shots_on_target ?? 0,
    // Match cards (combined both teams — stored per team, so use team's own)
    over_2_5_cards: totalCards > 2.5 ? 1 : 0,
    over_3_5_cards: totalCards > 3.5 ? 1 : 0,
    over_4_5_cards: totalCards > 4.5 ? 1 : 0,
    // Match fouls (team's own fouls)
    over_20_5_fouls: totalFouls > 10 ? 1 : 0, // per-team: 10+ is high (contributes to 20+ match total)
    over_22_5_fouls: totalFouls > 11 ? 1 : 0,
    // Offsides
    over_2_5_offsides: (stat.offsides ?? 0) > 2.5 ? 1 : 0,
    over_3_5_offsides: (stat.offsides ?? 0) > 3.5 ? 1 : 0,
    // GK saves
    team_over_5_5_saves: (stat.goalkeeper_saves ?? 0) > 5.5 ? 1 : 0,
    // Half fouls
    team_over_6_5_fouls_h1: (stat.fouls_first_half ?? 0) > 6.5 ? 1 : 0,
    team_over_6_5_fouls_h2: (stat.fouls_second_half ?? 0) > 6.5 ? 1 : 0,
    // Half cards
    card_in_first_half: (stat.cards_first_half ?? 0) > 0 ? 1 : 0,
    card_in_second_half: (stat.cards_second_half ?? 0) > 0 ? 1 : 0,
  };
  return map[type] ?? 0;
}

function getMatchStatValue(
  homeScore: number,
  awayScore: number,
  totalGoals: number,
  type: StatType
): number {
  const map: Record<string, number> = {
    over_0_5_goals: totalGoals > 0.5 ? 1 : 0,
    over_1_5_goals: totalGoals > 1.5 ? 1 : 0,
    over_2_5_goals: totalGoals > 2.5 ? 1 : 0,
    over_3_5_goals: totalGoals > 3.5 ? 1 : 0,
    btts: homeScore > 0 && awayScore > 0 ? 1 : 0,
    clean_sheet: homeScore === 0 || awayScore === 0 ? 1 : 0,
    home_win: homeScore > awayScore ? 1 : 0,
    away_win: awayScore > homeScore ? 1 : 0,
    draw: homeScore === awayScore ? 1 : 0,
  };
  return map[type] ?? 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countStreak(values: number[]): number {
  let streak = 0;
  for (const v of values) {
    if (v > 0) streak++;
    else break;
  }
  return streak;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { calculatePlayerTrend, calculateTeamTrend, calculateH2H } from '@/lib/trends/engine';
import { recalculateFirstGoalStats } from '@/lib/fixtures/get-first-goal-stats';
import type { StatType } from '@/types/tip';

const PLAYER_STAT_TYPES: StatType[] = [
  'yellow_card', 'red_card',
  'foul_committed', 'foul_drawn',
  'player_1_plus_foul', 'player_2_plus_fouls',
  'shot', 'shot_on_target',
  'player_1_plus_shot', 'player_2_plus_shots', 'player_3_plus_shots',
  'player_1_plus_sot', 'player_2_plus_sot',
  'goal', 'anytime_goalscorer', 'assist',
  'score_or_assist',
  'player_1_plus_cross', 'player_2_plus_crosses',
  'player_2_plus_tackles', 'player_3_plus_tackles',
  'player_1_plus_interception', 'player_1_plus_aerial',
  'goalkeeper_3_plus_saves', 'goalkeeper_5_plus_saves',
];

const TEAM_STAT_TYPES: StatType[] = [
  'yellow_card', 'red_card', 'foul_committed',
  'over_0_5_goals', 'over_1_5_goals', 'over_2_5_goals', 'over_3_5_goals',
  'btts', 'clean_sheet',
  'over_8_5_corners', 'over_9_5_corners', 'over_10_5_corners',
  'over_2_5_cards', 'over_3_5_cards', 'over_4_5_cards',
  'over_20_5_fouls', 'over_22_5_fouls',
  'home_win', 'away_win', 'draw',
  'shot', 'shot_on_target',
  'over_2_5_offsides', 'over_3_5_offsides',
  'team_over_5_5_saves',
  'team_over_6_5_fouls_h1', 'team_over_6_5_fouls_h2',
  'card_in_first_half', 'card_in_second_half',
];

const H2H_STAT_TYPES: StatType[] = [
  'over_2_5_goals', 'over_1_5_goals', 'btts', 'clean_sheet', 'draw',
  'over_3_5_cards',
];

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ?scope=players|teams|h2h|firstgoal|all (default: all)
  // ?onlyActive=1 skips players/teams with no match stats in the last 30 days
  // ?offset=0&limit=150 paginates the player trend recalc (helps with large datasets)
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope') ?? 'all';
  const onlyActive = searchParams.get('onlyActive') !== '0'; // default true
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const pageLimit = parseInt(searchParams.get('limit') ?? '9999', 10);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const now = new Date().toISOString();
  const result: Record<string, number | string | null> = { scope };

  // ---------------------------------------------------------------
  // 1. Player trends — only for players who actually have match stats
  // ---------------------------------------------------------------
  if (scope === 'all' || scope === 'players') {
    let playerIds: number[];

    if (onlyActive) {
      // Only players with match stats — dramatically reduces the workload
      const { data: activePlayerStats } = await supabase
        .from('player_match_stats')
        .select('player_id');
      const uniqueIds = new Set<number>();
      for (const row of activePlayerStats ?? []) {
        uniqueIds.add(row.player_id);
      }
      playerIds = Array.from(uniqueIds);
    } else {
      const { data: players } = await supabase.from('players').select('api_id').limit(1000);
      playerIds = (players ?? []).map(p => p.api_id);
    }

    // Paginate: only process playerIds[offset..offset+pageLimit]
    const totalPlayers = playerIds.length;
    const slice = playerIds.slice(offset, offset + pageLimit);

    let playerTrends = 0;
    for (const playerId of slice) {
      for (const statType of PLAYER_STAT_TYPES) {
        try {
          const trend = await calculatePlayerTrend(playerId, statType, supabase);
          if (trend) {
            await supabase.from('player_trends').upsert(
              { ...trend, updated_at: now },
              { onConflict: 'player_id,stat_type' }
            );
            playerTrends++;
          }
        } catch (err) {
          console.error(`Player trend error id=${playerId} stat=${statType}:`, err);
        }
      }
    }
    result.playerTrends = playerTrends;
    result.playersProcessed = slice.length;
    result.totalPlayers = totalPlayers;
    result.nextOffset = offset + pageLimit < totalPlayers ? offset + pageLimit : null;
  }

  // ---------------------------------------------------------------
  // 2. Team trends — only for teams with match stats
  // ---------------------------------------------------------------
  if (scope === 'all' || scope === 'teams') {
    let teamIds: number[];

    if (onlyActive) {
      const { data: activeTeamStats } = await supabase
        .from('team_match_stats')
        .select('team_id');
      const uniqueIds = new Set<number>();
      for (const row of activeTeamStats ?? []) {
        uniqueIds.add(row.team_id);
      }
      teamIds = Array.from(uniqueIds);
    } else {
      const { data: teams } = await supabase.from('teams').select('api_id').limit(200);
      teamIds = (teams ?? []).map(t => t.api_id);
    }

    let teamTrends = 0;
    for (const teamId of teamIds) {
      for (const statType of TEAM_STAT_TYPES) {
        try {
          const trend = await calculateTeamTrend(teamId, statType, supabase);
          if (trend) {
            await supabase.from('team_trends').upsert(
              { ...trend, updated_at: now },
              { onConflict: 'team_id,stat_type' }
            );
            teamTrends++;
          }
        } catch (err) {
          console.error(`Team trend error id=${teamId} stat=${statType}:`, err);
        }
      }
    }
    result.teamTrends = teamTrends;
    result.teamsProcessed = teamIds.length;
  }

  // ---------------------------------------------------------------
  // 3. Head-to-head — only for upcoming fixtures
  // ---------------------------------------------------------------
  if (scope === 'all' || scope === 'h2h') {
    const today = now.split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const { data: upcoming } = await supabase
      .from('fixtures')
      .select('home_team_id, away_team_id')
      .eq('status', 'NS')
      .gte('kickoff_at', `${today}T00:00:00`)
      .lte('kickoff_at', `${nextWeek}T23:59:59`);

    let h2hCount = 0;
    const h2hSeen = new Set<string>();

    for (const fixture of upcoming ?? []) {
      const key = [fixture.home_team_id, fixture.away_team_id].sort().join('-');
      if (h2hSeen.has(key)) continue;
      h2hSeen.add(key);

      for (const statType of H2H_STAT_TYPES) {
        try {
          const h2h = await calculateH2H(
            fixture.home_team_id, fixture.away_team_id, statType, supabase
          );
          if (h2h) {
            await supabase.from('head_to_head').upsert(
              { ...h2h, updated_at: now },
              { onConflict: 'team_a_id,team_b_id,stat_type' }
            );
            h2hCount++;
          }
        } catch (err) {
          console.error(`H2H error ${key} stat=${statType}:`, err);
        }
      }
    }
    result.h2hCount = h2hCount;
  }

  // ---------------------------------------------------------------
  // 4. First goal stats
  // ---------------------------------------------------------------
  if (scope === 'all' || scope === 'firstgoal') {
    const { data: activeTeamStats } = await supabase
      .from('team_match_stats')
      .select('team_id');
    const uniqueIds = new Set<number>();
    for (const row of activeTeamStats ?? []) {
      uniqueIds.add(row.team_id);
    }

    let firstGoalStats = 0;
    for (const teamId of uniqueIds) {
      try {
        await recalculateFirstGoalStats(teamId, supabase);
        firstGoalStats++;
      } catch (err) {
        console.error(`First goal stats error team=${teamId}:`, err);
      }
    }
    result.firstGoalStats = firstGoalStats;
  }

  return NextResponse.json(result);
}

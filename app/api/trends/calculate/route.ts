import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { calculatePlayerTrend, calculateTeamTrend, calculateH2H } from '@/lib/trends/engine';
import type { StatType } from '@/types/tip';

const PLAYER_STAT_TYPES: StatType[] = [
  // Discipline
  'yellow_card', 'red_card',
  // Fouls (raw + threshold)
  'foul_committed', 'foul_drawn',
  'player_1_plus_foul', 'player_2_plus_fouls',
  // Shots (raw + threshold)
  'shot', 'shot_on_target',
  'player_1_plus_shot', 'player_2_plus_shots', 'player_3_plus_shots',
  'player_1_plus_sot', 'player_2_plus_sot',
  // Attacking
  'goal', 'anytime_goalscorer', 'assist',
  // Combo
  'score_or_assist',
];

const TEAM_STAT_TYPES: StatType[] = [
  // Cards & discipline
  'yellow_card', 'red_card', 'foul_committed',
  // Goals
  'over_0_5_goals', 'over_1_5_goals', 'over_2_5_goals', 'over_3_5_goals',
  'btts', 'clean_sheet',
  // Corners
  'over_8_5_corners', 'over_9_5_corners', 'over_10_5_corners',
  // Match cards
  'over_2_5_cards', 'over_3_5_cards', 'over_4_5_cards',
  // Match fouls
  'over_20_5_fouls', 'over_22_5_fouls',
  // Result
  'home_win', 'away_win', 'draw',
  // Shooting
  'shot', 'shot_on_target',
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

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const now = new Date().toISOString();

  // ---------------------------------------------------------------
  // 1. Player trends
  // ---------------------------------------------------------------
  // player_match_stats stores player_id as the canonical api_id.
  const { data: players } = await supabase
    .from('players')
    .select('api_id')
    .limit(500);

  let playerTrends = 0;
  for (const player of players ?? []) {
    for (const statType of PLAYER_STAT_TYPES) {
      try {
        const trend = await calculatePlayerTrend(player.api_id, statType, supabase);
        if (trend) {
          await supabase.from('player_trends').upsert(
            { ...trend, updated_at: now },
            { onConflict: 'player_id,stat_type' }
          );
          playerTrends++;
        }
      } catch (err) {
        console.error(`Player trend error id=${player.api_id} stat=${statType}:`, err);
      }
    }
  }

  // ---------------------------------------------------------------
  // 2. Team trends — all goal, corner, card, result markets
  // ---------------------------------------------------------------
  // team_match_stats stores team_id as the api_id (via fixture FK convention)
  const { data: teams } = await supabase
    .from('teams')
    .select('api_id')
    .limit(100);

  let teamTrends = 0;
  for (const team of teams ?? []) {
    for (const statType of TEAM_STAT_TYPES) {
      try {
        const trend = await calculateTeamTrend(team.api_id, statType, supabase);
        if (trend) {
          await supabase.from('team_trends').upsert(
            { ...trend, updated_at: now },
            { onConflict: 'team_id,stat_type' }
          );
          teamTrends++;
        }
      } catch (err) {
        console.error(`Team trend error id=${team.api_id} stat=${statType}:`, err);
      }
    }
  }

  // ---------------------------------------------------------------
  // 3. Head-to-head — for upcoming fixtures
  // ---------------------------------------------------------------
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

  return NextResponse.json({ playerTrends, teamTrends, h2hCount });
}

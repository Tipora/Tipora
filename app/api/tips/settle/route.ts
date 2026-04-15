import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

  // ---------------------------------------------------------------
  // 1. Settle individual tips
  // ---------------------------------------------------------------
  const { data: pending } = await supabase
    .from('tips')
    .select('*, fixtures(status, home_score, away_score, home_team_id, away_team_id)')
    .eq('status', 'pending');

  let settled = 0;

  for (const tip of pending ?? []) {
    if (tip.fixtures?.status !== 'FT') continue;

    const fixture = tip.fixtures;
    let result: 'won' | 'lost' | 'void';

    if (fixture.status === 'PST' || fixture.status === 'CANC') {
      result = 'void';
    } else if (isPlayerMarket(tip.market_type)) {
      result = await settlePlayerTip(tip, supabase);
    } else if (isTeamStatMarket(tip.market_type)) {
      result = await settleTeamStatTip(tip, supabase);
    } else {
      result = settleMatchTip(
        tip.market_type,
        fixture.home_score ?? 0,
        fixture.away_score ?? 0,
        tip.fixture_id,
        fixture.home_team_id,
        tip.selection
      );
    }

    const pl = result === 'won'
      ? +(tip.odds * 10 - 10).toFixed(2)
      : result === 'lost' ? -10 : 0;

    try {
      const { error } = await supabase
        .from('tips')
        .update({
          status: result,
          return_amount: result === 'won' ? Math.round(tip.odds * 10 * 100) : 0,
          pl: Math.round(pl * 100),
          settled_at: new Date().toISOString(),
        })
        .eq('id', tip.id);

      if (error) throw error;
      settled++;
    } catch (err) {
      console.error(`Failed to settle tip ${tip.id}:`, err);
    }
  }

  // ---------------------------------------------------------------
  // 2. Settle accumulators
  // ---------------------------------------------------------------
  const { data: pendingAccas } = await supabase
    .from('accumulators')
    .select('*')
    .eq('status', 'pending');

  let accasSettled = 0;

  for (const acca of pendingAccas ?? []) {
    const tipIds: number[] = acca.tip_ids;
    const { data: accaTips } = await supabase
      .from('tips')
      .select('status')
      .in('id', tipIds);

    if (!accaTips) continue;

    const allSettled = accaTips.every(t => t.status !== 'pending');
    if (!allSettled) continue;

    const allWon = accaTips.every(t => t.status === 'won');
    const anyLost = accaTips.some(t => t.status === 'lost');
    const accaStatus = allWon ? 'won' : anyLost ? 'lost' : 'void';
    const accaPL = accaStatus === 'won'
      ? +(acca.combined_odds * 10 - 10).toFixed(2)
      : accaStatus === 'lost' ? -10 : 0;

    try {
      await supabase.from('accumulators').update({
        status: accaStatus,
        pl: Math.round(accaPL * 100),
      }).eq('id', acca.id);
      accasSettled++;
    } catch (err) {
      console.error(`Failed to settle acca ${acca.id}:`, err);
    }
  }

  return NextResponse.json({ settled, accasSettled });
}

// ---------------------------------------------------------------
// Match-level market settlement
// ---------------------------------------------------------------

function settleMatchTip(
  market: string,
  homeScore: number,
  awayScore: number,
  _fixtureId: number,
  _homeTeamId: number,
  _selection: string
): 'won' | 'lost' | 'void' {
  const total = homeScore + awayScore;

  switch (market) {
    // Goals
    case 'over_0_5_goals': return total > 0.5 ? 'won' : 'lost';
    case 'over_1_5_goals': return total > 1.5 ? 'won' : 'lost';
    case 'over_2_5_goals': return total > 2.5 ? 'won' : 'lost';
    case 'over_3_5_goals': return total > 3.5 ? 'won' : 'lost';
    case 'btts': return homeScore > 0 && awayScore > 0 ? 'won' : 'lost';
    // Result
    case 'home_win': return homeScore > awayScore ? 'won' : 'lost';
    case 'away_win': return awayScore > homeScore ? 'won' : 'lost';
    case 'draw': return homeScore === awayScore ? 'won' : 'lost';
    // Clean sheet
    case 'clean_sheet': return homeScore === 0 || awayScore === 0 ? 'won' : 'lost';
    // Half-time (can't determine from FT data alone)
    case 'first_half_goal': return 'void';
    case 'over_1_5_goals_ht': return 'void';
    // Corner/card/foul match totals need team_match_stats — handled below
    default: return 'void';
  }
}

// ---------------------------------------------------------------
// Team-stat market settlement (corners, cards, fouls)
// ---------------------------------------------------------------

const TEAM_STAT_MARKETS = [
  'over_8_5_corners', 'over_9_5_corners', 'over_10_5_corners',
  'over_2_5_cards', 'over_3_5_cards', 'over_4_5_cards',
  'over_20_5_fouls', 'over_22_5_fouls',
];

function isTeamStatMarket(market: string): boolean {
  return TEAM_STAT_MARKETS.includes(market);
}

async function settleTeamStatTip(
  tip: Record<string, unknown>,
  supabase: ReturnType<typeof createServerClient>
): Promise<'won' | 'lost' | 'void'> {
  const fixtureId = tip.fixture_id as number;
  const market = tip.market_type as string;

  // Get both teams' match stats
  const { data: stats } = await supabase
    .from('team_match_stats')
    .select('corners, yellow_cards, red_cards, fouls')
    .eq('fixture_id', fixtureId);

  if (!stats || stats.length < 2) return 'void';

  const totalCorners = stats.reduce((s: number, t: Record<string, number>) => s + (t.corners ?? 0), 0);
  const totalCards = stats.reduce((s: number, t: Record<string, number>) => s + (t.yellow_cards ?? 0) + (t.red_cards ?? 0), 0);
  const totalFouls = stats.reduce((s: number, t: Record<string, number>) => s + (t.fouls ?? 0), 0);

  switch (market) {
    case 'over_8_5_corners': return totalCorners > 8.5 ? 'won' : 'lost';
    case 'over_9_5_corners': return totalCorners > 9.5 ? 'won' : 'lost';
    case 'over_10_5_corners': return totalCorners > 10.5 ? 'won' : 'lost';
    case 'over_2_5_cards': return totalCards > 2.5 ? 'won' : 'lost';
    case 'over_3_5_cards': return totalCards > 3.5 ? 'won' : 'lost';
    case 'over_4_5_cards': return totalCards > 4.5 ? 'won' : 'lost';
    case 'over_20_5_fouls': return totalFouls > 20.5 ? 'won' : 'lost';
    case 'over_22_5_fouls': return totalFouls > 22.5 ? 'won' : 'lost';
    default: return 'void';
  }
}

// ---------------------------------------------------------------
// Player-level market settlement
// ---------------------------------------------------------------

const PLAYER_MARKETS = [
  // Raw stat markets
  'yellow_card', 'red_card', 'foul_committed', 'foul_drawn',
  'goal', 'anytime_goalscorer', 'assist',
  'shot', 'shot_on_target',
  // Threshold markets
  'player_1_plus_foul', 'player_2_plus_fouls',
  'player_1_plus_shot', 'player_2_plus_shots', 'player_3_plus_shots',
  'player_1_plus_sot', 'player_2_plus_sot',
  'score_or_assist',
];

function isPlayerMarket(market: string): boolean {
  return PLAYER_MARKETS.includes(market);
}

async function settlePlayerTip(
  tip: Record<string, unknown>,
  supabase: ReturnType<typeof createServerClient>
): Promise<'won' | 'lost' | 'void'> {
  const selection = tip.selection as string;
  const fixtureId = tip.fixture_id as number;
  const market = tip.market_type as string;

  const playerName = selection.split(' — ')[0]?.trim();
  if (!playerName) return 'void';

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('name', playerName)
    .single();

  if (!player) return 'void';

  const { data: stats } = await supabase
    .from('player_match_stats')
    .select('*')
    .eq('player_id', player.id)
    .eq('fixture_id', fixtureId)
    .single();

  if (!stats) return 'void';

  // Threshold checks — return 'won' if stat meets threshold
  const thresholdMap: Record<string, boolean> = {
    // Raw: > 0 means hit
    yellow_card: stats.yellow_cards > 0,
    red_card: stats.red_cards > 0,
    foul_committed: stats.fouls_committed > 0,
    foul_drawn: stats.fouls_drawn > 0,
    goal: stats.goals > 0,
    anytime_goalscorer: stats.goals > 0,
    assist: stats.assists > 0,
    shot: stats.shots > 0,
    shot_on_target: stats.shots_on_target > 0,
    // Fouls threshold
    player_1_plus_foul: stats.fouls_committed >= 1,
    player_2_plus_fouls: stats.fouls_committed >= 2,
    // Shots threshold
    player_1_plus_shot: stats.shots >= 1,
    player_2_plus_shots: stats.shots >= 2,
    player_3_plus_shots: stats.shots >= 3,
    // SOT threshold
    player_1_plus_sot: stats.shots_on_target >= 1,
    player_2_plus_sot: stats.shots_on_target >= 2,
    // Combo
    score_or_assist: (stats.goals + stats.assists) >= 1,
  };

  const result = thresholdMap[market];
  if (result === undefined) return 'void';
  return result ? 'won' : 'lost';
}

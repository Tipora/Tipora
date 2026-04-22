import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getFixtureContext, calculateH2H } from '@/lib/trends/engine';
import { scoreConfidence, totalConfidence } from '@/lib/trends/confidence';
import type { ExtendedScoringInput } from '@/lib/trends/confidence';
import { generateReasons } from '@/lib/trends/reasons';
import { getTagFromConfidenceAndOdds } from '@/lib/utils/markets';
import { todayUTC } from '@/lib/utils/dates';
import { getStoredOdds } from '@/lib/api-football/odds';
import type { StatType, PlayerTrend, TeamTrend } from '@/types/tip';
import type { Referee } from '@/types/fixture';

// Markets we scan for team-level tips
const TEAM_MARKETS: StatType[] = [
  // Goals
  'over_2_5_goals', 'over_1_5_goals', 'over_3_5_goals', 'btts',
  // Clean sheet
  'clean_sheet',
  // Corners
  'over_9_5_corners', 'over_10_5_corners',
  // Cards
  'over_2_5_cards', 'over_3_5_cards', 'over_4_5_cards',
  // Fouls
  'over_20_5_fouls', 'over_22_5_fouls',
  // Result
  'home_win', 'away_win', 'draw',
];

// Markets we scan for player-level tips
const PLAYER_MARKETS: StatType[] = [
  // Discipline
  'yellow_card',
  // Fouls
  'player_1_plus_foul', 'player_2_plus_fouls',
  // Shots
  'player_1_plus_shot', 'player_2_plus_shots', 'player_3_plus_shots',
  // Shots on target
  'player_1_plus_sot', 'player_2_plus_sot',
  // Attacking
  'anytime_goalscorer', 'assist',
  // Combo
  'score_or_assist',
];

// Odds market name mappings — use EXACT API-Football market names
// (odds.ts looks them up in MARKET_ALIASES for known variants)
const ODDS_MAP: Partial<Record<StatType, { market: string; selection: string }>> = {
  over_2_5_goals: { market: 'Goals Over/Under', selection: 'Over 2.5' },
  over_1_5_goals: { market: 'Goals Over/Under', selection: 'Over 1.5' },
  over_3_5_goals: { market: 'Goals Over/Under', selection: 'Over 3.5' },
  btts:          { market: 'Both Teams Score',  selection: 'Yes' },
  home_win:      { market: 'Match Winner',      selection: 'Home' },
  away_win:      { market: 'Match Winner',      selection: 'Away' },
  draw:          { market: 'Match Winner',      selection: 'Draw' },
  // Clean sheet is side-specific in API-Football — handled specially below
};

// Player markets with potentially available odds in API-Football
// The 'selection' is the player name which we plug in at lookup time
const PLAYER_ODDS_MAP: Partial<Record<StatType, { market: string }>> = {
  anytime_goalscorer: { market: 'Anytime Goal Scorer' },
  goal: { market: 'Anytime Goal Scorer' },
};

// Minimum confidence to publish
const MIN_CONFIDENCE = 70;
const MAX_TIPS_PER_DAY = 10;

interface TipCandidate {
  fixtureId: number;
  marketType: StatType;
  selection: string;
  odds: number;
  confidenceScore: number;
  confidenceBreakdown: ReturnType<typeof scoreConfidence>;
  reasons: string[];
  tag: ReturnType<typeof getTagFromConfidenceAndOdds>;
  source: 'player' | 'team';
}

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

  const date = todayUTC();

  // Delete previously generated PENDING tips for today so a re-run doesn't duplicate.
  // Settled tips (won/lost/void) are preserved — only unsettled pending ones are cleared.
  await supabase
    .from('tips')
    .delete()
    .eq('tip_date', date)
    .eq('status', 'pending');

  // Get upcoming not-started fixtures (today + next 6 days)
  // Tips are published ahead of kickoff — 7-day window catches weekend games.
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 6);
  const endStr = endDate.toISOString().split('T')[0];

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('*, home_team:teams!fixtures_home_team_id_fkey(id, api_id, name), away_team:teams!fixtures_away_team_id_fkey(id, api_id, name)')
    .eq('status', 'NS')
    .gte('kickoff_at', `${date}T00:00:00`)
    .lte('kickoff_at', `${endStr}T23:59:59`);

  if (!fixtures?.length) {
    return NextResponse.json({ generated: 0, message: 'No upcoming fixtures found in DB — run ingest first' });
  }

  const candidates: TipCandidate[] = [];

  for (const fixture of fixtures) {
    const homeTeamId = fixture.home_team_id;
    const awayTeamId = fixture.away_team_id;
    const homeName = fixture.home_team?.name ?? 'Home';
    const awayName = fixture.away_team?.name ?? 'Away';

    // Get fixture context (rest days, xG)
    const context = await getFixtureContext(
      homeTeamId, awayTeamId, fixture.kickoff_at, supabase
    );

    // Get referee
    let referee: Referee | null = null;
    if (fixture.referee_id) {
      const { data } = await supabase
        .from('referees')
        .select('*')
        .eq('id', fixture.referee_id)
        .single();
      referee = data;
    }

    // Odds now come from fixture_odds table (populated by /api/ingest/odds)
    // Using median across reputable bookmakers — no more live API calls here

    // ---------------------------------------------------------------
    // A. Team-level tips
    // ---------------------------------------------------------------
    for (const side of ['home', 'away'] as const) {
      const teamId = side === 'home' ? homeTeamId : awayTeamId;
      const teamName = side === 'home' ? homeName : awayName;
      const opponentName = side === 'home' ? awayName : homeName;
      const isHome = side === 'home';

      for (const statType of TEAM_MARKETS) {
        // Get stored trend
        const { data: trendRow } = await supabase
          .from('team_trends')
          .select('*')
          .eq('team_id', teamId)
          .eq('stat_type', statType)
          .single();

        if (!trendRow) continue;

        // Numeric columns come back as strings from Supabase — coerce
        const trend: TeamTrend = {
          ...trendRow,
          hit_rate_last_10: Number(trendRow.hit_rate_last_10),
          home_hit_rate: Number(trendRow.home_hit_rate),
          away_hit_rate: Number(trendRow.away_hit_rate),
        };

        if (trend.hit_rate_last_10 < 0.4) continue;

        // H2H for this market
        const h2h = await calculateH2H(homeTeamId, awayTeamId, statType, supabase);

        // Resolve real odds from our ingested fixture_odds table — median across reputable bookmakers
        const oddsMapping = ODDS_MAP[statType];
        const odds = oddsMapping
          ? await getStoredOdds(supabase, fixture.id, oddsMapping.market, oddsMapping.selection)
          : null;
        if (!odds) continue; // no real odds = no tip published

        const input: ExtendedScoringInput = {
          trend, referee, statType, odds, context, h2h, isHome,
        };

        const breakdown = scoreConfidence(input);
        const score = totalConfidence(breakdown);
        if (score < MIN_CONFIDENCE) continue;

        const reasons = generateReasons({
          trend, statType, referee, context, h2h, isHome,
          teamName, opponentName,
        });

        candidates.push({
          fixtureId: fixture.id,
          marketType: statType,
          selection: `${teamName} — ${statType}`,
          odds,
          confidenceScore: score,
          confidenceBreakdown: breakdown,
          reasons,
          tag: getTagFromConfidenceAndOdds(score, odds),
          source: 'team',
        });
      }
    }

    // ---------------------------------------------------------------
    // B. Player-level tips
    // ---------------------------------------------------------------
    // Get players from both teams who have strong trends
    for (const side of ['home', 'away'] as const) {
      const teamId = side === 'home' ? homeTeamId : awayTeamId;
      const isHome = side === 'home';
      const teamName = side === 'home' ? homeName : awayName;
      const opponentName = side === 'home' ? awayName : homeName;

      // Fetch players for this team first, then trends for those players.
      // We can't use Supabase embedded joins here because player_trends
      // has no foreign key declared to players.
      const { data: teamPlayers } = await supabase
        .from('players')
        .select('api_id, name')
        .eq('team_id', teamId);

      if (!teamPlayers?.length) continue;

      const playerIds = teamPlayers.map(p => p.api_id);
      const nameById = new Map(teamPlayers.map(p => [p.api_id, p.name]));

      const { data: strongTrends } = await supabase
        .from('player_trends')
        .select('*')
        .in('stat_type', PLAYER_MARKETS)
        .gte('streak_count', 1)
        .in('player_id', playerIds);

      for (const trendRow of strongTrends ?? []) {
        // Coerce numeric strings to numbers
        const trend: PlayerTrend = {
          ...trendRow,
          avg_last_5: Number(trendRow.avg_last_5),
          avg_last_10: Number(trendRow.avg_last_10),
          home_avg: Number(trendRow.home_avg),
          away_avg: Number(trendRow.away_avg),
        };
        const playerName = nameById.get(trend.player_id);
        if (!playerName) continue;

        const h2h = await calculateH2H(homeTeamId, awayTeamId, trend.stat_type as StatType, supabase);

        // Try to find real player prop odds from the stored odds table
        const playerOddsMapping = PLAYER_ODDS_MAP[trend.stat_type as StatType];
        let odds: number | null = null;
        if (playerOddsMapping) {
          odds = await getStoredOdds(supabase, fixture.id, playerOddsMapping.market, playerName);
        }
        if (!odds) continue; // no real odds available = skip

        const input: ExtendedScoringInput = {
          trend, referee, statType: trend.stat_type as StatType, odds, context, h2h, isHome,
        };

        const breakdown = scoreConfidence(input);
        const score = totalConfidence(breakdown);
        if (score < MIN_CONFIDENCE) continue;

        const reasons = generateReasons({
          trend,
          statType: trend.stat_type as StatType,
          referee, context, h2h, isHome,
          playerName, teamName, opponentName,
        });

        candidates.push({
          fixtureId: fixture.id,
          marketType: trend.stat_type as StatType,
          selection: `${playerName} — ${trend.stat_type}`,
          odds,
          confidenceScore: score,
          confidenceBreakdown: breakdown,
          reasons,
          tag: getTagFromConfidenceAndOdds(score, odds),
          source: 'player',
        });
      }
    }
  }

  // 2. Rank candidates and pick top N
  candidates.sort((a, b) => {
    // Primary: confidence score descending
    if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
    // Secondary: prefer team markets (more settleable)
    if (a.source !== b.source) return a.source === 'team' ? -1 : 1;
    // Tertiary: higher odds = more value
    return b.odds - a.odds;
  });

  // Deduplicate: max 1 tip per fixture+market combo
  const seen = new Set<string>();
  const finalTips: TipCandidate[] = [];
  for (const c of candidates) {
    const key = `${c.fixtureId}-${c.marketType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    finalTips.push(c);
    if (finalTips.length >= MAX_TIPS_PER_DAY) break;
  }

  // 3. Insert into tips table
  let generated = 0;
  for (const tip of finalTips) {
    try {
      const { error } = await supabase.from('tips').insert({
        fixture_id: tip.fixtureId,
        market_type: tip.marketType,
        selection: tip.selection,
        odds: tip.odds,
        confidence_score: tip.confidenceScore,
        confidence_breakdown: tip.confidenceBreakdown,
        reasons: tip.reasons,
        acca_eligible: true,
        acca_type: null,
        status: 'pending',
        tip_date: date,
        stake: 1000,
        tag: tip.tag,
      });
      if (error) throw error;
      generated++;
    } catch (err) {
      console.error('Tip insert error:', err);
    }
  }

  return NextResponse.json({
    generated,
    date,
    candidatesScanned: candidates.length,
    fixturesScanned: fixtures.length,
  });
}


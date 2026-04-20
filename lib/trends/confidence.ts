import type { Referee } from '@/types/fixture';
import type { StatType, PlayerTrend, TeamTrend, ConfidenceBreakdown } from '@/types/tip';
import type { FixtureContext, H2HResult } from './engine';

// ---------------------------------------------------------------------------
// Extended scoring input — used by the real tip generator
// ---------------------------------------------------------------------------

export interface ExtendedScoringInput {
  trend: PlayerTrend | TeamTrend;
  referee: Referee | null;
  statType: StatType;
  odds: number;
  context: FixtureContext;
  h2h: H2HResult | null;
  isHome: boolean; // is the trended team the home side?
}

// ---------------------------------------------------------------------------
// Main scoring — 5 components, each 0-20, total 0-100
// ---------------------------------------------------------------------------

export function scoreConfidence(input: ExtendedScoringInput): ConfidenceBreakdown {
  return {
    trend: scoreTrend(input.trend, input.isHome),
    xg: scoreXG(input.context, input.statType),
    referee: scoreReferee(input.referee, input.statType),
    context: scoreContext(input.context, input.h2h, input.isHome),
    value: scoreValue(input.odds, input.trend, input.isHome),
  };
}

export function totalConfidence(breakdown: ConfidenceBreakdown): number {
  return breakdown.trend + breakdown.xg + breakdown.referee + breakdown.context + breakdown.value;
}

// ---------------------------------------------------------------------------
// 1. TREND (0-20) — streak strength + consistency + venue split
// ---------------------------------------------------------------------------

function scoreTrend(trend: PlayerTrend | TeamTrend, isHome: boolean): number {
  if (!trend) return 0;

  // Streak: each consecutive hit is worth 2.5 pts, capped at 10
  const streakScore = Math.min(trend.streak_count * 2.5, 10);

  // Consistency: how often does this stat hit?
  let consistency: number;
  if ('avg_last_10' in trend) {
    // Player trend — avg_last_10 is the raw average (e.g. 1.3 fouls/game)
    consistency = Math.min(trend.avg_last_10 * 2, 6);
  } else {
    // Team trend — hit_rate_last_10 is 0-1
    consistency = Math.min(trend.hit_rate_last_10 * 8, 6);
  }

  // Venue bonus: does the trend hold at this venue?
  let venueBonus = 0;
  if ('home_avg' in trend) {
    const venueAvg = isHome ? trend.home_avg : trend.away_avg;
    if (venueAvg > trend.avg_last_10) venueBonus = 2;
    else if (venueAvg >= trend.avg_last_10 * 0.8) venueBonus = 1;
  } else {
    const venueRate = isHome ? trend.home_hit_rate : trend.away_hit_rate;
    if (venueRate > trend.hit_rate_last_10) venueBonus = 2;
    else if (venueRate >= trend.hit_rate_last_10 * 0.8) venueBonus = 1;
  }

  return Math.round(Math.min(streakScore + consistency + venueBonus, 20));
}

// ---------------------------------------------------------------------------
// 2. XG (0-20) — expected goals profile of both teams
// ---------------------------------------------------------------------------

const CLEAN_SHEET_MARKETS: StatType[] = ['clean_sheet'];
const DRAW_MARKETS: StatType[] = ['draw'];

function scoreXG(ctx: FixtureContext, statType: StatType): number {
  const totalXG = ctx.homeXGAvg + ctx.awayXGAvg;

  // Clean sheet markets — LOWER xG is better
  if (CLEAN_SHEET_MARKETS.includes(statType)) {
    if (totalXG <= 1.5) return 18;
    if (totalXG <= 2.0) return 14;
    if (totalXG <= 2.5) return 10;
    return 5;
  }

  // Draw markets — evenly matched xG is better
  if (DRAW_MARKETS.includes(statType)) {
    const diff = Math.abs(ctx.homeXGAvg - ctx.awayXGAvg);
    if (diff <= 0.2) return 18;
    if (diff <= 0.4) return 14;
    if (diff <= 0.6) return 10;
    return 5;
  }

  // Shot markets — high xG implies attacking intent = more shots
  if (SHOT_MARKETS.includes(statType)) {
    if (totalXG >= 3.0) return 18;
    if (totalXG >= 2.5) return 15;
    if (totalXG >= 2.0) return 12;
    if (totalXG >= 1.5) return 9;
    return 6;
  }

  // Goal markets and default — high combined xG is good
  if (totalXG >= 3.5) return 20;
  if (totalXG >= 3.0) return 17;
  if (totalXG >= 2.5) return 14;
  if (totalXG >= 2.0) return 11;
  if (totalXG >= 1.5) return 8;
  if (totalXG >= 1.0) return 5;
  return 3;
}

// ---------------------------------------------------------------------------
// 3. REFEREE (0-20) — how well does the ref profile match the market?
// ---------------------------------------------------------------------------

const CARD_MARKETS: StatType[] = [
  'yellow_card', 'red_card',
  'over_2_5_cards', 'over_3_5_cards', 'over_4_5_cards',
];
const FOUL_MARKETS: StatType[] = [
  'foul_committed', 'foul_drawn',
  'player_1_plus_foul', 'player_2_plus_fouls',
  'over_20_5_fouls', 'over_22_5_fouls',
];
const SHOT_MARKETS: StatType[] = [
  'shot', 'shot_on_target',
  'player_1_plus_shot', 'player_2_plus_shots', 'player_3_plus_shots',
  'player_1_plus_sot', 'player_2_plus_sot',
];
const GOAL_MARKETS: StatType[] = [
  'goal', 'anytime_goalscorer', 'assist',
  'over_0_5_goals', 'over_1_5_goals', 'over_2_5_goals', 'over_3_5_goals',
  'btts', 'first_half_goal', 'over_1_5_goals_ht',
];

function scoreReferee(referee: Referee | null, statType: StatType): number {
  if (!referee || referee.games_officiated < 5) return 5;

  // Card markets — card-happy refs boost confidence
  if (CARD_MARKETS.includes(statType)) {
    const cards = referee.avg_yellow_cards;
    if (cards >= 6.0) return 20;
    if (cards >= 5.0) return 17;
    if (cards >= 4.5) return 15;
    if (cards >= 4.0) return 12;
    if (cards >= 3.5) return 10;
    if (cards >= 3.0) return 7;
    return 4;
  }

  // Foul markets — refs who let play flow = fewer fouls
  if (FOUL_MARKETS.includes(statType)) {
    const fouls = referee.avg_fouls;
    if (fouls >= 28) return 18;
    if (fouls >= 24) return 15;
    if (fouls >= 22) return 12;
    if (fouls >= 20) return 10;
    return 6;
  }

  // Shot markets — aggressive refs breaking up play = fewer shots (mild negative)
  if (SHOT_MARKETS.includes(statType)) {
    const fouls = referee.avg_fouls;
    if (fouls >= 28) return 7;  // lots of stoppages
    if (fouls >= 24) return 9;
    return 12; // flowing game = more shots
  }

  // Goal markets — referees with high booking points tend to give more pens/cards disrupting play
  if (GOAL_MARKETS.includes(statType)) {
    return 10; // neutral — goals mainly driven by team quality
  }

  return 10;
}

// ---------------------------------------------------------------------------
// 4. CONTEXT (0-20) — rest days, congestion, H2H, venue
// ---------------------------------------------------------------------------

function scoreContext(
  ctx: FixtureContext,
  h2h: H2HResult | null,
  isHome: boolean
): number {
  let score = 6; // lower baseline to make room for opponent difficulty

  // Rest days
  const ownRest = isHome ? ctx.homeRestDays : ctx.awayRestDays;
  if (ownRest >= 7) score += 2;
  else if (ownRest >= 5) score += 1;
  else if (ownRest <= 2) score -= 2;
  else if (ownRest <= 3) score -= 1;

  // Opponent fatigue
  const oppRest = isHome ? ctx.awayRestDays : ctx.homeRestDays;
  if (oppRest <= 3) score += 2;

  // H2H
  if (h2h) {
    if (h2h.hit_rate_last_10 >= 0.8) score += 3;
    else if (h2h.hit_rate_last_10 >= 0.6) score += 2;
    else if (h2h.hit_rate_last_10 <= 0.2) score -= 2;
  }

  // Home advantage
  if (isHome) score += 1;

  // --- OPPONENT DIFFICULTY ---
  const oppGoalsConceded = isHome ? ctx.awayGoalsConceded : ctx.homeGoalsConceded;
  const oppCleanSheetRate = isHome ? ctx.awayCleanSheetRate : ctx.homeCleanSheetRate;
  const oppWinRate = isHome ? ctx.awayWinRate : ctx.homeWinRate;

  // Opponent leaks goals = easier for attacking tips
  if (oppGoalsConceded >= 2.0) score += 3;
  else if (oppGoalsConceded >= 1.5) score += 2;
  else if (oppGoalsConceded >= 1.0) score += 0;
  else score -= 2; // very tight defence

  // Opponent keeps clean sheets often = harder
  if (oppCleanSheetRate >= 0.5) score -= 2;
  else if (oppCleanSheetRate >= 0.3) score -= 1;

  // Opponent wins a lot = tougher match
  if (oppWinRate >= 0.7) score -= 2;
  else if (oppWinRate >= 0.5) score -= 1;
  else if (oppWinRate <= 0.2) score += 2; // relegation-level opponent

  return Math.min(Math.max(score, 0), 20);
}

// ---------------------------------------------------------------------------
// Opponent strength label — for display on fixture pages
// ---------------------------------------------------------------------------

export function getOpponentStrengthLabel(
  ctx: FixtureContext,
  isHome: boolean
): { label: string; color: string } {
  const oppWinRate = isHome ? ctx.awayWinRate : ctx.homeWinRate;
  const oppGoalsConceded = isHome ? ctx.awayGoalsConceded : ctx.homeGoalsConceded;

  const difficultyScore = oppWinRate * 50 + (1 - oppGoalsConceded / 3) * 50;

  if (difficultyScore >= 70) return { label: 'Very Hard', color: '#f87171' };
  if (difficultyScore >= 55) return { label: 'Hard', color: '#fb923c' };
  if (difficultyScore >= 40) return { label: 'Medium', color: '#fbbf24' };
  if (difficultyScore >= 25) return { label: 'Easy', color: '#4ade80' };
  return { label: 'Very Easy', color: '#34d399' };
}

// ---------------------------------------------------------------------------
// 5. VALUE (0-20) — our probability vs bookmaker implied probability
// ---------------------------------------------------------------------------

function scoreValue(
  odds: number,
  trend: PlayerTrend | TeamTrend,
  isHome: boolean
): number {
  // Our estimated probability the selection hits
  let ourProb: number;
  if ('avg_last_10' in trend) {
    // Player trend: avg_last_10 is raw count. For "did it happen" markets,
    // any value > 0 means a hit, so probability = how often avg > 0
    // Use last_n_games hit rate for a cleaner signal
    const hits = trend.last_n_games.filter(v => v > 0).length;
    ourProb = hits / Math.max(trend.last_n_games.length, 1);
    // Adjust for venue
    const venueAvg = isHome ? trend.home_avg : trend.away_avg;
    if (venueAvg > trend.avg_last_10) ourProb = Math.min(ourProb + 0.05, 1);
  } else {
    // Team trend: hit_rate_last_10 is already a probability
    ourProb = isHome ? trend.home_hit_rate : trend.away_hit_rate;
    // Fallback to overall if venue sample is tiny
    if (ourProb === 0 && trend.hit_rate_last_10 > 0) {
      ourProb = trend.hit_rate_last_10;
    }
  }

  const bookProb = 1 / odds;
  const edge = ourProb - bookProb;

  if (edge >= 0.20) return 20;
  if (edge >= 0.15) return 17;
  if (edge >= 0.10) return 14;
  if (edge >= 0.05) return 11;
  if (edge >= 0.02) return 8;
  if (edge >= 0.00) return 6;
  if (edge >= -0.05) return 4;
  return 2;
}

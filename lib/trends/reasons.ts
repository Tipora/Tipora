import type { PlayerTrend, TeamTrend, StatType } from '@/types/tip';
import type { Referee } from '@/types/fixture';
import type { FixtureContext, H2HResult } from './engine';
import { MARKET_LABELS } from '@/lib/utils/markets';

interface ReasonInput {
  trend: PlayerTrend | TeamTrend;
  statType: StatType;
  referee: Referee | null;
  context: FixtureContext;
  h2h: H2HResult | null;
  isHome: boolean;
  playerName?: string;
  teamName?: string;
  opponentName?: string;
}

/**
 * Generates up to 4 plain-English reason bullets for a tip.
 * Ordered by strength: trend → referee → context → H2H.
 */
export function generateReasons(input: ReasonInput): string[] {
  const reasons: string[] = [];
  const market = MARKET_LABELS[input.statType] ?? input.statType;

  // 1. Trend reason — always first
  reasons.push(buildTrendReason(input));

  // 2. Referee reason — if relevant
  const refReason = buildRefereeReason(input.referee, input.statType);
  if (refReason) reasons.push(refReason);

  // 3. Context reason — rest days, congestion, venue
  const ctxReason = buildContextReason(input);
  if (ctxReason) reasons.push(ctxReason);

  // 4. H2H reason
  const h2hReason = buildH2HReason(input.h2h, market);
  if (h2hReason) reasons.push(h2hReason);

  return reasons.slice(0, 4);
}

// ---------------------------------------------------------------------------

function buildTrendReason(input: ReasonInput): string {
  const { trend, statType, playerName, teamName, isHome } = input;
  const subject = playerName ?? teamName ?? 'Selection';
  const venue = isHome ? 'at home' : 'away';

  if ('avg_last_10' in trend) {
    // Player trend
    const hitCount = trend.last_n_games.filter(v => v > 0).length;

    if (trend.streak_count >= 5) {
      return `${subject} has hit ${formatStat(statType)} in ${trend.streak_count} consecutive games`;
    }
    if (trend.streak_count >= 3) {
      return `${subject} on a ${trend.streak_count}-game streak for ${formatStat(statType)} (avg ${trend.avg_last_5.toFixed(1)} over last 5)`;
    }
    if (hitCount >= 7) {
      return `${subject} has hit ${formatStat(statType)} in ${hitCount} of last 10 games (avg ${trend.avg_last_10.toFixed(1)})`;
    }
    const venueAvg = isHome ? trend.home_avg : trend.away_avg;
    return `${subject} averages ${trend.avg_last_10.toFixed(1)} ${formatStat(statType)} per game (${venueAvg.toFixed(1)} ${venue})`;
  }

  // Team trend
  const pct = (trend.hit_rate_last_10 * 100).toFixed(0);
  const venueRate = isHome ? trend.home_hit_rate : trend.away_hit_rate;
  const venuePct = (venueRate * 100).toFixed(0);

  if (trend.streak_count >= 5) {
    return `${subject} have seen ${formatStat(statType)} land in ${trend.streak_count} straight matches`;
  }
  if (trend.streak_count >= 3) {
    return `${subject} on a ${trend.streak_count}-game run for ${formatStat(statType)} (${pct}% hit rate last 10)`;
  }
  return `${formatStat(statType)} has landed in ${pct}% of ${subject}'s last 10 games (${venuePct}% ${venue})`;
}

function buildRefereeReason(referee: Referee | null, statType: StatType): string | null {
  if (!referee || referee.games_officiated < 5) return null;

  const cardMarkets: StatType[] = ['yellow_card', 'red_card', 'foul_committed', 'foul_drawn'];
  if (!cardMarkets.includes(statType)) return null;

  if (referee.avg_yellow_cards >= 4.5) {
    return `Referee ${referee.name} averages ${referee.avg_yellow_cards.toFixed(1)} yellow cards per game across ${referee.games_officiated} matches`;
  }
  if (referee.avg_yellow_cards >= 3.5) {
    return `${referee.name} is a card-happy referee — ${referee.avg_yellow_cards.toFixed(1)} yellows per game`;
  }
  if (referee.avg_fouls >= 24) {
    return `${referee.name} allows ${referee.avg_fouls.toFixed(0)} fouls per game on average`;
  }
  return null;
}

function buildContextReason(input: ReasonInput): string | null {
  const { context, isHome, teamName, opponentName } = input;
  const subject = teamName ?? 'Team';
  const opponent = opponentName ?? 'Opponent';
  const ownRest = isHome ? context.homeRestDays : context.awayRestDays;
  const oppRest = isHome ? context.awayRestDays : context.homeRestDays;

  if (oppRest <= 3 && ownRest >= 5) {
    return `${opponent} played just ${oppRest} days ago while ${subject} have had ${ownRest} days' rest`;
  }
  if (context.isCongested && ownRest <= 3) {
    return `Fixture congestion — ${subject} played ${ownRest} days ago, fatigue could be a factor`;
  }

  const totalXG = context.homeXGAvg + context.awayXGAvg;
  if (totalXG >= 3.0) {
    return `Both teams average a combined ${totalXG.toFixed(1)} xG — high-scoring fixture expected`;
  }
  if (totalXG >= 2.5) {
    return `Combined xG of ${totalXG.toFixed(1)} suggests goals in this matchup`;
  }

  return null;
}

function buildH2HReason(h2h: H2HResult | null, market: string): string | null {
  if (!h2h) return null;

  const pct = (h2h.hit_rate_last_10 * 100).toFixed(0);
  if (h2h.hit_rate_last_10 >= 0.7) {
    return `${market} has hit in ${pct}% of the last ${Math.round(1 / h2h.hit_rate_last_10 * h2h.hit_rate_last_10 * 10)} head-to-head meetings`;
  }
  if (h2h.hit_rate_last_10 >= 0.5) {
    return `Head-to-head record shows ${market} landing ${pct}% of the time`;
  }
  return null;
}

// ---------------------------------------------------------------------------

function formatStat(statType: StatType): string {
  const friendly: Partial<Record<StatType, string>> = {
    // Player discipline
    foul_committed: 'a foul',
    foul_drawn: 'a foul won',
    yellow_card: 'a booking',
    red_card: 'a red card',
    // Player fouls threshold
    player_1_plus_foul: '1+ fouls',
    player_2_plus_fouls: '2+ fouls',
    // Player shots threshold
    player_1_plus_shot: '1+ shots',
    player_2_plus_shots: '2+ shots',
    player_3_plus_shots: '3+ shots',
    player_1_plus_sot: '1+ shots on target',
    player_2_plus_sot: '2+ shots on target',
    // Player attacking
    goal: 'a goal',
    anytime_goalscorer: 'a goal',
    assist: 'an assist',
    // Player combo
    score_or_assist: 'a goal or assist',
    // Match goals
    btts: 'Both Teams to Score',
    over_0_5_goals: 'Over 0.5 Goals',
    over_1_5_goals: 'Over 1.5 Goals',
    over_2_5_goals: 'Over 2.5 Goals',
    over_3_5_goals: 'Over 3.5 Goals',
    // Match corners
    over_8_5_corners: 'Over 8.5 Corners',
    over_9_5_corners: 'Over 9.5 Corners',
    over_10_5_corners: 'Over 10.5 Corners',
    // Match cards
    over_2_5_cards: 'Over 2.5 Cards',
    over_3_5_cards: 'Over 3.5 Cards',
    over_4_5_cards: 'Over 4.5 Cards',
    // Match fouls
    over_20_5_fouls: 'Over 20.5 Match Fouls',
    over_22_5_fouls: 'Over 22.5 Match Fouls',
    // Other
    clean_sheet: 'a clean sheet',
    first_half_goal: 'a first-half goal',
    home_win: 'a home win',
    away_win: 'an away win',
    draw: 'a draw',
    // First goal
    home_first_goal: 'scoring the first goal (home)',
    away_first_goal: 'scoring the first goal (away)',
    first_goal_before_30: 'a goal before the 30th minute',
    first_goal_before_15: 'a goal before the 15th minute',
    // Time period
    goal_first_half: 'a goal in the first half',
    goal_second_half: 'a goal in the second half',
    goal_in_both_halves: 'a goal in both halves',
    goal_0_30: 'a goal before 30 min',
    goal_after_75: 'a goal after 75 min',
    // Half stats
    team_over_6_5_fouls_h1: '7+ team fouls in 1H',
    team_over_6_5_fouls_h2: '7+ team fouls in 2H',
    card_in_first_half: 'a card in the first half',
    card_in_second_half: 'a card in the second half',
    // Advanced team
    over_2_5_offsides: '3+ offsides',
    over_3_5_offsides: '4+ offsides',
    team_over_5_5_saves: '6+ goalkeeper saves',
    // Player
    player_1_plus_cross: '1+ successful cross',
    player_2_plus_crosses: '2+ successful crosses',
    player_2_plus_tackles: '2+ tackles',
    player_3_plus_tackles: '3+ tackles',
    player_1_plus_interception: '1+ interception',
    player_1_plus_aerial: '1+ aerial duel won',
    goalkeeper_3_plus_saves: '3+ GK saves',
    goalkeeper_5_plus_saves: '5+ GK saves',
  };
  return friendly[statType] ?? statType;
}

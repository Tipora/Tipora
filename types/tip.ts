export type StatType =
  // Player card & discipline
  | 'yellow_card' | 'red_card'
  // Player fouls (threshold)
  | 'foul_committed'     // raw (legacy)
  | 'foul_drawn'         // raw (legacy)
  | 'player_1_plus_foul' // 1+ fouls committed
  | 'player_2_plus_fouls'// 2+ fouls committed
  // Player shots (threshold)
  | 'shot'               // raw (legacy)
  | 'shot_on_target'     // raw (legacy)
  | 'player_1_plus_shot' // 1+ total shots
  | 'player_2_plus_shots'// 2+ total shots
  | 'player_3_plus_shots'// 3+ total shots
  | 'player_1_plus_sot'  // 1+ shots on target
  | 'player_2_plus_sot'  // 2+ shots on target
  // Player attacking
  | 'goal' | 'anytime_goalscorer'
  | 'assist'
  // Player combo
  | 'score_or_assist'       // goal or assist in the match
  // Match goals
  | 'btts'
  | 'over_0_5_goals' | 'over_1_5_goals' | 'over_2_5_goals' | 'over_3_5_goals'
  // Match corners
  | 'over_8_5_corners' | 'over_9_5_corners' | 'over_10_5_corners'
  // Match cards
  | 'over_2_5_cards' | 'over_3_5_cards' | 'over_4_5_cards'
  // Match fouls
  | 'over_20_5_fouls' | 'over_22_5_fouls'
  // Half-time
  | 'first_half_goal' | 'over_1_5_goals_ht'
  // Clean sheet
  | 'clean_sheet'
  // Result
  | 'home_win' | 'away_win' | 'draw'
  // Time period goals (based on goals_by_period)
  | 'goal_first_half'        // at least one goal in 0-45
  | 'goal_second_half'       // at least one goal in 46-90
  | 'goal_in_both_halves'    // goal in each half
  | 'goal_0_30'              // goal before 30th minute
  | 'goal_after_75'          // goal after 75th minute
  // Half stats
  | 'team_over_6_5_fouls_h1' // 7+ team fouls in 1H
  | 'team_over_6_5_fouls_h2' // 7+ team fouls in 2H
  | 'card_in_first_half'     // at least 1 card in 1H
  | 'card_in_second_half'    // at least 1 card in 2H
  // Advanced team
  | 'over_2_5_offsides'      // match offsides > 2.5
  | 'over_3_5_offsides'      // match offsides > 3.5
  | 'team_over_5_5_saves'    // goalkeeper 6+ saves
  // Player — crosses, tackles, interceptions, aerial
  | 'player_1_plus_cross'    // 1+ successful cross
  | 'player_2_plus_crosses'  // 2+ successful crosses
  | 'player_2_plus_tackles'  // 2+ tackles
  | 'player_3_plus_tackles'  // 3+ tackles
  | 'player_1_plus_interception' // 1+ interception
  | 'player_1_plus_aerial'   // 1+ aerial duel won
  | 'goalkeeper_3_plus_saves'// GK 3+ saves
  | 'goalkeeper_5_plus_saves'// GK 5+ saves
  // First goal
  | 'home_first_goal'   // home team scores first
  | 'away_first_goal'   // away team scores first
  | 'first_goal_before_30' // first goal scored before 30th minute
  | 'first_goal_before_15'; // first goal scored before 15th minute

export type TipTag = 'BANKER' | 'VALUE' | 'BOLD' | 'LONGSHOT';
export type TipStatus = 'pending' | 'won' | 'lost' | 'void';

export interface ConfidenceBreakdown {
  trend: number;
  xg: number;
  referee: number;
  context: number;
  value: number;
}

export interface Tip {
  id: number;
  fixture_id: number;
  market_type: StatType;
  selection: string;
  odds: number;
  confidence_score: number;
  confidence_breakdown: ConfidenceBreakdown;
  reasons: string[];
  acca_eligible: boolean;
  acca_type: 'game' | 'weekend' | null;
  status: TipStatus;
  tip_date: string;
  settled_at: string | null;
  stake: number;
  return_amount: number | null;
  pl: number | null;
  tag: TipTag;
  created_at: string;
}

export interface PlayerTrend {
  id?: number;
  player_id: number;
  stat_type: StatType;
  streak_count: number;
  last_n_games: number[];
  avg_last_5: number;
  avg_last_10: number;
  home_avg: number;
  away_avg: number;
  updated_at?: string;
}

export interface TeamTrend {
  id?: number;
  team_id: number;
  stat_type: StatType;
  streak_count: number;
  hit_rate_last_10: number;
  home_hit_rate: number;
  away_hit_rate: number;
  updated_at?: string;
}

export type PLPeriod = 'day' | 'week' | 'month' | 'season' | 'allTime';

export interface PLStats {
  wins: number;
  losses: number;
  voids: number;
  totalPL: number;
  staked: number;
  roi: number;
  period: PLPeriod;
}

export interface ScoringInput {
  trend: PlayerTrend | TeamTrend;
  fixture: import('./fixture').Fixture;
  referee: import('./fixture').Referee | null;
  statType: StatType;
  odds: number;
}

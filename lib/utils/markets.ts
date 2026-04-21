import type { StatType, TipTag } from '@/types/tip';

export const MARKET_LABELS: Record<StatType, string> = {
  // Player discipline
  yellow_card: 'To Be Carded',
  red_card: 'Red Card',
  // Player fouls
  foul_committed: 'Fouls Committed',
  foul_drawn: 'Fouls Drawn',
  player_1_plus_foul: '1+ Fouls',
  player_2_plus_fouls: '2+ Fouls',
  // Player shots
  shot: 'Shots',
  shot_on_target: 'Shots on Target',
  player_1_plus_shot: '1+ Shots',
  player_2_plus_shots: '2+ Shots',
  player_3_plus_shots: '3+ Shots',
  player_1_plus_sot: '1+ Shots on Target',
  player_2_plus_sot: '2+ Shots on Target',
  // Player attacking
  goal: 'To Score',
  anytime_goalscorer: 'Anytime Goalscorer',
  assist: 'To Assist',
  // Player combo
  score_or_assist: 'Goal or Assist',
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
  // Half-time
  first_half_goal: 'First Half Goal',
  over_1_5_goals_ht: 'Over 1.5 Goals (HT)',
  // Clean sheet
  clean_sheet: 'Clean Sheet',
  // Result
  home_win: 'Home Win',
  away_win: 'Away Win',
  draw: 'Draw',
  // First goal
  home_first_goal: 'Home to Score First',
  away_first_goal: 'Away to Score First',
  first_goal_before_30: 'Goal Before 30 Min',
  first_goal_before_15: 'Goal Before 15 Min',
  // Time period
  goal_first_half: 'Goal in 1st Half',
  goal_second_half: 'Goal in 2nd Half',
  goal_in_both_halves: 'Goal in Both Halves',
  goal_0_30: 'Goal in First 30 Min',
  goal_after_75: 'Goal After 75 Min',
  // Half stats
  team_over_6_5_fouls_h1: '1H Team Fouls Over 6.5',
  team_over_6_5_fouls_h2: '2H Team Fouls Over 6.5',
  card_in_first_half: 'Card in 1st Half',
  card_in_second_half: 'Card in 2nd Half',
  // Advanced team
  over_2_5_offsides: 'Over 2.5 Offsides',
  over_3_5_offsides: 'Over 3.5 Offsides',
  team_over_5_5_saves: 'Goalkeeper 6+ Saves',
  // Player — crosses, tackles, interceptions
  player_1_plus_cross: '1+ Successful Crosses',
  player_2_plus_crosses: '2+ Successful Crosses',
  player_2_plus_tackles: '2+ Tackles',
  player_3_plus_tackles: '3+ Tackles',
  player_1_plus_interception: '1+ Interception',
  player_1_plus_aerial: '1+ Aerial Duel Won',
  goalkeeper_3_plus_saves: 'Goalkeeper 3+ Saves',
  goalkeeper_5_plus_saves: 'Goalkeeper 5+ Saves',
};

export const TAG_COLORS: Record<TipTag, string> = {
  BANKER: '#60efff',
  VALUE: '#00ff87',
  BOLD: '#ffd60a',
  LONGSHOT: '#ff4d6d',
};

export function getTagFromConfidenceAndOdds(confidence: number, odds: number): TipTag {
  if (confidence >= 85 && odds < 1.50) return 'BANKER';
  if (odds >= 3.00 && confidence >= 70) return 'LONGSHOT';
  if (confidence >= 80) return 'VALUE';
  return 'BOLD';
}

import type { Tip, PLStats } from '@/types/tip';
import type { Accumulator } from '@/types/acca';

const TODAY = new Date().toISOString().split('T')[0];

export const DEMO_TIPS: Tip[] = [
  {
    id: 1,
    fixture_id: 1,
    market_type: 'over_2_5_goals',
    selection: 'Arsenal vs Tottenham — Over 2.5 Goals',
    odds: 1.72,
    confidence_score: 87,
    confidence_breakdown: { trend: 16, xg: 18, referee: 12, context: 15, value: 14 },
    reasons: [
      'Over 2.5 Goals has landed in 80% of Arsenal\'s last 10 home games',
      'Combined xG of 3.2 — high-scoring fixture expected',
      'Referee Anthony Taylor averages 4.9 cards per game — open, physical matches',
      'Head-to-head: Over 2.5 Goals in 70% of last 10 meetings',
    ],
    acca_eligible: true,
    acca_type: null,
    status: 'pending',
    tip_date: TODAY,
    settled_at: null,
    stake: 1000,
    return_amount: null,
    pl: null,
    tag: 'BANKER',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    fixture_id: 2,
    market_type: 'player_1_plus_foul',
    selection: 'Casemiro — 1+ Fouls',
    odds: 1.44,
    confidence_score: 91,
    confidence_breakdown: { trend: 18, xg: 10, referee: 17, context: 14, value: 16 },
    reasons: [
      'Casemiro has committed 1+ fouls in 9 consecutive games',
      'Averages 2.3 fouls per game (2.7 at home)',
      'Referee Michael Oliver allows 22 fouls per game on average',
    ],
    acca_eligible: true,
    acca_type: null,
    status: 'pending',
    tip_date: TODAY,
    settled_at: null,
    stake: 1000,
    return_amount: null,
    pl: null,
    tag: 'BANKER',
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    fixture_id: 3,
    market_type: 'player_2_plus_shots',
    selection: 'Mohamed Salah — 2+ Shots',
    odds: 1.65,
    confidence_score: 84,
    confidence_breakdown: { trend: 17, xg: 16, referee: 11, context: 14, value: 13 },
    reasons: [
      'Salah has had 2+ shots in 8 of his last 10 appearances',
      'Averages 3.1 shots per game this season',
      'Liverpool average a combined xG of 3.4 — plenty of attacking opportunities',
    ],
    acca_eligible: true,
    acca_type: null,
    status: 'pending',
    tip_date: TODAY,
    settled_at: null,
    stake: 1000,
    return_amount: null,
    pl: null,
    tag: 'VALUE',
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    fixture_id: 2,
    market_type: 'btts',
    selection: 'Manchester United vs Liverpool — BTTS',
    odds: 1.80,
    confidence_score: 79,
    confidence_breakdown: { trend: 14, xg: 17, referee: 10, context: 16, value: 12 },
    reasons: [
      'BTTS has landed in 70% of Man Utd\'s last 10 games',
      'Combined xG of 3.1 suggests goals from both sides',
      'Head-to-head: BTTS in 80% of last 10 meetings',
    ],
    acca_eligible: true,
    acca_type: null,
    status: 'pending',
    tip_date: TODAY,
    settled_at: null,
    stake: 1000,
    return_amount: null,
    pl: null,
    tag: 'VALUE',
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    fixture_id: 4,
    market_type: 'player_1_plus_sot',
    selection: 'Cole Palmer — 1+ Shots on Target',
    odds: 1.55,
    confidence_score: 82,
    confidence_breakdown: { trend: 16, xg: 14, referee: 12, context: 12, value: 14 },
    reasons: [
      'Palmer has had 1+ SOT in 7 consecutive matches',
      'Averages 1.8 shots on target per game at home',
      'Chelsea average 2.9 xG at home this season',
    ],
    acca_eligible: true,
    acca_type: null,
    status: 'pending',
    tip_date: TODAY,
    settled_at: null,
    stake: 1000,
    return_amount: null,
    pl: null,
    tag: 'BANKER',
    created_at: new Date().toISOString(),
  },
  {
    id: 6,
    fixture_id: 5,
    market_type: 'over_3_5_cards',
    selection: 'Barcelona vs Real Madrid — Over 3.5 Cards',
    odds: 1.90,
    confidence_score: 76,
    confidence_breakdown: { trend: 13, xg: 10, referee: 17, context: 16, value: 10 },
    reasons: [
      'El Clasico averages 5.2 cards per game over last 10 meetings',
      'Referee profile: 4.8 yellow cards per match on average',
      'High-stakes fixture — derby intensity increases card count',
    ],
    acca_eligible: true,
    acca_type: null,
    status: 'pending',
    tip_date: TODAY,
    settled_at: null,
    stake: 1000,
    return_amount: null,
    pl: null,
    tag: 'BOLD',
    created_at: new Date().toISOString(),
  },
];

export const DEMO_GAME_ACCA: Accumulator = {
  id: 1,
  acca_type: 'game',
  tip_ids: [1, 2, 5],
  combined_odds: 3.84,
  stake: 1000,
  potential_return: 3840,
  status: 'pending',
  acca_date: TODAY,
  label: { label: 'Value Acca', color: '#00ff87' },
};

export const DEMO_WEEK_STATS: PLStats = {
  wins: 24,
  losses: 18,
  voids: 2,
  totalPL: 31.40,
  staked: 420,
  roi: 7.5,
  period: 'week',
};

export const DEMO_SETTLED_TIPS: Tip[] = [
  { ...DEMO_TIPS[0], id: 101, status: 'won', pl: 720, odds: 1.72, tip_date: getPastDate(1), settled_at: getPastDate(1) },
  { ...DEMO_TIPS[1], id: 102, status: 'won', pl: 440, odds: 1.44, tip_date: getPastDate(1), settled_at: getPastDate(1) },
  { ...DEMO_TIPS[3], id: 103, status: 'lost', pl: -1000, odds: 1.80, tip_date: getPastDate(1), settled_at: getPastDate(1) },
  { ...DEMO_TIPS[2], id: 104, status: 'won', pl: 650, odds: 1.65, tip_date: getPastDate(2), settled_at: getPastDate(2) },
  { ...DEMO_TIPS[4], id: 105, status: 'won', pl: 550, odds: 1.55, tip_date: getPastDate(2), settled_at: getPastDate(2) },
  { ...DEMO_TIPS[5], id: 106, status: 'lost', pl: -1000, odds: 1.90, tip_date: getPastDate(2), settled_at: getPastDate(2) },
  { ...DEMO_TIPS[0], id: 107, status: 'won', pl: 720, odds: 1.72, tip_date: getPastDate(3), settled_at: getPastDate(3) },
  { ...DEMO_TIPS[1], id: 108, status: 'lost', pl: -1000, odds: 1.44, tip_date: getPastDate(3), settled_at: getPastDate(3) },
];

export const DEMO_GRAPH_DATA = Array.from({ length: 7 }).map((_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: date.toISOString().split('T')[0],
    cumulative: +(5 + Math.sin(i) * 15 + i * 3).toFixed(2),
  };
});

function getPastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

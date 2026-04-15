import { describe, it, expect } from 'vitest';
import { scoreConfidence, totalConfidence } from '@/lib/trends/confidence';
import type { ExtendedScoringInput } from '@/lib/trends/confidence';
import type { PlayerTrend, TeamTrend } from '@/types/tip';

function makePlayerTrend(overrides: Partial<PlayerTrend> = {}): PlayerTrend {
  return {
    player_id: 1,
    stat_type: 'yellow_card',
    streak_count: 5,
    last_n_games: [1, 1, 1, 1, 1, 0, 1, 0, 1, 0],
    avg_last_5: 1.0,
    avg_last_10: 0.7,
    home_avg: 0.8,
    away_avg: 0.6,
    ...overrides,
  };
}

function makeTeamTrend(overrides: Partial<TeamTrend> = {}): TeamTrend {
  return {
    team_id: 1,
    stat_type: 'over_2_5_goals',
    streak_count: 4,
    hit_rate_last_10: 0.8,
    home_hit_rate: 0.9,
    away_hit_rate: 0.7,
    ...overrides,
  };
}

function makeInput(overrides: Partial<ExtendedScoringInput> = {}): ExtendedScoringInput {
  return {
    trend: makePlayerTrend(),
    referee: { id: 1, api_id: 1, name: 'Test Ref', avg_yellow_cards: 4.5, avg_red_cards: 0.2, avg_fouls: 24, avg_booking_points: 40, games_officiated: 50, updated_at: '' },
    statType: 'yellow_card',
    odds: 1.80,
    context: { homeRestDays: 7, awayRestDays: 4, homeXGAvg: 1.5, awayXGAvg: 1.3, isCongested: false },
    h2h: null,
    isHome: true,
    ...overrides,
  };
}

describe('scoreConfidence', () => {
  it('returns breakdown with 5 components', () => {
    const breakdown = scoreConfidence(makeInput());
    expect(breakdown).toHaveProperty('trend');
    expect(breakdown).toHaveProperty('xg');
    expect(breakdown).toHaveProperty('referee');
    expect(breakdown).toHaveProperty('context');
    expect(breakdown).toHaveProperty('value');
  });

  it('each component is between 0 and 20', () => {
    const breakdown = scoreConfidence(makeInput());
    for (const val of Object.values(breakdown)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(20);
    }
  });

  it('total is between 0 and 100', () => {
    const total = totalConfidence(scoreConfidence(makeInput()));
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(100);
  });

  it('higher streak = higher trend score', () => {
    const low = scoreConfidence(makeInput({ trend: makePlayerTrend({ streak_count: 1 }) }));
    const high = scoreConfidence(makeInput({ trend: makePlayerTrend({ streak_count: 6 }) }));
    expect(high.trend).toBeGreaterThan(low.trend);
  });

  it('card-happy referee boosts card market score', () => {
    const loRef = makeInput({ referee: { id: 1, api_id: 1, name: 'Ref', avg_yellow_cards: 2.0, avg_red_cards: 0, avg_fouls: 18, avg_booking_points: 20, games_officiated: 50, updated_at: '' } });
    const hiRef = makeInput({ referee: { id: 1, api_id: 1, name: 'Ref', avg_yellow_cards: 5.5, avg_red_cards: 0.3, avg_fouls: 26, avg_booking_points: 50, games_officiated: 50, updated_at: '' } });
    expect(scoreConfidence(hiRef).referee).toBeGreaterThan(scoreConfidence(loRef).referee);
  });

  it('team trend with high hit rate scores well', () => {
    const input = makeInput({
      trend: makeTeamTrend({ hit_rate_last_10: 0.9, streak_count: 6 }),
      statType: 'over_2_5_goals',
      odds: 1.70,
    });
    const total = totalConfidence(scoreConfidence(input));
    expect(total).toBeGreaterThanOrEqual(60);
  });
});

describe('totalConfidence', () => {
  it('sums all 5 components', () => {
    const breakdown = { trend: 15, xg: 12, referee: 10, context: 14, value: 11 };
    expect(totalConfidence(breakdown)).toBe(62);
  });
});

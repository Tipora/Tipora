import { describe, it, expect } from 'vitest';
import type { Tip } from '@/types/tip';

// Test the correlation logic extracted from acca-builder
const CORRELATED_PAIRS: [string, string][] = [
  ['over_2_5_goals', 'btts'],
  ['over_3_5_goals', 'over_2_5_goals'],
  ['over_3_5_goals', 'btts'],
  ['home_win', 'over_2_5_goals'],
  ['away_win', 'over_2_5_goals'],
  ['clean_sheet', 'btts'],
  ['clean_sheet', 'over_2_5_goals'],
  ['clean_sheet', 'over_3_5_goals'],
  ['away_win', 'clean_sheet'],
  ['draw', 'home_win'],
  ['draw', 'away_win'],
  ['over_3_5_cards', 'over_4_5_cards'],
  ['over_2_5_cards', 'over_3_5_cards'],
  ['over_20_5_fouls', 'over_22_5_fouls'],
];

function isCorrelated(tip: Pick<Tip, 'fixture_id' | 'market_type'>, existing: Pick<Tip, 'fixture_id' | 'market_type'>[]): boolean {
  return existing.some(leg => {
    if (leg.fixture_id !== tip.fixture_id) return false;
    return CORRELATED_PAIRS.some(
      ([a, b]) =>
        (leg.market_type === a && tip.market_type === b) ||
        (leg.market_type === b && tip.market_type === a)
    );
  });
}

describe('acca correlation', () => {
  it('detects correlated O2.5 + BTTS from same fixture', () => {
    const existing = [{ fixture_id: 1, market_type: 'over_2_5_goals' as const }];
    expect(isCorrelated({ fixture_id: 1, market_type: 'btts' }, existing)).toBe(true);
  });

  it('allows O2.5 + BTTS from different fixtures', () => {
    const existing = [{ fixture_id: 1, market_type: 'over_2_5_goals' as const }];
    expect(isCorrelated({ fixture_id: 2, market_type: 'btts' }, existing)).toBe(false);
  });

  it('detects draw + home_win conflict', () => {
    const existing = [{ fixture_id: 1, market_type: 'home_win' as const }];
    expect(isCorrelated({ fixture_id: 1, market_type: 'draw' }, existing)).toBe(true);
  });

  it('detects clean_sheet + over_2_5_goals conflict', () => {
    const existing = [{ fixture_id: 1, market_type: 'clean_sheet' as const }];
    expect(isCorrelated({ fixture_id: 1, market_type: 'over_2_5_goals' }, existing)).toBe(true);
  });

  it('allows unrelated markets from same fixture', () => {
    const existing = [{ fixture_id: 1, market_type: 'yellow_card' as const }];
    expect(isCorrelated({ fixture_id: 1, market_type: 'over_2_5_goals' }, existing)).toBe(false);
  });
});

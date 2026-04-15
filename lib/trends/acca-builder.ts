import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tip } from '@/types/tip';
import type { Accumulator, AccaLabel } from '@/types/acca';

const CORRELATED_PAIRS: [string, string][] = [
  // Goal markets that imply each other
  ['over_2_5_goals', 'btts'],
  ['over_3_5_goals', 'over_2_5_goals'],
  ['over_3_5_goals', 'btts'],
  // Result + goals
  ['home_win', 'over_2_5_goals'],
  ['away_win', 'over_2_5_goals'],
  // Clean sheet contradicts BTTS/high goals
  ['clean_sheet', 'btts'],
  ['clean_sheet', 'over_2_5_goals'],
  ['clean_sheet', 'over_3_5_goals'],
  ['away_win', 'clean_sheet'],
  // Draw contradicts home/away win
  ['draw', 'home_win'],
  ['draw', 'away_win'],
  // Card/foul markets from same match
  ['over_3_5_cards', 'over_4_5_cards'],
  ['over_2_5_cards', 'over_3_5_cards'],
  ['over_20_5_fouls', 'over_22_5_fouls'],
];

export async function buildGameAcca(
  date: string,
  supabase: SupabaseClient
): Promise<Accumulator | null> {
  const { data: tips } = await supabase
    .from('tips')
    .select('*')
    .eq('tip_date', date)
    .gte('confidence_score', 70)
    .eq('status', 'pending')
    .order('confidence_score', { ascending: false });

  if (!tips?.length) return null;

  const legs: Tip[] = [];
  const usedFixtures = new Set<number>();
  const marketCounts = new Map<string, number>();

  for (const tip of tips as Tip[]) {
    if (legs.length >= 5) break;
    if (usedFixtures.has(tip.fixture_id)) continue;
    if (isCorrelated(tip, legs)) continue;

    const count = marketCounts.get(tip.market_type) ?? 0;
    if (count >= 2) continue;

    legs.push(tip);
    usedFixtures.add(tip.fixture_id);
    marketCounts.set(tip.market_type, count + 1);
  }

  if (legs.length < 3) return null;

  const combinedOdds = +legs.reduce((acc, t) => acc * t.odds, 1).toFixed(2);

  return {
    acca_type: 'game',
    tip_ids: legs.map(t => t.id),
    combined_odds: combinedOdds,
    stake: 1000,
    potential_return: Math.round(combinedOdds * 10 * 100),
    status: 'pending',
    acca_date: date,
    label: getAccaLabel(combinedOdds),
  };
}

export async function buildWeekendAcca(
  weekStart: string,
  weekEnd: string,
  supabase: SupabaseClient
): Promise<Accumulator | null> {
  const { data: tips } = await supabase
    .from('tips')
    .select('*')
    .gte('tip_date', weekStart)
    .lte('tip_date', weekEnd)
    .gte('confidence_score', 72)
    .eq('status', 'pending')
    .order('confidence_score', { ascending: false });

  if (!tips?.length) return null;

  const legs: Tip[] = [];
  const usedFixtures = new Set<number>();
  const marketTypes = new Set<string>();
  const marketCounts = new Map<string, number>();

  for (const tip of tips as Tip[]) {
    if (legs.length >= 6) break;
    if (usedFixtures.has(tip.fixture_id)) continue;
    if (isCorrelated(tip, legs)) continue;

    const count = marketCounts.get(tip.market_type) ?? 0;
    if (count >= 2) continue;

    legs.push(tip);
    usedFixtures.add(tip.fixture_id);
    marketTypes.add(tip.market_type);
    marketCounts.set(tip.market_type, count + 1);
  }

  if (legs.length < 4) return null;
  if (marketTypes.size < 2) return null;

  const combinedOdds = +legs.reduce((acc, t) => acc * t.odds, 1).toFixed(2);

  return {
    acca_type: 'weekend',
    tip_ids: legs.map(t => t.id),
    combined_odds: combinedOdds,
    stake: 1000,
    potential_return: Math.round(combinedOdds * 10 * 100),
    status: 'pending',
    acca_date: weekStart,
    label: getAccaLabel(combinedOdds),
  };
}

function isCorrelated(tip: Tip, existing: Tip[]): boolean {
  return existing.some(leg => {
    if (leg.fixture_id !== tip.fixture_id) return false;
    return CORRELATED_PAIRS.some(
      ([a, b]) =>
        (leg.market_type === a && tip.market_type === b) ||
        (leg.market_type === b && tip.market_type === a)
    );
  });
}

function getAccaLabel(odds: number): AccaLabel {
  if (odds < 2.5) return { label: 'Banker Acca', color: '#60efff' };
  if (odds < 5.0) return { label: 'Value Acca', color: '#00ff87' };
  if (odds < 10.0) return { label: 'Bold Acca', color: '#ffd60a' };
  return { label: 'Longshot Acca', color: '#ff4d6d' };
}

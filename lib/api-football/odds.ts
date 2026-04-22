import { apiFetch } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

interface APIOddsResponse {
  fixture: { id: number };
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{ value: string; odd: string }>;
    }>;
  }>;
}

// Reputable bookmakers — we only use odds from these to avoid outlier pricing
const REPUTABLE_BOOKMAKERS = new Set([
  'Bet365',
  'Pinnacle',
  'William Hill',
  'Bwin',
  '888sport',
  'Unibet',
  'Betway',
  'Marathonbet',
  'Betfair',
]);

export async function fetchOddsForFixture(fixtureId: number): Promise<APIOddsResponse[]> {
  return apiFetch<APIOddsResponse>('/odds', {
    fixture: String(fixtureId),
  });
}

/**
 * Extract the MEDIAN odds for a market+selection across reputable bookmakers.
 * Median is far more robust than "best" — one outlier can't distort the price.
 */
export function extractDecimalOdds(
  oddsData: APIOddsResponse[],
  marketName: string,
  selection: string
): number | null {
  const samples: number[] = [];

  for (const resp of oddsData) {
    for (const bm of resp.bookmakers) {
      if (!REPUTABLE_BOOKMAKERS.has(bm.name)) continue;
      for (const bet of bm.bets) {
        if (!matchesMarket(bet.name, marketName)) continue;
        const found = bet.values.find(v => matchesSelection(v.value, selection));
        if (found) {
          const odds = parseFloat(found.odd);
          if (!isNaN(odds) && odds > 1) samples.push(odds);
        }
      }
    }
  }

  if (samples.length === 0) {
    // Fall back to ALL bookmakers if no reputable ones have this market
    for (const resp of oddsData) {
      for (const bm of resp.bookmakers) {
        for (const bet of bm.bets) {
          if (!matchesMarket(bet.name, marketName)) continue;
          const found = bet.values.find(v => matchesSelection(v.value, selection));
          if (found) {
            const odds = parseFloat(found.odd);
            if (!isNaN(odds) && odds > 1) samples.push(odds);
          }
        }
      }
    }
  }

  return samples.length > 0 ? median(samples) : null;
}

/**
 * Get odds for a fixture from the fixture_odds table (ingested copy).
 * Returns median across reputable bookmakers, or null if none found.
 */
export async function getStoredOdds(
  supabase: SupabaseClient,
  fixtureId: number,
  market: string,
  selection: string
): Promise<number | null> {
  const { data } = await supabase
    .from('fixture_odds')
    .select('bookmaker, odds')
    .eq('fixture_id', fixtureId);

  if (!data?.length) return null;

  // Filter to matching market+selection using same fuzzy logic
  // We need to also fetch market/selection — expand the query
  const { data: filtered } = await supabase
    .from('fixture_odds')
    .select('bookmaker, market, selection, odds')
    .eq('fixture_id', fixtureId);

  if (!filtered?.length) return null;

  const reputable: number[] = [];
  const allSamples: number[] = [];

  for (const row of filtered) {
    if (!matchesMarket(row.market, market)) continue;
    if (!matchesSelection(row.selection, selection)) continue;
    const odds = Number(row.odds);
    if (isNaN(odds) || odds <= 1) continue;
    if (REPUTABLE_BOOKMAKERS.has(row.bookmaker)) reputable.push(odds);
    allSamples.push(odds);
  }

  if (reputable.length > 0) return median(reputable);
  if (allSamples.length > 0) return median(allSamples);
  return null;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const val = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return +val.toFixed(2);
}

function matchesMarket(actual: string, target: string): boolean {
  const a = actual.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (a === t) return true;
  if (a.includes(t)) return true;

  const aliases: Record<string, string[]> = {
    'over/under': ['goals over/under', 'match goals', 'over under'],
    'both teams score': ['both teams to score', 'btts'],
    'match winner': ['match winner', 'home/away', '1x2'],
    'clean sheet': ['clean sheet', 'clean sheet home', 'clean sheet away'],
  };

  for (const [key, vals] of Object.entries(aliases)) {
    if (t === key && vals.some(v => a === v || a.includes(v))) return true;
  }

  return false;
}

function matchesSelection(actual: string, target: string): boolean {
  const a = actual.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (a === t) return true;
  // STRICT: for numeric selections like "Over 2.5", avoid matching "Over 22.5"
  // Only allow substring if the boundary is safe
  if (a.startsWith(t + ' ') || a.endsWith(' ' + t) || a === t) return true;
  return false;
}

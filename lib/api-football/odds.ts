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

// Reputable bookmakers only
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

/**
 * EXACT market names used by API-Football — we only match against these.
 * Fuzzy/contains matching caused "Over/Under" to match "Home Over/Under"
 * and "Corners Over/Under" producing wildly wrong odds.
 */
const MARKET_ALIASES: Record<string, string[]> = {
  // Match total goals
  'Goals Over/Under': ['Goals Over/Under', 'Over/Under', 'Match Goals'],
  // Both Teams to Score (match level)
  'Both Teams Score': ['Both Teams Score', 'Both Teams To Score'],
  // Match winner (1X2)
  'Match Winner': ['Match Winner'],
  // Clean Sheet — API splits into home/away
  'Clean Sheet - Home': ['Clean Sheet - Home'],
  'Clean Sheet - Away': ['Clean Sheet - Away'],
  // Anytime goal scorer
  'Anytime Goal Scorer': ['Anytime Goal Scorer', 'Goalscorer'],
};

export async function fetchOddsForFixture(fixtureId: number): Promise<APIOddsResponse[]> {
  return apiFetch<APIOddsResponse>('/odds', {
    fixture: String(fixtureId),
  });
}

/**
 * Extract the MEDIAN odds for a market+selection across reputable bookmakers.
 * Uses STRICT market matching (no substring) — only exact name or known alias.
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
        if (!isMatchingMarket(bet.name, marketName)) continue;
        const found = bet.values.find(v => isMatchingSelection(v.value, selection));
        if (found) {
          const odds = parseFloat(found.odd);
          if (!isNaN(odds) && odds > 1) samples.push(odds);
        }
      }
    }
  }

  return samples.length > 0 ? median(samples) : null;
}

/**
 * Get median odds from the ingested fixture_odds table.
 */
export async function getStoredOdds(
  supabase: SupabaseClient,
  fixtureId: number,
  market: string,
  selection: string
): Promise<number | null> {
  const { data } = await supabase
    .from('fixture_odds')
    .select('bookmaker, market, selection, odds')
    .eq('fixture_id', fixtureId);

  if (!data?.length) return null;

  const reputable: number[] = [];
  const allSamples: number[] = [];

  for (const row of data) {
    if (!isMatchingMarket(row.market, market)) continue;
    if (!isMatchingSelection(row.selection, selection)) continue;
    const odds = Number(row.odds);
    if (isNaN(odds) || odds <= 1) continue;
    if (REPUTABLE_BOOKMAKERS.has(row.bookmaker)) reputable.push(odds);
    allSamples.push(odds);
  }

  if (reputable.length >= 2) return median(reputable);
  if (allSamples.length >= 2) return median(allSamples);
  if (reputable.length === 1) return reputable[0];
  if (allSamples.length === 1) return allSamples[0];
  return null;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const val = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return +val.toFixed(2);
}

/**
 * STRICT market matching — exact match or a known alias.
 * Never substring, because "Over/Under" would also match "Home Team Over/Under".
 */
function isMatchingMarket(actualRaw: string, targetRaw: string): boolean {
  const actual = actualRaw.trim();
  const target = targetRaw.trim();

  if (actual.toLowerCase() === target.toLowerCase()) return true;

  const aliases = MARKET_ALIASES[target];
  if (!aliases) return false;

  return aliases.some(a => a.toLowerCase() === actual.toLowerCase());
}

/**
 * Selection matching — exact or safe boundary substring (won't match "Over 22.5" for "Over 2.5")
 */
function isMatchingSelection(actualRaw: string, targetRaw: string): boolean {
  const actual = actualRaw.toLowerCase().trim();
  const target = targetRaw.toLowerCase().trim();

  if (actual === target) return true;
  // Allow a trailing word suffix like "Over 2.5 Goals"
  if (actual.startsWith(target + ' ')) return true;
  if (actual.endsWith(' ' + target)) return true;
  return false;
}

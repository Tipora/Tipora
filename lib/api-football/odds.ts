import { apiFetch } from './client';

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

/**
 * Fetch odds from ALL bookmakers for a fixture.
 * API-Football returns up to ~20 bookmakers per call — we pick best odds later.
 */
export async function fetchOddsForFixture(fixtureId: number): Promise<APIOddsResponse[]> {
  return apiFetch<APIOddsResponse>('/odds', {
    fixture: String(fixtureId),
  });
}

/**
 * Extract the BEST (highest) decimal odds for a market+selection across all bookmakers.
 * Returns null if no bookmaker offers this market.
 */
export function extractDecimalOdds(
  oddsData: APIOddsResponse[],
  marketName: string,
  selection: string
): number | null {
  let best: number | null = null;

  for (const resp of oddsData) {
    for (const bm of resp.bookmakers) {
      for (const bet of bm.bets) {
        if (matchesMarket(bet.name, marketName)) {
          const found = bet.values.find(v => matchesSelection(v.value, selection));
          if (found) {
            const odds = parseFloat(found.odd);
            if (!isNaN(odds) && (best === null || odds > best)) {
              best = odds;
            }
          }
        }
      }
    }
  }

  return best;
}

/**
 * Fuzzy match market name against common API-Football variations.
 */
function matchesMarket(actual: string, target: string): boolean {
  const a = actual.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  // Exact match
  if (a === t) return true;

  // Target is a substring of actual (e.g. "Over/Under" in "Goals Over/Under")
  if (a.includes(t)) return true;

  // Common aliases
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
  if (a.includes(t)) return true;
  // Home/Away sometimes returns team names — fall back to fuzzy contains
  return false;
}

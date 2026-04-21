import { TRACKED_COMPETITIONS } from '@/types/fixture';

const API_BASE = 'https://v3.football.api-sports.io';

// In-memory counters (reset per serverless cold start)
let requestCount = 0;
let requestWindowStart = Date.now();
const MAX_REQUESTS_PER_DAY = 7500; // Pro plan daily limit

// Throttling: API-Football Pro allows 300 req/min = 5 req/sec
// We pace at 4/sec (250ms gap) to stay comfortably under
let lastRequestAt = 0;
const MIN_REQUEST_GAP_MS = 250;

// Retry config for 429 responses
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function apiFetch<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T[]> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.warn('API_FOOTBALL_KEY not set — skipping API call');
    return [];
  }

  // Reset counter every 24h
  if (Date.now() - requestWindowStart > 86_400_000) {
    requestCount = 0;
    requestWindowStart = Date.now();
  }

  if (requestCount >= MAX_REQUESTS_PER_DAY) {
    console.error(`API-Football daily limit reached (${MAX_REQUESTS_PER_DAY})`);
    return [];
  }

  // Throttle: wait if we're too close to the last request
  const now = Date.now();
  const sinceLast = now - lastRequestAt;
  if (sinceLast < MIN_REQUEST_GAP_MS) {
    await sleep(MIN_REQUEST_GAP_MS - sinceLast);
  }
  lastRequestAt = Date.now();

  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  requestCount++;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const res = await fetch(url.toString(), {
        headers: { 'x-apisports-key': apiKey },
      });

      const elapsed = Date.now() - startTime;

      // Handle 429 with exponential backoff
      if (res.status === 429 && attempt < MAX_RETRIES) {
        const backoffMs = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`API-Football 429 on ${endpoint} — retrying in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(backoffMs);
        lastRequestAt = Date.now();
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`API-Football ${res.status} ${endpoint} (${elapsed}ms): ${body.slice(0, 200)}`);
        throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Check for API-level errors
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.error(`API-Football errors on ${endpoint}:`, data.errors);
        return [];
      }

      return (data.response ?? []) as T[];
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        const elapsed = Date.now() - startTime;
        console.error(`API-Football fetch failed ${endpoint} (${elapsed}ms):`, err);
        throw err;
      }
      // Retry on transient errors
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
    }
  }

  throw new Error(`API-Football: max retries exceeded on ${endpoint}`);
}

/**
 * Get the current football season year.
 * Seasons run Aug-May. If we're in Jan-Jul, the season started last year.
 */
export function getCurrentSeason(): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  return month >= 8 ? year : year - 1;
}

export function getTrackedLeagueIds(): number[] {
  return Object.values(TRACKED_COMPETITIONS).map(c => c.api_id);
}

/**
 * Get current API usage stats (approximate — resets on cold start).
 */
export function getApiUsage(): { requestCount: number; maxRequests: number; windowStarted: string } {
  return {
    requestCount,
    maxRequests: MAX_REQUESTS_PER_DAY,
    windowStarted: new Date(requestWindowStart).toISOString(),
  };
}

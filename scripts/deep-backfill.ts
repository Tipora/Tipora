/**
 * Deep historical backfill — pulls the ENTIRE current season of fixtures
 * (one API call per league) plus player/team stats for up to 800 finished matches.
 *
 * Run: npx tsx scripts/deep-backfill.ts
 *
 * Budget: ~1,650 API calls total
 *   8 leagues × 1 season call     = 8
 *   800 FT fixtures × 2 (players + team stats) = 1,600
 *   Upcoming fixtures odds        = ~60
 *
 * Far more efficient than daily ingest — gets 300+ matches per team.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const envPath = resolve(process.cwd(), '.env.local');
  const contents = readFileSync(envPath, 'utf-8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
} catch {}

const BASE = 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('Missing CRON_SECRET in .env.local');
  process.exit(1);
}

async function call(name: string, path: string) {
  process.stdout.write(`${name}... `);
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000); // 15-min timeout
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET! },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const body = await res.json().catch(() => ({}));
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (!res.ok) {
      console.log(`FAILED (${res.status}, ${elapsed}s)`);
      console.log('  ', body);
      return body;
    }
    console.log(`OK (${elapsed}s)`);
    console.log('  ', body);
    return body;
  } catch (err) {
    clearTimeout(timeoutId);
    console.log('ERROR', err instanceof Error ? err.message : err);
    return null;
  }
}

async function run() {
  console.log(`Deep backfill against ${BASE}\n`);
  console.log('Step 1/8: Pulling ENTIRE season of fixtures from all 8 leagues...');

  // Step 1: season-wide fixture pull (8 API calls total vs 300+ for day-by-day)
  await call('Ingest full season', '/api/ingest/season');

  // Step 2: update any live/pending fixtures + pull first-goal data for recent FT
  await call('Ingest results', '/api/ingest/results');

  // Step 3: pull player match stats for up to 500 FT fixtures (biggest draw on API)
  await call(
    'Ingest player stats (500 FT fixtures)',
    '/api/ingest/players?limit=500&onlyMissing=1'
  );

  // Step 4: pull team match stats for up to 500 FT fixtures
  await call(
    'Ingest team stats (500 FT fixtures)',
    '/api/ingest/team-stats?limit=500&onlyMissing=1'
  );

  // Step 5: pull odds for upcoming fixtures
  await call(
    'Ingest odds for upcoming fixtures',
    '/api/ingest/odds?limit=80&onlyMissing=1'
  );

  // Step 6: recalculate trends (paginated player + team)
  console.log('\nStep 6: Recalculating trends (paginated)...');

  let offset = 0;
  const pageSize = 100;
  while (true) {
    const body = await call(
      `Recalc player trends (offset ${offset})`,
      `/api/trends/calculate?scope=players&offset=${offset}&limit=${pageSize}`
    );
    if (!body || body.nextOffset == null) break;
    offset = body.nextOffset;
  }

  offset = 0;
  while (true) {
    const body = await call(
      `Recalc team trends (offset ${offset})`,
      `/api/trends/calculate?scope=teams&offset=${offset}&limit=${pageSize}`
    );
    if (!body || body.teamsNextOffset == null) break;
    offset = body.teamsNextOffset;
  }

  await call('Recalc referee stats', '/api/trends/referees');
  await call('Recalc H2H',           '/api/trends/calculate?scope=h2h');
  await call('Recalc first-goal',    '/api/trends/calculate?scope=firstgoal');

  // Step 7: generate tips and build acca
  console.log('\nStep 7: Generating tips with the expanded history...');
  await call('Generate tips',  '/api/tips/generate');
  await call('Build game acca', '/api/acca/game');
  await call('Settle tips',     '/api/tips/settle');

  console.log('\nDeep backfill complete. Teams should now have 20-40+ matches of history.');
  console.log('Visit http://localhost:3000/tips to see fresh tips.');
}

run();

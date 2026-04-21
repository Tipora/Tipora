/**
 * Backfill historical match data so trends can be calculated for real teams.
 *
 * 1. Pulls fixtures for last 30 days + next 7 days (all 8 tracked leagues)
 * 2. Pulls player stats for up to 200 recent FT fixtures
 * 3. Recalculates trends, generates tips, builds acca
 *
 * Run: npx tsx scripts/backfill.ts
 *
 * This is a one-off operation after first adding API-Football integration.
 * The daily cron handles incremental updates from there.
 *
 * Budget: ~400 API requests (one call per league per date + one per FT fixture).
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
  // 10-minute timeout per call for long-running backfill jobs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);
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
    } else {
      console.log(`OK (${elapsed}s)`);
      console.log('  ', body);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.log('ERROR');
    console.log('  ', err instanceof Error ? err.message : err);
  }
}

async function run() {
  console.log(`Backfilling historical data from ${BASE}\n`);

  // Step 1: pull 30 days back + 7 forward = 38 days × 8 leagues = ~304 API calls
  await call(
    'Ingest fixtures (30d back + 7d forward)',
    '/api/ingest/fixtures?daysBack=30&daysForward=7'
  );

  // Step 2: update any live/pending fixtures to FT (needed before player stats)
  await call('Ingest results (update live scores + first goals)', '/api/ingest/results');

  // Step 3: pull player match stats for up to 200 FT fixtures
  await call(
    'Ingest player stats (up to 200 FT fixtures)',
    '/api/ingest/players?limit=200&onlyMissing=1'
  );

  // Step 3b: pull team match stats (shots, corners, cards, xG, possession, etc)
  await call(
    'Ingest team stats (up to 200 FT fixtures)',
    '/api/ingest/team-stats?limit=200&onlyMissing=1'
  );

  // Step 3c: pull odds for upcoming fixtures so real-bookmaker odds flow into tips
  await call(
    'Ingest odds for upcoming fixtures',
    '/api/ingest/odds?limit=60&onlyMissing=1'
  );

  // Step 4: recalculate trends in batches (split to avoid Next.js timeout)
  // Player trends are paginated in batches of 100 — loops until nextOffset is null.
  let offset = 0;
  const pageSize = 100;
  while (true) {
    const url = `/api/trends/calculate?scope=players&offset=${offset}&limit=${pageSize}`;
    process.stdout.write(`Recalc player trends (offset ${offset})... `);
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      const res = await fetch(`${BASE}${url}`, {
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
        break;
      }
      console.log(`OK (${elapsed}s)`);
      console.log('  ', body);
      if (body.nextOffset == null) break;
      offset = body.nextOffset;
    } catch (err) {
      clearTimeout(timeoutId);
      console.log('ERROR', err instanceof Error ? err.message : err);
      break;
    }
  }

  // Paginate team trends (same pattern as player trends above)
  offset = 0;
  while (true) {
    const url = `/api/trends/calculate?scope=teams&offset=${offset}&limit=${pageSize}`;
    process.stdout.write(`Recalc team trends (offset ${offset})... `);
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      const res = await fetch(`${BASE}${url}`, {
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
        break;
      }
      console.log(`OK (${elapsed}s)`);
      console.log('  ', body);
      if (body.teamsNextOffset == null) break;
      offset = body.teamsNextOffset;
    } catch (err) {
      clearTimeout(timeoutId);
      console.log('ERROR', err instanceof Error ? err.message : err);
      break;
    }
  }

  await call('Recalc referee stats', '/api/trends/referees');
  await call('Recalc H2H',           '/api/trends/calculate?scope=h2h');
  await call('Recalc first-goal',    '/api/trends/calculate?scope=firstgoal');

  // Step 5: generate tips for upcoming fixtures
  await call('Generate tips', '/api/tips/generate');

  // Step 6: build today's game acca
  await call('Build game acca', '/api/acca/game');

  // Step 7: settle any finished tips
  await call('Settle tips', '/api/tips/settle');

  console.log('\nBackfill complete. Visit http://localhost:3000/tips to see real tips.');
}

run();

/**
 * Ingest real data from API-Football into Supabase.
 * Run: npx tsx scripts/ingest.ts
 *
 * Runs the ingest endpoints in order:
 * 1. Fixtures (today's matches from tracked leagues)
 * 2. Results (update live scores + first goal data)
 * 3. Players (post-match player stats)
 *
 * Make sure `npm run dev` is running in another terminal.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
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

const BASE = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')
  ? process.env.NEXT_PUBLIC_APP_URL
  : 'http://localhost:3000';

const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('Missing CRON_SECRET in .env.local');
  process.exit(1);
}

const STEPS: { name: string; path: string }[] = [
  { name: 'Ingest fixtures',     path: '/api/ingest/fixtures' },
  { name: 'Ingest results',      path: '/api/ingest/results' },
  { name: 'Ingest players',      path: '/api/ingest/players' },
];

async function run() {
  console.log(`Running ingest against ${BASE}\n`);

  for (const step of STEPS) {
    process.stdout.write(`${step.name}... `);
    try {
      const res = await fetch(`${BASE}${step.path}`, {
        method: 'POST',
        headers: { 'x-cron-secret': CRON_SECRET! },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.log(`FAILED (${res.status})`);
        console.log('  ', body);
      } else {
        console.log('OK');
        console.log('  ', body);
      }
    } catch (err) {
      console.log('ERROR');
      console.log('  ', err instanceof Error ? err.message : err);
    }
  }

  console.log('\nDone.');
}

run();

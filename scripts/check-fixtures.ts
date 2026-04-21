/**
 * Check what API-Football has for the next 7 days across tracked leagues.
 * Run: npx tsx scripts/check-fixtures.ts
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

const API_KEY = process.env.API_FOOTBALL_KEY;
if (!API_KEY) { console.error('No API key'); process.exit(1); }

const LEAGUES = [
  { id: 39,  name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' },
  { id: 78,  name: 'Bundesliga' },
  { id: 61,  name: 'Ligue 1' },
  { id: 2,   name: 'UCL' },
  { id: 3,   name: 'UEL' },
  { id: 1,   name: 'World Cup' },
];

async function run() {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  console.log(`Checking ${dates[0]} through ${dates[dates.length - 1]}\n`);

  let total = 0;
  for (const league of LEAGUES) {
    let leagueTotal = 0;
    const breakdown: string[] = [];
    for (const date of dates) {
      const url = `https://v3.football.api-sports.io/fixtures?league=${league.id}&season=2025&date=${date}`;
      const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY! } });
      const data = await res.json();
      const count = data.response?.length ?? 0;
      leagueTotal += count;
      if (count > 0) breakdown.push(`${date}:${count}`);
    }
    total += leagueTotal;
    console.log(`${league.name.padEnd(18)} ${leagueTotal} fixtures ${breakdown.length ? '— ' + breakdown.join(', ') : ''}`);
  }

  console.log(`\nTOTAL: ${total} fixtures across all tracked leagues in next 7 days`);
  if (total === 0) {
    console.log('\nNo matches scheduled. European seasons wind down late April-May.');
    console.log('Try season=2026 or expand tracked leagues (MLS, Eredivisie, Primeira Liga, Copa America).');
  }
}

run();

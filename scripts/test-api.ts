/**
 * Diagnose API-Football connection.
 * Run: npx tsx scripts/test-api.ts
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
} catch {
  console.error('Could not read .env.local');
  process.exit(1);
}

const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  console.error('API_FOOTBALL_KEY not found in .env.local');
  process.exit(1);
}

console.log(`API key present: ${API_KEY.slice(0, 4)}...${API_KEY.slice(-4)} (length ${API_KEY.length})\n`);

async function test(name: string, url: string) {
  console.log(`--- ${name} ---`);
  console.log(`GET ${url}`);
  try {
    const res = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY! },
    });
    console.log(`Status: ${res.status}`);
    console.log(`Remaining: ${res.headers.get('x-ratelimit-requests-remaining') ?? 'unknown'}`);
    const data = await res.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.log('API errors:', JSON.stringify(data.errors, null, 2));
    } else if (data.response) {
      const count = Array.isArray(data.response) ? data.response.length : 'not-array';
      console.log(`Response count: ${count}`);
      if (Array.isArray(data.response) && data.response.length > 0) {
        console.log('First item sample:', JSON.stringify(data.response[0], null, 2).slice(0, 500));
      }
    } else {
      console.log('Raw response:', JSON.stringify(data).slice(0, 300));
    }
  } catch (err) {
    console.log('ERROR:', err instanceof Error ? err.message : err);
  }
  console.log('');
}

async function run() {
  // 1. Check status / subscription
  await test('Account status', 'https://v3.football.api-sports.io/status');

  // 2. Try Premier League fixtures for today
  const today = new Date().toISOString().split('T')[0];
  await test(
    `EPL fixtures for ${today} (season 2025)`,
    `https://v3.football.api-sports.io/fixtures?league=39&season=2025&date=${today}`
  );

  // 3. Try Premier League fixtures for today (season 2026)
  await test(
    `EPL fixtures for ${today} (season 2026)`,
    `https://v3.football.api-sports.io/fixtures?league=39&season=2026&date=${today}`
  );

  // 4. Try a broader fixture search
  await test(
    `All live fixtures right now`,
    `https://v3.football.api-sports.io/fixtures?live=all`
  );
}

run();

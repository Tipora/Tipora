/**
 * Diagnose DB state + sample API-Football player stats fetch.
 * Run: npx tsx scripts/diagnose-db.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const apiKey = process.env.API_FOOTBALL_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('=== FIXTURES BY STATUS ===');
  const { data: allFixtures } = await supabase.from('fixtures').select('id, status');
  const byStatus = new Map<string, number>();
  for (const f of allFixtures ?? []) {
    byStatus.set(f.status, (byStatus.get(f.status) ?? 0) + 1);
  }
  for (const [status, count] of byStatus) {
    console.log(`  ${status}: ${count}`);
  }

  console.log('\n=== PLAYER_MATCH_STATS COUNT ===');
  const { count: playerStatsCount } = await supabase
    .from('player_match_stats')
    .select('*', { count: 'exact', head: true });
  console.log(`  Total rows: ${playerStatsCount}`);

  console.log('\n=== SAMPLE FT FIXTURE ===');
  const { data: sampleFT } = await supabase
    .from('fixtures')
    .select('id, api_id, home_team_id, away_team_id, home_score, away_score, kickoff_at')
    .eq('status', 'FT')
    .order('kickoff_at', { ascending: false })
    .limit(1)
    .single();
  console.log(sampleFT ?? 'No FT fixtures found');

  if (sampleFT) {
    console.log('\n=== API-FOOTBALL PLAYER STATS FOR THAT FIXTURE ===');
    const url = `https://v3.football.api-sports.io/players?fixture=${sampleFT.api_id}`;
    console.log(`GET ${url}`);
    const res = await fetch(url, { headers: { 'x-apisports-key': apiKey } });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Response count: ${data.response?.length ?? 0}`);
    console.log(`Errors: ${JSON.stringify(data.errors ?? {})}`);
    console.log(`Rate limit remaining: ${res.headers.get('x-ratelimit-requests-remaining')}`);

    if (data.response?.length > 0) {
      console.log(`First team name: ${data.response[0].team?.name}`);
      console.log(`Players in team 0: ${data.response[0].players?.length ?? 0}`);
      if (data.response[0].players?.[0]) {
        console.log(`Sample player:`, JSON.stringify(data.response[0].players[0], null, 2).slice(0, 500));
      }
    }
  }

  console.log('\n=== MOST-RECENT FIXTURES (BY UPDATED_AT) ===');
  const { data: recent } = await supabase
    .from('fixtures')
    .select('id, api_id, status, kickoff_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);
  console.log(recent);
}

run();

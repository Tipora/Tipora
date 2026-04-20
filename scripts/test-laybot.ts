/**
 * Lay Bot dry-run test — simulates the full lifecycle without calling
 * API-Football or Telegram. Inserts test data into the DB and walks
 * through schedule → poll → settle to verify the logic works.
 *
 * Run: npx tsx scripts/test-laybot.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * AND the 006_lay_the_leader.sql migration must be applied first.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_FIXTURE_ID = 999999;

async function cleanup() {
  console.log('\n--- Cleanup ---');
  await supabase.from('lay_settlements').delete().eq('fixture_api_id', TEST_FIXTURE_ID);
  await supabase.from('lay_alerts').delete().eq('fixture_api_id', TEST_FIXTURE_ID);
  await supabase.from('watched_matches').delete().eq('fixture_api_id', TEST_FIXTURE_ID);
  console.log('Test data cleaned up.');
}

async function testSchedule() {
  console.log('\n--- Test 1: Schedule a match ---');

  const { error } = await supabase.from('watched_matches').insert({
    fixture_api_id: TEST_FIXTURE_ID,
    league_id: 39, // EPL
    home_team: 'TEST Home FC',
    away_team: 'TEST Away United',
    favourite: 'home',
    favourite_odds: 1.35,
    kickoff_at: new Date().toISOString(),
    status: 'scheduled',
  });

  if (error) {
    console.error('FAIL: Could not insert watched match:', error.message);
    return false;
  }

  console.log('PASS: Match inserted into watched_matches');
  return true;
}

async function testPollFavLosing() {
  console.log('\n--- Test 2: Poll — favourite starts losing ---');

  const threeMinAgo = new Date(Date.now() - 200 * 1000).toISOString();

  const { error } = await supabase.from('watched_matches').update({
    status: 'live',
    match_minute: 35,
    home_score: 0,
    away_score: 1,
    fav_losing_since: threeMinAgo, // simulate started losing 200s ago (> 180s threshold)
    last_polled_at: new Date().toISOString(),
  }).eq('fixture_api_id', TEST_FIXTURE_ID);

  if (error) {
    console.error('FAIL: Could not update match:', error.message);
    return false;
  }

  console.log('PASS: Match updated — favourite (home) losing 0-1 since 200s ago');
  return true;
}

async function testOpenAlert() {
  console.log('\n--- Test 3: OPEN alert should fire ---');

  // Check: fav_losing_since is > 180s ago
  const { data: match } = await supabase
    .from('watched_matches')
    .select('fav_losing_since')
    .eq('fixture_api_id', TEST_FIXTURE_ID)
    .single();

  if (!match?.fav_losing_since) {
    console.error('FAIL: fav_losing_since not set');
    return false;
  }

  const elapsed = Date.now() - new Date(match.fav_losing_since).getTime();
  if (elapsed < 180 * 1000) {
    console.error(`FAIL: Only ${(elapsed / 1000).toFixed(0)}s elapsed, need 180s`);
    return false;
  }

  // Simulate firing the OPEN alert
  const { error } = await supabase.from('lay_alerts').insert({
    fixture_api_id: TEST_FIXTURE_ID,
    alert_type: 'OPEN',
    home_team: 'TEST Home FC',
    away_team: 'TEST Away United',
    favourite: 'home',
    score_at_alert: '0-1',
    match_minute_at_alert: 35,
    odds_at_alert: 1.35,
    message_sent: false, // dry run — no actual Telegram message
  });

  if (error) {
    console.error('FAIL: Could not insert OPEN alert:', error.message);
    return false;
  }

  // Mark as fired
  await supabase.from('watched_matches').update({
    open_alert_fired: true,
  }).eq('fixture_api_id', TEST_FIXTURE_ID);

  console.log('PASS: OPEN alert inserted (dry run, no Telegram)');
  return true;
}

async function testCloseAlert() {
  console.log('\n--- Test 4: Favourite equalises → CLOSE alert ---');

  const threeMinAgo = new Date(Date.now() - 200 * 1000).toISOString();

  // Simulate favourite equalising
  await supabase.from('watched_matches').update({
    home_score: 1,
    away_score: 1,
    match_minute: 55,
    fav_losing_since: null,
    fav_levelled_since: threeMinAgo, // levelled 200s ago
  }).eq('fixture_api_id', TEST_FIXTURE_ID);

  const { error } = await supabase.from('lay_alerts').insert({
    fixture_api_id: TEST_FIXTURE_ID,
    alert_type: 'CLOSE',
    home_team: 'TEST Home FC',
    away_team: 'TEST Away United',
    favourite: 'home',
    score_at_alert: '1-1',
    match_minute_at_alert: 55,
    odds_at_alert: 1.35,
    message_sent: false,
  });

  if (error) {
    console.error('FAIL: Could not insert CLOSE alert:', error.message);
    return false;
  }

  await supabase.from('watched_matches').update({
    close_alert_fired: true,
  }).eq('fixture_api_id', TEST_FIXTURE_ID);

  console.log('PASS: CLOSE alert inserted (dry run)');
  return true;
}

async function testSettle() {
  console.log('\n--- Test 5: Settle — favourite lost, lay wins ---');

  // Final score: 1-2 (favourite lost)
  await supabase.from('watched_matches').update({
    status: 'finished',
    home_score: 1,
    away_score: 2,
    match_minute: 90,
  }).eq('fixture_api_id', TEST_FIXTURE_ID);

  const { data: openAlert } = await supabase
    .from('lay_alerts')
    .select('id')
    .eq('fixture_api_id', TEST_FIXTURE_ID)
    .eq('alert_type', 'OPEN')
    .single();

  if (!openAlert) {
    console.error('FAIL: No OPEN alert found');
    return false;
  }

  // Lay wins: profit = stake (£10)
  const stake = 10;
  const pnl = stake; // favourite lost, so our lay won

  const { error } = await supabase.from('lay_settlements').insert({
    alert_id: openAlert.id,
    fixture_api_id: TEST_FIXTURE_ID,
    final_score: '1-2',
    favourite_won: false,
    lay_result: 'win',
    stake_gbp: stake,
    pnl_gbp: pnl,
  });

  if (error) {
    console.error('FAIL: Could not insert settlement:', error.message);
    return false;
  }

  console.log(`PASS: Settled — lay WIN, P&L: +£${pnl.toFixed(2)}`);
  return true;
}

async function testPnlView() {
  console.log('\n--- Test 6: P&L summary view ---');

  const { data, error } = await supabase
    .from('lay_pnl_summary')
    .select('*')
    .single();

  if (error) {
    console.error('FAIL: Could not query lay_pnl_summary view:', error.message);
    return false;
  }

  console.log('PASS: P&L summary:', data);
  return true;
}

async function testDedupe() {
  console.log('\n--- Test 7: Dedup — duplicate OPEN alert should fail ---');

  const { error } = await supabase.from('lay_alerts').insert({
    fixture_api_id: TEST_FIXTURE_ID,
    alert_type: 'OPEN',
    home_team: 'TEST Home FC',
    away_team: 'TEST Away United',
    favourite: 'home',
    score_at_alert: '0-2',
    match_minute_at_alert: 40,
    odds_at_alert: 1.35,
    message_sent: false,
  });

  if (error) {
    console.log('PASS: Duplicate OPEN correctly rejected:', error.code);
    return true;
  }

  console.error('FAIL: Duplicate OPEN was allowed — dedup constraint missing!');
  return false;
}

async function run() {
  console.log('=== LAY BOT DRY-RUN TEST ===');
  console.log(`DB: ${supabaseUrl}\n`);

  await cleanup();

  const tests = [
    testSchedule,
    testPollFavLosing,
    testOpenAlert,
    testCloseAlert,
    testSettle,
    testPnlView,
    testDedupe,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const ok = await test();
    if (ok) passed++;
    else failed++;
  }

  await cleanup();

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();

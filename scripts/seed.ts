/**
 * Seed script — inserts mock data into Supabase for local development.
 * Run: npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually (tsx doesn't auto-load like Next.js does)
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
  // .env.local not found — rely on process.env
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEAMS = [
  { api_id: 33, name: 'Manchester United', short_name: 'MUN', country: 'England' },
  { api_id: 34, name: 'Newcastle', short_name: 'NEW', country: 'England' },
  { api_id: 40, name: 'Liverpool', short_name: 'LIV', country: 'England' },
  { api_id: 42, name: 'Arsenal', short_name: 'ARS', country: 'England' },
  { api_id: 47, name: 'Tottenham', short_name: 'TOT', country: 'England' },
  { api_id: 49, name: 'Chelsea', short_name: 'CHE', country: 'England' },
  { api_id: 50, name: 'Manchester City', short_name: 'MCI', country: 'England' },
  { api_id: 66, name: 'Aston Villa', short_name: 'AVL', country: 'England' },
  { api_id: 529, name: 'Barcelona', short_name: 'BAR', country: 'Spain' },
  { api_id: 541, name: 'Real Madrid', short_name: 'RMA', country: 'Spain' },
];

const COMPETITIONS = [
  { api_id: 39, name: 'Premier League', country: 'England', season_year: 2025 },
  { api_id: 140, name: 'La Liga', country: 'Spain', season_year: 2025 },
];

const REFEREES = [
  { api_id: 1, name: 'Michael Oliver', avg_yellow_cards: 4.2, avg_red_cards: 0.2, avg_fouls: 22, avg_booking_points: 38, games_officiated: 120 },
  { api_id: 2, name: 'Anthony Taylor', avg_yellow_cards: 4.9, avg_red_cards: 0.3, avg_fouls: 24, avg_booking_points: 44, games_officiated: 115 },
  { api_id: 3, name: 'Stuart Attwell', avg_yellow_cards: 3.5, avg_red_cards: 0.1, avg_fouls: 20, avg_booking_points: 31, games_officiated: 95 },
];

const PLAYERS = [
  { api_id: 1001, name: 'Bruno Fernandes', team_api_id: 33, position: 'Midfielder', nationality: 'Portugal' },
  { api_id: 1002, name: 'Casemiro', team_api_id: 33, position: 'Midfielder', nationality: 'Brazil' },
  { api_id: 1003, name: 'Mohamed Salah', team_api_id: 40, position: 'Forward', nationality: 'Egypt' },
  { api_id: 1004, name: 'Bukayo Saka', team_api_id: 42, position: 'Forward', nationality: 'England' },
  { api_id: 1005, name: 'Son Heung-min', team_api_id: 47, position: 'Forward', nationality: 'South Korea' },
  { api_id: 1006, name: 'Cole Palmer', team_api_id: 49, position: 'Forward', nationality: 'England' },
  { api_id: 1007, name: 'Erling Haaland', team_api_id: 50, position: 'Forward', nationality: 'Norway' },
  { api_id: 1008, name: 'Alexander Isak', team_api_id: 34, position: 'Forward', nationality: 'Sweden' },
];

async function seed() {
  console.log('Seeding competitions...');
  await supabase.from('competitions').upsert(
    COMPETITIONS.map(c => ({ ...c, active: true })),
    { onConflict: 'api_id' }
  );

  console.log('Seeding teams...');
  await supabase.from('teams').upsert(
    TEAMS.map(t => ({ ...t, logo_url: null })),
    { onConflict: 'api_id' }
  );

  console.log('Seeding referees...');
  await supabase.from('referees').upsert(REFEREES, { onConflict: 'api_id' });

  console.log('Seeding players...');
  await supabase.from('players').upsert(
    PLAYERS.map(p => ({
      api_id: p.api_id,
      name: p.name,
      team_id: p.team_api_id,
      position: p.position,
      nationality: p.nationality,
      photo_url: null,
    })),
    { onConflict: 'api_id' }
  );

  // Seed fixtures across 14 days so teams get realistic 3-4 day rest cycles.
  console.log('Seeding fixtures...');
  const fixtures = [];
  const matchups: [number, number][] = [
    [33, 40], [42, 47], [49, 50], [34, 66], [529, 541],
  ];

  // Fetch referee DB ids (the fixtures.referee_id FK points to referees.id)
  const { data: refRows } = await supabase.from('referees').select('id');
  const refIds = (refRows ?? []).map(r => r.id);

  // Each matchup plays every 4 days (offsets -12, -8, -4, 0)
  for (const dayOffset of [-12, -8, -4, 0]) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    for (let i = 0; i < matchups.length; i++) {
      const [home, away] = matchups[i];
      const fixtureApiId = 100000 + Math.abs(dayOffset) * 10 + i;
      const isFinished = dayOffset < 0;
      const homeScore = isFinished ? Math.floor(Math.random() * 4) : null;
      const awayScore = isFinished ? Math.floor(Math.random() * 3) : null;
      const refereeId = refIds.length ? refIds[Math.floor(Math.random() * refIds.length)] : null;

      fixtures.push({
        api_id: fixtureApiId,
        competition_id: i < 4 ? 39 : 140,
        home_team_id: home,
        away_team_id: away,
        referee_id: refereeId,
        kickoff_at: `${dateStr}T15:00:00Z`,
        status: isFinished ? 'FT' : 'NS',
        home_score: homeScore,
        away_score: awayScore,
      });
    }
  }

  await supabase.from('fixtures').upsert(fixtures, { onConflict: 'api_id' });

  // ----------------------------------------------------------------
  // Seed match stats for finished fixtures so the trend engine has data
  // ----------------------------------------------------------------
  console.log('Seeding match stats...');

  // Lookup: api_id -> DB id for fixtures we just inserted
  const { data: fixtureRows } = await supabase
    .from('fixtures')
    .select('id, api_id, home_team_id, away_team_id, home_score, away_score, status')
    .in('api_id', fixtures.map(f => f.api_id));

  const finishedFixtures = (fixtureRows ?? []).filter(f => f.status === 'FT');

  // Team match stats — 2 rows per finished fixture (one per team)
  const teamStatRows: Array<Record<string, number | null>> = [];
  for (const f of finishedFixtures) {
    for (const teamId of [f.home_team_id, f.away_team_id]) {
      const isHome = teamId === f.home_team_id;
      const scoredGoals = isHome ? f.home_score : f.away_score;
      const concededGoals = isHome ? f.away_score : f.home_score;
      const possession = 40 + Math.floor(Math.random() * 25);
      const shots = 8 + Math.floor(Math.random() * 12);
      const shotsOnTarget = Math.max(1, Math.floor(shots * (0.3 + Math.random() * 0.2)));
      const corners = 3 + Math.floor(Math.random() * 8);
      const fouls = 8 + Math.floor(Math.random() * 8);
      const yellows = Math.floor(Math.random() * 4);
      const reds = Math.random() < 0.08 ? 1 : 0;
      // xG roughly tracks goals + randomness
      const xg = +((scoredGoals ?? 0) * 0.8 + Math.random() * 1.2).toFixed(2);
      const xga = +((concededGoals ?? 0) * 0.8 + Math.random() * 1.2).toFixed(2);

      teamStatRows.push({
        team_id: teamId,
        fixture_id: f.id,
        possession,
        shots,
        shots_on_target: shotsOnTarget,
        corners,
        fouls,
        yellow_cards: yellows,
        red_cards: reds,
        xg,
        xg_against: xga,
      });
    }
  }
  if (teamStatRows.length > 0) {
    await supabase.from('team_match_stats').upsert(teamStatRows, {
      onConflict: 'team_id,fixture_id',
    });
  }

  // Player match stats — key players for each finished fixture.
  //
  // We deliberately make certain players into "locks" who ALWAYS hit a
  // market, so the trend engine has clean, strong streaks to pick up on.
  // This mimics the consistent-performer patterns you'd see in real data.
  const LOCKS = new Map<number, { fouls: boolean; shots: boolean; yellow: boolean; scoreOrAssist: boolean }>([
    [1001, { fouls: false, shots: true,  yellow: false, scoreOrAssist: true  }], // Bruno Fernandes — shots + G/A lock
    [1002, { fouls: true,  shots: false, yellow: true,  scoreOrAssist: false }], // Casemiro — foul/card lock
    [1003, { fouls: false, shots: true,  yellow: false, scoreOrAssist: true  }], // Salah — shots lock
    [1004, { fouls: false, shots: true,  yellow: false, scoreOrAssist: true  }], // Saka — shots + G/A lock
    [1007, { fouls: false, shots: true,  yellow: false, scoreOrAssist: true  }], // Haaland — shots lock
    [1008, { fouls: false, shots: true,  yellow: false, scoreOrAssist: false }], // Isak — shots lock
  ]);

  const playerStatRows: Array<Record<string, number>> = [];
  for (const f of finishedFixtures) {
    const teamIds = [f.home_team_id, f.away_team_id];
    const playersInMatch = PLAYERS.filter(p => teamIds.includes(p.team_api_id));

    for (const player of playersInMatch) {
      const lock = LOCKS.get(player.api_id);
      const isForward = player.position === 'Forward';
      const isMid = player.position === 'Midfielder';

      const minutes = 60 + Math.floor(Math.random() * 35);

      // Locks always hit their market; otherwise base rates by position
      const goals = lock?.scoreOrAssist
        ? (Math.random() < 0.5 ? 1 : 0)
        : isForward ? (Math.random() < 0.35 ? 1 : Math.random() < 0.1 ? 2 : 0) : (Math.random() < 0.08 ? 1 : 0);

      const assists = lock?.scoreOrAssist
        ? (goals === 0 ? 1 : Math.random() < 0.3 ? 1 : 0) // ensures score OR assist
        : isForward || isMid ? (Math.random() < 0.18 ? 1 : 0) : 0;

      const foulsCommitted = lock?.fouls
        ? 2 + Math.floor(Math.random() * 2) // always 2-3
        : isMid ? 1 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 3);

      const foulsDrawn = isForward ? 1 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 2);

      const yellow = lock?.yellow
        ? (Math.random() < 0.7 ? 1 : 0) // 70% yellow rate = strong streaks
        : Math.random() < 0.18 ? 1 : 0;
      const red = Math.random() < 0.02 ? 1 : 0;

      const shots = lock?.shots
        ? 2 + Math.floor(Math.random() * 3) // always 2-4
        : isForward ? 1 + Math.floor(Math.random() * 4) : isMid ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2);

      const sot = lock?.shots
        ? 1 + Math.floor(Math.random() * 2) // always 1-2 SOT
        : Math.max(0, Math.floor(shots * (0.35 + Math.random() * 0.25)));
      const passes = 20 + Math.floor(Math.random() * 50);
      const passAccuracy = 70 + Math.floor(Math.random() * 25);
      const dribbles = isForward ? Math.floor(Math.random() * 4) : Math.floor(Math.random() * 2);
      const duelsWon = 2 + Math.floor(Math.random() * 6);

      playerStatRows.push({
        player_id: player.api_id,
        fixture_id: f.id,
        team_id: player.team_api_id,
        minutes_played: minutes,
        goals,
        assists,
        fouls_committed: foulsCommitted,
        fouls_drawn: foulsDrawn,
        yellow_cards: yellow,
        red_cards: red,
        shots,
        shots_on_target: sot,
        passes,
        pass_accuracy: passAccuracy,
        dribbles,
        duels_won: duelsWon,
        corners_taken: 0,
      });
    }
  }
  if (playerStatRows.length > 0) {
    await supabase.from('player_match_stats').upsert(playerStatRows, {
      onConflict: 'player_id,fixture_id',
    });
  }
  console.log(`Seeded ${teamStatRows.length} team-stat rows, ${playerStatRows.length} player-stat rows`);

  // Seed some tips for last 7 days
  console.log('Seeding tips...');
  const tags = ['BANKER', 'VALUE', 'BOLD', 'LONGSHOT'] as const;

  // Market type → uses a player name? + friendly selection builder
  type MarketDef = {
    market: string;
    isPlayer: boolean;
    build: (home: string, away: string, player?: string) => string;
  };

  const MARKET_DEFS: MarketDef[] = [
    { market: 'over_2_5_goals', isPlayer: false,
      build: (h, a) => `${h} vs ${a} — Over 2.5 Goals` },
    { market: 'over_1_5_goals', isPlayer: false,
      build: (h, a) => `${h} vs ${a} — Over 1.5 Goals` },
    { market: 'btts', isPlayer: false,
      build: (h, a) => `${h} vs ${a} — Both Teams to Score` },
    { market: 'over_9_5_corners', isPlayer: false,
      build: (h, a) => `${h} vs ${a} — Over 9.5 Corners` },
    { market: 'over_3_5_cards', isPlayer: false,
      build: (h, a) => `${h} vs ${a} — Over 3.5 Cards` },
    { market: 'home_win', isPlayer: false, build: (h, a) => `${h} to beat ${a}` },
    { market: 'clean_sheet', isPlayer: false,
      build: (h, a) => `${h} vs ${a} — Clean Sheet` },
    // Player markets
    { market: 'player_1_plus_foul', isPlayer: true,
      build: (_h, _a, p) => `${p} — 1+ Fouls` },
    { market: 'player_2_plus_fouls', isPlayer: true,
      build: (_h, _a, p) => `${p} — 2+ Fouls` },
    { market: 'player_1_plus_shot', isPlayer: true,
      build: (_h, _a, p) => `${p} — 1+ Shots` },
    { market: 'player_2_plus_shots', isPlayer: true,
      build: (_h, _a, p) => `${p} — 2+ Shots` },
    { market: 'player_1_plus_sot', isPlayer: true,
      build: (_h, _a, p) => `${p} — 1+ Shots on Target` },
    { market: 'yellow_card', isPlayer: true,
      build: (_h, _a, p) => `${p} — To Be Carded` },
    { market: 'anytime_goalscorer', isPlayer: true,
      build: (_h, _a, p) => `${p} — Anytime Goalscorer` },
    { market: 'score_or_assist', isPlayer: true,
      build: (_h, _a, p) => `${p} — Goal or Assist` },
  ];

  // Team id → name lookup
  const teamById = new Map(TEAMS.map(t => [t.api_id, t.name]));

  // Player → team lookup for selecting a valid player for each fixture
  const playersByTeam = new Map<number, typeof PLAYERS>();
  for (const p of PLAYERS) {
    if (!playersByTeam.has(p.team_api_id)) playersByTeam.set(p.team_api_id, []);
    playersByTeam.get(p.team_api_id)!.push(p);
  }

  // Reason templates
  function buildReasons(market: string, subject: string, isHome: boolean): string[] {
    const venue = isHome ? 'at home' : 'away';
    const streak = 5 + Math.floor(Math.random() * 4);
    const rate = 60 + Math.floor(Math.random() * 30);
    if (market.startsWith('player_') || market === 'yellow_card' || market === 'anytime_goalscorer' || market === 'score_or_assist') {
      return [
        `${subject} on a ${streak}-game streak for this market`,
        `${subject} averages a strong hit rate ${venue} this season`,
        'Referee profile favours this market',
      ];
    }
    return [
      `${subject} have seen this land in ${rate}% of last 10 matches`,
      'Combined xG supports this pick',
      `Head-to-head record: ${Math.max(rate - 10, 0)}% strike rate`,
    ];
  }

  const { data: insertedFixtures } = await supabase
    .from('fixtures')
    .select('id, api_id, home_team_id, away_team_id, home_score, away_score, status, kickoff_at')
    .order('kickoff_at', { ascending: false })
    .limit(40);

  let tipsInserted = 0;
  for (const fixture of insertedFixtures ?? []) {
    // 1-3 tips per fixture
    const tipCount = 1 + Math.floor(Math.random() * 3);

    for (let t = 0; t < tipCount; t++) {
      const def = MARKET_DEFS[Math.floor(Math.random() * MARKET_DEFS.length)];
      const homeName = teamById.get(fixture.home_team_id) ?? 'Home';
      const awayName = teamById.get(fixture.away_team_id) ?? 'Away';

      let selection: string;
      if (def.isPlayer) {
        // Pick a random player from either team in this fixture
        const homePool = playersByTeam.get(fixture.home_team_id) ?? [];
        const awayPool = playersByTeam.get(fixture.away_team_id) ?? [];
        const pool = [...homePool, ...awayPool];
        if (!pool.length) continue;
        const player = pool[Math.floor(Math.random() * pool.length)];
        selection = def.build(homeName, awayName, player.name);
      } else {
        selection = def.build(homeName, awayName);
      }

      const odds = +(1.3 + Math.random() * 2.5).toFixed(2);
      const confidence = 70 + Math.floor(Math.random() * 25);
      const tag = tags[Math.floor(Math.random() * tags.length)];
      const tipDate = fixture.kickoff_at.split('T')[0];

      let status: 'pending' | 'won' | 'lost' = 'pending';
      let pl: number | null = null;
      let settledAt: string | null = null;

      if (fixture.status === 'FT') {
        status = Math.random() > 0.45 ? 'won' : 'lost';
        pl = status === 'won' ? Math.round((odds * 10 - 10) * 100) : -1000;
        settledAt = new Date().toISOString();
      }

      const subject = def.isPlayer ? selection.split(' — ')[0] : homeName;
      const reasons = buildReasons(def.market, subject, true);

      const { error } = await supabase.from('tips').insert({
        fixture_id: fixture.id,
        market_type: def.market,
        selection,
        odds,
        confidence_score: confidence,
        confidence_breakdown: { trend: 14, xg: 12, referee: 10, context: 16, value: confidence - 52 },
        reasons,
        acca_eligible: true,
        acca_type: null,
        status,
        tip_date: tipDate,
        settled_at: settledAt,
        stake: 1000,
        return_amount: status === 'won' ? Math.round(odds * 10 * 100) : 0,
        pl,
        tag,
      });
      if (!error) tipsInserted++;
    }
  }
  console.log(`Seeded ${tipsInserted} tips`);

  console.log('Seed complete!');
}

seed().catch(console.error);

# SKILL.md — Tipora Implementation Guide

## Purpose

This file guides Claude Code when building any feature of Tipora. Always read CLAUDE.md
first for full project context. This file covers implementation patterns, component
recipes and step-by-step instructions for every major feature area.

---

## Before Writing Any Code — Checklist

1. Is the data already in our DB? Never call API-Football from user-facing code.
2. Does the feature require auth? Check FEATURES flags in CLAUDE.md.
3. Is this a background job or UI feature? Background = Edge Function. UI = Next.js.
4. Does it touch money/P&L? Store as pence (integer), display as pounds.
5. Does it touch odds? Always decimal, never fractional.

---

## Building a Data Ingest Job

### Step 1 — Add API call to `/lib/api-football/`

```typescript
// lib/api-football/fixtures.ts
export async function fetchFixturesByDate(date: string, leagueId: number) {
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=2025&date=${date}`,
    { headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! } }
  );
  if (!res.ok) throw new Error(`API-Football error: ${res.status}`);
  const data = await res.json();
  return data.response;
}
```

### Step 2 — Map API response to DB schema explicitly

```typescript
function mapFixture(f: any): InsertFixture {
  return {
    api_id:         f.fixture.id,
    competition_id: f.league.id,
    home_team_id:   f.teams.home.id,
    away_team_id:   f.teams.away.id,
    referee_id:     f.fixture.referee ?? null,
    kickoff_at:     f.fixture.date,
    status:         f.fixture.status.short,
    home_score:     f.goals.home,
    away_score:     f.goals.away,
  };
}
```

### Step 3 — Upsert to Supabase (never blind insert)

```typescript
const { error } = await supabase
  .from('fixtures')
  .upsert(mapped, { onConflict: 'api_id' });
if (error) throw error;
```

### Step 4 — Authenticate cron endpoint calls

```typescript
// Every ingest route must verify CRON_SECRET
const secret = req.headers.get('x-cron-secret');
if (secret !== process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## Building the Trend Engine

### Stat Types

```typescript
type StatType =
  | 'foul_committed' | 'foul_drawn'
  | 'yellow_card' | 'red_card'
  | 'goal' | 'assist'
  | 'shot' | 'shot_on_target'
  | 'btts'
  | 'over_0_5_goals' | 'over_1_5_goals' | 'over_2_5_goals' | 'over_3_5_goals'
  | 'over_8_5_corners' | 'over_9_5_corners' | 'over_10_5_corners'
  | 'clean_sheet'
  | 'first_half_goal' | 'over_1_5_goals_ht';
```

### Calculate a Player Trend

```typescript
// lib/trends/engine.ts
export async function calculatePlayerTrend(
  playerId: number,
  statType: StatType,
  supabase: SupabaseClient
): Promise<PlayerTrend | null> {
  const { data: stats } = await supabase
    .from('player_match_stats')
    .select('*, fixtures(kickoff_at, home_team_id)')
    .eq('player_id', playerId)
    .order('fixtures(kickoff_at)', { ascending: false })
    .limit(10);

  if (!stats?.length) return null;

  const values = stats.map(s => getStatValue(s, statType));

  // Consecutive streak where stat > 0
  let streak = 0;
  for (const v of values) {
    if (v > 0) streak++;
    else break;
  }

  const homeStats = stats.filter(s => s.team_id === s.fixtures.home_team_id);
  const awayStats = stats.filter(s => s.team_id !== s.fixtures.home_team_id);

  return {
    player_id:    playerId,
    stat_type:    statType,
    streak_count: streak,
    last_n_games: values,
    avg_last_5:   average(values.slice(0, 5)),
    avg_last_10:  average(values),
    home_avg:     average(homeStats.map(s => getStatValue(s, statType))),
    away_avg:     average(awayStats.map(s => getStatValue(s, statType))),
  };
}

function getStatValue(stat: PlayerMatchStat, type: StatType): number {
  const map: Record<string, number> = {
    foul_committed:  stat.fouls_committed,
    foul_drawn:      stat.fouls_drawn,
    yellow_card:     stat.yellow_cards,
    red_card:        stat.red_cards,
    goal:            stat.goals,
    assist:          stat.assists,
    shot:            stat.shots,
    shot_on_target:  stat.shots_on_target,
  };
  return map[type] ?? 0;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
```

---

## Building the Confidence Scoring System

```typescript
// lib/trends/confidence.ts

export function scoreConfidence(input: ScoringInput): ConfidenceBreakdown {
  return {
    trend:   scoreTrend(input.trend),
    xg:      scoreXG(input.fixture),
    referee: scoreReferee(input.referee, input.statType),
    context: scoreContext(input.fixture),
    value:   scoreValue(input.odds, input.trend),
  };
}

// Streak + consistency → max 20
function scoreTrend(trend: PlayerTrend | TeamTrend): number {
  if (!trend) return 0;
  const streakScore       = Math.min(trend.streak_count * 3, 12);
  const consistencyScore  = trend.avg_last_10 > 0
    ? Math.min(trend.avg_last_10 * 4, 8) : 0;
  return Math.round(streakScore + consistencyScore);
}

// Combined xG of both teams → max 20
function scoreXG(fixture: Fixture): number {
  const totalXG = (fixture.home_xg_avg ?? 0) + (fixture.away_xg_avg ?? 0);
  if (totalXG >= 3.0) return 20;
  if (totalXG >= 2.5) return 16;
  if (totalXG >= 2.0) return 12;
  if (totalXG >= 1.5) return 8;
  return 4;
}

// Referee card/foul profile → max 20
function scoreReferee(referee: Referee | null, statType: StatType): number {
  if (!referee) return 5;
  const cardMarkets = ['yellow_card', 'foul_committed', 'foul_drawn'];
  if (cardMarkets.includes(statType)) {
    if (referee.avg_yellow_cards >= 5.0) return 20;
    if (referee.avg_yellow_cards >= 4.0) return 15;
    if (referee.avg_yellow_cards >= 3.0) return 10;
    return 5;
  }
  return 10;
}

// Rest days, H2H, match importance → max 20
function scoreContext(fixture: Fixture): number {
  let score = 10;
  const restDays = getRestDays(fixture);
  if (restDays >= 7)  score += 4;
  if (restDays <= 3)  score -= 4;
  return Math.min(Math.max(score, 0), 20);
}

// Our probability vs bookmaker implied → max 20
function scoreValue(odds: number, trend: PlayerTrend | TeamTrend): number {
  const ourProb   = trend?.avg_last_10 ?? 0;
  const bookProb  = 1 / odds;
  const edge      = ourProb - bookProb;
  if (edge >= 0.15) return 20;
  if (edge >= 0.10) return 16;
  if (edge >= 0.05) return 12;
  if (edge >= 0.00) return 8;
  return 4;
}
```

---

## Building the Acca Builder

```typescript
// lib/trends/acca-builder.ts

export async function buildGameAcca(
  date: string,
  supabase: SupabaseClient
): Promise<Accumulator | null> {

  // 1. Get all tips for today scoring >= 70
  const { data: tips } = await supabase
    .from('tips')
    .select('*, fixtures(*)')
    .eq('tip_date', date)
    .gte('confidence_score', 70)
    .eq('status', 'pending')
    .order('confidence_score', { ascending: false });

  if (!tips?.length) return null;

  // 2. Select legs — no fixture repeat, no correlated markets
  const legs: Tip[] = [];
  const usedFixtures = new Set<number>();
  const marketCounts = new Map<string, number>();

  for (const tip of tips) {
    if (legs.length >= 5) break;
    if (usedFixtures.has(tip.fixture_id)) continue;
    if (isCorrelated(tip, legs)) continue;

    const count = marketCounts.get(tip.market_type) ?? 0;
    if (count >= 2) continue; // Max 2 of same market type

    legs.push(tip);
    usedFixtures.add(tip.fixture_id);
    marketCounts.set(tip.market_type, count + 1);
  }

  if (legs.length < 3) return null;

  const combinedOdds = +legs
    .reduce((acc, t) => acc * t.odds, 1)
    .toFixed(2);

  return {
    acca_type:        'game',
    tip_ids:          legs.map(t => t.id),
    combined_odds:    combinedOdds,
    stake:            1000,
    potential_return: Math.round(combinedOdds * 10 * 100),
    status:           'pending',
    acca_date:        date,
    label:            getAccaLabel(combinedOdds),
  };
}

// Correlated market pairs — never combine these from the same fixture
const CORRELATED_PAIRS = [
  ['over_2_5_goals', 'btts'],
  ['home_win',       'over_2_5_goals'],
  ['clean_sheet',    'btts'],
  ['away_win',       'clean_sheet'],
];

function isCorrelated(tip: Tip, existing: Tip[]): boolean {
  return existing.some(leg => {
    if (leg.fixture_id !== tip.fixture_id) return false;
    return CORRELATED_PAIRS.some(([a, b]) =>
      (leg.market_type === a && tip.market_type === b) ||
      (leg.market_type === b && tip.market_type === a)
    );
  });
}

function getAccaLabel(odds: number) {
  if (odds < 2.50)  return { label: 'Banker Acca',   color: '#60efff' };
  if (odds < 5.00)  return { label: 'Value Acca',    color: '#00ff87' };
  if (odds < 10.00) return { label: 'Bold Acca',     color: '#ffd60a' };
  return              { label: 'Longshot Acca',       color: '#ff4d6d' };
}
```

---

## Building the P&L Tracker

### Settling Tips

```typescript
// app/api/tips/settle/route.ts
export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: pending } = await supabase
    .from('tips')
    .select('*, fixtures(*)')
    .eq('status', 'pending')
    .eq('fixtures.status', 'FT');

  for (const tip of pending ?? []) {
    const result = evaluateTip(tip); // 'won' | 'lost' | 'void'
    const pl = result === 'won'  ? +(tip.odds * 10 - 10).toFixed(2)
             : result === 'lost' ? -10 : 0;

    await supabase.from('tips').update({
      status:        result,
      return_amount: result === 'won' ? Math.round(tip.odds * 10 * 100) : 0,
      pl:            Math.round(pl * 100), // store as pence
      settled_at:    new Date().toISOString(),
    }).eq('id', tip.id);
  }

  await regeneratePLSnapshots(supabase);
  return Response.json({ settled: pending?.length ?? 0 });
}
```

### P&L Period Queries

```typescript
// lib/trends/pl-tracker.ts
export async function getPLStats(
  period: PLPeriod,
  supabase: SupabaseClient
): Promise<PLStats> {
  const { from, to } = getDateRange(period);

  const { data } = await supabase
    .from('tips')
    .select('odds, status, pl, tip_date')
    .in('status', ['won', 'lost', 'void'])
    .gte('tip_date', from)
    .lte('tip_date', to);

  const wins      = data?.filter(t => t.status === 'won').length  ?? 0;
  const losses    = data?.filter(t => t.status === 'lost').length ?? 0;
  const voids     = data?.filter(t => t.status === 'void').length ?? 0;
  const totalPL   = (data?.reduce((s, t) => s + (t.pl ?? 0), 0) ?? 0) / 100;
  const staked    = (wins + losses) * 10;
  const roi       = staked > 0 ? +((totalPL / staked) * 100).toFixed(1) : 0;

  return { wins, losses, voids, totalPL, staked, roi, period };
}

function getDateRange(period: PLPeriod) {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'day':
      return { from: today, to: today };
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
      return { from: d.toISOString().split('T')[0], to: today };
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: first.toISOString().split('T')[0], to: today };
    }
    case 'season': {
      const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
      return { from: `${y}-08-01`, to: today };
    }
    case 'allTime':
      return { from: '2024-01-01', to: today };
  }
}
```

---

## UI Component Patterns

### TipCard
- Show: match name, league badge, kickoff time, market, odds, confidence bar, tag
- Collapse reasons by default — expand on click
- Tag colours: BANKER=blue(#60efff), VALUE=green(#00ff87), BOLD=yellow(#ffd60a), LONGSHOT=red(#ff4d6d)
- Confidence bar fills left to right — green >= 85, yellow >= 70, red below
- Settled tips: show WIN (green) / LOSS (red) / VOID (grey) + P&L amount
- Never show confidence breakdown to free users

### AccaCard
- Acca label prominent at top with colour coding
- List each leg with its odds and market
- Show combined odds large and bold
- Show: £10 stake → £XX.XX potential return
- Expandable — show reasons for each leg on tap
- Settled: show WIN/LOSS and actual P&L prominently
- Game acca and weekend acca displayed as separate cards

### PLDashboard
- Period tabs: Day | Week | Month | Season | All Time
- Stats banner: Total P&L | ROI % | Wins | Losses | Strike Rate
- P&L amount large — green if positive, red if negative
- Running profit line chart (recharts) below stats
- Singles results table (most recent first)
- Acca results shown in separate section with own P&L line
- Free users see Day tab only — other tabs prompt upgrade

### PLGraph
- Line chart of cumulative P&L over selected period
- X axis: dates | Y axis: £ profit/loss
- Line colour: green above 0, red below 0
- Dot markers on each data point
- Hover tooltip: date + cumulative P&L
- Use recharts

### TipExplanation
- Shown when TipCard is expanded
- 4 bullet points max — plain English
- Each bullet references one data point
- Example: "Casemiro has committed a foul in 9 consecutive games"
- Example: "Referee Anthony Taylor averages 4.9 cards per game"
- Never use jargon — mass market audience

---

## Adding a New Competition

1. Add to `TRACKED_COMPETITIONS` in CLAUDE.md and `/lib/api-football/client.ts`
2. Run fixture ingest for the new league API ID
3. Verify player stats are available in API-Football dashboard
4. Add league badge SVG to `/public/leagues/`
5. Add cron schedule for post-match result ingestion at correct times
6. Test: ingest one historical fixture and verify trend calculation

---

## Adding a New Market Type

1. Add to `StatType` union in `/types/tip.ts`
2. Add extraction logic in `getStatValue()` in `engine.ts`
3. Add correlation rules in `CORRELATED_PAIRS` in `acca-builder.ts`
4. Add referee scoring logic in `scoreReferee()` if card/foul related
5. Add display label in `/lib/utils/markets.ts`
6. Test: calculate trend for a known fixture and verify output

---

## Testing Checklist

Before shipping any feature:

- [ ] Trend calculation returns correct streak for a known player
- [ ] Confidence breakdown components sum to correct total
- [ ] Acca builder never picks two legs from the same fixture
- [ ] Acca builder never picks correlated legs
- [ ] P&L maths correct: £10 on 1.25 = £2.50 profit (not £12.50)
- [ ] Settled tips update P&L snapshots correctly
- [ ] Acca status = 'won' only if ALL legs won
- [ ] Cron jobs authenticated with CRON_SECRET header
- [ ] Free vs Pro feature flags enforced at API route level
- [ ] All DB writes use upsert with onConflict where appropriate
- [ ] Dates stored as UTC, displayed in Europe/London timezone
- [ ] Money stored as pence (integer), displayed as pounds
- [ ] Odds stored as decimals, never fractions

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Calling API-Football in a route handler | Only call in Edge Functions / cron jobs |
| Storing odds as fractions | Always store as decimals (2.50 not 3/2) |
| Storing £ amounts as floats | Store as pence (integer), display as pounds |
| Publishing tips with score < 70 | Gate at confidence_score >= 70 |
| Picking correlated acca legs | Always run isCorrelated() before adding a leg |
| Marking acca won if one leg won | Acca = won only when ALL legs are won |
| Hardcoding league IDs | Use TRACKED_COMPETITIONS constants |
| Free users seeing full P&L history | Enforce FEATURES flags at API route level |
| Forgetting to run settle before P&L | P&L is meaningless without settled tips |

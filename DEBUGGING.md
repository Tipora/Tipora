# DEBUGGING.md

## Purpose

This system was written in one shot without a live Supabase project to test against. There **will** be bugs on first deploy. This file lists the most likely failure modes, in priority order, with exact diagnostic queries. Work top-to-bottom.

Run these checks in order. Each has a fix. Don't skip ahead.

---

## PHASE 1 — Pre-deploy verification

### Check 1.1 — League IDs and seasons are current

**Why:** Seed values in the migration were written from memory. API-Football occasionally renumbers leagues; seasons roll over each August.

**Diagnose:** Run this script (save as `scripts/verify_leagues.ts`):

```typescript
// deno run --allow-net --allow-env scripts/verify_leagues.ts
const KEY = Deno.env.get('API_FOOTBALL_KEY')!;
const WANT = [
  'Premier League', 'Championship', 'League One', 'League Two',
  'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
  'UEFA Champions League', 'UEFA Europa League',
];

const res = await fetch('https://v3.football.api-sports.io/leagues?current=true', {
  headers: { 'x-apisports-key': KEY },
});
const json = await res.json();

const matches = json.response.filter((r: any) => WANT.some(w => r.league.name.includes(w.replace('UEFA ', ''))));
for (const m of matches) {
  console.log(`${m.league.id}\t${m.league.name}\t${m.country.name}\tseason ${m.seasons.find((s:any)=>s.current).year}`);
}
```

**Fix:** Generate UPDATE statements for any mismatches:
```sql
update monitored_leagues set league_id = <real>, current_season = <year> where name = '...';
```

### Check 1.2 — Confirm pg_cron and pg_net are enabled

**Diagnose:**
```sql
select extname from pg_extension where extname in ('pg_cron','pg_net');
```
Should return 2 rows.

**Fix:** If missing, enable in Supabase dashboard → Database → Extensions. Not all Supabase tiers allow pg_cron on free — Pro is required.

### Check 1.3 — Name conflicts with existing tables

**Why:** The migration creates `alert_channels` and `secrets`. If you ran the earlier pre-match tip-alert migration I wrote, both exist already.

**Diagnose:**
```sql
select tablename from pg_tables where schemaname = 'public'
and tablename in ('alert_channels','secrets','watched_matches','alerts','settlements');
```

**Fix:** If `alert_channels` or `secrets` already exist from the previous system, either:
- Run this on a fresh Supabase project (cleanest), OR
- Rename tables in this migration before running (e.g. `lay_alert_channels`), OR
- Drop the conflicting tables if the old system isn't in use

---

## PHASE 2 — After migration

### Check 2.1 — Cron jobs scheduled

```sql
select jobname, schedule, active from cron.job where jobname like 'tipora-%';
```
Expect 3 active rows.

**Fix if missing:** Re-run the `cron.schedule` statements at the bottom of the migration.

### Check 2.2 — Secrets populated

```sql
select key from public.secrets;
```
Expect `edge_base_url` and `service_role_key`.

**Fix:**
```sql
insert into public.secrets (key, value) values
  ('edge_base_url',    'https://<project-ref>.supabase.co/functions/v1'),
  ('service_role_key', '<service role key>')
on conflict (key) do update set value = excluded.value;
```

---

## PHASE 3 — schedule-matches (first function to deploy)

### Check 3.1 — Function deployed

```bash
supabase functions list
```

### Check 3.2 — Manual invoke works

```bash
curl -X POST \
  "https://<project-ref>.supabase.co/functions/v1/schedule-matches" \
  -H "Authorization: Bearer <anon or service key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{"ok":true,"stats":{"fixturesSeen":12,"qualified":2,"inserted":2,"oddsCalls":12}}
```

**If `fixturesSeen: 0`:** Either no matches today/tomorrow in your leagues, or the league_id/season values are wrong (go back to Check 1.1).

**If `qualified: 0` but `fixturesSeen > 0`:** No matches today have a ≤1.50 favourite. Lower threshold temporarily to test:
```sql
update rule_config set favourite_max_odds = 2.00 where id = 1;
```
Rerun, then set back to 1.50.

**If error "API-Football errors: ...":** Check API key is valid, subscription is active, and you haven't exceeded daily quota.

### Check 3.3 — watched_matches populating correctly

```sql
select fixture_id, home_team, away_team, favourite_team, favourite_odds, kickoff_at, status
from watched_matches order by kickoff_at;
```

Rows should show realistic matches with sensible favourites. If `favourite_team` looks wrong (e.g. underdog marked as favourite), the bug is in `extractFavourite` in `_shared/apifootball.ts` — likely the Match Winner bet values aren't being parsed right.

**Common bug location:** in `extractFavourite`:
```typescript
const home = mw.values.find(v => /home|1/i.test(v.value));
const away = mw.values.find(v => /away|2/i.test(v.value));
```
If API-Football returns values like "1", "X", "2" instead of "Home", "Draw", "Away", the regex might accidentally match "Draw" for "home" (since "draw" contains nothing). Tighten to:
```typescript
const home = mw.values.find(v => v.value === 'Home' || v.value === '1');
const away = mw.values.find(v => v.value === 'Away' || v.value === '2');
```

---

## PHASE 4 — poll-matches (the hot path)

### Check 4.1 — Batch fetch syntax

**Known ambiguity:** API-Football docs variously show `ids=1-2-3` (hyphen-separated) or `ids=1,2,3` (comma). My code uses hyphens.

**Diagnose:** After deploy, watch for this error in logs:
```
batch fixtures fetch failed: API-Football errors: ids - parameter is invalid
```

**Fix:** In `_shared/apifootball.ts`, change:
```typescript
return this.get<Fixture[]>(`/fixtures?ids=${ids.join('-')}`);
// to
return this.get<Fixture[]>(`/fixtures?ids=${ids.join('-')}`); // hyphens per docs, confirmed wrong?
```
Swap to `ids.join(',')` or fall back to N separate calls if the batch endpoint is fussy.

### Check 4.2 — State transitions firing correctly

Watch `watched_matches` during a live match:
```sql
select fixture_id, last_minute, last_home_goals, last_away_goals,
       fav_losing_since, fav_levelled_since
from watched_matches where status = 'live';
```

Expected pattern when underdog scores at minute 48:
1. Before goal: `fav_losing_since = null`
2. First poll after goal: `fav_losing_since = <now>`, goals updated
3. Subsequent polls while still losing: `fav_losing_since` unchanged
4. After equaliser: `fav_losing_since = null`, `fav_levelled_since = <now>`

**Bug if `fav_losing_since` keeps updating each poll:** The transition detection is broken. Check the `prevLosing` comparison in `poll-matches/index.ts` — likely `last_home_goals` isn't being read back before the update writes.

### Check 4.3 — Alerts firing with correct timing

After deployment, if a match is in the "favourite losing" state:
```sql
select fixture_id, fav_losing_since,
       extract(epoch from (now() - fav_losing_since)) as seconds_losing,
       (select id from alerts where fixture_id = w.fixture_id and alert_type='OPEN') as alert_id
from watched_matches w where fav_losing_since is not null;
```

- `seconds_losing < 180`: alert_id should be null (correctly waiting)
- `seconds_losing >= 180`: alert_id should be populated (alert fired)

**If seconds_losing >> 180 and alert_id still null:** something's stopping the fire. Check Edge Function logs for errors. Most likely: `cfg.max_minute_for_open` already passed (match crossed minute 60 during the VAR wait), or Telegram send failed.

### Check 4.4 — Telegram message actually arrives

**Bug most likely to bite: MarkdownV2 escaping.** A single unescaped special char rejects the whole message with 400 Bad Request.

**Diagnose:** Edge Function logs will show:
```
telegram send failed chat=-1001234567890 Bad Request: can't parse entities...
```

**Fix:** Look at the exact text being sent. Characters that MUST be escaped in MarkdownV2: `_ * [ ] ( ) ~ \` > # + - = | { } . !` — note `.` and `-` which show up in scores and dates. The `esc()` helper in `_shared/telegram.ts` handles them, but only for values passed through it. If any template substitution bypasses `esc()`, that's the bug.

**Workaround if escaping is flaky:** Temporarily switch to plain text:
```typescript
body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
// remove parse_mode entirely
```

---

## PHASE 5 — settle-matches

### Check 5.1 — Settlements running

After a watched match finishes:
```sql
select s.*, a.fired_at from settlements s join alerts a on a.id = s.alert_id
order by s.settled_at desc limit 10;
```

**If `last_home_goals` / `last_away_goals` are null:** The match ended but the poller never captured final score. Settlement script has a null-guard for this and skips — you'll need to backfill manually or ignore.

### Check 5.2 — P&L math correct

For a lay bet @ £10 stake @ 2.0 odds:
- WIN: net_pnl = +£10 − 5% commission = +£9.50
- LOSS: net_pnl = −£10 × (2.0 − 1) = −£10 (no commission on losses)

```sql
select * from pnl_summary;
```

**If net_pnl looks wildly wrong:** Check `betfair_commission_pct` in rule_config (should be 5.00, not 0.05).

---

## Emergency stops

Pause everything without uninstalling:
```sql
update rule_config set enabled = false where id = 1;
```

Unpause:
```sql
update rule_config set enabled = true where id = 1;
```

Stop cron jobs entirely:
```sql
select cron.unschedule('tipora-schedule-matches');
select cron.unschedule('tipora-poll-matches');
select cron.unschedule('tipora-settle-matches');
```

Delete a specific bad alert:
```sql
delete from alerts where id = '<uuid>';
-- settlements will cascade, telegram message is not retracted
```

---

## If you're really stuck

The system's state is entirely visible in four tables:

```sql
select * from monitored_leagues where enabled;
select * from rule_config;
select * from watched_matches where status != 'finished' order by kickoff_at;
select * from alerts order by fired_at desc limit 20;
```

Paste those into a Claude Code session and ask "what's wrong here?" — between these rows and the Edge Function logs from the Supabase dashboard (Functions → your function → Logs), there's enough info to diagnose any failure.

# Tipora Lay-The-Leader Bot — Project Context for Claude Code

## What this is

A Telegram alert system. When a pre-match football favourite (odds ≤ 1.50) is losing before the 60th minute and has been losing for 180 wall-clock seconds (VAR safety window), it posts an alert to a Telegram broadcast channel telling users to lay the team currently winning. If the favourite later equalises and holds for 180s, it posts a CLOSE alert. Every alert is tracked as a virtual £10 lay bet so the operator can measure real P&L.

## Stack

- **Database:** Supabase (Postgres + pg_cron + pg_net)
- **Compute:** Supabase Edge Functions (Deno)
- **Data source:** API-Football ([api-sports.io](https://api-sports.io)) — Ultra plan, $29/mo
- **Telegram:** bot posts to a single broadcast channel

No VPS, no external worker, no other infra. Three cron jobs run inside Supabase.

## File layout

```
supabase/
├── migrations/
│   └── 20260420_lay_the_leader.sql     # ALL schema + cron jobs
└── functions/
    ├── _shared/
    │   ├── apifootball.ts               # Typed API-Football client
    │   └── telegram.ts                  # MarkdownV2 formatter + sender
    ├── schedule-matches/index.ts        # Every 30min: populate watchlist
    ├── poll-matches/index.ts            # Every 60s: the hot path
    └── settle-matches/index.ts          # Every 5min: grade finished matches
```

## Key tables (see migration for full schema)

- `monitored_leagues` — which leagues to watch, with current_season per league
- `rule_config` — single row, tunable thresholds (fav odds, max minute, VAR delay)
- `alert_channels` — Telegram destinations
- `watched_matches` — fixtures with qualifying favourites, with state tracking
- `alerts` — one row per OPEN or CLOSE fired (unique on fixture_id + alert_type)
- `settlements` — final P&L per OPEN alert, populated at match end
- `pnl_summary` — view with overall strike rate, ROI, net P&L

## The VAR delay logic (this is the subtle bit — don't change without understanding)

`watched_matches.fav_losing_since` is set the first tick we observe the favourite losing, and cleared the tick they stop losing. An OPEN only fires when `now() - fav_losing_since >= confirmation_delay_seconds` (default 180s). **Wall-clock time, not match minutes** — because match clocks can freeze during VAR reviews. Each fresh transition into "losing" restarts the timer, which correctly handles the case where VAR pulls back an equaliser.

Same logic via `fav_levelled_since` for CLOSE alerts.

## What the operator needs to do manually (NOT Claude Code's job)

1. Create Telegram bot via @BotFather, get token
2. Create Telegram channel, add bot as admin with Post Messages permission
3. Get channel numeric chat_id (forward a message to @userinfobot)
4. Sign up at api-sports.io, subscribe to Ultra plan, get API key
5. Have a Supabase Pro project with pg_cron + pg_net extensions enabled

## What Claude Code can help with

- Reading the code and flagging bugs or inconsistencies
- Writing verification scripts (league ID checker, test harnesses)
- Running `supabase` CLI commands
- Writing deploy scripts, dry-run modes, test fixtures
- Implementing v2 features listed at bottom of README.md

## Deployment order (CRITICAL — don't skip stages)

Do these in order, verifying each before the next:

1. `supabase link --project-ref <ref>` and confirm connection
2. Verify `pg_cron` + `pg_net` enabled (Supabase dashboard → Database → Extensions)
3. `supabase db push` — runs the migration
4. Verify 3 cron jobs exist: `select jobname from cron.job where jobname like 'tipora-%';`
5. Populate `secrets` table (edge_base_url + service_role_key)
6. Set function env vars: `supabase secrets set API_FOOTBALL_KEY=... TELEGRAM_BOT_TOKEN=... PUBLIC_SITE_URL=...`
7. Deploy `schedule-matches` first, invoke manually, verify `watched_matches` populates
8. Insert row into `alert_channels` with real chat_id
9. Deploy `poll-matches`, watch it for one live match before deploying settle
10. Deploy `settle-matches`

## Known likely issues

See DEBUGGING.md for the hit list of things likely to fail on first deploy and how to diagnose each.

## Don't do these without asking

- Changing the VAR delay logic in poll-matches/index.ts (easy to introduce race conditions)
- Running the migration on a Supabase project that already has `alert_channels` or `secrets` tables from another system
- Removing the `uniq_one_alert_per_type_per_fixture` index (that's the dedup guarantee)
- Switching to match-minute-based delay (must be wall-clock — see comment in poll-matches)

## Tuning (no redeploy needed)

```sql
update rule_config set favourite_max_odds = 1.60 where id = 1;       -- widen threshold
update rule_config set max_minute_for_open = 70 where id = 1;        -- later cutoff
update rule_config set confirmation_delay_seconds = 240 where id = 1;-- longer VAR delay
update rule_config set virtual_stake_gbp = 25 where id = 1;          -- bigger virtual bets
update rule_config set enabled = false where id = 1;                 -- pause everything
```

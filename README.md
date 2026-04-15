# Tipora

**tipora.bet** — Finding the angle the market missed.

Data-driven football tipping platform with full P&L tracking, published tips, and accumulator suggestions across 30+ markets.

## Stack

- **Frontend**: Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS 4
- **Backend**: Next.js API Routes + Supabase Edge Functions
- **Database**: Supabase (PostgreSQL + pg_cron + pg_net)
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Email**: Resend
- **Data**: API-Football (api-sports.io)
- **Hosting**: Vercel

## Quick start

```bash
# Install dependencies
npm install

# Copy env template and fill in values
cp .env.example .env.local

# Run the dev server
npm run dev
```

Visit http://localhost:3000.

## Populate with seed data

With Supabase connected:

```bash
# Run the schema migration in Supabase SQL Editor
# (see supabase/migrations/001_initial_schema.sql)

# Insert mock teams, players, fixtures, stats, and tips
npx tsx scripts/seed.ts

# Trigger the pipeline (recalculates trends, generates tips, builds accas)
npx tsx scripts/run-pipeline.ts
```

## Tests

```bash
npm test
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Vercel + Supabase deployment guide.

## Project structure

```
app/
├── (routes)/           # Pages
├── api/                # API routes
│   ├── ingest/         # Data ingest from API-Football
│   ├── trends/         # Trend calculation
│   ├── tips/           # Tip generation + settlement
│   ├── acca/           # Accumulator builder
│   ├── auth/           # Sign in/up/out
│   ├── stripe/         # Checkout + webhook
│   ├── email/          # Scheduled digest emails
│   └── admin/          # Admin-only actions
lib/
├── supabase/           # Supabase clients
├── api-football/       # External data fetchers
├── trends/             # Engine, confidence scoring, acca builder
├── utils/              # Dates, odds, markets
├── stripe/             # Stripe client
└── email/              # Resend templates
components/
├── tips/               # TipCard, AccaCard, filters
├── tracker/            # P&L dashboard, graph, stats
└── ui/                 # Shared primitives
supabase/
├── migrations/         # SQL migrations (001, 002, 003, 004)
└── functions/          # Edge Functions (future)
scripts/
├── seed.ts             # Mock data inserter
└── run-pipeline.ts     # Manual pipeline trigger
tests/                  # Vitest unit tests
```

## Pipeline

Scheduled via `pg_cron`:

- 02:00 — Recalculate trends
- 06:00 — Ingest today's fixtures
- 07:00 — Generate tips
- 07:15 — Send digest email
- 07:30 — Build game acca
- Mon 08:00 — Build weekend acca
- Every 2h — Ingest results, players, settle tips
- 23:30 — Send settlement email

## Coding conventions

- TypeScript only, no `any`
- All DB access through Supabase client (never raw SQL in components)
- API-Football only called from cron jobs / Edge Functions
- Server components by default; `"use client"` only for interactivity
- Money stored as pence (integer); displayed as pounds
- Dates stored as UTC; displayed in Europe/London
- Odds stored as decimals, never fractions
- Confidence scores are integers 0-100

## License

Private.

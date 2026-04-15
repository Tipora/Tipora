# Deploying Tipora to Vercel

This guide walks you through deploying Tipora from your local machine to a live URL.

## Prerequisites

- A Vercel account ([vercel.com](https://vercel.com))
- Your Supabase project already set up
- A GitHub repo with your Tipora code pushed to it

## Step 1 — Push your code to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USER/tipora.git
git push -u origin main
```

## Step 2 — Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import" next to your `tipora` GitHub repo
3. Vercel auto-detects Next.js — leave build settings as defaults
4. Before clicking Deploy, expand "Environment Variables" and add all of these:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `CRON_SECRET` | your random cron secret string |
| `NEXT_PUBLIC_APP_URL` | `https://tipora.vercel.app` (update after first deploy) |
| `API_FOOTBALL_KEY` | your API-Football key (optional — leave blank to use seed data) |
| `STRIPE_SECRET_KEY` | Stripe secret (optional — disables checkout if missing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret (optional) |
| `STRIPE_PRO_PRICE_ID` | your Pro plan price ID (optional) |
| `RESEND_API_KEY` | Resend API key (optional) |

5. Click Deploy

## Step 3 — Update NEXT_PUBLIC_APP_URL

Once deployed, Vercel gives you a URL (e.g. `https://tipora-abc123.vercel.app`).

1. Go to your project in Vercel → Settings → Environment Variables
2. Edit `NEXT_PUBLIC_APP_URL` to match your actual URL
3. Trigger a redeploy: Deployments tab → click the three dots → Redeploy

## Step 4 — Set up pg_cron in Supabase

1. In Supabase dashboard, go to Database → Extensions
2. Enable `pg_cron` and `pg_net` (search for each, toggle on)
3. Open SQL Editor → New query
4. Copy the contents of `supabase/migrations/004_pg_cron.sql`
5. **Replace** `https://YOUR_APP_URL.vercel.app` with your actual Vercel URL
6. **Replace** `YOUR_CRON_SECRET` with the exact value from Vercel env vars
7. Run the query
8. Verify jobs are scheduled:
   ```sql
   select jobname, schedule, active from cron.job where jobname like 'tipora-%';
   ```
   You should see 10 jobs listed.

## Step 5 — Custom domain (optional)

1. In Vercel project → Settings → Domains
2. Add `tipora.bet`
3. Follow DNS instructions to point your domain at Vercel
4. Once verified, update `NEXT_PUBLIC_APP_URL` to `https://tipora.bet` and redeploy
5. Update the pg_cron function's URL too:
   ```sql
   create or replace function call_tipora_job(endpoint text)
   returns void as $$
   begin
     perform net.http_post(
       url := 'https://tipora.bet' || endpoint,
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-cron-secret', 'YOUR_CRON_SECRET'
       )
     );
   end;
   $$ language plpgsql;
   ```

## Step 6 — Make yourself an admin

So you can access `/admin`:

```sql
update profiles set is_admin = true where email = 'your@email.com';
```

## Step 7 — Verify the pipeline

Visit `https://YOUR_URL/admin` and use the manual controls to test each job individually. Once they all work, the scheduled cron jobs will run automatically.

## Troubleshooting

**Deploy fails with "Missing env var"** — Next.js build runs without env vars by default. The code uses lazy getters so this shouldn't happen, but double-check `.env.local` isn't committed to Git.

**Cron jobs don't fire** — Check:
```sql
select * from cron.job_run_details
where jobname like 'tipora-%'
order by start_time desc
limit 20;
```
Look at the `status` and `return_message` columns. Most common issues are wrong CRON_SECRET or the pg_net extension not enabled.

**Tips page is empty** — Run the pipeline manually from `/admin` in the order: Calculate Trends → Generate Tips → Build Game Acca.

**Domain doesn't work** — DNS propagation takes up to 48 hours. Use the `tipora.vercel.app` URL in the meantime.

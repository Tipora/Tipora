import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchOddsForFixture } from '@/lib/api-football/odds';

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const onlyMissing = searchParams.get('onlyMissing') === '1';

  // Fetch upcoming (NS) fixtures — we want odds for matches that haven't started
  const { data: upcoming } = await supabase
    .from('fixtures')
    .select('id, api_id')
    .eq('status', 'NS')
    .order('kickoff_at', { ascending: true })
    .limit(limit);

  if (!upcoming?.length) {
    return NextResponse.json({ ingested: 0, reason: 'No upcoming fixtures' });
  }

  let fixturesToProcess = upcoming;
  if (onlyMissing) {
    const fixtureIds = upcoming.map(f => f.id);
    const { data: existing } = await supabase
      .from('fixture_odds')
      .select('fixture_id')
      .in('fixture_id', fixtureIds);
    const existingIds = new Set((existing ?? []).map(e => e.fixture_id));
    fixturesToProcess = upcoming.filter(f => !existingIds.has(f.id));
  }

  let totalIngested = 0;
  let fixturesWithOdds = 0;
  const errors: string[] = [];

  for (const fixture of fixturesToProcess) {
    try {
      const oddsData = await fetchOddsForFixture(fixture.api_id);
      if (!oddsData.length) continue;

      const rows: Array<Record<string, unknown>> = [];

      for (const resp of oddsData) {
        for (const bm of resp.bookmakers) {
          for (const bet of bm.bets) {
            for (const val of bet.values) {
              const odds = parseFloat(val.odd);
              if (!isNaN(odds) && odds > 1) {
                rows.push({
                  fixture_id: fixture.id,
                  bookmaker: bm.name,
                  market: bet.name,
                  selection: val.value,
                  odds,
                });
              }
            }
          }
        }
      }

      if (rows.length === 0) continue;
      fixturesWithOdds++;

      // Upsert in batches of 500 to avoid payload limits
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase
          .from('fixture_odds')
          .upsert(batch, { onConflict: 'fixture_id,bookmaker,market,selection' });
        if (error) {
          errors.push(`Fixture ${fixture.api_id}: ${error.message}`);
          break;
        }
      }

      totalIngested += rows.length;
    } catch (err) {
      errors.push(`Fixture ${fixture.api_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ingested: totalIngested,
    fixturesScanned: fixturesToProcess.length,
    fixturesWithOdds,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
  });
}

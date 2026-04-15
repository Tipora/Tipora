import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchFixturesByDate, mapFixture } from '@/lib/api-football/fixtures';
import { getTrackedLeagueIds } from '@/lib/api-football/client';
import { todayUTC } from '@/lib/utils/dates';

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

  const date = todayUTC();
  const leagueIds = getTrackedLeagueIds();
  let totalIngested = 0;

  for (const leagueId of leagueIds) {
    try {
      const fixtures = await fetchFixturesByDate(date, leagueId);
      const mapped = fixtures.map(mapFixture);
      if (mapped.length > 0) {
        const { error } = await supabase
          .from('fixtures')
          .upsert(mapped, { onConflict: 'api_id' });
        if (error) throw error;
        totalIngested += mapped.length;
      }
    } catch (err) {
      console.error(`Failed to ingest fixtures for league ${leagueId}:`, err);
    }
  }

  return NextResponse.json({ ingested: totalIngested, date });
}

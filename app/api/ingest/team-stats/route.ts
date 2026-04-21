import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchTeamStatsByFixture, parseTeamStats } from '@/lib/api-football/team-stats';

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
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const onlyMissing = searchParams.get('onlyMissing') === '1';

  const { data: recentFixtures } = await supabase
    .from('fixtures')
    .select('id, api_id')
    .eq('status', 'FT')
    .order('kickoff_at', { ascending: false })
    .limit(limit);

  if (!recentFixtures?.length) {
    return NextResponse.json({ ingested: 0, reason: 'No finished fixtures' });
  }

  let fixturesToProcess = recentFixtures;
  if (onlyMissing) {
    const fixtureIds = recentFixtures.map(f => f.id);
    const { data: existing } = await supabase
      .from('team_match_stats')
      .select('fixture_id')
      .in('fixture_id', fixtureIds);
    const existingIds = new Set((existing ?? []).map(e => e.fixture_id));
    fixturesToProcess = recentFixtures.filter(f => !existingIds.has(f.id));
  }

  let totalIngested = 0;
  let fixturesWithData = 0;
  const errors: string[] = [];

  for (const fixture of fixturesToProcess) {
    try {
      const response = await fetchTeamStatsByFixture(fixture.api_id);
      const rows = parseTeamStats(response, fixture.id);
      if (rows.length === 0) continue;
      fixturesWithData++;

      const { error } = await supabase
        .from('team_match_stats')
        .upsert(rows, { onConflict: 'team_id,fixture_id' });

      if (error) {
        // Retry without advanced columns (migration 009 not applied)
        const stripped = rows.map(r => ({
          team_id: r.team_id,
          fixture_id: r.fixture_id,
          possession: r.possession,
          shots: r.shots,
          shots_on_target: r.shots_on_target,
          corners: r.corners,
          fouls: r.fouls,
          yellow_cards: r.yellow_cards,
          red_cards: r.red_cards,
          xg: r.xg,
          xg_against: r.xg_against,
        }));
        const { error: retry } = await supabase
          .from('team_match_stats')
          .upsert(stripped, { onConflict: 'team_id,fixture_id' });
        if (retry) {
          errors.push(`Fixture ${fixture.api_id}: ${error.message} (retry: ${retry.message})`);
          continue;
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
    fixturesWithData,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
  });
}

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchPlayerStatsByFixture, flattenFixturePlayers } from '@/lib/api-football/players';

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

  // ?limit=200 for backfill, default 20 for normal ingest
  // ?onlyMissing=1 skips fixtures that already have player_match_stats
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
    return NextResponse.json({ ingested: 0, reason: 'No finished fixtures to process' });
  }

  // Filter to fixtures without existing player stats
  let fixturesToProcess = recentFixtures;
  if (onlyMissing) {
    const fixtureIds = recentFixtures.map(f => f.id);
    const { data: existing } = await supabase
      .from('player_match_stats')
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
      const response = await fetchPlayerStatsByFixture(fixture.api_id);
      const rows = flattenFixturePlayers(response, fixture.id);

      if (rows.length === 0) continue;
      fixturesWithData++;

      // Upsert players first (FK for player_match_stats)
      const uniquePlayers = new Map<number, typeof rows[number]>();
      for (const r of rows) {
        if (!uniquePlayers.has(r.player_api_id)) uniquePlayers.set(r.player_api_id, r);
      }
      const playerRows = Array.from(uniquePlayers.values()).map(r => ({
        api_id: r.player_api_id,
        name: r.player_name,
        team_id: r.team_id,
        position: r.position,
        nationality: r.nationality,
        photo_url: r.photo_url,
      }));

      const { error: playerError } = await supabase
        .from('players')
        .upsert(playerRows, { onConflict: 'api_id' });
      if (playerError) {
        errors.push(`Player upsert for fixture ${fixture.api_id}: ${playerError.message}`);
        continue;
      }

      // Now upsert match stats
      const statRows = rows.map(r => ({
        player_id: r.player_api_id,
        fixture_id: r.fixture_id,
        team_id: r.team_id,
        minutes_played: r.minutes_played,
        goals: r.goals,
        assists: r.assists,
        fouls_committed: r.fouls_committed,
        fouls_drawn: r.fouls_drawn,
        yellow_cards: r.yellow_cards,
        red_cards: r.red_cards,
        shots: r.shots,
        shots_on_target: r.shots_on_target,
        passes: r.passes,
        pass_accuracy: r.pass_accuracy,
        dribbles: r.dribbles,
        duels_won: r.duels_won,
        corners_taken: r.corners_taken,
        tackles: r.tackles,
        interceptions: r.interceptions,
        blocks: r.blocks,
      }));

      const { error: statError } = await supabase
        .from('player_match_stats')
        .upsert(statRows, { onConflict: 'player_id,fixture_id' });

      if (statError) {
        // Retry without advanced columns (migration 010 not applied)
        const stripped = statRows.map(({ tackles, interceptions, blocks, ...rest }) => {
          void tackles; void interceptions; void blocks;
          return rest;
        });
        const { error: retry } = await supabase
          .from('player_match_stats')
          .upsert(stripped, { onConflict: 'player_id,fixture_id' });
        if (retry) {
          errors.push(`Stat upsert for fixture ${fixture.api_id}: ${statError.message} (retry: ${retry.message})`);
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

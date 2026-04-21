import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  fetchFixturesByDate,
  mapFixture,
  extractTeamsFromFixtures,
  extractCompetitionsFromFixtures,
  type APIFixtureResponse,
} from '@/lib/api-football/fixtures';
import { getTrackedLeagueIds } from '@/lib/api-football/client';

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

  // Window defaults: today + next 6 days
  // ?daysBack=30&daysForward=7 lets us backfill historical fixtures
  const { searchParams } = new URL(req.url);
  const daysBack = parseInt(searchParams.get('daysBack') ?? '0', 10);
  const daysForward = parseInt(searchParams.get('daysForward') ?? '6', 10);

  const today = new Date();
  const dates: string[] = [];
  for (let i = -daysBack; i <= daysForward; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const leagueIds = getTrackedLeagueIds();
  const allFixtures: APIFixtureResponse[] = [];
  const errors: Array<{ leagueId: number; date: string; error: string }> = [];

  // Fetch all fixtures first
  for (const date of dates) {
    for (const leagueId of leagueIds) {
      try {
        const fixtures = await fetchFixturesByDate(date, leagueId);
        allFixtures.push(...fixtures);
      } catch (err) {
        errors.push({
          leagueId,
          date,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  if (allFixtures.length === 0) {
    return NextResponse.json({
      ingested: 0,
      scanned: 0,
      dateRange: `${dates[0]} to ${dates[dates.length - 1]}`,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
      message: 'No fixtures returned from API-Football',
    });
  }

  // Upsert competitions first (FK for fixtures)
  const competitions = extractCompetitionsFromFixtures(allFixtures);
  if (competitions.length > 0) {
    const { error } = await supabase
      .from('competitions')
      .upsert(competitions, { onConflict: 'api_id' });
    if (error) {
      return NextResponse.json({
        ingested: 0,
        error: `Competition upsert failed: ${error.message}`,
      }, { status: 500 });
    }
  }

  // Upsert teams (FK for fixtures)
  const teams = extractTeamsFromFixtures(allFixtures);
  if (teams.length > 0) {
    const { error } = await supabase
      .from('teams')
      .upsert(teams, { onConflict: 'api_id' });
    if (error) {
      return NextResponse.json({
        ingested: 0,
        error: `Team upsert failed: ${error.message}`,
      }, { status: 500 });
    }
  }

  // Now upsert fixtures with FK targets present
  const mapped = allFixtures.map(mapFixture);

  // Try full upsert first (includes first_goal_* fields)
  let { error: fixtureError } = await supabase
    .from('fixtures')
    .upsert(mapped, { onConflict: 'api_id' });

  let ingested = fixtureError ? 0 : mapped.length;

  if (fixtureError) {
    // Retry with core fields only (migration 008 not applied)
    const stripped = mapped.map(f => ({
      api_id: f.api_id,
      competition_id: f.competition_id,
      home_team_id: f.home_team_id,
      away_team_id: f.away_team_id,
      referee_id: f.referee_id,
      kickoff_at: f.kickoff_at,
      status: f.status,
      home_score: f.home_score,
      away_score: f.away_score,
    }));
    const retry = await supabase.from('fixtures').upsert(stripped, { onConflict: 'api_id' });
    if (retry.error) {
      return NextResponse.json({
        ingested: 0,
        scanned: mapped.length,
        error: `Fixture upsert failed: ${fixtureError.message} (retry: ${retry.error.message})`,
        teamsUpserted: teams.length,
        competitionsUpserted: competitions.length,
      }, { status: 500 });
    }
    ingested = stripped.length;
    fixtureError = null;
  }

  return NextResponse.json({
    ingested,
    scanned: mapped.length,
    teamsUpserted: teams.length,
    competitionsUpserted: competitions.length,
    dateRange: `${dates[0]} to ${dates[dates.length - 1]}`,
    errorCount: errors.length,
    errors: errors.slice(0, 5),
  });
}

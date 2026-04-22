/**
 * Season-wide fixture ingest — pulls every fixture for the current season
 * across all tracked leagues in ONE API call per league.
 *
 * Typical output: 300-400 fixtures per league × 8 leagues = 2,400-3,200 fixtures
 * API cost: 8 calls total (vs 300+ for day-by-day)
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  fetchFixturesBySeason,
  mapFixture,
  extractTeamsFromFixtures,
  extractCompetitionsFromFixtures,
  type APIFixtureResponse,
} from '@/lib/api-football/fixtures';
import { getTrackedLeagueIds, getCurrentSeason } from '@/lib/api-football/client';

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const season = parseInt(searchParams.get('season') ?? String(getCurrentSeason()), 10);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const leagueIds = getTrackedLeagueIds();
  const allFixtures: APIFixtureResponse[] = [];
  const perLeague: Record<number, number> = {};
  const errors: Array<{ leagueId: number; error: string }> = [];

  // One API call per league — the big win
  for (const leagueId of leagueIds) {
    try {
      const fixtures = await fetchFixturesBySeason(leagueId, season);
      allFixtures.push(...fixtures);
      perLeague[leagueId] = fixtures.length;
    } catch (err) {
      errors.push({
        leagueId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (allFixtures.length === 0) {
    return NextResponse.json({
      ingested: 0,
      season,
      errors,
      message: 'No fixtures returned',
    });
  }

  // Upsert competitions
  const competitions = extractCompetitionsFromFixtures(allFixtures);
  if (competitions.length > 0) {
    await supabase.from('competitions').upsert(competitions, { onConflict: 'api_id' });
  }

  // Upsert teams
  const teams = extractTeamsFromFixtures(allFixtures);
  if (teams.length > 0) {
    await supabase.from('teams').upsert(teams, { onConflict: 'api_id' });
  }

  // Upsert referees
  const refereeNames = new Set<string>();
  for (const f of allFixtures) {
    if (f.fixture.referee) refereeNames.add(f.fixture.referee);
  }
  const refereeRows = Array.from(refereeNames).map((name, idx) => ({
    api_id: 900000 + idx,
    name: name.split(',')[0].trim(),
    avg_yellow_cards: 0,
    avg_red_cards: 0,
    avg_fouls: 0,
    avg_booking_points: 0,
    games_officiated: 0,
  }));
  if (refereeRows.length > 0) {
    const { data: existingRefs } = await supabase
      .from('referees')
      .select('api_id, name')
      .in('name', refereeRows.map(r => r.name));
    const existingByName = new Map((existingRefs ?? []).map(r => [r.name, r.api_id]));
    const toInsert = refereeRows.filter(r => !existingByName.has(r.name));
    if (toInsert.length > 0) {
      await supabase.from('referees').upsert(toInsert, { onConflict: 'api_id' });
    }
  }

  const { data: allRefs } = await supabase.from('referees').select('id, name');
  const refIdByName = new Map((allRefs ?? []).map(r => [r.name, r.id]));

  // Upsert fixtures in batches of 500 to avoid payload limits
  const mapped = allFixtures.map(f => {
    const base = mapFixture(f);
    const refName = base.referee_name?.split(',')[0]?.trim();
    const refereeId = refName ? refIdByName.get(refName) ?? null : null;
    const { referee_name: _rn, ...insert } = base;
    void _rn;
    return { ...insert, referee_id: refereeId };
  });

  let ingested = 0;
  const upsertErrors: string[] = [];

  for (let i = 0; i < mapped.length; i += 500) {
    const batch = mapped.slice(i, i + 500);
    const { error } = await supabase
      .from('fixtures')
      .upsert(batch, { onConflict: 'api_id' });
    if (error) {
      upsertErrors.push(`Batch ${i}: ${error.message}`);
      // Retry with core fields
      const stripped = batch.map(f => ({
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
      if (!retry.error) ingested += stripped.length;
    } else {
      ingested += batch.length;
    }
  }

  return NextResponse.json({
    season,
    ingested,
    scanned: mapped.length,
    teamsUpserted: teams.length,
    competitionsUpserted: competitions.length,
    perLeague,
    errorCount: errors.length + upsertErrors.length,
    errors: errors.slice(0, 3),
    upsertErrors: upsertErrors.slice(0, 3),
  });
}

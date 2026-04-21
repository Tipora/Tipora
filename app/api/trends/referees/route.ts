import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

  const { data: refs } = await supabase.from('referees').select('id, name');
  let updated = 0;

  for (const ref of refs ?? []) {
    // Find finished fixtures officiated by this referee
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('id, penalty_count')
      .eq('referee_id', ref.id)
      .eq('status', 'FT');

    if (!fixtures?.length) continue;

    const fixtureIds = fixtures.map(f => f.id);

    // Aggregate team match stats (cards + fouls) across those fixtures
    const { data: stats } = await supabase
      .from('team_match_stats')
      .select('yellow_cards, red_cards, fouls')
      .in('fixture_id', fixtureIds);

    if (!stats?.length) continue;

    // Sum across both teams per fixture → average per fixture
    const gamesCount = fixtures.length;
    const totalYellow = stats.reduce((s, t) => s + (t.yellow_cards ?? 0), 0);
    const totalRed = stats.reduce((s, t) => s + (t.red_cards ?? 0), 0);
    const totalFouls = stats.reduce((s, t) => s + (t.fouls ?? 0), 0);
    const totalPenalties = fixtures.reduce((s, f) => s + (f.penalty_count ?? 0), 0);

    const avgYellow = gamesCount > 0 ? totalYellow / gamesCount : 0;
    const avgRed = gamesCount > 0 ? totalRed / gamesCount : 0;
    const avgFouls = gamesCount > 0 ? totalFouls / gamesCount : 0;
    const avgPenalties = gamesCount > 0 ? totalPenalties / gamesCount : 0;
    // Booking points: 1 per yellow, 2 per red
    const avgBookingPoints = avgYellow + avgRed * 2;

    await supabase.from('referees').update({
      avg_yellow_cards: +avgYellow.toFixed(2),
      avg_red_cards: +avgRed.toFixed(2),
      avg_fouls: +avgFouls.toFixed(2),
      avg_booking_points: +avgBookingPoints.toFixed(2),
      avg_penalties: +avgPenalties.toFixed(2),
      games_officiated: gamesCount,
      updated_at: new Date().toISOString(),
    }).eq('id', ref.id);

    updated++;
  }

  return NextResponse.json({ updated, total: refs?.length ?? 0 });
}

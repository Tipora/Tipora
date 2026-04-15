import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchPlayerStatsByFixture, mapPlayerStat } from '@/lib/api-football/players';

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

  const { data: recentFixtures } = await supabase
    .from('fixtures')
    .select('id, api_id')
    .eq('status', 'FT')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (!recentFixtures?.length) {
    return NextResponse.json({ ingested: 0 });
  }

  let totalIngested = 0;

  for (const fixture of recentFixtures) {
    try {
      const playerStats = await fetchPlayerStatsByFixture(fixture.api_id);
      for (const p of playerStats) {
        const mapped = mapPlayerStat(p, fixture.id);
        if (!mapped) continue;

        const { error: playerError } = await supabase
          .from('players')
          .upsert(
            {
              api_id: mapped.player_api_id,
              name: mapped.player_name,
              team_id: mapped.team_id,
              position: mapped.position,
              nationality: mapped.nationality,
              photo_url: mapped.photo_url,
            },
            { onConflict: 'api_id' }
          );
        if (playerError) console.error('Player upsert error:', playerError);

        const { error: statError } = await supabase
          .from('player_match_stats')
          .upsert(
            {
              player_id: mapped.player_api_id,
              fixture_id: mapped.fixture_id,
              team_id: mapped.team_id,
              minutes_played: mapped.minutes_played,
              goals: mapped.goals,
              assists: mapped.assists,
              fouls_committed: mapped.fouls_committed,
              fouls_drawn: mapped.fouls_drawn,
              yellow_cards: mapped.yellow_cards,
              red_cards: mapped.red_cards,
              shots: mapped.shots,
              shots_on_target: mapped.shots_on_target,
              passes: mapped.passes,
              pass_accuracy: mapped.pass_accuracy,
              dribbles: mapped.dribbles,
              duels_won: mapped.duels_won,
              corners_taken: mapped.corners_taken,
            },
            { onConflict: 'player_id,fixture_id' }
          );
        if (statError) console.error('Stat upsert error:', statError);
        totalIngested++;
      }
    } catch (err) {
      console.error(`Failed to ingest players for fixture ${fixture.api_id}:`, err);
    }
  }

  return NextResponse.json({ ingested: totalIngested });
}

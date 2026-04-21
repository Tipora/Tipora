import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { apiFetch } from '@/lib/api-football/client';

interface APIFixtureResponse {
  fixture: { id: number; date: string; status: { short: string }; referee: string | null };
  league: { id: number };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
  events?: Array<{
    time: { elapsed: number };
    team: { id: number };
    type: string;
    detail: string;
    player?: { name: string };
  }>;
}

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

  const { data: pending } = await supabase
    .from('fixtures')
    .select('api_id')
    .in('status', ['NS', '1H', '2H', 'HT'])
    .limit(50);

  if (!pending?.length) {
    return NextResponse.json({ updated: 0 });
  }

  let updated = 0;
  for (const fixture of pending) {
    try {
      const results = await apiFetch<APIFixtureResponse>('/fixtures', {
        id: String(fixture.api_id),
      });
      const f = results[0];
      if (!f) continue;

      // Extract first goal from events
      let firstGoalTeam = null;
      let firstGoalMinute = null;
      let firstGoalPlayer = null;

      if (f.events?.length) {
        const goalEvent = f.events.find((e: { type: string; detail: string }) =>
          e.type === 'Goal' && e.detail !== 'Missed Penalty'
        );
        if (goalEvent) {
          firstGoalTeam = goalEvent.team.id === f.teams.home.id ? 'home' : 'away';
          firstGoalMinute = goalEvent.time.elapsed;
          firstGoalPlayer = goalEvent.player?.name ?? null;
        }
      }

      // Build goals_by_period from all Goal events
      const goalsByPeriod: Record<string, { home: number; away: number }> = {
        '0-15': { home: 0, away: 0 },
        '16-30': { home: 0, away: 0 },
        '31-45': { home: 0, away: 0 },
        '46-60': { home: 0, away: 0 },
        '61-75': { home: 0, away: 0 },
        '76-90': { home: 0, away: 0 },
      };

      // Count penalties awarded in this match
      let penaltyCount = 0;

      if (f.events?.length) {
        for (const event of f.events as Array<{ type: string; detail?: string; time: { elapsed: number }; team: { id: number } }>) {
          // Count any penalty-related event (scored, missed, or cancelled)
          if (event.detail === 'Penalty' || event.detail === 'Missed Penalty') {
            penaltyCount++;
          }
          if (event.type !== 'Goal') continue;
          if (event.detail === 'Missed Penalty') continue;
          const minute = event.time.elapsed;
          const isHome = event.team.id === f.teams.home.id;
          let bucket: string;
          if (minute <= 15) bucket = '0-15';
          else if (minute <= 30) bucket = '16-30';
          else if (minute <= 45) bucket = '31-45';
          else if (minute <= 60) bucket = '46-60';
          else if (minute <= 75) bucket = '61-75';
          else bucket = '76-90';
          if (isHome) goalsByPeriod[bucket].home++;
          else goalsByPeriod[bucket].away++;
        }
      }

      const { error } = await supabase
        .from('fixtures')
        .update({
          status: f.fixture.status.short,
          home_score: f.goals.home,
          away_score: f.goals.away,
          first_goal_team: firstGoalTeam,
          first_goal_minute: firstGoalMinute,
          first_goal_player: firstGoalPlayer,
          goals_by_period: goalsByPeriod,
          penalty_count: penaltyCount,
          updated_at: new Date().toISOString(),
        })
        .eq('api_id', fixture.api_id);

      if (error) throw error;
      updated++;
    } catch (err) {
      console.error(`Failed to update fixture ${fixture.api_id}:`, err);
    }
  }

  return NextResponse.json({ updated });
}

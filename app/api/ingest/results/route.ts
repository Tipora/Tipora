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
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?id=${fixture.api_id}`,
        { headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! } }
      );
      const data = await res.json();
      const f = data.response?.[0];
      if (!f) continue;

      const { error } = await supabase
        .from('fixtures')
        .update({
          status: f.fixture.status.short,
          home_score: f.goals.home,
          away_score: f.goals.away,
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

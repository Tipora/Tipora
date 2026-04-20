import { NextResponse } from 'next/server';
import { createSafeServerClient } from '@/lib/supabase/safe-client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const supabase = await createSafeServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: player } = await supabase
    .from('players')
    .select('api_id, name, position, nationality, teams:team_id(name)')
    .ilike('name', `%${name}%`)
    .limit(1)
    .single();

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const { data: stats } = await supabase
    .from('player_match_stats')
    .select('goals, assists, shots, shots_on_target, fouls_committed, yellow_cards')
    .eq('player_id', player.api_id)
    .order('created_at', { ascending: false })
    .limit(10);

  const count = stats?.length || 1;
  const sum = (key: string) => (stats ?? []).reduce((s, x) => s + ((x as Record<string, number>)[key] ?? 0), 0);

  return NextResponse.json({
    name: player.name,
    team: (player.teams as unknown as Record<string, string>)?.name ?? 'Unknown',
    position: player.position,
    avgGoals: sum('goals') / count,
    avgAssists: sum('assists') / count,
    avgShots: sum('shots') / count,
    avgSOT: sum('shots_on_target') / count,
    avgFouls: sum('fouls_committed') / count,
    avgYellows: sum('yellow_cards') / count,
    appearances: count,
  });
}

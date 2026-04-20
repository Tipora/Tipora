import { createSafeServerClient } from '@/lib/supabase/safe-client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const supabase = await createSafeServerClient();

  let players: Array<Record<string, unknown>> = [];
  if (supabase) {
    const { data } = await supabase
      .from('players')
      .select('api_id, name, position, nationality, teams:team_id(name)')
      .order('name', { ascending: true })
      .limit(100);
    players = (data ?? []) as Array<Record<string, unknown>>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Players</h1>
        <p className="mt-1 text-sm text-zinc-500">Click a player to see their stats and trends</p>
      </div>

      {players.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">No players in the database yet.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {players.map(p => (
            <Link
              key={p.api_id as number}
              href={`/players/${p.api_id}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition-colors hover:border-zinc-600"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-400">
                {(p.name as string).charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{p.name as string}</p>
                <p className="text-xs text-zinc-500">
                  {(p.teams as Record<string, string>)?.name ?? 'Unknown'} &middot; {p.position as string}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

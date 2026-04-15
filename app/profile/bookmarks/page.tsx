import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { redirect } from 'next/navigation';
import { TipCard } from '@/components/tips/TipCard';
import type { Tip } from '@/types/tip';

export const dynamic = 'force-dynamic';

export default async function BookmarksPage() {
  const supabase = await createSafeServerClient();
  if (!supabase) {
    return <div className="py-12 text-center text-zinc-500">Supabase not configured</div>;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in');

  const { data: bookmarks } = await supabase
    .from('tip_bookmarks')
    .select('tip_id, tips(*, fixtures(kickoff_at, status, home_team:teams!fixtures_home_team_id_fkey(name, logo_url), away_team:teams!fixtures_away_team_id_fkey(name, logo_url), competitions(name, logo_url)))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const rows = (bookmarks ?? []) as unknown as Array<{ tip_id: number; tips: Record<string, unknown> }>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Saved Tips</h1>
        <p className="mt-1 text-sm text-zinc-500">Tips you&apos;ve bookmarked</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">No saved tips yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Bookmark tips from the Tips page to see them here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(row => {
            const tip = row.tips as unknown as Tip & { fixtures?: Record<string, unknown> };
            if (!tip) return null;
            const fix = tip.fixtures as {
              kickoff_at?: string;
              status?: string;
              home_team?: { name?: string };
              away_team?: { name?: string };
              competitions?: { name?: string; logo_url?: string | null };
            } | undefined;
            return (
              <TipCard
                key={tip.id}
                tip={tip}
                homeTeam={fix?.home_team?.name ?? 'Home'}
                awayTeam={fix?.away_team?.name ?? 'Away'}
                leagueName={fix?.competitions?.name ?? 'Premier League'}
                leagueLogo={fix?.competitions?.logo_url ?? null}
                kickoff={fix?.kickoff_at ?? ''}
                initialBookmarked
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

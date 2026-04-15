import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { FilteredTipList } from '@/components/tips/FilteredTipList';
import type { TipMeta } from '@/components/tips/FilteredTipList';
import { TipDatePicker } from '@/components/tips/TipDatePicker';
import type { Tip } from '@/types/tip';

export const dynamic = 'force-dynamic';

export default async function HistoricalTipsPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const supabase = await createSafeServerClient();

  const tips: Tip[] = [];
  const meta: Record<number, TipMeta> = {};

  if (supabase) {
    const { data: rows } = await supabase
      .from('tips')
      .select('*, fixtures(kickoff_at, status, home_team:teams!fixtures_home_team_id_fkey(name, logo_url), away_team:teams!fixtures_away_team_id_fkey(name, logo_url), competitions(name, logo_url))')
      .eq('tip_date', date)
      .order('confidence_score', { ascending: false });

    for (const row of (rows ?? []) as Array<Record<string, unknown>>) {
      const fix = row.fixtures as {
        kickoff_at?: string;
        status?: string;
        home_team?: { name?: string; logo_url?: string | null };
        away_team?: { name?: string; logo_url?: string | null };
        competitions?: { name?: string; logo_url?: string | null };
      } | null;

      tips.push(row as unknown as Tip);
      meta[row.id as number] = {
        homeTeam: fix?.home_team?.name ?? 'Home',
        awayTeam: fix?.away_team?.name ?? 'Away',
        leagueName: fix?.competitions?.name ?? 'Premier League',
        leagueLogo: fix?.competitions?.logo_url ?? null,
        kickoff: fix?.kickoff_at ?? `${date}T15:00:00Z`,
        fixtureStatus: fix?.status,
      };
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Tips for {date}</h1>
          <p className="mt-1 text-sm text-zinc-500">Historical tips and results</p>
        </div>
        <TipDatePicker />
      </div>

      {tips.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-20 text-center">
          <p className="text-zinc-500">No tips found for this date.</p>
        </div>
      ) : (
        <FilteredTipList tips={tips} meta={meta} />
      )}
    </div>
  );
}

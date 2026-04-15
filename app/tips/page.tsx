import { todayUTC } from '@/lib/utils/dates';
import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { DEMO_TIPS } from '@/lib/demo-data';
import { FilteredTipList } from '@/components/tips/FilteredTipList';
import type { TipMeta } from '@/components/tips/FilteredTipList';
import { TipDatePicker } from '@/components/tips/TipDatePicker';
import type { Tip } from '@/types/tip';

export const dynamic = 'force-dynamic';

async function getTodaysTips(): Promise<{ tips: Tip[]; meta: Record<number, TipMeta> }> {
  const supabase = await createSafeServerClient();
  if (!supabase) {
    return { tips: DEMO_TIPS, meta: buildDemoMeta(DEMO_TIPS) };
  }

  const { data: rows } = await supabase
    .from('tips')
    .select('*, fixtures(kickoff_at, status, home_team:teams!fixtures_home_team_id_fkey(name, logo_url), away_team:teams!fixtures_away_team_id_fkey(name, logo_url), competitions(name, logo_url))')
    .eq('tip_date', todayUTC())
    .order('confidence_score', { ascending: false })
    .limit(10);

  if (!rows?.length) {
    return { tips: DEMO_TIPS, meta: buildDemoMeta(DEMO_TIPS) };
  }

  const tips: Tip[] = [];
  const meta: Record<number, TipMeta> = {};

  for (const row of rows as Array<Record<string, unknown>>) {
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
      kickoff: fix?.kickoff_at ?? new Date().toISOString(),
      fixtureStatus: fix?.status,
    };
  }

  return { tips, meta };
}

async function getBookmarkedIds(): Promise<Set<number>> {
  const supabase = await createSafeServerClient();
  if (!supabase) return new Set();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from('tip_bookmarks')
    .select('tip_id')
    .eq('user_id', user.id);

  return new Set((data ?? []).map(b => b.tip_id));
}

function buildDemoMeta(tips: Tip[]): Record<number, TipMeta> {
  const out: Record<number, TipMeta> = {};
  for (const tip of tips) {
    // Parse "Team A vs Team B — Market" or "Player — Market"
    const parts = tip.selection.split(' — ')[0];
    const vs = parts.split(' vs ');
    out[tip.id] = {
      homeTeam: vs[0] ?? 'Home',
      awayTeam: vs[1] ?? 'Away',
      leagueName: 'Premier League',
      leagueLogo: null,
      kickoff: new Date().toISOString(),
      fixtureStatus: undefined,
    };
  }
  return out;
}

export default async function TipsPage() {
  const [{ tips, meta }, bookmarkedIds] = await Promise.all([
    getTodaysTips(),
    getBookmarkedIds(),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Today&apos;s Tips</h1>
          <p className="mt-1 text-sm text-zinc-500">Top 10 tips ranked by confidence score</p>
        </div>
        <TipDatePicker />
      </div>

      <FilteredTipList tips={tips} meta={meta} bookmarkedIds={bookmarkedIds} />
    </div>
  );
}

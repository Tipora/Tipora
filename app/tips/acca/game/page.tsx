import { AccaCard } from '@/components/tips/AccaCard';
import { todayUTC } from '@/lib/utils/dates';
import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { DEMO_GAME_ACCA, DEMO_TIPS } from '@/lib/demo-data';
import type { Tip } from '@/types/tip';
import type { Accumulator } from '@/types/acca';

export const dynamic = 'force-dynamic';

export default async function GameAccaPage() {
  const supabase = await createSafeServerClient();

  let accasWithLegs: Array<{ acca: Accumulator; legs: Array<{ tip: Tip; homeTeam: string; awayTeam: string }> }> = [];

  if (supabase) {
    const { data: accas } = await supabase
      .from('accumulators')
      .select('*')
      .eq('acca_type', 'game')
      .eq('acca_date', todayUTC())
      .order('created_at', { ascending: false });

    const accaList = (accas ?? []) as Accumulator[];

    accasWithLegs = await Promise.all(
      accaList.map(async (acca) => {
        const tipIds: number[] = acca.tip_ids;
        const { data: tips } = await supabase
          .from('tips')
          .select('*, fixtures(*, home_team:teams!fixtures_home_team_id_fkey(*), away_team:teams!fixtures_away_team_id_fkey(*))')
          .in('id', tipIds);

        const legs = (tips ?? []).map((t: Record<string, unknown>) => ({
          tip: t as unknown as Tip,
          homeTeam: (t.fixtures as Record<string, Record<string, string>>)?.home_team?.name ?? 'TBC',
          awayTeam: (t.fixtures as Record<string, Record<string, string>>)?.away_team?.name ?? 'TBC',
        }));

        return { acca, legs };
      })
    );
  }

  // Demo fallback
  if (accasWithLegs.length === 0) {
    const demoLegs = DEMO_GAME_ACCA.tip_ids.map((id) => {
      const tip = DEMO_TIPS.find(t => t.id === id) ?? DEMO_TIPS[0];
      const parts = tip.selection.split(' — ')[0].split(' vs ');
      return { tip, homeTeam: parts[0] ?? 'Home', awayTeam: parts[1] ?? 'Away' };
    });
    accasWithLegs = [{ acca: DEMO_GAME_ACCA, legs: demoLegs }];
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Game Acca</h1>
        <p className="mt-1 text-sm text-zinc-500">Today&apos;s accumulator from the best same-day tips</p>
      </div>

      <div className="space-y-6">
        {accasWithLegs.map(({ acca, legs }) => (
          <AccaCard key={acca.id} acca={acca} legs={legs} />
        ))}
      </div>
    </div>
  );
}

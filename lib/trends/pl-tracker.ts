import type { SupabaseClient } from '@supabase/supabase-js';
import type { PLPeriod, PLStats } from '@/types/tip';
import { getDateRange } from '@/lib/utils/dates';

export async function getPLStats(
  period: PLPeriod,
  supabase: SupabaseClient
): Promise<PLStats> {
  const { from, to } = getDateRange(period);

  const { data } = await supabase
    .from('tips')
    .select('odds, status, pl, tip_date')
    .in('status', ['won', 'lost', 'void'])
    .gte('tip_date', from)
    .lte('tip_date', to);

  const wins = data?.filter(t => t.status === 'won').length ?? 0;
  const losses = data?.filter(t => t.status === 'lost').length ?? 0;
  const voids = data?.filter(t => t.status === 'void').length ?? 0;
  const totalPL = (data?.reduce((s, t) => s + (t.pl ?? 0), 0) ?? 0) / 100;
  const staked = (wins + losses) * 10;
  const roi = staked > 0 ? +((totalPL / staked) * 100).toFixed(1) : 0;

  return { wins, losses, voids, totalPL, staked, roi, period };
}

export async function getCumulativePL(
  period: PLPeriod,
  supabase: SupabaseClient
): Promise<Array<{ date: string; cumulative: number }>> {
  const { from, to } = getDateRange(period);

  const { data } = await supabase
    .from('tips')
    .select('pl, tip_date')
    .in('status', ['won', 'lost'])
    .gte('tip_date', from)
    .lte('tip_date', to)
    .order('tip_date', { ascending: true });

  if (!data?.length) return [];

  const dailyPL = new Map<string, number>();
  for (const tip of data) {
    const existing = dailyPL.get(tip.tip_date) ?? 0;
    dailyPL.set(tip.tip_date, existing + (tip.pl ?? 0));
  }

  const result: Array<{ date: string; cumulative: number }> = [];
  let cumulative = 0;
  for (const [date, pl] of dailyPL) {
    cumulative += pl / 100;
    result.push({ date, cumulative: +cumulative.toFixed(2) });
  }

  return result;
}

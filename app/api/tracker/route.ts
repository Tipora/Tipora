import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPLStats, getCumulativePL } from '@/lib/trends/pl-tracker';
import type { PLPeriod } from '@/types/tip';

const VALID_PERIODS: PLPeriod[] = ['day', 'week', 'month', 'season', 'allTime'];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') as PLPeriod | null;

  if (!period || !VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const [stats, graphData] = await Promise.all([
    getPLStats(period, supabase),
    getCumulativePL(period, supabase),
  ]);

  const { data: tips } = await supabase
    .from('tips')
    .select('*')
    .in('status', ['won', 'lost', 'void'])
    .order('settled_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ stats, graphData, tips: tips ?? [] });
}

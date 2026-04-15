import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { buildGameAcca } from '@/lib/trends/acca-builder';
import { todayUTC } from '@/lib/utils/dates';

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

  const acca = await buildGameAcca(todayUTC(), supabase);
  if (!acca) {
    return NextResponse.json({ message: 'Not enough qualifying tips for game acca' });
  }

  const { error } = await supabase.from('accumulators').insert({
    acca_type: acca.acca_type,
    tip_ids: acca.tip_ids,
    combined_odds: acca.combined_odds,
    stake: acca.stake,
    potential_return: acca.potential_return,
    status: acca.status,
    acca_date: acca.acca_date,
  });

  if (error) {
    console.error('Failed to insert game acca:', error);
    return NextResponse.json({ error: 'Failed to create acca' }, { status: 500 });
  }

  return NextResponse.json({ acca });
}

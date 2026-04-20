import { NextResponse } from 'next/server';
import { createSafeServerClient } from '@/lib/supabase/safe-client';
import type { Tip } from '@/types/tip';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'Date required' }, { status: 400 });

  const supabase = await createSafeServerClient();
  if (!supabase) return NextResponse.json({ tips: [], wins: 0, losses: 0, pl: 0 });

  const { data } = await supabase
    .from('tips')
    .select('*')
    .in('status', ['won', 'lost', 'void'])
    .eq('tip_date', date)
    .order('settled_at', { ascending: false });

  const tips = (data ?? []) as Tip[];
  const wins = tips.filter(t => t.status === 'won').length;
  const losses = tips.filter(t => t.status === 'lost').length;
  const pl = tips.reduce((s, t) => s + (t.pl ?? 0), 0) / 100;

  return NextResponse.json({ tips, wins, losses, pl });
}

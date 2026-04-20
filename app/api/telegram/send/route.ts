import { NextResponse } from 'next/server';
import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { sendTelegramMessage } from '@/lib/telegram/bot';
import { formatDailyTips, formatSettlement, formatGameAcca } from '@/lib/telegram/format';
import { todayUTC } from '@/lib/utils/dates';
import type { Tip } from '@/types/tip';

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'tips', 'settlement', 'acca'

  const supabase = await createSafeServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const date = todayUTC();
  let message = '';

  switch (type) {
    case 'tips': {
      const { data } = await supabase
        .from('tips')
        .select('*')
        .eq('tip_date', date)
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false })
        .limit(10);
      if (!data?.length) return NextResponse.json({ sent: false, reason: 'No tips today' });
      message = formatDailyTips(data as Tip[], date);
      break;
    }

    case 'settlement': {
      const { data } = await supabase
        .from('tips')
        .select('status, pl')
        .eq('tip_date', date)
        .in('status', ['won', 'lost']);
      const tips = data ?? [];
      const wins = tips.filter(t => t.status === 'won').length;
      const losses = tips.filter(t => t.status === 'lost').length;
      const pl = tips.reduce((s, t) => s + (t.pl ?? 0), 0) / 100;
      if (wins + losses === 0) return NextResponse.json({ sent: false, reason: 'No settled tips' });
      message = formatSettlement(date, wins, losses, pl);
      break;
    }

    case 'acca': {
      const { data: acca } = await supabase
        .from('accumulators')
        .select('tip_ids, combined_odds, potential_return')
        .eq('acca_type', 'game')
        .eq('acca_date', date)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!acca) return NextResponse.json({ sent: false, reason: 'No acca today' });
      const { data: tips } = await supabase
        .from('tips')
        .select('selection, odds')
        .in('id', acca.tip_ids as number[]);
      message = formatGameAcca(tips ?? [], acca.combined_odds, acca.potential_return);
      break;
    }

    default:
      return NextResponse.json({ error: 'Invalid type. Use tips, settlement, or acca' }, { status: 400 });
  }

  const sent = await sendTelegramMessage(message);
  return NextResponse.json({ sent, type, date });
}

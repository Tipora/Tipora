import { NextResponse } from 'next/server';
import { getResend, FROM_EMAIL } from '@/lib/email/client';
import { dailyTipDigest, settlementSummary } from '@/lib/email/templates';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { todayUTC } from '@/lib/utils/dates';
import type { Tip } from '@/types/tip';

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type'); // 'digest' or 'settlement'

  if (!type || !['digest', 'settlement'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const date = todayUTC();

  // Get Pro subscribers who opted into emails
  const { data: subscribers } = await supabase
    .from('profiles')
    .select('email')
    .eq('plan', 'pro')
    .eq('email_alerts', true);

  if (!subscribers?.length) {
    return NextResponse.json({ sent: 0, message: 'No subscribers' });
  }

  let emailContent: { subject: string; html: string };

  if (type === 'digest') {
    const { data: tips } = await supabase
      .from('tips')
      .select('*')
      .eq('tip_date', date)
      .eq('status', 'pending')
      .order('confidence_score', { ascending: false })
      .limit(10);

    if (!tips?.length) {
      return NextResponse.json({ sent: 0, message: 'No tips today' });
    }

    emailContent = dailyTipDigest(tips as Tip[], date);
  } else {
    const { data: tips } = await supabase
      .from('tips')
      .select('*')
      .eq('tip_date', date)
      .in('status', ['won', 'lost', 'void'])
      .order('settled_at', { ascending: false });

    const settled = (tips ?? []) as Tip[];
    const wins = settled.filter(t => t.status === 'won').length;
    const losses = settled.filter(t => t.status === 'lost').length;
    const totalPL = settled.reduce((s, t) => s + (t.pl ?? 0), 0) / 100;

    emailContent = settlementSummary(date, wins, losses, totalPL, settled);
  }

  let sent = 0;
  for (const sub of subscribers) {
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: sub.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
      sent++;
    } catch (err) {
      console.error(`Failed to email ${sub.email}:`, err);
    }
  }

  return NextResponse.json({ sent, type, date });
}

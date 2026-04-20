import { NextResponse } from 'next/server';
import { createSafeServerClient } from '@/lib/supabase/safe-client';

export async function POST(req: Request) {
  const { endpoint } = await req.json();

  const supabase = await createSafeServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

  return NextResponse.json({ unsubscribed: true });
}

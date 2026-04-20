import { NextResponse } from 'next/server';
import { createSafeServerClient } from '@/lib/supabase/safe-client';

export async function POST(req: Request) {
  const subscription = await req.json();

  const supabase = await createSafeServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ subscribed: true });
}

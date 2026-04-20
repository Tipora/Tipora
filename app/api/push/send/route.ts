import { NextResponse } from 'next/server';
import { createSafeServerClient } from '@/lib/supabase/safe-client';
import webpush from 'web-push';

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:tips@tipora.bet';

  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 503 });
  }

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  const { title, body, url, tag } = await req.json();

  const supabase = await createSafeServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys');

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title, body, url, tag })
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired — clean up
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
      failed++;
    }
  }

  return NextResponse.json({ sent, failed });
}

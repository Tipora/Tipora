import { NextResponse } from 'next/server';
import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { tipId, bookmaker } = await req.json();

  if (!bookmaker || typeof bookmaker !== 'string') {
    return NextResponse.json({ error: 'Bookmaker required' }, { status: 400 });
  }

  const supabase = await createSafeServerClient();
  if (!supabase) return NextResponse.json({ tracked: false });

  // Get user ID if signed in
  let userId: string | null = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const cookieStore = await cookies();
    const authClient = createServerClient(url, key, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
    });
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  }

  // Hash IP for anonymous tracking (no raw IPs stored)
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip + 'tipora-salt').digest('hex').slice(0, 16);

  await supabase.from('affiliate_clicks').insert({
    tip_id: typeof tipId === 'number' ? tipId : null,
    bookmaker,
    user_id: userId,
    ip_hash: ipHash,
  });

  return NextResponse.json({ tracked: true });
}

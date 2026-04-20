import { NextResponse } from 'next/server';
import { createSafeServerClient } from '@/lib/supabase/safe-client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

async function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => { c.forEach(({ name, value, options }) => { cookieStore.set(name, value, options); }); } },
  });
}

// GET — get or create referral code for current user
export async function GET() {
  const supabase = await getAuthClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const admin = await createSafeServerClient();
  if (!admin) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  // Check for existing code
  const { data: existing } = await admin
    .from('referral_codes')
    .select('code, uses')
    .eq('user_id', user.id)
    .single();

  if (existing) return NextResponse.json(existing);

  // Generate new code
  const code = 'TIP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  await admin.from('referral_codes').insert({ user_id: user.id, code });

  return NextResponse.json({ code, uses: 0 });
}

// POST — redeem a referral code
export async function POST(req: Request) {
  const supabase = await getAuthClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const admin = await createSafeServerClient();
  if (!admin) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  // Check code exists
  const { data: refCode } = await admin
    .from('referral_codes')
    .select('user_id')
    .eq('code', code)
    .single();

  if (!refCode) return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
  if (refCode.user_id === user.id) return NextResponse.json({ error: 'Cannot use your own code' }, { status: 400 });

  // Check not already redeemed
  const { data: alreadyUsed } = await admin
    .from('referral_redemptions')
    .select('id')
    .eq('redeemed_by', user.id)
    .single();

  if (alreadyUsed) return NextResponse.json({ error: 'Already used a referral code' }, { status: 400 });

  // Redeem
  await admin.from('referral_redemptions').insert({ code, redeemed_by: user.id });

  // Increment uses count
  const { data: current } = await admin
    .from('referral_codes')
    .select('uses')
    .eq('code', code)
    .single();

  await admin
    .from('referral_codes')
    .update({ uses: (current?.uses ?? 0) + 1 })
    .eq('code', code);

  return NextResponse.json({ redeemed: true });
}

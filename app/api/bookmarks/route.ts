import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

// Toggle a bookmark
export async function POST(req: Request) {
  const supabase = await getClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { tipId } = await req.json();
  if (typeof tipId !== 'number') return NextResponse.json({ error: 'Invalid tipId' }, { status: 400 });

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from('tip_bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('tip_id', tipId)
    .single();

  if (existing) {
    await supabase.from('tip_bookmarks').delete().eq('id', existing.id);
    return NextResponse.json({ bookmarked: false });
  }

  await supabase.from('tip_bookmarks').insert({ user_id: user.id, tip_id: tipId });
  return NextResponse.json({ bookmarked: true });
}

// List current user's bookmarked tip IDs
export async function GET() {
  const supabase = await getClient();
  if (!supabase) return NextResponse.json({ ids: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ids: [] });

  const { data } = await supabase
    .from('tip_bookmarks')
    .select('tip_id')
    .eq('user_id', user.id);

  return NextResponse.json({ ids: (data ?? []).map(b => b.tip_id) });
}

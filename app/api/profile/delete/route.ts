import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Use service role to delete user
  const admin = createServerClient(url, serviceKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });

  await admin.from('profiles').delete().eq('id', user.id);
  await admin.auth.admin.deleteUser(user.id);
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}

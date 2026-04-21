import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PRO_PATHS = ['/tips/acca/weekend'];
const PRO_API_PARAMS = ['week', 'month', 'season', 'allTime'];

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Skip if Supabase is not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Check if path requires Pro
  const isPro = PRO_PATHS.some(p => req.nextUrl.pathname.startsWith(p));
  const isProApiParam = req.nextUrl.pathname === '/api/tracker' &&
    PRO_API_PARAMS.includes(req.nextUrl.searchParams.get('period') ?? '');

  if (isPro || isProApiParam) {
    if (!user) {
      return NextResponse.redirect(new URL('/pricing', req.url));
    }

    // Check user's plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan !== 'pro') {
      return NextResponse.redirect(new URL('/pricing', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/tips/acca/weekend', '/api/tracker'],
};

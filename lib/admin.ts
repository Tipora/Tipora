import { createSafeServerClient } from './supabase/safe-client';

export async function isAdmin(): Promise<boolean> {
  const supabase = await createSafeServerClient();
  if (!supabase) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return !!profile?.is_admin;
}

export async function requireAdmin(): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (!(await isAdmin())) {
    return { ok: false, response: new Response('Forbidden', { status: 403 }) };
  }
  return { ok: true };
}

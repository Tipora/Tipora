import Link from 'next/link';
import { createSafeServerClient } from '@/lib/supabase/safe-client';

export async function AuthNav() {
  const supabase = await createSafeServerClient();
  let email: string | null = null;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  if (!email) {
    return (
      <Link href="/auth/sign-in" className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400">
        Sign in
      </Link>
    );
  }

  return (
    <Link href="/profile" className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
      <span className="h-6 w-6 rounded-full bg-emerald-500 text-center text-xs font-bold leading-6 text-black">
        {email[0].toUpperCase()}
      </span>
      <span className="hidden sm:inline">{email.split('@')[0]}</span>
    </Link>
  );
}

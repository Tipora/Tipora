function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function optional(name: string, fallback: string = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // Only validate at runtime when actually called
  get SUPABASE_URL() { return required('NEXT_PUBLIC_SUPABASE_URL'); },
  get SUPABASE_ANON_KEY() { return required('NEXT_PUBLIC_SUPABASE_ANON_KEY'); },
  get SUPABASE_SERVICE_ROLE_KEY() { return required('SUPABASE_SERVICE_ROLE_KEY'); },
  get API_FOOTBALL_KEY() { return required('API_FOOTBALL_KEY'); },
  get STRIPE_SECRET_KEY() { return required('STRIPE_SECRET_KEY'); },
  get STRIPE_WEBHOOK_SECRET() { return required('STRIPE_WEBHOOK_SECRET'); },
  get RESEND_API_KEY() { return required('RESEND_API_KEY'); },
  get CRON_SECRET() { return required('CRON_SECRET'); },
  get APP_URL() { return optional('NEXT_PUBLIC_APP_URL', 'https://tipora.bet'); },
  get STRIPE_PRO_PRICE_ID() { return optional('STRIPE_PRO_PRICE_ID', ''); },

  /** Check if Supabase is configured (for graceful degradation) */
  get hasSupabase(): boolean {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  },

  /** Check if Stripe is configured */
  get hasStripe(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  },
};

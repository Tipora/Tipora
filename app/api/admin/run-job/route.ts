import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

const ALLOWED_ENDPOINTS = [
  '/api/trends/calculate',
  '/api/tips/generate',
  '/api/acca/game',
  '/api/acca/weekend',
  '/api/tips/settle',
  '/api/ingest/fixtures',
  '/api/ingest/results',
  '/api/ingest/players',
];

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { endpoint } = await req.json();
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    return NextResponse.json({ error: 'Endpoint not allowed' }, { status: 400 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 503 });
  }

  const origin = new URL(req.url).origin;
  const startedAt = Date.now();
  try {
    const res = await fetch(`${origin}${endpoint}`, {
      method: 'POST',
      headers: { 'x-cron-secret': cronSecret },
    });
    const body = await res.json().catch(() => ({}));
    const durationMs = Date.now() - startedAt;

    // Log the run
    try {
      const { createSafeServerClient } = await import('@/lib/supabase/safe-client');
      const supabase = await createSafeServerClient();
      if (supabase) {
        await supabase.from('pipeline_runs').insert({
          job: endpoint,
          status: res.ok ? 'success' : 'error',
          result: body,
          duration_ms: durationMs,
        });
      }
    } catch {
      // Logging failure shouldn't break the response
    }

    return NextResponse.json({ status: res.status, body, durationMs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { getApiUsage } from '@/lib/api-football/client';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(getApiUsage());
}

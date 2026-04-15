import { TRACKED_COMPETITIONS } from '@/types/fixture';

const API_BASE = 'https://v3.football.api-sports.io';

export async function apiFetch<T>(endpoint: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
  });

  if (!res.ok) throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.response as T[];
}

export function getTrackedLeagueIds(): number[] {
  return Object.values(TRACKED_COMPETITIONS).map(c => c.api_id);
}

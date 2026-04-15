import { apiFetch } from './client';

interface APIFixtureRefereeResponse {
  fixture: { id: number; referee: string | null };
  league: { id: number };
  statistics: Array<{
    type: string;
    value: number | string | null;
  }> | null;
}

export async function fetchFixtureDetails(fixtureId: number): Promise<APIFixtureRefereeResponse[]> {
  return apiFetch<APIFixtureRefereeResponse>('/fixtures', {
    id: String(fixtureId),
  });
}

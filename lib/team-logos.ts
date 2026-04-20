/**
 * Team logo URL resolver.
 * When API-Football data is available, logos are stored in teams.logo_url.
 * This helper provides a fallback CDN URL pattern for teams we know.
 */
export function getTeamLogoUrl(teamApiId: number, storedUrl?: string | null): string {
  if (storedUrl) return storedUrl;
  // API-Football serves logos at this CDN pattern
  return `https://media.api-sports.io/football/teams/${teamApiId}.png`;
}

export function getLeagueLogoUrl(leagueApiId: number, storedUrl?: string | null): string {
  if (storedUrl) return storedUrl;
  return `https://media.api-sports.io/football/leagues/${leagueApiId}.png`;
}

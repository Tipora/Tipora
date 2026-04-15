const LONDON_TZ = 'Europe/London';

export function toUTC(date: Date): string {
  return date.toISOString();
}

export function toLondonTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-GB', { timeZone: LONDON_TZ });
}

export function toLondonDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', { timeZone: LONDON_TZ });
}

export function toLondonTimeOnly(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    timeZone: LONDON_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function todayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDateRange(period: 'day' | 'week' | 'month' | 'season' | 'allTime'): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'day':
      return { from: today, to: today };
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return { from: d.toISOString().split('T')[0], to: today };
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: first.toISOString().split('T')[0], to: today };
    }
    case 'season': {
      const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
      return { from: `${y}-08-01`, to: today };
    }
    case 'allTime':
      return { from: '2024-01-01', to: today };
  }
}

export function getRestDays(kickoffAt: string, lastMatchAt: string | null): number {
  if (!lastMatchAt) return 7;
  const diff = new Date(kickoffAt).getTime() - new Date(lastMatchAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function formatKickoff(isoString: string): string {
  const date = new Date(isoString);
  const day = date.toLocaleDateString('en-GB', { timeZone: LONDON_TZ, weekday: 'short' });
  const time = toLondonTimeOnly(isoString);
  return `${day} ${time}`;
}

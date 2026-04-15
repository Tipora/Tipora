import { describe, it, expect } from 'vitest';
import { getDateRange, getRestDays, penceToPounds } from '@/lib/utils/dates';

describe('getDateRange', () => {
  it('day range is today to today', () => {
    const { from, to } = getDateRange('day');
    expect(from).toBe(to);
  });

  it('week range starts on Monday', () => {
    const { from } = getDateRange('week');
    const day = new Date(from).getDay();
    expect(day).toBe(1); // Monday
  });

  it('season starts in August', () => {
    const { from } = getDateRange('season');
    expect(from).toMatch(/-08-01$/);
  });

  it('allTime starts from 2024-01-01', () => {
    const { from } = getDateRange('allTime');
    expect(from).toBe('2024-01-01');
  });
});

describe('getRestDays', () => {
  it('returns 7 when no last match', () => {
    expect(getRestDays('2025-04-10T15:00:00Z', null)).toBe(7);
  });

  it('calculates days between matches', () => {
    const days = getRestDays('2025-04-10T15:00:00Z', '2025-04-07T15:00:00Z');
    expect(days).toBe(3);
  });
});

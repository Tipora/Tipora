import { describe, it, expect } from 'vitest';
import { calcTipPL, calcAccaPL, penceToPounds, poundsToPence, impliedProbability } from '@/lib/utils/odds';

describe('calcTipPL', () => {
  it('calculates profit for a winning tip', () => {
    expect(calcTipPL(2.50, 'won')).toBe(15);
  });

  it('calculates profit for a low-odds winner', () => {
    expect(calcTipPL(1.25, 'won')).toBe(2.5);
  });

  it('returns -10 for a loss', () => {
    expect(calcTipPL(2.50, 'lost')).toBe(-10);
  });

  it('returns 0 for a void', () => {
    expect(calcTipPL(2.50, 'void')).toBe(0);
  });
});

describe('calcAccaPL', () => {
  it('calculates acca profit correctly', () => {
    expect(calcAccaPL(5.00, 'won')).toBe(40);
  });

  it('returns -10 for lost acca', () => {
    expect(calcAccaPL(5.00, 'lost')).toBe(-10);
  });
});

describe('penceToPounds', () => {
  it('converts pence to pounds string', () => {
    expect(penceToPounds(1500)).toBe('15.00');
    expect(penceToPounds(99)).toBe('0.99');
    expect(penceToPounds(0)).toBe('0.00');
  });
});

describe('poundsToPence', () => {
  it('converts pounds to pence integer', () => {
    expect(poundsToPence(15)).toBe(1500);
    expect(poundsToPence(0.99)).toBe(99);
  });
});

describe('impliedProbability', () => {
  it('converts decimal odds to implied probability', () => {
    expect(impliedProbability(2.0)).toBe(0.5);
    expect(impliedProbability(4.0)).toBe(0.25);
  });
});

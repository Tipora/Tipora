export function decimalToFractional(decimal: number): string {
  const numerator = Math.round((decimal - 1) * 100);
  const denominator = 100;
  const gcd = getGCD(numerator, denominator);
  return `${numerator / gcd}/${denominator / gcd}`;
}

export function impliedProbability(decimal: number): number {
  return 1 / decimal;
}

export function penceToPounds(pence: number): string {
  return (pence / 100).toFixed(2);
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function formatOdds(decimal: number): string {
  return decimal.toFixed(2);
}

export function calcTipPL(odds: number, status: 'won' | 'lost' | 'void'): number {
  if (status === 'won') return +(odds * 10 - 10).toFixed(2);
  if (status === 'lost') return -10;
  return 0;
}

export function calcAccaPL(combinedOdds: number, status: 'won' | 'lost' | 'void'): number {
  if (status === 'won') return +(combinedOdds * 10 - 10).toFixed(2);
  if (status === 'lost') return -10;
  return 0;
}

function getGCD(a: number, b: number): number {
  return b === 0 ? a : getGCD(b, a % b);
}

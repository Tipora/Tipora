import type { Tip } from '@/types/tip';
import { MARKET_LABELS } from '@/lib/utils/markets';

export function formatDailyTips(tips: Tip[], date: string): string {
  const header = `🎯 <b>Tipora Tips — ${date}</b>\n\n`;

  const tipLines = tips.map((tip, i) => {
    const subject = tip.selection.split(' — ')[0];
    const market = MARKET_LABELS[tip.market_type] ?? tip.market_type;
    const tagEmoji = tip.tag === 'BANKER' ? '🔒' : tip.tag === 'VALUE' ? '💎' : tip.tag === 'BOLD' ? '⚡' : '🎲';

    return `${i + 1}. ${tagEmoji} <b>${subject}</b>\n   ${market} @ <b>${tip.odds.toFixed(2)}</b> (${tip.confidence_score}/100)`;
  }).join('\n\n');

  const footer = '\n\n📊 Full analysis at tipora.bet/tips';

  return header + tipLines + footer;
}

export function formatSettlement(
  date: string,
  wins: number,
  losses: number,
  pl: number
): string {
  const plSign = pl >= 0 ? '+' : '';
  const plEmoji = pl >= 0 ? '✅' : '❌';
  const total = wins + losses;
  const strike = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

  return [
    `${plEmoji} <b>Tipora Results — ${date}</b>`,
    '',
    `💰 P&L: <b>${plSign}£${Math.abs(pl).toFixed(2)}</b>`,
    `🏆 Record: <b>${wins}W - ${losses}L</b>`,
    `🎯 Strike Rate: <b>${strike}%</b>`,
    '',
    '📈 Full tracker at tipora.bet/tracker',
  ].join('\n');
}

export function formatGameAcca(
  legs: Array<{ selection: string; odds: number }>,
  combinedOdds: number,
  potentialReturn: number
): string {
  const legLines = legs.map((leg, i) => {
    const subject = leg.selection.split(' — ')[0];
    return `${i + 1}. ${subject} @ ${leg.odds.toFixed(2)}`;
  }).join('\n');

  return [
    '🎰 <b>Game Acca</b>',
    '',
    legLines,
    '',
    `Combined odds: <b>${combinedOdds.toFixed(2)}</b>`,
    `£10 → <b>£${(combinedOdds * 10).toFixed(2)}</b>`,
    '',
    '🔗 tipora.bet/tips/acca/game',
  ].join('\n');
}

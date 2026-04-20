/**
 * Telegram message sender for Supabase Edge Functions.
 * Uses MarkdownV2 parse mode for rich formatting.
 */

export async function sendTelegram(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: 'MarkdownV2' | 'HTML' = 'HTML'
): Promise<{ ok: boolean; messageId?: number }> {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    }
  );

  const data = await res.json();
  if (!data.ok) {
    console.error('Telegram send failed:', data);
    return { ok: false };
  }
  return { ok: true, messageId: data.result?.message_id };
}

// ---------------------------------------------------------------------------
// Message formatters
// ---------------------------------------------------------------------------

export function formatOpenAlert(
  homeTeam: string,
  awayTeam: string,
  favourite: string,
  score: string,
  minute: number,
  odds: number
): string {
  const layTarget = favourite === 'home' ? awayTeam : homeTeam;
  const favName = favourite === 'home' ? homeTeam : awayTeam;
  return [
    `🔴 <b>LAY ALERT — OPEN</b>`,
    ``,
    `⚽ ${homeTeam} ${score} ${awayTeam}`,
    `⏱️ ${minute}'`,
    ``,
    `📉 <b>${favName}</b> (${odds.toFixed(2)}) is LOSING`,
    `💰 LAY <b>${layTarget}</b> (the team currently winning)`,
    ``,
    `⚠️ Confirmed: favourite has been losing for 3+ minutes`,
  ].join('\n');
}

export function formatCloseAlert(
  homeTeam: string,
  awayTeam: string,
  score: string,
  minute: number
): string {
  return [
    `🟢 <b>LAY ALERT — CLOSE</b>`,
    ``,
    `⚽ ${homeTeam} ${score} ${awayTeam}`,
    `⏱️ ${minute}'`,
    ``,
    `✅ Favourite has equalised — <b>CLOSE your lay position</b>`,
    ``,
    `⚠️ Confirmed: level score held for 3+ minutes`,
  ].join('\n');
}

export function formatSettlement(
  homeTeam: string,
  awayTeam: string,
  finalScore: string,
  result: 'win' | 'loss' | 'void',
  pnl: number,
  stake: number
): string {
  const emoji = result === 'win' ? '✅' : result === 'loss' ? '❌' : '⚪';
  const pnlStr = pnl >= 0 ? `+£${pnl.toFixed(2)}` : `-£${Math.abs(pnl).toFixed(2)}`;
  return [
    `${emoji} <b>SETTLEMENT</b>`,
    ``,
    `⚽ ${homeTeam} ${finalScore} ${awayTeam}`,
    `📊 Result: <b>${result.toUpperCase()}</b>`,
    `💰 Stake: £${stake.toFixed(2)} → P&L: <b>${pnlStr}</b>`,
  ].join('\n');
}

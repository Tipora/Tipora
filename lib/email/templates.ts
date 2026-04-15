import { penceToPounds } from '@/lib/utils/odds';
import type { Tip } from '@/types/tip';
import { MARKET_LABELS } from '@/lib/utils/markets';

export function dailyTipDigest(tips: Tip[], date: string): { subject: string; html: string } {
  const tipRows = tips.map(tip => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #27272a;color:#d4d4d8;">${tip.selection.split(' — ')[0]}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #27272a;color:#d4d4d8;">${MARKET_LABELS[tip.market_type] ?? tip.market_type}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #27272a;color:#ffffff;font-weight:bold;">${tip.odds.toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #27272a;color:#34d399;font-weight:bold;">${tip.confidence_score}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #27272a;color:${tagColor(tip.tag)};font-weight:bold;">${tip.tag}</td>
    </tr>
  `).join('');

  return {
    subject: `Tipora Tips for ${date} (${tips.length} picks)`,
    html: `
      <div style="background:#09090b;color:#d4d4d8;font-family:system-ui,sans-serif;padding:32px;max-width:640px;margin:0 auto;">
        <h1 style="color:#ffffff;font-size:24px;margin:0 0 4px;">
          tipora<span style="color:#34d399;">.</span>bet
        </h1>
        <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Daily tips for ${date}</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="border-bottom:2px solid #3f3f46;">
              <th style="padding:8px 12px;text-align:left;color:#71717a;font-weight:500;">Selection</th>
              <th style="padding:8px 12px;text-align:left;color:#71717a;font-weight:500;">Market</th>
              <th style="padding:8px 12px;text-align:left;color:#71717a;font-weight:500;">Odds</th>
              <th style="padding:8px 12px;text-align:left;color:#71717a;font-weight:500;">Score</th>
              <th style="padding:8px 12px;text-align:left;color:#71717a;font-weight:500;">Tag</th>
            </tr>
          </thead>
          <tbody>${tipRows}</tbody>
        </table>

        <p style="margin:24px 0 0;font-size:13px;color:#71717a;">
          View full tips at <a href="https://tipora.bet/tips" style="color:#34d399;">tipora.bet/tips</a>
        </p>
        <p style="margin:16px 0 0;font-size:11px;color:#52525b;">
          18+ only. Please gamble responsibly. Tipora does not place bets.
        </p>
      </div>
    `,
  };
}

export function settlementSummary(
  date: string,
  wins: number,
  losses: number,
  totalPL: number,
  settledTips: Tip[]
): { subject: string; html: string } {
  const plColor = totalPL >= 0 ? '#4ade80' : '#f87171';
  const plSign = totalPL >= 0 ? '+' : '';

  const resultRows = settledTips.map(tip => {
    const statusColor = tip.status === 'won' ? '#4ade80' : tip.status === 'lost' ? '#f87171' : '#71717a';
    const plText = tip.pl !== null ? `${tip.pl > 0 ? '+' : ''}£${penceToPounds(Math.abs(tip.pl))}` : '-';
    return `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #27272a;color:#d4d4d8;">${MARKET_LABELS[tip.market_type] ?? tip.market_type}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #27272a;color:${statusColor};font-weight:bold;">${(tip.status ?? '').toUpperCase()}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #27272a;color:#d4d4d8;">${tip.odds.toFixed(2)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #27272a;color:${statusColor};font-weight:bold;">${plText}</td>
      </tr>
    `;
  }).join('');

  return {
    subject: `Tipora Results ${date}: ${plSign}£${Math.abs(totalPL).toFixed(2)}`,
    html: `
      <div style="background:#09090b;color:#d4d4d8;font-family:system-ui,sans-serif;padding:32px;max-width:640px;margin:0 auto;">
        <h1 style="color:#ffffff;font-size:24px;margin:0 0 4px;">
          tipora<span style="color:#34d399;">.</span>bet
        </h1>
        <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Settlement summary for ${date}</p>

        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="background:#18181b;border-radius:12px;padding:16px;text-align:center;flex:1;">
            <div style="font-size:12px;color:#71717a;">P&L</div>
            <div style="font-size:24px;font-weight:bold;color:${plColor};">${plSign}£${Math.abs(totalPL).toFixed(2)}</div>
          </div>
          <div style="background:#18181b;border-radius:12px;padding:16px;text-align:center;flex:1;">
            <div style="font-size:12px;color:#71717a;">Record</div>
            <div style="font-size:24px;font-weight:bold;color:#ffffff;">${wins}W - ${losses}L</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:2px solid #3f3f46;">
              <th style="padding:6px 12px;text-align:left;color:#71717a;">Market</th>
              <th style="padding:6px 12px;text-align:left;color:#71717a;">Result</th>
              <th style="padding:6px 12px;text-align:left;color:#71717a;">Odds</th>
              <th style="padding:6px 12px;text-align:left;color:#71717a;">P&L</th>
            </tr>
          </thead>
          <tbody>${resultRows}</tbody>
        </table>

        <p style="margin:24px 0 0;font-size:13px;color:#71717a;">
          Full tracker at <a href="https://tipora.bet/tracker" style="color:#34d399;">tipora.bet/tracker</a>
        </p>
        <p style="margin:16px 0 0;font-size:11px;color:#52525b;">
          18+ only. Please gamble responsibly.
        </p>
      </div>
    `,
  };
}

export function welcomeEmail(userEmail: string): { subject: string; html: string } {
  return {
    subject: 'Welcome to Tipora',
    html: `
      <div style="background:#09090b;color:#d4d4d8;font-family:system-ui,sans-serif;padding:32px;max-width:640px;margin:0 auto;">
        <h1 style="color:#ffffff;font-size:24px;margin:0 0 4px;">
          tipora<span style="color:#34d399;">.</span>bet
        </h1>
        <p style="color:#71717a;font-size:14px;margin:0 0 24px;">Finding the angle the market missed.</p>

        <p style="font-size:15px;line-height:1.6;">
          Welcome to Tipora, ${userEmail.split('@')[0]}!
        </p>
        <p style="font-size:15px;line-height:1.6;">
          Every day we publish up to 10 data-driven football tips, each scored across five
          confidence dimensions. Only the strongest picks make the cut.
        </p>
        <p style="font-size:15px;line-height:1.6;">Here is what you get for free:</p>
        <ul style="font-size:14px;line-height:1.8;color:#a1a1aa;">
          <li>Top 3 daily tips</li>
          <li>Game Acca (same-day accumulator)</li>
          <li>Today's P&L snapshot</li>
        </ul>
        <p style="font-size:15px;line-height:1.6;">
          Want all 10 tips, weekend accas, full history and confidence breakdowns?
          <a href="https://tipora.bet/pricing" style="color:#34d399;">Upgrade to Pro for £9.99/month</a>.
        </p>

        <p style="margin:24px 0 0;font-size:13px;color:#71717a;">
          <a href="https://tipora.bet/tips" style="color:#34d399;">View today's tips</a>
        </p>
        <p style="margin:16px 0 0;font-size:11px;color:#52525b;">
          18+ only. Please gamble responsibly.
        </p>
      </div>
    `,
  };
}

function tagColor(tag: string): string {
  const map: Record<string, string> = {
    BANKER: '#60efff',
    VALUE: '#00ff87',
    BOLD: '#ffd60a',
    LONGSHOT: '#ff4d6d',
  };
  return map[tag] ?? '#ffffff';
}

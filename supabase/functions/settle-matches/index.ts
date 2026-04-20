/**
 * settle-matches — runs every 5 minutes via pg_cron.
 *
 * For each finished watched match that had an OPEN alert:
 * 1. Determine if the favourite won, drew, or lost
 * 2. Calculate lay bet P&L:
 *    - Favourite lost or drew (our lay wins):  profit = +stake
 *    - Favourite won (our lay loses):          loss = -stake * (odds - 1)
 *    - Match voided/cancelled:                 void = 0
 * 3. Insert settlement record
 * 4. Post settlement message to Telegram
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendTelegram, formatSettlement } from '../_shared/telegram.ts';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get config
    const { data: config } = await supabase
      .from('rule_config')
      .select('virtual_stake_gbp')
      .eq('id', 1)
      .single();

    const stake = Number(config?.virtual_stake_gbp ?? 10);

    // Get channels
    const { data: channels } = await supabase
      .from('alert_channels')
      .select('chat_id')
      .eq('active', true);
    const chatIds = (channels ?? []).map(c => c.chat_id);

    // Find finished matches that have an OPEN alert but no settlement yet
    const { data: finishedMatches } = await supabase
      .from('watched_matches')
      .select('*')
      .in('status', ['finished', 'postponed', 'cancelled'])
      .eq('open_alert_fired', true);

    let settled = 0;

    for (const match of finishedMatches ?? []) {
      // Check if already settled
      const { data: existingSettlement } = await supabase
        .from('lay_settlements')
        .select('id')
        .eq('fixture_api_id', match.fixture_api_id)
        .single();

      if (existingSettlement) continue;

      // Get the OPEN alert
      const { data: openAlert } = await supabase
        .from('lay_alerts')
        .select('id')
        .eq('fixture_api_id', match.fixture_api_id)
        .eq('alert_type', 'OPEN')
        .single();

      if (!openAlert) continue;

      const homeScore = match.home_score ?? 0;
      const awayScore = match.away_score ?? 0;
      const finalScore = `${homeScore}-${awayScore}`;

      let layResult: 'win' | 'loss' | 'void';
      let pnl: number;
      let favouriteWon: boolean;

      if (match.status === 'postponed' || match.status === 'cancelled') {
        // Void — no P&L
        layResult = 'void';
        pnl = 0;
        favouriteWon = false;
      } else {
        // Determine if favourite won
        const favIsHome = match.favourite === 'home';
        const favScore = favIsHome ? homeScore : awayScore;
        const oppScore = favIsHome ? awayScore : homeScore;

        favouriteWon = favScore > oppScore;
        const favDrew = favScore === oppScore;

        if (favouriteWon) {
          // Favourite won → our lay LOST
          // Lay loss = stake * (odds - 1)
          layResult = 'loss';
          pnl = -(stake * (Number(match.favourite_odds) - 1));
        } else {
          // Favourite lost or drew → our lay WON
          // Lay win = +stake
          layResult = 'win';
          pnl = stake;
        }
      }

      // Insert settlement
      const { error: settleError } = await supabase.from('lay_settlements').insert({
        alert_id: openAlert.id,
        fixture_api_id: match.fixture_api_id,
        final_score: finalScore,
        favourite_won: favouriteWon,
        lay_result: layResult,
        stake_gbp: stake,
        pnl_gbp: +pnl.toFixed(2),
      });

      if (settleError) {
        console.error(`Settlement insert error for ${match.fixture_api_id}:`, settleError);
        continue;
      }

      // Post settlement to Telegram
      const message = formatSettlement(
        match.home_team, match.away_team,
        finalScore, layResult, pnl, stake
      );
      for (const chatId of chatIds) {
        await sendTelegram(botToken, chatId, message);
      }

      settled++;
      console.log(`Settled: ${match.home_team} vs ${match.away_team} — ${layResult} (${pnl >= 0 ? '+' : ''}£${pnl.toFixed(2)})`);
    }

    // Return summary including P&L view
    const { data: summary } = await supabase
      .from('lay_pnl_summary')
      .select('*')
      .single();

    return new Response(JSON.stringify({ settled, summary }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('settle-matches error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

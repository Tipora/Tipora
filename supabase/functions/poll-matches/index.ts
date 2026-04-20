/**
 * poll-matches — runs every 60 seconds via pg_cron.
 *
 * The hot path. For each live watched match:
 * 1. Fetch current score from API-Football
 * 2. Determine if favourite is losing
 * 3. Track wall-clock duration of "favourite losing" state
 * 4. Fire OPEN alert when fav has been losing for confirmation_delay_seconds
 * 5. Track wall-clock duration of "favourite levelled" state after OPEN
 * 6. Fire CLOSE alert when fav has been level for confirmation_delay_seconds
 *
 * CRITICAL: VAR delay uses WALL-CLOCK time (now() - fav_losing_since),
 * NOT match minutes. Match clocks freeze during VAR reviews, stoppages, etc.
 * Each fresh transition into "losing" restarts the timer.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchLiveFixtures } from '../_shared/apifootball.ts';
import { sendTelegram, formatOpenAlert, formatCloseAlert } from '../_shared/telegram.ts';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('API_FOOTBALL_KEY')!;
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get config
    const { data: config } = await supabase
      .from('rule_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (!config?.enabled) {
      return json({ skipped: true, reason: 'Bot disabled' });
    }

    const confirmDelay = Number(config.confirmation_delay_seconds);
    const maxMinute = Number(config.max_minute_for_open);

    // Get alert channels
    const { data: channels } = await supabase
      .from('alert_channels')
      .select('chat_id')
      .eq('active', true);

    const chatIds = (channels ?? []).map(c => c.chat_id);

    // Get matches that are scheduled or live
    const { data: matches } = await supabase
      .from('watched_matches')
      .select('*')
      .in('status', ['scheduled', 'live']);

    if (!matches?.length) {
      return json({ polled: 0, reason: 'No active matches' });
    }

    // Fetch live scores in batch
    const fixtureIds = matches.map(m => m.fixture_api_id);
    const liveData = await fetchLiveFixtures(apiKey, fixtureIds);
    const liveMap = new Map(liveData.map(f => [f.fixture.id, f]));

    const now = new Date();
    let opensFired = 0;
    let closesFired = 0;

    for (const match of matches) {
      const live = liveMap.get(match.fixture_api_id);
      if (!live) continue;

      const status = live.fixture.status.short;
      const minute = live.fixture.status.elapsed ?? 0;
      const homeScore = live.goals.home ?? 0;
      const awayScore = live.goals.away ?? 0;
      const score = `${homeScore}-${awayScore}`;

      // Update match status
      let matchStatus = match.status;
      if (['1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(status)) {
        matchStatus = 'live';
      } else if (status === 'FT' || status === 'AET' || status === 'PEN') {
        matchStatus = 'finished';
      } else if (status === 'PST') {
        matchStatus = 'postponed';
      } else if (status === 'CANC' || status === 'ABD') {
        matchStatus = 'cancelled';
      }

      // Determine if favourite is currently losing
      const favIsHome = match.favourite === 'home';
      const favScore = favIsHome ? homeScore : awayScore;
      const oppScore = favIsHome ? awayScore : homeScore;
      const favLosing = favScore < oppScore;
      const favLevel = favScore === oppScore;

      // --- FAV LOSING STATE TRACKING ---
      let favLosingSince = match.fav_losing_since
        ? new Date(match.fav_losing_since)
        : null;

      if (favLosing && !favLosingSince) {
        // Just started losing — start the wall-clock timer
        favLosingSince = now;
      } else if (!favLosing) {
        // Not losing anymore — clear the timer
        favLosingSince = null;
      }
      // If favLosing && favLosingSince already set → timer continues (no reset)

      // --- OPEN ALERT ---
      let openFired = match.open_alert_fired;
      if (
        favLosing &&
        favLosingSince &&
        !openFired &&
        minute <= maxMinute &&
        matchStatus === 'live' &&
        (now.getTime() - favLosingSince.getTime()) >= confirmDelay * 1000
      ) {
        // Fire OPEN alert
        const message = formatOpenAlert(
          match.home_team, match.away_team,
          match.favourite, score, minute,
          Number(match.favourite_odds)
        );

        for (const chatId of chatIds) {
          const result = await sendTelegram(botToken, chatId, message);
          // Store alert
          await supabase.from('lay_alerts').upsert({
            fixture_api_id: match.fixture_api_id,
            alert_type: 'OPEN',
            home_team: match.home_team,
            away_team: match.away_team,
            favourite: match.favourite,
            score_at_alert: score,
            match_minute_at_alert: minute,
            odds_at_alert: match.favourite_odds,
            message_sent: result.ok,
            telegram_message_id: result.messageId,
          }, { onConflict: 'fixture_api_id,alert_type' });
        }

        openFired = true;
        opensFired++;
        console.log(`OPEN: ${match.home_team} vs ${match.away_team} — ${score} (${minute}')`);
      }

      // --- FAV LEVELLED STATE TRACKING (only after OPEN fired) ---
      let favLevelledSince = match.fav_levelled_since
        ? new Date(match.fav_levelled_since)
        : null;

      if (openFired && !match.close_alert_fired) {
        if (favLevel && !favLevelledSince) {
          favLevelledSince = now;
        } else if (!favLevel) {
          favLevelledSince = null;
        }
      }

      // --- CLOSE ALERT ---
      let closeFired = match.close_alert_fired;
      if (
        openFired &&
        favLevel &&
        favLevelledSince &&
        !closeFired &&
        matchStatus === 'live' &&
        (now.getTime() - favLevelledSince.getTime()) >= confirmDelay * 1000
      ) {
        const message = formatCloseAlert(
          match.home_team, match.away_team, score, minute
        );

        for (const chatId of chatIds) {
          const result = await sendTelegram(botToken, chatId, message);
          await supabase.from('lay_alerts').upsert({
            fixture_api_id: match.fixture_api_id,
            alert_type: 'CLOSE',
            home_team: match.home_team,
            away_team: match.away_team,
            favourite: match.favourite,
            score_at_alert: score,
            match_minute_at_alert: minute,
            odds_at_alert: match.favourite_odds,
            message_sent: result.ok,
            telegram_message_id: result.messageId,
          }, { onConflict: 'fixture_api_id,alert_type' });
        }

        closeFired = true;
        closesFired++;
        console.log(`CLOSE: ${match.home_team} vs ${match.away_team} — ${score} (${minute}')`);
      }

      // --- UPDATE MATCH STATE ---
      await supabase.from('watched_matches').update({
        status: matchStatus,
        match_minute: minute,
        home_score: homeScore,
        away_score: awayScore,
        fav_losing_since: favLosingSince?.toISOString() ?? null,
        fav_levelled_since: favLevelledSince?.toISOString() ?? null,
        open_alert_fired: openFired,
        close_alert_fired: closeFired,
        last_polled_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', match.id);
    }

    return json({ polled: matches.length, opensFired, closesFired });
  } catch (err) {
    console.error('poll-matches error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}

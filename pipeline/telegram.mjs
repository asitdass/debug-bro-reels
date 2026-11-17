// Optional approval gate: sends the rendered reel to your phone on Telegram with Approve / Skip buttons.
// Create a bot with @BotFather (free), send it any message once, then set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.
import fs from 'node:fs';
import path from 'node:path';
import {env, log} from './util.mjs';

const api = (m) => `https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/${m}`;

export async function notify(text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  await fetch(api('sendMessage'), {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({chat_id: env('TELEGRAM_CHAT_ID'), text, disable_web_page_preview: true}),
  }).catch(() => {});
}

/**
 * Returns 'approve' | 'skip'. On timeout returns APPROVAL_DEFAULT (default 'approve', so the
 * pipeline stays hands-off when you don't answer).
 */
export async function askApproval({video, caption, slug}) {
  const markup = JSON.stringify({inline_keyboard: [[{text: 'Post it', callback_data: `ok:${slug}`}, {text: 'Skip', callback_data: `no:${slug}`}]]});
  const sent = await sendWithRetry(video, `Debug Bro: ${slug}\n\n${caption}`.slice(0, 1000), markup);
  const sentId = sent.result?.message_id;

  const timeoutMin = Number(env('APPROVAL_TIMEOUT_MIN', '120'));
  const fallback = env('APPROVAL_DEFAULT', 'approve');
  log(`waiting up to ${timeoutMin} min for approval on Telegram (default: ${fallback})…`);
  let offset = 0;
  const until = Date.now() + timeoutMin * 60_000;
  while (Date.now() < until) {
    const r = await (await fetch(api(`getUpdates?timeout=50&offset=${offset}&allowed_updates=["callback_query"]`))).json();
    for (const u of r.result ?? []) {
      offset = u.update_id + 1;
      const d = u.callback_query?.data ?? '';
      // only taps on the message we just sent count (old messages from earlier runs are ignored)
      if (d.endsWith(`:${slug}`) && u.callback_query?.message?.message_id === sentId) {
        await fetch(api('answerCallbackQuery'), {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({callback_query_id: u.callback_query.id, text: d.startsWith('ok') ? 'Posting…' : 'Skipped'})});
        return d.startsWith('ok') ? 'approve' : 'skip';
      }
    }
  }
  await notify(`No answer for ${slug}; going with "${fallback}".`);
  return fallback;
}

/** Sends a video without buttons (dry-run previews). */
export async function sendPreview({video, caption}) {
  await sendWithRetry(video, caption.slice(0, 1000));
}

/**
 * Telegram's upload endpoint sometimes fails with a 5xx/"internal Server Error during file upload".
 * Retry sendVideo a few times, then fall back to sendDocument (same file, no streaming preview).
 */
async function sendWithRetry(video, caption, replyMarkup) {
  const attempts = [
    ['sendVideo', 'video'],
    ['sendVideo', 'video'],
    ['sendVideo', 'video'],
    ['sendDocument', 'document'],
    ['sendDocument', 'document'],
  ];
  let last;
  for (const [i, [method, field]] of attempts.entries()) {
    const form = new FormData();
    form.append('chat_id', env('TELEGRAM_CHAT_ID'));
    form.append('caption', caption);
    if (method === 'sendVideo') form.append('supports_streaming', 'true');
    if (replyMarkup) form.append('reply_markup', replyMarkup);
    form.append(field, new Blob([fs.readFileSync(video)], {type: 'video/mp4'}), path.basename(video));
    try {
      const r = await (await fetch(api(method), {method: 'POST', body: form})).json();
      if (r.ok) return r;
      last = JSON.stringify(r);
    } catch (e) {
      last = e.message;
    }
    log(`Telegram ${method} failed (attempt ${i + 1}): ${last}`);
    await new Promise((res) => setTimeout(res, 5000 * (i + 1)));
  }
  throw new Error(`Telegram upload failed after retries: ${last}`);
}

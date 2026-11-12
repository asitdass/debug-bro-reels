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
  const chat = env('TELEGRAM_CHAT_ID');
  const form = new FormData();
  form.append('chat_id', chat);
  form.append('caption', `Debug Bro: ${slug}\n\n${caption}`.slice(0, 1000));
  form.append('supports_streaming', 'true');
  form.append('reply_markup', JSON.stringify({inline_keyboard: [[{text: 'Post it', callback_data: `ok:${slug}`}, {text: 'Skip', callback_data: `no:${slug}`}]]}));
  form.append('video', new Blob([fs.readFileSync(video)], {type: 'video/mp4'}), path.basename(video));
  const sent = await (await fetch(api('sendVideo'), {method: 'POST', body: form})).json();
  if (!sent.ok) throw new Error(`Telegram sendVideo failed: ${JSON.stringify(sent)}`);

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
      if (d.endsWith(`:${slug}`)) {
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
  const form = new FormData();
  form.append('chat_id', env('TELEGRAM_CHAT_ID'));
  form.append('caption', caption.slice(0, 1000));
  form.append('supports_streaming', 'true');
  form.append('video', new Blob([fs.readFileSync(video)], {type: 'video/mp4'}), path.basename(video));
  const r = await (await fetch(api('sendVideo'), {method: 'POST', body: form})).json();
  if (!r.ok) throw new Error(JSON.stringify(r));
}

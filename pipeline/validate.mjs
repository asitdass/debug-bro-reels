// Checks an episode against the schema and the Debug Bro content rules.
// usage: node pipeline/validate.mjs [slug]   (defaults to the newest episode)
import fs from 'node:fs';
import path from 'node:path';
import {episodeSchema} from '../src/schema.js';
import {ROOT, epDir, latestSlug, readJSON} from './util.mjs';

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export function validate(slug) {
  const file = path.join(epDir(slug), 'episode.json');
  const raw = readJSON(file, null);
  if (!raw) return {ok: false, errors: [`cannot read ${file}`], warnings: []};
  const errors = [];
  const warnings = [];
  const parsed = episodeSchema.safeParse(raw);
  if (!parsed.success) {
    for (const i of parsed.error.issues) errors.push(`${i.path.join('.')}: ${i.message}`);
    return {ok: false, errors, warnings};
  }
  const ep = parsed.data;
  if (ep.slug !== slug) errors.push(`slug "${ep.slug}" must match folder "${slug}"`);
  if (!['coldopen', 'hook'].includes(ep.scenes[0].type)) errors.push('first scene must be a "coldopen" (preferred) or "hook"');
  if (ep.scenes[0].type === 'hook') warnings.push('prefer a "coldopen": show the failure in the first second');
  if (ep.scenes.length > 10) warnings.push(`${ep.scenes.length} scenes; 6–9 keeps a 30 s reel punchy`);
  if (ep.scenes.at(-1).type !== 'rule') errors.push('last scene must be a "rule" (payoff + send prompt)');

  const words = ep.scenes.reduce((n, s) => n + s.vo.trim().split(/\s+/).length, 0);
  if (words > 105) errors.push(`voice-over is ${words} words; keep it ≤ 105 (≈35 s). Short reels hold viewers`);
  if (words < 55) warnings.push(`voice-over is only ${words} words (≈${Math.round(words / 3)} s)`);
  ep.scenes.forEach((s, i) => {
    const n = s.vo.trim().split(/\s+/).length;
    if (n > 22) errors.push(`scene ${i + 1}: vo has ${n} words; split it (max 22, a new visual every ~2–5 s)`);
    if (n < 4) warnings.push(`scene ${i + 1}: vo has only ${n} words, the scene may flash by`);
    const onScreen = JSON.stringify({...s, vo: undefined});
    if (EMOJI.test(onScreen)) errors.push(`scene ${i + 1}: no emoji in on-screen text (fonts can't render them)`);
  });
  if (!/(भेजो|bhejo|send)/i.test(ep.scenes.at(-1).cta + ep.scenes.at(-1).vo))
    warnings.push('last scene should ask viewers to send the reel to someone');
  if (!ep.sources?.length) warnings.push('no sources listed; every real-world number or incident needs one');
  if (ep.hashtags.length > 3) warnings.push('Instagram limits hashtags; 3 focused tags work best');

  const published = readJSON(path.join(ROOT, 'data/published.json'), []);
  const dupe = published.find((p) => p.slug !== slug && p.topic?.toLowerCase() === ep.topic.toLowerCase());
  if (dupe) errors.push(`topic already published as ${dupe.slug}`);

  return {ok: errors.length === 0, errors, warnings, words};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || latestSlug();
  const r = validate(slug);
  for (const w of r.warnings) console.log(`warn  ${w}`);
  for (const e of r.errors) console.log(`ERROR ${e}`);
  console.log(r.ok ? `OK ${slug} (${r.words} words ≈ ${Math.round(r.words / 3)}s)` : `FAILED ${slug}`);
  process.exit(r.ok ? 0 : 1);
}

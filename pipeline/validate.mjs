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
  const HOOKS = ['coldopen', 'hook', 'moment', 'board', 'dialog', 'headline', 'tip'];
  if (!HOOKS.includes(ep.scenes[0].type)) errors.push(`first scene must be a hook scene (${HOOKS.join(', ')}), not a chart`);
  if (ep.scenes.length < 6) warnings.push(`${ep.scenes.length} scenes; 7–12 gives a new picture every 2–3 s`);
  if (!ep.format && ep.number > 3) errors.push('set "format" (desi-story, whiteboard, ai-hack, news, skit, myth-fact): see formats.md');

  // anti-repetition: compare with the episodes before this one (the reason episodes 1-3 felt the same)
  const others = fs
    .readdirSync(path.join(ROOT, 'episodes'), {withFileTypes: true})
    .filter((d) => d.isDirectory() && d.name !== slug && fs.existsSync(path.join(ROOT, 'episodes', d.name, 'episode.json')))
    .map((d) => readJSON(path.join(ROOT, 'episodes', d.name, 'episode.json'), null))
    .filter((e) => e && e.number < ep.number)
    // already-published episodes are history: only new ones are held to the anti-repetition rules
    .filter(() => !readJSON(path.join(ROOT, 'data/published.json'), []).some((p) => p.slug === slug))
    .sort((a, b) => b.number - a.number);
  const prev = others[0];
  const lastN = (n) => others.slice(0, n);
  const fmt = (e) => e.format ?? 'legacy';
  if (prev && ep.format && fmt(prev) === ep.format) errors.push(`format "${ep.format}" was used by the previous episode (${prev.slug}); pick another`);
  if (ep.format && lastN(4).filter((e) => fmt(e) === ep.format).length >= 2) warnings.push(`format "${ep.format}" already used twice in the last 4 episodes`);
  if (prev && prev.scenes?.[0]?.type === ep.scenes[0].type && ep.scenes[0].type !== 'dialog')
    errors.push(`first scene type "${ep.scenes[0].type}" opened the previous episode too; open differently`);
  const text = JSON.stringify(ep.scenes);
  if (/\bLPA\b/i.test(text) && lastN(5).some((e) => /\bLPA\b/i.test(JSON.stringify(e.scenes))))
    errors.push('the "15 LPA" bit was used in the last 5 episodes; no recurring gags');
  if (ep.scenes.some((s) => s.type === 'rule') && lastN(3).some((e) => e.scenes?.some((s) => s.type === 'rule')))
    errors.push('a "rule" (दोहा) ending was used in the last 3 episodes; end with the payoff + comment keyword instead');
  if (ep.scenes.some((s) => s.type === 'chat') && lastN(3).some((e) => e.scenes?.some((s) => s.type === 'chat')))
    errors.push('a "chat" interview scene was used in the last 3 episodes; use dialog or another setup');
  if (ep.number > 4) {
    if (!ep.style) errors.push('set "style" (cinema, notebook, blueprint, newsroom, poster, terminal, comic): see src/styles.ts');
    const recentStyles = lastN(2).map((e) => e.style ?? 'cinema');
    if (ep.style && recentStyles.includes(ep.style)) errors.push(`style "${ep.style}" was used in the last 2 episodes (${recentStyles.join(', ')}); pick another look`);
    if (!ep.experiment) errors.push('set "experiment" {change, why, metric}: the one thing this reel tests (read data/learnings.md)');
    if (!ep.hooks || ep.hooks.length < 3) warnings.push('list the 3 hook options you considered in "hooks"');
  }
  if (!ep.leadMagnet) warnings.push('no "leadMagnet": every outlier in data/swipe.md asks for a comment keyword with a freebie');
  else if (!new RegExp(ep.leadMagnet.keyword, 'i').test(JSON.stringify(ep.scenes.slice(-2))))
    errors.push(`the last scenes must say the comment keyword "${ep.leadMagnet.keyword}"`);

  const words = ep.scenes.reduce((n, s) => n + s.vo.trim().split(/\s+/).length, 0);
  if (words > 115) errors.push(`voice-over is ${words} words; keep it ≤ 115 (≈38 s). Short reels hold viewers`);
  if (words < 55) warnings.push(`voice-over is only ${words} words (≈${Math.round(words / 3)} s)`);
  ep.scenes.forEach((s, i) => {
    const n = s.vo.trim().split(/\s+/).length;
    const max = ['coldopen', 'rule', 'dialog'].includes(s.type) ? 18 : 14;
    if (n > max) errors.push(`scene ${i + 1}: vo has ${n} words; split it into two scenes (max ${max})`);
    if (s.type === 'dialog') {
      if (s.cap) warnings.push(`scene ${i + 1}: dialog shows its line in a bubble; "cap" is ignored`);
    } else if (!s.cap) warnings.push(`scene ${i + 1}: no "cap" (Roman Hinglish caption)`);
    else if ((s.cap.match(/\*[^*]+\*/g) || []).length !== 1) errors.push(`scene ${i + 1}: cap needs exactly one *accent* word`);
    if (n < 4) warnings.push(`scene ${i + 1}: vo has only ${n} words, the scene may flash by`);
    const onScreen = JSON.stringify({...s, vo: undefined});
    if (EMOJI.test(onScreen)) errors.push(`scene ${i + 1}: no emoji in on-screen text (fonts can't render them)`);
  });
  if (!/(भेजो|bhejo|send|comment)/i.test(JSON.stringify(ep.scenes.at(-1))))
    warnings.push('last scene should ask viewers to comment or send the reel');
  if (!ep.sources?.length) warnings.push('no sources listed; every real-world number or incident needs one');
  if (ep.hashtags.length > 3) warnings.push('Instagram limits hashtags; 3 focused tags work best');
  if (!ep.keywords?.length) warnings.push('add 5-7 search keywords in "keywords" (shown as [keyword] in the caption)');

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

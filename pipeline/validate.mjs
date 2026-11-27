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
  if (ep.style === 'dsa') return validateDsa(ep, errors, warnings);
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
    // 26 Nov 2026 study: every outlier account keeps ONE recognisable look; the hook, topic and format change instead
    if (!ep.style) errors.push('set "style": "stage" (the house style, src/stage.tsx)');
    else if (ep.style !== 'stage') warnings.push(`style "${ep.style}" is not the house style "stage"; only use another look as a deliberate experiment`);
    if (!ep.experiment) errors.push('set "experiment" {change, why, metric}: the one thing this reel tests (read data/learnings.md)');
    if (!ep.hooks || ep.hooks.length < 3) warnings.push('list the 3 hook options you considered in "hooks"');
  }
  if (!ep.leadMagnet) warnings.push('no "leadMagnet": every outlier in data/swipe.md asks for a comment keyword with a freebie');
  else if (!new RegExp(ep.leadMagnet.keyword, 'i').test(JSON.stringify(ep.scenes.slice(-2))))
    errors.push(`the last scenes must say the comment keyword "${ep.leadMagnet.keyword}"`);

  const words = ep.scenes.reduce((n, s) => n + s.vo.trim().split(/\s+/).length, 0);
  // Length is not what lost viewers (eps 1-3 lost them in the first 6 s); the outliers run 53-164 s. But every
  // extra 12-15 s needs an open loop (a "tease" sticker) so there is always a reason to keep watching.
  const maxWords = ep.number > 4 ? 175 : 115;
  if (words > maxWords) errors.push(`voice-over is ${words} words; keep it ≤ ${maxWords} (≈${Math.round(maxWords / 3.1)} s)`);
  if (words < 55) warnings.push(`voice-over is only ${words} words (≈${Math.round(words / 3)} s)`);
  const teases = ep.scenes.filter((s) => s.tease).length;
  const needTeases = words > 150 ? 2 : words > 110 ? 1 : 0;
  if (ep.number > 4 && teases < needTeases)
    errors.push(`${words} words needs ${needTeases} "tease" open loop(s) (e.g. "Group wala twist end mein"); found ${teases}`);
  if (ep.scenes[0].tease) warnings.push('scene 1 has a tease: the hook itself should be the reason to stay; tease from scene 3 on');

  // hook rules: never open on a number, and the question ("kaise?", "kyun?") is on screen within the first 3 scenes
  const big = (s) => [s.cap, s.line, s.title, s.question, s.headline, s.setup].filter(Boolean).join(' ').replace(/\*/g, '');
  if (ep.number > 4 && (/^\s*[0-9₹]/.test(big(ep.scenes[0])) || /^\s*[0-9०-९]/.test(ep.scenes[0].vo)))
    errors.push('scene 1 opens on a number; open on a moment, a belief or a line of dialogue (the number can come later)');
  if (ep.number > 4 && !ep.scenes.slice(0, 3).some((s) => /\?/.test(big(s))))
    warnings.push('no question on screen in the first 3 scenes; the outliers ask "kaise?" / "kyun?" within ~5 s');

  // the ending: something to keep (board checks / tip) or a quiz that people answer in the comments
  ep.scenes.forEach((s, i) => {
    if (s.type === 'quiz') {
      if (s.answer >= s.options.length) errors.push(`scene ${i + 1}: quiz answer ${s.answer} is not one of its ${s.options.length} options`);
      if (i < ep.scenes.length - 3) warnings.push(`scene ${i + 1}: put the quiz in the last 3 scenes`);
    }
  });
  if (ep.number > 4 && !ep.scenes.slice(-4).some((s) => s.type === 'quiz' || (s.type === 'board' && s.layout === 'checks') || s.type === 'tip'))
    warnings.push('end on something to save (a board with layout "checks", a tip) or a quiz');
  if (ep.number > 4 && ep.leadMagnet && !new RegExp(`comment\\s+["“]?${ep.leadMagnet.keyword}`, 'i').test(ep.caption.split('\n')[0]))
    errors.push(`caption line 1 must be the ask: "Comment ${ep.leadMagnet.keyword} for <promise>" (sys.design.101 does this and gets 14.1K comments)`);
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

// DSA-101: no length cap (the explanation decides), one narrator, a clear first line, a pause, a close that asks for save/send/like
function validateDsa(ep, errors, warnings) {
  const sc = ep.scenes;
  if (sc.some((s) => s.type !== 'dsa')) errors.push('DSA-101 episodes use only "dsa" scenes');
  if (!ep.dsa) errors.push('set "dsa" {n, leetcode, difficulty, category, companies}');
  if (!sc.some((s) => s.kind === 'pause')) warnings.push('no "pause" scene (a try-it-yourself beat holds viewers)');
  if (!sc.some((s) => s.kind === 'quiz')) warnings.push('no quiz scene');
  const last = JSON.stringify(sc.at(-1).vo);
  for (const w of ['save', 'send', 'like']) if (!new RegExp(w, 'i').test(last)) errors.push(`closing line must say "${w}"`);
  if (ep.leadMagnet && !new RegExp(ep.leadMagnet.keyword, 'i').test(sc.at(-1).vo)) errors.push(`closing line must say the keyword ${ep.leadMagnet.keyword}`);
  sc.forEach((s, i) => {
    const n = s.vo.trim().split(/\s+/).length;
    if (n > 45) errors.push(`scene ${i + 1}: ${n} words; split it (max 45)`);
    if (EMOJI.test(JSON.stringify({...s, vo: undefined}))) errors.push(`scene ${i + 1}: no emoji in on-screen text`);
  });
  if (!ep.sources?.length) warnings.push('no sources listed');
  const words = sc.reduce((n, s) => n + s.vo.trim().split(/\s+/).length, 0);
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

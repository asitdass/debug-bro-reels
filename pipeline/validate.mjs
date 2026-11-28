// Checks an episode against the schema and the Debug Bro content rules.
// usage: node pipeline/validate.mjs [slug]   (defaults to the newest episode)
import fs from 'node:fs';
import path from 'node:path';
import {episodeSchema} from '../src/schema.js';
import {DSA2_ORDER, DSA2_REPEAT, checkDsa2Scene, checkDsaScene, notesSchema} from '../src/dsaSchema.js';
import {checkLearning} from './review-gate.mjs';
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
  // new reels (from number 8, not yet posted) must build on the last reel's review
  if (ep.number > 7 && !readJSON(path.join(ROOT, 'data/published.json'), []).some((p) => p.slug === slug)) {
    const learned = checkLearning(ep);
    errors.push(...learned.errors);
    warnings.push(...learned.warnings);
  }
  if (ep.style === 'dsa2') return validateDsa2(ep, errors, warnings);
  if (ep.style === 'dsa') {
    const posted = readJSON(path.join(ROOT, 'data/published.json'), []).some((p) => p.slug === slug);
    if (ep.dsa?.n >= 3 && !posted) errors.push('new DSA questions use the simple format: "style": "dsa2" (.claude/skills/make-episode/dsa.md)');
    return validateDsa(ep, errors, warnings);
  }
  const HOOKS = ['coldopen', 'hook', 'moment', 'board', 'dialog', 'headline', 'tip'];
  if (!HOOKS.includes(ep.scenes[0].type)) errors.push(`first scene must be a hook scene (${HOOKS.join(', ')}), not a chart`);
  if (ep.scenes.length < 6) warnings.push(`${ep.scenes.length} scenes; 7–12 gives a new picture every 2–3 s`);
  if (!ep.format && ep.number > 3) errors.push('set "format" (desi-story, whiteboard, ai-hack, news, skit, myth-fact): see formats.md');

  // anti-repetition: compare with the episodes before this one (the reason episodes 1-3 felt the same)
  const others = fs
    .readdirSync(path.join(ROOT, 'episodes'), {withFileTypes: true})
    .filter((d) => d.isDirectory() && d.name !== slug && fs.existsSync(path.join(ROOT, 'episodes', d.name, 'episode.json')))
    .map((d) => readJSON(path.join(ROOT, 'episodes', d.name, 'episode.json'), null))
    // DSA-101 is its own series with its own shape: it does not count for the system-design anti-repetition rules
    .filter((e) => e && e.number < ep.number && e.style !== 'dsa')
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
  if (ep.number > 6) checkCaption(ep, errors, warnings);
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
  if (!ep.keywords?.length) warnings.push('add 5-7 search keywords in "keywords" (shown as one [list] in the caption)');

  const published = readJSON(path.join(ROOT, 'data/published.json'), []);
  const dupe = published.find((p) => p.slug !== slug && p.topic?.toLowerCase() === ep.topic.toLowerCase());
  if (dupe) errors.push(`topic already published as ${dupe.slug}`);

  return {ok: errors.length === 0, errors, warnings, words};
}

// LeetCode numbers are public, so each one must be exact: checked against data/dsa150.json
function checkNumbers(ep, notes, sc, errors) {
  const list = readJSON(path.join(ROOT, 'data/dsa150.json'), {problems: []}).problems;
  const plain = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const q of notes?.practice ?? []) {
    const hit = list.find((p) => p.leetcode === q.leetcode);
    if (!hit) errors.push(`notes.json practice: LeetCode ${q.leetcode} is not in data/dsa150.json, so it cannot be checked; pick a listed problem`);
    else if (plain(hit.name) !== plain(q.name)) errors.push(`notes.json practice: LeetCode ${q.leetcode} is "${hit.name}", not "${q.name}"`);
  }
  const allowed = new Set([ep.dsa?.leetcode, ...(notes?.practice ?? []).map((q) => q.leetcode)]);
  const shown = JSON.stringify([ep.title, ep.topic, ep.caption, ep.keywords, ep.hashtags, ep.coverText, ep.leadMagnet, ep.hooks, sc, notes]);
  for (const m of shown.matchAll(/leet\s*code\s*(?:#|no\.?|number|problem)?\s*(\d+)/gi))
    if (!allowed.has(Number(m[1]))) errors.push(`"${m[0]}" is not this episode's number (${ep.dsa?.leetcode}) or a practice problem's`);
}

// DSA-101 simple format: hook, series line, one question, a promise, the slow way, a guess, the payoff, code, one ask.
function validateDsa2(ep, errors, warnings) {
  const sc = ep.scenes;
  // some parts take one scene per step; "trap" may be left out when a problem has no tempting shortcut
  const seen = sc.map((s) => s.kind).filter((k, i, all) => !(DSA2_REPEAT.includes(k) && all[i - 1] === k));
  const wanted = DSA2_ORDER.filter((k) => k !== 'trap' || seen.includes('trap'));
  if (sc.some((s) => s.type !== 'dsa2') || seen.join(' ') !== wanted.join(' ')) errors.push(`scenes must be, in order: ${DSA2_ORDER.join(', ')} (all type "dsa2"; ${DSA2_REPEAT.join(', ')} repeat; trap is optional)`);
  const count = (kind) => sc.filter((s) => s.kind === kind).length;
  const steps = sc.filter((s) => s.kind === 'dryrun');
  if (steps.length < 3 || steps.length > 8) errors.push(`${steps.length} dry-run steps; show 3 to 8`);
  if (count('brute') < 2) errors.push('teach the brute force in at least 2 scenes: its code, then why it is too slow');
  if (sc.some((s) => !['hook', 'series'].includes(s.kind) && !s.level)) errors.push('every teaching scene needs a "level" chip, like "3/6 Brute force"');
  const codeLines = sc.find((s) => s.kind === 'code')?.data?.code?.length ?? 0;
  for (const s of steps) {
    const {show, line} = s.data ?? {};
    if (show && line && (show[0] > show[1] || show[1] >= codeLines || show[1] - show[0] > 4 || line.some((i) => i < show[0] || i > show[1])))
      errors.push(`dryrun "${s.data.title}": "show" must be at most 5 lines of the code scene and contain every highlighted "line"`);
  }
  sc.forEach((s, i) => {
    if (s.type === 'dsa2') for (const problem of checkDsa2Scene(s)) errors.push(`scene ${i + 1} (${s.kind}): ${problem}`);
    const n = s.vo.trim().split(/\s+/).length;
    if (n > 40) errors.push(`scene ${i + 1}: ${n} words; keep each part short (max 40)`);
    if (EMOJI.test(JSON.stringify(s.data))) errors.push(`scene ${i + 1}: no emoji in on-screen text`);
  });
  const words = sc.reduce((n, s) => n + s.vo.trim().split(/\s+/).length, 0);
  if (words > 480) errors.push(`voice-over is ${words} words; keep it ≤ 480 (about 2.7 minutes)`);
  const data = (kind) => sc.find((s) => s.kind === kind)?.data ?? {};
  const vo = (kind) => sc.find((s) => s.kind === kind)?.vo ?? '';
  const hookWords = (data('hook').lines ?? []).join(' ').replace(/\*/g, '').split(/\s+/).filter(Boolean).length;
  if (hookWords > 7) errors.push(`hook headline is ${hookWords} words; 7 at most, in easy words`);
  if (vo('hook').trim().split(/\s+/).length > 12) errors.push('hook voice line: 12 words at most');
  if (!/question/i.test(vo('series'))) errors.push('series line: "Welcome to question N of 150 popular LeetCode questions."');
  const early = sc.slice(0, sc.findIndex((s) => s.kind === 'brute')).map((s) => s.vo).join(' ');
  if (!/\bend\b/i.test(early)) errors.push('before the brute force, promise that something comes at the end');
  const closing = sc.filter((s) => s.kind === 'ask').map((s) => s.vo).join(' ');
  for (const word of ['like', 'comment', 'share', 'follow']) if (!new RegExp(`\\b${word}`, 'i').test(closing)) errors.push(`closing line must say "${word}"`);
  // Asit, 28 Nov: never announce which question comes next
  const said = `${sc.map((s) => `${s.vo} ${JSON.stringify(s.data)}`).join(' ')} ${ep.caption}`;
  if (/next (question|problem|one)\s+is|next up|next\s*:|coming next|tomorrow'?s question/i.test(said)) errors.push('do not name the next question; say "follow for more questions"');
  if (ep.leadMagnet && !new RegExp(ep.leadMagnet.keyword, 'i').test(vo('ask'))) errors.push(`closing line must say the keyword ${ep.leadMagnet.keyword}`);
  if (!ep.leadMagnet) errors.push('set "leadMagnet" (the notes PDF keyword)');

  const meta = ep.dsa;
  if (!meta) errors.push('set "dsa" {n, leetcode, name, difficulty, category, companies, hook}');
  else {
    const known = readJSON(path.join(ROOT, 'data/dsa150.json'), {problems: []}).problems.find((p) => p.leetcode === meta.leetcode);
    if (!known) errors.push(`dsa.leetcode ${meta.leetcode} is not in data/dsa150.json: check the number`);
    else for (const field of ['name', 'difficulty', 'category']) if (meta[field] !== known[field]) errors.push(`dsa.${field} should be "${known[field]}" (data/dsa150.json)`);
    // company names may be used for preparation; saying a company asks this question needs a source
    const claims = /\b(asks?|asked|asking|got me (selected|hired|placed)|selected me|hired me)\b/i;
    const spoken = `${vo('hook')} ${(data('hook').lines ?? []).join(' ')} ${ep.caption}`;
    if (claims.test(spoken) && !(meta.companySource && ep.sources?.includes(meta.companySource)))
      errors.push('the hook or caption claims a company asks this or someone got selected: remove it, or give dsa.companySource (also in "sources")');
    const earlier = fs
      .readdirSync(path.join(ROOT, 'episodes'))
      .filter((d) => d !== ep.slug)
      .map((d) => readJSON(path.join(ROOT, 'episodes', d, 'episode.json'), null))
      .filter((e) => e?.style === 'dsa2' && e.dsa?.n < meta.n)
      .sort((a, b) => b.dsa.n - a.dsa.n);
    if (!['company', 'job-life', 'wrong-answer'].includes(meta.hook)) errors.push('set dsa.hook: company, job-life or wrong-answer');
    else if (earlier[0]?.dsa.hook === meta.hook) errors.push(`dsa.hook "${meta.hook}" was used last time; rotate`);
    const opening = (e) => (e.scenes[0]?.vo ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (earlier.some((e) => opening(e) === opening(ep))) errors.push('this hook line was already used');
    if (!ep.caption.includes(`(LeetCode #${meta.leetcode})`)) errors.push(`caption needs the line "Question ${meta.n}: <problem> (LeetCode #${meta.leetcode})"`);
  }
  if (!ep.cover) errors.push('set "cover" {art, note, pose}: the tiny puzzle on the cover');
  checkCaption(ep, errors, warnings);
  if (!ep.sources?.length) warnings.push('no sources listed');

  const notes = readJSON(path.join(ROOT, 'episodes', ep.slug, 'notes.json'), null);
  if (!notes) errors.push('write notes.json (the explanation PDF with code in 4 languages)');
  else for (const i of notesSchema.safeParse(notes).error?.issues ?? []) errors.push(`notes.json ${i.path.join('.')}: ${i.message}`);
  checkNumbers(ep, notes, sc, errors);
  const shown = data('code').code;
  const tested = notes?.code?.python?.code;
  if (shown && tested && !isExcerpt(shown, tested.split('\n')))
    errors.push('code scene lines must be copied from the Python in notes.json, in order, with the same nesting (comments may be left out)');
  if (notes && !notes.brute?.code) errors.push('notes.json brute.code: write the brute force in Python (shown in the reel and tested)');
  for (const s of sc.filter((x) => x.kind === 'brute'))
    if (notes?.brute?.code && s.data?.code && !isExcerpt(s.data.code, notes.brute.code.split('\n')))
      errors.push(`brute scene "${s.data.title}": code lines must be copied from notes.json brute.code`);
  return {ok: errors.length === 0, errors, warnings, words};
}

/** true when `shown` is an in-order excerpt of `full`: same text, and the same relative nesting depth */
export function isExcerpt(shown, full) {
  const parse = (list) => {
    const kept = list.map((l) => l.replace(/\s+#.*$/, '').trimEnd()).filter((l) => l.trim() && !l.trim().startsWith('#'));
    const indents = kept.map((l) => l.length - l.trimStart().length);
    const unit = Math.min(...indents.filter((n) => n > 0), 4);
    return kept.map((l, i) => ({text: l.trim(), depth: Math.round(indents[i] / unit)}));
  };
  const a = parse(shown);
  const b = parse(full);
  if (!a.length) return false;
  for (let start = 0; start < b.length; start++) {
    if (b[start].text !== a[0].text) continue;
    const shift = b[start].depth - a[0].depth;
    let at = start;
    const ok = a.every((line) => {
      while (at < b.length && !(b[at].text === line.text && b[at].depth - shift === line.depth)) at++;
      return at++ < b.length;
    });
    if (ok) return true;
  }
  return false;
}

// Variety (28 Nov 2026): the series keeps its structure, but each question gets its own opening, picture and jokes.
function checkVariety(ep, errors, warnings) {
  const earlier = fs
    .readdirSync(path.join(ROOT, 'episodes'))
    .filter((d) => d !== ep.slug)
    .map((d) => readJSON(path.join(ROOT, 'episodes', d, 'episode.json'), null))
    .filter((e) => e?.style === 'dsa' && e.dsa?.n < ep.dsa.n)
    .sort((a, b) => b.dsa.n - a.dsa.n);
  const same = (a, b) => a && b && String(a).toLowerCase().trim() === String(b).toLowerCase().trim();
  const scene = (e, kind) => e.scenes.find((s) => s.kind === kind)?.data ?? {};
  const opening = (e) => e.scenes[0].vo.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 4).join(' ');
  if (!ep.dsa.hook) errors.push('set dsa.hook (story, bold-claim, wrong-belief, challenge, question)');
  else if (earlier.slice(0, 2).some((e) => e.dsa.hook === ep.dsa.hook)) errors.push(`dsa.hook "${ep.dsa.hook}" was used in the last 2 questions; open a different way`);
  if (!ep.dsa.analogy) errors.push('set dsa.analogy (the everyday picture this question uses)');
  for (const e of earlier) {
    if (same(e.dsa.analogy, ep.dsa.analogy)) errors.push(`analogy "${ep.dsa.analogy}" was already used in question ${e.dsa.n}`);
    if (opening(e) === opening(ep)) errors.push(`the first line opens like question ${e.dsa.n} ("${opening(ep)}...")`);
    for (const [kind, field] of [['title', 'bubble'], ['smile', 'bubble'], ['pause', 'hint']])
      if (same(scene(e, kind)[field], scene(ep, kind)[field])) errors.push(`${kind}.${field} repeats question ${e.dsa.n}; write a new joke or hint`);
  }
  const look = (e) => scene(e, 'gate').look ?? 'gate';
  if (earlier[0] && ep.scenes.some((s) => s.kind === 'gate') && look(earlier[0]) === look(ep)) warnings.push(`the analogy picture "${look(ep)}" was used last time; try another gate.look`);
  // the opening frame must read cleanly (review of question 1: a word stamp covered the title)
  const early = scene(ep, 'title').slams?.find((x) => x.at < 0.3);
  if (early) errors.push(`title scene: no word stamp before 30% of the scene ("${early.text}" covers the title)`);
}

// Caption shape (28 Nov 2026): hook first, context, then "Comment KEYWORD", then save + share.
// pipeline/run.mjs adds the [keyword, list] and the hashtags underneath.
function checkCaption(ep, errors, warnings) {
  const lines = ep.caption.split('\n').map((l) => l.trim()).filter(Boolean);
  const first = lines[0] ?? '';
  if (/^\W*comment\b/i.test(first)) errors.push('caption line 1 must be the hook, not the comment ask');
  if (first.length > 125) warnings.push(`caption hook is ${first.length} characters; keep it within 125 so it shows before "more"`);
  if (ep.leadMagnet && !new RegExp(`comment\\s+["“]?${ep.leadMagnet.keyword}\\b`, 'i').test(ep.caption))
    errors.push(`caption needs the ask on its own line: "👇 Comment ${ep.leadMagnet.keyword} for <promise>"`);
  if (!/save/i.test(ep.caption) || !/(share|send|bhejo)/i.test(ep.caption)) warnings.push('caption should end with a save + share line');
  if (/\[[^\]]*,[^\]]*,/.test(ep.caption)) warnings.push('leave the [keyword, list] out of "caption": it is added from "keywords"');
  if (ep.hashtags.length < 3) warnings.push('use 3 to 5 specific hashtags');
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
    if (s.type === 'dsa') for (const problem of checkDsaScene(s)) errors.push(`scene ${i + 1} (${s.kind}): ${problem}`);
    const n = s.vo.trim().split(/\s+/).length;
    if (n > 45) errors.push(`scene ${i + 1}: ${n} words; split it (max 45)`);
    if (EMOJI.test(JSON.stringify({...s, vo: undefined}))) errors.push(`scene ${i + 1}: no emoji in on-screen text`);
  });
  checkCaption(ep, errors, warnings);
  if (ep.dsa && !ep.caption.includes(`(LeetCode #${ep.dsa.leetcode})`))
    errors.push(`caption needs the line "Question ${ep.dsa.n}: <problem> (LeetCode #${ep.dsa.leetcode})"`);
  if (!ep.sources?.length) warnings.push('no sources listed');
  if (ep.dsa) {
    // the problem on screen must be the problem in episode.dsa (catches a copied episode that kept the old content)
    const known = readJSON(path.join(ROOT, 'data/dsa150.json'), {problems: []}).problems.find((p) => p.leetcode === ep.dsa.leetcode);
    const title = sc.find((s) => s.kind === 'title')?.data?.title;
    if (!known) errors.push(`dsa.leetcode ${ep.dsa.leetcode} is not in data/dsa150.json: check the number`);
    if (!title) errors.push('DSA-101 episodes need a "title" scene');
    else if (known && title.toLowerCase() !== known.name.toLowerCase())
      errors.push(`title scene says "${title}" but LeetCode ${ep.dsa.leetcode} is "${known.name}" (data/dsa150.json)`);
    if (known && ep.dsa.category !== known.category) errors.push(`dsa.category should be "${known.category}" for LeetCode ${ep.dsa.leetcode}`);
    // a company tag is a factual claim: it needs its own source
    if (ep.dsa.companies.length && !(ep.dsa.companySource && ep.sources?.includes(ep.dsa.companySource)))
      errors.push('dsa.companies needs dsa.companySource (a URL that shows it, also listed in "sources"); otherwise leave companies empty');
  }
  const notes = readJSON(path.join(ROOT, 'episodes', ep.slug, 'notes.json'), null);
  if (!notes) errors.push('write notes.json (the explanation PDF with Python, Java, C++ and JavaScript code): see .claude/skills/make-episode/dsa.md');
  else for (const i of notesSchema.safeParse(notes).error?.issues ?? []) errors.push(`notes.json ${i.path.join('.')}: ${i.message}`);
  checkNumbers(ep, notes, sc, errors);
  if (ep.dsa?.n > 1) checkVariety(ep, errors, warnings);
  // the code on screen must be the tested Python in notes.json, line for line (28 Nov: a scrambled listing with a
  // leftover "XX" line passed every check and was rendered)
  const listing = (lines) => lines.map((l) => l.replace(/\s+#.*$/, '').trimEnd()).filter((l) => l.trim() && !l.trim().startsWith('#'));
  const onScreen = sc.find((s) => s.kind === 'code')?.data?.lines;
  const tested = notes?.code?.python?.code;
  if (onScreen && tested) {
    const a = listing(onScreen);
    const b = listing(tested.split('\n'));
    const at = a.findIndex((l, i) => l !== b[i]);
    if (at !== -1 || a.length !== b.length)
      errors.push(`code scene differs from the Python in notes.json at line ${(at === -1 ? Math.min(a.length, b.length) : at) + 1}: copy it exactly (comments may be left out)`);
  }
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

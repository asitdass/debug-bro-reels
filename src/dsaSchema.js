// DSA-101 content contract. Everything a reel shows or the PDF prints comes from the episode folder:
//   episode.json  scenes[].data   what each scene draws (src/dsa.tsx has NO built-in problem text)
//   notes.json                    the explanation PDF with code in Python, Java, C++ and JavaScript
// The shapes are strict on purpose: a missing or misspelt field fails validation instead of rendering a blank.
import {z} from 'zod';

const s = (max) => z.string().min(1).max(max);
const cells = (min, max) => z.array(z.union([z.string().min(1).max(4), z.number()])).min(min).max(max);
const indices = z.array(z.number().int().min(0).max(7)).max(8);

// allowed on every kind
const fx = {
  slams: z
    .array(
      z
        .object({at: z.number().min(0).max(1), text: s(28), color: z.string().optional(), bg: z.string().optional(), hold: z.number().optional(), tilt: z.number().optional(), size: z.number().optional(), sfx: z.string().optional()})
        .strict(),
    )
    .optional(),
  cut: z.enum(['punch', 'slideL', 'slideUp', 'flip', 'zoom', 'slideR', 'drop', 'wipe']).optional(),
};
const o = (shape) => z.object({...shape, ...fx}).strict();

export const DSA_DATA = {
  // big problem name; chips (difficulty, category) and companies come from episode.dsa
  title: o({title: s(34), face: z.enum(['smirk', 'smile', 'flat']), bubble: s(30)}),
  problem: o({heading: s(60), cells: cells(2, 8), highlight: indices, targetLabel: s(14).optional(), target: s(10).optional(), working: s(24), answer: s(26)}),
  // "pairs" lights two cells at a time, "scan" one cell
  brute: o({heading: s(40), cells: cells(3, 8), mode: z.enum(['pairs', 'scan']), counterLabel: s(34), counterTo: z.number().positive(), result: s(18)}),
  pause: o({hint: s(28)}),
  // the analogy: items walk through a gate; the store (notebook, stack of plates...) appears beside it
  gate: o({heading: s(28), sign: s(10), items: cells(2, 5), storeTitle: s(12)}),
  steps: o({steps: z.array(s(28)).min(2).max(4), yes: s(18).optional(), no: s(22).optional()}),
  code: o({file: s(30), lines: z.array(z.string().max(48)).min(3).max(12), meanings: z.array(s(44)).min(3).max(12)}),
  // one step of a dry run. store = what is in it BEFORE this step; push adds a row, hit highlights one, pop removes the last
  run: o({
    cells: cells(2, 8),
    i: z.number().int().min(0).max(7),
    panelLabel: s(22),
    panelText: s(18),
    panelAccent: s(10).optional(),
    storeTitle: s(12),
    store: z.array(s(16)).max(4),
    push: s(16).optional(),
    hit: z.number().int().min(0).max(3).optional(),
    pop: z.boolean().optional(),
    matched: indices.optional(),
    found: z.boolean(),
    result: s(30),
  }),
  trap: o({
    heading: s(40),
    rows: z
      .array(z.object({title: s(34), cells: cells(1, 4), steps: z.array(s(34)).min(1).max(2), result: s(16), bad: z.boolean()}).strict())
      .length(2),
  }),
  aha: o({
    slow: z.object({label: s(24), value: s(26)}).strict(),
    fast: z.object({label: s(24), value: s(26), bar: z.number().min(0.01).max(1)}).strict(),
    headline: s(18),
    sub: s(26),
  }),
  smile: o({bubble: s(18), label: s(24)}),
  name: o({name: s(18), pairs: z.array(z.tuple([s(6), s(8)])).min(2).max(4), footer: s(26)}),
  notes: o({heading: s(30), rows: z.array(z.tuple([s(7), s(48)])).min(3).max(5)}),
  quiz: o({question: s(60), options: z.array(s(30)).min(2).max(3), answer: z.number().int().min(0).max(2), why: s(140)}),
  close: o({save: s(24), send: s(26), like: s(24), next: s(34)}),
};

/** Checks one dsa scene's data. Returns a list of readable problems (empty = fine). */
export function checkDsaScene(scene) {
  const schema = DSA_DATA[scene.kind];
  if (!schema) return [`unknown kind "${scene.kind}"`];
  const r = schema.safeParse(scene.data ?? {});
  if (!r.success) return r.error.issues.map((i) => `data.${i.path.join('.') || '(root)'}: ${i.message}`);
  const d = r.data;
  const out = [];
  const inRange = (list, n, field) => list?.some((x) => x >= n) && out.push(`data.${field}: index outside the ${n} cells`);
  if (scene.kind === 'problem') inRange(d.highlight, d.cells.length, 'highlight');
  if (scene.kind === 'run') {
    inRange([d.i], d.cells.length, 'i');
    inRange(d.matched, d.cells.length, 'matched');
    if (d.hit !== undefined && d.hit >= d.store.length) out.push('data.hit: no such row in "store"');
    if (d.pop && !d.store.length) out.push('data.pop: the store is already empty');
    if (d.panelAccent && !d.panelText.includes(d.panelAccent)) out.push('data.panelAccent must be part of panelText');
  }
  if (scene.kind === 'code' && d.lines.length !== d.meanings.length) out.push(`data.meanings: need one per line (${d.lines.length}), found ${d.meanings.length}`);
  if (scene.kind === 'quiz' && d.answer >= d.options.length) out.push('data.answer is not one of the options');
  if (scene.kind === 'quiz' && d.options.some((x) => /^[A-C]\s*[:).]/.test(x))) out.push('data.options: leave out the "A:" letters, they are added automatically');
  return out;
}

/* ------------------------------------------------------------------ notes.json (the PDF) */
// The PDF uses the built-in Helvetica/Courier fonts, which only cover Windows-1252 characters.
const PDF_SAFE = /^[\x09\x0A\x20-\x7E -ÿ–—‘’“”•…]*$/;
const t = (max) => z.string().min(1).max(max).regex(PDF_SAFE, 'use plain characters (no arrows, emoji or Devanagari): the PDF font cannot print them');
const lang = z
  .object({
    code: t(2400).refine((c) => c.split('\n').every((l) => l.length <= 80), 'keep code lines at 80 characters or fewer'),
    // how this language does it, in one or two sentences
    note: t(320),
    // appended after the code by pipeline/check-code.mjs only (never printed): must exit non-zero when wrong
    test: z.string().min(10),
  })
  .strict();

export const notesSchema = z
  .object({
    title: t(60),
    problem: t(700),
    examples: z.array(z.object({input: t(90), output: t(60), why: t(160)}).strict()).min(2).max(4),
    analogy: t(600),
    brute: z.object({explain: t(600), time: t(20), space: t(20)}).strict(),
    insight: z.array(t(600)).min(2).max(5),
    steps: z.array(t(220)).min(3).max(8),
    dryRun: z.object({input: t(90), headers: z.array(t(18)).min(2).max(5), rows: z.array(z.array(t(48))).min(2).max(10)}).strict(),
    code: z.object({python: lang, java: lang, cpp: lang, javascript: lang}).strict(),
    complexity: z.object({time: t(20), timeWhy: t(300), space: t(20), spaceWhy: t(300)}).strict(),
    mistakes: z.array(t(260)).min(2).max(6),
    interview: z.array(t(260)).min(2).max(6),
    practice: z.array(z.object({name: t(60), why: t(160)}).strict()).min(2).max(4),
  })
  .strict()
  .refine((n) => n.dryRun.rows.every((r) => r.length === n.dryRun.headers.length), {message: 'every dryRun row needs one cell per header', path: ['dryRun', 'rows']});

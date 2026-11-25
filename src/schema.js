// Episode schema, shared by the Remotion project and the Node pipeline.
// Claude writes episodes/<slug>/episode.json; `npm run validate` checks it against this.
import {z} from 'zod';

const mood = z.enum(['neutral', 'problem', 'solution', 'comeback']).optional();
const tone = z.enum(['green', 'red', 'amber', 'blue', 'violet']).optional();

const base = {
  id: z.string().optional(),
  // Voice-over line for this scene. Hinglish: Devanagari for Hindi words, Latin for tech terms.
  vo: z.string().min(2).max(260),
  mood,
  // Small pill shown under the header, e.g. "PROBLEM", "SOLUTION".
  tag: z.string().max(32).optional(),
  // Roman Hinglish caption shown on screen (2–5 words per line); wrap exactly one accent word in *asterisks*.
  cap: z.string().max(90).optional(),
  // story beat label shown as "// 03 — break": hook, setup, break, reveal, twist, payoff, cta
  beat: z.string().max(16).optional(),
  // "alt" = read by the second voice (Swara if the episode's main voice is Madhur, and vice versa)
  speaker: z.enum(['main', 'alt']).optional(),
  // Debug Bro mascot pose for this scene; leave out to pick one from the beat
  pose: z.enum(['idle', 'point', 'explain', 'think', 'shock', 'facepalm', 'thumbsup', 'shrug', 'crossed', 'laugh']).optional(),
  // stage style: the pose of the character who is NOT talking (the listener's reaction)
  react: z.enum(['idle', 'point', 'explain', 'think', 'shock', 'facepalm', 'thumbsup', 'shrug', 'crossed', 'laugh']).optional(),
  // open-loop sticker shown on this scene, a reason to keep watching: "Group wala twist end mein"
  tease: z.string().min(3).max(40).optional(),
};

const str = (max) => z.string().min(1).max(max);

export const sceneSchema = z.discriminatedUnion('type', [
  // Cold open: the failure happens in the first second (clock ticks, then glitch + error card + big question).
  z.object({
    ...base,
    type: z.literal('coldopen'),
    tick: z.array(str(16)).max(4).optional(),
    setup: str(40),
    error: str(40),
    question: str(56),
  }),
  z.object({...base, type: z.literal('hook'), kicker: str(40), title: str(60), sub: str(80).optional()}),
  z.object({
    ...base,
    type: z.literal('chat'),
    messages: z
      .array(z.object({side: z.enum(['left', 'right']), name: str(28), text: str(90), badge: str(16).optional()}))
      .min(1)
      .max(3),
  }),
  z.object({
    ...base,
    type: z.literal('code'),
    label: str(40).optional(),
    code: str(220),
    highlight: z.array(z.string()).max(4).optional(),
    verdict: z.enum(['correct', 'wrong']).optional(),
    stamp: str(28).optional(),
    multiplier: str(14).optional(),
    multiplierLabel: str(36).optional(),
  }),
  z.object({...base, type: z.literal('flood'), target: str(24), total: str(24), sub: str(48).optional()}),
  z.object({
    ...base,
    type: z.literal('hotrow'),
    rows: z.array(str(24)).min(3).max(5),
    hot: z.number().int().min(0).max(4),
    valueLabel: str(16),
    from: z.number(),
    to: z.number(),
    meterLabel: str(24),
    meterMax: z.number().int().positive(),
    alert: str(48),
  }),
  z.object({...base, type: z.literal('counter'), label: str(40), from: z.number(), to: z.number(), sub: str(60).optional(), tone}),
  z.object({
    ...base,
    type: z.literal('solution'),
    kicker: str(30),
    title: str(36),
    sub: str(70).optional(),
    chipLabel: str(28).optional(),
    chipValue: z.number().optional(),
  }),
  z.object({
    ...base,
    type: z.literal('batch'),
    fastLabel: str(20),
    fastSub: str(28),
    slowLabel: str(20),
    slowSub: str(28),
    fastTo: z.number().int().positive(),
    slowFrom: z.number().int().nonnegative(),
    slowTo: z.number().int().positive(),
    every: str(36),
  }),
  z.object({
    ...base,
    type: z.literal('flow'),
    nodes: z.array(z.object({label: str(22), sub: str(32).optional()})).min(2).max(4),
    packet: str(14).optional(),
  }),
  z.object({
    ...base,
    type: z.literal('compare'),
    left: z.object({title: str(22), items: z.array(str(34)).min(1).max(4)}),
    right: z.object({title: str(22), items: z.array(str(34)).min(1).max(4)}),
  }),
  z.object({...base, type: z.literal('crash'), label: str(24), value: z.number(), quote: str(70).optional()}),
  z.object({...base, type: z.literal('rule'), rule: str(90), cta: str(80), next: str(60).optional()}),
  // whiteboard drawn live; title "A = B" with not:true turns the = into a red ≠ (a beginner belief, busted)
  z.object({
    ...base,
    type: z.literal('board'),
    title: str(40),
    not: z.boolean().optional(),
    layout: z.enum(['flow', 'steps', 'checks']).optional(),
    items: z.array(z.object({label: str(22), sub: str(36).optional(), icon: str(5).optional()})).max(5).default([]),
  }),
  // one line of dialogue: Intern (left) or Debug Bro (right) speaks, the other reacts
  z.object({...base, type: z.literal('dialog'), who: z.enum(['bro', 'intern']), line: str(90), react: z.string().optional()}),
  // a news headline card (news format): the story is the hook
  z.object({...base, type: z.literal('headline'), source: str(30), date: str(20), headline: str(90), sub: str(90).optional(), label: str(14).optional()}),
  // one item of a numbered list (AI hacks, tips): big index, the trick, what it does, an example
  z.object({...base, type: z.literal('tip'), n: z.number().int().min(1), of: z.number().int().min(1), title: str(40), desc: str(90), example: str(90).optional()}),
  // a felt everyday moment (desi-story opener): place/time, one big line, an optional stamp
  z.object({...base, type: z.literal('moment'), place: str(40), line: str(50), stamp: str(16).optional()}),
  // a question with 2-4 options; the answer is NOT shown (it goes in the pinned comment), so people comment
  z.object({...base, type: z.literal('quiz'), question: str(60), options: z.array(str(36)).min(2).max(4), answer: z.number().int().min(0).max(3), why: str(120)}),
]);

export const FORMATS = ['desi-story', 'whiteboard', 'ai-hack', 'news', 'skit', 'myth-fact'];

export const episodeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  number: z.number().int().positive(),
  series: z.string().default('SYSTEM DESIGN'),
  title: str(80),
  topic: str(120),
  // the one metaphor the whole episode is built on, e.g. "UPI = toll booth on a highway"
  world: z.string().max(80).optional(),
  pillar: z.enum(['everyday-tech', 'money-tech', 'interview', 'ai-tools', 'dev-skills', 'news']),
  // the reel's format (see .claude/skills/make-episode/formats.md); it also picks the look
  format: z.enum(['desi-story', 'whiteboard', 'ai-hack', 'news', 'skit', 'myth-fact']).optional(),
  // art direction (src/styles.ts): changes the whole frame; never the same as either of the last 2 episodes
  style: z.enum(['stage', 'cinema', 'notebook', 'blueprint', 'newsroom', 'poster', 'terminal', 'comic', 'phone']).optional(),
  // the ONE change this episode tests vs the previous reel (see data/learnings.md), and the metric that will judge it
  experiment: z.object({change: str(140), why: str(200), metric: z.enum(['skip-rate', 'watch-time', 'views', 'saves', 'shares', 'follows', 'comments'])}).optional(),
  // the 3 hook options considered; the scenes use the best one
  hooks: z.array(str(120)).max(5).optional(),
  // comment-keyword freebie: "Comment RAC, DM mein one-page PDF bhejta hoon"
  leadMagnet: z.object({keyword: z.string().regex(/^[A-Z0-9]{2,14}$/), promise: str(80)}).optional(),
  // series hook: "Part 2 chahiye? Comment PART2"
  part: z.number().int().min(1).optional(),
  voice: z
    .object({
      engine: z.enum(['edge', 'sarvam', 'silent']).default('edge'),
      voiceId: z.string().optional(),
      rate: z.string().optional(),
      pitch: z.string().optional(),
    })
    .default({engine: 'edge'}),
  caption: str(2000),
  hashtags: z.array(z.string().regex(/^#\w+$/)).min(1).max(5),
  // search keywords for Instagram SEO, shown in the caption as [keyword] [keyword]
  keywords: z.array(z.string().min(3).max(40)).min(3).max(8).optional(),
  coverText: str(40),
  music: z.string().optional(),
  beat: z.boolean().optional(),
  // false hides the Debug Bro mascot
  mascot: z.boolean().optional(),
  sources: z.array(z.string().url()).optional(),
  scenes: z.array(sceneSchema).min(5).max(16),
});

// Timings produced by pipeline/tts.py (or estimated when engine = silent).
export const timingsSchema = z.object({
  totalMs: z.number(),
  audio: z.string().nullable(),
  scenes: z.array(z.object({startMs: z.number(), durMs: z.number()})),
  words: z.array(z.object({text: z.string(), startMs: z.number(), endMs: z.number(), scene: z.number()})),
});

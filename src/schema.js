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
  // "alt" = read by the second voice (Swara if the episode's main voice is Madhur, and vice versa)
  speaker: z.enum(['main', 'alt']).optional(),
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
]);

export const episodeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  number: z.number().int().positive(),
  series: z.string().default('SYSTEM DESIGN'),
  title: str(80),
  topic: str(120),
  pillar: z.enum(['everyday-tech', 'money-tech', 'interview', 'ai-tools']),
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
  coverText: str(40),
  music: z.string().optional(),
  beat: z.boolean().optional(),
  sources: z.array(z.string().url()).optional(),
  scenes: z.array(sceneSchema).min(5).max(14),
});

// Timings produced by pipeline/tts.py (or estimated when engine = silent).
export const timingsSchema = z.object({
  totalMs: z.number(),
  audio: z.string().nullable(),
  scenes: z.array(z.object({startMs: z.number(), durMs: z.number()})),
  words: z.array(z.object({text: z.string(), startMs: z.number(), endMs: z.number(), scene: z.number()})),
});

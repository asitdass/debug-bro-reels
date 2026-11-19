export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const C = {
  bg: '#07080b',
  card: '#0f1117',
  cardHi: '#141722',
  line: '#232734',
  text: '#eef1f6',
  muted: '#7b8293',
  dim: '#4a5060',
  green: '#34e08a',
  red: '#ff4d6a',
  amber: '#ffb547',
  blue: '#5aa9ff',
  violet: '#a78bfa',
};

export const TONE: Record<string, string> = {
  green: C.green,
  red: C.red,
  amber: C.amber,
  blue: C.blue,
  violet: C.violet,
};

export const MOOD: Record<string, string> = {
  neutral: '#3a4cff',
  problem: '#ff3b5c',
  solution: '#22d37a',
  comeback: '#ffad1f',
};

export const FONT = {
  sans: '"Inter", "Noto Sans Devanagari", system-ui, sans-serif',
  hindi: '"Noto Sans Devanagari", "Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Noto Sans Devanagari", ui-monospace, monospace',
};

// Content-safe zone: Instagram covers ~260px at the top and ~420px at the bottom,
// plus the action buttons on the right. Keep important things inside this box.
export const SAFE = {top: 250, bottom: 1500, left: 70, right: 1010};

export const fmtIN = (n: number) => Math.round(n).toLocaleString('en-IN');

/* ---------------------------------------------------------------- formats & themes
 * Each episode has a `format`; each format has its own look so the feed never feels like one template. */
export type Theme = {
  name: string;
  dark: boolean;
  bg: string;
  bg2: string; // second colour for the background gradient
  ink: string; // main text
  muted: string;
  accent: string;
  card: string;
  cardInk: string;
  line: string;
  vignette: number;
};

export const THEMES: Record<string, Theme> = {
  story: {name: 'story', dark: true, bg: '#07080b', bg2: '#1a1208', ink: '#eef1f6', muted: '#7b8293', accent: '#ffb547', card: '#0f1117', cardInk: '#eef1f6', line: '#232734', vignette: 0.7},
  whiteboard: {name: 'whiteboard', dark: false, bg: '#f7d774', bg2: '#f3c24f', ink: '#1d1a16', muted: '#7a6331', accent: '#d9480f', card: '#fffdf6', cardInk: '#1d1a16', line: '#2b2b2b', vignette: 0.18},
  hack: {name: 'hack', dark: false, bg: '#eef0f5', bg2: '#dfe4ff', ink: '#0f1220', muted: '#5b6275', accent: '#4f46e5', card: '#ffffff', cardInk: '#0f1220', line: '#d5d9e2', vignette: 0.12},
  news: {name: 'news', dark: true, bg: '#0a0a0b', bg2: '#2a0606', ink: '#ffffff', muted: '#9a9aa0', accent: '#ff3b30', card: '#ffffff', cardInk: '#111111', line: '#2a2a2e', vignette: 0.6},
  skit: {name: 'skit', dark: false, bg: '#bfe3ff', bg2: '#ffe3c7', ink: '#14213d', muted: '#4a5b7a', accent: '#ff5d5d', card: '#ffffff', cardInk: '#14213d', line: '#9cc6ea', vignette: 0.15},
  mythfact: {name: 'mythfact', dark: true, bg: '#0c1222', bg2: '#062a2f', ink: '#eef6ff', muted: '#8aa0b8', accent: '#22d3ee', card: '#111a2e', cardInk: '#eef6ff', line: '#20304d', vignette: 0.6},
};

/** format -> theme. Unknown or missing format = the original dark "story" look. */
export const FORMAT_THEME: Record<string, string> = {
  'desi-story': 'story',
  whiteboard: 'whiteboard',
  'ai-hack': 'hack',
  news: 'news',
  skit: 'skit',
  'myth-fact': 'mythfact',
};

export const themeFor = (episode: any): Theme => THEMES[episode?.theme ?? FORMAT_THEME[episode?.format] ?? 'story'] ?? THEMES.story;

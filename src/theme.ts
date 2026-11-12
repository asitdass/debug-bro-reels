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

// Art directions. Each episode picks one `style`; it changes the WHOLE frame, not just colours:
// background, caption treatment, header, where Debug Bro stands, transitions and fonts.
// The validator refuses a style used by either of the previous two episodes.
import {THEMES, Theme} from './theme';

export type CaptionKind = 'top' | 'sticky' | 'terminal' | 'headline' | 'poster' | 'label' | 'comic';
export type HeaderKind = 'bars' | 'page' | 'terminal' | 'masthead' | 'none' | 'blueprint';
export type Transition = 'punch' | 'slide' | 'whip' | 'flip' | 'glitch' | 'pop';
export type BgKind = 'glow' | 'paper' | 'blueprint' | 'newsprint' | 'blocks' | 'terminal' | 'halftone';

export type ArtStyle = {
  id: string;
  label: string;
  theme: Theme;
  bg: BgKind;
  captions: CaptionKind;
  header: HeaderKind;
  transition: Transition;
  /** Debug Bro's spot: x/y of the top-left corner, width, mirrored, and an optional frame around him */
  mascot: {x: number; y: number; width: number; flip?: boolean; frame?: 'none' | 'circle' | 'box'};
  /** how the scene content is fitted around the character */
  stage: {scale: number; originY: number; shiftX: number};
  grain: number;
  display: string; // headline font
  /** per-scene background colours (poster style switches colour every cut) */
  blocks?: string[];
  /** a scene kit replaces the scene layouts entirely (src/kits.tsx); no corner mascot, no caption layer */
  kit?: 'phone' | 'comic' | 'kinetic' | 'stage';
};

const t = (base: keyof typeof THEMES, patch: Partial<Theme>): Theme => ({...THEMES[base], ...patch});

export const STYLES: Record<string, ArtStyle> = {
  // House style from ep 5 (src/stage.tsx): bright room, both characters always on screen, the scene on a monitor.
  // The outliers we studied keep ONE recognisable look; the hook, topic and format change, the look does not.
  stage: {
    id: 'stage',
    label: "Debug Bro's room (house style)",
    theme: THEMES.story,
    bg: 'glow',
    captions: 'top',
    header: 'none',
    transition: 'pop',
    mascot: {x: 0, y: 0, width: 0},
    stage: {scale: 1, originY: 500, shiftX: 0},
    grain: 0.03,
    display: '"Inter", sans-serif',
    kit: 'stage',
  },
  cinema: {
    id: 'cinema',
    label: 'Dark cinematic (eps 1-4)',
    theme: THEMES.story,
    bg: 'glow',
    captions: 'top',
    header: 'bars',
    transition: 'punch',
    mascot: {x: -10, y: 1110, width: 430},
    stage: {scale: 0.84, originY: 500, shiftX: 0},
    grain: 0.07,
    display: '"Instrument Serif", Georgia, serif',
  },
  notebook: {
    id: 'notebook',
    label: 'Hand-drawn notebook',
    theme: t('whiteboard', {name: 'notebook', bg: '#f6efdc', bg2: '#efe4c8', ink: '#24303f', muted: '#8a7a5a', accent: '#e4572e', card: '#fffdf6', cardInk: '#24303f', vignette: 0.1}),
    bg: 'paper',
    captions: 'sticky',
    header: 'page',
    transition: 'slide',
    mascot: {x: 640, y: 1120, width: 430, flip: true},
    stage: {scale: 0.86, originY: 520, shiftX: -40},
    grain: 0.05,
    display: '"Kalam", cursive',
  },
  blueprint: {
    id: 'blueprint',
    label: 'Engineer blueprint',
    theme: t('mythfact', {name: 'blueprint', dark: true, bg: '#0d3b8c', bg2: '#082a66', ink: '#f2f7ff', muted: '#9fc0f5', accent: '#ffd84d', card: '#0b3170', cardInk: '#f2f7ff', line: '#5d8fe0', vignette: 0.35}),
    bg: 'blueprint',
    captions: 'label',
    header: 'blueprint',
    transition: 'whip',
    mascot: {x: 770, y: 1250, width: 300, flip: true, frame: 'circle'},
    stage: {scale: 0.9, originY: 470, shiftX: 0},
    grain: 0.04,
    display: '"JetBrains Mono", monospace',
  },
  newsroom: {
    id: 'newsroom',
    label: 'Newspaper front page',
    theme: t('news', {name: 'newsroom', dark: false, bg: '#f2efe8', bg2: '#e7e1d4', ink: '#121212', muted: '#6b6356', accent: '#c8102e', card: '#ffffff', cardInk: '#121212', line: '#121212', vignette: 0.12}),
    bg: 'newsprint',
    captions: 'headline',
    header: 'masthead',
    transition: 'slide',
    mascot: {x: 690, y: 1150, width: 380, flip: true, frame: 'box'},
    stage: {scale: 0.82, originY: 520, shiftX: -70},
    grain: 0.08,
    display: '"Instrument Serif", Georgia, serif',
  },
  poster: {
    id: 'poster',
    label: 'Bold kinetic poster',
    theme: t('skit', {name: 'poster', dark: false, bg: '#ff5a1f', bg2: '#ff5a1f', ink: '#111111', muted: '#3b1a0e', accent: '#ffffff', card: '#ffffff', cardInk: '#111111', line: '#111111', vignette: 0}),
    bg: 'blocks',
    captions: 'poster',
    header: 'none',
    transition: 'pop',
    mascot: {x: -30, y: 1060, width: 500},
    stage: {scale: 0.82, originY: 560, shiftX: 40},
    grain: 0.06,
    display: '"Anton", "Inter", sans-serif',
    blocks: ['#ff5a1f', '#1f4dff', '#111111', '#ffd400', '#00b37e', '#ff2e88'],
    kit: 'kinetic',
  },
  phone: {
    id: 'phone',
    label: 'Chat on a phone',
    theme: t('skit', {name: 'phone', dark: true, bg: '#151827', bg2: '#2a1f4d', ink: '#ffffff', muted: '#9aa3c7', accent: '#25d366', card: '#ffffff', cardInk: '#111b21', line: '#2b3050', vignette: 0.5}),
    bg: 'glow',
    captions: 'top',
    header: 'none',
    transition: 'punch',
    mascot: {x: 0, y: 0, width: 0},
    stage: {scale: 1, originY: 500, shiftX: 0},
    grain: 0.04,
    display: '"Inter", sans-serif',
    kit: 'phone',
  },
  terminal: {
    id: 'terminal',
    label: 'Hacker terminal',
    theme: t('story', {name: 'terminal', bg: '#050805', bg2: '#081208', ink: '#c8ffd4', muted: '#4f8a5b', accent: '#39ff88', card: '#0b140d', cardInk: '#c8ffd4', line: '#1d3b24', vignette: 0.6}),
    bg: 'terminal',
    captions: 'terminal',
    header: 'terminal',
    transition: 'glitch',
    mascot: {x: 700, y: 1140, width: 400, flip: true},
    stage: {scale: 0.84, originY: 520, shiftX: -50},
    grain: 0.09,
    display: '"JetBrains Mono", monospace',
  },
  comic: {
    id: 'comic',
    label: 'Comic book',
    theme: t('skit', {name: 'comic', dark: false, bg: '#ffe066', bg2: '#ffcf33', ink: '#111111', muted: '#5a4a10', accent: '#e63946', card: '#ffffff', cardInk: '#111111', line: '#111111', vignette: 0.08}),
    bg: 'halftone',
    captions: 'comic',
    header: 'none',
    transition: 'flip',
    mascot: {x: -20, y: 1100, width: 440},
    stage: {scale: 0.84, originY: 500, shiftX: 30},
    grain: 0.03,
    display: '"Anton", "Inter", sans-serif',
    kit: 'comic',
  },
};

/** format -> a sensible default style when the episode doesn't name one */
const FORMAT_STYLE: Record<string, string> = {
  'desi-story': 'cinema',
  whiteboard: 'notebook',
  'ai-hack': 'terminal',
  news: 'newsroom',
  skit: 'comic',
  'myth-fact': 'poster',
  chat: 'phone',
};

export const styleFor = (episode: any): ArtStyle => STYLES[episode?.style ?? FORMAT_STYLE[episode?.format] ?? 'cinema'] ?? STYLES.cinema;
export const STYLE_IDS = Object.keys(STYLES);

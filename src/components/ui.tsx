import React from 'react';
import {Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from '../theme';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 0→1 between two frames, eased. */
export const ramp = (frame: number, start: number, end: number, ease = Easing.out(Easing.cubic)) =>
  interpolate(frame, [start, Math.max(start + 1, end)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

export const usePop = (delay = 0, damping = 13) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, stiffness: 170, mass: 0.7}});
};

export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  border?: string;
  glow?: string;
}> = ({children, style, border, glow}) => (
  <div
    style={{
      background: `linear-gradient(180deg, ${C.cardHi}, ${C.card})`,
      border: `2px solid ${border ?? C.line}`,
      borderRadius: 26,
      boxShadow: glow ? `0 0 60px ${glow}33, inset 0 0 30px ${glow}14` : '0 20px 60px #0008',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Pill: React.FC<{text: string; color?: string; style?: React.CSSProperties; dot?: boolean}> = ({
  text,
  color = C.muted,
  style,
  dot = true,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 22px',
      borderRadius: 999,
      border: `2px solid ${color}66`,
      background: `${color}14`,
      color,
      fontFamily: FONT.mono,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {dot ? <span style={{width: 12, height: 12, borderRadius: 6, background: color, boxShadow: `0 0 12px ${color}`}} /> : null}
    {text}
  </div>
);

export const Label: React.FC<{text: string; style?: React.CSSProperties}> = ({text, style}) => (
  <div
    style={{
      fontFamily: FONT.mono,
      fontSize: 22,
      letterSpacing: 3,
      color: C.muted,
      textTransform: 'uppercase',
      ...style,
    }}
  >
    {text}
  </div>
);

const AV_COLORS = [C.blue, C.green, C.amber, C.violet, C.red, '#4dd8e8', '#f472b6'];
const LETTERS = 'ABDGHJKMNPRSTV';

export const Avatar: React.FC<{seed: number; size?: number; style?: React.CSSProperties}> = ({seed, size = 54, style}) => {
  const color = AV_COLORS[Math.floor(random(`c${seed}`) * AV_COLORS.length)];
  const letter = LETTERS[Math.floor(random(`l${seed}`) * LETTERS.length)];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        border: `3px solid ${color}`,
        background: `${color}22`,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT.mono,
        fontWeight: 800,
        fontSize: size * 0.42,
        ...style,
      }}
    >
      {letter}
    </div>
  );
};

/* ---------- icons (inline SVG, no emoji fonts needed) ---------- */
export const Icon = {
  user: (c: string, s = 40) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  ),
  bolt: (c: string, s = 40) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  db: (c: string, s = 40) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  ),
  heart: (c: string, s = 40) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z" />
    </svg>
  ),
  send: (c: string, s = 40) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinejoin="round">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </svg>
  ),
  check: (c: string, s = 32) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={3} strokeLinecap="round">
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  ),
  cross: (c: string, s = 32) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={3} strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  flame: (c: string, s = 32) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <path d="M12 2s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 1-3.5S9 11 11 11c0-4 1-9 1-9z" />
    </svg>
  ),
  phone: (c: string, s = 40) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M11 18h2" />
    </svg>
  ),
};

/** Typewriter: returns the visible slice of text. */
export const typed = (text: string, frame: number, start: number, cps = 32, fps = 30) => {
  const n = Math.floor(((frame - start) / fps) * cps);
  return text.slice(0, Math.max(0, Math.min(text.length, n)));
};

export const Cursor: React.FC<{color?: string}> = ({color = C.text}) => {
  const frame = useCurrentFrame();
  return <span style={{opacity: Math.floor(frame / 12) % 2 ? 0 : 1, color}}>|</span>;
};

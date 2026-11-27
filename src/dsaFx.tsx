// DSA-101 "masala": big slam typography, cut transitions, confetti, speed lines and the sound-effect cue table.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const DISPLAY = '"Anton", "Inter", sans-serif';

/* ------------------------------------------------------------------ slam typography */
export type SlamSpec = {at: number; text: string; color?: string; bg?: string; hold?: number; tilt?: number; size?: number; sfx?: string};

/**
 * A full-frame word stamp: slams in from 2.6x with a shake, a colour flash and an outline echo, holds, then is thrown out.
 * `at` is a fraction of the scene; `hold` is how long it stays (fraction of the scene, default ~0.9 s worth).
 */
export const Slam: React.FC<{spec: SlamSpec; dur: number; pre?: number}> = ({spec, dur, pre = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = Math.round(dur * spec.at) - pre;
  const hold = Math.max(14, Math.round(dur * (spec.hold ?? 0.18)));
  const f = frame - start;
  if (f < -1 || f > hold + 8) return null;
  const inP = spring({frame: Math.max(0, f), fps, config: {damping: 11, stiffness: 320, mass: 0.6}});
  const scale = interpolate(inP, [0, 1], [2.6, 1]);
  const out = interpolate(f, [hold, hold + 8], [0, 1], clamp);
  const shake = f < 9 ? Math.sin(f * 2.4) * (9 - f) * 1.7 : 0;
  const rot = (spec.tilt ?? -3) + (f < 9 ? Math.sin(f * 1.9) * 1.2 : 0);
  const words = spec.text.split(' ');
  const size = spec.size ?? (spec.text.length > 14 ? 170 : spec.text.length > 8 ? 220 : 290);
  const col = spec.color ?? '#ffc857';
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: 1 - out, transform: `translate(${shake}px, ${out * -200}px)`}}>
      {/* colour flash + dimmer so the word reads over anything */}
      <AbsoluteFill style={{background: spec.bg ?? '#0b0e20cc', opacity: interpolate(f, [0, 3, 14], [1, 1, 0.82], clamp)}} />
      <AbsoluteFill style={{background: col, opacity: interpolate(f, [0, 2, 7], [0.85, 0.5, 0], clamp)}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `rotate(${rot}deg) scale(${scale})`}}>
        {words.map((w, i) => (
          <div
            key={i}
            style={{
              fontFamily: DISPLAY,
              fontSize: size,
              lineHeight: 0.98,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: i === words.length - 1 ? col : '#ffffff',
              textShadow: `10px 10px 0 #000a, 0 0 60px ${col}66`,
              WebkitTextStroke: '3px #0b0e20',
              transform: `translateX(${(i % 2 ? 1 : -1) * Math.max(0, 14 - f) * 6}px)`,
            }}
          >
            {w}
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ confetti and speed lines */
export const Confetti: React.FC<{at: number; seed?: string; n?: number}> = ({at, seed = 'c', n = 46}) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0 || f > 60) return null;
  const colors = ['#ffc857', '#3ddc84', '#6aa8ff', '#ff5d6c', '#b79cff', '#ffffff'];
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      {Array.from({length: n}, (_, i) => {
        const a = random(`${seed}a${i}`) * Math.PI * 2;
        const v = 14 + random(`${seed}v${i}`) * 26;
        const x = 490 + Math.cos(a) * v * f * 0.55;
        const y = 560 + Math.sin(a) * v * f * 0.55 + 0.5 * 1.15 * f * f;
        const sz = 14 + random(`${seed}s${i}`) * 18;
        return (
          <div
            key={i}
            style={{position: 'absolute', left: x, top: y, width: sz, height: sz * 0.5, background: colors[i % colors.length], transform: `rotate(${f * (8 + (i % 7) * 4)}deg)`, opacity: interpolate(f, [38, 60], [1, 0], clamp), borderRadius: 3}}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const SpeedLines: React.FC<{at: number; color?: string; len?: number}> = ({at, color = '#ffffff', len = 22}) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0 || f > len) return null;
  const op = interpolate(f, [0, 3, len], [0, 0.9, 0], clamp);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: op}}>
      <svg width="100%" height="100%" viewBox="0 0 980 930">
        {Array.from({length: 36}, (_, i) => {
          const a = (i / 36) * Math.PI * 2 + random(`sl${i}`) * 0.1;
          const r0 = 160 + random(`sr${i}`) * 140 + f * 14;
          const r1 = r0 + 160 + random(`sq${i}`) * 220;
          return <line key={i} x1={490 + Math.cos(a) * r0} y1={465 + Math.sin(a) * r0} x2={490 + Math.cos(a) * r1} y2={465 + Math.sin(a) * r1} stroke={color} strokeWidth={5 + random(`sw${i}`) * 7} strokeLinecap="round" />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** the sweep of colour across the whole frame on every cut */
export const CutSweep: React.FC<{color: string; dir: number}> = ({color, dir}) => {
  const frame = useCurrentFrame();
  if (frame > 12) return null;
  const x = interpolate(frame, [0, 12], [dir > 0 ? -1300 : 1300, dir > 0 ? 1300 : -1300]);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: -200, bottom: -200, width: 420, left: 330, transform: `translateX(${x}px) skewX(${dir > 0 ? -14 : 14}deg)`, background: `linear-gradient(90deg, transparent, ${color}, #fff, ${color}, transparent)`, opacity: 0.9}} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ cut transitions (enter animation of a scene's panel) */
export const CUTS = ['punch', 'slideL', 'slideUp', 'flip', 'zoom', 'slideR', 'drop', 'wipe'] as const;
export type Cut = (typeof CUTS)[number];

export function cutStyle(cut: Cut, f: number): React.CSSProperties {
  const e = (a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  switch (cut) {
    case 'slideL':
      return {transform: `translateX(${e(0, 11, 1100, 0)}px) rotate(${e(0, 11, 3, 0)}deg)`};
    case 'slideR':
      return {transform: `translateX(${e(0, 11, -1100, 0)}px) rotate(${e(0, 11, -3, 0)}deg)`};
    case 'slideUp':
      return {transform: `translateY(${e(0, 11, 1100, 0)}px)`};
    case 'drop':
      return {transform: `translateY(${e(0, 10, -1000, 0)}px) scale(${e(0, 10, 1.1, 1)})`};
    case 'flip':
      return {transform: `perspective(1600px) rotateY(${e(0, 13, 90, 0)}deg) scale(${e(0, 13, 0.9, 1)})`};
    case 'zoom':
      return {transform: `scale(${e(0, 9, 0.2, 1)}) rotate(${e(0, 9, -8, 0)}deg)`, opacity: e(0, 4, 0, 1)};
    case 'wipe':
      return {clipPath: `inset(0 ${e(0, 11, 100, 0)}% 0 0 round 40px)`};
    default:
      return {transform: `scale(${e(0, 6, 1.16, 1)})`, opacity: e(0, 3, 0.2, 1)};
  }
}

/** sound of each cut */
export const CUT_SFX: Record<string, string> = {punch: 'thud', slideL: 'whoosh', slideR: 'whoosh', slideUp: 'swish', drop: 'thud', flip: 'swish', zoom: 'whoosh', wipe: 'swish'};

/* ------------------------------------------------------------------ sound-effect cues per scene kind: [fraction, file, volume] */
export type Cue = [number, string, number];
export const CUES: Record<string, Cue[]> = {
  title: [[0.7, 'glitch', 0.5]],
  problem: [[0.12, 'pop', 0.7], [0.62, 'ding', 0.6], [0.68, 'sparkle', 0.4]],
  brute: [[0.1, 'riser', 0.5], [0.52, 'buzz', 0.4]],
  pause: [[0.02, 'thud', 0.7], [0.5, 'tick', 0.8], [0.64, 'tick', 0.8], [0.78, 'tick', 0.8], [0.66, 'pop', 0.7]],
  gate: [[0.15, 'pop', 0.6], [0.32, 'pop', 0.6], [0.49, 'pop', 0.6], [0.66, 'pop', 0.6], [0.55, 'whoosh', 0.3]],
  steps: [[0.04, 'pop', 0.8], [0.3, 'pop', 0.8], [0.55, 'pop', 0.8], [0.74, 'ding', 0.6]],
  code: [[0.02, 'type', 0.7], [0.1, 'tick', 0.6], [0.23, 'tick', 0.6], [0.37, 'tick', 0.6], [0.51, 'tick', 0.6], [0.65, 'tick', 0.6], [0.79, 'tick', 0.6], [0.93, 'tick', 0.6]],
  run: [[0.15, 'pop', 0.7]],
  trap: [[0.1, 'buzz', 0.8], [0.5, 'ding', 0.7], [0.55, 'sparkle', 0.4]],
  aha: [[0.02, 'riser', 0.6], [0.4, 'sparkle', 0.5], [0.78, 'tada', 0.6]],
  smile: [[0.42, 'ding', 0.7], [0.45, 'sparkle', 0.5]],
  name: [[0.15, 'pop', 0.7], [0.25, 'pop', 0.7], [0.35, 'pop', 0.7], [0.62, 'ding', 0.7]],
  notes: [[0.08, 'pop', 0.7], [0.24, 'pop', 0.7], [0.4, 'pop', 0.7], [0.56, 'pop', 0.7]],
  quiz: [[0.25, 'pop', 0.8], [0.4, 'pop', 0.8], [0.7, 'tick', 0.7]],
  close: [[0.05, 'pop', 0.8], [0.22, 'pop', 0.8], [0.4, 'pop', 0.8], [0.6, 'ding', 0.7], [0.62, 'tada', 0.6]],
};

export const Cues: React.FC<{kind: string; dur: number; extra?: Cue[]}> = ({kind, dur, extra = []}) => (
  <>
    {[...(CUES[kind] ?? []), ...extra].map(([at, file, vol], i) => (
      <Sequence key={i} from={Math.max(0, Math.round(dur * at))} layout="none">
        <Audio src={staticFile(`sfx/dsa/${file}.wav`)} volume={vol} />
      </Sequence>
    ))}
  </>
);

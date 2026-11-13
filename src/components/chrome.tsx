import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import '@fontsource/noto-sans-devanagari/500.css';
import '@fontsource/noto-sans-devanagari/700.css';
import {C, FONT, MOOD, W} from '../theme';
import {clamp01} from './ui';

/** Blocks rendering until the web fonts are loaded, so no frame renders with fallback fonts. */
export const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const specs = [
      '400 30px "Inter"',
      '800 30px "Inter"',
      '900 30px "Inter"',
      '400 30px "JetBrains Mono"',
      '700 30px "JetBrains Mono"',
      '800 30px "JetBrains Mono"',
      '500 30px "Noto Sans Devanagari"',
      '700 30px "Noto Sans Devanagari"',
    ];
    Promise.all(specs.map((s) => document.fonts.load(s, 'aअ')))
      .then(() => document.fonts.ready)
      .finally(() => continueRender(handle));
  }, [handle]);
};

export const Background: React.FC<{mood: string; prevMood: string; blend: number}> = ({mood, prevMood, blend}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 50) * 40;
  const glow = (color: string, opacity: number) => (
    <AbsoluteFill
      style={{
        opacity,
        background: `radial-gradient(ellipse 900px 900px at ${W / 2 + drift}px 640px, ${color}2e, transparent 70%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {glow(MOOD[prevMood] ?? MOOD.neutral, 1 - blend)}
      {glow(MOOD[mood] ?? MOOD.neutral, blend)}
      {/* faint grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line}44 1px, transparent 1px), linear-gradient(90deg, ${C.line}44 1px, transparent 1px)`,
          backgroundSize: '72px 72px',
          backgroundPosition: `0 ${(frame * 0.6) % 72}px`,
          maskImage: 'radial-gradient(ellipse 700px 900px at 540px 760px, #000 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 700px 900px at 540px 760px, #000 30%, transparent 80%)',
        }}
      />
      {/* vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, #000a 100%)'}} />
    </AbsoluteFill>
  );
};

export const Header: React.FC<{series: string; number: number; sceneStarts: number[]; sceneDurs: number[]}> = ({
  series,
  number,
  sceneStarts,
  sceneDurs,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', top: 120, left: 70, right: 70}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: FONT.mono,
          fontSize: 24,
          letterSpacing: 4,
          color: C.muted,
          fontWeight: 700,
        }}
      >
        <span style={{color: C.text}}>
          DEBUG<span style={{color: C.green}}>_</span>BRO
        </span>
        <span>
          {series.toUpperCase()} · {String(number).padStart(2, '0')}
        </span>
      </div>
      <div style={{display: 'flex', gap: 8, marginTop: 16}}>
        {sceneStarts.map((s, i) => {
          const p = clamp01((frame - s) / Math.max(1, sceneDurs[i]));
          return (
            <div key={i} style={{flex: 1, height: 5, borderRadius: 3, background: `${C.line}`, overflow: 'hidden'}}>
              <div style={{width: `${p * 100}%`, height: '100%', background: C.text}} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export type Word = {text: string; startMs: number; endMs: number; scene: number};

/** Groups words into short phrases (max 4 words, or break at punctuation). */
const chunk = (words: Word[]) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= 4 || /[,.!?।:]$/.test(w.text)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
};

export const Captions: React.FC<{words: Word[]}> = ({words}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const groups = React.useMemo(() => chunk(words), [words]);
  const g = groups.find((grp) => ms >= grp[0].startMs - 80 && ms <= grp[grp.length - 1].endMs + 250);
  if (!g) return null;
  const appear = interpolate(ms, [g[0].startMs - 80, g[0].startMs + 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: 1330,
        left: 90,
        right: 90,
        textAlign: 'center',
        fontFamily: FONT.hindi,
        fontSize: 64,
        fontWeight: 700,
        lineHeight: 1.3,
        opacity: appear,
        transform: `translateY(${(1 - appear) * 14}px)`,
        textShadow: '0 4px 24px #000, 0 0 2px #000',
        WebkitTextStroke: '1.5px #000',
      }}
    >
      {g.map((w, i) => {
        const spoken = ms >= w.startMs;
        const active = ms >= w.startMs && ms < w.endMs + 60;
        return (
          <React.Fragment key={i}>
            <span
              style={{
                color: active ? '#ffd23f' : spoken ? '#ffffff' : '#6b7180',
                display: 'inline-block',
                transform: active ? 'scale(1.08)' : undefined,
              }}
            >
              {w.text.replace(/[,।]$/, '')}
            </span>{' '}
          </React.Fragment>
        );
      })}
    </div>
  );
};

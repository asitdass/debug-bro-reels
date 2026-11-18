import React from 'react';
import {AbsoluteFill, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import {C, FONT} from '../theme';

export const SERIF = '"Instrument Serif", Georgia, serif';

export type CapWord = {text: string; accent: boolean; startMs: number; endMs: number; scene: number};

/**
 * Builds the on-screen caption words. Scenes with a `cap` (Roman Hinglish, accent word in *asterisks*) get those
 * words spread over the time the voice speaks that scene; scenes without one fall back to the spoken words.
 */
export function captionWords(episode: any, timings: any): CapWord[] {
  const out: CapWord[] = [];
  episode.scenes.forEach((s: any, i: number) => {
    const spoken = timings.words.filter((w: any) => w.scene === i);
    if (!spoken.length) return;
    const t0 = spoken[0].startMs;
    const t1 = spoken[spoken.length - 1].endMs;
    if (!s.cap) {
      spoken.forEach((w: any) => out.push({text: w.text, accent: false, startMs: w.startMs, endMs: w.endMs, scene: i}));
      return;
    }
    const toks = String(s.cap).split(/\s+/).filter(Boolean);
    const weight = (t: string) => t.replace(/[*]/g, '').length + 2;
    const total = toks.reduce((n, t) => n + weight(t), 0);
    let t = t0;
    let inAccent = false;
    for (const tok of toks) {
      const d = ((t1 - t0) * weight(tok)) / total;
      const opens = tok.startsWith('*');
      const closes = tok.replace(/[.,!?।:]+$/, '').endsWith('*');
      const accent = inAccent || opens;
      if (opens && !closes) inAccent = true;
      if (closes) inAccent = false;
      out.push({text: tok.replace(/\*/g, ''), accent, startMs: t, endMs: t + d * 0.95, scene: i});
      t += d;
    }
  });
  return out;
}

/** One caption line per scene (split in two only if it is long), so a phrase never breaks mid-thought. */
const chunk = (words: CapWord[]) => {
  const byScene = new Map<number, CapWord[]>();
  words.forEach((w) => byScene.set(w.scene, [...(byScene.get(w.scene) ?? []), w]));
  const out: CapWord[][] = [];
  for (const ws of byScene.values()) {
    if (ws.length <= 7) out.push(ws);
    else {
      const mid = Math.ceil(ws.length / 2);
      out.push(ws.slice(0, mid), ws.slice(mid));
    }
  }
  return out;
};

/** Top-half captions: big Inter, unspoken words dim, the accent word in italic serif amber. */
export const TopCaptions: React.FC<{words: CapWord[]}> = ({words}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const groups = React.useMemo(() => chunk(words), [words]);
  const g = groups.find((grp) => ms >= grp[0].startMs - 60 && ms <= grp[grp.length - 1].endMs + 300);
  if (!g) return null;
  const appear = interpolate(ms, [g[0].startMs - 60, g[0].startMs + 90], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const len = g.reduce((n, w) => n + w.text.length + 1, 0);
  const size = len > 30 ? 66 : len > 20 ? 76 : 88;
  return (
    <div
      style={{
        position: 'absolute',
        top: 300,
        left: 70,
        right: 110,
        minHeight: 220,
        display: 'flex',
        alignItems: 'flex-start',
        fontFamily: FONT.sans,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: -1.5,
        opacity: appear,
        transform: `translateY(${(1 - appear) * 18}px)`,
        textShadow: '0 6px 30px #000c',
      }}
    >
      <div>
        {g.map((w, i) => {
          const spoken = ms >= w.startMs;
          const pop = spoken ? interpolate(ms, [w.startMs, w.startMs + 120], [1.12, 1], {extrapolateRight: 'clamp'}) : 1;
          return (
            <React.Fragment key={i}>
              <span
                style={{
                  display: 'inline-block',
                  transform: `scale(${pop})`,
                  transformOrigin: 'left bottom',
                  color: w.accent ? (spoken ? C.amber : '#7a5a2a') : spoken ? '#ffffff' : '#5d6270',
                  fontFamily: w.accent ? SERIF : undefined,
                  fontStyle: w.accent ? 'italic' : undefined,
                  fontWeight: w.accent ? 400 : undefined,
                  fontSize: w.accent ? size * 1.18 : undefined,
                  letterSpacing: w.accent ? 0 : undefined,
                }}
              >
                {w.text}
              </span>{' '}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/** Small editorial part label: "// 03 — break" and "PART 3/9". */
export const PartLabel: React.FC<{index: number; total: number; label: string}> = ({index, total, label}) => (
  <div
    style={{
      position: 'absolute',
      top: 222,
      left: 70,
      right: 70,
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: FONT.mono,
      fontSize: 22,
      letterSpacing: 2,
      color: C.muted,
      textTransform: 'lowercase',
    }}
  >
    <span>
      // {String(index + 1).padStart(2, '0')} — {label}
    </span>
    <span style={{textTransform: 'uppercase'}}>
      PART {index + 1}/{total}
    </span>
  </div>
);

/** Film grain + warm light leak + vignette over everything. */
export const FilmLook: React.FC = () => {
  const frame = useCurrentFrame();
  const x = Math.floor(random(`gx${frame}`) * 512);
  const y = Math.floor(random(`gy${frame}`) * 512);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 700px 500px at 85% 8%, #ffb54718, transparent 70%)',
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, #000000b0 100%)'}} />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('fx/grain.png')})`,
          backgroundPosition: `${x}px ${y}px`,
          opacity: 0.07,
          mixBlendMode: 'overlay',
        }}
      />
    </AbsoluteFill>
  );
};


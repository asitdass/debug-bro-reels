// The parts of the frame that each art direction (src/styles.ts) draws differently:
// background, header, captions, the character's spot, and the cut between scenes.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {ArtStyle} from '../styles';
import {CapWord, SERIF, chunk} from './editorial';
import {Background, Header} from './chrome';
import '@fontsource/anton/400.css';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const HAND = '"Kalam", "Noto Sans Devanagari", cursive';
const ANTON = '"Anton", "Inter", sans-serif';

/* ------------------------------------------------------------ background */
export const StyleBackground: React.FC<{st: ArtStyle; mood: string; prevMood: string; blend: number; scene: number}> = ({st, mood, prevMood, blend, scene}) => {
  const frame = useCurrentFrame();
  const th = st.theme;
  switch (st.bg) {
    case 'paper':
      return (
        <AbsoluteFill style={{background: th.bg}}>
          <AbsoluteFill style={{backgroundImage: `repeating-linear-gradient(180deg, transparent 0 66px, #9db7d955 66px 68px)`, backgroundPosition: '0 30px'}} />
          <div style={{position: 'absolute', top: 0, bottom: 0, left: 104, width: 3, background: '#e4572e66'}} />
          <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, transparent 60%, #b8a57a33 100%)'}} />
        </AbsoluteFill>
      );
    case 'blueprint':
      return (
        <AbsoluteFill style={{background: `radial-gradient(ellipse 1200px 1500px at 50% 40%, ${th.bg}, ${th.bg2})`}}>
          <AbsoluteFill
            style={{
              backgroundImage: `linear-gradient(#ffffff14 1px, transparent 1px), linear-gradient(90deg, #ffffff14 1px, transparent 1px), linear-gradient(#ffffff30 2px, transparent 2px), linear-gradient(90deg, #ffffff30 2px, transparent 2px)`,
              backgroundSize: '30px 30px, 30px 30px, 150px 150px, 150px 150px',
            }}
          />
          <div style={{position: 'absolute', inset: 34, border: '3px solid #ffffff55'}} />
        </AbsoluteFill>
      );
    case 'newsprint':
      return (
        <AbsoluteFill style={{background: th.bg}}>
          <AbsoluteFill style={{backgroundImage: 'radial-gradient(#00000010 1px, transparent 1.4px)', backgroundSize: '6px 6px'}} />
          <div style={{position: 'absolute', left: 60, right: 60, top: 270, height: 3, background: th.ink}} />
        </AbsoluteFill>
      );
    case 'blocks': {
      const cols = st.blocks ?? [th.bg];
      const c = cols[scene % cols.length];
      const prev = cols[(scene + cols.length - 1) % cols.length];
      const wipe = interpolate(blend, [0, 1], [0, 100]);
      return (
        <AbsoluteFill style={{background: prev}}>
          <AbsoluteFill style={{background: c, clipPath: `circle(${wipe * 1.5}% at 50% 55%)`}} />
          <div style={{position: 'absolute', right: -60, bottom: 260, fontFamily: ANTON, fontSize: 700, lineHeight: 1, color: '#ffffff14'}}>{String(scene + 1).padStart(2, '0')}</div>
        </AbsoluteFill>
      );
    }
    case 'terminal':
      return (
        <AbsoluteFill style={{background: th.bg}}>
          <AbsoluteFill style={{background: `radial-gradient(ellipse 900px 1200px at 50% 45%, #0f2a14, ${th.bg} 70%)`}} />
          <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(180deg, #00ff6609 0 2px, transparent 2px 5px)', backgroundPosition: `0 ${frame % 5}px`}} />
        </AbsoluteFill>
      );
    case 'halftone':
      return (
        <AbsoluteFill style={{background: th.bg}}>
          <AbsoluteFill style={{background: `repeating-conic-gradient(from ${frame * 0.3}deg at 50% 55%, #ffffff22 0deg 8deg, transparent 8deg 22deg)`}} />
          <AbsoluteFill style={{backgroundImage: 'radial-gradient(#00000022 3px, transparent 3.5px)', backgroundSize: '22px 22px'}} />
          <div style={{position: 'absolute', inset: 26, border: '10px solid #111'}} />
        </AbsoluteFill>
      );
    default:
      return <Background mood={mood} prevMood={prevMood} blend={blend} />;
  }
};

/* ------------------------------------------------------------ header */
export const StyleHeader: React.FC<{st: ArtStyle; episode: any; starts: number[]; durs: number[]; scene: number}> = ({st, episode, starts, durs, scene}) => {
  const th = st.theme;
  const n = episode.scenes.length;
  const ep = String(episode.number).padStart(2, '0');
  switch (st.header) {
    case 'bars':
      return <Header series={episode.series ?? 'SYSTEM DESIGN'} number={episode.number} sceneStarts={starts} sceneDurs={durs} />;
    case 'page':
      return (
        <div style={{position: 'absolute', top: 150, left: 130, right: 70, display: 'flex', justifyContent: 'space-between', fontFamily: HAND, fontSize: 38, color: th.muted}}>
          <span>Debug Bro ki notebook · #{ep}</span>
          <span>pg {scene + 1}/{n}</span>
        </div>
      );
    case 'terminal':
      return (
        <div style={{position: 'absolute', top: 120, left: 50, right: 50, height: 64, borderRadius: 14, background: '#0f1a11', border: `2px solid ${th.line}`, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px'}}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{width: 18, height: 18, borderRadius: 9, background: c}} />
          ))}
          <span style={{marginLeft: 16, fontFamily: FONT.mono, fontSize: 26, color: th.muted}}>
            debug_bro@prod: ~/ep{ep} · [{scene + 1}/{n}]
          </span>
        </div>
      );
    case 'masthead':
      return (
        <div style={{position: 'absolute', top: 120, left: 60, right: 60, textAlign: 'center', color: th.ink}}>
          <div style={{fontFamily: SERIF, fontSize: 64, lineHeight: 1, letterSpacing: 1}}>The Debug Bro Times</div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 20, letterSpacing: 2, marginTop: 10, color: th.muted}}>
            <span>EDITION {ep}</span>
            <span>{String(episode.series ?? 'TECH').toUpperCase()}</span>
            <span>
              PAGE {scene + 1}/{n}
            </span>
          </div>
        </div>
      );
    case 'blueprint':
      return (
        <div style={{position: 'absolute', top: 118, right: 60, border: '3px solid #ffffffaa', fontFamily: FONT.mono, color: '#ffffffcc', fontSize: 20, letterSpacing: 2}}>
          <div style={{padding: '8px 16px', borderBottom: '2px solid #ffffff77'}}>DEBUG_BRO · DWG {ep}</div>
          <div style={{padding: '8px 16px'}}>
            SHEET {scene + 1} OF {n}
          </div>
        </div>
      );
    default:
      return null;
  }
};

/* ------------------------------------------------------------ captions */
export const StyledCaptions: React.FC<{st: ArtStyle; words: CapWord[]}> = ({st, words}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const groups = React.useMemo(() => chunk(words), [words]);
  const g = groups.find((grp) => ms >= grp[0].startMs - 60 && ms <= grp[grp.length - 1].endMs + 300);
  if (!g) return null;
  const th = st.theme;
  const appear = interpolate(ms, [g[0].startMs - 60, g[0].startMs + 90], [0, 1], clamp);
  const len = g.reduce((n, w) => n + w.text.length + 1, 0);
  const word = (w: CapWord, i: number, accentStyle: React.CSSProperties, base: React.CSSProperties = {}) => {
    const spoken = ms >= w.startMs;
    return (
      <React.Fragment key={i}>
        <span style={{...base, opacity: spoken ? 1 : 0.35, ...(w.accent ? accentStyle : {})}}>{w.text}</span>{' '}
      </React.Fragment>
    );
  };

  switch (st.captions) {
    case 'sticky':
      return (
        <div
          style={{
            position: 'absolute',
            top: 240,
            left: 110,
            maxWidth: 760,
            padding: '26px 34px 30px',
            background: '#ffe680',
            boxShadow: '0 14px 24px #0002',
            transform: `rotate(-2.2deg) scale(${0.9 + appear * 0.1})`,
            opacity: appear,
            fontFamily: HAND,
            fontWeight: 700,
            fontSize: len > 30 ? 60 : 72,
            lineHeight: 1.1,
            color: th.ink,
          }}
        >
          <div style={{position: 'absolute', top: -16, left: '40%', width: 120, height: 34, background: '#ffffff99', transform: 'rotate(3deg)'}} />
          {g.map((w, i) => word(w, i, {color: th.accent, textDecoration: 'underline', textDecorationThickness: 5, textUnderlineOffset: 8}))}
        </div>
      );
    case 'terminal':
      return (
        <div style={{position: 'absolute', top: 230, left: 60, right: 90, fontFamily: FONT.mono, fontWeight: 700, fontSize: len > 30 ? 48 : 58, lineHeight: 1.25, color: th.ink, opacity: appear}}>
          <span style={{color: th.accent}}>$ </span>
          {g.map((w, i) => (ms >= w.startMs ? word(w, i, {color: '#ffe066', background: '#ffe06622', padding: '0 8px'}) : null))}
          <span style={{display: 'inline-block', width: 26, height: 52, background: th.accent, verticalAlign: 'middle', opacity: Math.floor(frame / 8) % 2 ? 1 : 0}} />
        </div>
      );
    case 'headline':
      return (
        <div style={{position: 'absolute', top: 300, left: 60, right: 60, textAlign: 'center', opacity: appear}}>
          <div style={{fontFamily: SERIF, fontSize: len > 30 ? 82 : 98, lineHeight: 1.02, color: th.ink, letterSpacing: -1}}>
            {g.map((w, i) => word(w, i, {color: th.accent, fontStyle: 'italic'}))}
          </div>
          <div style={{height: 3, background: th.ink, marginTop: 22}} />
        </div>
      );
    case 'poster':
      return (
        <div style={{position: 'absolute', top: 240, left: 50, right: 50, textAlign: 'left', opacity: appear, transform: `translateY(${(1 - appear) * 40}px)`}}>
          <div style={{fontFamily: ANTON, fontSize: len > 28 ? 118 : 148, lineHeight: 0.98, color: '#111', textTransform: 'uppercase'}}>
            {g.map((w, i) => word(w, i, {color: '#fff', background: '#111', padding: '0 14px', display: 'inline-block', transform: 'rotate(-2deg)'}))}
          </div>
        </div>
      );
    case 'label':
      return (
        <div style={{position: 'absolute', top: 260, left: 60, maxWidth: 760, opacity: appear}}>
          <div style={{fontFamily: FONT.mono, fontSize: 22, letterSpacing: 4, color: th.muted, marginBottom: 10}}>NOTE:</div>
          <div style={{border: '3px solid #ffffffcc', padding: '20px 28px', fontFamily: FONT.mono, fontWeight: 800, fontSize: len > 30 ? 50 : 60, lineHeight: 1.18, color: '#fff', textTransform: 'uppercase', position: 'relative'}}>
            {g.map((w, i) => word(w, i, {color: th.accent}))}
            {[{top: -9, left: -9}, {top: -9, right: -9}, {bottom: -9, left: -9}, {bottom: -9, right: -9}].map((p, k) => (
              <div key={k} style={{position: 'absolute', width: 14, height: 14, background: th.accent, ...p}} />
            ))}
          </div>
        </div>
      );
    case 'comic':
      return (
        <div
          style={{
            position: 'absolute',
            top: 230,
            left: 70,
            maxWidth: 820,
            background: '#fff',
            border: '6px solid #111',
            boxShadow: '10px 10px 0 #111',
            padding: '18px 30px',
            fontFamily: ANTON,
            fontSize: len > 30 ? 66 : 80,
            lineHeight: 1.05,
            textTransform: 'uppercase',
            color: '#111',
            transform: `rotate(-1.5deg) scale(${0.85 + appear * 0.15})`,
            opacity: appear,
          }}
        >
          {g.map((w, i) => word(w, i, {color: th.accent}))}
        </div>
      );
    default:
      return null; // 'top' uses the original TopCaptions
  }
};

/* ------------------------------------------------------------ character spot */
export const MascotFrame: React.FC<{st: ArtStyle; children: React.ReactNode}> = ({st, children}) => {
  const m = st.mascot;
  if (m.frame === 'circle')
    return (
      <div style={{position: 'absolute', left: m.x, top: m.y, width: m.width, height: m.width, borderRadius: '50%', overflow: 'hidden', border: `8px solid ${st.theme.accent}`, background: '#0b3170'}}>
        <div style={{position: 'absolute', left: -m.width * 0.12, top: m.width * 0.02}}>{children}</div>
      </div>
    );
  if (m.frame === 'box')
    return (
      <div style={{position: 'absolute', left: m.x, top: m.y, width: m.width, height: 470, overflow: 'hidden', border: `5px solid ${st.theme.ink}`, background: '#d9d3c4'}}>
        <div style={{position: 'absolute', left: -20, top: 20}}>{children}</div>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, background: st.theme.accent, color: '#fff', fontFamily: FONT.mono, fontWeight: 800, fontSize: 24, letterSpacing: 3, padding: '8px 14px'}}>
          DEBUG BRO · LIVE
        </div>
      </div>
    );
  return <div style={{position: 'absolute', left: m.x, top: m.y}}>{children}</div>;
};

/* ------------------------------------------------------------ cuts */
export const Cut: React.FC<{st: ArtStyle; dur: number; first?: boolean; children: React.ReactNode}> = ({st, dur, first, children}) => {
  const frame = useCurrentFrame();
  // the first scene is the hook: no entry transition, it must be fully visible at frame 0
  if (first) return <AbsoluteFill style={{opacity: interpolate(frame, [dur - 3, dur], [1, 0], clamp)}}>{children}</AbsoluteFill>;
  const out = interpolate(frame, [dur - 3, dur], [1, 0], clamp);
  const push = interpolate(frame, [6, dur], [1, 1.03], clamp);
  let style: React.CSSProperties = {};
  switch (st.transition) {
    case 'slide': {
      const p = interpolate(frame, [0, 6], [1, 0], clamp);
      style = {transform: `translateX(${p * 140}px) scale(${push})`, opacity: Math.min(1 - p * 0.8, out)};
      break;
    }
    case 'whip': {
      const p = interpolate(frame, [0, 5], [1, 0], clamp);
      style = {transform: `translateY(${p * 200}px) scale(${push})`, filter: `blur(${p * 14}px)`, opacity: out};
      break;
    }
    case 'flip': {
      const p = interpolate(frame, [0, 7], [1, 0], clamp);
      style = {transform: `perspective(1600px) rotateY(${p * 75}deg) scale(${push})`, opacity: Math.min(1 - p * 0.6, out)};
      break;
    }
    case 'glitch': {
      const j = frame < 5 ? (frame % 2 ? 18 : -14) : 0;
      style = {transform: `translateX(${j}px) scale(${push})`, opacity: frame < 5 && frame % 3 === 1 ? 0.5 : out, filter: frame < 5 ? 'hue-rotate(90deg) saturate(2)' : undefined};
      break;
    }
    case 'pop': {
      const p = interpolate(frame, [0, 6], [0.8, 1], clamp);
      const over = interpolate(frame, [6, 10], [1.04, 1], clamp);
      style = {transform: `scale(${(frame < 6 ? p : over) * push})`, opacity: out};
      break;
    }
    default: {
      const punch = interpolate(frame, [0, 6], [1.08, 1], clamp);
      style = {transform: `scale(${punch * push})`, opacity: Math.min(interpolate(frame, [0, 3], [0, 1], clamp), out)};
    }
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

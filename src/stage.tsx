// "stage": Debug Bro's room, the house style from ep 5.
// Why: every outlier we studied (billu_developer, devmonk.preetam, sys.design.101) fills the WHOLE frame from frame 0
// and keeps its characters on screen, big, reacting. Eps 1-4 floated small cards in an empty dark frame.
//
// Layout (1080x1920):
//   y 150-380   headline: the scene's `cap`, huge, accent word on a highlighter
//   y 400-1196  a monitor on the wall; any existing scene type plays on its screen (scaled from its 1080x1000 box)
//   y 1110-1730 the Intern (left) and Debug Bro (right), always on screen; the speaker talks, the other reacts
//   y 1640-     the desk, with the debugging rubber duck
// The wall colour follows the scene's mood, so every cut is also a colour change (a visual reset every 2-3 s).
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from './theme';
import {Mascot, MascotTrack, PoseName, poseFor} from './components/Mascot';
import {MouthCtx} from './components/themeContext';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const INK = '#1b1412';
const WALL: Record<string, string> = {neutral: '#ffc857', problem: '#ff7b6b', solution: '#5fd39a', comeback: '#b79cff'};
const WALL_DARK: Record<string, string> = {neutral: '#f4a62a', problem: '#f2545b', solution: '#2fb57a', comeback: '#9277f2'};

/** the monitor: outer box and the screen inside it */
export const MON = {x: 50, y: 400, w: 980, h: 796, bezel: 18};
const SCREEN = {x: MON.x + MON.bezel, y: MON.y + MON.bezel, w: MON.w - 2 * MON.bezel, h: MON.h - 2 * MON.bezel};
/** the box every scene component draws into (see Stage in scenes.tsx / formats.tsx) */
const SRC = {x: 0, y: 500, w: 1080, h: 1000};
const K = Math.min(SCREEN.w / SRC.w, SCREEN.h / SRC.h);

const usePop = (at: number, damping = 13) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping, stiffness: 190}});
};

/** who is talking in a scene: dialog says so; otherwise the "alt" voice is the Intern, the main voice is Debug Bro */
export const speakerOf = (s: any): 'bro' | 'intern' => (s?.type === 'dialog' ? (s.who === 'intern' ? 'intern' : 'bro') : s?.speaker === 'alt' ? 'intern' : 'bro');

const LISTEN: Record<string, PoseName> = {neutral: 'crossed', problem: 'shock', solution: 'thumbsup', comeback: 'think'};

/** pose tracks for both characters over the whole reel */
export function castTracks(episode: any, starts: number[]): {bro: MascotTrack; intern: MascotTrack} {
  const bro: MascotTrack = [];
  const intern: MascotTrack = [];
  let prevBro: PoseName | undefined;
  episode.scenes.forEach((s: any, i: number) => {
    const who = speakerOf(s);
    const mood = s.mood ?? 'neutral';
    const listener: PoseName = s.react ?? LISTEN[mood] ?? 'crossed';
    const broPose: PoseName = who === 'bro' ? (prevBro = poseFor(s, i, prevBro)) : listener;
    const internPose: PoseName = who === 'intern' ? (s.pose ?? (mood === 'problem' ? 'shock' : 'explain')) : listener === broPose ? 'think' : listener;
    bro.push({at: starts[i], pose: broPose});
    intern.push({at: starts[i], pose: internPose});
  });
  return {bro, intern};
}

/* ------------------------------------------------------------------ room (behind everything) */
export const StageRoom: React.FC<{episode: any; starts: number[]; cur: number}> = ({episode, starts, cur}) => {
  const frame = useCurrentFrame();
  const mood = episode.scenes[cur]?.mood ?? 'neutral';
  const prevMood = episode.scenes[Math.max(0, cur - 1)]?.mood ?? 'neutral';
  const t = cur === 0 ? 1 : interpolate(frame, [starts[cur], starts[cur] + 8], [0, 1], clamp);
  const wall = (m: string) => `linear-gradient(180deg, ${WALL[m] ?? WALL.neutral} 0%, ${WALL_DARK[m] ?? WALL_DARK.neutral} 100%)`;
  const n = episode.scenes.length;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: wall(prevMood)}} />
      <AbsoluteFill style={{background: wall(mood), opacity: t}} />
      {/* wallpaper: soft dots */}
      <AbsoluteFill style={{backgroundImage: 'radial-gradient(#ffffff33 5px, transparent 5.5px)', backgroundSize: '64px 64px', backgroundPosition: `${(frame * 0.4) % 64}px 0`}} />
      {/* top row: brand + progress */}
      <div style={{position: 'absolute', top: 120, left: 56, right: 56, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{background: INK, color: '#fff', fontFamily: FONT.mono, fontWeight: 800, fontSize: 26, letterSpacing: 3, padding: '8px 16px', borderRadius: 10}}>
          DEBUG<span style={{color: '#ffc857'}}>_</span>BRO
        </div>
        <div style={{flex: 1, display: 'flex', gap: 6}}>
          {Array.from({length: n}, (_, i) => (
            <div key={i} style={{flex: 1, height: 8, borderRadius: 4, background: i <= cur ? INK : '#1b141233'}} />
          ))}
        </div>
      </div>
      {/* monitor body (the screen content is drawn by each scene) */}
      <div style={{position: 'absolute', left: MON.x + 380, width: 220, top: MON.y + MON.h - 10, height: 80, background: '#2a2d36', borderRadius: '0 0 18px 18px'}} />
      <div
        style={{
          position: 'absolute',
          left: MON.x,
          top: MON.y,
          width: MON.w,
          height: MON.h,
          borderRadius: 40,
          background: '#20232b',
          boxShadow: `0 26px 0 #00000026, 0 40px 80px #0000002e`,
        }}
      >
        <div style={{position: 'absolute', left: MON.bezel, top: MON.bezel, right: MON.bezel, bottom: MON.bezel, borderRadius: 26, background: 'radial-gradient(ellipse at 50% 35%, #1a2033, #0b0d14 75%)'}} />
        <div style={{position: 'absolute', right: 34, bottom: 4, width: 10, height: 10, borderRadius: 5, background: '#3ddc84'}} />
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ one scene: headline + what plays on the monitor */
const Headline: React.FC<{cap: string}> = ({cap}) => {
  const pop = usePop(0, 14);
  const toks = String(cap).split(/\s+/).filter(Boolean);
  let inAcc = false;
  const len = cap.replace(/\*/g, '').length;
  const size = len > 30 ? 74 : len > 20 ? 86 : 98;
  return (
    <div
      style={{
        position: 'absolute',
        top: 180,
        left: 50,
        right: 50,
        height: 210,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        transform: `scale(${0.92 + pop * 0.08})`,
        opacity: Math.min(1, pop * 1.5),
      }}
    >
      <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: size, lineHeight: 1.04, letterSpacing: -2, color: INK, textWrap: 'balance'} as React.CSSProperties}>
        {toks.map((tk, i) => {
          const opens = tk.startsWith('*');
          const closes = tk.replace(/[.,!?:]+$/, '').endsWith('*');
          const acc = inAcc || opens;
          if (opens && !closes) inAcc = true;
          if (closes) inAcc = false;
          return (
            <React.Fragment key={i}>
              <span style={acc ? {background: '#ffffff', padding: '0 14px', borderRadius: 12, display: 'inline-block', transform: 'rotate(-2deg)', boxShadow: `6px 6px 0 ${INK}`} : undefined}>
                {tk.replace(/\*/g, '')}
              </span>{' '}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/** dialog on the monitor: a big chat card from the speaker, tail pointing down at them */
const ScreenDialog: React.FC<{s: any; dur: number}> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const intern = s.who === 'intern';
  const pop = usePop(1, 13);
  const text = String(s.line ?? '');
  const shown = Math.ceil(text.length * interpolate(frame, [0, Math.max(6, dur * 0.4)], [0.35, 1], clamp));
  const size = text.length > 60 ? 64 : text.length > 36 ? 76 : 90;
  return (
    <AbsoluteFill style={{padding: 50, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 30, letterSpacing: 4, color: intern ? '#4be3c9' : '#ffc857', textAlign: intern ? 'left' : 'right', marginBottom: 18}}>
        {intern ? 'INTERN' : 'DEBUG BRO'}
      </div>
      <div
        style={{
          alignSelf: intern ? 'flex-start' : 'flex-end',
          maxWidth: '96%',
          background: intern ? '#e8fff9' : '#fff6df',
          color: INK,
          borderRadius: 44,
          padding: '36px 44px',
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.14,
          letterSpacing: -1,
          transform: `scale(${0.88 + pop * 0.12})`,
          transformOrigin: intern ? '10% 100%' : '90% 100%',
          opacity: Math.min(1, pop * 1.6),
          position: 'relative',
        }}
      >
        {text.slice(0, shown)}
        <span style={{opacity: 0}}>{text.slice(shown)}</span>
        <svg width={80} height={60} viewBox="0 0 80 60" style={{position: 'absolute', bottom: -50, [intern ? 'left' : 'right']: 80} as React.CSSProperties}>
          <path d={intern ? 'M 0 0 L 80 0 L 6 58 Z' : 'M 0 0 L 80 0 L 74 58 Z'} fill={intern ? '#e8fff9' : '#fff6df'} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/** a number on the monitor: as big as the screen allows (the generic Counter is sized for a full frame) */
const ScreenCounter: React.FC<{s: any; dur: number}> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const v = Math.round(interpolate(frame, [2, Math.max(8, dur * 0.45)], [s.from ?? 0, s.to], clamp));
  const pop = usePop(0, 11);
  const col = {red: '#ff5d6c', green: '#3ddc84', amber: '#ffc857', blue: '#6aa8ff', violet: '#b79cff'}[s.tone as string] ?? '#ffc857';
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40}}>
      <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 34, letterSpacing: 3, color: '#9aa3c7', textTransform: 'uppercase'}}>{s.label}</div>
      <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: String(s.to).length > 4 ? 220 : 330, lineHeight: 1, color: col, letterSpacing: -8, transform: `scale(${0.8 + pop * 0.2})`, textShadow: `0 0 80px ${col}55`}}>
        {v.toLocaleString('en-IN')}
      </div>
      {s.sub ? <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 40, color: '#eef1f6', marginTop: 10}}>{s.sub}</div> : null}
    </AbsoluteFill>
  );
};

/** One scene in the stage style. `Comp` is the scene's normal component; it plays on the monitor. */
export const StageScene: React.FC<{s: any; dur: number; Comp?: React.FC<any>}> = ({s, dur, Comp}) => {
  const frame = useCurrentFrame();
  // channel-switch cut: a quick white flash + settle on the screen, a fade at the very end
  const flash = interpolate(frame, [0, 3], [0.3, 0], clamp);
  const settle = interpolate(frame, [0, 6], [1.06, 1], clamp);
  const out = interpolate(frame, [dur - 3, dur], [1, 0], clamp);
  const cap = s.type === 'dialog' ? null : s.cap ?? null;
  return (
    <AbsoluteFill style={{opacity: out}}>
      {cap ? <Headline cap={cap} /> : null}
      <div style={{position: 'absolute', left: SCREEN.x, top: SCREEN.y, width: SCREEN.w, height: SCREEN.h, overflow: 'hidden', borderRadius: 26}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${settle})`}}>
          {s.type === 'dialog' || !Comp ? (
            <ScreenDialog s={s} dur={dur} />
          ) : s.type === 'counter' ? (
            <ScreenCounter s={s} dur={dur} />
          ) : (
            <div
              style={{
                position: 'absolute',
                width: 1080,
                height: 1920,
                left: (SCREEN.w - SRC.w * K) / 2 - SRC.x * K,
                top: (SCREEN.h - SRC.h * K) / 2 - SRC.y * K,
                transform: `scale(${K})`,
                transformOrigin: '0 0',
              }}
            >
              <Comp s={s} dur={dur} />
            </div>
          )}
        </div>
        <AbsoluteFill style={{background: '#ffffff', opacity: flash}} />
        {/* screen glare */}
        <AbsoluteFill style={{background: 'linear-gradient(125deg, #ffffff12 0%, transparent 35%)'}} />
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ the cast + desk (in front of the monitor) */
const Duck: React.FC = () => (
  <svg width={120} height={110} viewBox="0 0 120 110">
    <ellipse cx={58} cy={78} rx={50} ry={28} fill="#ffd23f" stroke={INK} strokeWidth={5} />
    <circle cx={74} cy={38} r={26} fill="#ffd23f" stroke={INK} strokeWidth={5} />
    <path d="M 96 38 L 116 44 L 96 50 Z" fill="#ff8c1a" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    <circle cx={80} cy={32} r={4.5} fill={INK} />
    <path d="M 22 70 Q 40 60 52 74" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
  </svg>
);

export const StageCast: React.FC<{episode: any; starts: number[]; cur: number}> = ({episode, starts, cur}) => {
  const frame = useCurrentFrame();
  const level = React.useContext(MouthCtx);
  const tracks = React.useMemo(() => castTracks(episode, starts), [episode, starts.join(',')]);
  const who = speakerOf(episode.scenes[cur]);
  const hop = (w: 'bro' | 'intern') => (who === w ? interpolate(frame - starts[cur], [0, 4, 10], [0, -16, 0], clamp) : 0);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, top: 1110 + hop('intern'), filter: 'drop-shadow(0 16px 20px #0003)'}}>
        <Mascot variant="intern" track={tracks.intern} mouth={who === 'intern' ? level : undefined} width={440} seed="st-intern" />
      </div>
      <div style={{position: 'absolute', left: 625, top: 1096 + hop('bro'), filter: 'drop-shadow(0 16px 20px #0003)'}}>
        <Mascot variant="bro" flip track={tracks.bro} mouth={who === 'bro' ? level : undefined} width={450} seed="st-bro" />
      </div>
      {/* desk */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1650, bottom: 0, background: 'linear-gradient(180deg, #7a4a2e, #5a321d)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 1640, height: 26, background: '#9a6440', boxShadow: '0 6px 0 #00000022'}} />
      <div style={{position: 'absolute', left: 482, top: 1546}}>
        <Duck />
      </div>
    </AbsoluteFill>
  );
};

/** An open-loop sticker ("Ruko, twist aage hai"): gives a reason to keep watching. Any style; set `tease` on a scene. */
export const Tease: React.FC<{text: string; top?: number}> = ({text, top = 330}) => {
  const frame = useCurrentFrame();
  const pop = usePop(6, 10);
  const wob = Math.sin(frame / 6) * 1.5;
  return (
    <div
      style={{
        position: 'absolute',
        right: 40,
        top,
        maxWidth: 460,
        background: '#fff35c',
        color: INK,
        border: `5px solid ${INK}`,
        borderRadius: 18,
        padding: '14px 24px',
        fontFamily: FONT.sans,
        fontWeight: 900,
        fontSize: 36,
        lineHeight: 1.1,
        letterSpacing: -0.5,
        textTransform: 'uppercase',
        boxShadow: `8px 8px 0 ${INK}`,
        transform: `rotate(${-4 + wob}deg) scale(${pop})`,
        transformOrigin: '100% 100%',
        opacity: frame < 6 ? 0 : 1,
      }}
    >
      {text}
    </div>
  );
};

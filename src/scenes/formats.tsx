// Scene types for the rotating formats (whiteboard, dialogue skit, news, AI-hack list, desi story moment).
// Colours come from the episode's theme, so the same scene looks different in each format.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from '../theme';
import {MouthCtx, useTheme} from '../components/themeContext';
import {Mascot, PoseName} from '../components/Mascot';
import {SERIF} from '../components/editorial';

type P<T = any> = {s: T; dur: number};
const HAND = '"Kalam", "Noto Sans Devanagari", cursive';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Stage: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{position: 'absolute', top: 500, left: 60, right: 60, height: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...style}}>
    {children}
  </div>
);

/** Wipes content in from the left like a marker stroke. */
const Draw: React.FC<{at: number; len?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, len = 10, children, style}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + len], [100, 0], clamp);
  return <div style={{clipPath: `inset(-20px ${p}% -20px -20px)`, ...style}}>{children}</div>;
};

const usePop = (at: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping: 12, stiffness: 180}});
};

/* --------------------------------------------------------------- whiteboard */
const MARKER = '#1f2a44';
const RED = '#d62828';
const GREEN = '#2a9d8f';

const IconBubble: React.FC<{text: string; color?: string}> = ({text, color = MARKER}) => (
  <div
    style={{
      width: 150,
      height: 150,
      borderRadius: 30,
      border: `6px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT.mono,
      fontWeight: 800,
      fontSize: text.length > 3 ? 38 : 50,
      color,
      background: '#fff',
    }}
  >
    {text}
  </div>
);

const Arrow: React.FC<{at: number; vertical?: boolean}> = ({at, vertical}) => (
  <Draw at={at} len={8}>
    <svg width={vertical ? 40 : 90} height={vertical ? 70 : 40} viewBox={vertical ? '0 0 40 70' : '0 0 90 40'}>
      {vertical ? (
        <path d="M 20 4 L 20 60 M 8 48 L 20 62 L 32 48" stroke={MARKER} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M 4 20 L 80 20 M 66 8 L 82 20 L 66 32" stroke={MARKER} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  </Draw>
);

export const Board: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const items: {label: string; sub?: string; icon?: string}[] = s.items ?? [];
  const layout: 'flow' | 'steps' | 'checks' = s.layout ?? (items.length <= 3 ? 'flow' : 'steps');
  const t0 = 12;
  const span = Math.max(20, dur * 0.72 - t0);
  const at = (i: number) => t0 + 10 + (span / Math.max(1, items.length)) * i;
  const flip = Math.round(dur * 0.35);
  const parts = String(s.title ?? '').split('=');
  const flipped = s.not && frame >= flip;
  const flipPop = usePop(flip);
  const board = usePop(0);
  // flow items share the board's inner width (868px) with the arrows, so 3+ items never spill off the board
  const itemW = items.length >= 3 ? Math.floor((868 - (items.length - 1) * 100) / items.length) : 260;
  const itemFont = items.length >= 3 ? 46 : 56;
  return (
    <Stage>
      <div
        style={{
          width: 960,
          minHeight: items.length ? 820 : 560,
          background: '#fdfdfb',
          border: '16px solid #cfd3d8',
          borderRadius: 22,
          boxShadow: '0 30px 60px #0003, inset 0 0 0 2px #e4e6ea',
          padding: '40px 46px 70px',
          position: 'relative',
          transform: `translateY(${(1 - board) * 60}px)`,
        }}
      >
        <Draw at={-1} len={10}>
          <div style={{fontFamily: HAND, fontWeight: 700, fontSize: items.length ? 78 : 104, color: MARKER, textAlign: 'center', lineHeight: 1.12, paddingTop: items.length ? 0 : 90}}>
            {parts.length === 2 ? (
              <>
                {parts[0]}
                <span
                  style={{
                    display: 'inline-block',
                    color: flipped ? RED : MARKER,
                    transform: flipped ? `scale(${1 + (1 - flipPop) * 0.8}) rotate(${(1 - flipPop) * -20}deg)` : undefined,
                    margin: '0 14px',
                  }}
                >
                  {flipped ? '≠' : '='}
                </span>
                {parts[1]}
              </>
            ) : (
              s.title
            )}
          </div>
          <div style={{height: 6, background: MARKER, borderRadius: 3, margin: '14px auto 0', width: '70%', opacity: 0.85}} />
        </Draw>

        {layout === 'flow' ? (
          <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 10, marginTop: 70}}>
            {items.map((it, i) => (
              <React.Fragment key={i}>
                {i > 0 ? (
                  <div style={{marginTop: 40}}>
                    <Arrow at={at(i) - 6} />
                  </div>
                ) : null}
                <Draw at={at(i)} len={10} style={{width: itemW, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
                  <IconBubble text={it.icon ?? String(i + 1)} />
                  <div style={{fontFamily: HAND, fontWeight: 700, fontSize: itemFont, color: MARKER, marginTop: 14, lineHeight: 1.1}}>{it.label}</div>
                  {it.sub ? <div style={{fontFamily: HAND, fontSize: itemFont - 14, color: '#556', marginTop: 6, lineHeight: 1.15}}>{it.sub}</div> : null}
                </Draw>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: 26, marginTop: 56, paddingLeft: 10}}>
            {items.map((it, i) => {
              const tick = usePopSafe(at(i) + 8);
              return (
                <Draw key={i} at={at(i)} len={10} style={{display: 'flex', alignItems: 'center', gap: 26}}>
                  {layout === 'checks' ? (
                    <div style={{width: 76, height: 76, border: `7px solid ${MARKER}`, borderRadius: 10, position: 'relative', flexShrink: 0, background: '#fff'}}>
                      <svg width={70} height={70} viewBox="0 0 70 70" style={{position: 'absolute', left: -2, top: -12, opacity: tick}}>
                        <path d="M 10 36 L 28 54 L 62 10" stroke={GREEN} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ) : (
                    <div style={{fontFamily: HAND, fontWeight: 700, fontSize: 48, color: RED, width: 190, flexShrink: 0}}>STEP {i + 1}</div>
                  )}
                  <div>
                    <div style={{fontFamily: HAND, fontWeight: 700, fontSize: 60, color: MARKER, lineHeight: 1.1}}>{it.label}</div>
                    {it.sub ? <div style={{fontFamily: HAND, fontSize: 40, color: '#556', lineHeight: 1.15}}>{it.sub}</div> : null}
                  </div>
                </Draw>
              );
            })}
          </div>
        )}
        {/* marker tray */}
        <div style={{position: 'absolute', left: 120, right: 120, bottom: -34, height: 22, background: '#b9bec5', borderRadius: 6}} />
        <div style={{position: 'absolute', left: 200, bottom: -30, width: 120, height: 16, background: RED, borderRadius: 8}} />
        <div style={{position: 'absolute', left: 340, bottom: -30, width: 120, height: 16, background: MARKER, borderRadius: 8}} />
      </div>
    </Stage>
  );
};

// hooks inside map are fine here (fixed item count per scene), but keep the name honest
const usePopSafe = (at: number) => usePop(at);

/* --------------------------------------------------------------- dialogue */
const POSE_SET = new Set(['idle', 'point', 'explain', 'think', 'shock', 'facepalm', 'thumbsup', 'shrug', 'crossed', 'laugh']);

/** One line of dialogue between the Intern (left) and Debug Bro (right), with a speech bubble. */
export const Dialog: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const th = useTheme();
  const mouth = React.useContext(MouthCtx);
  const bro = s.who !== 'intern';
  const speakPose = (POSE_SET.has(s.pose) ? s.pose : bro ? 'point' : 'explain') as PoseName;
  const listenPose = (POSE_SET.has(s.react) ? s.react : bro ? 'think' : 'crossed') as PoseName;
  const text = String(s.line ?? '');
  const shown = Math.ceil(text.length * interpolate(frame, [4, Math.max(8, dur * 0.45)], [0, 1], clamp));
  const pop = usePop(2);
  const bubbleLeft = bro ? 300 : 60;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 420,
          left: bubbleLeft,
          width: 720,
          padding: '34px 40px',
          background: th.card,
          color: th.cardInk,
          borderRadius: 40,
          border: `5px solid ${th.dark ? '#ffffff22' : '#1b1412'}`,
          boxShadow: th.dark ? '0 20px 50px #0008' : '0 14px 0 #1b141222',
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: text.length > 60 ? 56 : 66,
          lineHeight: 1.18,
          transform: `scale(${0.85 + pop * 0.15})`,
          transformOrigin: bro ? '80% 100%' : '20% 100%',
          opacity: pop,
        }}
      >
        <div style={{fontFamily: FONT.mono, fontSize: 24, letterSpacing: 3, color: bro ? th.accent : '#1fa391', marginBottom: 10, fontWeight: 800}}>
          {bro ? 'DEBUG BRO' : 'INTERN'}
        </div>
        {text.slice(0, shown)}
        <span style={{opacity: 0}}>{text.slice(shown)}</span>
        <svg width={70} height={60} viewBox="0 0 70 60" style={{position: 'absolute', bottom: -52, [bro ? 'right' : 'left']: 110} as React.CSSProperties}>
          <path d={bro ? 'M 0 0 L 70 0 L 60 56 Z' : 'M 0 0 L 70 0 L 10 56 Z'} fill={th.card} stroke={th.dark ? '#ffffff22' : '#1b1412'} strokeWidth={5} />
          <rect x={4} y={-6} width={62} height={10} fill={th.card} />
        </svg>
      </div>
      <div style={{position: 'absolute', left: -30, top: 900}}>
        <Mascot variant="intern" pose={bro ? listenPose : speakPose} mouth={bro ? undefined : mouth} width={520} seed="intern" />
      </div>
      <div style={{position: 'absolute', right: -30, top: 880}}>
        <Mascot variant="bro" flip pose={bro ? speakPose : listenPose} mouth={bro ? mouth : undefined} width={530} seed="bro-d" />
      </div>
    </>
  );
};

/* --------------------------------------------------------------- news */
export const Headline: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const th = useTheme();
  const pop = usePop(0);
  const bar = interpolate(frame, [10, 26], [0, 100], clamp);
  return (
    <Stage style={{justifyContent: 'flex-start', paddingTop: 30}}>
      <div
        style={{
          width: 940,
          background: th.card,
          color: th.cardInk,
          borderRadius: 26,
          overflow: 'hidden',
          boxShadow: '0 30px 80px #000a',
          transform: `translateY(${(1 - pop) * 80}px) rotate(${(1 - pop) * -2}deg)`,
        }}
      >
        <div style={{background: th.accent, color: '#fff', fontFamily: FONT.mono, fontWeight: 800, fontSize: 30, letterSpacing: 4, padding: '16px 34px', display: 'flex', justifyContent: 'space-between'}}>
          <span>{(s.label ?? 'BREAKING').toUpperCase()}</span>
          <span style={{opacity: 0.85}}>{s.date ?? ''}</span>
        </div>
        <div style={{padding: '34px 40px 44px'}}>
          <div style={{fontFamily: FONT.mono, fontSize: 28, color: '#666', letterSpacing: 2, fontWeight: 700}}>{String(s.source ?? '').toUpperCase()}</div>
          <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: String(s.headline).length > 60 ? 70 : 84, lineHeight: 1.08, letterSpacing: -1.5, marginTop: 16}}>
            {s.headline}
          </div>
          <div style={{height: 10, width: `${bar}%`, background: th.accent, marginTop: 22, borderRadius: 5}} />
          {s.sub ? <div style={{fontFamily: FONT.sans, fontSize: 38, color: '#444', marginTop: 22, lineHeight: 1.25, fontWeight: 600}}>{s.sub}</div> : null}
        </div>
      </div>
    </Stage>
  );
};

/* --------------------------------------------------------------- AI hack / tip list */
export const Tip: React.FC<P> = ({s, dur}) => {
  const th = useTheme();
  const pop = usePop(0);
  const ex = usePop(Math.round(dur * 0.4));
  return (
    <Stage style={{justifyContent: 'flex-start', paddingTop: 20}}>
      <div style={{alignSelf: 'flex-start', marginLeft: 20, display: 'flex', alignItems: 'baseline', gap: 16, opacity: pop}}>
        <span style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 190, color: th.accent, lineHeight: 0.9}}>{s.n}</span>
        <span style={{fontFamily: FONT.mono, fontSize: 40, color: th.muted, fontWeight: 700}}>/ {s.of}</span>
      </div>
      <div
        style={{
          marginTop: 26,
          width: 940,
          background: th.card,
          color: th.cardInk,
          borderRadius: 30,
          padding: '40px 44px',
          boxShadow: th.dark ? '0 20px 60px #0008' : '0 18px 50px #1b1f3a22',
          transform: `translateY(${(1 - pop) * 50}px)`,
          opacity: pop,
        }}
      >
        <div style={{display: 'inline-block', fontFamily: FONT.mono, fontWeight: 800, fontSize: 62, background: `${th.accent}18`, color: th.accent, padding: '10px 22px', borderRadius: 14}}>
          {s.title}
        </div>
        <div style={{fontFamily: FONT.sans, fontWeight: 800, fontSize: 58, lineHeight: 1.18, marginTop: 26, letterSpacing: -0.5}}>{s.desc}</div>
        {s.example ? (
          <div
            style={{
              marginTop: 28,
              padding: '22px 26px',
              borderRadius: 18,
              background: th.dark ? '#ffffff0d' : '#f3f4f8',
              border: `2px dashed ${th.accent}66`,
              fontFamily: FONT.mono,
              fontSize: 38,
              lineHeight: 1.35,
              color: th.cardInk,
              transform: `scale(${0.9 + ex * 0.1})`,
              opacity: ex,
            }}
          >
            <span style={{color: th.accent, fontWeight: 800}}>→ </span>
            {s.example}
          </div>
        ) : null}
      </div>
    </Stage>
  );
};

/* --------------------------------------------------------------- desi story moment */
export const Moment: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const th = useTheme();
  const line = usePop(0); // visible from frame 0: this is often the scroll-stopping first frame
  const stamp = usePop(Math.round(Math.min(dur * 0.45, 40)));
  const flicker = 0.85 + Math.sin(frame / 3) * 0.04;
  return (
    <Stage>
      <div style={{position: 'absolute', inset: -100, background: `radial-gradient(ellipse 520px 620px at 50% 45%, ${th.accent}2a, transparent 70%)`, opacity: flicker}} />
      <div style={{fontFamily: FONT.mono, fontSize: 32, letterSpacing: 6, color: th.muted, fontWeight: 700}}>
        {String(s.place ?? '').toUpperCase()}
      </div>
      <div
        style={{
          marginTop: 40,
          fontFamily: FONT.sans,
          fontWeight: 900,
          fontSize: String(s.line).length > 28 ? 92 : 112,
          lineHeight: 1.02,
          letterSpacing: -3,
          color: th.ink,
          textAlign: 'center',
          transform: `scale(${1.12 - line * 0.12})`,
          textWrap: 'balance',
        } as React.CSSProperties}
      >
        {s.line}
      </div>
      {s.stamp ? (
        <div
          style={{
            marginTop: 70,
            border: `8px solid ${th.accent}`,
            color: th.accent,
            fontFamily: FONT.mono,
            fontWeight: 800,
            fontSize: 72,
            padding: '10px 36px',
            borderRadius: 18,
            transform: `rotate(-6deg) scale(${1.8 - stamp * 0.8})`,
            opacity: stamp,
          }}
        >
          {s.stamp}
        </div>
      ) : null}
    </Stage>
  );
};


/* --------------------------------------------------------------- quiz (comment bait: the answer is not shown) */
const OPT_COL = ['#ffc857', '#4be3c9', '#ff8fab', '#9db4ff'];
export const Quiz: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const q = usePop(0);
  const opts: string[] = s.options ?? [];
  const pulse = 1 + Math.sin(frame / 4) * 0.03;
  return (
    <Stage style={{justifyContent: 'flex-start', paddingTop: 10}}>
      <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 34, letterSpacing: 8, color: '#ffc857', opacity: q}}>QUIZ TIME</div>
      <div style={{marginTop: 22, fontFamily: FONT.sans, fontWeight: 900, fontSize: String(s.question).length > 34 ? 76 : 90, lineHeight: 1.05, letterSpacing: -2, color: '#ffffff', textAlign: 'center', transform: `scale(${0.9 + q * 0.1})`, textWrap: 'balance'} as React.CSSProperties}>
        {s.question}
      </div>
      <div style={{marginTop: 50, display: 'flex', flexDirection: 'column', gap: 28, width: 900}}>
        {opts.map((o, i) => {
          const p = usePopSafe(8 + i * 7);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, background: '#ffffff', borderRadius: 30, padding: '24px 30px', transform: `translateX(${(1 - p) * (i % 2 ? 120 : -120)}px)`, opacity: Math.min(1, p * 1.4), boxShadow: `0 10px 0 ${OPT_COL[i % 4]}`}}>
              <div style={{width: 96, height: 96, borderRadius: 24, background: OPT_COL[i % 4], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.sans, fontWeight: 900, fontSize: 60, color: '#1b1412', flexShrink: 0}}>
                {String.fromCharCode(65 + i)}
              </div>
              <div style={{fontFamily: FONT.sans, fontWeight: 800, fontSize: 56, lineHeight: 1.1, color: '#1b1412'}}>{o}</div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 54, fontFamily: FONT.sans, fontWeight: 900, fontSize: 58, color: '#ffc857', transform: `scale(${pulse})`, opacity: interpolate(frame, [20, 30], [0, 1], clamp)}}>
        Comment karo: {opts.map((_, i) => String.fromCharCode(65 + i)).join(' ya ')}?
      </div>
    </Stage>
  );
};

export const FORMAT_SCENES: Record<string, React.FC<P>> = {
  quiz: Quiz,
  board: Board,
  dialog: Dialog,
  headline: Headline,
  tip: Tip,
  moment: Moment,
};

/** Scenes that draw their own characters fill the frame: no shrink, no corner mascot. */
export const FULL_FRAME = new Set(['dialog']);

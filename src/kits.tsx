// Scene kits: styles that tell the SAME script with a completely different visual grammar.
// The script stays semantic (moment, dialog, flow, counter, board, tip, headline...); a kit decides how each looks.
//   phone   - the whole reel is a chat on a phone screen (messages, notifications, link cards, a notes checklist)
//   comic   - every beat is a comic page: a wide panel with a narration box + SFX, two character panels below
//   kinetic - giant words only, slammed onto colour blocks, no cards and no characters
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from './theme';
import {Mascot, PoseName, poseFor} from './components/Mascot';
import {MouthCtx} from './components/themeContext';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ANTON = '"Anton", "Inter", sans-serif';
const HAND = '"Kalam", "Noto Sans Devanagari", cursive';
const plain = (t?: string) => String(t ?? '').replace(/\*/g, '');

/** The words that matter in a scene, whatever its type. */
export function keyText(s: any): {big: string; small?: string; list?: string[]; num?: number; suffix?: string} {
  switch (s.type) {
    case 'dialog':
      return {big: s.line, small: s.who === 'intern' ? 'INTERN' : 'DEBUG BRO'};
    case 'moment':
      return {big: s.line, small: s.place, list: s.stamp ? [s.stamp] : undefined};
    case 'counter':
      return {big: plain(s.cap), num: s.to, suffix: /%/.test(s.label) ? '%' : '', small: s.label};
    case 'crash':
      return {big: s.label, num: s.value, small: s.quote};
    case 'flow':
      return {big: plain(s.cap), list: s.nodes.map((n: any) => n.label)};
    case 'board':
      return {big: s.title, list: (s.items ?? []).map((i: any) => i.label)};
    case 'tip':
      return {big: s.title, small: s.desc};
    case 'headline':
      return {big: s.headline, small: `${s.source} · ${s.date}`};
    case 'solution':
      return {big: s.title, small: s.sub ?? s.kicker};
    case 'compare':
      return {big: `${s.left.title} vs ${s.right.title}`, list: [...s.left.items, ...s.right.items]};
    case 'coldopen':
      return {big: s.question, small: s.error};
    case 'hook':
      return {big: s.title, small: s.kicker};
    case 'rule':
      return {big: s.rule, small: s.cta};
    default:
      return {big: plain(s.cap) || plain(s.vo)};
  }
}

const usePop = (at: number, damping = 12) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping, stiffness: 190}});
};

/* =============================================================== PHONE */
const WA = {bg: '#e9e3d8', me: '#d7f7c8', them: '#ffffff', ink: '#111b21', muted: '#667781', bar: '#0b6b5e'};

const Bubble: React.FC<{side: 'l' | 'r' | 'c'; at: number; children: React.ReactNode; tint?: string}> = ({side, at, children, tint}) => {
  const p = usePop(at, 14);
  const frame = useCurrentFrame();
  if (frame < at) return null;
  return (
    <div style={{alignSelf: side === 'l' ? 'flex-start' : side === 'r' ? 'flex-end' : 'center', maxWidth: side === 'c' ? '92%' : '82%', transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + p * 0.1})`, transformOrigin: side === 'l' ? '0 100%' : '100% 100%', opacity: p}}>
      <div style={{background: tint ?? (side === 'r' ? WA.me : WA.them), borderRadius: 26, padding: '18px 24px', boxShadow: '0 2px 2px #0000001a', color: WA.ink, fontFamily: FONT.sans, fontSize: 44, lineHeight: 1.25, fontWeight: 600}}>
        {children}
      </div>
    </div>
  );
};

const Typing: React.FC<{side: 'l' | 'r'; from: number; to: number}> = ({side, from, to}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  return (
    <div style={{alignSelf: side === 'l' ? 'flex-start' : 'flex-end', background: side === 'r' ? WA.me : WA.them, borderRadius: 26, padding: '22px 28px', display: 'flex', gap: 10}}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{width: 14, height: 14, borderRadius: 7, background: WA.muted, opacity: 0.4 + 0.6 * Math.abs(Math.sin((frame + i * 4) / 5))}} />
      ))}
    </div>
  );
};

function phoneMessage(s: any, at: number, i: number): React.ReactNode {
  const k = keyText(s);
  const side: 'l' | 'r' = s.type === 'dialog' && s.who === 'intern' ? 'l' : 'r';
  switch (s.type) {
    case 'dialog':
      return (
        <Bubble key={i} side={side} at={at}>
          {s.line}
        </Bubble>
      );
    case 'moment':
    case 'coldopen':
      return (
        <Bubble key={i} side="c" at={at} tint="#fff">
          <div style={{fontFamily: FONT.mono, fontSize: 24, color: WA.muted, letterSpacing: 2}}>{plain(k.small).toUpperCase()}</div>
          <div style={{fontWeight: 800, fontSize: 52, lineHeight: 1.1, marginTop: 8}}>{k.big}</div>
          {k.list ? <div style={{marginTop: 14, display: 'inline-block', border: '4px solid #c8102e', color: '#c8102e', fontFamily: FONT.mono, fontWeight: 800, fontSize: 34, padding: '4px 16px', borderRadius: 10, transform: 'rotate(-4deg)'}}>{k.list[0]}</div> : null}
        </Bubble>
      );
    case 'counter':
    case 'crash':
      return (
        <Bubble key={i} side="r" at={at}>
          <CountUp at={at} to={k.num ?? 0} suffix={k.suffix ?? ''} />
          <div style={{fontSize: 30, color: WA.muted}}>{k.small}</div>
        </Bubble>
      );
    case 'flow':
      return (
        <Bubble key={i} side="r" at={at}>
          <div style={{fontWeight: 700, marginBottom: 12}}>{k.big}</div>
          {k.list!.map((n, j) => (
            <div key={j} style={{display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT.mono, fontSize: 32}}>
              <span style={{background: WA.bar, color: '#fff', borderRadius: 10, padding: '6px 14px'}}>{n}</span>
              {j < k.list!.length - 1 ? <span style={{color: WA.muted}}>↓</span> : null}
            </div>
          ))}
        </Bubble>
      );
    case 'board':
      return (
        <Bubble key={i} side="r" at={at} tint="#fff7cc">
          <div style={{fontFamily: HAND, fontWeight: 700, fontSize: 46}}>{plain(k.big)}</div>
          {k.list!.map((n, j) => (
            <div key={j} style={{fontFamily: HAND, fontSize: 40, display: 'flex', gap: 12, alignItems: 'center'}}>
              <span style={{color: WA.bar, fontWeight: 900}}>✓</span>
              {n}
            </div>
          ))}
        </Bubble>
      );
    case 'headline':
      return (
        <Bubble key={i} side="r" at={at}>
          <div style={{borderLeft: `6px solid ${WA.bar}`, paddingLeft: 16, background: '#f0f2f5', borderRadius: 10, padding: '14px 18px'}}>
            <div style={{fontSize: 26, color: WA.muted}}>{k.small}</div>
            <div style={{fontWeight: 800, fontSize: 40, lineHeight: 1.15}}>{k.big}</div>
          </div>
        </Bubble>
      );
    case 'tip':
      return (
        <Bubble key={i} side="r" at={at}>
          <div style={{fontFamily: FONT.mono, background: '#111b21', color: '#7dffb3', borderRadius: 12, padding: '10px 16px', fontSize: 36}}>{s.title}</div>
          <div style={{marginTop: 10}}>{s.desc}</div>
        </Bubble>
      );
    default:
      return (
        <Bubble key={i} side="r" at={at}>
          <b>{plain(k.big)}</b>
          {k.small ? <div style={{fontSize: 32, color: WA.muted}}>{k.small}</div> : null}
        </Bubble>
      );
  }
}

const CountUp: React.FC<{at: number; to: number; suffix: string}> = ({at, to, suffix}) => {
  const frame = useCurrentFrame();
  const v = Math.round(interpolate(frame, [at, at + 24], [0, to], clamp));
  return <div style={{fontFamily: ANTON, fontSize: 120, lineHeight: 1, color: '#c8102e'}}>{v.toLocaleString('en-IN')}{suffix}</div>;
};

/** The whole reel as one chat thread on a phone. */
export const PhoneReel: React.FC<{episode: any; starts: number[]; cur: number}> = ({episode, starts, cur}) => {
  const frame = useCurrentFrame();
  const mouth = React.useContext(MouthCtx);
  const msgs = episode.scenes.map((s: any, i: number) => (i <= cur ? phoneMessage(s, i === 0 ? -20 : starts[i] + 8, i) : null));
  const nextSide: 'l' | 'r' = episode.scenes[cur]?.who === 'intern' ? 'l' : 'r';
  const tilt = Math.sin(frame / 50) * 0.8;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 110, top: 240, width: 860, height: 1400, borderRadius: 90, background: '#0e0e10', padding: 22, boxShadow: '0 40px 90px #0009', transform: `rotate(${tilt}deg)`}}>
        <div style={{width: '100%', height: '100%', borderRadius: 70, overflow: 'hidden', background: WA.bg, display: 'flex', flexDirection: 'column'}}>
          <div style={{background: WA.bar, color: '#fff', padding: '30px 30px 22px', display: 'flex', alignItems: 'center', gap: 18}}>
            <div style={{width: 74, height: 74, borderRadius: 37, overflow: 'hidden', background: '#ffd8a8', position: 'relative'}}>
              <div style={{position: 'absolute', left: -14, top: -6}}>
                <Mascot pose="idle" width={104} seed="avatar" />
              </div>
            </div>
            <div>
              <div style={{fontFamily: FONT.sans, fontWeight: 800, fontSize: 36}}>Debug Bro</div>
              <div style={{fontFamily: FONT.sans, fontSize: 24, opacity: 0.85}}>{mouth(frame) > 0.05 ? 'recording audio…' : 'online'}</div>
            </div>
          </div>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 18, padding: '20px 26px 30px', overflow: 'hidden'}}>
            {msgs}
            <Typing side={nextSide} from={starts[cur]} to={starts[cur] + 8} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* =============================================================== COMIC */
const SFX: Record<string, string[]> = {problem: ['CRASH!', 'BOOM!', 'UH-OH!', 'KRAK!'], solution: ['AHA!', 'SORTED!', 'CLICK!'], comeback: ['WAIT...', 'TWIST!', 'WHAT?!'], neutral: ['HMM...', 'PSST!', 'SO...']};

const Panel: React.FC<{x: number; y: number; w: number; h: number; at: number; bg: string; children: React.ReactNode}> = ({x, y, w, h, at, bg, children}) => {
  const p = usePop(at, 13);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, border: '9px solid #111', background: bg, overflow: 'hidden', transform: `scale(${0.86 + p * 0.14}) rotate(${(1 - p) * -3}deg)`, opacity: Math.min(1, p * 1.4), boxShadow: '12px 12px 0 #111'}}>
      <div style={{position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#00000018 3px, transparent 3.5px)', backgroundSize: '18px 18px'}} />
      {children}
    </div>
  );
};

export const ComicScene: React.FC<{s: any; dur: number; i: number}> = ({s, dur, i}) => {
  const mouth = React.useContext(MouthCtx);
  const k = keyText(s);
  const mood = s.mood ?? 'neutral';
  const sfx = (SFX[mood] ?? SFX.neutral)[i % (SFX[mood] ?? SFX.neutral).length];
  const broPose = poseFor(s, i) as PoseName;
  const internPose: PoseName = mood === 'problem' ? 'shock' : mood === 'solution' ? 'thumbsup' : 'think';
  const speaking = s.type === 'dialog' ? s.who : 'bro';
  const balloon = s.type === 'dialog' ? s.line : plain(s.cap) || k.big;
  const third = Math.max(6, Math.round(dur * 0.18));
  return (
    <AbsoluteFill>
      {/* wide top panel: narration + the scene's key visual */}
      <Panel x={50} y={260} w={980} h={560} at={0} bg={mood === 'problem' ? '#ff6b6b' : mood === 'solution' ? '#7ee0a1' : '#7cc6ff'}>
        <div style={{position: 'absolute', top: 18, left: 18, background: '#fff6a8', border: '5px solid #111', padding: '8px 16px', fontFamily: ANTON, fontSize: 34, textTransform: 'uppercase', maxWidth: 640}}>
          {k.small ? plain(k.small) : `Part ${i + 1}`}
        </div>
        <div style={{position: 'absolute', left: 40, right: 40, top: 120, bottom: 30, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
          {k.num !== undefined ? (
            <div style={{fontFamily: ANTON, fontSize: 260, lineHeight: 0.9, color: '#fff', WebkitTextStroke: '8px #111'}}>
              {k.num}
              {k.suffix}
            </div>
          ) : k.list && s.type !== 'moment' ? (
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center'}}>
              {k.list.slice(0, 4).map((t, j) => (
                <div key={j} style={{background: '#fff', border: '5px solid #111', padding: '10px 20px', fontFamily: ANTON, fontSize: 46, textTransform: 'uppercase', transform: `rotate(${j % 2 ? 2 : -2}deg)`}}>
                  {t}
                </div>
              ))}
            </div>
          ) : (
            <div style={{fontFamily: ANTON, fontSize: String(k.big).length > 30 ? 78 : 100, lineHeight: 1, color: '#fff', WebkitTextStroke: '5px #111', textTransform: 'uppercase'}}>{plain(k.big)}</div>
          )}
        </div>
        <div style={{position: 'absolute', right: 26, bottom: 18, fontFamily: ANTON, fontSize: 92, color: '#ffe066', WebkitTextStroke: '5px #111', transform: 'rotate(-8deg)'}}>{sfx}</div>
      </Panel>
      {/* bottom-left: Debug Bro */}
      <Panel x={50} y={870} w={500} h={600} at={third} bg="#fff2c2">
        <div style={{position: 'absolute', left: 40, top: 150}}>
          <Mascot pose={speaking === 'bro' ? broPose : 'crossed'} mouth={speaking === 'bro' ? mouth : undefined} width={420} seed={`cb${i}`} />
        </div>
        {speaking === 'bro' ? <Balloon text={balloon} /> : null}
      </Panel>
      {/* bottom-right: the Intern */}
      <Panel x={590} y={870} w={440} h={600} at={third * 2} bg="#ffd6e7">
        <div style={{position: 'absolute', left: 10, top: 150}}>
          <Mascot variant="intern" pose={speaking === 'intern' ? 'explain' : internPose} mouth={speaking === 'intern' ? mouth : undefined} width={420} seed={`ci${i}`} />
        </div>
        {speaking === 'intern' ? <Balloon text={balloon} /> : <Balloon text={mood === 'problem' ? '?!' : mood === 'solution' ? 'Ohh!' : 'Hmm...'} small />}
      </Panel>
    </AbsoluteFill>
  );
};

const Balloon: React.FC<{text: string; small?: boolean}> = ({text, small}) => (
  <div style={{position: 'absolute', top: 16, left: 16, right: 16, background: '#fff', border: '5px solid #111', borderRadius: 40, padding: '14px 20px', fontFamily: FONT.sans, fontWeight: 800, fontSize: small ? 44 : String(text).length > 50 ? 30 : 36, lineHeight: 1.15, color: '#111', textAlign: small ? 'center' : 'left'}}>
    {text}
  </div>
);

/* =============================================================== KINETIC */
const BLOCKS = [
  ['#ff5a1f', '#111111', '#ffffff'],
  ['#111111', '#ffffff', '#ffd400'],
  ['#1f4dff', '#ffffff', '#ffd400'],
  ['#ffd400', '#111111', '#ff2e88'],
  ['#00b37e', '#111111', '#ffffff'],
  ['#ff2e88', '#ffffff', '#111111'],
];

export const KineticScene: React.FC<{s: any; dur: number; i: number}> = ({s, dur, i}) => {
  const frame = useCurrentFrame();
  const [bg, ink, hi] = BLOCKS[i % BLOCKS.length];
  const k = keyText(s);
  const accentTok = (String(s.cap ?? '').match(/\*([^*]+)\*/)?.[1] ?? '').toLowerCase();
  const text = s.type === 'dialog' ? s.line : plain(s.cap) || k.big;
  const words = String(text).split(/\s+/).filter(Boolean);
  const span = Math.max(8, dur * 0.7);
  const shown = i === 0 ? words.length : Math.min(words.length, Math.floor(interpolate(frame, [0, span], [1, words.length + 0.99], clamp)));
  const size = words.length > 6 ? 130 : words.length > 3 ? 170 : 220;
  const shake = frame < 4 ? (frame % 2 ? 10 : -10) : 0;
  return (
    <AbsoluteFill style={{background: bg}}>
      <div style={{position: 'absolute', top: 260, left: 60, right: 60, fontFamily: FONT.mono, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: ink, opacity: 0.6}}>
        {s.type === 'dialog' ? (s.who === 'intern' ? 'INTERN:' : 'DEBUG BRO:') : `${String(i + 1).padStart(2, '0')} / ${String(s.beat ?? '').toUpperCase()}`}
      </div>
      {k.num !== undefined ? (
        <div style={{position: 'absolute', top: 340, left: 40, right: 40, fontFamily: ANTON, fontSize: 520, lineHeight: 0.9, color: ink, transform: `translateX(${shake}px)`}}>
          {Math.round(interpolate(frame, [0, 18], [0, k.num], clamp))}
          <span style={{color: hi}}>{k.suffix}</span>
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: k.num !== undefined ? 880 : 330,
          left: 60,
          right: 60,
          fontFamily: ANTON,
          textTransform: 'uppercase',
          fontSize: k.num !== undefined ? 100 : size,
          lineHeight: 0.95,
          color: ink,
          transform: `translateX(${shake}px)`,
        }}
      >
        {words.slice(0, shown).map((w, j) => {
          const isAccent = accentTok && accentTok.split(/\s+/).includes(w.replace(/[*,.?!]/g, '').toLowerCase());
          const last = j === shown - 1;
          const sc = last ? interpolate(frame % 1000, [0, 3], [1.25, 1], clamp) : 1;
          return (
            <span key={j} style={{display: 'inline-block', marginRight: 24, color: isAccent ? hi : ink, transform: `scale(${sc})`}}>
              {w.replace(/\*/g, '')}
            </span>
          );
        })}
      </div>
      {k.list && s.type !== 'moment' ? (
        <div style={{position: 'absolute', left: 60, right: 60, bottom: 470, display: 'flex', flexWrap: 'wrap', gap: 14}}>
          {k.list.slice(0, 4).map((t, j) => (
            <span key={j} style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 38, color: bg, background: ink, padding: '8px 18px', opacity: frame > 8 + j * 5 ? 1 : 0}}>
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

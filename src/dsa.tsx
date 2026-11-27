// DSA-101: one narrator (Debug Bro), one question per reel, calm dark board with big readable shapes.
// Layout (1080x1920): header chip y 110, panel y 250-1180, spoken-words block (left) + Debug Bro (right) below.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {FONT} from './theme';
import {Mascot, MascotTrack, PoseName, poseFor} from './components/Mascot';
import {useFonts} from './components/chrome';
import {Tease} from './stage';
import {CUT_SFX, CUTS, Confetti, Cues, CutSweep, Cut, Slam, SlamSpec, SpeedLines, cutStyle} from './dsaFx';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const BG = '#0e1124';
const PANEL = '#171b36';
const LINE = '#2b3260';
const TXT = '#eef1f6';
const MUTED = '#8f98c4';
const AMBER = '#ffc857';
const GREEN = '#3ddc84';
const RED = '#ff5d6c';
const BLUE = '#6aa8ff';
export const DSA_PREROLL = 12;

const useSc = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {frame, fps};
};
const pop = (frame: number, at: number, fps: number, damping = 13) => Math.min(1.2, Math.max(0, spring({frame: frame - at, fps, config: {damping, stiffness: 190}})));
/** progress 0..1 of the scene between two fractions of its length */
const prog = (frame: number, dur: number, a: number, b: number) => interpolate(frame, [dur * a, dur * b], [0, 1], clamp);

/** the largest font size at which `text` fits in `width` px (average glyph ~`em` wide), capped at `max` */
const fit = (text: string, width: number, max: number, em = 0.58) => Math.min(max, Math.floor(width / (Math.max(1, text.length) * em)));
const longestWord = (text: string) => String(text).split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '');
/** cell size so that n cells and their gaps fit the 980 px panel */
const cellSize = (n: number, max: number) => Math.min(max, Math.floor((920 - (n - 1) * 18) / n));
const two = (n: number) => String(n).padStart(2, '0');

/* ---------------------------------------------------------------- small parts */
const Cell: React.FC<{v: number | string; i?: number; state?: 'idle' | 'hl' | 'ok' | 'bad' | 'dim'; size?: number; scale?: number}> = ({v, i, state = 'idle', size = 150, scale = 1}) => {
  const col = {idle: [PANEL, LINE, TXT], hl: ['#3a2f12', AMBER, AMBER], ok: ['#0f3a26', GREEN, GREEN], bad: ['#3d1420', RED, RED], dim: [PANEL, LINE, MUTED]}[state];
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: `scale(${scale})`}}>
      <div style={{width: size, height: size, borderRadius: 26, background: col[0], border: `6px solid ${col[1]}`, color: col[2], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, fontWeight: 800, fontSize: String(v).length > 2 ? size * 0.25 : size * 0.42, boxShadow: state === 'idle' || state === 'dim' ? 'none' : `0 0 40px ${col[1]}55`}}>{v}</div>
      {i !== undefined ? <div style={{fontFamily: FONT.mono, fontSize: 34, color: MUTED, fontWeight: 700}}>{i}</div> : null}
    </div>
  );
};

const Label: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color = MUTED, size = 34, style}) => (
  <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: size, letterSpacing: 3, color, textTransform: 'uppercase', ...style}}>{children}</div>
);

const Big: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({children, size = 90, color = TXT, style}) => (
  <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: size, lineHeight: 1.05, letterSpacing: -2, color, textAlign: 'center', ...style}}>{children}</div>
);

/** the data structure beside the action (notebook, stack, set...): a title and its rows */
const Store: React.FC<{title: string; rows: string[]; fresh?: number; hit?: number; w?: number}> = ({title, rows, fresh = -1, hit = -1, w = 380}) => (
  <div style={{width: w, background: '#fff7e0', borderRadius: 22, padding: '24px 28px', boxShadow: '0 20px 40px #0006', border: `5px solid ${AMBER}`, minHeight: 250}}>
    <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: '#7a5b12', borderBottom: '3px dashed #c9a24a', paddingBottom: 10}}>{title.toUpperCase()}</div>
    {rows.length === 0 ? <div style={{fontFamily: FONT.sans, fontSize: 40, color: '#b8a574', marginTop: 24, fontWeight: 700}}>(empty)</div> : null}
    {rows.map((r, j) => (
      <div key={j} style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: fit(r, w - 90, 44, 0.62), color: j === hit ? '#0a7a3d' : '#2a2110', marginTop: 14, background: j === hit ? '#b9f5d2' : j === fresh ? '#ffe9a6' : 'transparent', borderRadius: 12, padding: '4px 10px', whiteSpace: 'nowrap'}}>
        {r}
      </div>
    ))}
  </div>
);

const Face: React.FC<{mood: 'smirk' | 'smile' | 'flat'; size?: number}> = ({mood, size = 300}) => (
  <svg width={size} height={size} viewBox="0 0 200 200">
    <circle cx={100} cy={100} r={90} fill="#f2c9a0" stroke="#1b1412" strokeWidth={6} />
    <rect x={55} y={62} width={36} height={8} rx={4} fill="#1b1412" transform={mood === 'smirk' ? 'rotate(8 73 66)' : undefined} />
    <rect x={110} y={62} width={36} height={8} rx={4} fill="#1b1412" transform={mood === 'smirk' ? 'rotate(-8 128 66)' : undefined} />
    <circle cx={73} cy={92} r={8} fill="#1b1412" />
    <circle cx={127} cy={92} r={8} fill="#1b1412" />
    {mood === 'smirk' ? <path d="M 62 140 Q 110 158 146 128" fill="none" stroke="#1b1412" strokeWidth={7} strokeLinecap="round" /> : null}
    {mood === 'smile' ? <path d="M 56 130 Q 100 176 144 130" fill="none" stroke="#1b1412" strokeWidth={7} strokeLinecap="round" /> : null}
    {mood === 'flat' ? <path d="M 66 142 L 134 142" fill="none" stroke="#1b1412" strokeWidth={7} strokeLinecap="round" /> : null}
  </svg>
);

const Bubble: React.FC<{text: string; color?: string; size?: number}> = ({text, color = '#fff6df', size = 54}) => (
  <div style={{background: color, color: '#1b1412', borderRadius: 36, padding: '22px 34px', fontFamily: FONT.sans, fontWeight: 800, fontSize: size, letterSpacing: -1}}>{text}</div>
);

/* ---------------------------------------------------------------- scene kinds, each draws into the 980x930 panel */
type K = {s: any; dur: number; ep: any};

const Title: React.FC<K> = ({s, ep}) => {
  const {frame, fps} = useSc();
  const d = s.data;
  const meta = ep.dsa;
  // short names stay on one line; long ones wrap by word
  const oneLine = d.title.length <= 10;
  const size = oneLine ? fit(d.title, 920, 185, 0.72) : fit(longestWord(d.title), 900, 150, 0.7);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 26}}>
      <Label color={AMBER} size={40}>DSA-101 · Question {two(meta.n)}</Label>
      <Big size={size} style={{padding: oneLine ? 0 : '0 30px', whiteSpace: oneLine ? 'nowrap' : undefined, textTransform: 'uppercase', transform: `scale(${0.9 + pop(frame + DSA_PREROLL, 0, fps) * 0.1})`}}>{d.title}</Big>
      <div style={{display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px'}}>
        {[meta.difficulty, meta.category].map((t, i) => (
          <div key={i} style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 32, color: i === 0 ? GREEN : TXT, border: `4px solid ${i === 0 ? GREEN : LINE}`, borderRadius: 40, padding: '8px 22px'}}>{t}</div>
        ))}
      </div>
      {meta.companies?.length ? <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, color: MUTED}}>Reported by candidates: {meta.companies.join(', ')}</div> : null}
      <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 10}}>
        <Face mood={d.face} size={220} />
        <Bubble text={d.bubble} size={fit(d.bubble, 560, 54)} />
      </div>
    </AbsoluteFill>
  );
};

const Problem: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const d = s.data;
  const answer = prog(frame, dur, 0.62, 0.8);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40, padding: '0 30px'}}>
      <Label color={AMBER} style={{textAlign: 'center'}}>{d.heading}</Label>
      <div style={{display: 'flex', gap: 18}}>
        {d.cells.map((v: any, i: number) => (
          <Cell key={i} v={v} i={i} size={cellSize(d.cells.length, 170)} state={answer > 0.1 && d.highlight.includes(i) ? 'ok' : 'idle'} />
        ))}
      </div>
      {d.target ? (
        <div style={{display: 'flex', alignItems: 'center', gap: 20, opacity: prog(frame, dur, 0.12, 0.25)}}>
          <Label size={44}>{d.targetLabel ?? 'target'}</Label>
          <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 120, color: AMBER}}>{d.target}</div>
        </div>
      ) : null}
      <div style={{opacity: answer, transform: `translateY(${(1 - answer) * 20}px)`, textAlign: 'center'}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: fit(d.working, 880, 70, 0.61), color: GREEN}}>{d.working}</div>
        <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: fit(d.answer, 880, 56, 0.61), color: TXT, marginTop: 8}}>{d.answer}</div>
      </div>
    </AbsoluteFill>
  );
};

const Brute: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const d = s.data;
  const n = d.cells.length;
  const picks: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (d.mode === 'scan') picks.push([i]);
    else for (let j = i + 1; j < n; j++) picks.push([i, j]);
  }
  const pick = picks[Math.floor(frame / 4) % picks.length];
  const ease = Math.pow(prog(frame, dur, 0.1, 0.62), 2.2);
  const count = Math.round(ease * d.counterTo).toLocaleString('en-IN');
  const clock = prog(frame, dur, 0.55, 0.8);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 34, padding: '0 20px'}}>
      <SpeedLines at={Math.round(dur * 0.5)} color="#ff5d6c" />
      <Label color={RED}>{d.heading}</Label>
      <div style={{display: 'flex', gap: 14}}>
        {d.cells.map((v: any, i: number) => (
          <Cell key={i} v={v} size={cellSize(n, 130)} state={pick.includes(i) ? 'bad' : 'dim'} />
        ))}
      </div>
      <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, color: MUTED}}>
        checking ({pick.join(', ')}) ...
      </div>
      <div style={{textAlign: 'center'}}>
        <Label>{d.counterLabel}</Label>
        <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 76, color: RED}}>{count}</div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 24, opacity: clock}}>
        <svg width={150} height={150} viewBox="0 0 100 100">
          <circle cx={50} cy={50} r={44} fill={PANEL} stroke={AMBER} strokeWidth={6} />
          <line x1={50} y1={50} x2={50} y2={18} stroke={TXT} strokeWidth={5} strokeLinecap="round" transform={`rotate(${frame * 14} 50 50)`} />
          <line x1={50} y1={50} x2={50} y2={30} stroke={AMBER} strokeWidth={6} strokeLinecap="round" transform={`rotate(${frame * 1.2} 50 50)`} />
        </svg>
        <Big size={fit(d.result, 680, 96)} color={AMBER}>{d.result}</Big>
      </div>
    </AbsoluteFill>
  );
};

const Pause: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const t = frame / dur;
  const n = t < 0.65 ? 3 : t < 0.78 ? 2 : 1;
  const ring = 1 - ((frame % Math.max(1, dur / 4)) / Math.max(1, dur / 4));
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30}}>
      <Big size={150} color={AMBER}>PAUSE</Big>
      <Big size={64}>Try it yourself</Big>
      <svg width={360} height={360} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={50} fill="none" stroke={LINE} strokeWidth={9} />
        <circle cx={60} cy={60} r={50} fill="none" stroke={AMBER} strokeWidth={9} strokeLinecap="round" strokeDasharray={314} strokeDashoffset={314 * (1 - ring)} transform="rotate(-90 60 60)" />
        <text x={60} y={80} textAnchor="middle" fontFamily={FONT.mono} fontWeight={900} fontSize={60} fill={TXT}>{n}</text>
      </svg>
      <div style={{opacity: prog(frame, dur, 0.62, 0.78)}}>
        <div style={{background: '#fff7e0', color: '#2a2110', borderRadius: 22, padding: '18px 36px', fontFamily: FONT.sans, fontWeight: 900, fontSize: fit(s.data.hint, 820, 56), border: `5px solid ${AMBER}`}}>{s.data.hint}</div>
      </div>
    </AbsoluteFill>
  );
};

const Gate: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const d = s.data;
  const open = prog(frame, dur, 0.05, 0.2);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 50, left: 0, right: 0, textAlign: 'center'}}><Label color={AMBER}>{d.heading}</Label></div>
      {/* arch */}
      <svg width={980} height={930} viewBox="0 0 980 930" style={{position: 'absolute', left: 0, top: 0}}>
        <path d="M 330 700 L 330 330 Q 330 190 490 190 Q 650 190 650 330 L 650 700" fill="none" stroke={AMBER} strokeWidth={14} strokeLinecap="round" />
        <text x={490} y={282} textAnchor="middle" fontFamily={FONT.mono} fontWeight={900} fontSize={34} fill={AMBER} letterSpacing={4}>{d.sign.toUpperCase()}</text>
        <rect x={20} y={700} width={940} height={10} rx={5} fill={LINE} />
      </svg>
      {d.items.map((g: any, i: number) => {
        const startF = dur * (0.15 + i * (0.68 / d.items.length));
        const left = interpolate(frame, [startF, startF + 40], [-130, 345 + i * Math.min(78, 300 / d.items.length)], clamp);
        return (
          <div key={i} style={{position: 'absolute', left, top: 570, opacity: open}}>
            <div style={{width: 80, height: 80, borderRadius: 40, background: i === 0 ? AMBER : BLUE, color: '#1b1412', fontFamily: FONT.mono, fontWeight: 900, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '5px solid #1b1412'}}>{g}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', right: 20, top: 360, opacity: prog(frame, dur, 0.55, 0.7)}}>
        <Store title={d.storeTitle} rows={[]} w={300} />
      </div>
    </AbsoluteFill>
  );
};

const Steps: React.FC<K> = ({s, dur}) => {
  const {frame, fps} = useSc();
  const d = s.data;
  const colors = [BLUE, AMBER, GREEN, '#ff7ad9'];
  const yn = prog(frame, dur, 0.74, 0.88);
  const answer = (text: string, bg: string, col: string) => (
    <div style={{flex: 1, background: bg, border: `5px solid ${col}`, borderRadius: 26, padding: 24, fontFamily: FONT.sans, fontWeight: 900, fontSize: fit(text, 370, 54), color: col, textAlign: 'center'}}>{text}</div>
  );
  return (
    <AbsoluteFill style={{padding: '30px 30px', gap: 26, justifyContent: 'center'}}>
      {d.steps.map((t: string, i: number) => {
        const p = pop(frame, dur * (0.04 + i * (0.68 / d.steps.length)), fps);
        const c = colors[i % colors.length];
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, background: PANEL, border: `5px solid ${c}`, borderRadius: 30, padding: '26px 34px', transform: `scale(${0.9 + p * 0.1})`, opacity: Math.min(1, p * 1.5)}}>
            <div style={{width: 96, height: 96, flexShrink: 0, borderRadius: 48, background: c, color: '#1b1412', fontFamily: FONT.mono, fontWeight: 900, fontSize: 60, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>
            <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: fit(t, 690, 62), color: TXT, letterSpacing: -1.5}}>{t}</div>
          </div>
        );
      })}
      {d.yes && d.no ? (
        <div style={{display: 'flex', gap: 24, opacity: yn}}>
          {answer(d.yes, '#0f3a26', GREEN)}
          {answer(d.no, '#3a2f12', AMBER)}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Code: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const d = s.data;
  const lines: string[] = d.lines;
  const idx = Math.min(lines.length - 1, Math.floor(prog(frame, dur, 0.05, 0.97) * lines.length));
  const shown = Math.min(lines.length, Math.floor(prog(frame, dur, 0, 0.3) * (lines.length + 1)));
  const longest = Math.max(...lines.map((l) => l.length));
  // fit both ways, with a margin on the right edge
  const size = Math.min(43, Math.floor(820 / (longest * 0.6)), Math.floor(600 / (lines.length * 1.5)));
  return (
    <AbsoluteFill style={{padding: 20, justifyContent: 'center', gap: 28}}>
      <div style={{background: '#0a0d1d', border: `5px solid ${LINE}`, borderRadius: 30, padding: '28px 18px', boxShadow: '0 24px 50px #0008'}}>
        <div style={{display: 'flex', gap: 10, marginLeft: 20, marginBottom: 14}}>
          {[RED, AMBER, GREEN].map((c) => <div key={c} style={{width: 22, height: 22, borderRadius: 11, background: c}} />)}
          <Label size={26} style={{marginLeft: 16, textTransform: 'none'}}>{d.file}</Label>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: size, lineHeight: 1.5, whiteSpace: 'pre', fontVariantLigatures: 'none', padding: '0 18px', borderRadius: 12, color: i === idx ? '#fff' : '#b9c2f0', background: i === idx ? '#2a3573' : 'transparent', borderLeft: `8px solid ${i === idx ? AMBER : 'transparent'}`, opacity: i < shown ? 1 : 0}}>{l}</div>
        ))}
      </div>
      <div style={{background: AMBER, color: '#1b1412', borderRadius: 24, padding: '20px 30px', fontFamily: FONT.sans, fontWeight: 900, fontSize: fit(d.meanings[idx], 860, 52, 0.55), textAlign: 'center', letterSpacing: -1}}>{d.meanings[idx]}</div>
    </AbsoluteFill>
  );
};

const Run: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const d = s.data;
  const before: string[] = d.store;
  const changeP = prog(frame, dur, 0.5, 0.65);
  const hitP = prog(frame, dur, 0.45, 0.6);
  const endP = prog(frame, dur, 0.72, 0.88);
  const changed = changeP > 0.2;
  const rows = d.push && changed ? [...before, d.push] : d.pop && endP > 0.2 ? before.slice(0, -1) : before;
  const [pre, post] = d.panelAccent ? [d.panelText.slice(0, d.panelText.lastIndexOf(d.panelAccent)), d.panelText.slice(d.panelText.lastIndexOf(d.panelAccent) + d.panelAccent.length)] : [d.panelText, ''];
  return (
    <AbsoluteFill style={{padding: 10, alignItems: 'center', justifyContent: 'center', gap: 30}}>
      {d.found ? <Confetti at={Math.round(dur * 0.74)} seed="run" /> : null}
      <div style={{display: 'flex', gap: 18}}>
        {d.cells.map((v: any, i: number) => (
          <div key={i} style={{position: 'relative'}}>
            <Cell v={v} i={i} size={cellSize(d.cells.length, 150)} state={i === d.i ? (d.found && endP > 0.1 ? 'ok' : 'hl') : d.matched?.includes(i) && hitP > 0.3 ? 'ok' : i < d.i ? 'dim' : 'idle'} />
            {i === d.i ? <div style={{position: 'absolute', top: -70 + Math.sin(frame / 4) * 8, left: -20, right: -20, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 900, fontSize: 46, color: AMBER, whiteSpace: 'nowrap'}}>▼ me</div> : null}
          </div>
        ))}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 30, width: '100%', justifyContent: 'center'}}>
        <div style={{width: 480, background: PANEL, border: `5px solid ${AMBER}`, borderRadius: 26, padding: '22px 28px', opacity: prog(frame, dur, 0.15, 0.3)}}>
          <Label size={28}>{d.panelLabel}</Label>
          <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: fit(d.panelText, 410, 60, 0.61), color: TXT, marginTop: 6, whiteSpace: 'nowrap'}}>
            {pre}
            {d.panelAccent ? <span style={{color: AMBER}}>{d.panelAccent}</span> : null}
            {post}
          </div>
        </div>
        <Store title={d.storeTitle} rows={rows} fresh={d.push && changed ? rows.length - 1 : -1} hit={d.hit !== undefined && hitP > 0.3 ? d.hit : -1} w={360} />
      </div>
      <div style={{height: 100, opacity: d.found ? endP : changeP, fontFamily: d.found ? FONT.mono : FONT.sans, fontWeight: 900, fontSize: fit(d.result, 900, d.found ? 80 : 56), color: d.found ? GREEN : AMBER}}>{d.result}</div>
    </AbsoluteFill>
  );
};

const Trap: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const d = s.data;
  const when = [prog(frame, dur, 0.1, 0.4), prog(frame, dur, 0.5, 0.8)];
  return (
    <AbsoluteFill style={{padding: 10, gap: 26, justifyContent: 'center'}}>
      <Label color={AMBER} style={{textAlign: 'center'}}>{d.heading}</Label>
      {d.rows.map((r: any, k: number) => {
        const col = r.bad ? RED : GREEN;
        const p = Math.min(1, when[k] * 2);
        return (
          <div key={k} style={{background: PANEL, border: `6px solid ${col}`, borderRadius: 30, padding: '24px 30px', opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>
            <Label color={col} size={34}>{r.title}</Label>
            <div style={{display: 'flex', gap: 14, alignItems: 'center', marginTop: 14}}>
              {r.cells.map((v: any, i: number) => (
                <Cell key={i} v={v} i={i} size={r.cells.length > 2 ? 90 : 110} state={r.bad ? (i === 0 ? 'bad' : 'dim') : 'ok'} />
              ))}
              <div style={{flex: 1, fontFamily: FONT.sans, fontWeight: 800, fontSize: r.cells.length > 2 ? 34 : 40, color: TXT, lineHeight: 1.2, marginLeft: 18}}>
                {r.steps.map((t: string, i: number) => <div key={i}>{t}</div>)}
              </div>
            </div>
            <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 64, color: col, marginTop: 12}}>{r.result}  {r.bad ? '✗' : '✓'}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Aha: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const d = s.data;
  const a = prog(frame, dur, 0.05, 0.35);
  const b = prog(frame, dur, 0.4, 0.62);
  const c = prog(frame, dur, 0.7, 0.9);
  const row = (p: number, col: string, x: any, bar: number) => (
    <div style={{opacity: p}}>
      <Label color={col}>{x.label}</Label>
      <div style={{height: 70, background: col, borderRadius: 16, width: `${Math.max(1.5, p * bar * 100)}%`, marginTop: 10}} />
      <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: fit(x.value, 900, 52, 0.61), color: col, marginTop: 10}}>{x.value}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{padding: 20, justifyContent: 'center', gap: 36}}>
      <SpeedLines at={Math.round(dur * 0.64)} color="#3ddc84" />
      {row(a, RED, d.slow, 1)}
      {row(b, GREEN, d.fast, d.fast.bar)}
      <div style={{opacity: c, textAlign: 'center'}}>
        <Big size={fit(d.headline, 900, 120)} color={AMBER}>{d.headline}</Big>
        <Label style={{marginTop: 8}}>{d.sub}</Label>
      </div>
    </AbsoluteFill>
  );
};

const Smile: React.FC<K> = ({s, dur}) => {
  const {frame, fps} = useSc();
  const good = frame > dur * 0.4;
  const p = pop(frame, dur * 0.42, fps, 10);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30}}>
      <div style={{transform: `scale(${good ? 0.9 + p * 0.1 : 1})`}}>
        <Face mood={good ? 'smile' : 'smirk'} size={400} />
      </div>
      <div style={{opacity: prog(frame, dur, 0.5, 0.65)}}>
        <Bubble text={s.data.bubble} color="#b9f5d2" size={fit(s.data.bubble, 800, 80)} />
      </div>
      <Label color={GREEN} size={40} style={{opacity: prog(frame, dur, 0.7, 0.85)}}>{s.data.label}</Label>
    </AbsoluteFill>
  );
};

const Name: React.FC<K> = ({s, dur}) => {
  const {frame, fps} = useSc();
  const d = s.data;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 34}}>
      <Big size={fit(d.name, 900, 150, 0.68)} color={AMBER} style={{textTransform: 'uppercase', transform: `scale(${0.85 + pop(frame, 0, fps) * 0.15})`}}>{d.name}</Big>
      <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
        {d.pairs.map(([k, v]: [string, string], i: number) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, opacity: prog(frame, dur, 0.15 + i * 0.1, 0.3 + i * 0.1)}}>
            <Cell v={k} size={110} state="hl" />
            <div style={{fontFamily: FONT.mono, fontSize: 70, color: AMBER, fontWeight: 900}}>→</div>
            <Cell v={v} size={110} state="ok" />
          </div>
        ))}
      </div>
      <div style={{opacity: prog(frame, dur, 0.62, 0.8), background: AMBER, color: '#1b1412', borderRadius: 26, padding: '18px 40px', fontFamily: FONT.sans, fontWeight: 900, fontSize: fit(d.footer, 820, 64)}}>{d.footer}</div>
    </AbsoluteFill>
  );
};

const Notes: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const d = s.data;
  const colors = [GREEN, AMBER, BLUE, RED, '#ff7ad9'];
  return (
    <AbsoluteFill style={{padding: 10, justifyContent: 'center'}}>
      <div style={{background: '#fff7e0', borderRadius: 30, padding: '30px 36px', border: `6px solid ${AMBER}`, boxShadow: '0 24px 50px #0008'}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: fit(d.heading, 850, 40, 0.72), letterSpacing: 4, color: '#7a5b12', borderBottom: '4px dashed #c9a24a', paddingBottom: 12, textTransform: 'uppercase'}}>{d.heading}</div>
        {d.rows.map(([k, v]: [string, string], i: number) => (
          <div key={i} style={{display: 'flex', gap: 24, alignItems: 'baseline', marginTop: 24, opacity: prog(frame, dur, 0.08 + i * (0.64 / d.rows.length), 0.2 + i * (0.64 / d.rows.length))}}>
            <div style={{width: 190, fontFamily: FONT.mono, fontWeight: 900, fontSize: 36, color: '#7a5b12'}}>{k}</div>
            <div style={{flex: 1, fontFamily: FONT.sans, fontWeight: 900, fontSize: v.length > 12 ? 48 : 72, color: '#1b1412', lineHeight: 1.1, letterSpacing: -1}}>
              <span style={{borderBottom: `8px solid ${colors[i % colors.length]}`}}>{v}</span>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Quiz: React.FC<K> = ({s, dur}) => {
  const {frame, fps} = useSc();
  const d = s.data;
  const letters = d.options.map((_: string, i: number) => String.fromCharCode(65 + i));
  return (
    <AbsoluteFill style={{padding: 10, justifyContent: 'center', gap: 28}}>
      <Label color={AMBER} style={{textAlign: 'center'}}>Quick quiz</Label>
      <Big size={72}>{d.question}</Big>
      {d.options.map((o: string, i: number) => (
        <div key={i} style={{transform: `scale(${0.9 + pop(frame, dur * (0.25 + i * 0.15), fps) * 0.1})`, opacity: Math.min(1, pop(frame, dur * (0.25 + i * 0.15), fps) * 1.5), background: PANEL, border: `6px solid ${[BLUE, AMBER, GREEN][i]}`, borderRadius: 30, padding: '30px 40px', fontFamily: FONT.sans, fontWeight: 900, fontSize: fit(`${letters[i]}: ${o}`, 860, 70), color: TXT, textAlign: 'center'}}>{letters[i]}: {o}</div>
      ))}
      <Label style={{textAlign: 'center', opacity: prog(frame, dur, 0.7, 0.85)}}>Comment {letters.join(' or ')}</Label>
    </AbsoluteFill>
  );
};

const Close: React.FC<K> = ({s, dur, ep}) => {
  const {frame, fps} = useSc();
  const d = s.data;
  const btn = (t: string, c: string, at: number, icon: React.ReactNode) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 26, background: PANEL, border: `6px solid ${c}`, borderRadius: 30, padding: '20px 34px', transform: `scale(${0.88 + pop(frame, dur * at, fps) * 0.12})`, opacity: Math.min(1, pop(frame, dur * at, fps) * 1.5)}}>
      <svg width={80} height={80} viewBox="0 0 24 24" fill={c} style={{flexShrink: 0}}>{icon}</svg>
      <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: fit(t, 740, 64), color: TXT}}>{t}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{padding: 10, justifyContent: 'center', gap: 24}}>
      <Confetti at={Math.round(dur * 0.62)} seed="close" />
      {btn(d.save, AMBER, 0.05, <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z" />)}
      {btn(d.send, BLUE, 0.22, <path d="M2 21l21-9L2 3v7l15 2-15 2z" />)}
      {btn(d.like, RED, 0.4, <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />)}
      {ep.leadMagnet ? (
        <div style={{opacity: prog(frame, dur, 0.6, 0.78), background: GREEN, color: '#1b1412', borderRadius: 28, padding: '20px 30px', textAlign: 'center', fontFamily: FONT.sans, fontWeight: 900, fontSize: 48}}>Comment {ep.leadMagnet.keyword} → notes PDF</div>
      ) : null}
      <div style={{opacity: prog(frame, dur, 0.8, 0.95), textAlign: 'center'}}>
        <Label>Next · Question {two(ep.dsa.n + 1)}</Label>
        <Big size={fit(d.next, 900, 64)} color={AMBER}>{d.next}</Big>
      </div>
    </AbsoluteFill>
  );
};

const KINDS: Record<string, React.FC<K>> = {title: Title, problem: Problem, brute: Brute, pause: Pause, gate: Gate, steps: Steps, code: Code, run: Run, trap: Trap, aha: Aha, smile: Smile, name: Name, notes: Notes, quiz: Quiz, close: Close};

/* ---------------------------------------------------------------- the reel */
const PANEL_BOX = {x: 50, y: 250, w: 980, h: 930};

const DEFAULT_CUT: Record<string, Cut> = {problem: 'slideL', brute: 'zoom', pause: 'drop', gate: 'slideR', steps: 'slideUp', code: 'flip', run: 'slideL', trap: 'flip', aha: 'drop', smile: 'zoom', name: 'slideR', notes: 'wipe', quiz: 'slideUp', close: 'zoom'};
const SWEEP = [AMBER, BLUE, GREEN, '#ff7ad9'];

const Scene: React.FC<{s: any; dur: number; first: boolean; i: number; ep: any}> = ({s, dur, first, i, ep}) => {
  const frame = useCurrentFrame();
  const Comp = KINDS[s.kind];
  const cut: Cut = (s.data?.cut as Cut) ?? DEFAULT_CUT[s.kind] ?? 'punch';
  const push = interpolate(frame, [0, dur], [1, 1.035], clamp);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: PANEL_BOX.x, top: PANEL_BOX.y, width: PANEL_BOX.w, height: PANEL_BOX.h, ...(first ? {} : cutStyle(cut, frame))}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 40, background: 'radial-gradient(ellipse at 50% 30%, #1d2247, #10132b 80%)', border: `5px solid ${LINE}`, overflow: 'hidden', transform: `scale(${push})`, boxShadow: '0 30px 60px #0007'}}>
          <AbsoluteFill>
            <Comp s={s} dur={dur} ep={ep} />
          </AbsoluteFill>
        </div>
      </div>
      {first ? null : <CutSweep color={SWEEP[i % SWEEP.length]} dir={i % 2 ? 1 : -1} />}
      {s.tease ? <Tease text={s.tease} top={160} /> : null}
      {first ? null : <Sequence from={0} layout="none"><Audio src={staticFile(`sfx/dsa/${CUT_SFX[cut] ?? 'whoosh'}.wav`)} volume={0.55} /></Sequence>}
      <Cues kind={s.kind} dur={dur} />
    </AbsoluteFill>
  );
};

/** the words being spoken: a window of the last ~9 words, current word highlighted */
const SpokenWords: React.FC<{words: any[]; ms: number}> = ({words, ms}) => {
  let cur = -1;
  for (let i = 0; i < words.length; i++) if (words[i].startMs <= ms) cur = i;
  if (cur < 0) cur = 0;
  let from = cur;
  while (from > 0 && !/[.?!:]$/.test(words[from - 1]?.text ?? '')) from--;
  let to = cur;
  while (to < words.length - 1 && !/[.?!:]$/.test(words[to]?.text ?? '')) to++;
  const win = words.slice(from, to + 1);
  return (
    <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 58, lineHeight: 1.12, letterSpacing: -1.5, color: '#9aa3d6'}}>
      {win.map((w, i) => {
        const isCur = from + i === cur;
        return (
          <span key={i} style={isCur ? {color: '#1b1412', background: AMBER, borderRadius: 10, padding: '0 8px', display: 'inline-block', transform: 'scale(1.1) rotate(-2deg)'} : from + i < cur ? {color: TXT} : undefined}>
            {w.text}{' '}
          </span>
        );
      })}
    </div>
  );
};

export const DsaReel: React.FC<{episode: any; timings: any; hideCaptions?: boolean}> = ({episode, timings, hideCaptions}) => {
  useFonts();
  const [fontH] = React.useState(() => delayRender('anton font'));
  React.useEffect(() => {
    const ff = new FontFace('Anton', `url(${staticFile('fonts/anton.woff2')})`);
    ff.load().then((x) => document.fonts.add(x)).catch(() => {}).finally(() => continueRender(fontH));
  }, [fontH]);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  const starts: number[] = timings.scenes.map((s: any) => f(s.startMs));
  const durs: number[] = timings.scenes.map((s: any, i: number) => (i < timings.scenes.length - 1 ? starts[i + 1] - starts[i] : f(s.durMs) + f(700)));
  let cur = 0;
  starts.forEach((s, i) => {
    if (frame >= s) cur = i;
  });
  const track: MascotTrack = React.useMemo(() => {
    const out: MascotTrack = [];
    let prev: PoseName | undefined;
    episode.scenes.forEach((s: any, i: number) => {
      prev = poseFor(s, i, prev);
      out.push({at: starts[i], pose: prev});
    });
    return out;
  }, [episode, starts.join(',')]);
  const audioData = useAudioData(staticFile(timings.audio ?? 'sfx/tick.wav'));
  const mouth = (fr: number) => {
    if (!audioData || !timings.audio) return 0;
    const v = visualizeAudio({fps, frame: fr, audioData, numberOfSamples: 32, optimizeFor: 'speed'});
    return Math.min(1, Math.max(0, (v.slice(0, 12).reduce((a: number, b: number) => a + b, 0) / 12 - 0.015) * 9));
  };
  const sceneWords = timings.words.filter((w: any) => w.scene === cur);
  const ms = (frame / fps) * 1000;
  const total = episode.scenes.length;
  const d = episode.dsa;
  return (
    <AbsoluteFill style={{background: BG, fontFamily: FONT.sans}}>
      <AbsoluteFill style={{backgroundImage: `radial-gradient(${LINE} 3px, transparent 3.5px)`, backgroundSize: '60px 60px', opacity: 0.5}} />
      {timings.audio ? <Audio src={staticFile(timings.audio)} /> : null}
      <Audio src={staticFile('sfx/dsa/bed.mp3')} volume={(fr) => interpolate(fr, [0, 25], [0, 0.17], clamp)} loop />
      {/* header */}
      <div style={{position: 'absolute', top: 100, left: 50, right: 50, display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{background: AMBER, color: '#1b1412', fontFamily: FONT.mono, fontWeight: 900, fontSize: 32, letterSpacing: 3, padding: '10px 20px', borderRadius: 12}}>DSA-101 · {two(d.n)}</div>
        <div style={{flex: 1, display: 'flex', gap: 5}}>
          {Array.from({length: total}, (_, i) => (
            <div key={i} style={{flex: 1, height: 10, borderRadius: 5, background: i < cur ? AMBER : i === cur ? '#fff' : LINE}} />
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', top: 175, left: 50, right: 50, fontFamily: FONT.mono, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: MUTED}}>
        @debug_bro · {d.category.toUpperCase()}
      </div>
      {episode.scenes.map((s: any, i: number) => {
        const pre = i === 0 ? DSA_PREROLL : 0;
        return (
          <Sequence key={i} from={starts[i] - pre} durationInFrames={Math.max(1, durs[i] + pre + (i < total - 1 ? 12 : 0))} layout="none">
            <Scene s={s} dur={durs[i] + pre} first={i === 0} i={i} ep={episode} />
          </Sequence>
        );
      })}
      {/* spoken words (left) and Debug Bro (right) */}
      {hideCaptions ? null : (
        <div style={{position: 'absolute', left: 50, top: 1250, width: 520, height: 560}}>
          <SpokenWords words={sceneWords} ms={ms} />
        </div>
      )}
      <div style={{position: 'absolute', left: 585, top: 1285 + interpolate(frame - starts[cur], [0, 4, 10], [0, -26, 0], clamp), filter: 'drop-shadow(0 16px 24px #0008)'}}>
        <Mascot variant="bro" flip track={track} mouth={mouth} width={450} seed="dsa-bro" />
      </div>
      {/* full-frame slam typography on top of everything */}
      {episode.scenes.map((s: any, i: number) => {
        const slams: SlamSpec[] = s.data?.slams ?? [];
        if (!slams.length) return null;
        const pre = i === 0 ? DSA_PREROLL : 0;
        return (
          <Sequence key={`sl${i}`} from={starts[i] - pre} durationInFrames={Math.max(1, durs[i] + pre)} layout="none">
            {slams.map((sp, k) => (
              <React.Fragment key={k}>
                <Slam spec={sp} dur={durs[i] + pre} pre={pre} />
                <Cues kind="" dur={durs[i] + pre} extra={[[Math.max(0, (Math.round((durs[i] + pre) * sp.at) - pre) / (durs[i] + pre)), sp.sfx ?? 'impact', 0.85]]} />
              </React.Fragment>
            ))}
          </Sequence>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1860, height: 60, background: '#07091a'}} />
    </AbsoluteFill>
  );
};

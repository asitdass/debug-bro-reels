// DSA-101: one narrator (Debug Bro), one question per reel, calm dark board with big readable shapes.
// Layout (1080x1920): header chip y 110, panel y 250-1180, spoken-words block (left) + Debug Bro (right) below.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {FONT} from './theme';
import {Mascot, MascotTrack, PoseName, poseFor} from './components/Mascot';
import {useFonts} from './components/chrome';
import {Tease} from './stage';

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

/** the notebook: key -> position rows */
const Notebook: React.FC<{rows: [number, number][]; fresh?: number; hit?: number; w?: number}> = ({rows, fresh = -1, hit = -1, w = 380}) => (
  <div style={{width: w, background: '#fff7e0', borderRadius: 22, padding: '24px 28px', boxShadow: '0 20px 40px #0006', border: `5px solid ${AMBER}`, minHeight: 250}}>
    <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: '#7a5b12', borderBottom: '3px dashed #c9a24a', paddingBottom: 10}}>NOTEBOOK</div>
    {rows.length === 0 ? <div style={{fontFamily: FONT.sans, fontSize: 40, color: '#b8a574', marginTop: 24, fontWeight: 700}}>(empty)</div> : null}
    {rows.map(([k, p], j) => (
      <div key={j} style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 44, color: j === hit ? '#0a7a3d' : '#2a2110', marginTop: 14, background: j === hit ? '#b9f5d2' : j === fresh ? '#ffe9a6' : 'transparent', borderRadius: 12, padding: '4px 10px'}}>
        {k} <span style={{color: '#b0893a'}}>→</span> pos {p}
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
type K = {s: any; dur: number};

const Title: React.FC<K> = ({s, dur}) => {
  const {frame, fps} = useSc();
  const smile = s.data?.mood === 'smirk';
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 26}}>
      <Label color={AMBER} size={40}>DSA-101 · Question 01</Label>
      <Big size={190} style={{transform: `scale(${0.9 + pop(frame + DSA_PREROLL, 0, fps) * 0.1})`}}>TWO SUM</Big>
      <div style={{display: 'flex', gap: 16}}>
        {['LeetCode #1', 'Easy', 'Arrays & Hashing'].map((t, i) => (
          <div key={i} style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 32, color: i === 1 ? GREEN : TXT, border: `4px solid ${i === 1 ? GREEN : LINE}`, borderRadius: 40, padding: '8px 22px'}}>{t}</div>
        ))}
      </div>
      <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, color: MUTED}}>Reported by candidates: Amazon</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 10, opacity: 1}}>
        <Face mood={smile ? 'smirk' : 'flat'} size={220} />
        <Bubble text="Hmm. Two loops." />
      </div>
    </AbsoluteFill>
  );
};

const Problem: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const nums: number[] = s.data.nums;
  const answer = prog(frame, dur, 0.62, 0.8);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40}}>
      <Label color={AMBER}>Find two numbers that add up to the target</Label>
      <div style={{display: 'flex', gap: 22}}>
        {nums.map((n, i) => (
          <Cell key={i} v={n} i={i} size={170} state={answer > 0.1 && i < 2 ? 'ok' : 'idle'} />
        ))}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 20, opacity: prog(frame, dur, 0.12, 0.25)}}>
        <Label size={44}>target</Label>
        <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 120, color: AMBER}}>{s.data.target}</div>
      </div>
      <div style={{opacity: answer, transform: `translateY(${(1 - answer) * 20}px)`, textAlign: 'center'}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 70, color: GREEN}}>2 + 7 = 9</div>
        <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 56, color: TXT, marginTop: 8}}>answer = [0, 1]</div>
      </div>
    </AbsoluteFill>
  );
};

const Brute: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const n = 6;
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  const k = Math.floor(frame / 4) % pairs.length;
  const [a, b] = pairs[k];
  const vals = [2, 7, 11, 15, 3, 9];
  const ease = Math.pow(prog(frame, dur, 0.1, 0.62), 2.2);
  const checks = Math.round(ease * 500_000_000_000);
  const clock = prog(frame, dur, 0.55, 0.8);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 34}}>
      <Label color={RED}>Try every pair: two loops</Label>
      <div style={{display: 'flex', gap: 14}}>
        {vals.map((v, i) => (
          <Cell key={i} v={v} size={130} state={i === a || i === b ? 'bad' : 'dim'} />
        ))}
      </div>
      <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, color: MUTED}}>
        checking ({a}, {b}) ...
      </div>
      <div style={{textAlign: 'center'}}>
        <Label>checks for a million numbers</Label>
        <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 76, color: RED}}>{checks.toLocaleString('en-IN')}</div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 24, opacity: clock}}>
        <svg width={150} height={150} viewBox="0 0 100 100">
          <circle cx={50} cy={50} r={44} fill={PANEL} stroke={AMBER} strokeWidth={6} />
          <line x1={50} y1={50} x2={50} y2={18} stroke={TXT} strokeWidth={5} strokeLinecap="round" transform={`rotate(${frame * 14} 50 50)`} />
          <line x1={50} y1={50} x2={50} y2={30} stroke={AMBER} strokeWidth={6} strokeLinecap="round" transform={`rotate(${frame * 1.2} 50 50)`} />
        </svg>
        <Big size={96} color={AMBER}>8 minutes</Big>
      </div>
    </AbsoluteFill>
  );
};

const Pause: React.FC<K> = ({dur}) => {
  const {frame} = useSc();
  const t = frame / dur;
  const n = t < 0.5 ? 3 : t < 0.65 ? 3 : t < 0.78 ? 2 : 1;
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
        <div style={{background: '#fff7e0', color: '#2a2110', borderRadius: 22, padding: '18px 36px', fontFamily: FONT.sans, fontWeight: 900, fontSize: 56, border: `5px solid ${AMBER}`}}>Hint: one notebook</div>
      </div>
    </AbsoluteFill>
  );
};

const Gate: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const guests: number[] = s.data.guests;
  const open = prog(frame, dur, 0.05, 0.2);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 50, left: 0, right: 0, textAlign: 'center'}}><Label color={AMBER}>The wedding gate</Label></div>
      {/* arch */}
      <svg width={980} height={930} viewBox="0 0 980 930" style={{position: 'absolute', left: 0, top: 0}}>
        <path d="M 330 700 L 330 330 Q 330 190 490 190 Q 650 190 650 330 L 650 700" fill="none" stroke={AMBER} strokeWidth={14} strokeLinecap="round" />
        <text x={490} y={282} textAnchor="middle" fontFamily={FONT.mono} fontWeight={900} fontSize={34} fill={AMBER} letterSpacing={4}>WEDDING</text>
        <rect x={20} y={700} width={940} height={10} rx={5} fill={LINE} />
      </svg>
      {guests.map((g, i) => {
        const startF = dur * (0.15 + i * 0.17);
        const left = interpolate(frame, [startF, startF + 40], [-130, 345 + i * 78], clamp);
        return (
          <div key={i} style={{position: 'absolute', left, top: 570, opacity: open}}>
            <div style={{width: 80, height: 80, borderRadius: 40, background: i === 0 ? AMBER : BLUE, color: '#1b1412', fontFamily: FONT.mono, fontWeight: 900, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '5px solid #1b1412'}}>{g}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', right: 20, top: 360, opacity: prog(frame, dur, 0.55, 0.7)}}>
        <Notebook rows={[]} w={300} />
      </div>
    </AbsoluteFill>
  );
};

const Steps: React.FC<K> = ({dur}) => {
  const {frame, fps} = useSc();
  const items = [
    ['1', 'Take the next guest', BLUE],
    ['2', 'partner = target − me', AMBER],
    ['3', 'Partner in notebook?', GREEN],
  ];
  const at = [0.04, 0.3, 0.55];
  const yn = prog(frame, dur, 0.74, 0.88);
  return (
    <AbsoluteFill style={{padding: '30px 30px', gap: 26, justifyContent: 'center'}}>
      {items.map(([n, t, c], i) => {
        const p = pop(frame, dur * at[i], fps);
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, background: PANEL, border: `5px solid ${c}`, borderRadius: 30, padding: '26px 34px', transform: `scale(${0.9 + p * 0.1})`, opacity: Math.min(1, p * 1.5)}}>
            <div style={{width: 96, height: 96, borderRadius: 48, background: c as string, color: '#1b1412', fontFamily: FONT.mono, fontWeight: 900, fontSize: 60, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{n}</div>
            <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 62, color: TXT, letterSpacing: -1.5}}>{t}</div>
          </div>
        );
      })}
      <div style={{display: 'flex', gap: 24, opacity: yn}}>
        <div style={{flex: 1, background: '#0f3a26', border: `5px solid ${GREEN}`, borderRadius: 26, padding: 24, fontFamily: FONT.sans, fontWeight: 900, fontSize: 54, color: GREEN, textAlign: 'center'}}>Yes: DONE</div>
        <div style={{flex: 1, background: '#3a2f12', border: `5px solid ${AMBER}`, borderRadius: 26, padding: 24, fontFamily: FONT.sans, fontWeight: 900, fontSize: 54, color: AMBER, textAlign: 'center'}}>No: write me down</div>
      </div>
    </AbsoluteFill>
  );
};

const CODE = [
  'def two_sum(nums, target):',
  '    seen = {}',
  '    for i, x in enumerate(nums):',
  '        need = target - x',
  '        if need in seen:',
  '            return [seen[need], i]',
  '        seen[x] = i',
  '    return []',
];
const MEANING = ['The question, as a function', 'seen = the notebook, empty', 'Take each guest, with position i', 'need = the partner I am looking for', 'Is the partner already inside?', 'Yes: here is the pair, done', 'No: write me down in the notebook', 'No pair exists'];
const Code: React.FC<K> = ({dur}) => {
  const {frame} = useSc();
  const order = [0, 1, 2, 3, 4, 5, 6];
  const idx = order[Math.min(order.length - 1, Math.floor(prog(frame, dur, 0.05, 0.97) * order.length))];
  const shown = Math.min(CODE.length, Math.floor(prog(frame, dur, 0, 0.3) * (CODE.length + 1)));
  return (
    <AbsoluteFill style={{padding: 20, justifyContent: 'center', gap: 28}}>
      <div style={{background: '#0a0d1d', border: `5px solid ${LINE}`, borderRadius: 30, padding: '28px 18px', boxShadow: '0 24px 50px #0008'}}>
        <div style={{display: 'flex', gap: 10, marginLeft: 20, marginBottom: 14}}>
          {[RED, AMBER, GREEN].map((c) => <div key={c} style={{width: 22, height: 22, borderRadius: 11, background: c}} />)}
          <Label size={26} style={{marginLeft: 16}}>two_sum.py</Label>
        </div>
        {CODE.map((l, i) => (
          <div key={i} style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 43, lineHeight: 1.5, whiteSpace: 'pre', padding: '0 18px', borderRadius: 12, color: i === idx ? '#fff' : '#b9c2f0', background: i === idx ? '#2a3573' : 'transparent', borderLeft: `8px solid ${i === idx ? AMBER : 'transparent'}`, opacity: i < shown ? 1 : 0}}>{l}</div>
        ))}
      </div>
      <div style={{background: AMBER, color: '#1b1412', borderRadius: 24, padding: '20px 30px', fontFamily: FONT.sans, fontWeight: 900, fontSize: 52, textAlign: 'center', letterSpacing: -1}}>{MEANING[idx]}</div>
    </AbsoluteFill>
  );
};

const Run: React.FC<K> = ({s, dur}) => {
  const {frame} = useSc();
  const d = s.data;
  const nums: number[] = d.nums;
  const rows: [number, number][] = [...d.before];
  const writeP = prog(frame, dur, 0.5, 0.65);
  const hitP = prog(frame, dur, 0.45, 0.6);
  const ansP = prog(frame, dur, 0.72, 0.88);
  const show = d.found ? rows : writeP > 0.2 ? [...rows, [nums[d.i], d.i] as [number, number]] : rows;
  return (
    <AbsoluteFill style={{padding: 10, alignItems: 'center', justifyContent: 'center', gap: 30}}>
      <div style={{display: 'flex', gap: 18}}>
        {nums.map((n, i) => (
          <div key={i} style={{position: 'relative'}}>
            <Cell v={n} i={i} size={150} state={i === d.i ? (d.found && ansP > 0.1 ? 'ok' : 'hl') : d.found && i === 0 && hitP > 0.3 ? 'ok' : i < d.i ? 'dim' : 'idle'} />
            {i === d.i ? <div style={{position: 'absolute', top: -70, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 900, fontSize: 46, color: AMBER}}>▼ me</div> : null}
          </div>
        ))}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 30, width: '100%', justifyContent: 'center'}}>
        <div style={{background: PANEL, border: `5px solid ${AMBER}`, borderRadius: 26, padding: '22px 28px', opacity: prog(frame, dur, 0.15, 0.3)}}>
          <Label size={28}>partner I need</Label>
          <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 60, color: TXT, marginTop: 6}}>{d.target} − {nums[d.i]} = <span style={{color: AMBER}}>{d.need}</span></div>
        </div>
        <Notebook rows={show} fresh={!d.found && writeP > 0.2 ? show.length - 1 : -1} hit={d.found && hitP > 0.3 ? 0 : -1} w={360} />
      </div>
      <div style={{height: 100, opacity: d.found ? ansP : prog(frame, dur, 0.5, 0.65)}}>
        {d.found ? (
          <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 80, color: GREEN}}>return [0, 1]</div>
        ) : (
          <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 56, color: AMBER}}>Not inside. Write me down.</div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const Trap: React.FC<K> = ({dur}) => {
  const {frame} = useSc();
  const wrong = prog(frame, dur, 0.1, 0.4);
  const right = prog(frame, dur, 0.5, 0.8);
  const Row: React.FC<{title: string; col: string; steps: string[]; res: string; p: number; bad?: boolean}> = ({title, col, steps, res, p, bad}) => (
    <div style={{background: PANEL, border: `6px solid ${col}`, borderRadius: 30, padding: '24px 30px', opacity: Math.min(1, p * 2), transform: `translateY(${(1 - Math.min(1, p * 2)) * 30}px)`}}>
      <Label color={col} size={34}>{title}</Label>
      <div style={{display: 'flex', gap: 14, alignItems: 'center', marginTop: 14}}>
        <Cell v={3} i={0} size={110} state={bad ? 'bad' : 'ok'} />
        <Cell v={3} i={1} size={110} state={bad ? 'dim' : 'ok'} />
        <div style={{flex: 1, fontFamily: FONT.sans, fontWeight: 800, fontSize: 40, color: TXT, lineHeight: 1.2, marginLeft: 18}}>
          {steps.map((t, i) => <div key={i}>{t}</div>)}
        </div>
      </div>
      <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 64, color: col, marginTop: 12}}>{res}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{padding: 10, gap: 26, justifyContent: 'center'}}>
      <Label color={AMBER} style={{textAlign: 'center'}}>nums = [3, 3] · target = 6</Label>
      <Row title="Wrong: write first, then check" col={RED} steps={['Write 3 → pos 0', 'Partner 3? Found: me!']} res="[0, 0]  ✗" p={wrong} bad />
      <Row title="Right: check first, then write" col={GREEN} steps={['Partner 3? Notebook empty', 'Write 3 → pos 0 · next 3 finds it']} res="[0, 1]  ✓" p={right} />
    </AbsoluteFill>
  );
};

const Aha: React.FC<K> = ({dur}) => {
  const {frame} = useSc();
  const a = prog(frame, dur, 0.05, 0.35);
  const b = prog(frame, dur, 0.4, 0.62);
  const c = prog(frame, dur, 0.7, 0.9);
  return (
    <AbsoluteFill style={{padding: 20, justifyContent: 'center', gap: 36}}>
      <div style={{opacity: a}}>
        <Label color={RED}>Two loops</Label>
        <div style={{height: 70, background: RED, borderRadius: 16, width: `${a * 100}%`, marginTop: 10}} />
        <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 52, color: RED, marginTop: 10}}>500,000,000,000 · 8 min</div>
      </div>
      <div style={{opacity: b}}>
        <Label color={GREEN}>One notebook</Label>
        <div style={{height: 70, background: GREEN, borderRadius: 16, width: `${Math.max(1.5, b * 1.5)}%`, marginTop: 10}} />
        <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 52, color: GREEN, marginTop: 10}}>1,000,000 · 1 ms</div>
      </div>
      <div style={{opacity: c, textAlign: 'center'}}>
        <Big size={120} color={AMBER}>500,000× faster</Big>
        <Label style={{marginTop: 8}}>same answer</Label>
      </div>
    </AbsoluteFill>
  );
};

const Smile: React.FC<K> = ({dur}) => {
  const {frame, fps} = useSc();
  const good = frame > dur * 0.4;
  const p = pop(frame, dur * 0.42, fps, 10);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30}}>
      <div style={{transform: `scale(${good ? 0.9 + p * 0.1 : 1})`}}>
        <Face mood={good ? 'smile' : 'smirk'} size={400} />
      </div>
      <div style={{opacity: prog(frame, dur, 0.5, 0.65)}}>
        <Bubble text="Next question." color="#b9f5d2" size={80} />
      </div>
      <Label color={GREEN} size={40} style={{opacity: prog(frame, dur, 0.7, 0.85)}}>a good smile</Label>
    </AbsoluteFill>
  );
};

const Name: React.FC<K> = ({dur}) => {
  const {frame, fps} = useSc();
  const pairs: [string, string][] = [['2', 'pos 0'], ['7', 'pos 1'], ['11', 'pos 2']];
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 34}}>
      <Big size={150} color={AMBER} style={{transform: `scale(${0.85 + pop(frame, 0, fps) * 0.15})`}}>HASH MAP</Big>
      <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
        {pairs.map(([k, v], i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, opacity: prog(frame, dur, 0.15 + i * 0.1, 0.3 + i * 0.1)}}>
            <Cell v={k} size={110} state="hl" />
            <div style={{fontFamily: FONT.mono, fontSize: 70, color: AMBER, fontWeight: 900}}>→</div>
            <Cell v={v} size={110} state="ok" />
          </div>
        ))}
      </div>
      <div style={{opacity: prog(frame, dur, 0.62, 0.8), background: AMBER, color: '#1b1412', borderRadius: 26, padding: '18px 40px', fontFamily: FONT.sans, fontWeight: 900, fontSize: 64}}>Lookup: 1 step</div>
    </AbsoluteFill>
  );
};

const Notes: React.FC<K> = ({dur}) => {
  const {frame} = useSc();
  const rows: [string, string, string][] = [
    ['TIME', 'O(n)', GREEN],
    ['SPACE', 'O(n)', AMBER],
    ['IDEA', 'Remember who came. Look up who I need.', BLUE],
    ['TRAP', 'Check first, then write', RED],
  ];
  return (
    <AbsoluteFill style={{padding: 10, justifyContent: 'center'}}>
      <div style={{background: '#fff7e0', borderRadius: 30, padding: '30px 36px', border: `6px solid ${AMBER}`, boxShadow: '0 24px 50px #0008'}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 900, fontSize: 40, letterSpacing: 4, color: '#7a5b12', borderBottom: '4px dashed #c9a24a', paddingBottom: 12}}>TWO SUM · NOTES</div>
        {rows.map(([k, v, c], i) => (
          <div key={i} style={{display: 'flex', gap: 24, alignItems: 'baseline', marginTop: 24, opacity: prog(frame, dur, 0.08 + i * 0.16, 0.2 + i * 0.16)}}>
            <div style={{width: 190, fontFamily: FONT.mono, fontWeight: 900, fontSize: 36, color: '#7a5b12'}}>{k}</div>
            <div style={{flex: 1, fontFamily: FONT.sans, fontWeight: 900, fontSize: v.length > 12 ? 48 : 72, color: '#1b1412', lineHeight: 1.1, letterSpacing: -1}}>
              <span style={{borderBottom: `8px solid ${c}`}}>{v}</span>
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
  return (
    <AbsoluteFill style={{padding: 10, justifyContent: 'center', gap: 28}}>
      <Label color={AMBER} style={{textAlign: 'center'}}>Quick quiz</Label>
      <Big size={72}>{d.question}</Big>
      {d.options.map((o: string, i: number) => (
        <div key={i} style={{transform: `scale(${0.9 + pop(frame, dur * (0.25 + i * 0.15), fps) * 0.1})`, opacity: Math.min(1, pop(frame, dur * (0.25 + i * 0.15), fps) * 1.5), background: PANEL, border: `6px solid ${i === 0 ? BLUE : AMBER}`, borderRadius: 30, padding: '30px 40px', fontFamily: FONT.sans, fontWeight: 900, fontSize: 70, color: TXT, textAlign: 'center'}}>{o}</div>
      ))}
      <Label style={{textAlign: 'center', opacity: prog(frame, dur, 0.7, 0.85)}}>Comment A or B</Label>
    </AbsoluteFill>
  );
};

const Close: React.FC<K> = ({s, dur}) => {
  const {frame, fps} = useSc();
  const btn = (t: string, c: string, at: number, icon: React.ReactNode) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 26, background: PANEL, border: `6px solid ${c}`, borderRadius: 30, padding: '20px 34px', transform: `scale(${0.88 + pop(frame, dur * at, fps) * 0.12})`, opacity: Math.min(1, pop(frame, dur * at, fps) * 1.5)}}>
      <svg width={80} height={80} viewBox="0 0 24 24" fill={c}>{icon}</svg>
      <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 64, color: TXT}}>{t}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{padding: 10, justifyContent: 'center', gap: 24}}>
      {btn('SAVE for interview', AMBER, 0.05, <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z" />)}
      {btn('SEND to the loop friend', BLUE, 0.22, <path d="M2 21l21-9L2 3v7l15 2-15 2z" />)}
      {btn('LIKE for tomorrow', RED, 0.4, <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />)}
      <div style={{opacity: prog(frame, dur, 0.6, 0.78), background: GREEN, color: '#1b1412', borderRadius: 28, padding: '20px 30px', textAlign: 'center', fontFamily: FONT.sans, fontWeight: 900, fontSize: 48}}>Comment TWOSUM → notes PDF</div>
      <div style={{opacity: prog(frame, dur, 0.8, 0.95), textAlign: 'center'}}>
        <Label>Tomorrow · Question 02</Label>
        <Big size={64} color={AMBER}>{s.data.next}</Big>
      </div>
    </AbsoluteFill>
  );
};

const KINDS: Record<string, React.FC<K>> = {title: Title, problem: Problem, brute: Brute, pause: Pause, gate: Gate, steps: Steps, code: Code, run: Run, trap: Trap, aha: Aha, smile: Smile, name: Name, notes: Notes, quiz: Quiz, close: Close};

/* ---------------------------------------------------------------- the reel */
const PANEL_BOX = {x: 50, y: 250, w: 980, h: 930};

const Scene: React.FC<{s: any; dur: number; first: boolean}> = ({s, dur, first}) => {
  const frame = useCurrentFrame();
  const Comp = KINDS[s.kind];
  const settle = first ? 1 : interpolate(frame, [0, 6], [1.05, 1], clamp);
  const out = interpolate(frame, [dur - 3, dur], [1, 0], clamp);
  const local = first ? frame : frame;
  return (
    <AbsoluteFill style={{opacity: first ? 1 : out}}>
      <div style={{position: 'absolute', left: PANEL_BOX.x, top: PANEL_BOX.y, width: PANEL_BOX.w, height: PANEL_BOX.h, borderRadius: 40, background: 'radial-gradient(ellipse at 50% 30%, #1d2247, #10132b 80%)', border: `5px solid ${LINE}`, overflow: 'hidden', transform: `scale(${settle})`}}>
        <AbsoluteFill style={{opacity: 1}}>
          <Comp s={s} dur={dur} />
        </AbsoluteFill>
      </div>
      {s.tease ? <Tease text={s.tease} top={160} /> : null}
      {local < 0 ? null : null}
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
          <span key={i} style={isCur ? {color: '#1b1412', background: AMBER, borderRadius: 10, padding: '0 8px'} : from + i < cur ? {color: TXT} : undefined}>
            {w.text}{' '}
          </span>
        );
      })}
    </div>
  );
};

export const DsaReel: React.FC<{episode: any; timings: any; hideCaptions?: boolean}> = ({episode, timings, hideCaptions}) => {
  useFonts();
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
      {/* header */}
      <div style={{position: 'absolute', top: 100, left: 50, right: 50, display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{background: AMBER, color: '#1b1412', fontFamily: FONT.mono, fontWeight: 900, fontSize: 32, letterSpacing: 3, padding: '10px 20px', borderRadius: 12}}>DSA-101 · {String(d?.n ?? 1).padStart(2, '0')}</div>
        <div style={{flex: 1, display: 'flex', gap: 5}}>
          {Array.from({length: total}, (_, i) => (
            <div key={i} style={{flex: 1, height: 10, borderRadius: 5, background: i < cur ? AMBER : i === cur ? '#fff' : LINE}} />
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', top: 175, left: 50, right: 50, fontFamily: FONT.mono, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: MUTED}}>
        @debug_bro · {d?.category?.toUpperCase()}
      </div>
      {episode.scenes.map((s: any, i: number) => {
        const pre = i === 0 ? DSA_PREROLL : 0;
        return (
          <Sequence key={i} from={starts[i] - pre} durationInFrames={Math.max(1, durs[i] + pre)} layout="none">
            {i > 0 ? <Audio src={staticFile('sfx/whoosh.wav')} volume={0.18} /> : null}
            <Scene s={s} dur={durs[i] + pre} first={i === 0} />
          </Sequence>
        );
      })}
      {/* spoken words (left) and Debug Bro (right) */}
      {hideCaptions ? null : (
        <div style={{position: 'absolute', left: 50, top: 1250, width: 520, height: 560}}>
          <SpokenWords words={sceneWords} ms={ms} />
        </div>
      )}
      <div style={{position: 'absolute', left: 585, top: 1285, filter: 'drop-shadow(0 16px 24px #0008)'}}>
        <Mascot variant="bro" flip track={track} mouth={mouth} width={450} seed="dsa-bro" />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1860, height: 60, background: '#07091a'}} />
    </AbsoluteFill>
  );
};

// DSA-101, simple format (style "dsa2"): hook, series line, one question, a promise, the slow way, a guess, the payoff,
// the key code, one ask. One text area on top, one animation area in the middle, nothing else competing.
//   text area       y 200-720   very large words, 3-5 at a time, white with the key word in yellow
//   animation area  y 760-1440  one picture that moves
//   Debug Bro       bottom (Instagram covers that strip with its caption, so nothing there has to be read)
import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {FONT, H} from './theme';
import {Mascot, PoseName} from './components/Mascot';
import {useFonts} from './components/chrome';
import {MouthCtx} from './components/themeContext';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ANTON = '"Anton", "Inter", sans-serif';
const BG = '#0b0d14';
const CARD = '#161a28';
const LINE = '#333b57';
const WHITE = '#ffffff';
const MUTED = '#9aa3c2';
const YELLOW = '#ffd400';
const GREEN = '#35e08a';
const RED = '#ff5263';

const useSpring = (at: number, damping = 13) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping, stiffness: 200}});
};

/** Huge headline. Lines are separate strings; *word* is highlighted. Words land one after another. */
const Words: React.FC<{lines: string[]; size?: number; at?: number; step?: number; top?: number; over?: number}> = ({lines, size = 150, at = 0, step = 3, top = 230, over}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let n = 0;
  const count = lines.join(' ').split(/\s+/).length;
  const gap = over ? Math.max(2, Math.min(9, Math.floor(over / count))) : step;
  // shrink so the longest line fits the width
  const longest = Math.max(...lines.map((l) => l.replace(/\*/g, '').length));
  const fitted = Math.min(size, Math.floor(960 / (longest * 0.5)));
  return (
    <div style={{position: 'absolute', top, left: 50, right: 50, textAlign: 'center'}}>
      {lines.map((line, li) => (
        <div key={li} style={{fontFamily: ANTON, fontSize: fitted, lineHeight: 1.16, letterSpacing: 1, textTransform: 'uppercase', color: WHITE, whiteSpace: 'nowrap'}}>
          {(line.match(/\*[^*]+\*|\S+/g) ?? []).map((w, i) => {
            const k = n++;
            const p = spring({frame: frame - (at + k * gap), fps, config: {damping: 12, stiffness: 260}});
            const hot = w.startsWith('*');
            return (
              <span key={i} style={{display: 'inline-block', margin: '0 12px', opacity: Math.min(1, p * 1.6), transform: `scale(${0.7 + p * 0.3})`, color: hot ? '#101010' : WHITE, background: hot ? YELLOW : 'transparent', padding: hot ? '0 18px' : 0, borderRadius: 14}}>
                {w.replace(/\*/g, '')}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * The one picture of the reel. layout "stack": blocks pile up, newest on top; "row": cells left to right.
 * `side` is the helper structure (second stack, notebook, set): beside a stack, under a row.
 */
type BoardSpec = {layout: 'stack' | 'row'; values: (string | number)[]; side?: {title: string; values: (string | number)[]}; slots?: number};
const Board: React.FC<BoardSpec & {lit?: number[]; tone?: string; shown?: number; y?: number; w?: number; h?: number; drop?: boolean}> = ({layout, values, side, lit = [], tone = RED, shown, y = 800, w, h, drop, slots}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const count = shown ?? values.length;
  const enter = (i: number) => (drop ? spring({frame: frame - (2 + i * 5), fps, config: {damping: 13, stiffness: 170}}) : 1);
  const cell = (v: string | number, key: number, cw: number, ch: number, on: string | null, edge: string) => (
    <div key={key} style={{width: cw, height: ch, borderRadius: 22, background: on ?? CARD, border: `6px solid ${on ?? edge}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: Math.min(ch * 0.66, (cw * 1.5) / Math.max(1, String(v).length)), color: on ? '#08110c' : WHITE, opacity: Math.min(1, enter(key) * 1.5), transform: `translateY(${(1 - enter(key)) * -260}px)`}}>
      {v}
    </div>
  );
  const title = (text: string, color: string) => <div style={{fontFamily: ANTON, fontSize: 46, color, textTransform: 'uppercase'}}>{text}</div>;
  if (layout === 'stack') {
    const ch = h ?? (values.length > 3 ? 136 : 170);
    const cw = w ?? 320;
    const column = (list: (string | number)[], name: string, isSide: boolean) => (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
        {side ? title(name, isSide ? GREEN : WHITE) : null}
        <div style={{display: 'flex', flexDirection: 'column-reverse', justifyContent: 'flex-start', gap: 12, minHeight: (slots ?? values.length) * (ch + 12), padding: '0 16px 16px', borderLeft: `8px solid ${LINE}`, borderRight: `8px solid ${LINE}`, borderBottom: `8px solid ${LINE}`, borderRadius: '0 0 28px 28px'}}>
          {list.slice(0, count).map((v, i) => cell(v, i, cw, ch, isSide ? (i === Math.min(count, list.length) - 1 ? GREEN : null) : lit.includes(i) ? tone : null, isSide ? '#1f6b47' : LINE))}
        </div>
      </div>
    );
    return (
      <div style={{position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 90}}>
        {column(values, 'stack', false)}
        {side ? column(side.values, side.title, true) : null}
      </div>
    );
  }
  const cw = w ?? Math.min(200, Math.floor((960 - (values.length - 1) * 16) / values.length));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y + 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 60}}>
      <div style={{display: 'flex', gap: 16}}>{values.slice(0, count).map((v, i) => cell(v, i, cw, h ?? cw, lit.includes(i) ? tone : null, LINE))}</div>
      {side ? (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
          {title(side.title, GREEN)}
          <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, maxWidth: 900, minWidth: 360, minHeight: 150, border: `6px solid #1f6b47`, borderRadius: 30, padding: 18}}>
            {side.values.slice(0, shown ?? side.values.length).map((v, i) => (
              <div key={i} style={{fontFamily: ANTON, fontSize: 70, color: WHITE, background: CARD, borderRadius: 18, padding: '0 28px', lineHeight: 1.5}}>{v}</div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Bro: React.FC<{pose: PoseName; width?: number; x?: number; y?: number; flip?: boolean}> = ({pose, width = 380, x = 640, y = 1420, flip = true}) => {
  const level = React.useContext(MouthCtx);
  // scene sequences restart the frame count; the voice level needs the frame of the whole reel
  const start = React.useContext(StartCtx);
  return (
    <div style={{position: 'absolute', left: x, top: y, filter: 'drop-shadow(0 18px 30px #000a)'}}>
      <Mascot variant="bro" flip={flip} pose={pose} width={width} seed="dsa2" mouth={level ? (f: number) => level(f + start) : undefined} />
    </div>
  );
};
const StartCtx = React.createContext(0);

const Pill: React.FC<{text: string; color?: string; top: number; size?: number; at?: number}> = ({text, color = YELLOW, top, size = 62, at = 8}) => {
  const p = useSpring(at, 10);
  return (
    <div style={{position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${0.8 + p * 0.2})`, opacity: Math.min(1, p * 1.5)}}>
      <div style={{fontFamily: ANTON, fontSize: size, color: '#101010', background: color, borderRadius: 20, padding: '10px 36px', textTransform: 'uppercase', boxShadow: '0 12px 30px #0008'}}>{text}</div>
    </div>
  );
};

/* ---------------------------------------------------------------- scenes */
type P = {d: any; dur: number; ep: any};

const Hook: React.FC<P> = ({d}) => (
  <>
    <Words lines={d.lines} size={190} at={-30} top={200} />
    {/* the puzzle on the left (or across, for arrays), Debug Bro on the right: neither touches the headline */}
    {d.board.layout === 'stack' ? (
      <div style={{position: 'absolute', top: 0, left: 40, width: 480, height: H}}>
        <Board {...d.board} side={undefined} y={900} w={270} h={d.board.values.length > 3 ? 110 : 138} />
        <div style={{position: 'absolute', top: 1420, left: 0, right: 0, textAlign: 'center', fontFamily: ANTON, fontSize: 80, color: YELLOW, textTransform: 'uppercase'}}>{d.ask}</div>
      </div>
    ) : (
      <>
        <Board {...d.board} side={undefined} y={800} w={Math.min(150, Math.floor(920 / d.board.values.length) - 16)} />
        <div style={{position: 'absolute', top: 1180, left: 40, width: 500, textAlign: 'center', fontFamily: ANTON, fontSize: 80, color: YELLOW, textTransform: 'uppercase'}}>{d.ask}</div>
      </>
    )}
    <Bro pose="shock" width={d.board.layout === 'stack' ? 540 : 470} x={d.board.layout === 'stack' ? 525 : 575} y={d.board.layout === 'stack' ? 880 : 1090} />
  </>
);

const Series: React.FC<P> = ({d, ep}) => {
  const p = useSpring(4, 9);
  return (
    <>
      <Words lines={['Welcome to', 'question']} size={125} top={220} />
      <div style={{position: 'absolute', top: 500, left: 0, right: 0, textAlign: 'center', transform: `scale(${2.4 - Math.min(1, p) * 1.4})`, opacity: Math.min(1, p * 2)}}>
        <div style={{fontFamily: ANTON, fontSize: 340, lineHeight: 1.1, color: YELLOW}}>
          {ep.dsa.n}
          <span style={{color: WHITE, fontSize: 170}}> / {d.total}</span>
        </div>
        <div style={{fontFamily: ANTON, fontSize: 92, color: WHITE, textTransform: 'uppercase'}}>popular LeetCode questions</div>
      </div>
      <Bro pose="thumbsup" width={440} x={320} y={1230} />
    </>
  );
};

/** big call-out on top, one line under it: the head of every teaching screen */
const Head: React.FC<{title: string; note?: string; color?: string}> = ({title, note, color = YELLOW}) => {
  const p = useSpring(0, 10);
  return (
    <div style={{position: 'absolute', top: 235, left: 40, right: 40, textAlign: 'center'}}>
      <div style={{display: 'inline-block', fontFamily: ANTON, fontSize: Math.min(120, Math.floor(900 / (title.length * 0.52))), lineHeight: 1.22, color: '#101010', background: color, borderRadius: 24, padding: '0 40px', textTransform: 'uppercase', transform: `scale(${0.6 + p * 0.4}) rotate(${(1 - p) * -6}deg)`}}>{title}</div>
      {note ? <div style={{fontFamily: ANTON, fontSize: Math.min(68, Math.floor(960 / (note.length * 0.46))), lineHeight: 1.3, color: WHITE, marginTop: 14, whiteSpace: 'nowrap'}}>{note}</div> : null}
    </div>
  );
};

/** code panel with highlighted lines */
const CodeBox: React.FC<{lines: string[]; line: number[]; top: number; height: number; max?: number}> = ({lines, line, top, height, max = 46}) => {
  const size = Math.min(max, Math.floor(900 / (Math.max(...lines.map((l) => l.length)) * 0.6)), Math.floor((height - 56) / (lines.length * 1.55)));
  return (
    <div style={{position: 'absolute', top, left: 40, right: 40, height, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
      <div style={{background: CARD, border: `5px solid ${LINE}`, borderRadius: 30, padding: '22px 8px'}}>
        {lines.map((l, i) => (
          <div key={i} style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: size, lineHeight: 1.55, whiteSpace: 'pre', fontVariantLigatures: 'none', padding: '0 18px', borderRadius: 12, color: line.includes(i) ? '#101010' : '#aab3d6', background: line.includes(i) ? YELLOW : 'transparent'}}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

/** concept and "what the question asks": a call-out, the picture, sometimes a result chip; `crash` knocks the pile over */
const Teach: React.FC<P> = ({d, dur}) => {
  const frame = useCurrentFrame();
  const fall = d.crash ? interpolate(frame, [dur * 0.55, dur * 0.8], [0, 1], clamp) : 0;
  return (
    <>
      <Head title={d.title} note={d.note} color={d.crash && fall > 0 ? RED : YELLOW} />
      <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 1300px', transform: `rotate(${fall * 38}deg) translate(${fall * 120}px, ${fall * 160}px)`}}>
        <Board {...d.board} y={700} drop={d.drop} tone={GREEN} />
      </div>
      {d.result ? <Pill text={d.result} color={GREEN} top={1360} at={Math.round(dur * 0.45)} /> : null}
      {d.crash && fall > 0.5 ? <Pill text="CRASH!" color={RED} top={1360} size={110} at={Math.round(dur * 0.7)} /> : null}
    </>
  );
};

const Catch: React.FC<P> = ({d, dur}) => (
  <>
    <Words lines={d.lines} size={190} top={380} over={dur * 0.4} />
    <Pill text={d.tag} color={RED} top={1100} size={72} at={Math.round(dur * 0.4)} />
    <Bro pose="point" width={440} x={320} y={1260} />
  </>
);

const Guess: React.FC<P> = ({d, dur}) => {
  const frame = useCurrentFrame();
  const p = useSpring(2, 9);
  const n = Math.max(1, 3 - Math.floor(interpolate(frame, [dur * 0.4, dur * 0.95], [0, 2.99], clamp)));
  return (
    <>
      <Words lines={d.lines} size={180} top={280} />
      <div style={{position: 'absolute', top: 720, left: 130, right: 130, background: YELLOW, borderRadius: 40, padding: '40px 30px', textAlign: 'center', transform: `rotate(-3deg) scale(${0.8 + p * 0.2})`, boxShadow: `18px 18px 0 ${WHITE}`}}>
        <div style={{fontFamily: ANTON, fontSize: 110, color: '#101010', textTransform: 'uppercase', lineHeight: 1.15}}>{d.sticker}</div>
      </div>
      <div style={{position: 'absolute', top: 1090, left: 0, right: 0, textAlign: 'center', fontFamily: ANTON, fontSize: 210, color: YELLOW}}>{n}</div>
    </>
  );
};

/** brute force: its code on top, the cells it has to look at below */
const Brute: React.FC<P> = ({d, dur}) => {
  const frame = useCurrentFrame();
  const order: number[] = d.board.values.map((_: unknown, i: number) => (d.board.layout === 'stack' ? d.board.values.length - 1 - i : i));
  const k = Math.floor(interpolate(frame, [4, dur * 0.85], [0, order.length * 2 - 0.01], clamp)) % order.length;
  return (
    <>
      <Head title={d.title} note={d.note} color={d.bad ? RED : YELLOW} />
      <CodeBox lines={d.code} line={d.line} top={480} height={400} />
      <Board {...d.board} y={920} h={d.board.layout === 'stack' ? 112 : undefined} w={d.board.layout === 'stack' ? 290 : undefined} lit={d.scan ? [order[k]] : d.board.lit} tone={RED} />
    </>
  );
};

/** the tempting shortcut: the data, plus the one variable that is about to be wrong */
const Trap: React.FC<P> = ({d, dur}) => {
  const frame = useCurrentFrame();
  const p = useSpring(Math.round(dur * 0.35), 9);
  const shake = d.bad && frame > dur * 0.4 && frame < dur * 0.7 ? (frame % 2 ? 14 : -14) : 0;
  return (
    <>
      <Head title={d.title} note={d.note} color={d.bad ? RED : YELLOW} />
      <div style={{position: 'absolute', top: 0, left: 20, width: 520, height: H}}>
        <Board {...d.board} side={undefined} y={700} w={290} h={138} />
      </div>
      <div style={{position: 'absolute', top: 760, left: 580, width: 430, textAlign: 'center', transform: `translateX(${shake}px) scale(${0.85 + p * 0.15})`}}>
        <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 50, color: MUTED}}>{d.box.label}</div>
        <div style={{marginTop: 16, height: 280, borderRadius: 40, border: `10px solid ${d.bad ? RED : YELLOW}`, background: d.bad ? '#3a1018' : CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 220, color: WHITE}}>{d.box.value}</div>
        {d.bad ? <div style={{fontFamily: ANTON, fontSize: 100, color: RED, marginTop: 18, opacity: Math.min(1, p)}}>WRONG!</div> : null}
      </div>
      <Bro pose={d.bad ? 'facepalm' : 'explain'} width={360} x={360} y={1320} />
    </>
  );
};

const Insight: React.FC<P> = ({d, dur}) => {
  const frame = useCurrentFrame();
  const total = d.board.values.length;
  const grown = Math.max(1, Math.min(total, 1 + Math.floor(interpolate(frame, [4, dur * 0.7], [0, total], clamp))));
  return (
    <>
      <Head title={d.title} note={d.note} color={GREEN} />
      <Board {...d.board} shown={d.grow ? grown : undefined} y={760} />
    </>
  );
};

const Code: React.FC<P> = ({d, dur}) => {
  const frame = useCurrentFrame();
  const idx = Math.min(d.focus.length - 1, Math.floor(interpolate(frame, [0, dur], [0, d.focus.length], clamp)));
  return (
    <>
      <Words lines={d.lines} over={dur * 0.2} />
      <CodeBox lines={d.code} line={[d.focus[idx]]} top={560} height={850} max={54} />
    </>
  );
};

/**
 * One step of the dry run: what happens (huge), why (one line), the code line doing it, and the data after it.
 * data: {title, note, board, show: [first, last] lines of the code scene, line: [highlighted line indices]}
 */
const DryRun: React.FC<P> = ({d, ep}) => {
  const code: string[] = ep.scenes.find((s: any) => s.kind === 'code').data.code;
  const [from, to] = d.show;
  const stack = d.board.layout === 'stack';
  return (
    <>
      <Head title={d.title} note={d.note} />
      <CodeBox lines={code.slice(from, to + 1)} line={d.line.map((i: number) => i - from)} top={480} height={400} />
      <Board {...d.board} y={stack ? 920 : 900} h={stack ? 112 : undefined} w={stack ? 290 : undefined} tone={GREEN} />
    </>
  );
};

/** brute force against the optimal one, as a race */
const Compare: React.FC<P> = ({d, dur}) => {
  const frame = useCurrentFrame();
  const slow = interpolate(frame, [10, dur], [0, 0.35], clamp);
  const fast = interpolate(frame, [10, 24], [0, 1], clamp);
  const card = (x: any, color: string, bar: number, top: number) => (
    <div style={{position: 'absolute', top, left: 60, right: 60, background: CARD, border: `8px solid ${color}`, borderRadius: 36, padding: '30px 40px'}}>
      <div style={{fontFamily: ANTON, fontSize: 70, color, textTransform: 'uppercase'}}>{x.title}</div>
      <div style={{fontFamily: ANTON, fontSize: 96, color: WHITE, textTransform: 'uppercase', lineHeight: 1.2}}>{x.value}</div>
      <div style={{height: 46, borderRadius: 23, background: BG, marginTop: 18, overflow: 'hidden'}}>
        <div style={{height: '100%', width: `${bar * 100}%`, background: color}} />
      </div>
    </div>
  );
  return (
    <>
      <Words lines={d.lines} top={220} />
      {card(d.slow, RED, slow, 520)}
      {card(d.fast, GREEN, fast, 920)}
      <Pill text={d.note} top={1290} size={56} at={Math.round(dur * 0.5)} />
    </>
  );
};

/** the sentence to say in the interview, typed out so people can save it */
const Say: React.FC<P> = ({d, dur}) => {
  const frame = useCurrentFrame();
  const text = String(d.quote);
  const shown = Math.ceil(text.length * interpolate(frame, [4, dur * 0.65], [0, 1], clamp));
  return (
    <>
      <Words lines={d.lines} top={240} />
      <div style={{position: 'absolute', top: 640, left: 70, right: 70, background: WHITE, borderRadius: 44, padding: '56px 56px', fontFamily: FONT.sans, fontWeight: 900, fontSize: 72, lineHeight: 1.28, color: '#101010', boxShadow: `18px 18px 0 ${YELLOW}`}}>
        “{text.slice(0, shown)}
        <span style={{opacity: 0}}>{text.slice(shown)}</span>”
      </div>
      <Bro pose="explain" width={420} x={330} y={1290} />
    </>
  );
};

const ICONS: Record<string, React.ReactNode> = {
  like: <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />,
  comment: <path d="M12 3a9 9 0 1 0 4.2 17L21 21l-1.2-4.6A9 9 0 0 0 12 3z" />,
  share: <path d="M2 21l21-9L2 3v7l15 2-15 2z" />,
  follow: <path d="M10 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 16c0-3.9 3.1-6 7-6s7 2.1 7 6zm15-12h2.5v3H23v2.5h-2.5v3H18v-3h-3V11h3z" />,
  save: <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z" />,
};
const TINT: Record<string, string> = {like: RED, comment: GREEN, share: '#5aa9ff', follow: YELLOW, save: YELLOW};

/** LIKE / COMMENT / SHARE / FOLLOW, bouncing in one after another */
const Ask: React.FC<P> = ({d, ep, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rows: [string, string][] = [['like', 'Like'], ['comment', `Comment ${ep.leadMagnet.keyword}`], ['share', 'Share with a friend'], ['follow', 'Follow for more']];
  return (
    <>
      <Words lines={d.lines} size={150} top={230} />
      {rows.map(([icon, text], i) => {
        const at = Math.round(dur * (0.06 + i * 0.17));
        const p = spring({frame: frame - at, fps, config: {damping: 8, stiffness: 220}});
        const beat = frame > at + 20 ? 1 + Math.sin((frame - at) / 5) * 0.025 : 1;
        return (
          <div key={icon} style={{position: 'absolute', top: 520 + i * 215, left: 80, right: 80, height: 180, borderRadius: 50, background: TINT[icon], display: 'flex', alignItems: 'center', gap: 40, padding: '0 50px', transform: `scale(${Math.max(0, p) * beat}) rotate(${(1 - p) * (i % 2 ? 8 : -8)}deg)`, opacity: frame < at ? 0 : 1, boxShadow: `0 14px 0 #0008`}}>
            <svg width={100} height={100} viewBox="0 0 24 24" fill="#101010">{ICONS[icon]}</svg>
            <div style={{fontFamily: ANTON, fontSize: text.length > 14 ? 72 : 96, color: '#101010', textTransform: 'uppercase'}}>{text}</div>
          </div>
        );
      })}
      <Bro pose="thumbsup" width={330} x={700} y={1370} />
    </>
  );
};

const KINDS: Record<string, React.FC<P>> = {hook: Hook, series: Series, concept: Teach, ops: Teach, catch: Catch, guess: Guess, brute: Brute, trap: Trap, insight: Insight, code: Code, dryrun: DryRun, compare: Compare, say: Say, ask: Ask};

/* ---------------------------------------------------------------- show: cuts, meter, pop-ups, sound */
/** how each part arrives; `fx` on a scene overrides it */
const FX: Record<string, string> = {hook: 'none', series: 'zoom', concept: 'whip', ops: 'punch', catch: 'glitch', guess: 'zoom', brute: 'whip', trap: 'punch', insight: 'flash', code: 'whip', dryrun: 'punch', compare: 'zoom', say: 'whip', ask: 'flash'};

const Cut: React.FC<{fx: string; children: React.ReactNode}> = ({fx, children}) => {
  const frame = useCurrentFrame();
  const t = (to: number) => interpolate(frame, [0, to], [1, 0], clamp);
  let style: React.CSSProperties = {};
  if (fx === 'whip') style = {transform: `translateX(${t(7) * 1100}px) skewX(${t(7) * -14}deg)`, filter: frame < 6 ? `blur(${t(6) * 18}px)` : undefined};
  if (fx === 'punch') style = {transform: `scale(${1 + t(7) * 0.22})`};
  if (fx === 'zoom') style = {transform: `scale(${1 - t(9) * 0.65}) rotate(${t(9) * -9}deg)`, opacity: 1 - t(4)};
  if (fx === 'glitch' && frame < 9) style = {transform: `translate(${frame % 2 ? 28 : -22}px, ${frame % 3 ? 8 : -10}px)`, filter: 'hue-rotate(90deg) saturate(2.4) contrast(1.4)'};
  return (
    <AbsoluteFill>
      <AbsoluteFill style={style}>{children}</AbsoluteFill>
      {fx === 'flash' ? <AbsoluteFill style={{background: WHITE, opacity: t(8) * 0.8, pointerEvents: 'none'}} /> : null}
      {fx === 'glitch' ? <AbsoluteFill style={{background: RED, opacity: t(10) * 0.45, pointerEvents: 'none'}} /> : null}
    </AbsoluteFill>
  );
};

/** top strip: which level we are on, and the interviewer's mood (0-100) sliding from the last value */
const Header: React.FC<{level?: string; mood: number; from: number; since: number}> = ({level, mood, from, since}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame - since, [0, 18], [from, mood], clamp);
  const color = v < 35 ? RED : v < 70 ? YELLOW : GREEN;
  return (
    <div style={{position: 'absolute', top: 138, left: 50, right: 50, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <div style={{fontFamily: ANTON, fontSize: 40, color: '#101010', background: YELLOW, borderRadius: 14, padding: '0 20px', textTransform: 'uppercase', opacity: level ? 1 : 0}}>{level ?? '-'}</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{fontFamily: ANTON, fontSize: 30, color: MUTED, textTransform: 'uppercase'}}>Interviewer</span>
        <div style={{width: 220, height: 26, borderRadius: 13, background: CARD, overflow: 'hidden'}}>
          <div style={{width: `${Math.max(4, v)}%`, height: '100%', background: color}} />
        </div>
        <svg width={58} height={58} viewBox="0 0 60 60">
          <circle cx={30} cy={30} r={27} fill={color} />
          <circle cx={20} cy={24} r={4} fill="#101010" />
          <circle cx={40} cy={24} r={4} fill="#101010" />
          <path d={`M 17 ${42 - (v - 50) / 14} Q 30 ${42 + (v - 50) / 4.5} 43 ${42 - (v - 50) / 14}`} fill="none" stroke="#101010" strokeWidth={5} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

/** a bouncing nudge in the middle of the reel: {icon: like|comment|share|follow|save, text} */
const Nudge: React.FC<{pop: {icon: string; text: string}; dur: number}> = ({pop, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const at = Math.round(dur * 0.35);
  const p = spring({frame: frame - at, fps, config: {damping: 8, stiffness: 220}});
  if (frame < at) return null;
  return (
    <div style={{position: 'absolute', top: 1440, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${Math.max(0, p)}) rotate(${Math.sin(frame / 4) * 2.5}deg)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20, background: TINT[pop.icon] ?? YELLOW, borderRadius: 60, padding: '12px 44px', boxShadow: '0 12px 30px #000a'}}>
        <svg width={64} height={64} viewBox="0 0 24 24" fill="#101010">{ICONS[pop.icon]}</svg>
        <span style={{fontFamily: ANTON, fontSize: 58, color: '#101010', textTransform: 'uppercase'}}>{pop.text}</span>
      </div>
    </div>
  );
};

/** sound effects per part: [fraction of the scene, file in public/sfx/dsa, volume] */
const CUES: Record<string, [number, string, number][]> = {
  hook: [[0, 'impact', 0.75], [0.35, 'glitch', 0.4]],
  series: [[0, 'whoosh', 0.7], [0.1, 'impact', 0.6]],
  concept: [[0, 'swish', 0.5], [0.12, 'thud', 0.5]],
  ops: [[0, 'pop', 0.7], [0.45, 'tick', 0.6]],
  catch: [[0, 'glitch', 0.7], [0.4, 'buzz', 0.5]],
  guess: [[0, 'whoosh', 0.6], [0.4, 'tick', 0.8], [0.62, 'tick', 0.8], [0.84, 'tick', 0.8]],
  brute: [[0, 'swish', 0.5], [0.3, 'tick', 0.5], [0.55, 'tick', 0.5]],
  trap: [[0, 'pop', 0.7], [0.35, 'thud', 0.5]],
  insight: [[0, 'riser', 0.5], [0.1, 'sparkle', 0.5], [0.7, 'ding', 0.5]],
  code: [[0, 'whoosh', 0.5], [0.05, 'type', 0.6]],
  dryrun: [[0, 'pop', 0.6], [0.2, 'tick', 0.5]],
  compare: [[0, 'whoosh', 0.6], [0.15, 'ding', 0.6], [0.5, 'tada', 0.5]],
  say: [[0, 'swish', 0.5], [0.05, 'type', 0.6]],
  ask: [[0, 'sparkle', 0.5], [0.06, 'pop', 0.8], [0.23, 'pop', 0.8], [0.4, 'pop', 0.8], [0.57, 'pop', 0.8], [0.75, 'tada', 0.5]],
};

export const Dsa2Reel: React.FC<{episode: any; timings: any}> = ({episode, timings}) => {
  useFonts();
  const [handle] = React.useState(() => delayRender('anton font'));
  React.useEffect(() => {
    const face = new FontFace('Anton', `url(${staticFile('fonts/anton.woff2')})`);
    face.load().then((f) => document.fonts.add(f)).catch(() => {}).finally(() => continueRender(handle));
  }, [handle]);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (ms: number) => Math.round((ms / 1000) * fps);
  const starts: number[] = timings.scenes.map((s: any) => f(s.startMs));
  const durs: number[] = timings.scenes.map((s: any, i: number) => (i < starts.length - 1 ? starts[i + 1] - starts[i] : f(s.durMs) + f(700)));
  let cur = 0;
  starts.forEach((s, i) => {
    if (frame >= s) cur = i;
  });
  const audioData = useAudioData(staticFile(timings.audio ?? 'sfx/tick.wav'));
  const level = (fr: number) => {
    if (!audioData || !timings.audio) return 0;
    const v = visualizeAudio({fps, frame: fr, audioData, numberOfSamples: 32, optimizeFor: 'speed'});
    return Math.min(1, Math.max(0, (v.slice(0, 12).reduce((a: number, b: number) => a + b, 0) / 12 - 0.015) * 9));
  };
  return (
    <MouthCtx.Provider value={level}>
      <AbsoluteFill style={{background: BG}}>
        {timings.audio ? <Audio src={staticFile(timings.audio)} /> : null}
        <Audio src={staticFile('sfx/dsa/bed.mp3')} volume={(fr) => interpolate(fr, [0, 25], [0, 0.09], clamp)} loop />
        {/* progress through the reel, small, at the very top */}
        <div style={{position: 'absolute', top: 110, left: 60, right: 60, display: 'flex', gap: 8}}>
          {episode.scenes.map((_: any, i: number) => (
            <div key={i} style={{flex: 1, height: 10, borderRadius: 5, background: i <= cur ? YELLOW : LINE}} />
          ))}
        </div>
        {/* the level and the meter stay put while the screens cut underneath (not on the hook) */}
        {episode.scenes.map((s: any, i: number) => {
          const Comp = KINDS[s.kind];
          return (
            <Sequence key={i} from={starts[i]} durationInFrames={Math.max(1, durs[i])} layout="none">
              <StartCtx.Provider value={starts[i]}>
                <Cut fx={s.fx ?? FX[s.kind] ?? 'punch'}>
                  <Comp d={s.data} dur={durs[i]} ep={episode} />
                </Cut>
                {s.pop ? <Nudge pop={s.pop} dur={durs[i]} /> : null}
              </StartCtx.Provider>
              {(CUES[s.kind] ?? []).map(([at, file, vol], k) => (
                <Sequence key={k} from={Math.round(durs[i] * at)} layout="none">
                  <Audio src={staticFile(`sfx/dsa/${file}.wav`)} volume={vol * 0.55} />
                </Sequence>
              ))}
            </Sequence>
          );
        })}
        {episode.scenes[cur].kind === 'hook' ? null : (
          <Header level={episode.scenes[cur].level} mood={episode.scenes[cur].meter ?? 50} from={episode.scenes[Math.max(0, cur - 1)].meter ?? 50} since={starts[cur]} />
        )}
      </AbsoluteFill>
    </MouthCtx.Provider>
  );
};

/* ---------------------------------------------------------------- cover */
const DIFF: Record<string, string> = {Easy: GREEN, Medium: YELLOW, Hard: RED};

/** the "prep for" row (MANGOS). A name with no icon file is written as text: logos are never redrawn here. */
const COMPANIES: {name: string; logo?: string}[] = [
  {name: 'Meta', logo: 'meta'},
  {name: 'Anthropic', logo: 'anthropic'},
  {name: 'Nvidia', logo: 'nvidia'},
  {name: 'Google', logo: 'google'},
  {name: 'OpenAI'},
  {name: 'SpaceX', logo: 'spacex'},
];

const PrepFor: React.FC = () => (
  <div style={{position: 'absolute', top: 1362, left: 0, right: 0, height: 558, background: BG}}>
    <div style={{height: 4, margin: '0 60px', background: LINE}} />
    <div style={{textAlign: 'center', fontFamily: ANTON, fontSize: 46, lineHeight: 1.25, color: YELLOW, letterSpacing: 8, textTransform: 'uppercase', marginTop: 6}}>Prep for</div>
    <div style={{display: 'flex', justifyContent: 'center', gap: 20, marginTop: 6}}>
      {COMPANIES.map((c) => (
        <div key={c.name} style={{width: 146, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
          <div style={{width: 126, height: 126, borderRadius: 28, background: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {c.logo ? (
              <Img src={staticFile(`logos/${c.logo}.svg`)} style={{width: c.logo === 'spacex' ? 114 : 92, height: c.logo === 'spacex' ? 114 : 92}} />
            ) : (
              <span style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 31, color: '#000', letterSpacing: -1}}>{c.name}</span>
            )}
          </div>
          <div style={{fontFamily: FONT.sans, fontWeight: 800, fontSize: 26, color: WHITE}}>{c.name}</div>
        </div>
      ))}
    </div>
    <div style={{textAlign: 'center', fontFamily: FONT.sans, fontWeight: 600, fontSize: 24, color: MUTED, marginTop: 4}}>Not affiliated with these companies</div>
  </div>
);

/**
 * The profile-grid cover, identical for every question so the profile reads as one numbered series. The grid crops to
 * the middle 3:4 (y 240-1680), so everything that matters sits inside it.
 * episode: dsa {n, name, difficulty, category}, cover {art: ["2","7"], note: "= 9", pose}
 */
export const Dsa2Cover: React.FC<{episode: any}> = ({episode}) => {
  useFonts();
  const [handle] = React.useState(() => delayRender('anton font'));
  React.useEffect(() => {
    const face = new FontFace('Anton', `url(${staticFile('fonts/anton.woff2')})`);
    face.load().then((f) => document.fonts.add(f)).catch(() => {}).finally(() => continueRender(handle));
  }, [handle]);
  const d = episode.dsa;
  const total = d.total ?? 150;
  // long names break into one word per line, so each stays huge
  const lines: string[] = String(d.name).length > 10 ? String(d.name).split(' ') : [d.name];
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(lines.length > 1 ? 140 : 210, Math.floor(940 / (longest * 0.5)));
  const art: string[] = episode.cover?.art ?? [];
  return (
    <AbsoluteFill style={{background: BG}}>
      <div style={{position: 'absolute', top: 258, left: 0, right: 0, textAlign: 'center', fontFamily: ANTON, textTransform: 'uppercase'}}>
        <div style={{fontSize: 66, lineHeight: 1.2, color: WHITE, letterSpacing: 3}}>Popular LeetCode questions</div>
        <div style={{display: 'inline-block', marginTop: 8, background: YELLOW, color: '#101010', borderRadius: 28, padding: '0 44px', fontSize: 160, lineHeight: 1.24}}>
          {d.n}
          <span style={{fontSize: 96}}> / {total}</span>
        </div>
      </div>
      <div style={{position: 'absolute', top: 580, left: 40, right: 40, height: 340, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center'}}>
        {lines.map((l) => (
          <div key={l} style={{fontFamily: ANTON, fontSize: size, lineHeight: 1.14, color: WHITE, textTransform: 'uppercase'}}>
            {l}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', top: 940, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 24, fontFamily: ANTON, fontSize: 52, textTransform: 'uppercase'}}>
        <div style={{background: DIFF[d.difficulty] ?? GREEN, color: '#101010', borderRadius: 18, padding: '2px 32px'}}>{d.difficulty}</div>
        <div style={{border: `5px solid ${LINE}`, color: WHITE, borderRadius: 18, padding: '0 32px'}}>{d.category}</div>
      </div>
      {/* one tiny picture of the problem, and Debug Bro (his shoulders end behind the "prep for" panel) */}
      <div style={{position: 'absolute', top: 1070, left: 50, width: 560, height: 270, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20}}>
        <div style={{display: 'flex', gap: 16}}>
          {art.map((v, i) => (
            <div key={i} style={{width: Math.min(150, Math.floor(530 / art.length) - 12), height: 140, borderRadius: 22, background: CARD, border: `6px solid ${YELLOW}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 88, color: WHITE}}>{v}</div>
          ))}
        </div>
        <div style={{fontFamily: ANTON, fontSize: 76, lineHeight: 1.2, color: YELLOW, textTransform: 'uppercase'}}>{episode.cover?.note}</div>
      </div>
      <Bro pose={episode.cover?.pose ?? 'point'} width={310} x={680} y={1050} />
      <PrepFor />
    </AbsoluteFill>
  );
};

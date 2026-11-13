import React from 'react';
import {interpolate, random, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {C, FONT, TONE, fmtIN} from '../theme';
import {Avatar, Card, Cursor, Icon, Label, Pill, clamp01, ramp, typed, usePop} from '../components/ui';

type P<T = any> = {s: T; dur: number};

const Stage: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div
    style={{
      position: 'absolute',
      top: 300,
      left: 70,
      right: 70,
      height: 980,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ hook */
export const Hook: React.FC<P> = ({s}) => {
  const frame = useCurrentFrame();
  const words = s.title.split(' ');
  const kick = usePop(0);
  return (
    <Stage>
      <div style={{transform: `scale(${kick})`}}>
        <Pill text={s.kicker} color={C.amber} />
      </div>
      <div
        style={{
          marginTop: 50,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 900,
          fontSize: s.title.length > 34 ? 92 : 112,
          lineHeight: 1.05,
          letterSpacing: -2,
          color: C.text,
        }}
      >
        {words.map((w: string, i: number) => {
          const p = clamp01((frame - 4 - i * 3) / 9);
          const hot = /\?$|!$/.test(w) || i === words.length - 1;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: 24,
                opacity: p,
                transform: `translateY(${(1 - p) * 40}px) scale(${0.85 + 0.15 * p})`,
                color: hot ? C.amber : C.text,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      {s.sub ? (
        <div
          style={{
            marginTop: 44,
            fontFamily: FONT.mono,
            fontSize: 34,
            color: C.muted,
            textAlign: 'center',
            opacity: ramp(frame, 18, 30),
          }}
        >
          {s.sub}
        </div>
      ) : null}
    </Stage>
  );
};

/* ------------------------------------------------------------------ chat */
export const Chat: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const n = s.messages.length;
  return (
    <Stage style={{justifyContent: 'center', gap: 40, alignItems: 'stretch'}}>
      {s.messages.map((m: any, i: number) => {
        const start = (i / n) * dur * 0.55;
        const p = ramp(frame, start, start + 5);
        if (frame < start) return null;
        const left = m.side === 'left';
        const text = typed(m.text, frame, start + 2, 90);
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: left ? 'row' : 'row-reverse',
              alignItems: 'flex-start',
              gap: 22,
              opacity: p,
              transform: `translateY(${(1 - p) * 30}px)`,
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                flexShrink: 0,
                borderRadius: 42,
                border: `2px solid ${C.line}`,
                background: C.card,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {Icon.user(left ? C.muted : C.amber, 44)}
            </div>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: left ? 'flex-start' : 'flex-end', maxWidth: 760}}>
              <div style={{display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12}}>
                <Label text={m.name} style={{color: left ? C.muted : C.amber}} />
                {m.badge ? <Pill text={m.badge} color={C.amber} dot={false} style={{fontSize: 22, padding: '4px 14px'}} /> : null}
              </div>
              <Card style={{padding: '26px 32px', borderRadius: left ? '6px 26px 26px 26px' : '26px 6px 26px 26px'}}>
                <div style={{fontFamily: FONT.hindi, fontSize: 44, fontWeight: 700, color: C.text, lineHeight: 1.3}}>
                  {text}
                  {text.length < m.text.length ? <Cursor /> : null}
                </div>
              </Card>
            </div>
          </div>
        );
      })}
    </Stage>
  );
};

/* ------------------------------------------------------------------ code */
const KW = /\b(SELECT|UPDATE|INSERT|INTO|VALUES|SET|WHERE|FROM|DELETE|INCR|GET|DECR|EXPIRE|HSET|LPUSH|BEGIN|COMMIT|LOCK|FOR|AND|OR|ON|JOIN|return|await|const|if|else|async|function)\b/g;

const highlightLine = (line: string, marks: string[], markColor: string, showMarks: boolean) => {
  // tokenise into strings, keywords, numbers and plain text
  const parts: React.ReactNode[] = [];
  const re = /('[^']*'|"[^"]*"|\b\d+\b|\b[A-Za-z_]+\b|\s+|.)/g;
  let m: RegExpExecArray | null;
  let k = 0;
  const seen = line;
  while ((m = re.exec(seen))) {
    const tok = m[0];
    let color = C.text;
    if (/^['"]/.test(tok)) color = '#ff8fa3';
    else if (/^\d+$/.test(tok)) color = C.amber;
    else if (KW.test(tok)) color = C.blue;
    KW.lastIndex = 0;
    parts.push(
      <span key={k++} style={{color}}>
        {tok}
      </span>,
    );
  }
  if (!showMarks || !marks.length) return parts;
  // wrap marked substrings with a box
  const text = line;
  for (const mark of marks) {
    const idx = text.indexOf(mark);
    if (idx >= 0) {
      return [
        <span key="a">{highlightLine(text.slice(0, idx), [], markColor, false)}</span>,
        <span key="b" style={{background: `${markColor}33`, outline: `2px solid ${markColor}`, borderRadius: 6, padding: '0 4px'}}>
          {highlightLine(mark, [], markColor, false)}
        </span>,
        <span key="c">{highlightLine(text.slice(idx + mark.length), marks.filter((x) => x !== mark), markColor, true)}</span>,
      ];
    }
  }
  return parts;
};

export const Code: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const typeEnd = Math.min(dur * 0.3, 3 + (s.code.length / 110) * 30);
  const shown = typed(s.code, frame, 4, (s.code.length / Math.max(1, typeEnd - 4)) * 30);
  const done = shown.length >= s.code.length;
  const verdictColor = s.verdict === 'wrong' ? C.red : C.green;
  const stampP = usePop(Math.round(typeEnd) + 4, 10);
  const multP = ramp(frame, typeEnd + 10, dur * 0.9, Easing.out(Easing.quad));
  const multTarget = s.multiplier ? Number(String(s.multiplier).replace(/[^\d]/g, '')) : 0;
  return (
    <Stage>
      <Card
        style={{width: 940, padding: '34px 38px', position: 'relative'}}
        border={done && s.verdict ? `${verdictColor}88` : undefined}
        glow={done && s.verdict ? verdictColor : undefined}
      >
        {s.label ? <Label text={s.label} style={{marginBottom: 18}} /> : null}
        <pre style={{margin: 0, fontFamily: FONT.mono, fontSize: 40, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontWeight: 700}}>
          {shown.split('\n').map((ln: string, i: number) => (
            <div key={i}>{highlightLine(ln, s.highlight ?? [], s.verdict === 'wrong' ? C.red : C.amber, done)}</div>
          ))}
          {!done ? <Cursor color={C.green} /> : null}
        </pre>
        {s.verdict || s.stamp ? (
          <div
            style={{
              position: 'absolute',
              top: -30,
              right: 30,
              transform: `scale(${stampP}) rotate(-6deg)`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              borderRadius: 14,
              border: `3px solid ${verdictColor}`,
              background: C.bg,
              color: verdictColor,
              fontFamily: FONT.mono,
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: 1,
            }}
          >
            {s.verdict === 'wrong' ? Icon.cross(verdictColor, 26) : Icon.check(verdictColor, 26)}
            {(s.stamp ?? (s.verdict === 'wrong' ? 'WRONG' : 'CORRECT')).toUpperCase()}
          </div>
        ) : null}
      </Card>
      {s.multiplier ? (
        <div style={{marginTop: 70, textAlign: 'center', opacity: ramp(frame, typeEnd + 6, typeEnd + 14)}}>
          <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 120, color: C.amber, textShadow: `0 0 40px ${C.amber}66`}}>
            × {fmtIN(multTarget * multP)}
          </div>
          {s.multiplierLabel ? <Label text={s.multiplierLabel} style={{color: C.red, marginTop: 10}} /> : null}
        </div>
      ) : null}
    </Stage>
  );
};

/* ------------------------------------------------------------------ flood */
export const Flood: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const N = 34;
  const cx = 470;
  const cy = 520;
  let landed = 0;
  const flyers = Array.from({length: N}).map((_, i) => {
    const t0 = (i / N) * dur * 0.8;
    const side = i % 2 ? 1 : -1;
    const sy = 120 + random(`y${i}`) * 780;
    const sx = side > 0 ? 960 : -40;
    const p = clamp01((frame - t0) / 22);
    if (p >= 1) landed++;
    if (frame < t0 || p >= 1) return null;
    const e = Easing.in(Easing.quad)(p);
    return (
      <div key={i} style={{position: 'absolute', left: sx + (cx - sx) * e - 27, top: sy + (cy - sy) * e - 27, opacity: 1 - p * 0.3}}>
        <Avatar seed={i} />
      </div>
    );
  });
  const phones = [0, 1, 2].flatMap((r) => [
    {x: 20, y: 120 + r * 270},
    {x: 820, y: 120 + r * 270},
  ]);
  return (
    <Stage>
      <div style={{position: 'relative', width: 940, height: 980}}>
        {phones.map((ph, i) => {
          const pulse = 1 + 0.15 * Math.max(0, Math.sin((frame + i * 9) / 5));
          return (
            <Card key={i} style={{position: 'absolute', left: ph.x, top: ph.y, width: 100, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20}}>
              <div style={{transform: `scale(${pulse})`}}>{Icon.heart(C.red, 46)}</div>
            </Card>
          );
        })}
        {/* cylinder */}
        <div style={{position: 'absolute', left: cx - 190, top: cy - 120, width: 380, transform: `scale(${1 + 0.02 * Math.sin(frame / 3)})`}}>
          <svg width={380} height={250} viewBox="0 0 380 250">
            <path d="M10 45 v160 a180 40 0 0 0 360 0 v-160" fill={`${C.green}10`} stroke={C.green} strokeWidth={4} />
            <ellipse cx={190} cy={45} rx={180} ry={40} fill={C.card} stroke={C.green} strokeWidth={4} />
          </svg>
          <div style={{position: 'absolute', top: 110, width: '100%', textAlign: 'center'}}>
            <Label text="DATABASE" style={{fontSize: 18}} />
            <div style={{fontFamily: FONT.mono, fontSize: 36, fontWeight: 800, color: C.text}}>{s.target}</div>
          </div>
        </div>
        <div style={{position: 'absolute', left: cx - 120, top: cy + 160, width: 240, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 800, fontSize: 44, color: C.green}}>
          +{fmtIN(landed * 1234 + Math.floor(frame * 37))}
        </div>
        {flyers}
        <div style={{position: 'absolute', bottom: 20, width: '100%', textAlign: 'center'}}>
          <div style={{fontFamily: FONT.mono, fontSize: 56, fontWeight: 800, color: C.amber}}>{s.total}</div>
          {s.sub ? <Label text={s.sub} style={{marginTop: 8}} /> : null}
        </div>
      </div>
    </Stage>
  );
};

/* ------------------------------------------------------------------ hotrow */
export const HotRow: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const p = ramp(frame, 6, dur * 0.85, Easing.inOut(Easing.quad));
  const val = s.from + (s.to - s.from) * p;
  const meter = 0.35 + 0.65 * ramp(frame, dur * 0.15, dur * 0.8, Easing.in(Easing.quad));
  const full = meter > 0.98;
  const queue = Math.min(9, Math.floor(2 + p * 9));
  const shake = full ? Math.sin(frame * 2.3) * 4 : 0;
  const hotPop = usePop(10);
  return (
    <Stage style={{gap: 40}}>
      <Card style={{width: 940, padding: 28, position: 'relative'}} border={`${C.line}`}>
        <Label text={`TABLE · ${s.valueLabel}`} style={{marginBottom: 14}} />
        {s.rows.map((r: string, i: number) => {
          const hot = i === s.hot;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '18px 22px',
                marginTop: 8,
                borderRadius: 14,
                fontFamily: FONT.mono,
                fontSize: 34,
                fontWeight: 700,
                color: hot ? C.text : C.dim,
                background: hot ? `${C.red}22` : 'transparent',
                border: hot ? `2px solid ${C.red}` : `2px solid transparent`,
                transform: hot ? `translateX(${shake}px)` : undefined,
              }}
            >
              <span>{r}</span>
              <span style={{color: hot ? C.red : C.dim}}>{hot ? fmtIN(val) : fmtIN(37 + i * 113)}</span>
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            top: -28,
            right: 26,
            transform: `scale(${hotPop}) rotate(5deg)`,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '8px 18px',
            borderRadius: 12,
            background: C.bg,
            border: `3px solid ${C.red}`,
            color: C.red,
            fontFamily: FONT.mono,
            fontWeight: 800,
            fontSize: 28,
          }}
        >
          {Icon.flame(C.red, 28)} HOT KEY
        </div>
      </Card>
      <div style={{display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', width: 940}}>
        {Array.from({length: queue}).map((_, i) => (
          <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
            <Avatar seed={100 + i} size={68} />
            <div style={{fontFamily: FONT.mono, fontSize: 18, color: C.amber}}>WAIT</div>
          </div>
        ))}
      </div>
      <div style={{width: 940}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
          <Label text={s.meterLabel} />
          <span style={{fontFamily: FONT.mono, fontSize: 28, fontWeight: 800, color: full ? C.red : C.amber}}>
            {Math.round(meter * s.meterMax)}/{s.meterMax}
          </span>
        </div>
        <div style={{height: 26, borderRadius: 13, background: C.card, border: `2px solid ${C.line}`, overflow: 'hidden'}}>
          <div style={{width: `${meter * 100}%`, height: '100%', background: full ? C.red : `linear-gradient(90deg, ${C.green}, ${C.amber})`}} />
        </div>
      </div>
      <div style={{opacity: full ? (Math.floor(frame / 6) % 2 ? 0.45 : 1) : 0}}>
        <Pill text={s.alert} color={C.red} />
      </div>
    </Stage>
  );
};

/* ------------------------------------------------------------------ counter */
export const Counter: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const color = TONE[s.tone ?? 'amber'];
  const v = s.from + (s.to - s.from) * ramp(frame, 4, dur * 0.75, Easing.out(Easing.cubic));
  const pop = usePop(0);
  return (
    <Stage>
      <Label text={s.label} style={{fontSize: 30, color: C.muted}} />
      <div
        style={{
          marginTop: 30,
          fontFamily: FONT.mono,
          fontWeight: 800,
          fontSize: fmtIN(s.to).length > 9 ? 130 : 170,
          color,
          transform: `scale(${pop})`,
          textShadow: `0 0 60px ${color}66`,
        }}
      >
        {fmtIN(v)}
      </div>
      {s.sub ? (
        <div style={{marginTop: 30, fontFamily: FONT.hindi, fontSize: 42, fontWeight: 700, color: C.text, textAlign: 'center', opacity: ramp(frame, 12, 22)}}>
          {s.sub}
        </div>
      ) : null}
    </Stage>
  );
};

/* ------------------------------------------------------------------ solution */
export const Solution: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const pop = usePop(4, 11);
  const flicker = frame < 14 ? (frame % 4 < 2 ? 0.4 : 1) : 1;
  const chip = (s.chipValue ?? 0) * ramp(frame, 18, dur * 0.95, Easing.linear);
  return (
    <Stage>
      <Label text={s.kicker} style={{fontSize: 30, color: C.green}} />
      <div
        style={{
          marginTop: 24,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 900,
          fontSize: s.title.length > 18 ? 104 : 128,
          lineHeight: 1,
          letterSpacing: -2,
          color: C.green,
          opacity: flicker,
          transform: `scale(${0.8 + 0.2 * pop})`,
          textShadow: `0 0 30px ${C.green}aa, 0 0 80px ${C.green}55`,
          textTransform: 'uppercase',
        }}
      >
        {s.title}
      </div>
      <div style={{marginTop: 40, transform: `scale(${pop}) translateY(${Math.sin(frame / 6) * 6}px)`, filter: `drop-shadow(0 0 20px ${C.green})`}}>
        {Icon.bolt(C.green, 120)}
      </div>
      {s.sub ? (
        <div style={{marginTop: 30, fontFamily: FONT.hindi, fontSize: 40, color: C.text, fontWeight: 700, textAlign: 'center', opacity: ramp(frame, 14, 24)}}>{s.sub}</div>
      ) : null}
      {s.chipLabel ? (
        <Card style={{marginTop: 50, width: 860, padding: '26px 34px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: ramp(frame, 16, 26)}} border={`${C.green}88`} glow={C.green}>
          <span style={{display: 'flex', gap: 12, alignItems: 'center', fontFamily: FONT.sans, fontWeight: 800, fontSize: 36, color: C.green}}>
            {Icon.bolt(C.green, 32)} {s.chipLabel}
          </span>
          <span style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 48, color: C.text}}>{fmtIN(chip)}</span>
        </Card>
      ) : null}
    </Stage>
  );
};

/* ------------------------------------------------------------------ batch (fast tier → slow tier) */
export const Batch: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const fast = s.fastTo * ramp(frame, 0, dur * 0.95, Easing.linear);
  const flushes = 4;
  const period = dur / (flushes + 0.3);
  const k = Math.min(flushes, Math.floor(frame / period));
  const slow = s.slowFrom + ((s.slowTo - s.slowFrom) * k) / flushes;
  const inFlush = (frame % period) / period;
  const packetP = clamp01(inFlush * 4);
  const ring = inFlush;
  const N = 10;
  return (
    <Stage style={{gap: 0}}>
      <div style={{position: 'relative', width: 940, height: 200}}>
        {Array.from({length: N}).map((_, i) => {
          const t = ((frame + i * 7) % 28) / 28;
          const x = 60 + i * 90;
          return (
            <div key={i} style={{position: 'absolute', left: x, top: 10 + t * 160, opacity: 1 - t}}>
              <Avatar seed={300 + i} size={50} />
            </div>
          );
        })}
      </div>
      <Card style={{width: 640, padding: '30px 36px', position: 'relative'}} border={C.red} glow={C.red}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span style={{display: 'flex', gap: 10, alignItems: 'center', fontFamily: FONT.sans, fontWeight: 800, fontSize: 38, color: C.red}}>
            {Icon.bolt(C.red, 34)} {s.fastLabel}
          </span>
          <svg width={64} height={64} viewBox="0 0 64 64">
            <circle cx={32} cy={32} r={26} stroke={C.line} strokeWidth={6} fill="none" />
            <circle cx={32} cy={32} r={26} stroke={C.amber} strokeWidth={6} fill="none" strokeDasharray={163} strokeDashoffset={163 * (1 - ring)} transform="rotate(-90 32 32)" />
          </svg>
        </div>
        <Label text={s.fastSub} style={{marginTop: 6}} />
        <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 84, color: C.text, marginTop: 8}}>{fmtIN(fast)}</div>
      </Card>
      <div style={{position: 'relative', height: 170, width: 10}}>
        <div style={{position: 'absolute', left: 3, top: 0, bottom: 0, borderLeft: `4px dashed ${C.dim}`}} />
        {packetP < 1 ? (
          <div
            style={{
              position: 'absolute',
              left: -16,
              top: packetP * 140,
              width: 42,
              height: 42,
              borderRadius: 10,
              background: C.amber,
              boxShadow: `0 0 24px ${C.amber}`,
            }}
          />
        ) : null}
      </div>
      <Card style={{width: 940, padding: '28px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <Label text={s.slowSub} />
          <div style={{display: 'flex', gap: 14, alignItems: 'center', fontFamily: FONT.mono, fontWeight: 800, fontSize: 40, color: C.text, marginTop: 6}}>
            {Icon.db(C.muted, 38)} {s.slowLabel}
          </div>
        </div>
        <div style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 54, color: C.green}}>{fmtIN(slow)}</div>
      </Card>
      <div style={{marginTop: 34}}>
        <Pill text={s.every} color={C.green} />
      </div>
    </Stage>
  );
};

/* ------------------------------------------------------------------ flow */
export const Flow: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const n = s.nodes.length;
  const seg = (dur * 0.85) / n;
  const active = Math.min(n - 1, Math.floor(frame / seg));
  const within = clamp01((frame % seg) / seg);
  return (
    <Stage style={{gap: 0}}>
      {s.nodes.map((nd: any, i: number) => {
        const on = i <= active;
        const appear = ramp(frame, i * 5, i * 5 + 10);
        return (
          <React.Fragment key={i}>
            <Card
              style={{
                width: 800,
                padding: '28px 36px',
                opacity: appear,
                transform: `translateY(${(1 - appear) * 20}px) scale(${i === active ? 1.03 : 1})`,
              }}
              border={on ? C.green : undefined}
              glow={i === active ? C.green : undefined}
            >
              <div style={{fontFamily: FONT.sans, fontWeight: 800, fontSize: 46, color: on ? C.text : C.muted}}>{nd.label}</div>
              {nd.sub ? <Label text={nd.sub} style={{marginTop: 6}} /> : null}
            </Card>
            {i < n - 1 ? (
              <div style={{position: 'relative', height: 90, width: 10}}>
                <div style={{position: 'absolute', left: 3, top: 0, bottom: 0, borderLeft: `4px solid ${i < active ? C.green : C.line}`}} />
                {i === active ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: -15,
                      top: within * 60,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: C.amber,
                      color: C.bg,
                      fontFamily: FONT.mono,
                      fontWeight: 800,
                      fontSize: 18,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.packet ?? 'req'}
                  </div>
                ) : null}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </Stage>
  );
};

/* ------------------------------------------------------------------ compare */
export const Compare: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const col = (side: any, good: boolean, offset: number) => {
    const color = good ? C.green : C.red;
    return (
      <Card style={{flex: 1, padding: 28}} border={`${color}88`} glow={color}>
        <div style={{fontFamily: FONT.sans, fontWeight: 900, fontSize: 40, color, marginBottom: 20}}>{side.title}</div>
        {side.items.map((it: string, i: number) => {
          const p = ramp(frame, offset + i * (dur * 0.08), offset + i * (dur * 0.08) + 8);
          return (
            <div key={i} style={{display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 18, opacity: p, transform: `translateX(${(1 - p) * 20}px)`}}>
              <div style={{flexShrink: 0, marginTop: 4}}>{good ? Icon.check(color, 30) : Icon.cross(color, 30)}</div>
              <div style={{fontFamily: FONT.hindi, fontWeight: 700, fontSize: 34, color: C.text, lineHeight: 1.3}}>{it}</div>
            </div>
          );
        })}
      </Card>
    );
  };
  return (
    <Stage>
      <div style={{display: 'flex', gap: 24, width: 940}}>
        {col(s.left, false, 4)}
        {col(s.right, true, dur * 0.4)}
      </div>
    </Stage>
  );
};

/* ------------------------------------------------------------------ crash */
export const Crash: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const at = dur * 0.45;
  const broken = frame >= at;
  const crack = ramp(frame, at, at + 8);
  const shake = broken && frame < at + 14 ? Math.sin(frame * 3) * 12 : 0;
  const glitch = broken && frame % 7 < 2;
  return (
    <Stage style={{gap: 50}}>
      {s.quote ? (
        <Card style={{padding: '24px 30px', maxWidth: 820, alignSelf: 'flex-start', opacity: ramp(frame, 0, 8)}}>
          <div style={{fontFamily: FONT.hindi, fontSize: 40, fontWeight: 700, color: C.text}}>{s.quote}</div>
        </Card>
      ) : null}
      <div style={{position: 'relative', transform: `translateX(${shake}px) rotate(${broken ? -2 : 0}deg)`}}>
        <Card style={{width: 640, padding: '36px 40px', textAlign: 'center'}} border={broken ? C.red : C.line} glow={broken ? C.red : undefined}>
          <div style={{display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', fontFamily: FONT.sans, fontWeight: 800, fontSize: 40, color: C.red}}>
            {Icon.bolt(C.red, 36)} {s.label}
          </div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontWeight: 800,
              fontSize: 110,
              color: broken ? C.dim : C.text,
              marginTop: 10,
              transform: glitch ? 'translateX(8px)' : undefined,
              textShadow: glitch ? `-6px 0 ${C.red}, 6px 0 ${C.blue}` : undefined,
            }}
          >
            {broken && frame > at + 12 ? '0' : fmtIN(s.value)}
          </div>
        </Card>
        <svg width={640} height={300} viewBox="0 0 640 300" style={{position: 'absolute', left: 0, top: 0}}>
          <path
            d="M330 0 L300 70 L345 120 L290 180 L335 230 L310 300"
            stroke={C.red}
            strokeWidth={8}
            fill="none"
            strokeDasharray={420}
            strokeDashoffset={420 * (1 - crack)}
            style={{filter: `drop-shadow(0 0 10px ${C.red})`}}
          />
        </svg>
      </div>
    </Stage>
  );
};

/* ------------------------------------------------------------------ rule / outro */
export const Rule: React.FC<P> = ({s, dur}) => {
  const frame = useCurrentFrame();
  const pop = usePop(2);
  const ctaP = ramp(frame, dur * 0.35, dur * 0.35 + 10);
  const plane = ramp(frame, dur * 0.45, dur * 0.75, Easing.inOut(Easing.cubic));
  return (
    <Stage style={{gap: 50}}>
      <Card style={{width: 940, padding: '44px 44px', transform: `scale(${0.9 + 0.1 * pop})`, opacity: pop}} border={C.green} glow={C.green}>
        <Label text="YAAD RAKHO" style={{color: C.green, fontSize: 26}} />
        <div style={{marginTop: 18, fontFamily: FONT.hindi, fontWeight: 700, fontSize: 56, lineHeight: 1.3, color: C.text}}>{s.rule}</div>
      </Card>
      <div style={{display: 'flex', alignItems: 'center', gap: 22, opacity: ctaP, width: 900}}>
        <div style={{flexShrink: 0, transform: `translateY(${-Math.sin(plane * Math.PI) * 18}px) rotate(${plane * 12}deg)`}}>{Icon.send(C.blue, 70)}</div>
        <div style={{fontFamily: FONT.hindi, fontWeight: 700, fontSize: 42, color: C.blue, lineHeight: 1.3}}>{s.cta}</div>
      </div>
      {s.next ? (
        <div style={{opacity: ramp(frame, dur * 0.6, dur * 0.6 + 10)}}>
          <Pill text={s.next} color={C.amber} />
        </div>
      ) : null}
    </Stage>
  );
};

/* ------------------------------------------------------------------ cold open */
export const ColdOpen: React.FC<P> = ({s}) => {
  const frame = useCurrentFrame();
  const ticks: string[] = s.tick ?? [];
  const tickEnd = ticks.length * 6;
  const crashAt = tickEnd + 2;
  const crashed = frame >= crashAt;
  const shake = crashed && frame < crashAt + 10 ? Math.sin(frame * 3.1) * 16 : 0;
  const errPop = usePop(crashAt, 9);
  const qAt = crashAt + 8;
  const qWords = String(s.question).split(' ');
  const flash = crashed && frame < crashAt + 3 ? 0.35 : 0;
  const glitch = crashed && frame < crashAt + 16 && frame % 4 < 2;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: '#ff2d55', opacity: flash}} />
      <Stage style={{transform: `translate(${shake}px, ${shake * 0.4}px)`, justifyContent: 'flex-start', paddingTop: 120}}>
        <div style={{fontFamily: FONT.mono, fontSize: 30, letterSpacing: 4, color: C.muted, fontWeight: 700, textTransform: 'uppercase'}}>{s.setup}</div>
        {ticks.length ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: FONT.mono,
              fontWeight: 800,
              fontSize: Math.min(150, Math.floor(1450 / Math.max(6, (ticks[ticks.length - 1] || '').length))),
              color: crashed ? C.red : C.text,
              textShadow: glitch ? `-8px 0 ${C.red}, 8px 0 ${C.blue}` : crashed ? `0 0 40px ${C.red}88` : 'none',
              transform: glitch ? 'translateX(10px) skewX(-6deg)' : undefined,
            }}
          >
            {ticks[Math.min(ticks.length - 1, Math.floor(frame / 6))]}
          </div>
        ) : null}
        <div style={{marginTop: 30, transform: `scale(${crashed ? 0.6 + 0.4 * errPop : 0})`}}>
          <Card style={{padding: '26px 36px', display: 'flex', alignItems: 'center', gap: 18}} border={C.red} glow={C.red}>
            {Icon.cross(C.red, 46)}
            <span style={{fontFamily: FONT.mono, fontWeight: 800, fontSize: 40, color: C.red}}>{s.error}</span>
          </Card>
        </div>
        <div
          style={{
            marginTop: 60,
            textAlign: 'center',
            fontFamily: FONT.sans,
            fontWeight: 900,
            fontSize: s.question.length > 30 ? 92 : 108,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          {qWords.map((w: string, i: number) => {
            const p = clamp01((frame - qAt - i * 2) / 5);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  marginRight: 22,
                  opacity: p,
                  transform: `scale(${1.6 - 0.6 * p})`,
                  color: i === qWords.length - 1 ? C.amber : C.text,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </Stage>
    </>
  );
};

/** Frames (from scene start) where a scene wants an extra sound effect. */
export const sceneSfx = (s: any, dur: number): {at: number; src: string; vol: number}[] => {
  switch (s.type) {
    case 'coldopen': {
      const n = (s.tick ?? []).length;
      return [
        ...Array.from({length: n}, (_, i) => ({at: i * 6, src: 'sfx/tick.wav', vol: 0.5})),
        {at: n * 6 + 2, src: 'sfx/glitch.wav', vol: 0.6},
        {at: n * 6 + 2, src: 'sfx/thump.wav', vol: 0.8},
      ];
    }
    case 'crash':
      return [{at: Math.round(dur * 0.45), src: 'sfx/glitch.wav', vol: 0.55}];
    case 'hotrow':
      return [{at: Math.round(dur * 0.8), src: 'sfx/glitch.wav', vol: 0.4}];
    case 'code':
      return s.verdict ? [{at: Math.round(Math.min(dur * 0.3, 3 + (s.code.length / 110) * 30)) + 4, src: s.verdict === 'wrong' ? 'sfx/glitch.wav' : 'sfx/ding.wav', vol: 0.4}] : [];
    case 'solution':
      return [{at: 4, src: 'sfx/ding.wav', vol: 0.45}];
    case 'rule':
      return [{at: 2, src: 'sfx/thump.wav', vol: 0.6}];
    default:
      return [];
  }
};

export const SCENES: Record<string, React.FC<P>> = {
  coldopen: ColdOpen,
  hook: Hook,
  chat: Chat,
  code: Code,
  flood: Flood,
  hotrow: HotRow,
  counter: Counter,
  solution: Solution,
  batch: Batch,
  flow: Flow,
  compare: Compare,
  crash: Crash,
  rule: Rule,
};

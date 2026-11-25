import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, random} from 'remotion';

/**
 * Debug Bro: a vector puppet of Asit (curly hair, full beard, open dotted charcoal shirt over a blue-white striped
 * tee, tan-strap watch). Waist-up, viewBox 400x560. Arms are 2-bone IK rigs, so a pose is just where the hands go.
 */
export const POSES = ['idle', 'point', 'explain', 'think', 'shock', 'facepalm', 'thumbsup', 'shrug', 'crossed', 'laugh'] as const;
export type PoseName = (typeof POSES)[number];

/** Which character: Debug Bro (Asit) or the Intern (a young woman developer in a teal hoodie, for dialogue scenes). */
export type Variant = 'bro' | 'intern';
const VCtx = React.createContext<Variant>('bro');
const HOODIE = '#1fa391';
const HOODIE_HI = '#28c2ac';
const INTERN_HAIR = '#1a1310';

const OUT = '#1b1412';
const SKIN = '#e2ab88';
const SKIN_SH = '#c98e6c';
const HAIR = '#2a1d17';
const HAIR_HI = '#47322a';
const SHIRT = '#2a2c33';
const SHIRT_HI = '#3a3d46';
const BLUE = '#2f6fd6';
const TAN = '#b8783a';

type Hand = 'fist' | 'open' | 'point' | 'thumb' | 'hidden';
type Arm = {x: number; y: number; hand: Hand; bend?: 'out' | 'down' | 'in'; rot?: number};
type Face = {brow: number; browTilt: number; eyes: 'open' | 'wide' | 'closed' | 'up' | 'side'; mouth: 'smile' | 'flat' | 'o' | 'grin' | 'smirk' | 'laugh'};
type Pose = {l: Arm; r: Arm; face: Face; lift?: number; tilt?: number};

const DOWN_L: Arm = {x: 112, y: 660, hand: 'hidden', bend: 'out'};
const DOWN_R: Arm = {x: 288, y: 660, hand: 'hidden', bend: 'out'};

const P: Record<PoseName, Pose> = {
  idle: {l: DOWN_L, r: DOWN_R, face: {brow: 0, browTilt: 0, eyes: 'open', mouth: 'smile'}},
  point: {l: DOWN_L, r: {x: 348, y: 140, hand: 'point', bend: 'out'}, face: {brow: -4, browTilt: 0, eyes: 'side', mouth: 'grin'}, tilt: 3},
  explain: {l: {x: 92, y: 440, hand: 'open', bend: 'out', rot: 200}, r: {x: 308, y: 440, hand: 'open', bend: 'out', rot: -20}, face: {brow: -3, browTilt: 0, eyes: 'open', mouth: 'grin'}},
  think: {l: DOWN_L, r: {x: 222, y: 300, hand: 'fist', bend: 'down'}, face: {brow: -2, browTilt: 8, eyes: 'up', mouth: 'flat'}, tilt: -4},
  shock: {l: {x: 128, y: 132, hand: 'open', bend: 'out', rot: 250}, r: {x: 272, y: 132, hand: 'open', bend: 'out', rot: -70}, face: {brow: -12, browTilt: 0, eyes: 'wide', mouth: 'o'}, lift: -6},
  facepalm: {l: DOWN_L, r: {x: 214, y: 196, hand: 'open', bend: 'down', rot: -100}, face: {brow: 4, browTilt: -6, eyes: 'closed', mouth: 'flat'}, tilt: 5},
  thumbsup: {l: DOWN_L, r: {x: 336, y: 330, hand: 'thumb', bend: 'down'}, face: {brow: -5, browTilt: 0, eyes: 'open', mouth: 'grin'}, tilt: 3},
  shrug: {l: {x: 36, y: 400, hand: 'open', bend: 'down', rot: 180}, r: {x: 364, y: 400, hand: 'open', bend: 'down', rot: 0}, face: {brow: -9, browTilt: 0, eyes: 'side', mouth: 'smirk'}, lift: -10, tilt: -3},
  crossed: {l: {x: 292, y: 470, hand: 'fist', bend: 'down'}, r: {x: 108, y: 462, hand: 'fist', bend: 'down'}, face: {brow: 2, browTilt: 4, eyes: 'open', mouth: 'smirk'}},
  laugh: {l: {x: 140, y: 480, hand: 'fist', bend: 'down'}, r: {x: 262, y: 480, hand: 'fist', bend: 'down'}, face: {brow: -6, browTilt: 0, eyes: 'closed', mouth: 'laugh'}, tilt: 4},
};

const SH_L = {x: 96, y: 362};
const SH_R = {x: 304, y: 362};
const L1 = 126;
const L2 = 118;

function ik(sh: {x: number; y: number}, t: {x: number; y: number}, bend: 'out' | 'down' | 'in') {
  const dx = t.x - sh.x;
  const dy = t.y - sh.y;
  const d = Math.max(Math.abs(L1 - L2) + 4, Math.min(Math.hypot(dx, dy), L1 + L2 - 1));
  const a = Math.atan2(dy, dx);
  const alpha = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  const cands = [a + alpha, a - alpha].map((ang) => ({x: sh.x + L1 * Math.cos(ang), y: sh.y + L1 * Math.sin(ang)}));
  const pick =
    bend === 'down'
      ? cands[0].y > cands[1].y ? cands[0] : cands[1]
      : bend === 'in'
        ? Math.abs(cands[0].x - 200) < Math.abs(cands[1].x - 200) ? cands[0] : cands[1]
        : Math.abs(cands[0].x - 200) > Math.abs(cands[1].x - 200) ? cands[0] : cands[1];
  const wrist = {x: sh.x + d * Math.cos(a), y: sh.y + d * Math.sin(a)};
  return {elbow: pick, wrist};
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixArm = (a: Arm, b: Arm, t: number): Arm => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  hand: t < 0.5 ? a.hand : b.hand,
  bend: t < 0.5 ? a.bend : b.bend,
  rot: a.rot === undefined && b.rot === undefined ? undefined : mix(a.rot ?? b.rot ?? 0, b.rot ?? a.rot ?? 0, t),
});

/** Thick outlined limb segment. */
const Limb: React.FC<{a: {x: number; y: number}; b: {x: number; y: number}; w: number; color: string}> = ({a, b, w, color}) => (
  <>
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={OUT} strokeWidth={w + 10} strokeLinecap="round" />
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={w} strokeLinecap="round" />
  </>
);

const HandShape: React.FC<{at: {x: number; y: number}; deg: number; kind: Hand}> = ({at, deg, kind}) => {
  if (kind === 'hidden') return null;
  const s = {stroke: OUT, strokeWidth: 5, strokeLinejoin: 'round' as const};
  return (
    <g transform={`translate(${at.x} ${at.y}) rotate(${deg}) scale(1.45)`}>
      {kind === 'open' ? (
        <>
          {[-22, -8, 6, 20].map((a, i) => (
            <g key={i} transform={`rotate(${a})`}>
              <line x1={14} y1={0} x2={44 - Math.abs(i - 1.5) * 4} y2={0} stroke={OUT} strokeWidth={17} strokeLinecap="round" />
              <line x1={14} y1={0} x2={44 - Math.abs(i - 1.5) * 4} y2={0} stroke={SKIN} strokeWidth={9} strokeLinecap="round" />
            </g>
          ))}
          <g transform="rotate(-62)">
            <line x1={8} y1={0} x2={30} y2={0} stroke={OUT} strokeWidth={17} strokeLinecap="round" />
            <line x1={8} y1={0} x2={30} y2={0} stroke={SKIN} strokeWidth={9} strokeLinecap="round" />
          </g>
          <ellipse cx={14} cy={0} rx={20} ry={21} fill={SKIN} {...s} />
        </>
      ) : (
        <>
          {kind === 'point' ? (
            <>
              <line x1={14} y1={-6} x2={58} y2={-6} stroke={OUT} strokeWidth={18} strokeLinecap="round" />
              <line x1={14} y1={-6} x2={58} y2={-6} stroke={SKIN} strokeWidth={9} strokeLinecap="round" />
            </>
          ) : null}
          <ellipse cx={16} cy={0} rx={22} ry={20} fill={SKIN} {...s} />
          <path d="M 26 -12 Q 34 0 26 12" fill="none" stroke={SKIN_SH} strokeWidth={4} strokeLinecap="round" />
          {kind === 'thumb' ? (
            <g transform={`rotate(${-deg - 90} 10 -8)`}>
              <line x1={10} y1={-8} x2={40} y2={-8} stroke={OUT} strokeWidth={19} strokeLinecap="round" />
              <line x1={10} y1={-8} x2={40} y2={-8} stroke={SKIN} strokeWidth={10} strokeLinecap="round" />
            </g>
          ) : null}
        </>
      )}
    </g>
  );
};

const ArmRig: React.FC<{side: 'l' | 'r'; arm: Arm; lift: number}> = ({side, arm, lift}) => {
  const sh0 = side === 'l' ? SH_L : SH_R;
  const sh = {x: sh0.x, y: sh0.y + lift};
  const {elbow, wrist} = ik(sh, arm, arm.bend ?? 'out');
  const fdeg = (Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) * 180) / Math.PI;
  const cuff = {x: mix(sh.x, elbow.x, 0.9), y: mix(sh.y, elbow.y, 0.9)};
  const v = React.useContext(VCtx);
  const watch = side === 'r' && v === 'bro' ? {x: mix(elbow.x, wrist.x, 0.84), y: mix(elbow.y, wrist.y, 0.84)} : null;
  return (
    <g>
      {v === 'intern' ? (
        <>
          <Limb a={sh} b={elbow} w={56} color={HOODIE} />
          <Limb a={elbow} b={{x: mix(elbow.x, wrist.x, 0.82), y: mix(elbow.y, wrist.y, 0.82)}} w={50} color={HOODIE} />
          <Limb a={{x: mix(elbow.x, wrist.x, 0.8), y: mix(elbow.y, wrist.y, 0.8)}} b={{x: mix(elbow.x, wrist.x, 0.86), y: mix(elbow.y, wrist.y, 0.86)}} w={54} color={HOODIE_HI} />
          <Limb a={{x: mix(elbow.x, wrist.x, 0.86), y: mix(elbow.y, wrist.y, 0.86)}} b={wrist} w={36} color={SKIN} />
        </>
      ) : (
        <>
          <Limb a={sh} b={elbow} w={54} color={SHIRT} />
          <Limb a={cuff} b={elbow} w={58} color={SHIRT_HI} />
          <Limb a={elbow} b={wrist} w={38} color={SKIN} />
        </>
      )}
      {watch ? (
        <g transform={`translate(${watch.x} ${watch.y}) rotate(${fdeg + 90})`}>
          <rect x={-24} y={-8} width={48} height={16} rx={5} fill={TAN} stroke={OUT} strokeWidth={4} />
          <circle cx={0} cy={0} r={10} fill="#d9dde3" stroke={OUT} strokeWidth={4} />
        </g>
      ) : null}
      <HandShape at={wrist} deg={arm.rot ?? fdeg} kind={arm.hand} />
    </g>
  );
};

const Eyes: React.FC<{face: Face; blink: number}> = ({face, blink}) => {
  const look = face.eyes === 'up' ? {x: 3, y: -4} : face.eyes === 'side' ? {x: 5, y: 0} : {x: 0, y: 0};
  return (
    <>
      {[168, 232].map((x, i) => {
        if (face.eyes === 'closed' || blink > 0.6)
          return <path key={i} d={`M ${x - 15} 197 Q ${x} ${face.mouth === 'laugh' ? 186 : 203} ${x + 15} 197`} fill="none" stroke={OUT} strokeWidth={6} strokeLinecap="round" />;
        const ry = (face.eyes === 'wide' ? 14 : 10) * (1 - blink);
        return (
          <g key={i}>
            <ellipse cx={x} cy={197} rx={face.eyes === 'wide' ? 17 : 15} ry={ry} fill="#fbf7f2" stroke={OUT} strokeWidth={4.5} />
            <circle cx={x + look.x} cy={197 + look.y} r={face.eyes === 'wide' ? 6 : 7.5} fill="#2b1a12" />
            <circle cx={x + look.x + 2.5} cy={194 + look.y} r={2.2} fill="#fff" />
            <path d={`M ${x - 17} ${195 - ry} Q ${x} ${189 - ry * 1.2} ${x + 17} ${195 - ry}`} fill="none" stroke={OUT} strokeWidth={6} strokeLinecap="round" />
          </g>
        );
      })}
    </>
  );
};

const Mouth: React.FC<{face: Face; open: number}> = ({face, open}) => {
  const o = Math.max(open, face.mouth === 'o' ? 0.8 : face.mouth === 'laugh' ? 0.9 : 0);
  if (o > 0.08) {
    const rx = face.mouth === 'o' ? 11 : face.mouth === 'laugh' || face.mouth === 'grin' ? 20 : 15;
    const ry = 3 + o * 13;
    return (
      <g>
        <ellipse cx={200} cy={272} rx={rx + 3} ry={ry + 3} fill="#c97c69" />
        <ellipse cx={200} cy={272} rx={rx} ry={ry} fill="#4a1414" stroke={OUT} strokeWidth={3.5} />
        {ry > 6 ? <rect x={200 - rx * 0.7} y={272 - ry + 1} width={rx * 1.4} height={Math.min(6, ry * 0.4)} rx={2} fill="#fff" /> : null}
        {ry > 9 ? <ellipse cx={200} cy={272 + ry * 0.5} rx={rx * 0.55} ry={ry * 0.35} fill="#c2474a" /> : null}
      </g>
    );
  }
  const d =
    face.mouth === 'flat' ? 'M 186 272 L 214 272'
    : face.mouth === 'smirk' ? 'M 184 274 Q 202 276 218 266'
    : face.mouth === 'grin' ? 'M 180 266 Q 200 286 220 266'
    : 'M 184 269 Q 200 280 216 269';
  return (
    <>
      <path d={d} fill="none" stroke="#c97c69" strokeWidth={11} strokeLinecap="round" />
      <path d={d} fill="none" stroke={OUT} strokeWidth={5} strokeLinecap="round" />
    </>
  );
};

const Head: React.FC<{face: Face; open: number; blink: number}> = ({face, open, blink}) => {
  const v = React.useContext(VCtx);
  return (
  <g>
    {v === 'intern' ? (
      /* long hair falling behind the shoulders, and a high ponytail */
      <g>
        <path d="M 112 190 C 100 260 104 330 120 380 L 280 380 C 296 330 300 260 288 190 Z" fill={INTERN_HAIR} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
        <path d="M 250 96 C 300 70 336 110 322 170 C 312 214 290 236 276 250 C 290 200 296 150 262 120 Z" fill={INTERN_HAIR} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
      </g>
    ) : null}
    {/* neck */}
    <rect x={174} y={268} width={52} height={86} fill={SKIN_SH} stroke={OUT} strokeWidth={5} />
    {/* ears */}
    <ellipse cx={121} cy={212} rx={14} ry={22} fill={SKIN} stroke={OUT} strokeWidth={5} />
    <ellipse cx={279} cy={212} rx={14} ry={22} fill={SKIN} stroke={OUT} strokeWidth={5} />
    {/* face */}
    <ellipse cx={200} cy={205} rx={80} ry={96} fill={SKIN} stroke={OUT} strokeWidth={5} />
    {/* beard */}
    {v === 'bro' ? (<>
    <path
      d="M 121 200 C 118 258 142 304 200 324 C 258 304 282 258 279 200 C 272 230 258 244 242 241 C 226 238 174 238 158 241 C 142 244 128 230 121 200 Z"
      fill={HAIR}
      stroke={OUT}
      strokeWidth={5}
      strokeLinejoin="round"
    />
    <path d="M 150 300 Q 200 316 250 300" fill="none" stroke={HAIR_HI} strokeWidth={4} strokeLinecap="round" />
    {/* moustache */}
    <path d="M 170 258 Q 186 246 200 254 Q 214 246 230 258 Q 214 262 200 260 Q 186 262 170 258 Z" fill={HAIR} stroke={OUT} strokeWidth={4} />
    </>) : (
      <ellipse cx={168} cy={246} rx={12} ry={7} fill="#f0a08a" opacity={0.55} />
    )}
    {v === 'intern' ? <ellipse cx={232} cy={246} rx={12} ry={7} fill="#f0a08a" opacity={0.55} /> : null}
    <Mouth face={face} open={open} />
    {/* nose */}
    <path d="M 201 206 Q 190 230 198 236 Q 206 238 213 231" fill="none" stroke={SKIN_SH} strokeWidth={6} strokeLinecap="round" />
    <path d="M 201 206 Q 190 230 198 236 Q 206 238 213 231" fill="none" stroke={OUT} strokeWidth={3} strokeLinecap="round" />
    <Eyes face={face} blink={blink} />
    {/* brows */}
    {[168, 232].map((x, i) => {
      const t = (i === 0 ? -1 : 1) * face.browTilt;
      return (
        <path
          key={i}
          d={`M ${x - 20} ${174 + face.brow - t * 0.6} Q ${x} ${165 + face.brow} ${x + 20} ${174 + face.brow + t * 0.6}`}
          fill="none"
          stroke={HAIR}
          strokeWidth={10}
          strokeLinecap="round"
        />
      );
    })}
    {v === 'intern' ? (
      <g>
        {/* round glasses */}
        {[168, 232].map((x, i) => (
          <circle key={i} cx={x} cy={198} r={26} fill="none" stroke={OUT} strokeWidth={6} />
        ))}
        <path d="M 194 196 Q 200 190 206 196" fill="none" stroke={OUT} strokeWidth={6} />
        {/* straight hair with a side fringe */}
        <path
          d="M 114 230 C 100 140 136 92 198 90 C 260 88 300 132 286 230 C 280 190 272 166 256 150 C 230 168 186 170 150 150 C 132 168 122 196 114 230 Z"
          fill={INTERN_HAIR}
          stroke={OUT}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <path d="M 150 148 C 176 110 236 104 262 150 C 232 132 196 130 150 148 Z" fill={INTERN_HAIR} />
        <path d="M 170 112 Q 210 100 246 118" fill="none" stroke="#3a2a22" strokeWidth={5} strokeLinecap="round" />
        {/* hair tie + small earrings */}
        <rect x={262} y={96} width={22} height={14} rx={5} fill="#ff6b8a" stroke={OUT} strokeWidth={3} transform="rotate(30 273 103)" />
        <circle cx={121} cy={240} r={5} fill="#ffd166" stroke={OUT} strokeWidth={2} />
        <circle cx={279} cy={240} r={5} fill="#ffd166" stroke={OUT} strokeWidth={2} />
      </g>
    ) : (<>
    {/* curly hair */}
    <path
      d="M 118 205 C 104 152 118 100 172 86 C 200 72 242 78 264 96 C 292 118 294 162 282 205 C 278 180 272 162 262 150 C 228 160 172 160 140 150 C 130 166 124 184 118 205 Z"
      fill={HAIR}
      stroke={OUT}
      strokeWidth={5}
      strokeLinejoin="round"
    />
    {[
      [132, 128, 20], [146, 102, 22], [172, 84, 22], [200, 76, 23], [228, 80, 22], [254, 94, 21], [272, 118, 19], [282, 146, 15], [120, 156, 14],
    ].map(([x, y, r], i) => (
      <circle key={i} cx={x} cy={y} r={r} fill={HAIR} stroke={OUT} strokeWidth={5} />
    ))}
    <path d="M 128 130 C 150 112 170 140 196 116 C 220 136 240 112 268 128" fill={HAIR} stroke="none" />
    {[[160, 100], [196, 92], [232, 98], [148, 128], [214, 120], [256, 118]].map(([x, y], i) => (
      <path key={i} d={`M ${x - 9} ${y + 4} q 9 -12 18 0`} fill="none" stroke={HAIR_HI} strokeWidth={4} strokeLinecap="round" />
    ))}
    </>)}
  </g>
  );
};

const Torso: React.FC<{lift: number}> = ({lift}) => {
  const v = React.useContext(VCtx);
  if (v === 'intern')
    return (
      <g transform={`translate(0 ${lift * 0.4})`}>
        <path d="M 52 580 L 60 412 Q 70 350 140 338 L 260 338 Q 330 350 340 412 L 348 580 Z" fill={HOODIE} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
        {/* hood around the neck */}
        <path d="M 128 344 Q 200 300 272 344 Q 250 392 200 396 Q 150 392 128 344 Z" fill={HOODIE_HI} stroke={OUT} strokeWidth={5} />
        <path d="M 168 344 Q 200 372 232 344" fill={SKIN_SH} stroke={OUT} strokeWidth={4} />
        {/* drawstrings + pocket */}
        <path d="M 184 392 L 180 460 M 216 392 L 220 460" stroke="#f4f4f0" strokeWidth={6} strokeLinecap="round" />
        <path d="M 120 500 L 280 500 L 296 580 L 104 580 Z" fill={HOODIE_HI} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
        <text x={200} y={470} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight={800} fontSize={26} fill="#0d5e54">{'</>'}</text>
      </g>
    );
  return (
  <g transform={`translate(0 ${lift * 0.4})`}>
    <defs>
      <pattern id="db-dots" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.4" fill="#e8e8e8" opacity="0.7" />
        <circle cx="11" cy="11" r="1.4" fill="#e8e8e8" opacity="0.7" />
      </pattern>
      <pattern id="db-stripes" width="10" height="44" patternUnits="userSpaceOnUse">
        <rect width="10" height="22" fill="#f3f3f1" />
        <rect y="22" width="10" height="22" fill={BLUE} />
      </pattern>
    </defs>
    <path d="M 52 580 L 62 410 Q 72 352 140 340 L 260 340 Q 328 352 338 410 L 348 580 Z" fill={SHIRT} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
    <path d="M 52 580 L 62 410 Q 72 352 140 340 L 260 340 Q 328 352 338 410 L 348 580 Z" fill="url(#db-dots)" />
    <path d="M 158 340 L 242 340 L 236 580 L 164 580 Z" fill="url(#db-stripes)" stroke={OUT} strokeWidth={5} />
    <path d="M 172 340 Q 200 372 228 340" fill={SKIN_SH} stroke={OUT} strokeWidth={4} />
    {/* collar */}
    <path d="M 160 338 L 132 346 L 166 430 L 176 360 Z" fill={SHIRT_HI} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
    <path d="M 240 338 L 268 346 L 234 430 L 224 360 Z" fill={SHIRT_HI} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
    {/* earphone cable, like the photo */}
    <path d="M 214 345 Q 222 420 212 580" fill="none" stroke="#c0392b" strokeWidth={2.5} opacity={0.8} />
  </g>
  );
};

export type MascotTrack = {at: number; pose: PoseName; talk?: boolean}[];

/** Puppet at one pose (for sheets) or following a track of poses over time, with mouth openness 0..1. */
export const Mascot: React.FC<{track?: MascotTrack; pose?: PoseName; mouth?: (frame: number) => number; width?: number; seed?: string; variant?: Variant; flip?: boolean}> = ({
  track,
  pose,
  mouth,
  width = 400,
  seed = 'db',
  variant = 'bro',
  flip = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tr: MascotTrack = track ?? [{at: 0, pose: pose ?? 'idle'}];
  let i = 0;
  tr.forEach((t, k) => {
    if (frame >= t.at) i = k;
  });
  const cur = P[tr[i].pose];
  const prev = P[tr[Math.max(0, i - 1)].pose];
  const t = i === 0 ? 1 : spring({frame: frame - tr[i].at, fps, config: {damping: 14, stiffness: 170, mass: 0.7}});
  const tc = Math.min(1, Math.max(0, t));
  const l = mixArm(prev.l, cur.l, t);
  const r = mixArm(prev.r, cur.r, t);
  const lift = mix(prev.lift ?? 0, cur.lift ?? 0, tc);
  const face = tc < 0.35 ? prev.face : cur.face;
  const open = mouth ? Math.max(0, Math.min(1, mouth(frame))) : 0;
  // blink roughly every 3 s
  const period = 95 + Math.floor(random(seed) * 30);
  const ph = (frame + Math.floor(random(seed + 'o') * 60)) % period;
  const blink = ph < 5 ? interpolate(ph, [0, 2, 5], [0, 1, 0]) : 0;
  const bob = Math.sin(frame / 18) * 3 + (i > 0 ? (1 - tc) * -10 : 0);
  const tilt = mix(prev.tilt ?? 0, cur.tilt ?? 0, tc) + Math.sin(frame / 27) * 1.5 + open * 1.5;
  const squash = i > 0 ? interpolate(frame - tr[i].at, [0, 4, 10], [1, 1.035, 1], {extrapolateRight: 'clamp'}) : 1;
  return (
    <VCtx.Provider value={variant}>
    <svg viewBox="0 0 400 560" width={width} height={(width * 560) / 400} style={{overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
      <defs>
        <clipPath id={`db-clip-${seed}`}>
          <rect x={-300} y={-400} width={1000} height={960} />
        </clipPath>
      </defs>
      <g clipPath={`url(#db-clip-${seed})`}>
      <g transform={`translate(0 ${bob}) translate(200 560) scale(${2 - squash} ${squash}) translate(-200 -560)`}>
        <Torso lift={lift} />
        <g transform={`translate(0 ${lift}) rotate(${tilt} 200 330)`}>
          <Head face={face} open={open} blink={blink} />
        </g>
        <ArmRig side="l" arm={l} lift={lift} />
        <ArmRig side="r" arm={r} lift={lift} />
      </g>
      </g>
    </svg>
    </VCtx.Provider>
  );
};

/** Default pose for a scene, from its beat/type, cycling through options so neighbours differ. */
export function poseFor(s: any, i: number, prev?: PoseName): PoseName {
  if (s.pose) return s.pose;
  const by: Record<string, PoseName[]> = {
    hook: ['shock'],
    setup: ['crossed'],
    break: ['facepalm', 'shock', 'think'],
    reveal: ['point', 'explain'],
    twist: ['think', 'point'],
    payoff: ['explain', 'thumbsup'],
    cta: ['thumbsup'],
  };
  const type: Record<string, PoseName> = {coldopen: 'shock', chat: 'crossed', crash: 'facepalm', solution: 'point', rule: 'thumbsup', compare: 'shrug', board: 'point', tip: 'explain', headline: 'shock', moment: 'think'};
  const opts = by[(s.beat ?? '').toLowerCase()] ?? (type[s.type] ? [type[s.type]] : ['explain', 'point']);
  let pick = opts[i % opts.length];
  if (pick === prev && opts.length > 1) pick = opts[(i + 1) % opts.length];
  return pick;
}

import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Mascot, POSES} from './Mascot';
import {FONT} from '../theme';

/** All mascot poses on one sheet, for approval. */
export const MascotSheet: React.FC = () => (
  <AbsoluteFill style={{background: '#0d0d10', flexDirection: 'row', flexWrap: 'wrap', padding: 30, gap: 0}}>
    {POSES.map((p) => (
      <div key={p} style={{width: 308, height: 470, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', borderBottom: '1px solid #222'}}>
        <div style={{position: 'absolute', top: 10, left: 14, color: '#ffb547', fontFamily: FONT.mono, fontSize: 26}}>{p}</div>
        <Mascot pose={p} width={280} variant={p === 'laugh' || p === 'shrug' || p === 'think' ? 'intern' : 'bro'} />
      </div>
    ))}
  </AbsoluteFill>
);

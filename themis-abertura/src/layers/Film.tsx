import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';
import { asset } from '../lib/units';

/** 30 placas de grão; 900 e 1800 são múltiplos de 30 => frame 900 == frame 0. */
export const Grain: React.FC<{ maskStyle?: React.CSSProperties }> = ({ maskStyle }) => {
  const f = useCurrentFrame();
  const k = String(f % 30).padStart(2, '0');
  return (
    <AbsoluteFill style={{ mixBlendMode: 'overlay', opacity: 0.4, ...maskStyle }}>
      <Img src={asset(`grain/g${k}.jpg`)} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ maskStyle?: React.CSSProperties }> = ({ maskStyle }) => (
  <AbsoluteFill
    style={{
      background: 'radial-gradient(ellipse 75% 75% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.12) 82%, rgba(0,0,0,.2) 100%)',
      ...maskStyle,
    }}
  />
);

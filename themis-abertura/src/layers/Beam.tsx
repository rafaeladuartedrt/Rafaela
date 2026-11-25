import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../theme';
import { phase, useT } from '../lib/time';
import { useU } from '../lib/units';

/** Feixe volumétrico verde, fonte única no alto à esquerda, atravessando a diagonal. */
export const Beam: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const t = useT();
  const u = useU();
  const rot = -27 + 1.2 * Math.sin(phase(t, 1, 0.6));
  const breathe = 0.85 + 0.15 * Math.sin(phase(t, 2, 0.2));
  const g = C.greenRGB;
  const band = (w: number, a: number): React.CSSProperties => ({
    position: 'absolute', left: '50%', top: '50%', width: u(6200), height: u(w),
    marginLeft: -u(3100), marginTop: -u(w / 2),
    transform: `translateY(${-u(120)}px) rotate(${rot}deg)`,
    background: `linear-gradient(180deg, rgba(${g},0) 0%, rgba(${g},${a * 0.35}) 25%, rgba(${g},${a}) 50%, rgba(${g},${a * 0.35}) 75%, rgba(${g},0) 100%)`,
    // queda de intensidade ao longo do feixe (fonte no alto à esquerda)
    WebkitMaskImage: 'linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,.55) 55%, rgba(0,0,0,.12) 100%)',
    maskImage: 'linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,.55) 55%, rgba(0,0,0,.12) 100%)',
  });
  return (
    <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: intensity * breathe, pointerEvents: 'none' }}>
      <div style={band(900, 0.075)} />
      <div style={band(260, 0.07)} />
    </AbsoluteFill>
  );
};

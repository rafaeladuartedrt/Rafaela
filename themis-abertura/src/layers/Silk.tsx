import React from 'react';
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { T, useT } from '../lib/time';

/**
 * Fundo de seda original do telão em movimento de tecido real: sequência gerada por
 * scripts/silk_sim.py (ondas que deslocam as dobras e re-iluminam a superfície).
 * Um quadro por frame; as ondas fecham ciclos inteiros em 30 s => loop perfeito.
 */
export const Silk: React.FC = () => {
  const t = useT();
  const { fps, width } = useVideoConfig();
  const n = Math.round(T * fps);
  const f = ((Math.round(t * fps) % n) + n) % n;
  const src = staticFile(`assets/silk${fps}_${Math.round(width / 2)}/f${String(f).padStart(4, '0')}.jpg`);
  return (
    <AbsoluteFill style={{ backgroundColor: '#282828' }}>
      <Img src={src} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};

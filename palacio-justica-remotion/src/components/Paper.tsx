import React from 'react';
import { AbsoluteFill } from 'remotion';
import { PAPER } from '../core/config.ts';

// Papel creme gerado proceduralmente (ruido fractal sutil). Camada propria, abaixo das imagens.
export const Paper: React.FC<{ id: string }> = ({ id }) => (
  <AbsoluteFill style={{ backgroundColor: PAPER }}>
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      <filter id={`paper-${id}`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="n" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.40  0 0 0 0 0.32  0 0 0 0.09 0" />
      </filter>
      <filter id={`fibers-${id}`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="3" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0.06 0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#paper-${id})`} />
      <rect width="100%" height="100%" filter={`url(#fibers-${id})`} />
    </svg>
  </AbsoluteFill>
);

import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { phase, useT } from '../lib/time';
import { useRasterAsset, useU } from '../lib/units';

/**
 * Fundo de seda original do telão em movimento ondulante lento.
 * Todo movimento é função periódica com período = 30 s (loop fechado).
 * O "ondular" vem de duas bandas de brilho que percorrem as dobras (camada sheen
 * mascarada) + deriva sub-perceptível de escala/posição.
 */
export const Silk: React.FC = () => {
  const t = useT();
  const u = useU();
  const seda = useRasterAsset('seda');
  const sheen = useRasterAsset('seda_sheen');
  const dx = u(14) * Math.sin(phase(t, 1));
  const dy = u(8) * Math.sin(phase(t, 1, 1.3));
  const s = 1.035 + 0.008 * Math.sin(phase(t, 1, 0.4));
  const img: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    transform: `translate(${dx}px, ${dy}px) scale(${s})`,
  };
  // bandas de brilho: posição percorre ciclo fechado (1 e 2 voltas em 30 s)
  const p1 = 50 + 70 * Math.sin(phase(t, 1, -1.2));
  const p2 = 50 + 60 * Math.sin(phase(t, 2, 0.8));
  const mask = `linear-gradient(104deg, transparent ${p1 - 26}%, rgba(0,0,0,.75) ${p1}%, transparent ${p1 + 26}%),` +
    `linear-gradient(76deg, transparent ${p2 - 18}%, rgba(0,0,0,.45) ${p2}%, transparent ${p2 + 18}%)`;
  return (
    <AbsoluteFill style={{ backgroundColor: '#282828', overflow: 'hidden' }}>
      <Img src={seda} style={img} />
      <Img
        src={sheen}
        style={{ ...img, mixBlendMode: 'screen', opacity: 0.32, WebkitMaskImage: mask, maskImage: mask }}
      />
    </AbsoluteFill>
  );
};

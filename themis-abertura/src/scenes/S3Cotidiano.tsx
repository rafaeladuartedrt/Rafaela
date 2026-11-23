import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, WORDS } from '../theme';
import { E, seg, useT } from '../lib/time';
import { G, Mosaic, TileSpec } from '../lib/Mosaic';
import { MotionBlur } from '../lib/MotionBlur';

/**
 * 0:12–0:17 COTIDIANO + IMAGEM, momento emocional: blocos grandes, entradas lentas,
 * movimento mínimo nas fotos 3 e 5 (luto, criança). Palavras só nos blocos de cor.
 */
const OUT = 16.4;
const TILES: TileSpec[] = [
  { x: 0, y: 0, w: 1750, h: 2000, kind: 'photo', src: 'foto3_bw.jpg', iw: 2855, ih: 1903, fx: 0.62, fy: 0.5, drift: [24, 0],
    inAt: 12.35, inDur: 1.0, inFrom: 'bottom', outAt: OUT, outTo: 'left' },
  { x: 1750, y: 0, w: 1750, h: 1333, kind: 'photo', src: 'foto5_bw.jpg', iw: 3120, ih: 2080, fx: 0.7, fy: 0.25, drift: [-20, 0],
    inAt: 12.6, inDur: 1.0, inFrom: 'right', outAt: OUT + 0.08, outTo: 'right' },
  { x: 1750, y: G.y(2), w: G.w, h: G.h, kind: 'color', color: C.green, label: WORDS.cotidiano,
    inAt: 13.2, inDur: 0.7, inFrom: 'left', outAt: OUT + 0.14, outTo: 'bottom' },
  { x: 2625, y: G.y(2), w: G.w, h: G.h, kind: 'color', color: C.grayDeep, label: WORDS.imagem,
    inAt: 13.5, inDur: 0.7, inFrom: 'top', outAt: OUT + 0.2, outTo: 'right' },
];

export const S3Cotidiano: React.FC = () => {
  const t = useT();
  if (t < 12.2 || t > OUT + 0.8) return null;
  const push = 1 + 0.035 * seg(t, 12.3, OUT + 0.6, E.dolly);
  return (
    <AbsoluteFill>
      <MotionBlur windows={[[OUT - 0.05, OUT + 0.75]]}>
        <AbsoluteFill style={{ transform: `scale(${push})` }}>
          <Mosaic tiles={TILES} t0={12.3} t1={OUT + 0.6} />
        </AbsoluteFill>
      </MotionBlur>
    </AbsoluteFill>
  );
};

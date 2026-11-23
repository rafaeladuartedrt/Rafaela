import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, WORDS } from '../theme';
import { E, seg, useT } from '../lib/time';
import { G, Mosaic, TileSpec } from '../lib/Mosaic';
import { MotionBlur } from '../lib/MotionBlur';

/**
 * 0:16–0:21 INOVAÇÃO + NOTÍCIA: mosaico rápido (ref. A) com as matérias de IA e
 * inovação; padrão de texto "NOTÍCIA" correndo sobre a foto; palavras nos blocos.
 * Sai em blocos deslizando para o palco escuro do troféu.
 */
const OUT = 20.5;
const o = (i: number, to: 'left' | 'right' | 'top' | 'bottom') => ({ outAt: OUT + i * 0.06, outTo: to });
const TILES: TileSpec[] = [
  { x: G.x(0), y: G.y(0), w: G.w, h: G.h, kind: 'paper', src: 'recorte6.png', iw: 872, ih: 910, inAt: 16.5, inFrom: 'top', ...o(0, 'left') },
  { x: G.x(1), y: G.y(0), w: G.w, h: G.h, kind: 'photo', src: 'foto1_duo.jpg', iw: 1478, ih: 985, scale: 1.5, fx: 0.1, fy: 0.2, drift: [40, 0], inAt: 16.6, inFrom: 'left', ...o(1, 'top') },
  { x: G.x(2), y: G.y(0), w: G.w, h: G.h, kind: 'color', color: C.green, label: WORDS.inovacao, inAt: 16.85, inFrom: 'bottom', ...o(2, 'top') },
  { x: G.x(3), y: G.y(0), w: G.w, h: G.h, kind: 'paper', src: 'recorte7.png', iw: 876, ih: 1053, inAt: 16.7, inFrom: 'right', ...o(3, 'right') },
  { x: G.x(0), y: G.y(1), w: G.w * 2, h: G.h, kind: 'photo', src: 'foto2_duo.jpg', iw: 3000, ih: 2000, scale: 1.25, fx: 0.4, fy: 0.05, drift: [-60, 0],
    inAt: 16.55, inFrom: 'left', ...o(1, 'left') },
  { x: G.x(2), y: G.y(1), w: G.w, h: G.h, kind: 'color', color: C.grayDeep, label: WORDS.noticia, inAt: 17.0, inFrom: 'top', ...o(4, 'bottom') },
  { x: G.x(3), y: G.y(1), w: G.w, h: G.h, kind: 'photo', src: 'foto4_duo.jpg', iw: 3120, ih: 2080, scale: 1.3, fx: 0.4, fy: 0.0, drift: [0, 30], pattern: WORDS.noticia, inAt: 16.9, inFrom: 'right', ...o(2, 'right') },
  { x: G.x(0), y: G.y(2), w: G.w, h: G.h, kind: 'color', color: C.grayMid, support: ['6º Prêmio Themis', 'de Jornalismo'], inAt: 17.1, inFrom: 'bottom', ...o(3, 'bottom') },
  { x: G.x(1), y: G.y(2), w: G.w, h: G.h, kind: 'paper', src: 'recorte11.png', iw: 815, ih: 662, inAt: 17.2, inFrom: 'left', ...o(5, 'bottom') },
  { x: G.x(2), y: G.y(2), w: G.w * 2, h: G.h, kind: 'photo', src: 'foto5_bw.jpg', iw: 3120, ih: 2080, scale: 1.0, fx: 0.15, fy: 0.9, drift: [30, 0], inAt: 17.3, inFrom: 'right', ...o(4, 'right') },
];

export const S4Inovacao: React.FC = () => {
  const t = useT();
  if (t < 16.3 || t > OUT + 0.9) return null;
  const push = 1 + 0.05 * seg(t, 16.5, OUT + 0.6, E.dolly);
  return (
    <AbsoluteFill>
      <MotionBlur windows={[[OUT - 0.05, OUT + 0.85]]} samples={6}>
        <AbsoluteFill style={{ transform: `scale(${push})` }}>
          <Mosaic tiles={TILES} t0={16.5} t1={OUT + 0.6} />
        </AbsoluteFill>
      </MotionBlur>
    </AbsoluteFill>
  );
};

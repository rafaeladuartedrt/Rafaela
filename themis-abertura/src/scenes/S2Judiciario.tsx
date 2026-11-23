import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, WORDS } from '../theme';
import { E, seg, useT } from '../lib/time';
import { G, Mosaic, TileSpec } from '../lib/Mosaic';
import { MotionBlur } from '../lib/MotionBlur';
import { HeroWord, heroTimes, SweepEdge } from '../lib/HeroWord';
import { useU } from '../lib/units';

/**
 * 0:07–0:13 JUDICIÁRIO (destaque igual ao JORNALISMO) + TJRS como informação no bloco.
 * Mosaico geométrico com a manchete da matéria 8 recortada e blocos de cor (as demais
 * matérias estão nos trechos seguintes; nada se repete); bloco verde central cresce.
 */
const B = 9.9;
// nenhuma imagem repete o JORNALISMO nem as cenas seguintes; matérias recortadas, sem papel branco
const TILES: TileSpec[] = [
  { x: G.x(0), y: G.y(0), w: G.w * 2, h: G.h, kind: 'cut', src: 'manchete8.png', iw: 670, ih: 281, maxScale: 1.5, inAt: 7.2, inFrom: 'top', drift: [24, 0] },
  { x: G.x(2), y: G.y(0), w: G.w, h: G.h, kind: 'color', color: C.grayMid, inAt: 7.5, inFrom: 'right' },
  { x: G.x(3), y: G.y(0), w: G.w, h: G.h, kind: 'color', color: C.green, label: WORDS.tjrs, inAt: 7.75, inFrom: 'bottom' },
  { x: G.x(0), y: G.y(1), w: G.w, h: G.h, kind: 'color', color: C.grayMid, support: ['6º Prêmio Themis', 'de Jornalismo'], inAt: 7.6, inFrom: 'left' },
  { x: G.x(1), y: G.y(1), w: G.w, h: G.h, kind: 'color', color: C.grayDeep, inAt: 7.3, inFrom: 'bottom' },
  { x: G.x(2), y: G.y(1), w: G.w, h: G.h, kind: 'color', color: C.green, inAt: 7.45, inFrom: 'top' },
  { x: G.x(3), y: G.y(1), w: G.w, h: G.h, kind: 'color', color: C.gray, inAt: 7.9, inFrom: 'right' },
  { x: G.x(0), y: G.y(2), w: G.w, h: G.h, kind: 'color', color: C.grayDeep, inAt: 7.85, inFrom: 'top' },
  { x: G.x(1), y: G.y(2), w: G.w, h: G.h, kind: 'color', color: C.grayMid, inAt: 8.0, inFrom: 'left' },
  { x: G.x(2), y: G.y(2), w: G.w, h: G.h, kind: 'color', color: C.grayDeep, inAt: 8.1, inFrom: 'right' },
  { x: G.x(3), y: G.y(2), w: G.w, h: G.h, kind: 'color', color: C.grayMid, inAt: 8.2, inFrom: 'bottom' },
];

export const S2Judiciario: React.FC = () => {
  const t = useT();
  if (t < 7.1 || t > 12.85) return null;
  const { sweep, mb } = heroTimes(B);
  const sw = seg(t, sweep[0], sweep[1], E.main);
  const push = 1 + 0.06 * seg(t, 7.2, B + 1.2, E.dolly);
  return (
    <AbsoluteFill style={{ clipPath: sw > 0 ? `inset(0 0 0 ${sw * 100}%)` : undefined, backgroundColor: C.gray }}>
      <MotionBlur windows={[[8.6, 9.0], ...mb]}>
        <AbsoluteFill style={{ transform: `scale(${push})` }}>
          <Mosaic tiles={TILES} t0={7.2} t1={12.8} />
          {/* barras verdes deslizando entre os blocos */}
          <GreenBars t={t} />
        </AbsoluteFill>
        <HeroWord word={WORDS.judiciario} b={B} />
        <SweepEdge p={sw} />
      </MotionBlur>
    </AbsoluteFill>
  );
};

const GreenBars: React.FC<{ t: number }> = ({ t }) => {
  const u = useU();
  const bar = (x: number, y: number, w: number) => (
    <div style={{ position: 'absolute', top: u(y), height: u(54), width: u(w), left: u(x), background: C.green }} />
  );
  return (
    <>
      {bar(-1000 + 4600 * seg(t, 8.55, 9.2, E.main), 640, 900)}
      {bar(3600 - 4400 * seg(t, 8.75, 9.4, E.main), 1306, 640)}
    </>
  );
};

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
 * Mosaico (prévia do que vem depois): manchetes recortadas centralizadas em blocos escuros
 * e fotos das matérias preenchendo o bloco inteiro; nenhum bloco vazio. Bloco verde cresce.
 */
const B = 9.9;
// nenhuma imagem repete o JORNALISMO nem as cenas seguintes; matérias recortadas, sem papel branco
const TILES: TileSpec[] = [
  { x: G.x(0), y: G.y(0), w: G.w, h: G.h, kind: 'cut', src: 'manchete8.png', iw: 670, ih: 281, inAt: 7.2, inFrom: 'top', drift: [20, 0] },
  { x: G.x(1), y: G.y(0), w: G.w, h: G.h, kind: 'photo', src: 'notfoto11.jpg', iw: 727, ih: 364, color: C.grayMid, inAt: 7.35, inFrom: 'left', drift: [-16, 0] },
  { x: G.x(2), y: G.y(0), w: G.w, h: G.h, kind: 'cut', src: 'manchete11.png', iw: 726, ih: 190, color: C.gray, inAt: 7.5, inFrom: 'right' },
  { x: G.x(3), y: G.y(0), w: G.w, h: G.h, kind: 'color', color: C.green, label: WORDS.tjrs, inAt: 7.75, inFrom: 'bottom' },
  { x: G.x(0), y: G.y(1), w: G.w, h: G.h, kind: 'color', color: C.grayMid, support: ['6º Prêmio Themis', 'de Jornalismo'], inAt: 7.6, inFrom: 'left' },
  { x: G.x(1), y: G.y(1), w: G.w, h: G.h, kind: 'photo', src: 'notfoto10.jpg', iw: 710, ih: 352, inAt: 7.3, inFrom: 'bottom', drift: [24, 0] },
  { x: G.x(2), y: G.y(1), w: G.w, h: G.h, kind: 'cut', src: 'manchete10.png', iw: 709, ih: 200, color: C.grayMid, inAt: 7.45, inFrom: 'top' },
  { x: G.x(3), y: G.y(1), w: G.w, h: G.h, kind: 'photo', src: 'notfoto12.jpg', iw: 472, ih: 296, color: C.gray, inAt: 7.9, inFrom: 'right', drift: [0, 14] },
  { x: G.x(0), y: G.y(2), w: G.w, h: G.h, kind: 'photo', src: 'notfoto9.jpg', iw: 645, ih: 427, color: C.grayDeep, inAt: 7.85, inFrom: 'top' },
  { x: G.x(1), y: G.y(2), w: G.w, h: G.h, kind: 'cut', src: 'manchete12.png', iw: 443, ih: 156, color: C.gray, inAt: 8.0, inFrom: 'left' },
  { x: G.x(2), y: G.y(2), w: G.w, h: G.h, kind: 'photo', src: 'notfoto6.jpg', iw: 787, ih: 522, color: C.green, inAt: 8.1, inFrom: 'right' },
  { x: G.x(3), y: G.y(2), w: G.w, h: G.h, kind: 'cut', src: 'manchete9.png', iw: 625, ih: 301, inAt: 8.2, inFrom: 'bottom' },
];

export const S2Judiciario: React.FC = () => {
  const t = useT();
  if (t < 7.1 || t > 12.85) return null;
  const { sweep, mb } = heroTimes(B);
  const sw = seg(t, sweep[0], sweep[1], E.main);
  const push = 1 + 0.025 * seg(t, 7.2, B + 1.2, E.dolly);
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

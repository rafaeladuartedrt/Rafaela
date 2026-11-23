import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT, WORDS } from '../theme';
import { E, lerp, rand, seg, spring, useT } from '../lib/time';
import { asset, useU } from '../lib/units';
import { Clipping, Word } from '../lib/ui';
import { MotionBlur } from '../lib/MotionBlur';

/**
 * 0:08–0:13 JUDICIÁRIO + TJRS (ref. B): recortes 8, 11 e 12 caem sobre a mesa em
 * 3 profundidades, travelling lateral com parallax, foco puxa para o plano da frente.
 * Faixa verde a 70% revela a palavra letra a letra, fora de ordem (carimbo).
 */
const DROPS = [
  { src: 'recorte8.png', w: 761, h: 364, scale: 1.3, cx: 860, cy: 470, rot: -3.5, at: 7.5, depth: 0.45 },
  { src: 'recorte12.png', w: 565, h: 832, scale: 1.26, cx: 2640, cy: 640, rot: 3.2, at: 7.8, depth: 0.7 },
  { src: 'recorte11.png', w: 815, h: 662, scale: 1.4, cx: 1660, cy: 630, rot: -1.2, at: 8.1, depth: 1 },
];

const ORDER = WORDS.judiciario.split('').map((_, i) => i).sort((a, b) => rand(a + 3.7) - rand(b + 3.7));

export const S2Judiciario: React.FC = () => {
  const t = useT();
  const u = useU();
  if (t < 7.1 || t > 13.45) return null;
  const out = 1 - seg(t, 12.75, 13.4, E.soft);
  const travel = seg(t, 7.3, 13.4, E.soft);
  const band = seg(t, 8.9, 9.35, E.main);
  const tj = seg(t, 10.25, 10.95, E.out);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      {/* mesa: escurece levemente a seda para destacar o papel */}
      <AbsoluteFill style={{ background: 'rgba(20,20,20,.35)', opacity: seg(t, 7.1, 7.6, E.soft) }} />
      <MotionBlur windows={[[7.45, 8.6]]} samples={6}>
        {DROPS.map((d, i) => {
          const s = spring(t, d.at, 0.9);
          const lift = 1 - s;
          // puxada de foco: tudo desfocado na chegada; a frente assenta nítida, o fundo fica suave
          const focus = (1 - d.depth) * 4 * seg(t, 8.3, 9.0, E.soft) + lift * 5;
          const px = lerp(160, -160, travel) * d.depth;
          return (
            <Clipping key={i} src={asset(d.src)} w={d.w} h={d.h} scale={d.scale}
              cx={d.cx + px + lift * 120} cy={d.cy - lift * 60} rot={d.rot + lift * 7}
              lift={lift} opacity={Math.min(1, seg(t, d.at - 0.05, d.at + 0.25, E.out))} blur={focus} />
          );
        })}
      </MotionBlur>
      {/* faixa verde translúcida */}
      <div style={{
        position: 'absolute', left: u(430), top: u(1180), width: u(2640), height: u(300),
        background: `rgba(${C.greenRGB},.7)`, transform: `scaleX(${band})`, transformOrigin: 'left center',
      }} />
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: u(1180), height: u(300), display: 'flex', alignItems: 'center' }}>
          <Word size={290} color={C.grayDeep}>
            {WORDS.judiciario.split('').map((ch, i) => {
              const at = 9.2 + ORDER.indexOf(i) * 0.1;
              const p = seg(t, at, at + 0.07, E.out);
              const st = 1 + 0.12 * (1 - seg(t, at, at + 0.16, E.out));
              return <span key={i} style={{ display: 'inline-block', opacity: p, transform: `scale(${st})` }}>{ch}</span>;
            })}
          </Word>
        </div>
        <div style={{ position: 'absolute', top: u(1520), opacity: tj, transform: `translateY(${u(40) * (1 - tj)}px)` }}>
          <Word size={262} weight={FONT.light} tracking="0.4em" color={C.white}>{WORDS.tjrs}</Word>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

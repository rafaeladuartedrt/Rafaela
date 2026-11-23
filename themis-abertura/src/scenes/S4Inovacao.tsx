import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, WORDS } from '../theme';
import { E, lerp, seg, useT } from '../lib/time';
import { asset, useU } from '../lib/units';
import { Clipping, Word } from '../lib/ui';
import { MotionBlur } from '../lib/MotionBlur';

/**
 * 0:17–0:21 INOVAÇÃO + NOTÍCIA (ref. A): letreiro "NOTÍCIA" contornado em 3 alturas
 * e velocidades; recortes 6 e 7 atravessam em parallax; INOVAÇÃO em bloco sólido;
 * NOTÍCIA acende em verde sobre o letreiro.
 */
const REP = 9;
const FS = 300;
const UNIT = 2050; // largura aproximada de "NOTÍCIA" + espaço em 300 px (ajustada em runtime abaixo)

const Row: React.FC<{ y: number; x: number; dim: number; lit?: number }> = ({ y, x, dim, lit = 0 }) => {
  const u = useU();
  return (
    <div style={{ position: 'absolute', top: u(y - 177), left: u(x), display: 'flex', whiteSpace: 'nowrap' }}>
      {new Array(REP).fill(0).map((_, i) => {
        const center = i === Math.floor(REP / 2);
        const l = center ? lit : 0;
        return (
          <div key={i} style={{ width: u(UNIT), display: 'flex', justifyContent: 'center', flex: 'none' }}>
            <Word size={FS} color={l > 0 ? `rgba(${C.greenRGB},${l})` : 'transparent'} style={{
              WebkitTextStroke: `${u(3)}px rgba(${l > 0 ? C.greenRGB : C.whiteRGB},${l > 0 ? Math.max(l, dim) : dim})`,
              textShadow: l > 0 ? `0 0 ${u(60) * l}px rgba(${C.greenRGB},${0.55 * l})` : undefined,
              transform: center ? `scale(${1 + 0.035 * l})` : undefined,
            }}>{WORDS.noticia}</Word>
          </div>
        );
      })}
    </div>
  );
};

/** posição com velocidade constante e frenagem uniforme até parar em tStop (velocidade contínua) */
const decel = (t: number, v: number, tStop: number, d: number) => {
  if (t >= tStop) return 0;
  if (t >= tStop - d) return -(v / (2 * d)) * (tStop - t) ** 2;
  return -(v * d) / 2 - v * (tStop - d - t);
};

export const S4Inovacao: React.FC = () => {
  const t = useT();
  const u = useU();
  if (t < 17.0 || t > 21.5) return null;
  const bars = [0, 1, 2].map((i) => seg(t, 17.05 + i * 0.07, 17.45 + i * 0.07, E.main));
  const settled = seg(t, 17.55, 17.9, E.soft);
  const out = 1 - seg(t, 20.7, 21.4, E.soft);
  const base = -UNIT * Math.floor(REP / 2) + 1750 - UNIT / 2; // instância central centrada em x=1750
  const lit = seg(t, 19.9, 20.3, E.out);
  const dimOthers = lerp(0.2, 0.09, lit);
  const block = Math.min(seg(t, 18.35, 18.75, E.main), 1 - seg(t, 19.6, 19.95, E.main));
  const blockSide = t > 19.5 ? 'right' : 'center';
  const txt = Math.min(seg(t, 18.55, 18.95, E.out), 1 - seg(t, 19.5, 19.75, E.soft));
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <MotionBlur windows={[[17.0, 17.6], [18.3, 18.8], [19.55, 20.0]]} samples={6}>
        {/* barras de varredura que cobrem a cena anterior e viram o fundo */}
        {bars.map((p, i) => (
          <div key={i} style={{ position: 'absolute', top: u(i * 667), height: u(667) + 1, left: u(lerp(3500, 0, p)), width: u(3500),
            background: C.gray, opacity: lerp(1, 0.72, settled) }} />
        ))}
        {bars[2] >= 1 && (
          <>
            <Row y={430} x={base + (-260 * (t - 17.5)) % UNIT} dim={0.2 * (1 - 0.5 * lit)} />
            <Row y={1000} x={base + decel(t, -230, 19.95, 0.9)} dim={dimOthers} lit={lit} />
            <Row y={1570} x={base - UNIT / 2 + (-380 * (t - 17.5)) % UNIT} dim={0.2 * (1 - 0.5 * lit)} />
            {/* recortes atravessando em parallax (fundo desfocado, frente nítida) */}
            <Clipping src={asset('recorte7.png')} w={876} h={1053} scale={1.0} rot={2}
              cx={lerp(3900, -900, seg(t, 17.3, 21.0, E.soft))} cy={760} opacity={0.92} blur={3.5} />
            <Clipping src={asset('recorte6.png')} w={872} h={910} scale={1.3} rot={-2.5}
              cx={lerp(4100, -1100, seg(t, 17.6, 20.7, E.dolly))} cy={1060} />
          </>
        )}
        {/* INOVAÇÃO em bloco sólido */}
        {block > 0 && (
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: u(2560), height: u(400), background: C.green,
              transform: `scaleX(${block})`, transformOrigin: blockSide === 'right' ? 'right center' : 'center' }} />
            <div style={{ overflow: 'hidden', padding: `${u(30)}px ${u(40)}px`, position: 'relative' }}>
              <div style={{ transform: `translateY(${(1 - txt) * 110}%)` }}>
                <Word size={300} color={C.grayDeep}>{WORDS.inovacao}</Word>
              </div>
            </div>
          </AbsoluteFill>
        )}
      </MotionBlur>
    </AbsoluteFill>
  );
};

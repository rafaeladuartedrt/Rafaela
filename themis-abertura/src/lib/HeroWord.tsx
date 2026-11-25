import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C } from '../theme';
import { E, lerp, seg, useT } from './time';
import { useU } from './units';
import { Word } from './ui';

/**
 * Destaque de palavra (ref. A): bloco verde entra deslizando, cresce do centro até
 * ocupar a tela, a palavra sobe por máscara e escala devagar, acelerando na saída.
 * b = instante em que o bloco começa a entrar.
 */
export const heroTimes = (b: number) => ({ sweep: [b + 2.3, b + 2.9] as [number, number], mb: [[b - 0.05, b + 0.55], [b + 0.6, b + 1.25], [b + 2.1, b + 2.95]] as [number, number][] });

export const HeroWord: React.FC<{ word: string; b: number; size?: number }> = ({ word, b, size = 330 }) => {
  const t = useT();
  const u = useU();
  const slide = seg(t, b, b + 0.5, E.main);
  const grow = seg(t, b + 0.6, b + 1.2, E.main);
  if (slide <= 0) return null;
  const w = lerp(900, 3540, grow), h = lerp(520, 2040, grow);
  const cx = lerp(-700, 1750, slide);
  const wordIn = seg(t, b + 0.95, b + 1.4, E.out);
  const sc = 1 + 0.12 * seg(t, b + 1.25, b + 2.35, E.soft) + 0.4 * seg(t, b + 2.1, b + 2.9, E.in);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: u(cx - w / 2), top: u(1000 - h / 2), width: u(w), height: u(h), background: C.green }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ overflow: 'hidden', padding: `${u(60)}px ${u(80)}px ${u(40)}px`, transform: `scale(${sc})` }}>
          <div style={{ transform: `translateY(${(1 - wordIn) * 110}%)`, opacity: wordIn }}>
            <Word size={size} color={C.grayDeep}>{word}</Word>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** borda verde da varredura de saída (cena some da esquerda para a direita) */
export const SweepEdge: React.FC<{ p: number }> = ({ p }) => {
  const u = useU();
  if (p <= 0 || p >= 1) return null;
  return <div style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${p * 100}% - ${u(1)}px)`, width: u(46), background: C.green }} />;
};

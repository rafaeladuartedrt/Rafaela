import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C } from '../theme';
import { E, env, lerp, seg, useT } from '../lib/time';
import { asset, TROPHY, useU } from '../lib/units';

/**
 * 0:21–0:26 Troféu (plano herói). A arte vertical do troféu (silhueta verde + fotografia
 * em Multiply, como no PDF) entra estourada de luz (camada aditiva) e assenta. Reflexo especular passa uma vez (camada separada). Dolly-in lento até 100% exatos;
 * no hold o PNG é desenhado sem máscara, filtro ou camada por cima.
 */
export const trophyScale = (t: number) =>
  lerp(0.93, 1, seg(t, 21.2, 24.7, E.dolly)) * lerp(1, 0.9, seg(t, 25.8, 26.8, E.in));

export const DarkStage: React.FC = () => {
  const t = useT();
  const a = env(t, 20.7, 21.4, 25.9, 26.9, E.soft);
  if (a <= 0) return null;
  return <AbsoluteFill style={{ background: '#151515', opacity: 0.82 * a }} />;
};

export const S5Trofeu: React.FC = () => {
  const t = useT();
  const u = useU();
  if (t < 21.0 || t > 27.0) return null;
  const sc = trophyScale(t);
  const left = TROPHY.x, top = TROPHY.y; // inteiros: no hold a arte cai 1:1 no grid de pixels
  // a arte do troféu entra estourada de luz e assenta
  const inn = seg(t, 21.15, 21.8, E.soft);
  const blown = 0.95 * (1 - seg(t, 21.35, 23.6, E.soft));
  const fade = 1 - seg(t, 26.1, 26.9, E.soft);
  const darken = seg(t, 25.8, 26.6, E.soft);
  const cone = env(t, 21.4, 22.6, 25.7, 26.5, E.soft);
  const glow = env(t, 21.2, 22.2, 25.8, 26.6, E.soft);
  const spec = seg(t, 23.75, 24.6, E.main);
  const box: React.CSSProperties = {
    position: 'absolute', left: u(left), top: u(top), width: u(TROPHY.w), height: u(TROPHY.h),
    transform: sc === 1 ? undefined : `scale(${sc})`, transformOrigin: 'center center',
  };
  const amask = { WebkitMaskImage: `url(${asset(TROPHY.alpha)})`, maskImage: `url(${asset(TROPHY.alpha)})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' } as React.CSSProperties;
  return (
    <AbsoluteFill>
      {/* luz de fundo e cone volumétrico do spot, ATRÁS do troféu */}
      <div style={{ position: 'absolute', left: u(1750 - 1300), top: 0, width: u(2600), height: u(1900), opacity: glow * fade,
        background: `radial-gradient(ellipse 50% 50% at 50% 45%, rgba(${C.greenRGB},.16) 0%, rgba(${C.whiteRGB},.05) 40%, rgba(0,0,0,0) 72%)` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: cone * 0.55 * fade, mixBlendMode: 'screen',
        clipPath: `polygon(${u(1560)}px ${u(-60)}px, ${u(1940)}px ${u(-60)}px, ${u(2720)}px ${u(1760)}px, ${u(780)}px ${u(1760)}px)`,
        background: `linear-gradient(180deg, rgba(${C.whiteRGB},.16) 0%, rgba(${C.whiteRGB},.06) 55%, rgba(${C.whiteRGB},0) 100%)` }} />
      <div style={{ ...box, opacity: inn * fade }}>
        <Img src={asset(TROPHY.src)} style={{ width: '100%', height: '100%', display: 'block' }} />
        {/* placas ilegíveis: camada derivada da arte, desfocada só sobre as placas */}
        <Img src={asset(TROPHY.placas)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      </div>
      {/* estouro de luz: camada aditiva separada, mascarada pela silhueta; os pixels da arte não são alterados.
          Começa como silhueta de luz quase branca e se apaga conforme a arte assenta. */}
      {blown > 0.002 && (
        <div style={{ ...box, background: `rgba(255,255,250,${blown})`, opacity: Math.min(1, seg(t, 21.0, 21.35, E.out)), mixBlendMode: 'plus-lighter', ...amask }} />
      )}
      {/* reflexo especular: uma única passada, mascarado pela silhueta */}
      {spec > 0 && spec < 1 && (
        <div style={{ ...box, mixBlendMode: 'screen', overflow: 'hidden',
          ...amask }}>
          <div style={{ position: 'absolute', top: '-20%', height: '140%', width: '22%', left: `${lerp(-30, 110, spec)}%`,
            transform: 'skewX(-18deg)',
            background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(${C.whiteRGB},.42) 50%, rgba(255,255,255,0) 100%)` }} />
        </div>
      )}
      {/* recuo: escurece por camada (máscara da silhueta), sem tocar nos pixels */}
      {darken > 0 && (
        <div style={{ ...box, background: '#000', opacity: 0.7 * darken * fade,
          ...amask }} />
      )}
    </AbsoluteFill>
  );
};

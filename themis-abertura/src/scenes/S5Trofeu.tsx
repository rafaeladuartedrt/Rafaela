import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C } from '../theme';
import { E, env, lerp, seg, useT } from '../lib/time';
import { asset, TROPHY, useU } from '../lib/units';

/**
 * 0:21–0:26 Troféu (plano herói). Entra do escuro: rim light por trás (contorno),
 * depois spot suave de cima completa a forma (máscara de revelação). Reflexo
 * especular passa uma vez (camada separada). Dolly-in lento até 100% exatos;
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
  const left = (3500 - TROPHY.w) / 2, top = (2000 - TROPHY.h) / 2; // 1017, 313 (inteiros)
  const rim = env(t, 21.3, 22.3, 23.5, 24.55, E.soft);
  const spot = seg(t, 22.1, 23.65, E.soft);
  const fade = 1 - seg(t, 26.1, 26.9, E.soft);
  const darken = seg(t, 25.8, 26.6, E.soft);
  const cone = env(t, 21.9, 23.0, 25.7, 26.5, E.soft);
  const glow = env(t, 21.2, 22.2, 25.8, 26.6, E.soft);
  const spec = seg(t, 23.65, 24.55, E.main);
  const R = lerp(0, 175, spot);
  const revealMask = spot < 1
    ? `radial-gradient(ellipse 120% ${R}% at 50% -6%, #000 0%, #000 ${R * 0.62}%, transparent ${R}%)`
    : undefined;
  const box: React.CSSProperties = {
    position: 'absolute', left: u(left), top: u(top), width: u(TROPHY.w), height: u(TROPHY.h),
    transform: sc === 1 ? undefined : `scale(${sc})`, transformOrigin: 'center center',
  };
  return (
    <AbsoluteFill>
      {/* luz de fundo (motiva o rim) e cone volumétrico do spot, ambos ATRÁS do troféu */}
      <div style={{ position: 'absolute', left: u(1750 - 1300), top: u(1000 - 1000), width: u(2600), height: u(1900), opacity: glow * fade,
        background: `radial-gradient(ellipse 50% 50% at 50% 45%, rgba(${C.greenRGB},.16) 0%, rgba(${C.whiteRGB},.05) 40%, rgba(0,0,0,0) 72%)` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: cone * 0.55 * fade, mixBlendMode: 'screen',
        clipPath: `polygon(${u(1560)}px ${u(-60)}px, ${u(1940)}px ${u(-60)}px, ${u(2720)}px ${u(1760)}px, ${u(780)}px ${u(1760)}px)`,
        background: `linear-gradient(180deg, rgba(${C.whiteRGB},.16) 0%, rgba(${C.whiteRGB},.06) 55%, rgba(${C.whiteRGB},0) 100%)` }} />
      {/* troféu (ativo íntegro) */}
      <div style={{ ...box, opacity: fade, WebkitMaskImage: revealMask, maskImage: revealMask }}>
        {spot > 0 && <Img src={asset('trofeu.png')} style={{ width: '100%', height: '100%', display: 'block' }} />}
      </div>
      {/* rim light: camada separada por cima */}
      {rim > 0 && (
        <div style={{ ...box, opacity: rim * 0.95, mixBlendMode: 'screen' }}>
          <Img src={asset('trofeu_rim.png')} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      )}
      {/* reflexo especular: uma única passada, mascarado pela silhueta */}
      {spec > 0 && spec < 1 && (
        <div style={{ ...box, mixBlendMode: 'screen', overflow: 'hidden',
          WebkitMaskImage: `url(${asset('trofeu_alpha.png')})`, maskImage: `url(${asset('trofeu_alpha.png')})`,
          WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }}>
          <div style={{ position: 'absolute', top: '-20%', height: '140%', width: '22%', left: `${lerp(-30, 110, spec)}%`,
            transform: 'skewX(-18deg)',
            background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(${C.whiteRGB},.42) 50%, rgba(255,255,255,0) 100%)` }} />
        </div>
      )}
      {/* recuo: escurece por camada (máscara da silhueta), sem tocar nos pixels */}
      {darken > 0 && (
        <div style={{ ...box, background: '#000', opacity: 0.7 * darken * fade,
          WebkitMaskImage: `url(${asset('trofeu_alpha.png')})`, maskImage: `url(${asset('trofeu_alpha.png')})`,
          WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }} />
      )}
    </AbsoluteFill>
  );
};

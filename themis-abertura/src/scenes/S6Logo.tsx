import React from 'react';
import { AbsoluteFill, Img, useVideoConfig } from 'remotion';
import { C } from '../theme';
import { E, lerp, seg, T, useT } from '../lib/time';
import { useRasterAsset, useU } from '../lib/units';

/**
 * 0:26–0:30 Logo + volta ao loop. O logo (PNG do vetor, na posição original do
 * telão) é revelado por máscaras: linhas laterais do centro para fora, depois os
 * textos com fade + desfoque que se resolve, sob uma "máscara de luz" que varre.
 * Hold com o PNG íntegro; nos últimos 15 frames dissolve na seda.
 * Regiões medidas no alfa do logo (px do master).
 */
const R = {
  lineL: { x0: 1099, x1: 1251, y0: 1054, y1: 1103 },
  lineR: { x0: 2249, x1: 2401, y0: 1054, y1: 1103 },
  title: { x0: 1090, x1: 2400, y0: 440, y1: 1010 },
  small1: { x0: 1095, x1: 1465, y0: 336, y1: 408 },
  small2: { x0: 1360, x1: 2135, y0: 1036, y1: 1108 },
};
type Box = { x0: number; x1: number; y0: number; y1: number };

export const S6Logo: React.FC = () => {
  const t = useT();
  const u = useU();
  const { fps } = useVideoConfig();
  const logo = useRasterAsset('logo');
  if (t < 26.3) return null;
  const last = T - 1 / fps;
  const dissolve = 1 - seg(t, 29.5, last, E.soft);
  const full: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'block' };
  const inset = (b: Box, l = b.x0, r = b.x1) => `inset(${u(b.y0)}px ${u(3500 - r)}px ${u(2000 - b.y1)}px ${u(l)}px)`;

  // estado final íntegro: um único <Img> sem máscara, filtro ou transformação
  if (t >= 27.95) {
    return <AbsoluteFill style={{ opacity: dissolve }}><Img src={logo} style={full} /></AbsoluteFill>;
  }
  const ln = seg(t, 26.5, 27.15, E.main);
  const ti = seg(t, 26.9, 27.9, E.soft);
  const sm = seg(t, 27.1, 27.95, E.soft);
  const sweep = (p: number) => {
    const P = lerp(-20, 125, p);
    const m = `linear-gradient(100deg, #000 ${P - 22}%, rgba(0,0,0,.35) ${P - 6}%, transparent ${P}%)`;
    return { WebkitMaskImage: m, maskImage: m, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' } as React.CSSProperties;
  };
  const tipL = lerp(R.lineL.x1, R.lineL.x0, ln), tipR = lerp(R.lineR.x0, R.lineR.x1, ln);
  const glint = ln > 0 && ln < 1 ? Math.sin(ln * Math.PI) : 0;
  return (
    <AbsoluteFill>
      {/* linhas laterais: do centro para fora */}
      {ln > 0 && <Img src={logo} style={{ ...full, clipPath: inset(R.lineL, tipL) }} />}
      {ln > 0 && <Img src={logo} style={{ ...full, clipPath: inset(R.lineR, R.lineR.x0, tipR) }} />}
      {/* "Themis de Jornalismo" */}
      {ti > 0 && (
        <div style={{ ...full, ...sweep(ti), opacity: Math.min(1, ti * 1.4) }}>
          <Img src={logo} style={{ ...full, clipPath: inset(R.title), filter: ti < 1 ? `blur(${u(14 * (1 - ti))}px)` : undefined }} />
        </div>
      )}
      {/* "6º PRÊMIO" e "PODER JUDICIÁRIO RS" */}
      {sm > 0 && (
        <div style={{ ...full, ...sweep(sm), opacity: Math.min(1, sm * 1.3) }}>
          <Img src={logo} style={{ ...full, clipPath: inset(R.small1), filter: sm < 1 ? `blur(${u(7 * (1 - sm))}px)` : undefined }} />
          <Img src={logo} style={{ ...full, clipPath: inset(R.small2), filter: sm < 1 ? `blur(${u(7 * (1 - sm))}px)` : undefined }} />
        </div>
      )}
      {/* brilho na ponta das linhas enquanto desenham (camada de luz separada) */}
      {glint > 0 && [tipL, tipR].map((x, i) => (
        <div key={i} style={{ position: 'absolute', left: u(x - 90), top: u(1078 - 90), width: u(180), height: u(180), opacity: glint * 0.8,
          mixBlendMode: 'screen', background: `radial-gradient(circle, rgba(${C.whiteRGB},.9) 0%, rgba(${C.greenRGB},.35) 30%, rgba(0,0,0,0) 70%)` }} />
      ))}
    </AbsoluteFill>
  );
};

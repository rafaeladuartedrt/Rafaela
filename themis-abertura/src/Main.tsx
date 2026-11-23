import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { RenderConfig } from './config';
import { TimeProvider, env, E } from './lib/time';
import { asset, TROPHY, useU } from './lib/units';
import { excludeMask } from './lib/ui';
import { Silk } from './layers/Silk';
import { Beam } from './layers/Beam';
import { Particles } from './layers/Particles';
import { Grain, Vignette } from './layers/Film';
import { GreenLine } from './scenes/GreenLine';
import { S1Jornalismo } from './scenes/S1Jornalismo';
import { S2Judiciario } from './scenes/S2Judiciario';
import { S3Espaco } from './scenes/S3Espaco';
import { DarkStage, S5Trofeu, trophyScale } from './scenes/S5Trofeu';
import { S6Logo } from './scenes/S6Logo';
import { C } from './theme';

/** Camadas de pós (luz, poeira, vinheta, grão) nunca passam sobre os ativos protegidos. */
const usePostMask = (t: number): React.CSSProperties | undefined => {
  const u = useU();
  const { width } = useVideoConfig();
  const logoEx = staticFile(`assets/logo_exclude_${width}.png`);
  if (t >= 22.0 && t < 25.8) {
    const s = trophyScale(t);
    const w = TROPHY.w * s, h = TROPHY.h * s;
    return excludeMask(asset(TROPHY.exclude), u(TROPHY.x + TROPHY.w / 2 - w / 2 - 8 * s), u(TROPHY.y + TROPHY.h / 2 - h / 2 - 8 * s), u(w + 16 * s), u(h + 16 * s));
  }
  if (t >= 26.9 && t < 29.5) return excludeMask(logoEx, 0, 0, u(3500), u(2000));
  return undefined;
};

export const Main: React.FC<RenderConfig> = ({ post }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const mask = usePostMask(t);
  const fg = env(t, 21.2, 22.0, 26.2, 26.9, E.soft);
  return (
    <TimeProvider t={t}>
      <AbsoluteFill style={{ backgroundColor: C.gray }}>
        <Silk />
        <DarkStage />
        {/* ordem: cada cena sai revelando a seguinte, que está por baixo */}
        <S5Trofeu />
        <S3Espaco />
        <S2Judiciario />
        <S1Jornalismo />
        <S6Logo />
        <GreenLine />
        {post && (
          <>
            <AbsoluteFill style={mask}><Beam /></AbsoluteFill>
            <AbsoluteFill style={mask}><Particles fg={fg} /></AbsoluteFill>
            <Vignette maskStyle={mask} />
            <Grain maskStyle={mask} />
          </>
        )}
      </AbsoluteFill>
    </TimeProvider>
  );
};

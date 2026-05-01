import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../constants';
import { fadeIn, fadeOut, slideUp, countUp, pulseScale } from '../utils/animations';
import { GrainOverlay } from './GrainOverlay';

// Cena 2 | 00:03–00:08 | 124 denúncias/dia
export const SceneDado1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entradaOpacity = fadeIn(frame, 0, 18);
  const saidaOpacity = fadeOut(frame, durationInFrames - 20, 18);
  const sceneOpacity = Math.min(entradaOpacity, saidaOpacity);

  const numero = countUp(frame, 12, 60, 0, 124);
  const pulse = pulseScale(frame, 0.06, 0.015);

  const labelY = slideUp(frame, 18, fps, 50);
  const labelOpacity = fadeIn(frame, 18, 18);

  const fonteOpacity = fadeIn(frame, 70, 20);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.laranjaPrincipal} 0%, ${COLORS.laranjaQueimado} 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: sceneOpacity,
      }}
    >
      <GrainOverlay opacity={0.06} />

      {/* Círculo de fundo decorativo */}
      <div
        style={{
          position: 'absolute',
          width: 820,
          height: 820,
          borderRadius: '50%',
          border: `3px solid rgba(255,255,255,0.12)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          border: `2px solid rgba(255,255,255,0.08)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Número principal */}
      <div style={{ textAlign: 'center', transform: `scale(${pulse})` }}>
        <div
          style={{
            fontFamily: FONTS.titulo,
            fontSize: 260,
            color: COLORS.branco,
            lineHeight: 1,
            textShadow: `0 8px 40px rgba(0,0,0,0.3)`,
          }}
        >
          {numero}
        </div>

        {/* Label */}
        <div
          style={{
            transform: `translateY(${labelY}px)`,
            opacity: labelOpacity,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 58,
              color: COLORS.branco,
              textTransform: 'uppercase',
              letterSpacing: 4,
              lineHeight: 1.1,
            }}
          >
            DENÚNCIAS
          </div>
          <div
            style={{
              fontFamily: FONTS.corpo,
              fontSize: 38,
              color: 'rgba(255,255,255,0.85)',
              marginTop: 8,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            POR DIA NO BRASIL
          </div>
        </div>

        {/* Linha decorativa */}
        <div
          style={{
            width: 80,
            height: 4,
            background: 'rgba(255,255,255,0.5)',
            margin: '32px auto',
            borderRadius: 2,
            opacity: labelOpacity,
          }}
        />

        {/* Fonte */}
        <div
          style={{
            fontFamily: FONTS.corpo,
            fontSize: 24,
            color: 'rgba(255,255,255,0.65)',
            opacity: fonteOpacity,
            letterSpacing: 1,
          }}
        >
          Fundação Abrinq, 2024
        </div>
      </div>
    </AbsoluteFill>
  );
};

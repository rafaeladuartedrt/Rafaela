import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../constants';
import { fadeIn, fadeOut, slideUp, pulseScale, glowOpacity } from '../utils/animations';
import { GrainOverlay } from './GrainOverlay';

// Cena 6 | 00:23–00:28 | Disque 100
export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entradaOpacity = fadeIn(frame, 0, 18);
  const saidaOpacity = fadeOut(frame, durationInFrames - 20, 18);
  const sceneOpacity = Math.min(entradaOpacity, saidaOpacity);

  const pulse = pulseScale(frame, 0.05, 0.02);
  const glowAlpha = glowOpacity(frame, 0.04, 0.5, 0.25);

  const disqueY = slideUp(frame, 8, fps, 80);
  const disqueOpacity = fadeIn(frame, 8, 20);

  const numeroY = slideUp(frame, 20, fps, 60);
  const numeroOpacity = fadeIn(frame, 20, 22);

  const textoOpacity = fadeIn(frame, 38, 20);
  const textoY = slideUp(frame, 38, fps, 40);

  const botaoOpacity = fadeIn(frame, 55, 22);
  const botaoScale = pulseScale(frame, 0.08, 0.025);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.laranjaPrincipal} 0%, ${COLORS.laranjaQueimado} 55%, #8B3300 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: sceneOpacity,
        overflow: 'hidden',
      }}
    >
      <GrainOverlay opacity={0.07} />

      {/* Glow central de fundo */}
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,200,100,${glowAlpha}) 0%, transparent 70%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Círculos concêntricos decorativos */}
      {[900, 700, 500].map((size, i) => (
        <div
          key={size}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: '50%',
            border: `2px solid rgba(255,255,255,${0.06 - i * 0.015})`,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${pulse})`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Conteúdo central */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
        {/* DISQUE */}
        <div
          style={{
            transform: `translateY(${disqueY}px)`,
            opacity: disqueOpacity,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.corpo,
              fontSize: 38,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: 14,
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            DISQUE
          </div>
        </div>

        {/* 100 */}
        <div
          style={{
            transform: `translateY(${numeroY}px) scale(${pulse})`,
            opacity: numeroOpacity,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 360,
              color: COLORS.branco,
              lineHeight: 0.85,
              textShadow: `0 10px 60px rgba(0,0,0,0.4), 0 0 120px rgba(255,200,100,0.3)`,
            }}
          >
            100
          </div>
        </div>

        {/* Linha decorativa */}
        <div
          style={{
            width: 200,
            height: 4,
            background: 'rgba(255,255,255,0.5)',
            margin: '16px auto 24px',
            borderRadius: 2,
            opacity: textoOpacity,
          }}
        />

        {/* Texto */}
        <div
          style={{
            transform: `translateY(${textoY}px)`,
            opacity: textoOpacity,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 46,
              color: COLORS.branco,
              textTransform: 'uppercase',
              letterSpacing: 2,
              lineHeight: 1.15,
            }}
          >
            DENUNCIE ABUSO
          </div>
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 46,
              color: COLORS.branco,
              textTransform: 'uppercase',
              letterSpacing: 2,
              lineHeight: 1.15,
            }}
          >
            E EXPLORAÇÃO SEXUAL
          </div>
          <div
            style={{
              fontFamily: FONTS.corpo,
              fontSize: 28,
              color: 'rgba(255,255,255,0.75)',
              marginTop: 16,
              lineHeight: 1.4,
            }}
          >
            Gratuito · 24 horas · Sigiloso
          </div>
        </div>

        {/* Botão de ação */}
        <div
          style={{
            marginTop: 48,
            opacity: botaoOpacity,
            transform: `scale(${botaoScale})`,
          }}
        >
          <div
            style={{
              background: COLORS.branco,
              borderRadius: 50,
              padding: '22px 64px',
              display: 'inline-block',
              boxShadow: `0 8px 40px rgba(0,0,0,0.3)`,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.titulo,
                fontSize: 38,
                color: COLORS.laranjaPrincipal,
                textTransform: 'uppercase',
                letterSpacing: 3,
              }}
            >
              LIGUE AGORA
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

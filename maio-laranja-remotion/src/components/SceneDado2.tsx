import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../constants';
import { fadeIn, fadeOut, slideUp, slideDown } from '../utils/animations';
import { GrainOverlay } from './GrainOverlay';

// Cena 3 | 00:08–00:13 | 67,4% em casa
export const SceneDado2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entradaOpacity = fadeIn(frame, 0, 18);
  const saidaOpacity = fadeOut(frame, durationInFrames - 20, 18);
  const sceneOpacity = Math.min(entradaOpacity, saidaOpacity);

  const percentualY = slideDown(frame, 8, fps, 80);
  const percentualOpacity = fadeIn(frame, 8, 20);

  const textoY = slideUp(frame, 22, fps, 50);
  const textoOpacity = fadeIn(frame, 22, 20);

  const barraWidth = Math.min(
    674 * Math.max(0, (frame - 40) / 60),
    674
  );
  const barraOpacity = fadeIn(frame, 38, 12);

  const iconeOpacity = fadeIn(frame, 55, 20);
  const fonteOpacity = fadeIn(frame, 90, 18);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.pretoAbsoluto} 0%, ${COLORS.pretoFundo} 100%)`,
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0 72px',
        opacity: sceneOpacity,
      }}
    >
      <GrainOverlay opacity={0.05} />

      {/* Listra laranja vertical */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          background: `linear-gradient(180deg, ${COLORS.laranjaPrincipal}, ${COLORS.laranjaQueimado})`,
        }}
      />

      <div style={{ marginTop: 360 }}>
        {/* Label superior */}
        <div
          style={{
            fontFamily: FONTS.corpo,
            fontSize: 30,
            color: COLORS.laranjaClaro,
            textTransform: 'uppercase',
            letterSpacing: 6,
            fontWeight: 700,
            opacity: fadeIn(frame, 0, 14),
          }}
        >
          VIOLÊNCIA DOMÉSTICA
        </div>

        {/* Percentual */}
        <div
          style={{
            fontFamily: FONTS.titulo,
            fontSize: 220,
            color: COLORS.laranjaPrincipal,
            lineHeight: 0.9,
            transform: `translateY(${percentualY}px)`,
            opacity: percentualOpacity,
            marginTop: 20,
          }}
        >
          67,4<span style={{ fontSize: 100, color: COLORS.laranjaClaro }}>%</span>
        </div>

        {/* Texto descritivo */}
        <div
          style={{
            transform: `translateY(${textoY}px)`,
            opacity: textoOpacity,
            marginTop: 24,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 54,
              color: COLORS.branco,
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            DOS CASOS OCORREM
          </div>
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 54,
              color: COLORS.branco,
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            DENTRO DE{' '}
            <span style={{ color: COLORS.laranjaPrincipal }}>CASA</span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div style={{ marginTop: 48, opacity: barraOpacity }}>
          <div
            style={{
              width: 936,
              height: 12,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: barraWidth,
                height: '100%',
                background: `linear-gradient(90deg, ${COLORS.laranjaPrincipal}, ${COLORS.laranjaClaro})`,
                borderRadius: 6,
                boxShadow: `0 0 20px ${COLORS.laranjaPrincipal}88`,
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 10,
              fontFamily: FONTS.corpo,
              fontSize: 22,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <span>0%</span>
            <span>67,4%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Ícone casa */}
        <div
          style={{
            position: 'absolute',
            right: 72,
            top: 340,
            opacity: iconeOpacity,
            fontSize: 160,
            lineHeight: 1,
          }}
        >
          🏠
        </div>

        {/* Fonte */}
        <div
          style={{
            fontFamily: FONTS.corpo,
            fontSize: 24,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 48,
            opacity: fonteOpacity,
          }}
        >
          Fundação Abrinq — Cenário da Infância 2025
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../constants';
import { fadeIn, fadeOut, slideUp, countUp } from '../utils/animations';
import { GrainOverlay } from './GrainOverlay';

// Mapa SVG simplificado do RS (outline)
const MapaRS: React.FC<{ opacity: number }> = ({ opacity }) => (
  <svg
    viewBox="0 0 340 380"
    width={340}
    height={380}
    style={{ opacity, position: 'absolute', right: 60, top: 280 }}
  >
    <defs>
      <filter id="glow-map">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Outline do RS — forma simplificada */}
    <path
      d="M 60 20 L 180 10 L 280 50 L 330 120 L 320 200 L 290 280 L 220 350 L 160 370 L 80 340 L 30 270 L 20 180 L 40 100 Z"
      fill={`${COLORS.laranjaPrincipal}22`}
      stroke={COLORS.laranjaPrincipal}
      strokeWidth="3"
      filter="url(#glow-map)"
    />
    {/* Ponto capital — Porto Alegre */}
    <circle cx="170" cy="310" r="10" fill={COLORS.laranjaClaro} />
    <circle cx="170" cy="310" r="18" fill="none" stroke={COLORS.laranjaClaro} strokeWidth="2" opacity="0.6" />
    <text x="185" y="315" fill={COLORS.branco} fontSize="18" fontFamily="sans-serif" fontWeight="bold">POA</text>
  </svg>
);

// Cena 4 | 00:13–00:18 | RS 12.371 casos
export const SceneDado3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entradaOpacity = fadeIn(frame, 0, 18);
  const saidaOpacity = fadeOut(frame, durationInFrames - 20, 18);
  const sceneOpacity = Math.min(entradaOpacity, saidaOpacity);

  const mapaOpacity = fadeIn(frame, 10, 30);
  const numeroY = slideUp(frame, 14, fps, 70);
  const numeroOpacity = fadeIn(frame, 14, 20);

  const numero = countUp(frame, 20, 70, 0, 12371);
  const numeroFormatado = numero.toLocaleString('pt-BR');

  const textoOpacity = fadeIn(frame, 36, 20);
  const textoY = slideUp(frame, 36, fps, 40);

  const fonteOpacity = fadeIn(frame, 95, 18);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(145deg, ${COLORS.pretoFundo} 0%, #2A1000 100%)`,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        padding: '0 72px',
        opacity: sceneOpacity,
        overflow: 'hidden',
      }}
    >
      <GrainOverlay opacity={0.05} />

      {/* Mapa RS */}
      <MapaRS opacity={mapaOpacity} />

      {/* Gradiente sobre o mapa */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 200,
          width: 500,
          height: 600,
          background: `linear-gradient(90deg, ${COLORS.pretoFundo} 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ marginTop: 280 }}>
        {/* Bandeira RS / Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: fadeIn(frame, 0, 16),
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: COLORS.laranjaPrincipal,
              borderRadius: 6,
              padding: '6px 18px',
              fontFamily: FONTS.corpo,
              fontSize: 26,
              fontWeight: 900,
              color: COLORS.branco,
              letterSpacing: 4,
            }}
          >
            RS
          </div>
          <span
            style={{
              fontFamily: FONTS.corpo,
              fontSize: 26,
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Rio Grande do Sul
          </span>
        </div>

        {/* Número */}
        <div
          style={{
            transform: `translateY(${numeroY}px)`,
            opacity: numeroOpacity,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 160,
              color: COLORS.laranjaPrincipal,
              lineHeight: 0.95,
              textShadow: `0 0 60px ${COLORS.laranjaPrincipal}66`,
            }}
          >
            {numeroFormatado}
          </div>
        </div>

        {/* Texto */}
        <div
          style={{
            transform: `translateY(${textoY}px)`,
            opacity: textoOpacity,
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 52,
              color: COLORS.branco,
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            CASOS REGISTRADOS
          </div>
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 52,
              color: COLORS.branco,
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            EM <span style={{ color: COLORS.laranjaClaro }}>2024</span>
          </div>

          {/* Detalhe */}
          <div
            style={{
              fontFamily: FONTS.corpo,
              fontSize: 32,
              color: 'rgba(255,255,255,0.55)',
              marginTop: 20,
              lineHeight: 1.4,
            }}
          >
            de violência sexual contra crianças<br />
            e adolescentes notificados ao SINAN
          </div>
        </div>

        {/* Fonte */}
        <div
          style={{
            fontFamily: FONTS.corpo,
            fontSize: 22,
            color: 'rgba(255,255,255,0.35)',
            marginTop: 48,
            opacity: fonteOpacity,
          }}
        >
          SINAN / SES-RS, acesso abril 2025
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../constants';
import { fadeIn, scaleIn, glowOpacity } from '../utils/animations';
import { GrainOverlay } from './GrainOverlay';

// Logo TJRS — SVG placeholder representativo
// Para usar o logo oficial: importe via <Img src={staticFile('logo-tjrs.svg')} />
const LogoTJRS: React.FC<{ opacity: number; scale: number }> = ({ opacity, scale }) => (
  <div
    style={{
      opacity,
      transform: `scale(${scale})`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0,
    }}
  >
    {/* Símbolo — balança da justiça estilizada */}
    <svg width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="grad-logo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.laranjaClaro} />
          <stop offset="100%" stopColor={COLORS.laranjaPrincipal} />
        </linearGradient>
        <filter id="glow-logo">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Haste central */}
      <rect x="97" y="30" width="6" height="130" rx="3" fill="url(#grad-logo)" filter="url(#glow-logo)" />
      {/* Barra horizontal */}
      <rect x="30" y="56" width="140" height="6" rx="3" fill="url(#grad-logo)" filter="url(#glow-logo)" />
      {/* Prato esquerdo */}
      <ellipse cx="60" cy="100" rx="32" ry="10" fill="none" stroke="url(#grad-logo)" strokeWidth="4" />
      <line x1="60" y1="60" x2="60" y2="90" stroke="url(#grad-logo)" strokeWidth="3" />
      {/* Prato direito */}
      <ellipse cx="140" cy="100" rx="32" ry="10" fill="none" stroke="url(#grad-logo)" strokeWidth="4" />
      <line x1="140" y1="60" x2="140" y2="90" stroke="url(#grad-logo)" strokeWidth="3" />
      {/* Base */}
      <rect x="70" y="158" width="60" height="8" rx="4" fill="url(#grad-logo)" />
      {/* Estrela / ornamento topo */}
      <circle cx="100" cy="28" r="10" fill="url(#grad-logo)" filter="url(#glow-logo)" />
    </svg>

    {/* Texto TJRS */}
    <div
      style={{
        fontFamily: FONTS.titulo,
        fontSize: 96,
        color: COLORS.laranjaPrincipal,
        letterSpacing: 6,
        lineHeight: 0.9,
        textShadow: `0 0 40px ${COLORS.laranjaPrincipal}66`,
      }}
    >
      TJRS
    </div>
    <div
      style={{
        fontFamily: FONTS.corpo,
        fontSize: 22,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginTop: 10,
      }}
    >
      Tribunal de Justiça
    </div>
    <div
      style={{
        fontFamily: FONTS.corpo,
        fontSize: 22,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: 3,
        textTransform: 'uppercase',
      }}
    >
      do Rio Grande do Sul
    </div>
  </div>
);

// Cena 7 | 00:28–00:30 | Logo TJRS
export const SceneEncerramento: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glow = glowOpacity(frame, 0.06, 0.3, 0.15);

  const logoScale = scaleIn(frame, 8, fps);
  const logoOpacity = fadeIn(frame, 8, 22);

  const hashtagOpacity = fadeIn(frame, 30, 20);
  const maioOpacity = fadeIn(frame, 38, 18);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.pretoAbsoluto,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <GrainOverlay opacity={0.06} />

      {/* Glow radial */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(232,93,0,${glow}) 0%, transparent 65%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <LogoTJRS opacity={logoOpacity} scale={logoScale} />

        {/* Divisor */}
        <div
          style={{
            width: 120,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${COLORS.laranjaPrincipal}, transparent)`,
            margin: '32px auto',
            opacity: hashtagOpacity,
          }}
        />

        {/* Hashtag */}
        <div style={{ opacity: hashtagOpacity }}>
          <span
            style={{
              fontFamily: FONTS.corpo,
              fontSize: 34,
              color: COLORS.laranjaClaro,
              fontWeight: 900,
              letterSpacing: 2,
            }}
          >
            #MaioLaranja
          </span>
          <span
            style={{
              fontFamily: FONTS.corpo,
              fontSize: 34,
              color: 'rgba(255,255,255,0.4)',
              marginLeft: 20,
              fontWeight: 400,
            }}
          >
            2025
          </span>
        </div>

        {/* Slogan final */}
        <div style={{ opacity: maioOpacity, marginTop: 12 }}>
          <span
            style={{
              fontFamily: FONTS.corpo,
              fontSize: 26,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: 2,
            }}
          >
            Proteger é responsabilidade de todos.
          </span>
        </div>
      </div>

      {/* Linha inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, ${COLORS.laranjaQueimado}, ${COLORS.laranjaPrincipal}, ${COLORS.laranjaClaro})`,
          opacity: fadeIn(frame, 0, 20),
        }}
      />
    </AbsoluteFill>
  );
};

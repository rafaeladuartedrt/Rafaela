import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../constants';
import { fadeIn, fadeOut, slideUp, scaleIn } from '../utils/animations';
import { GrainOverlay } from './GrainOverlay';

// Ícones de redes sociais / digital — representados por formas SVG
const IconeDigital: React.FC<{ delay: number; icon: string; label: string; frame: number; fps: number }> = ({
  delay, icon, label, frame, fps,
}) => {
  const scale = scaleIn(frame, delay, fps);
  const opacity = fadeIn(frame, delay, 12);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 24,
          background: `${COLORS.laranjaPrincipal}22`,
          border: `2px solid ${COLORS.laranjaPrincipal}66`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 52,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontFamily: FONTS.corpo,
          fontSize: 20,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
};

// Cena 5 | 00:18–00:23 | Digital 1 em 4
export const SceneDado4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entradaOpacity = fadeIn(frame, 0, 18);
  const saidaOpacity = fadeOut(frame, durationInFrames - 20, 18);
  const sceneOpacity = Math.min(entradaOpacity, saidaOpacity);

  const tituloY = slideUp(frame, 10, fps, 60);
  const tituloOpacity = fadeIn(frame, 10, 20);

  const fracaoOpacity = fadeIn(frame, 25, 20);
  const fracaoY = slideUp(frame, 25, fps, 50);

  const fonteOpacity = fadeIn(frame, 100, 18);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.pretoAbsoluto} 60%, #1A0800 100%)`,
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0 72px',
        opacity: sceneOpacity,
      }}
    >
      <GrainOverlay opacity={0.05} />

      {/* Grid decorativo de fundo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${COLORS.laranjaPrincipal}08 1px, transparent 1px), linear-gradient(90deg, ${COLORS.laranjaPrincipal}08 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      <div style={{ marginTop: 260 }}>
        {/* Badge */}
        <div
          style={{
            fontFamily: FONTS.corpo,
            fontSize: 28,
            color: COLORS.laranjaClaro,
            textTransform: 'uppercase',
            letterSpacing: 6,
            fontWeight: 700,
            opacity: fadeIn(frame, 0, 14),
            marginBottom: 30,
          }}
        >
          VIOLÊNCIA DIGITAL
        </div>

        {/* Título */}
        <div
          style={{
            transform: `translateY(${tituloY}px)`,
            opacity: tituloOpacity,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 62,
              color: COLORS.branco,
              textTransform: 'uppercase',
              lineHeight: 1.05,
            }}
          >
            CRIANÇAS SOFREM
          </div>
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 62,
              color: COLORS.branco,
              textTransform: 'uppercase',
              lineHeight: 1.05,
            }}
          >
            ASSÉDIO{' '}
            <span style={{ color: COLORS.laranjaPrincipal }}>ONLINE</span>
          </div>
        </div>

        {/* Fração 1 em 4 */}
        <div
          style={{
            transform: `translateY(${fracaoY}px)`,
            opacity: fracaoOpacity,
            marginTop: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* 1 */}
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 300,
              color: COLORS.laranjaPrincipal,
              lineHeight: 0.85,
              textShadow: `0 0 80px ${COLORS.laranjaPrincipal}55`,
            }}
          >
            1
          </div>
          {/* Separador */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: FONTS.corpo, fontSize: 36, color: 'rgba(255,255,255,0.5)', fontWeight: 300 }}>em</div>
            <div
              style={{
                width: 4,
                height: 80,
                background: `linear-gradient(180deg, ${COLORS.laranjaPrincipal}, transparent)`,
                borderRadius: 2,
              }}
            />
          </div>
          {/* 4 */}
          <div
            style={{
              fontFamily: FONTS.titulo,
              fontSize: 300,
              color: 'rgba(255,255,255,0.15)',
              lineHeight: 0.85,
            }}
          >
            4
          </div>
        </div>

        {/* Ícones redes sociais */}
        <div
          style={{
            display: 'flex',
            gap: 28,
            marginTop: 48,
          }}
        >
          <IconeDigital frame={frame} fps={fps} delay={50} icon="📱" label="Celular" />
          <IconeDigital frame={frame} fps={fps} delay={58} icon="💬" label="Mensagens" />
          <IconeDigital frame={frame} fps={fps} delay={66} icon="📷" label="Fotos" />
          <IconeDigital frame={frame} fps={fps} delay={74} icon="🎮" label="Jogos" />
          <IconeDigital frame={frame} fps={fps} delay={82} icon="🌐" label="Internet" />
        </div>

        {/* Fonte */}
        <div
          style={{
            fontFamily: FONTS.corpo,
            fontSize: 22,
            color: 'rgba(255,255,255,0.35)',
            marginTop: 40,
            opacity: fonteOpacity,
          }}
        >
          UNESCO / SaferNet Brasil
        </div>
      </div>
    </AbsoluteFill>
  );
};

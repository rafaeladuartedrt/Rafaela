import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../constants';
import { fadeIn, typingProgress } from '../utils/animations';
import { GrainOverlay } from './GrainOverlay';

const TEXTO = 'TODA CRIANÇA\nMERECE PROTEÇÃO.';
const SUBTEXTO = 'Maio Laranja — campanha de combate\nao abuso e exploração sexual infantil';

export const SceneAbertura: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Linha laranja desce
  const linhaOpacity = fadeIn(frame, 5, 15);
  const linhaHeight = linhaOpacity * 6;

  // Título aparece com typing
  const charsVisiveis = typingProgress(frame, 20, TEXTO.replace('\n', '').length, fps);
  const textoVisivel = TEXTO.replace('\n', '').slice(0, charsVisiveis);

  // Cursor piscando
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  // Subtexto fade após título completo
  const subtextoOpacity = fadeIn(frame, 68, 14);

  return (
    <AbsoluteFill style={{ background: COLORS.pretoAbsoluto, justifyContent: 'center', alignItems: 'flex-start', padding: '0 72px' }}>
      <GrainOverlay opacity={0.05} />

      {/* Linha laranja decorativa */}
      <div
        style={{
          position: 'absolute',
          top: 280,
          left: 72,
          width: 64,
          height: linhaHeight,
          background: COLORS.laranjaPrincipal,
          opacity: linhaOpacity,
          borderRadius: 3,
        }}
      />

      {/* Badge campanha */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          left: 72,
          opacity: fadeIn(frame, 0, 12),
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.laranjaPrincipal }} />
        <span style={{ fontFamily: FONTS.corpo, fontSize: 26, color: COLORS.laranjaClaro, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>
          @tjrsoficial
        </span>
      </div>

      {/* Título com efeito typing */}
      <div style={{ marginTop: 120 }}>
        <div
          style={{
            fontFamily: FONTS.titulo,
            fontSize: 118,
            lineHeight: 1.0,
            color: COLORS.branco,
            textTransform: 'uppercase',
            letterSpacing: -2,
            whiteSpace: 'pre-line',
            opacity: fadeIn(frame, 18, 6),
          }}
        >
          {textoVisivel.includes('PROTEÇÃO') ? (
            <>
              {textoVisivel.replace('PROTEÇÃO.', '')}
              <span style={{ color: COLORS.laranjaPrincipal }}>PROTEÇÃO.</span>
            </>
          ) : (
            textoVisivel
          )}
          {cursorVisible && frame < 76 && (
            <span style={{ color: COLORS.laranjaPrincipal, opacity: 0.9 }}>|</span>
          )}
        </div>

        {/* Subtexto */}
        <p
          style={{
            fontFamily: FONTS.corpo,
            fontSize: 32,
            color: '#CCCCCC',
            lineHeight: 1.5,
            marginTop: 36,
            opacity: subtextoOpacity,
            fontWeight: 400,
            maxWidth: 700,
          }}
        >
          {SUBTEXTO}
        </p>
      </div>

      {/* Linha inferior laranja */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, ${COLORS.laranjaPrincipal}, ${COLORS.laranjaClaro})`,
          opacity: fadeIn(frame, 10, 20),
        }}
      />
    </AbsoluteFill>
  );
};

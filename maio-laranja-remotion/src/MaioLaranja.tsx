import React from 'react';
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { SCENES, WIPE_DURATION } from './constants';
import { SceneAbertura } from './components/SceneAbertura';
import { SceneDado1 } from './components/SceneDado1';
import { SceneDado2 } from './components/SceneDado2';
import { SceneDado3 } from './components/SceneDado3';
import { SceneDado4 } from './components/SceneDado4';
import { SceneCTA } from './components/SceneCTA';
import { SceneEncerramento } from './components/SceneEncerramento';
import { SceneWipe } from './components/SceneWipe';

// Carrega fontes locais (evita dependência de rede no render)
const fontFaces = `
  @font-face {
    font-family: 'Anton';
    font-style: normal;
    font-weight: 400;
    src: url('${staticFile('fonts/Anton-Regular.ttf')}') format('truetype');
  }
  @font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 400;
    src: url('${staticFile('fonts/Nunito-Regular.ttf')}') format('truetype');
  }
  @font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 700;
    src: url('${staticFile('fonts/Nunito-Bold.ttf')}') format('truetype');
  }
  @font-face {
    font-family: 'Nunito';
    font-style: normal;
    font-weight: 900;
    src: url('${staticFile('fonts/Nunito-Black.ttf')}') format('truetype');
  }
`;

export const MaioLaranja: React.FC = () => {
  const frame = useCurrentFrame();

  const wipeFrames = [
    SCENES.dado1.from,
    SCENES.dado2.from,
    SCENES.dado3.from,
    SCENES.dado4.from,
    SCENES.cta.from,
    SCENES.encerramento.from,
  ];

  return (
    <AbsoluteFill style={{ background: '#111111', overflow: 'hidden' }}>
      <style>{fontFaces}</style>

      {/* Cena 1 — Abertura */}
      <Sequence from={SCENES.abertura.from} durationInFrames={SCENES.abertura.durationInFrames + WIPE_DURATION}>
        <SceneAbertura />
      </Sequence>

      {/* Cena 2 — Dado 1: 124 denúncias/dia */}
      <Sequence from={SCENES.dado1.from} durationInFrames={SCENES.dado1.durationInFrames + WIPE_DURATION}>
        <SceneDado1 />
      </Sequence>

      {/* Cena 3 — Dado 2: 67,4% em casa */}
      <Sequence from={SCENES.dado2.from} durationInFrames={SCENES.dado2.durationInFrames + WIPE_DURATION}>
        <SceneDado2 />
      </Sequence>

      {/* Cena 4 — Dado 3: RS 12.371 casos */}
      <Sequence from={SCENES.dado3.from} durationInFrames={SCENES.dado3.durationInFrames + WIPE_DURATION}>
        <SceneDado3 />
      </Sequence>

      {/* Cena 5 — Dado 4: Digital 1 em 4 */}
      <Sequence from={SCENES.dado4.from} durationInFrames={SCENES.dado4.durationInFrames + WIPE_DURATION}>
        <SceneDado4 />
      </Sequence>

      {/* Cena 6 — CTA: Disque 100 */}
      <Sequence from={SCENES.cta.from} durationInFrames={SCENES.cta.durationInFrames + WIPE_DURATION}>
        <SceneCTA />
      </Sequence>

      {/* Cena 7 — Encerramento: Logo TJRS */}
      <Sequence from={SCENES.encerramento.from} durationInFrames={SCENES.encerramento.durationInFrames}>
        <SceneEncerramento />
      </Sequence>

      {/* Wipes de transição */}
      {wipeFrames.map((triggerFrame, i) => (
        <SceneWipe
          key={triggerFrame}
          frame={frame}
          triggerFrame={triggerFrame - WIPE_DURATION}
          direction={i % 2 === 0 ? 'right' : 'left'}
        />
      ))}
    </AbsoluteFill>
  );
};

import React from 'react';
import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { PalacioJustica } from './PalacioJustica.tsx';
import { IntegrityCheck, integrityList } from './IntegrityCheck.tsx';
import { DURATION, FPS } from './core/config.ts';

const handle = delayRender('fontes');
Promise.all(
  [300, 400].map((w) => new FontFace('Inter', `url(${staticFile(`fonts/inter-latin-${w}-normal.woff2`)})`, { weight: String(w) }).load()),
).then((faces) => { faces.forEach((ff) => document.fonts.add(ff)); continueRender(handle); });

export const Root: React.FC = () => (
  <>
    <Composition id="PalacioJustica" component={PalacioJustica} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="PalacioJustica16x9" component={PalacioJustica} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="IntegrityCheck" component={IntegrityCheck} durationInFrames={Math.max(1, integrityList.length)} fps={FPS} width={1920} height={1080} />
  </>
);

import React from 'react';
import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { DEFAULT_CONFIG, DURATION_SECONDS, RenderConfig } from './config';
import { Main } from './Main';

const css = [300, 600, 800, 900]
  .map((w) => `@font-face{font-family:'Montserrat';font-style:normal;font-weight:${w};font-display:block;` +
    `src:url('${staticFile(`fonts/montserrat-latin-${w}-normal.woff2`)}') format('woff2');}`)
  .join('\n');

if (typeof document !== 'undefined') {
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
  const h = delayRender('fontes Montserrat');
  Promise.all(["300","600","800","900"].map((w) => document.fonts.load(`${w} 100px Montserrat`, 'JUDICIÁRIO INOVAÇÃO NOTÍCIA º')))
    .then(() => continueRender(h))
    .catch(() => continueRender(h));
}

export const Root: React.FC = () => (
  <Composition
    id="ThemisAbertura"
    component={Main as unknown as React.FC<Record<string, unknown>>}
    durationInFrames={DURATION_SECONDS * DEFAULT_CONFIG.fps}
    fps={DEFAULT_CONFIG.fps}
    width={DEFAULT_CONFIG.width}
    height={DEFAULT_CONFIG.height}
    defaultProps={DEFAULT_CONFIG as unknown as Record<string, unknown>}
    calculateMetadata={({ props }) => {
      const p = props as unknown as RenderConfig;
      return { fps: p.fps, durationInFrames: DURATION_SECONDS * p.fps, width: p.width, height: p.height };
    }}
  />
);

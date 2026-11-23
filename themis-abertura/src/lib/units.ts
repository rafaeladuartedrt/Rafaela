import { staticFile, useVideoConfig } from 'remotion';
import { MASTER_WIDTH } from '../config';

/** px do master (3500) -> px da composição atual */
export const useU = () => {
  const { width } = useVideoConfig();
  return (n: number) => (n * width) / MASTER_WIDTH;
};

/** logo e seda são rasterizados dos vetores na largura exata da composição */
export const useRasterAsset = (name: 'logo' | 'seda' | 'seda_sheen') => {
  const { width } = useVideoConfig();
  return staticFile(`assets/${name}_${width}.${name === 'seda_sheen' ? 'jpg' : 'png'}`);
};

export const asset = (p: string) => staticFile(`assets/${p}`);

/** troféu: arte vertical (silhueta verde + foto em Multiply), rasterizada do PDF no tamanho de exibição, 1:1, centrada */
export const TROPHY = { w: 926, h: 1598, src: 'trofeu2.png', alpha: 'trofeu2_alpha.png', exclude: 'trofeu2_exclude.png' };

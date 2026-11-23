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

/** troféu: imagem embutida no PDF (1340x1256) + smask original, 1:1, centrada (master) */
export const TROPHY = { w: 1340, h: 1256, src: 'trofeu_recorte.png', alpha: 'trofeu_recorte_alpha.png', exclude: 'trofeu_recorte_exclude.png' };

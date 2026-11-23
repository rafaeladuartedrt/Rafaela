/**
 * Parâmetros técnicos. Para gerar a versão no tamanho nativo do painel de LED,
 * altere WIDTH/HEIGHT (ou passe --props) e rode `npm run assets:native` para
 * re-rasterizar logo e seda a partir dos vetores nesse tamanho.
 */
export const MASTER_WIDTH = 3500; // 350 cm  -> 1 px = 1 mm
export const MASTER_HEIGHT = 2000; // 200 cm
export const DURATION_SECONDS = 30;

export type RenderConfig = {
  width: number;
  height: number;
  fps: number; // 30 (padrão) ou 60
  /** false = desliga grão/vinheta/feixe/partículas (usado só na checagem pixel a pixel) */
  post: boolean;
};

export const DEFAULT_CONFIG: RenderConfig = {
  width: Number(process.env.REMOTION_WIDTH ?? MASTER_WIDTH),
  height: Number(process.env.REMOTION_HEIGHT ?? MASTER_HEIGHT),
  fps: Number(process.env.REMOTION_FPS ?? 30),
  post: true,
};

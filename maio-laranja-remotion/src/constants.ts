export const COLORS = {
  laranjaPrincipal: '#E85D00',
  laranjaQueimado: '#B84500',
  laranjaClaro: '#FF7A2F',
  pretoFundo: '#1A1A1A',
  pretoAbsoluto: '#111111',
  branco: '#FFFFFF',
} as const;

export const FONTS = {
  titulo: 'Anton',
  corpo: 'Nunito',
} as const;

export const FPS = 30;
export const DURACAO_TOTAL = 900; // 30s × 30fps
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const SCENES = {
  abertura: { from: 0,   durationInFrames: 90  }, // 00:00–00:03
  dado1:    { from: 90,  durationInFrames: 150 }, // 00:03–00:08
  dado2:    { from: 240, durationInFrames: 150 }, // 00:08–00:13
  dado3:    { from: 390, durationInFrames: 150 }, // 00:13–00:18
  dado4:    { from: 540, durationInFrames: 150 }, // 00:18–00:23
  cta:      { from: 690, durationInFrames: 150 }, // 00:23–00:28
  encerramento: { from: 840, durationInFrames: 60 }, // 00:28–00:30
} as const;

export const WIPE_DURATION = 18; // frames para a transição wipe

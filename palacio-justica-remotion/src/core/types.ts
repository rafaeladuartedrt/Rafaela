export type RevealType = 'up' | 'down' | 'right' | 'luma' | 'luma-up' | 'stroke-up' | 'stroke-right';
// direcao de base da revelacao (para placeholder, linha guia e som de lapis)
export const revealDir = (t: RevealType): 'up' | 'right' | 'fade' =>
  t === 'right' || t === 'stroke-right' ? 'right' : t.startsWith('luma') ? 'fade' : 'up';

export interface CropInfo {
  x: number; y: number; w: number; h: number;
  reveal?: RevealType | null;
  blocks: Record<string, { rect?: number[]; poly?: number[][] }>;
  focus: Record<string, [number, number]>;
  maps?: Record<string, string>;
  sheet?: string; // cor mediana da folha do desenho (camada de fundo separada)
}
export interface AssetInfo {
  item: number; file: string; present: boolean; estimated?: boolean;
  w: number; h: number; src?: string; crops: Record<string, CropInfo>;
}
export interface Manifest {
  assets: Record<string, AssetInfo>;
  optional: { trilha: string | null; lapis: string | null; logo: string | null; orbita: string | null };
}

export interface BlockCue { name: string; from: number; to?: number; dir?: 'up' | 'right' }
export interface Item {
  asset: string; crop: string;
  x: number; y: number; // canto superior esquerdo no quadro (unidades do quadro)
  s: number; // unidades do quadro por px nativo do recorte
  reveal?: { type: RevealType; from: number; to: number }; // quadros relativos ao plano
  blocks?: BlockCue[];
  frame?: boolean; // moldura de papel com respiro
  w?: number; h?: number; // tamanho do recorte em px nativos (preenchido pelo roteiro)
}
// Retangulo de visao (centro + tamanho em unidades do quadro); a camera o contem na tela.
export interface CamKey { f: number; cx: number; cy: number; vw: number; vh: number; r?: number }
export interface Transition { type: 'none' | 'dissolve' | 'iris'; dur: number; blur?: number }
export interface Shot {
  id: string; scene: string; start: number; end: number;
  items: Item[]; cam: CamKey[];
  inT: Transition;
  fadeOut?: number; // apenas no final (volta ao papel)
  camTime?: [number, number]; // curva de tempo compartilhada (orbita: mesma velocidade)
  parallax?: number; // camada grafica desliza mais rapido que a imagem
  video?: string; // plano de video (assets/orbita.mp4)
}
export interface TextCue { text: string; from: number; to: number; size: number; weight: number }

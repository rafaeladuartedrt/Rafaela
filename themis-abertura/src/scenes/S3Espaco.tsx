import React from 'react';
import { AbsoluteFill } from 'remotion';
import { WORDS } from '../theme';
import { bezier, lerp, seg, useT, E } from '../lib/time';
import { BandWord, LightLeak, NEUTRAL, Piece, PieceView, screenX, worldX } from '../lib/Depth';

/**
 * 0:12–0:21 Espaço 2.5D contínuo (ref. B). Depois do JUDICIÁRIO, a câmera faz um único
 * travelling lateral por uma colagem em camadas: fotos ao fundo desfocadas, manchetes
 * recortadas e fotos das matérias à frente, e as palavras na mesma dimensão, cada uma no
 * seu momento e lugar: COTIDIANO (matérias de crianças e reeducação de homens), IMAGENS
 * (as cinco fotografias do arquivo), INOVAÇÃO (matérias 6 e 7) e NOTÍCIAS (Porto Alegre pós-enchente,
 * casamento coletivo e Justiça Itinerante). O mosaico do início é só prévia; aqui entra tudo. Movimentos lentos nas imagens sensíveis.
 */
const T0 = 12.2, T1 = 21.0, L = 5200;
const travel = bezier(0.32, 0, 0.6, 1);
export const camX = (t: number) => lerp(0, L, travel(Math.min(1, Math.max(0, (t - T0) / (T1 - T0)))));

type W = Omit<Piece, 'cx'> & { tc: number; sx: number };
// tc = instante em que o elemento passa por sx (posição na tela); o mundo é derivado disso
// cada trecho é um cacho de peças de tamanhos diferentes, sobrepostas (ref. B);
// a ordem de desenho segue a profundidade z (fundo -> frente)
const ITEMS: W[] = [
  // COTIDIANO: crianças (p9) e reeducação de homens (p10); movimento lento
  { kind: 'photo', src: 'notfoto10.jpg', iw: 710, ih: 352, w: 5600, cy: 1000, z: 0.04, tc: 13.3, sx: 1750, at: 12.25, dur: 1.0, until: 14.55, blur: 11, feather: true, dim: 0.5 },
  { kind: 'headline', src: 'manchete10.png', iw: 709, ih: 200, w: 1000, cy: 470, z: 0.35, tc: 13.4, sx: 1250, at: 12.5, until: 14.6 },
  { kind: 'photo', src: 'notfoto9.jpg', iw: 645, ih: 427, w: 1250, cy: 830, z: 0.7, rot: -1.5, tc: 13.6, sx: 2150, at: 12.7, dur: 1.4, until: 14.65 },
  { kind: 'headline', src: 'manchete9.png', iw: 625, ih: 301, w: 920, cy: 1270, z: 0.88, tc: 13.8, sx: 1250, at: 13.0, until: 14.65 },
  // IMAGENS: as cinco fotografias do arquivo, uma depois da outra, tamanhos diferentes, sobrepostas
  { kind: 'photo', src: 'foto2_bw.jpg', iw: 3000, ih: 2000, w: 1250, cy: 720, z: 0.45, rot: -1.5, tc: 15.95, sx: 1250, at: 14.5, dur: 0.9, until: 16.8 },
  { kind: 'photo', src: 'foto1_bw.jpg', iw: 1478, ih: 985, w: 1000, cy: 560, z: 0.55, rot: 2, tc: 15.95, sx: 2350, at: 14.8, dur: 0.9, until: 16.85 },
  { kind: 'photo', src: 'foto4_bw.jpg', iw: 3120, ih: 2080, w: 1100, cy: 1300, z: 0.65, rot: -2, tc: 15.95, sx: 2500, at: 15.1, dur: 0.9, until: 16.9 },
  { kind: 'photo', src: 'foto5_bw.jpg', iw: 3120, ih: 2080, w: 850, cy: 1300, z: 0.75, rot: 2.5, tc: 15.95, sx: 1050, at: 15.4, dur: 0.9, until: 16.95 },
  { kind: 'photo', src: 'foto3_bw.jpg', iw: 2855, ih: 1903, w: 800, cy: 1060, z: 0.85, rot: -3, tc: 15.95, sx: 1920, at: 15.7, dur: 0.9, until: 17.0 },
  // INOVAÇÃO: matérias 6 (IA) e 7 (inovação e tecnologia)
  { kind: 'photo', src: 'notfoto7.jpg', iw: 808, ih: 535, w: 5600, cy: 1000, z: 0.04, tc: 17.6, sx: 1750, at: 16.6, dur: 1.0, until: 18.75, blur: 11, feather: true, dim: 0.5 },
  { kind: 'headline', src: 'manchete7.png', iw: 624, ih: 189, w: 1040, cy: 520, z: 0.35, tc: 17.7, sx: 1300, at: 16.7, until: 18.7 },
  { kind: 'photo', src: 'notfoto6.jpg', iw: 787, ih: 522, w: 1250, cy: 900, z: 0.7, rot: 2, tc: 17.8, sx: 2150, at: 16.9, until: 18.75 },
  { kind: 'headline', src: 'manchete6.png', iw: 787, ih: 289, w: 900, cy: 1380, z: 0.88, tc: 18.0, sx: 1350, at: 17.25, until: 18.75 },
  // NOTÍCIAS: Porto Alegre pós-enchente (p8), casamento coletivo (p11) e Justiça Itinerante (p12)
  { kind: 'headline', src: 'manchete8.png', iw: 670, ih: 281, w: 900, cy: 330, z: 0.25, tc: 19.6, sx: 2650, at: 18.7, until: 20.45, dim: 0.85 },
  { kind: 'headline', src: 'manchete11.png', iw: 726, ih: 190, w: 1000, cy: 470, z: 0.35, tc: 19.6, sx: 1000, at: 18.6, until: 20.45 },
  { kind: 'photo', src: 'notfoto11.jpg', iw: 727, ih: 364, w: 1350, cy: 820, z: 0.55, rot: 1.5, tc: 19.7, sx: 1750, at: 18.8, until: 20.45 },
  { kind: 'photo', src: 'notfoto12.jpg', iw: 472, ih: 296, w: 700, cy: 1220, z: 0.8, rot: -3, tc: 19.8, sx: 2600, at: 19.0, until: 20.45 },
  { kind: 'headline', src: 'manchete12.png', iw: 443, ih: 156, w: 600, cy: 1640, z: 0.9, tc: 20.0, sx: 2650, at: 19.2, until: 20.45 },
];
const WORDS_IN_SPACE = [
  { word: WORDS.cotidiano, z: 0.55, tc: 13.8, sx: 2450, cy: 1560, at: 13.2, until: 14.45, seed: 3 },
  { word: WORDS.imagem, z: 0.92, tc: 15.9, sx: 1150, cy: 320, at: 15.0, until: 16.7, seed: 4 },
  { word: WORDS.inovacao, z: 0.55, tc: 17.8, sx: 2600, cy: 1600, at: 17.15, until: 18.4, seed: 5 },
  { word: WORDS.noticia, z: 0.7, tc: 19.8, sx: 1050, cy: 1480, at: 19.15, until: 20.35, seed: 6 },
];

export const S3Espaco: React.FC = () => {
  const t = useT();
  if (t < T0 || t > T1 + 0.3) return null;
  const cx = camX(t);
  const bg = Math.min(seg(t, T0, T0 + 0.6, E.soft), 1 - seg(t, 20.45, 21.1, E.soft));
  type Node = { z: number; el: React.ReactNode };
  const nodes: Node[] = [];
  ITEMS.forEach((it, i) => {
    const wx = worldX(camX(it.tc), it.sx, it.z);
    nodes.push({ z: it.z, el: <PieceView key={`p${i}`} cam={NEUTRAL} p={{ ...it, cx: screenX(wx, cx, it.z) }} /> });
  });
  WORDS_IN_SPACE.forEach((w, i) => {
    const wx = worldX(camX(w.tc), w.sx, w.z);
    nodes.push({ z: w.z, el: <BandWord key={`w${i}`} word={w.word} cx={screenX(wx, cx, w.z)} cy={w.cy} z={w.z} cam={NEUTRAL} at={w.at} until={w.until} seed={w.seed} /> });
  });
  nodes.sort((a, b) => a.z - b.z);
  return (
    <AbsoluteFill>
      {/* chão do espaço: seda escurecida (a seda-tecido continua por baixo) */}
      <AbsoluteFill style={{ background: 'rgba(22,22,22,.55)', opacity: bg }} />
      {nodes.map((n) => n.el)}
      <LightLeak a={12.2} b={14.2} strength={0.1} />
      <LightLeak a={16.0} b={17.8} strength={0.12} />
    </AbsoluteFill>
  );
};

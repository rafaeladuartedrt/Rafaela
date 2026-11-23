import React from 'react';
import { AbsoluteFill } from 'remotion';
import { WORDS } from '../theme';
import { bezier, lerp, seg, useT, E } from '../lib/time';
import { BandWord, LightLeak, NEUTRAL, Piece, PieceView, screenX, worldX } from '../lib/Depth';

/**
 * 0:12–0:21 Espaço 2.5D contínuo (ref. B). Depois do JUDICIÁRIO, a câmera faz um único
 * travelling lateral por uma colagem em camadas: fotos ao fundo desfocadas, manchetes
 * recortadas e fotos das matérias à frente, e as palavras na mesma dimensão, cada uma no
 * seu momento e lugar: COTIDIANO, IMAGEM, INOVAÇÃO, NOTÍCIA.
 * Início lento (momento emocional das fotos 3 e 5), sem zoom em rostos.
 */
const T0 = 12.2, T1 = 21.0, L = 5200;
const travel = bezier(0.32, 0, 0.6, 1);
export const camX = (t: number) => lerp(0, L, travel(Math.min(1, Math.max(0, (t - T0) / (T1 - T0)))));

type W = Omit<Piece, 'cx'> & { tc: number; sx: number };
// tc = instante em que o elemento passa por sx (posição na tela); o mundo é derivado disso
const ITEMS: W[] = [
  // fundo (z baixo): fotos grandes, desfocadas e esfumadas, uma dando lugar à outra
  { kind: 'photo', src: 'foto5_bw.jpg', iw: 3120, ih: 2080, w: 5800, cy: 1000, z: 0.04, tc: 13.6, sx: 1750, at: 12.25, dur: 1.0, until: 17.2, blur: 7, feather: true, dim: 0.55 },
  { kind: 'photo', src: 'notfoto7.jpg', iw: 808, ih: 535, w: 5600, cy: 1000, z: 0.04, tc: 19.0, sx: 1750, at: 16.6, dur: 1.2, until: 20.5, blur: 11, feather: true, dim: 0.5 },
  // camada média e frente
  { kind: 'headline', src: 'manchete7.png', iw: 624, ih: 189, w: 1080, cy: 430, z: 0.35, tc: 17.7, sx: 1150, at: 16.9, until: 20.4 },
  { kind: 'photo', src: 'foto3_bw.jpg', iw: 2855, ih: 1903, w: 1700, cy: 900, z: 0.72, rot: -1.5, tc: 14.0, sx: 2250, at: 12.55, dur: 1.5, until: 16.6 },
  { kind: 'photo', src: 'notfoto6.jpg', iw: 787, ih: 522, w: 1050, cy: 860, z: 0.7, rot: 2, tc: 18.4, sx: 2450, at: 17.3, until: 20.45 },
  { kind: 'headline', src: 'manchete6.png', iw: 787, ih: 289, w: 980, cy: 1560, z: 0.9, tc: 19.3, sx: 950, at: 18.0, until: 20.45 },
];
const WORDS_IN_SPACE = [
  { word: WORDS.cotidiano, z: 0.55, tc: 14.1, sx: 860, cy: 1500, at: 13.4, until: 14.75, seed: 3 },
  { word: WORDS.imagem, z: 0.9, tc: 15.7, sx: 2550, cy: 1520, at: 15.0, until: 16.3, seed: 4 },
  { word: WORDS.inovacao, z: 0.55, tc: 17.9, sx: 1250, cy: 1060, at: 17.2, until: 18.6, seed: 5 },
  { word: WORDS.noticia, z: 0.6, tc: 19.6, sx: 2400, cy: 1560, at: 18.8, until: 20.35, seed: 6 },
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

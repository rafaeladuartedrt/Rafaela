import React from 'react';
import {BG, FG, stroke, SW} from './lib';

// ---------- SETA DO CURSOR (personagem condutor) ----------
// Sempre em forma de seta. Expressividade apenas por posição, rotação, squash and stretch.
const S = 1.35;
export const ARROW_D = `M0 0 L0 ${76 * S} L${19 * S} ${58 * S} L${31 * S} ${87 * S} L${45 * S} ${81 * S} L${33 * S} ${53 * S} L${57 * S} ${53 * S} Z`;
export const ARROW_PIVOT: [number, number] = [25 * S, 45 * S];

export const Arrow: React.FC<{x: number; y: number; rot: number; sx: number; sy: number}> = ({x, y, rot, sx, sy}) => (
  <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-ARROW_PIVOT[0]} ${-ARROW_PIVOT[1]})`}>
    <path d={ARROW_D} fill={BG} {...stroke(SW)} />
  </g>
);

// ---------- MÃO CARTOON ----------
// Coordenadas locais: centro do punho em (0,0), dedos para cima (-y).
// Mão direita com a palma voltada para quem assiste: mindinho à esquerda, indicador e polegar à direita.
export type Pose = 'L' | 'point' | 'open';

const cap = (x: number, y1: number, y2: number, w = 40) => (
  <rect x={x - w / 2} y={y1} width={w} height={y2 - y1} rx={w / 2} fill={BG} {...stroke(SW)} />
);

export const Hand: React.FC<{pose: Pose; transform?: string; sleeve?: number}> = ({pose, transform, sleeve = 700}) => {
  const fingersX = [-48, -16, 16, 48]; // mindinho, anelar, médio, indicador
  const extTop = {open: [-262, -300, -312, -298], L: [0, 0, 0, -312], point: [0, 0, 0, -312]}[pose];
  const behind: React.ReactNode[] = [];
  const front: React.ReactNode[] = [];
  fingersX.forEach((x, i) => {
    const top = extTop[i];
    if (top !== 0) behind.push(<React.Fragment key={`f${i}`}>{cap(x, top, -130, i === 0 ? 36 : 40)}</React.Fragment>);
    else front.push(<React.Fragment key={`k${i}`}>{cap(x, -212, -142, 38)}</React.Fragment>);
  });
  // polegar estendido: quase horizontal no L (forma o ângulo reto com o indicador)
  const thumbRot = pose === 'L' ? -8 : -32;
  const thumbExt = (
    <g key="t" transform={`translate(58 -92) rotate(${thumbRot})`}>
      <rect x={-20} y={-20} width={128} height={40} rx={20} fill={BG} {...stroke(SW)} />
    </g>
  );
  const thumbTuck = <rect key="tt" x={-44} y={-168} width={96} height={38} rx={19} fill={BG} {...stroke(SW)} />;
  return (
    <g transform={transform}>
      <rect x={-54} y={20} width={108} height={sleeve} fill={BG} />
      <path d={`M-54 20 L-54 ${sleeve} M54 20 L54 ${sleeve}`} fill="none" {...stroke(SW)} />
      {pose !== 'point' ? thumbExt : null}
      {behind}
      <rect x={-72} y={-186} width={144} height={196} rx={58} fill={BG} {...stroke(SW)} />
      {front}
      {pose === 'point' ? thumbTuck : null}
      <rect x={-64} y={-10} width={128} height={44} rx={14} fill={FG} {...stroke(SW)} />
    </g>
  );
};

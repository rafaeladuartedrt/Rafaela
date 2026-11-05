// Converte todas as frases do vídeo em paths SVG (letra a letra) com Atkinson Hyperlegible.
// Saída: src/textData.json. Valida a zona segura do Reels (y 250..1500, x <= 940).
import opentype from 'opentype.js';
import fs from 'fs';
import {svgPathProperties} from 'svg-path-properties';

const dir = new URL('../node_modules/@fontsource/atkinson-hyperlegible/files/', import.meta.url);
const load = (f) => {
  const b = fs.readFileSync(new URL(f, dir));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const FONTS = {B: load('atkinson-hyperlegible-latin-700-normal.woff'), R: load('atkinson-hyperlegible-latin-400-normal.woff')};

// Cada linha: segmentos [texto, peso, tamanho]; baseline y; alinhamento (center ou x à esquerda)
const P = {
  s1a: [{y: 360, seg: [['Esse vídeo vai mudar.', 'B', 76]]}],
  s1b: [{y: 455, seg: [['Repara no que você sente.', 'R', 66]]}],
  s2a: [{y: 410, seg: [['Achou o caminho?', 'B', 88]]}],
  s2b: [
    {y: 360, seg: [['Com audiodescrição,', 'B', 80]]},
    {y: 458, seg: [['todo mundo vê.', 'B', 80]]},
  ],
  s3a: [{y: 420, seg: [['Ficou de fora?', 'B', 100]]}],
  s3b: [
    {y: 340, seg: [['Com legenda', 'B', 80]]},
    {y: 432, seg: [['e Libras,', 'B', 80]]},
    {y: 524, seg: [['a mensagem chega.', 'B', 80]]},
  ],
  s4a: [
    {y: 320, x: 130, seg: [['E se', 'B', 72]]},
    {y: 402, x: 250, seg: [['o caminho', 'B', 72]]},
    {y: 484, x: 450, seg: [['tivesse', 'B', 72]]},
    {y: 566, x: 600, seg: [['degraus?', 'B', 72]]},
  ],
  s4b: [
    {y: 370, seg: [['Com rampa,', 'B', 76]]},
    {y: 465, seg: [['o caminho é de todos.', 'B', 76]]},
  ],
  s5a: [
    {y: 340, seg: [['Sentiu desconforto?', 'B', 80]]},
    {y: 452, seg: [['A dificuldade estava', 'R', 72]]},
    {y: 566, seg: [['na ', 'R', 72], ['barreira.', 'B', 96]]},
  ],
  s5b: [
    {y: 470, seg: [['Acessibilidade', 'B', 110]]},
    {y: 600, seg: [['é direito.', 'B', 110]]},
  ],
  // Botão (texto centrado em 0,0 e posicionado no componente)
  btnA: [{y: 0, x0: 0, seg: [['Seguir', 'B', 64]]}],
  btnB: [{y: 0, x0: 0, seg: [['Seguindo', 'B', 64]]}],
  ad: [{y: 0, x0: 0, seg: [['AD', 'B', 130]]}],
  // Legendas da narração (versão com legenda queimada)
  n1: [{y: 1440, seg: [['Fica até o fim.', 'R', 64]]}],
  n2: [
    {y: 1372, seg: [['Sem descrição,', 'R', 64]]},
    {y: 1452, seg: [['a imagem some.', 'R', 64]]},
  ],
  n3: [
    {y: 1372, seg: [['Acessibilidade é direito.', 'R', 64]]},
    {y: 1452, seg: [['E começa nos detalhes.', 'R', 64]]},
  ],
};

const r = (n) => Math.round(n * 100) / 100;
const out = {};
const problems = [];
for (const [id, lines] of Object.entries(P)) {
  const L = [];
  let wordIdx = 0;
  for (const line of lines) {
    // largura total
    let width = 0;
    for (const [t, w, s] of line.seg) width += FONTS[w].getAdvanceWidth(t, s, {kerning: true});
    let x = line.x0 !== undefined ? -width / 2 : line.x !== undefined ? line.x : 540 - width / 2;
    const letters = [];
    let prevSpace = true;
    for (const [t, w, s] of line.seg) {
      const font = FONTS[w];
      const glyphs = font.stringToGlyphs(t);
      const chars = [...t];
      const scale = s / font.unitsPerEm;
      glyphs.forEach((g, i) => {
        const ch = chars[i];
        if (ch === ' ') { prevSpace = true; } else { if (prevSpace) wordIdx++; prevSpace = false; }
        const adv = g.advanceWidth * scale;
        if (ch !== ' ') {
          const path = g.getPath(x, line.y, s);
          const d = path.toPathData(2);
          const bb = path.getBoundingBox();
          let len = 0;
          try { len = new svgPathProperties(d).getTotalLength(); } catch (e) { len = 400; }
          letters.push({ch, d, x: r(x), w: r(adv), y: line.y, size: s, weight: w, len: Math.round(len), word: wordIdx - 1,
            bb: [r(bb.x1), r(bb.y1), r(bb.x2), r(bb.y2)]});
        }
        let kern = 0;
        if (i < glyphs.length - 1) kern = font.getKerningValue(g, glyphs[i + 1]) * scale;
        x += adv + kern;
      });
    }
    const bb = letters.reduce((a, l) => [Math.min(a[0], l.bb[0]), Math.min(a[1], l.bb[1]), Math.max(a[2], l.bb[2]), Math.max(a[3], l.bb[3])], [1e9, 1e9, -1e9, -1e9]);
    L.push({y: line.y, letters, bb, text: line.seg.map((s) => s[0]).join('')});
    if (line.x0 === undefined) {
      if (bb[1] < 250 || bb[3] > 1500) problems.push(`${id}: fora da faixa vertical segura ${bb}`);
      if (bb[0] < 60 || bb[2] > 940) problems.push(`${id}: fora da faixa horizontal segura ${bb}`);
    }
  }
  out[id] = {lines: L, words: wordIdx};
}
fs.writeFileSync(new URL('../src/textData.json', import.meta.url), JSON.stringify(out));
for (const [id, v] of Object.entries(out)) console.log(id.padEnd(5), v.lines.map((l) => `[${l.bb.map(Math.round).join(',')}]`).join(' '));
if (problems.length) { console.error('ZONA SEGURA:', problems); process.exit(1); } else console.log('Zona segura OK');

// Gera as malhas da Themis (final + estudos) a partir de um campo de distância (SDF)
// e poligoniza com "surface nets". Saída: assets/themis_<nome>.bin + .json
// Unidades em metros. Eixo local: x lateral, y para cima, z para fora da parede.
// Medidas tiradas da foto frontal (foto_07) com 105 px = 1 m (altura total 9 m).
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('assets');
fs.mkdirSync(OUT, { recursive: true });

// ---------- utilitários vetoriais ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
function smin(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return mix(b, a, h) - k * h * (1 - h); }
function smax(a, b, k) { return -smin(-a, -b, k); }
function capsule(px, py, pz, a, b, r) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.hypot(dx, dy, dz) - r;
}
// cone arredondado (raio varia de r1 em a até r2 em b)
function roundCone(px, py, pz, a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const h = clamp((pax * bax + pay * bay + paz * baz) / l2, 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.hypot(dx, dy, dz) - mix(r1, r2, h);
}
function ellipsoid(px, py, pz, c, r) {
  const x = (px - c[0]) / r[0], y = (py - c[1]) / r[1], z = (pz - c[2]) / r[2];
  const k0 = Math.hypot(x, y, z);
  const k1 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  return k1 < 1e-9 ? -Math.min(...r) : k0 * (k0 - 1) / k1;
}
function roundBox(px, py, pz, half, r) {
  const qx = Math.abs(px) - half[0] + r, qy = Math.abs(py) - half[1] + r, qz = Math.abs(pz) - half[2] + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
function rotX(y, z, a) { const c = Math.cos(a), s = Math.sin(a); return [c * y - s * z, s * y + c * z]; }
function rotZ(x, y, a) { const c = Math.cos(a), s = Math.sin(a); return [c * x - s * y, s * x + c * y]; }

// ---------- parâmetros comuns (compartilhados com src/themis.js) ----------
export const Z0 = 0.62;     // eixo do corpo afastado da parede
export const TILT = 0.035;  // leve inclinação para fora no topo
const zc = (y) => Z0 + TILT * y;

// ---------- SDF parametrizado ----------
// P: { helmet, blind, pose ('final'|'classic'|'chest'), robeHem, headPitch, hood, bulk }
function makeSDF(P) {
  const pitch = P.headPitch;           // cabeça olhando para cima (rad)
  const headC = [0, 7.95, 0];
  return function sdf(px, py, pzw) {
    // desfaz a inclinação: coordenadas "eretas"
    const pz = pzw - TILT * py;
    const Z = Z0;
    let d = 1e9;

    // ---- cabeça (frame local da cabeça) ----
    {
      const HS = 1.2;
      const hx = (px - headC[0]) / HS;
      let [hy, hz] = rotX((py - headC[1]) / HS, (pz - (Z + 0.12)) / HS, pitch);
      // crânio
      let h = ellipsoid(hx, hy, hz, [0, 0, 0], [0.34, 0.43, 0.39]);
      // mandíbula/queixo
      h = smin(h, ellipsoid(hx, hy, hz, [0, -0.26, 0.12], [0.24, 0.2, 0.25]), 0.12);
      // nariz
      h = smin(h, capsule(hx, hy, hz, [0, 0.02, 0.36], [0, -0.12, 0.43], 0.045), 0.05);
      // lábios
      h = smin(h, ellipsoid(hx, hy, hz, [0, -0.22, 0.35], [0.1, 0.035, 0.05]), 0.02);
      h = smin(h, ellipsoid(hx, hy, hz, [0, -0.28, 0.33], [0.085, 0.03, 0.045]), 0.02);
      // arcada e órbitas
      h = smin(h, ellipsoid(hx, hy, hz, [0, 0.1, 0.3], [0.27, 0.07, 0.1]), 0.06);
      h = smax(h, -ellipsoid(hx, hy, hz, [-0.12, 0.03, 0.4], [0.07, 0.035, 0.04]), 0.03);
      h = smax(h, -ellipsoid(hx, hy, hz, [0.12, 0.03, 0.4], [0.07, 0.035, 0.04]), 0.03);
      // pálpebras (olhar sereno, semicerrado)
      h = smin(h, ellipsoid(hx, hy, hz, [-0.12, 0.04, 0.35], [0.06, 0.03, 0.04]), 0.02);
      h = smin(h, ellipsoid(hx, hy, hz, [0.12, 0.04, 0.35], [0.06, 0.03, 0.04]), 0.02);
      // orelhas discretas
      h = smin(h, ellipsoid(Math.abs(hx), hy, hz, [0.33, -0.02, -0.02], [0.05, 0.11, 0.07]), 0.04);
      d = h * HS;

      if (P.helmet > 0) {
        // touca-elmo lisa: cobre crânio e nuca como capuz, ponta projetada à frente sobre a testa
        let cap = ellipsoid(hx, hy, hz, [0, 0.1, -0.06], [0.42, 0.48, 0.48]);
        // capuz desce atrás até a nuca
        cap = smin(cap, ellipsoid(hx, hy, hz, [0, -0.25, -0.22], [0.4, 0.42, 0.3]), 0.12);
        // borda: da testa (alta) descendo para trás das orelhas
        cap = smax(cap, -(hy + 0.12 - 0.62 * hz), 0.03);
        // casca fina (o rosto fica livre por baixo)
        // ponta frontal: cunha que avança sobre a testa
        const peak = roundCone(hx, hy, hz, [0, 0.28, 0.12], [0, 0.17, 0.56], 0.13, 0.015);
        cap = smin(cap, smax(peak, -(hy + 0.06 - 0.62 * hz) * 0.0 - 1.0 + 1.0 + Math.abs(hx) * 0.0, 0.0), 0.12);
        // aresta suave no topo
        cap = smin(cap, ellipsoid(hx, hy, hz, [0, 0.4, 0.0], [0.05, 0.16, 0.42]), 0.14);
        d = Math.min(d, (cap * P.helmet + h * (1 - P.helmet)) * HS);
      }
      if (P.blind > 0) {
        // venda sobre os olhos
        const band = smax(Math.abs(ellipsoid(hx, hy, hz, [0, 0.03, 0.02], [0.37, 0.45, 0.42])) - 0.025, Math.abs(hy - 0.04) - 0.07, 0.02);
        d = smin(d, band * HS, 0.02);
      }
      if (P.hood > 0) {
        const hood = ellipsoid(hx, hy, hz, [0, 0.08, -0.12], [0.5, 0.58, 0.55]);
        d = smin(d, smax(hood, hz - 0.28, 0.05) * HS, 0.08);
      }
      if (P.bun > 0) {
        d = smin(d, ellipsoid(hx, hy, hz, [0, 0.0, -0.4], [0.3, 0.32, 0.18]) * HS, 0.12);
        d = smin(d, roundCone(px, py, pz, [0, 7.5, Z - 0.3], [0, 6.0, Z - 0.35], 0.35, 0.28), 0.15);
      }
    }

    // ---- pescoço e tronco ----
    const b = P.bulk;
    d = smin(d, capsule(px, py, pz, [0, 7.05, Z], [0, 7.75, Z + 0.1], 0.2), 0.12);
    let t = ellipsoid(px, py, pz, [0, 6.45, Z], [0.72 * b, 0.95, 0.48]);
    t = smin(t, ellipsoid(px, py, pz, [0, 5.35, Z], [0.62 * b, 0.9, 0.44]), 0.3);
    t = smin(t, ellipsoid(px, py, pz, [0, 4.3, Z], [0.7 * b, 0.95, 0.47]), 0.3);
    t = smin(t, ellipsoid(px, py, pz, [-0.78 * b, 6.92, Z - 0.05], [0.36, 0.22, 0.31]), 0.32);
    t = smin(t, ellipsoid(px, py, pz, [0.78 * b, 6.92, Z - 0.05], [0.36, 0.22, 0.31]), 0.32);
    // gola/decote em V
    t = smax(t, -ellipsoid(px, py, pz, [0, 7.2, Z + 0.55], [0.22, 0.35, 0.12]), 0.05);
    // dobras horizontais curvas do ventre
    const belly = clamp(1 - Math.abs(py - 4.95) / 0.75, 0, 1);
    t += 0.028 * belly * Math.sin((py - 0.18 * px * px) * 10.5);
    // pregas verticais suaves no peito
    t += 0.012 * Math.sin(px * 9.0) * clamp((py - 5.6) * 2, 0, 1);
    d = smin(d, t, 0.15);

    // ---- túnica / saia com fenda (perna direita aparece a partir do joelho) ----
    {
      const yy = clamp((4.6 - py) / 3.2, 0, 1);
      const hw = mix(0.82, 0.74, yy) * b, hd = mix(0.52, 0.46, yy);
      const cx = mix(0, 0.16, yy);
      // saia como tubo de seção elíptica que se afina pouco até a barra
      const ex = (px - cx) / hw, ez = (pz - (Z - 0.02)) / hd;
      let s = (Math.hypot(ex, ez) - 1) * Math.min(hw, hd);
      s = smax(s, py - 5.2, 0.3);
      s = smax(s, 0.6 - py, 0.1);
      s = smin(s, ellipsoid(px, py, pz, [cx, 4.4, Z], [hw * 1.0, 0.9, hd * 1.02]), 0.25);
      const ang = Math.atan2(px - cx, pz - Z);
      s += 0.05 * Math.sin(ang * 7 + py * 0.7) * (0.3 + yy) + 0.02 * Math.sin(ang * 15 - py * 1.4) * yy;
      // grandes dobras curvas (como na peça real): cristas em crescente
      const cr = Math.sin(py * 1.9 + 1.4 * Math.sin(px * 2.2 + 0.6) + 0.3 * px);
      s -= 0.055 * Math.pow(Math.max(cr, 0), 6) * clamp((4.8 - py) * 1.5, 0, 1);
      // barra: alta do lado da perna que avança, baixa do outro lado
      const hem = P.robeHem + (P.pose === 'final' ? mix(2.05, 0, clamp((px + 0.05) / 0.35, 0, 1)) : 0);
      s = smax(s, hem - py, 0.12);
      d = smin(d, s, 0.2);
    }

    // ---- braços, mangas largas, mãos ----
    if (P.pose === 'final') {
      // braço direito (lado esquerdo da imagem) segura o livro junto ao peito
      const sR = [-0.85 * b, 6.85, Z], eR = [-1.05 * b, 5.65, Z + 0.28], hR = [-0.6, 6.4, Z + 0.95];
      // braço esquerdo cruza para a empunhadura da espada
      const sL = [0.85 * b, 6.85, Z], eL = [1.05 * b, 5.6, Z + 0.28], hL = [0.12, 6.2, Z + 0.98];
      d = arm(d, px, py, pz, sR, eR, hR, -1);
      d = arm(d, px, py, pz, sL, eL, hL, 1);
      // livro das leis (sem inscrição)
      {
        let [bx, by] = rotZ(px + 0.36, py - 6.85, 0.3);
        let [by2, bz] = rotX(by, pz - (Z + 1.0), -0.3);
        const book = roundBox(bx, by2, bz, [0.36, 0.55, 0.12], 0.03);
        d = Math.min(d, book);
      }
      d = fist(d, px, py, pz, hR, -1, 'book');
      d = fist(d, px, py, pz, hL, 1, 'grip');
    } else if (P.pose === 'classic') {
      // braço erguido com a balança (lado esquerdo da imagem), outro baixo com a espada
      const sR = [-1.0 * b, 6.9, Z], eR = [-1.35, 6.0, Z + 0.35], hR = [-1.15, 6.75, Z + 0.7];
      const sL = [1.0 * b, 6.9, Z], eL = [1.15, 5.6, Z + 0.1], hL = [0.95, 4.6, Z + 0.35];
      d = arm(d, px, py, pz, sR, eR, hR, -1, 0.6);
      d = arm(d, px, py, pz, sL, eL, hL, 1, 0.6);
      d = fist(d, px, py, pz, hR, -1, 'grip');
      d = fist(d, px, py, pz, hL, 1, 'grip');
    } else { // 'chest': balança segura à frente do peito
      const sR = [-1.0 * b, 6.9, Z], eR = [-1.05, 5.75, Z + 0.25], hR = [-0.2, 6.1, Z + 0.8];
      const sL = [1.0 * b, 6.9, Z], eL = [1.05, 5.75, Z + 0.25], hL = [0.25, 6.0, Z + 0.8];
      d = arm(d, px, py, pz, sR, eR, hR, -1, 0.8);
      d = arm(d, px, py, pz, sL, eL, hL, 1, 0.8);
      d = fist(d, px, py, pz, hR, -1, 'grip');
      d = fist(d, px, py, pz, hL, 1, 'grip');
    }

    // ---- pernas e pés descalços ----
    if (P.pose === 'final') {
      // perna que avança (exposta do joelho para baixo)
      d = smin(d, roundCone(px, py, pz, [-0.3, 4.3, Z + 0.1], [-0.22, 3.7, Z + 0.36], 0.34, 0.26), 0.1);
      // panturrilha
      d = smin(d, roundCone(px, py, pz, [-0.22, 3.7, Z + 0.36], [-0.24, 2.6, Z + 0.26], 0.3, 0.3), 0.14);
      d = smin(d, roundCone(px, py, pz, [-0.24, 2.6, Z + 0.26], [-0.27, 1.15, Z + 0.3], 0.3, 0.17), 0.14);
      d = foot(d, px, py, pz, [-0.27, 1.1, Z + 0.3], [-0.28, 0.5, Z + 0.78], 1.3);
      // perna de trás, pé pendente na ponta
      d = smin(d, roundCone(px, py, pz, [0.22, 2.2, Z - 0.02], [0.23, 1.35, Z + 0.0], 0.25, 0.17), 0.12);
      d = foot(d, px, py, pz, [0.23, 1.33, Z + 0.0], [0.25, 0.05, Z + 0.16], 1.2);
    } else {
      // estudos clássicos: pés quase cobertos pela túnica longa
      d = foot(d, px, py, pz, [-0.3, 0.75, Z + 0.1], [-0.33, 0.3, Z + 0.55], 0.9);
      d = foot(d, px, py, pz, [0.3, 0.75, Z + 0.1], [0.36, 0.3, Z + 0.5], 0.9);
    }

    // ---- costas planas presas à parede (alto relevo) ----
    d = smax(d, 0.06 - pzw, 0.04);
    return d;
  };
}

function arm(d, px, py, pz, s, e, h, side, sleeveLen = 1) {
  d = smin(d, roundCone(px, py, pz, s, e, 0.22, 0.18), 0.12);
  d = smin(d, roundCone(px, py, pz, e, h, 0.17, 0.13), 0.1);
  // manga larga pendente: painel de tecido do ombro até abaixo do cotovelo, boca aberta embaixo
  const top = s[1] - 0.05, bot = e[1] - 1.2 * sleeveLen;
  const cx = e[0] + side * 0.14, cz = e[2] - 0.08;
  const yy = clamp((top - py) / (top - bot), 0, 1);
  const hw = mix(0.2, 0.27, yy), hd = mix(0.3, 0.4, yy);
  const qx = px - cx, qy = py - (top + bot) / 2, qz = pz - cz;
  let sl = roundBox(qx, qy, qz, [hw, (top - bot) / 2, hd], 0.16);
  // barra inclinada: mais baixa por fora
  const inner = clamp((hw - side * qx) / (2 * hw), 0, 1);
  sl = smax(sl, bot + 0.35 * inner - py, 0.06);
  // pregas verticais
  sl += 0.022 * Math.sin(qx * 20 + qz * 6 + py * 0.4) * (0.3 + yy) + 0.012 * Math.sin(qz * 24 - py);
  // boca da manga
  sl = smax(sl, -roundBox(qx, py - (bot + 0.1 + 0.35 * inner), qz, [hw - 0.07, 0.3, hd - 0.07], 0.05), 0.03);
  // punho do antebraço saindo da manga
  sl = smin(sl, roundCone(px, py, pz, e, [mix(e[0], h[0], 0.55), mix(e[1], h[1], 0.55), mix(e[2], h[2], 0.55)], 0.27, 0.22), 0.1);
  return smin(d, sl, 0.1);
}

function fist(d, px, py, pz, h, side, kind) {
  const S = 1.75;
  // palma e dorso
  let f = ellipsoid(px, py, pz, [h[0] - side * 0.03 * S, h[1], h[2] - 0.02 * S], [0.13 * S, 0.17 * S, 0.12 * S]);
  // quatro dedos dobrados em volta do cabo, cada um com duas falanges
  for (let i = 0; i < 4; i++) {
    const yy = h[1] + (0.105 - i * 0.07) * S;
    const r = (0.042 - i * 0.003) * S;
    const k0 = [h[0] - side * 0.1 * S, yy, h[2] + 0.04 * S], k1 = [h[0] + side * 0.02 * S, yy - 0.005, h[2] + 0.15 * S], k2 = [h[0] + side * 0.1 * S, yy - 0.01, h[2] + 0.08 * S];
    f = smin(f, capsule(px, py, pz, k0, k1, r), 0.018 * S);
    f = smin(f, capsule(px, py, pz, k1, k2, r * 0.92), 0.012 * S);
  }
  // polegar por cima
  f = smin(f, capsule(px, py, pz, [h[0] + side * 0.06 * S, h[1] + 0.1 * S, h[2] + 0.02 * S], [h[0] + side * 0.01 * S, h[1] + 0.25 * S, h[2] + 0.1 * S], 0.048 * S), 0.03 * S);
  return smin(d, f, 0.06);
}

function foot(d, px, py, pz, ankle, toes, s) {
  let f = roundCone(px, py, pz, ankle, toes, 0.14 * s, 0.11 * s);
  // calcanhar
  f = smin(f, ellipsoid(px, py, pz, [ankle[0], ankle[1] - 0.05, ankle[2] - 0.08], [0.11 * s, 0.12 * s, 0.1 * s]), 0.06);
  // dedos
  const dx = toes[0] - ankle[0], dy = toes[1] - ankle[1], dz = toes[2] - ankle[2];
  const L = Math.hypot(dx, dy, dz);
  const ux = dx / L, uy = dy / L, uz = dz / L;
  for (let i = 0; i < 5; i++) {
    const off = (i - 1.6) * 0.055 * s;
    const r = (i === 0 ? 0.045 : 0.034 - i * 0.003) * s;
    const c = [toes[0] + off + ux * 0.07, toes[1] + uy * 0.07 - Math.abs(i - 1) * 0.012, toes[2] + uz * 0.07];
    f = smin(f, capsule(px, py, pz, [c[0] - ux * 0.06, c[1] - uy * 0.06, c[2] - uz * 0.06], c, r), 0.025);
  }
  return smin(d, f, 0.08);
}

// ---------- surface nets ----------
function polygonize(sdf, bmin, bmax, h) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1;
  const ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1;
  const nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
  const F = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    F[id(i, j, k)] = sdf(bmin[0] + i * h, bmin[1] + j * h, bmin[2] + k * h);
  const V = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [], idx = [];
  const corners = [[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  const edges = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0; const v = [];
    for (let c = 0; c < 8; c++) { const [a, b2, e] = corners[c]; const f = F[id(i + a, j + b2, k + e)]; v.push(f); if (f < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b2] of edges) {
      if ((v[a] < 0) === (v[b2] < 0)) continue;
      const t = v[a] / (v[a] - v[b2]);
      const ca = corners[a], cb = corners[b2];
      sx += ca[0] + (cb[0] - ca[0]) * t; sy += ca[1] + (cb[1] - ca[1]) * t; sz += ca[2] + (cb[2] - ca[2]) * t; n++;
    }
    let x = bmin[0] + (i + sx / n) * h, y = bmin[1] + (j + sy / n) * h, z = bmin[2] + (k + sz / n) * h;
    // projeta na superfície (2 passos de Newton)
    for (let it = 0; it < 2; it++) {
      const e = h * 0.25, f0 = sdf(x, y, z);
      const gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
      const ax = gx / (2 * e), ay = gy / (2 * e), az = gz / (2 * e);
      const g2 = ax * ax + ay * ay + az * az || 1;
      const s = clamp(f0 / g2, -h, h);
      x -= ax * s; y -= ay * s; z -= az * s;
    }
    V[id(i, j, k)] = pos.length / 3; pos.push(x, y, z);
  }
  // quads para cada aresta da grade que cruza a superfície
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const f0 = F[id(i, j, k)];
    const tri = (a, b2, c, d2, flip) => {
      if (a < 0 || b2 < 0 || c < 0 || d2 < 0) return;
      if (!flip) idx.push(a, c, b2, a, d2, c); else idx.push(a, b2, c, a, c, d2);
    };
    // aresta x
    const fx = F[id(i + 1, j, k)];
    if ((f0 < 0) !== (fx < 0)) tri(V[id(i, j - 1, k - 1)], V[id(i, j, k - 1)], V[id(i, j, k)], V[id(i, j - 1, k)], f0 < 0);
    const fy = F[id(i, j + 1, k)];
    if ((f0 < 0) !== (fy < 0)) tri(V[id(i - 1, j, k - 1)], V[id(i - 1, j, k)], V[id(i, j, k)], V[id(i, j, k - 1)], f0 < 0);
    const fz = F[id(i, j, k + 1)];
    if ((f0 < 0) !== (fz < 0)) tri(V[id(i - 1, j - 1, k)], V[id(i, j - 1, k)], V[id(i, j, k)], V[id(i - 1, j, k)], f0 < 0);
  }
  // normais pelo gradiente do SDF
  const nor = new Float32Array(pos.length);
  const e = h * 0.5;
  for (let q = 0; q < pos.length; q += 3) {
    const x = pos[q], y = pos[q + 1], z = pos[q + 2];
    let gx = sdf(x + e, y, z) - sdf(x - e, y, z), gy = sdf(x, y + e, z) - sdf(x, y - e, z), gz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1; nor[q] = gx / l; nor[q + 1] = gy / l; nor[q + 2] = gz / l;
  }
  // oclusão ambiente amostrada no próprio SDF (escurece reentrâncias para a pátina)
  const ao = new Float32Array(pos.length / 3);
  for (let q = 0, v = 0; q < pos.length; q += 3, v++) {
    let occ = 0, wsum = 0;
    for (let s = 1; s <= 5; s++) {
      const dd = 0.07 * s;
      const f = sdf(pos[q] + nor[q] * dd, pos[q + 1] + nor[q + 1] * dd, pos[q + 2] + nor[q + 2] * dd);
      occ += (dd - Math.min(f, dd)) / dd * (1 / s); wsum += 1 / s;
    }
    ao[v] = clamp(1 - 1.6 * occ / wsum, 0, 1);
  }
  return { pos: new Float32Array(pos), nor, ao, idx: new Uint32Array(idx) };
}

function save(name, mesh) {
  const { pos, nor, ao, idx } = mesh;
  const buf = Buffer.concat([Buffer.from(pos.buffer), Buffer.from(nor.buffer), Buffer.from(ao.buffer), Buffer.from(idx.buffer)]);
  fs.writeFileSync(path.join(OUT, `themis_${name}.bin`), buf);
  fs.writeFileSync(path.join(OUT, `themis_${name}.json`), JSON.stringify({ vertices: pos.length / 3, indices: idx.length }));
  console.log(name, 'verts', pos.length / 3, 'tris', idx.length / 3);
}

const variants = {
  final:   { helmet: 1, blind: 0, hood: 0, bun: 0, pose: 'final',   robeHem: 1.55, headPitch: 0.62, bulk: 1.0, h: 0.028 },
  study0:  { helmet: 0, blind: 1, hood: 0, bun: 1, pose: 'classic', robeHem: 0.55, headPitch: 0.05,  bulk: 0.95, h: 0.05 },
  study1:  { helmet: 0, blind: 0, hood: 1, bun: 0, pose: 'chest',   robeHem: 0.45, headPitch: 0.35,  bulk: 1.12, h: 0.05 },
  study2:  { helmet: 0, blind: 1, hood: 0, bun: 0, pose: 'chest',   robeHem: 0.8,  headPitch: 0.15,  bulk: 1.0, h: 0.05 },
  study3:  { helmet: 0.0, blind: 1, hood: 0, bun: 0, pose: 'final', robeHem: 1.4,  headPitch: -0.2, bulk: 1.0, h: 0.05 },
};

const only = process.argv[2];
for (const [name, P] of Object.entries(variants)) {
  if (only && only !== name) continue;
  const t0 = Date.now();
  const sdf = makeSDF(P);
  const mesh = polygonize(sdf, [-2.0, -0.1, 0.0], [2.0, 9.25, 2.6], P.h);
  save(name, mesh);
  console.log('  ', ((Date.now() - t0) / 1000).toFixed(1), 's');
}

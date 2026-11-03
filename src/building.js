// Palácio da Justiça: modelo procedural (proporções dos cortes LICVRGO, conferidas nas fotos).
// Eixos: x = eixo longo (x+ = fachada sul, com a Themis), z = profundidade (z+ = leste, z- = oeste com brises).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, paperMat } from './materials.js';
import { InkLines, boxEdges, ring, polyline, orderBy, orderSeq, rng, hullMaterial } from './lines.js';

export const B = {
  L: 54, D: 22, yB: 8, yT: 34, fh: 4.3, frame: 1.2,
  loggia: [25.2, 30.4], roof: [30.4, 34],
  ground: (x) => -0.055 * x,
};

const R = rng(1952);
function box(x0, y0, z0, x1, y1, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function meshOf(geoms, m) {
  const g = Array.isArray(geoms) ? mergeGeometries(geoms.map((q) => (q.index ? q.toNonIndexed() : q))) : geoms;
  const me = new THREE.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; return me;
}
// juntas de granito numa face plana retangular (u ao longo de eixo1, v vertical)
// fiadas como na fachada real: alta, estreita, alta, alta (m); juntas verticais desencontradas
export const ROWS = [1.4, 0.45, 1.3, 1.3];
const ROWP = ROWS.reduce((a, b) => a + b, 0);
function rowsIn(v0, v1) {
  const out = [];
  let k = Math.floor(v0 / ROWP) * 4, y = Math.floor(v0 / ROWP) * ROWP;
  while (y < v1) { const h = ROWS[((k % 4) + 4) % 4]; out.push([y, y + h, k]); y += h; k++; }
  return out;
}
function graniteJoints(plane, c, u0, u1, v0, v1, w = 0.7) {
  const segs = [];
  const P = (u, v) => plane === 'x' ? [c, v, u] : [u, v, c];
  for (const [ya, yb, k] of rowsIn(v0, v1)) {
    if (ya > v0 + 0.05 && ya < v1 - 0.05) segs.push({ a: P(u0, ya), b: P(u1, ya), w });
    const va = Math.max(ya, v0), vb = Math.min(yb, v1); if (vb - va < 0.05) continue;
    const cw = (((k % 4) + 4) % 4) === 1 ? 2.1 : 1.2;
    const off = ((k * 0.618034) % 1 + 1) % 1 * cw;
    for (let u = Math.floor((u0 + off) / cw) * cw - off; u < u1; u += cw) {
      if (u <= u0 + 0.05) continue;
      segs.push({ a: P(u, va), b: P(u, vb), w: w * 0.8 });
    }
  }
  return segs;
}

export function buildBuilding() {
  const root = new THREE.Group(); root.name = 'building';
  const pieces = { columns: [], floors: [] };
  const L2 = B.L / 2, D2 = B.D / 2, F = B.frame;

  // ---------------- terreno ----------------
  {
    const g = new THREE.Group(); g.name = 'terrain';
    const slope = Math.atan(0.055);
    const pg = new THREE.PlaneGeometry(110, 70, 1, 1); pg.rotateX(-Math.PI / 2);
    const pave = new THREE.Mesh(pg, mat('pave')); pave.rotation.z = slope; pave.receiveShadow = true;
    // plano inclinado: y = -0.055 x
    pave.rotation.set(0, 0, 0); pave.geometry = pg.clone();
    const pos = pave.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, B.ground(pos.getX(i)) - 0.02);
    pos.needsUpdate = true; pave.geometry.computeVertexNormals();
    g.add(pave);
    const ag = new THREE.PlaneGeometry(600, 600, 24, 1); ag.rotateX(-Math.PI / 2);
    const ap = ag.attributes.position;
    for (let i = 0; i < ap.count; i++) ap.setY(i, B.ground(Math.max(-150, Math.min(150, ap.getX(i)))) - 0.18);
    ag.computeVertexNormals();
    const asph = new THREE.Mesh(ag, mat('asphalt')); asph.receiveShadow = true; g.add(asph);
    // linhas: meio-fio, linha de terra inclinada, hachura de declive
    const segs = [];
    const curb = [[-55, -35], [55, -35], [55, 35], [-55, 35]];
    for (let i = 0; i < 4; i++) {
      const a = curb[i], b = curb[(i + 1) % 4];
      for (let k = 0; k < 8; k++) {
        const t0 = k / 8, t1 = (k + 1) / 8;
        const xa = a[0] + (b[0] - a[0]) * t0, za = a[1] + (b[1] - a[1]) * t0, xb = a[0] + (b[0] - a[0]) * t1, zb = a[1] + (b[1] - a[1]) * t1;
        segs.push({ a: [xa, B.ground(xa) + 0.01, za], b: [xb, B.ground(xb) + 0.01, zb], w: 1.3 });
      }
    }
    for (let x = -50; x <= 50; x += 10) segs.push({ a: [x, B.ground(x) + 0.01, -35], b: [x, B.ground(x) + 0.01, -38], w: 0.7 });
    orderBy(segs, (s) => s.a[0] + R() * 8);
    const ln = new InkLines(segs, { overshoot: 0.6, wobble: 0.05, subdiv: 6, seed: 11 });
    g.add(ln); g.userData.lines = { contour: ln };
    root.add(g); pieces.terrain = g;
  }

  // ---------------- pilotis (travertino) ----------------
  const colXY = [];
  for (const x of [-21, -12, -3, 6, 15, 24]) { colXY.push([x, -9.3]); colXY.push([x, 9.3]); }
  colXY.push([24, -3.1], [24, 3.1]);
  const colR = 0.72;
  colXY.forEach(([x, z], i) => {
    const gy = B.ground(x) - 0.1; const h = B.yB - gy;
    const g = new THREE.Group(); g.position.set(x, gy, z); g.name = 'col' + i;
    const cg = new THREE.CylinderGeometry(colR, colR, h, 40, 1, true); cg.translate(0, h / 2, 0);
    const m = new THREE.Mesh(cg, mat('travertine')); m.castShadow = m.receiveShadow = true; g.add(m);
    const hull = new THREE.Mesh(cg, hullMaterial({ width: 1.3 })); g.add(hull);
    const segs = [...ring(0, 0.02, 0, colR, 32, 1.4), ...ring(0, h - 0.02, 0, colR, 32, 1.4)];
    for (let y = 1.2; y < h - 0.3; y += 1.2) segs.push(...ring(0, y, 0, colR + 0.002, 32, 0.6));
    // caneluras verticais finas (como no desenho do hall)
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; segs.push({ a: [Math.cos(a) * colR * 1.003, 0, Math.sin(a) * colR * 1.003], b: [Math.cos(a) * colR * 1.003, h, Math.sin(a) * colR * 1.003], w: 0.45 }); }
    orderBy(segs, (s) => Math.min(s.a[1], s.b[1]));
    const ln = new InkLines(segs, { overshoot: 0.05, seed: 100 + i, span: 0.3 });
    g.add(ln); g.userData = { lines: { contour: ln }, hull, h };
    root.add(g); pieces.columns.push(g);
  });

  // ---------------- térreo recuado: granito preto + vidro ----------------
  {
    const g = new THREE.Group(); g.name = 'groundfloor';
    const x0 = -21.5, x1 = 21.5, zz = 6.6;
    g.add(meshOf(box(x0, -2.5, -zz, x1, B.yB - 0.01, zz), mat('blackgranite')));
    const glassG = [], mull = [];
    const segs = [];
    const spans = [[-17, -5], [3, 17]];
    for (const s of [1, -1]) for (const [a, b] of spans) {
      const gz = s * (zz + 0.02);
      const pg = new THREE.PlaneGeometry(b - a, 5.2); pg.translate((a + b) / 2, B.ground((a + b) / 2) + 2.7, gz); if (s < 0) pg.rotateY(0); glassG.push(pg);
      for (let x = a; x <= b + 0.01; x += 1.5) { segs.push({ a: [x, B.ground(x) + 0.1, gz + s * 0.01], b: [x, B.ground(x) + 5.3, gz + s * 0.01], w: 0.7 }); }
      segs.push({ a: [a, B.ground(a) + 5.3, gz + s * 0.01], b: [b, B.ground(b) + 5.3, gz + s * 0.01], w: 0.9 });
      segs.push({ a: [a, B.ground(a) + 2.6, gz + s * 0.01], b: [b, B.ground(b) + 2.6, gz + s * 0.01], w: 0.5 });
    }
    // entrada principal na face sul
    { const xg = x1 + 0.02; const pg = new THREE.PlaneGeometry(10, 6.2); pg.rotateY(Math.PI / 2); pg.translate(xg, B.ground(x1) + 3.1, 0); glassG.push(pg);
      for (let z = -5; z <= 5.01; z += 1.25) segs.push({ a: [xg + 0.01, B.ground(x1), z], b: [xg + 0.01, B.ground(x1) + 6.2, z], w: 0.7 });
      for (const y of [2.6, 4.2, 6.2]) segs.push({ a: [xg + 0.01, B.ground(x1) + y, -5], b: [xg + 0.01, B.ground(x1) + y, 5], w: 0.7 }); }
    const gm = new THREE.Mesh(mergeGeometries(glassG), mat('glass', { side: THREE.DoubleSide })); gm.receiveShadow = true; g.add(gm);
    segs.push(...boxEdges(x0, B.ground(x0), -zz, x1, B.yB, zz, 1.8).filter((e) => e.a[1] > -1 || e.b[1] > -1));
    orderBy(segs, (s) => s.a[1] + R());
    const ln = new InkLines(segs, { overshoot: 0.3, wobble: 0.03, subdiv: 5, seed: 21 });
    g.add(ln); g.userData.lines = { contour: ln };
    root.add(g); pieces.ground = g;
  }

  // ---------------- pavimentos 1 a 5 (faixas de janelas) ----------------
  for (let i = 0; i < 4; i++) {
    const y0 = B.yB + B.fh * i, y1 = y0 + B.fh;
    const g = new THREE.Group(); g.name = 'floor' + (i + 1);
    const pivot = new THREE.Group(); g.add(pivot);
    const gran = [], glass = [], dark = [], mull = [], alu = [];
    // empenas cegas (norte e sul) — trecho deste pavimento
    gran.push(box(L2 - F, y0, -D2, L2, y1, D2), box(-L2, y0, -D2, -L2 + F, y1, D2));
    // laje / testeira
    gran.push(box(-L2 + F, y0, -D2 + 0.1, L2 - F, y0 + 0.45, D2 - 0.1));
    // faixa de janelas (volume de vidro) + peitoril escuro
    glass.push(box(-L2 + F, y0 + 0.45, -D2 + 0.35, L2 - F, y1, D2 - 0.35));
    for (const s of [1, -1]) {
      const zf = s * (D2 - 0.33);
      const pg = new THREE.PlaneGeometry(B.L - 2 * F, 0.8); if (s < 0) pg.rotateY(Math.PI); pg.translate(0, y0 + 0.85, zf); dark.push(pg);
      for (let x = -L2 + F + 1.25; x < L2 - F - 0.1; x += 1.25) mull.push(box(x - 0.04, y0 + 0.45, zf - 0.06, x + 0.04, y1, zf + 0.06));
      mull.push(box(-L2 + F, y0 + 1.22, zf - 0.07, L2 - F, y0 + 1.3, zf + 0.07));
    }
    // brises verticais de alumínio na fachada oeste
    const briseSegs = [];
    if (true) {
      let k = 0;
      for (let x = -L2 + F + 0.35; x < L2 - F - 0.2; x += 0.55, k++) {
        if (k % 14 === 13) continue; // pequenas pausas entre painéis
        alu.push(box(x - 0.035, y0 + 0.5, -D2 - 0.32, x + 0.035, y1 - 0.05, -D2 + 0.05));
        briseSegs.push({ a: [x, y0 + 0.5, -D2 - 0.33], b: [x, y1 - 0.05, -D2 - 0.33], w: 0.55 });
      }
      alu.push(box(-L2 + F, y1 - 0.12, -D2 - 0.36, L2 - F, y1 - 0.02, -D2 + 0.05));
    }
    pivot.add(meshOf(gran, mat('granite')));
    pivot.add(meshOf(glass, mat('glass')));
    pivot.add(meshOf(dark, mat('mullion', { side: THREE.DoubleSide })));
    pivot.add(meshOf(mull, mat('mullion')));
    pivot.add(meshOf(alu, mat('alu')));
    // linhas
    const contour = [];
    contour.push(...boxEdges(L2 - F, y0, -D2, L2, y1, D2, 2.0), ...boxEdges(-L2, y0, -D2, -L2 + F, y1, D2, 2.0));
    for (const s of [1, -1]) {
      const z = s * (D2 - 0.1);
      contour.push({ a: [-L2 + F, y0 + 0.45, z], b: [L2 - F, y0 + 0.45, z], w: 1.6 }, { a: [-L2 + F, y0, z], b: [L2 - F, y0, z], w: 1.4 });
    }
    if (i === 0) contour.push(...boxEdges(-L2, y0, -D2, L2, y0 + 0.01, D2, 2.2));
    const grid = [];
    for (const s of [1, -1]) {
      const zf = s * (D2 - 0.26);
      for (let x = -L2 + F + 1.25; x < L2 - F - 0.1; x += 1.25) grid.push({ a: [x, y0 + 0.45, zf], b: [x, y1, zf], w: 0.7 });
      grid.push({ a: [-L2 + F, y0 + 1.26, zf], b: [L2 - F, y0 + 1.26, zf], w: 0.8 });
    }
    grid.push(...graniteJoints('x', L2 + 0.003, -D2, D2, y0, y1), ...graniteJoints('x', -L2 - 0.003, -D2, D2, y0, y1));
    grid.push(...graniteJoints('z', D2 + 0.003, L2 - F, L2, y0, y1, 0.5), ...graniteJoints('z', -D2 - 0.003, L2 - F, L2, y0, y1, 0.5));
    grid.push(...graniteJoints('z', D2 + 0.003, -L2, -L2 + F, y0, y1, 0.5), ...graniteJoints('z', -D2 - 0.003, -L2, -L2 + F, y0, y1, 0.5));
    orderBy(contour, (s) => R()); orderBy(grid, (s) => (s.a[0] + s.b[0]) * 0.5 + R() * 6); orderBy(briseSegs, (s) => s.a[0]);
    const lc = new InkLines(contour, { overshoot: 0.5, wobble: 0.04, subdiv: 8, seed: 30 + i, span: 0.15 });
    const lg = new InkLines(grid, { overshoot: 0.08, wobble: 0.015, subdiv: 10, seed: 40 + i, span: 0.12 });
    const lb = new InkLines(briseSegs, { overshoot: 0.06, seed: 50 + i, span: 0.1 });
    pivot.add(lc, lg, lb);
    g.userData = { lines: { contour: lc, grid: lg, brise: lb }, pivot, y0 };
    root.add(g); pieces.floors.push(g);
  }

  // ---------------- loggia (6º e 7º pavimentos) ----------------
  {
    const [y0, y1] = B.loggia;
    const g = new THREE.Group(); g.name = 'loggia'; const pivot = new THREE.Group(); g.add(pivot);
    const gran = [box(L2 - F, y0, -D2, L2, y1, D2), box(-L2, y0, -D2, -L2 + F, y1, D2), box(-L2 + F, y0, -D2 + 0.1, L2 - F, y0 + 0.45, D2 - 0.1)];
    pivot.add(meshOf(gran, mat('granite')));
    const back = 8.0;
    pivot.add(meshOf(box(-L2 + F, y0 + 0.45, -back, L2 - F, y1, back), mat('glass')));
    const inner = [];
    for (const s of [1, -1]) inner.push(box(-L2 + F, y0 + 2.6, s * back - 0.05, L2 - F, y0 + 2.7, s * back + 0.05));
    const mull = [];
    for (const s of [1, -1]) for (let x = -L2 + F + 1.5; x < L2 - F; x += 1.5) mull.push(box(x - 0.04, y0 + 0.45, s * back - 0.06, x + 0.04, y1, s * back + 0.06));
    pivot.add(meshOf(inner, mat('concrete')), meshOf(mull, mat('mullion')));
    // pilares cilíndricos altos
    const colG = [];
    const lcs = [];
    for (const s of [1, -1]) for (const x of [-19, -9.5, 0, 9.5, 19]) {
      const cg = new THREE.CylinderGeometry(0.5, 0.5, y1 - y0 - 0.45, 32, 1, true); cg.translate(x, (y0 + 0.45 + y1) / 2, s * 9.9); colG.push(cg);
      lcs.push(...ring(x, y0 + 0.46, s * 9.9, 0.5, 24, 1.1), ...ring(x, y1 - 0.01, s * 9.9, 0.5, 24, 1.1));
    }
    const cm = meshOf(colG, mat('travertine')); pivot.add(cm);
    const ch = new THREE.Mesh(cm.geometry, hullMaterial({ width: 1.2 })); pivot.add(ch);
    // murais em relevo "Terra" (leste) e "Povo" (oeste)
    const murals = [];
    const contourM = [];
    for (const [s, xc, seed] of [[1, 5.3, 3], [-1, -14.3, 9]]) {
      const W = 10.58, H = 4.55;
      const pg = new THREE.PlaneGeometry(W, H, 150, 100);
      const p = pg.attributes.position;
      const hf = reliefHeight(seed);
      for (let k = 0; k < p.count; k++) p.setZ(k, hf(p.getX(k) / W + 0.5, p.getY(k) / H + 0.5) * 0.18);
      pg.computeVertexNormals();
      if (s < 0) pg.rotateY(Math.PI);
      pg.translate(xc, y0 + 0.45 + H / 2 + 0.05, s * (back + 0.06));
      const mm = new THREE.Mesh(pg, mat('relief')); mm.castShadow = mm.receiveShadow = true; pivot.add(mm); murals.push(mm);
      // linhas de nível do relevo (marching squares), como desenho do mural
      contourM.push(...reliefContours(hf, (u, v) => [xc + s * (u - 0.5) * W, y0 + 0.5 + v * H, s * (back + 0.25)]));
      contourM.push(...polyline([[xc - W / 2, y0 + 0.5, s * (back + 0.2)], [xc + W / 2, y0 + 0.5, s * (back + 0.2)], [xc + W / 2, y0 + 0.5 + H, s * (back + 0.2)], [xc - W / 2, y0 + 0.5 + H, s * (back + 0.2)]], 1.2, true));
    }
    const contour = [...boxEdges(L2 - F, y0, -D2, L2, y1, D2, 2.0), ...boxEdges(-L2, y0, -D2, -L2 + F, y1, D2, 2.0), ...lcs];
    for (const s of [1, -1]) contour.push({ a: [-L2 + F, y0 + 0.45, s * (D2 - 0.1)], b: [L2 - F, y0 + 0.45, s * (D2 - 0.1)], w: 1.6 }, { a: [-L2 + F, y1, s * back], b: [L2 - F, y1, s * back], w: 1.0 }, { a: [-L2 + F, y0 + 0.45, s * back], b: [L2 - F, y0 + 0.45, s * back], w: 1.0 });
    const grid = [];
    for (const s of [1, -1]) for (let x = -L2 + F + 1.5; x < L2 - F; x += 1.5) grid.push({ a: [x, y0 + 0.45, s * (back + 0.07)], b: [x, y1, s * (back + 0.07)], w: 0.6 });
    grid.push(...graniteJoints('x', L2 + 0.003, -D2, D2, y0, y1), ...graniteJoints('x', -L2 - 0.003, -D2, D2, y0, y1));
    orderBy(contour, () => R()); orderBy(grid, (s) => s.a[0] + R() * 6); orderBy(contourM, (s) => s.a[0] + R() * 3);
    const lc = new InkLines(contour, { overshoot: 0.4, wobble: 0.03, subdiv: 8, seed: 61, span: 0.15 });
    const lg = new InkLines(grid, { overshoot: 0.05, seed: 62, span: 0.12 });
    const lm = new InkLines(contourM, { seed: 63, span: 0.05, wobble: 0.01 });
    pivot.add(lc, lg, lm);
    g.userData = { lines: { contour: lc, grid: lg, mural: lm }, pivot, y0, hull: ch };
    root.add(g); pieces.loggia = g;
  }

  // ---------------- cobertura + hastes de iluminação ----------------
  {
    const [y0, y1] = B.roof;
    const g = new THREE.Group(); g.name = 'roof'; const pivot = new THREE.Group(); g.add(pivot);
    pivot.add(meshOf([box(-L2, y0, -D2, L2, y1, D2), box(-L2 + 2, y1, -D2 + 4, -L2 + 12, y1 + 2.2, D2 - 4)], mat('granite')));
    const rods = [];
    const rodSegs = [];
    [[29.9, 0], [29.3, 1], [28.7, 2]].forEach(([y, k]) => {
      const a = new THREE.Vector3(-3 + k * 0.2, y, D2 - 0.6), b = new THREE.Vector3(-5.2 + k * 0.2, y + 0.9, D2 + 4.2);
      const cg = new THREE.CylinderGeometry(0.05, 0.07, a.distanceTo(b), 8);
      cg.translate(0, a.distanceTo(b) / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      cg.applyQuaternion(q); cg.translate(a.x, a.y, a.z); rods.push(cg);
      const lamp = new THREE.CylinderGeometry(0.18, 0.12, 0.35, 12); lamp.rotateX(Math.PI / 2); lamp.translate(b.x, b.y, b.z); rods.push(lamp);
      rodSegs.push({ a: a.toArray(), b: b.toArray(), w: 1.2 });
    });
    pivot.add(meshOf(rods, mat('alu')));
    const contour = [...boxEdges(-L2, y0, -D2, L2, y1, D2, 2.2), ...boxEdges(-L2 + 2, y1, -D2 + 4, -L2 + 12, y1 + 2.2, D2 - 4, 1.2), ...rodSegs];
    const grid = [...graniteJoints('x', L2 + 0.003, -D2, D2, y0, y1), ...graniteJoints('x', -L2 - 0.003, -D2, D2, y0, y1), ...graniteJoints('z', D2 + 0.003, -L2, L2, y0, y1, 0.55), ...graniteJoints('z', -D2 - 0.003, -L2, L2, y0, y1, 0.55)];
    orderBy(contour, () => R()); orderBy(grid, (s) => s.a[0] + R() * 6);
    const lc = new InkLines(contour, { overshoot: 0.6, wobble: 0.04, subdiv: 8, seed: 71, span: 0.15 });
    const lg = new InkLines(grid, { overshoot: 0.05, seed: 72, span: 0.12 });
    pivot.add(lc, lg);
    g.userData = { lines: { contour: lc, grid: lg }, pivot, y0 };
    root.add(g); pieces.roof = g;
  }

  // ---------------- anexo baixo, rampa e muro de granito avermelhado ----------------
  {
    const g = new THREE.Group(); g.name = 'annex';
    const gy = B.ground(-31);
    const segs = [];
    g.add(meshOf(box(-40, gy - 1, 1, -25.5, gy + 5.2, 11.5), mat('concrete')));
    const wg = new THREE.PlaneGeometry(13, 1.4); wg.translate(-32.75, gy + 3.4, 11.52);
    g.add(meshOf(wg, mat('glass')));
    for (let x = -39; x <= -26.4; x += 1.3) segs.push({ a: [x, gy + 2.7, 11.55], b: [x, gy + 4.1, 11.55], w: 0.6 });
    segs.push({ a: [-39.25, gy + 2.7, 11.55], b: [-26.25, gy + 2.7, 11.55], w: 0.9 }, { a: [-39.25, gy + 4.1, 11.55], b: [-26.25, gy + 4.1, 11.55], w: 0.9 });
    g.add(meshOf([box(-40, gy - 1, -12.6, -24, gy + 1.5, -11.8), box(-24, gy - 1, -12.6, -18, gy + 0.9, -11.8)], mat('redgranite')));
    // rampa
    const rg = box(-24, 0, 11.8, -12, 0.25, 14);
    const rp = rg.attributes.position; for (let k = 0; k < rp.count; k++) { const x = rp.getX(k); rp.setY(k, rp.getY(k) + B.ground(x) + (x + 24) / 12 * -0.6 + 0.6); }
    rg.computeVertexNormals(); g.add(meshOf(rg, mat('concrete')));
    segs.push(...boxEdges(-40, gy, 1, -25.5, gy + 5.2, 11.5, 1.6), ...boxEdges(-40, gy, -12.6, -24, gy + 1.5, -11.8, 1.2));
    segs.push({ a: [-24, B.ground(-24) + 0.85, 14], b: [-12, B.ground(-12) + 0.25, 14], w: 1.1 }, { a: [-24, B.ground(-24) + 0.85, 11.8], b: [-12, B.ground(-12) + 0.25, 11.8], w: 1.1 });
    orderBy(segs, () => R());
    const ln = new InkLines(segs, { overshoot: 0.4, wobble: 0.03, subdiv: 6, seed: 81, span: 0.15 });
    g.add(ln); g.userData.lines = { contour: ln };
    root.add(g); pieces.annex = g;
  }

  return { root, pieces };
}

// --------- relevo dos murais: figuras e faixas abstratas, sem qualquer escrita ---------
function reliefHeight(seed) {
  const r = rng(seed * 977);
  const blobs = [];
  for (let i = 0; i < 38; i++) blobs.push([r(), 0.1 + r() * 0.8, 0.02 + r() * 0.05, 0.08 + r() * 0.22, r() < 0.5 ? 1 : 0.6]);
  return (u, v) => {
    let h = 0.15 * Math.sin(u * 14 + Math.sin(v * 5 + seed) * 2) * Math.sin(v * 9 + seed);
    for (const [bx, by, sx, sy, a] of blobs) {
      const dx = (u - bx) / sx, dy = (v - by) / sy;
      h += a * Math.exp(-(dx * dx + dy * dy));
    }
    // margem plana
    const m = Math.min(u, 1 - u, v, 1 - v);
    return Math.max(0, Math.min(1.4, h)) * Math.min(1, m * 25);
  };
}
function reliefContours(hf, map) {
  const segs = [];
  const N = 70, M = 48;
  for (const lev of [0.3, 0.75]) {
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N, v0 = j / M, v1 = (j + 1) / M;
      const c = [hf(u0, v0), hf(u1, v0), hf(u1, v1), hf(u0, v1)];
      const P = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      const pts = [];
      for (let e = 0; e < 4; e++) {
        const a = c[e], b = c[(e + 1) % 4];
        if ((a < lev) !== (b < lev)) { const t = (lev - a) / (b - a); const pa = P[e], pb = P[(e + 1) % 4]; pts.push([pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t]); }
      }
      if (pts.length >= 2) segs.push({ a: map(...pts[0]), b: map(...pts[1]), w: lev > 0.5 ? 0.8 : 0.55 });
    }
  }
  return segs;
}

// ---------------- entorno em traço leve ----------------
export function buildContext() {
  const root = new THREE.Group(); root.name = 'context';
  const r = rng(77);
  const items = [];
  const blocks = [
    // [x0,z0,x1,z1,h, tipo]
    [8, -62, 42, -28, 15, 'teatro'],
    [-34, 26, -18, 42, 48, 'torre'],
    [-14, 26, 6, 44, 22, 'bloco'],
    [8, 28, 26, 46, 30, 'bloco'],
    [-74, -30, -50, -8, 18, 'bloco'],
    [-74, 0, -52, 22, 26, 'bloco'],
    [-44, -66, -10, -36, 20, 'classico'],
    [70, -84, 100, -62, 16, 'classico'],
    [74, 64, 108, 88, 20, 'classico'],
  ];
  const lineMats = [];
  for (const [x0, z0, x1, z1, h, t] of blocks) {
    const segs = [];
    const gy = B.ground(Math.max(-150, Math.min(150, (x0 + x1) / 2))) - 0.2;
    const occ = new THREE.Mesh(box(x0, gy - 1, z0, x1, gy + h, z1), paperMat());
    segs.push(...boxEdges(x0, gy, z0, x1, gy + h, z1, 1.0));
    if (t === 'torre' || t === 'bloco') for (let y = gy + 3; y < gy + h - 1; y += 3) { segs.push({ a: [x0, y, z0 - 0.02], b: [x1, y, z0 - 0.02], w: 0.45 }, { a: [x1 + 0.02, y, z0], b: [x1 + 0.02, y, z1], w: 0.45 }, { a: [x0, y, z1 + 0.02], b: [x1, y, z1 + 0.02], w: 0.45 }, { a: [x0 - 0.02, y, z0], b: [x0 - 0.02, y, z1], w: 0.45 }); }
    if (t === 'teatro' || t === 'classico') {
      for (const y of [gy + h * 0.45, gy + h * 0.9]) segs.push({ a: [x0 - 0.3, y, z1 + 0.3], b: [x1 + 0.3, y, z1 + 0.3], w: 0.7 }, { a: [x1 + 0.3, y, z0 - 0.3], b: [x1 + 0.3, y, z1 + 0.3], w: 0.7 }, { a: [x0 - 0.3, y, z0 - 0.3], b: [x0 - 0.3, y, z1 + 0.3], w: 0.7 });
      for (const [face, u0, u1] of [['z', x0, x1], ['x', z0, z1]]) for (let u = u0 + 2; u < u1 - 1; u += 3.2) {
        for (const yb of [gy + 1.2, gy + h * 0.5 + 0.8]) {
          const hw = 0.7, hh = 2.6;
          const P = (uu, yy) => (face === 'z' ? [uu, yy, z1 + 0.02] : [x1 + 0.02, yy, uu]);
          const pts = [P(u - hw, yb), P(u - hw, yb + hh)];
          for (let k = 1; k <= 6; k++) { const a = Math.PI - k / 6 * Math.PI; pts.push(P(u + Math.cos(a) * hw, yb + hh + Math.sin(a) * hw)); }
          pts.push(P(u + hw, yb));
          segs.push(...polyline(pts, 0.45));
        }
      }
    }
    orderBy(segs, () => r());
    const ln = new InkLines(segs, { color: 0x5c5650, overshoot: 0.8, wobble: 0.06, subdiv: 8, seed: 91 + items.length, span: 0.2 });
    const g = new THREE.Group(); g.add(occ, ln); root.add(g);
    items.push({ g, box: new THREE.Box3(new THREE.Vector3(x0, gy - 1, z0), new THREE.Vector3(x1, gy + h, z1)) });
  }
  // árvores da praça: rabiscos esféricos com oclusor de papel
  for (let i = 0; i < 46; i++) {
    const x = 46 + r() * 70, z = -44 + r() * 88;
    if (Math.abs(z) < 6) continue;
    const gy = B.ground(Math.min(150, x));
    const rad = 2.5 + r() * 2.2, cy = gy + 4 + rad;
    const sg = new THREE.IcosahedronGeometry(rad * 0.45, 1); sg.translate(x, cy, z);
    const tsegs = [{ a: [x, gy, z], b: [x, cy - rad * 0.5, z], w: 1.0 }];
    let prev = null;
    for (let k = 0; k < 40; k++) {
      const th = k * 0.7 + r() * 0.5, ph = Math.acos(1 - 2 * ((k * 0.618) % 1));
      const rr = rad * (0.85 + 0.2 * r());
      const p = [x + Math.sin(ph) * Math.cos(th) * rr, cy + Math.cos(ph) * rr * 0.85, z + Math.sin(ph) * Math.sin(th) * rr];
      if (prev) tsegs.push({ a: prev, b: p, w: 0.5 });
      prev = p;
    }
    orderSeq(tsegs);
    const g = new THREE.Group(); g.add(new THREE.Mesh(sg, paperMat()), new InkLines(tsegs, { color: 0x6a645c, wobble: 0.05, seed: 200 + i, span: 0.3 }));
    root.add(g);
    items.push({ g, box: new THREE.Box3(new THREE.Vector3(x - rad, gy, z - rad), new THREE.Vector3(x + rad, cy + rad, z + rad)) });
  }
  // esconde o que estiver entre a câmera e o alvo (ou colado na câmera)
  const ray = new THREE.Ray(), tmp = new THREE.Vector3(), eb = new THREE.Box3();
  root.userData.cull = (cp, tgt) => {
    const dist = cp.distanceTo(tgt);
    ray.origin.copy(cp); ray.direction.copy(tgt).sub(cp).normalize();
    for (const it of items) {
      eb.copy(it.box).expandByScalar(5);
      let hide = eb.containsPoint(cp) || it.box.distanceToPoint(cp) < 22;
      if (!hide) { const hit = ray.intersectBox(it.box.clone().expandByScalar(1.5), tmp); if (hit && hit.distanceTo(cp) < dist) hide = true; }
      it.g.visible = !hide;
    }
  };
  return root;
}

// ---------------- figuras humanas mínimas ----------------
export function buildPeople(n = 34) {
  const r = rng(2005);
  const segs = [];
  const spots = [];
  for (let i = 0; i < n; i++) {
    let x, z;
    if (i < 14) { x = 18 + r() * 12; z = -8 + r() * 16; } else if (i < 24) { x = -20 + r() * 44; z = (r() < 0.5 ? -1 : 1) * (12 + r() * 10); } else { x = 30 + r() * 20; z = -20 + r() * 40; }
    spots.push([x, z]);
    const gy = B.ground(x), h = 1.62 + r() * 0.2;
    const s = r() < 0.5 ? 1 : -1;
    const ang = -0.79 + (r() - 0.5) * 0.6, ux = Math.cos(ang), uz = Math.sin(ang);
    const P = (dx, y, dn = 0) => [x + dx * ux - dn * uz, y, z + dx * uz + dn * ux];
    const hy = gy + h - 0.12;
    for (let k = 0; k < 7; k++) { const a0 = k / 7 * 6.283, a1 = (k + 1) / 7 * 6.283; segs.push({ a: P(Math.cos(a0) * 0.12, hy + Math.sin(a0) * 0.13), b: P(Math.cos(a1) * 0.12, hy + Math.sin(a1) * 0.13), w: 0.8 }); }
    const sh = gy + h - 0.3, hip = gy + 0.9;
    segs.push({ a: P(-0.2, sh), b: P(0.2, sh), w: 1.1 }, { a: P(-0.2, sh), b: P(-0.14, hip), w: 1.1 }, { a: P(0.2, sh), b: P(0.14, hip), w: 1.1 });
    segs.push({ a: P(-0.14, hip), b: P(0.14, hip), w: 1.0 });
    segs.push({ a: P(-0.1, hip), b: P(-0.12 - s * 0.12, gy), w: 1.0 }, { a: P(0.1, hip), b: P(0.12 + s * 0.08, gy), w: 1.0 });
    segs.push({ a: P(-0.2, sh), b: P(-0.28, gy + 0.85, 0.05), w: 0.8 }, { a: P(0.2, sh), b: P(0.3, gy + 0.85, -0.05), w: 0.8 });
  }
  orderBy(segs, (s) => s.a[0] * 0.2 + r());
  const ln = new InkLines(segs, { seed: 93, span: 0.05 });
  // as figuras ficam sempre voltadas para a câmera (billboard por grupo não é necessário: são quase planas)
  ln.userData.spots = spots;
  return ln;
}

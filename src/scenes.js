// Cenas desenhadas do ato 1: corte longitudinal com escada helicoidal, hall de pilares,
// e a folha de desenho que se deita e vira chão.
import * as THREE from 'three';
import { paperMat } from './materials.js';
import { InkLines, boxEdges, ring, polyline, orderBy, orderSeq, rng, hullMaterial } from './lines.js';
import { B } from './building.js';

// ---------------- corte longitudinal ----------------
export function buildSection() {
  const root = new THREE.Group(); root.name = 'section';
  const r = rng(53);
  const groups = { ground: [], structure: [], slabs: [], interior: [], stair: [], roof: [] };
  const z = 0;
  // terreno e terra hachurada
  for (let x = -44; x < 44; x += 2) groups.ground.push({ a: [x, B.ground(x), z], b: [x + 2, B.ground(x + 2), z], w: 2.2 });
  for (let x = -44; x < 44; x += 0.7) { const y = B.ground(x); groups.ground.push({ a: [x, y - 0.25, z], b: [x - 1.2, y - 1.6, z], w: 0.5 }); }
  groups.ground.push(...polyline([[-12, B.ground(-12), z], [-12, -4.2, z], [12, -4.2, z], [12, B.ground(12), z]], 1.6));
  // pilotis e térreo
  for (const x of [-21, -12, -3, 6, 15, 24]) {
    const gy = B.ground(x);
    groups.structure.push({ a: [x - 0.72, gy, z], b: [x - 0.72, B.yB, z], w: 1.5 }, { a: [x + 0.72, gy, z], b: [x + 0.72, B.yB, z], w: 1.5 });
    for (let y = gy + 1.2; y < B.yB; y += 1.2) groups.structure.push({ a: [x - 0.72, y, z], b: [x + 0.72, y, z], w: 0.5 });
  }
  groups.structure.push({ a: [-21.5, 4.5, z], b: [-6, 4.5, z], w: 1.2 }, { a: [-21.5, 4.9, z], b: [-6, 4.9, z], w: 1.2 });
  // mural do térreo: figuras em linhas abstratas
  for (let k = 0; k < 22; k++) {
    const x = 4 + k * 0.75 + r() * 0.3, y0 = 4.6, h = 2.2 + r() * 1.0;
    groups.structure.push({ a: [x, y0, z], b: [x + (r() - 0.5) * 0.4, y0 + h, z], w: 0.6 });
    groups.structure.push(...polyline([[x - 0.18, y0 + h, z], [x, y0 + h + 0.35, z], [x + 0.18, y0 + h, z]], 0.6));
  }
  groups.structure.push(...polyline([[3.5, 4.4, z], [21, 4.4, z], [21, 7.6, z], [3.5, 7.6, z]], 1.0, true));
  // lajes com poché
  const levels = [B.yB, B.yB + 4.3, B.yB + 8.6, B.yB + 12.9, B.loggia[0], B.roof[0]];
  levels.forEach((y, i) => {
    const s = [];
    s.push({ a: [-27, y, z], b: [27, y, z], w: 2.0 }, { a: [-27, y + 0.45, z], b: [27, y + 0.45, z], w: 2.0 });
    for (let x = -26.8; x < 26.8; x += 0.32) s.push({ a: [x, y + 0.03, z], b: [x + 0.2, y + 0.42, z], w: 0.55 });
    s.forEach((q) => { q.lvl = i; }); groups.slabs.push(...s);
    // janelas além do plano de corte + divisórias
    if (i < levels.length - 1) {
      const y1 = levels[i + 1];
      for (let x = -25.8 + 1.25; x < 25.8; x += 1.25) { if (Math.abs(x) < 3.2) continue; groups.interior.push({ a: [x, y + 1.3, z - 0.1], b: [x, y1 - 0.05, z - 0.1], w: 0.4, lvl: i }); }
      groups.interior.push({ a: [-25.8, y + 1.3, z - 0.1], b: [25.8, y + 1.3, z - 0.1], w: 0.5, lvl: i });
      for (let k = 0; k < 4; k++) { const x = -24 + r() * 48; if (Math.abs(x) < 4) continue; groups.interior.push({ a: [x, y + 0.45, z], b: [x, y1, z], w: 1.0, lvl: i }); }
      // figuras mínimas nos andares
      for (let k = 0; k < 2; k++) { const x = -22 + r() * 44; if (Math.abs(x) < 4) continue; const yy = y + 0.45;
        groups.interior.push({ a: [x, yy, z], b: [x, yy + 1.1, z], w: 0.9, lvl: i }, ...polyline([[x - 0.12, yy + 1.25, z], [x, yy + 1.42, z], [x + 0.12, yy + 1.25, z], [x, yy + 1.1, z], [x - 0.12, yy + 1.25, z]], 0.7).map((q) => ({ ...q, lvl: i }))); }
    }
  });
  // empenas
  for (const x of [-27, -25.8, 25.8, 27]) groups.structure.push({ a: [x, B.yB, z], b: [x, B.yT, z], w: 2.0 });
  groups.roof.push({ a: [-27, B.yT, z], b: [27, B.yT, z], w: 2.2 });
  for (let x = -24; x < 24; x += 3) groups.roof.push({ a: [x, B.roof[0] + 0.45, z], b: [x + 1.5, B.yT, z], w: 0.9 }, { a: [x + 1.5, B.yT, z], b: [x + 3, B.roof[0] + 0.45, z], w: 0.9 });
  // escada helicoidal empilhada no núcleo
  const cx = 0, rO = 2.3, rI = 0.55;
  groups.structure.push({ a: [cx - 2.9, B.yB, z + 0.2], b: [cx - 2.9, B.roof[0], z + 0.2], w: 1.3 }, { a: [cx + 2.9, B.yB, z + 0.2], b: [cx + 2.9, B.roof[0], z + 0.2], w: 1.3 });
  for (let i = 0; i < levels.length - 1; i++) {
    const y0 = levels[i] + 0.45, y1 = levels[i + 1];
    const N = 48, out = [], inn = [], rail = [];
    for (let k = 0; k <= N; k++) {
      const th = k / N * Math.PI * 2, y = y0 + (y1 - y0) * k / N;
      out.push([cx + Math.cos(th) * rO, y, z + 1 + Math.sin(th) * rO]);
      inn.push([cx + Math.cos(th) * rI, y, z + 1 + Math.sin(th) * rI]);
      rail.push([cx + Math.cos(th) * rO, y + 0.95, z + 1 + Math.sin(th) * rO]);
    }
    const st = [...polyline(out, 1.4), ...polyline(inn, 1.0), ...polyline(rail, 0.8)];
    for (let k = 0; k < N; k += 2) st.push({ a: inn[k], b: out[k], w: 0.55 });
    orderSeq(st); st.forEach((q) => { q.lvl = i; q.o = (i + q.o) / (levels.length - 1); });
    groups.stair.push(...st);
  }
  const L = {};
  orderBy(groups.ground, (s) => s.a[0] + r() * 3);
  orderBy(groups.structure, (s) => Math.min(s.a[1], s.b[1]) + r() * 2);
  orderBy(groups.slabs, (s) => s.lvl + r() * 0.6);
  orderBy(groups.interior, (s) => s.lvl + r() * 0.8);
  orderBy(groups.roof, (s) => s.a[0]);
  for (const [k, segs] of Object.entries(groups)) {
    L[k] = new InkLines(segs, { overshoot: k === 'stair' ? 0 : 0.25, wobble: 0.02, subdiv: 4, seed: 300 + k.length, span: k === 'stair' ? 0.01 : 0.08 });
    root.add(L[k]);
  }
  // manchas de aquarela atrás do traço (laranja na escada, azul nas lajes)
  const washMat = (col, alpha) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uY: { value: -100 }, uA: { value: 0 }, uC: { value: new THREE.Color(col) }, uMax: { value: alpha } },
    vertexShader: 'varying vec3 vW; void main(){ vW = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW,1.); }',
    fragmentShader: `uniform float uY; uniform float uA; uniform vec3 uC; uniform float uMax; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fb(vec2 p){ return n(p)*.5 + n(p*2.1)*.25 + n(p*4.3)*.125 + n(p*9.)*.0625; }
      void main(){
        float e = fb(vW.xy * 0.35) * 2.2;
        float m = smoothstep(0., 1.6, uY - vW.y + (e - 1.1) * 1.6);
        float d = 0.6 + 0.4 * fb(vW.xy * 1.3 + 5.);
        float edge = smoothstep(0.0, 0.08, fb(vW.xy * 0.22 + 2.) - 0.25);
        float a = m * d * edge * uA * uMax;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uC, a);
      }`,
  });
  const orange = washMat(0xe9782f, 0.75), blue = washMat(0x7fa2a4, 0.45);
  const og = new THREE.PlaneGeometry(9, B.roof[0] - B.yB + 2); og.translate(0, (B.yB + B.roof[0]) / 2, -0.4);
  const bg = new THREE.PlaneGeometry(56, B.roof[0] - B.yB + 3); bg.translate(0, (B.yB + B.roof[0]) / 2, -0.6);
  const om = new THREE.Mesh(og, orange), bm = new THREE.Mesh(bg, blue);
  om.renderOrder = 2; bm.renderOrder = 1;
  root.add(bm, om);
  root.userData.wash = { orange, blue };
  root.userData.lines = L;
  return root;
}

// ---------------- hall de pilares (Vista do Hall) ----------------
export function buildHall() {
  const root = new THREE.Group(); root.name = 'hall';
  const r = rng(28);
  const pm = paperMat();
  const H = 8.6;
  const occ = (g) => { const m = new THREE.Mesh(g, pm); root.add(m); return m; };
  // piso, teto, paredes como oclusores de papel
  const fl = new THREE.PlaneGeometry(60, 60); fl.rotateX(-Math.PI / 2); fl.translate(0, 0, -10); occ(fl);
  const ce = new THREE.PlaneGeometry(60, 60); ce.rotateX(Math.PI / 2); ce.translate(0, H, -10); occ(ce);
  const bw = new THREE.PlaneGeometry(60, H); bw.translate(0, H / 2, -32); occ(bw);
  const rw = new THREE.PlaneGeometry(60, H); rw.rotateY(-Math.PI / 2); rw.translate(20, H / 2, -10); occ(rw);
  const segs = { floor: [], cols: [], mezz: [], wall: [], mural: [], people: [] };
  // piso em placas
  for (let x = -20; x <= 20; x += 2.6) segs.floor.push({ a: [x, 0.01, 12], b: [x, 0.01, -32], w: 0.6 });
  for (let z = -32; z <= 12; z += 2.6) segs.floor.push({ a: [-20, 0.01, z], b: [20, 0.01, z], w: 0.6 });
  // pilares cilíndricos com juntas e caneluras
  const colsP = [[-4.5, -4], [6, -4], [-12, -16], [1, -18], [12.5, -17], [-19, -27]];
  const colMeshes = [];
  for (const [x, z] of colsP) {
    const rad = 0.85;
    const cg = new THREE.CylinderGeometry(rad, rad, H, 40, 1, true); cg.translate(x, H / 2, z);
    colMeshes.push(occ(cg));
    const hull = new THREE.Mesh(cg, hullMaterial({ width: 1.4 })); root.add(hull); colMeshes.push(hull);
    for (let y = 0; y <= H; y += 1.05) segs.cols.push(...ring(x, y, z, rad * 1.004, 36, 0.8).map((s) => ({ ...s, col: 1 })));
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; segs.cols.push({ a: [x + Math.cos(a) * rad * 1.004, 0, z + Math.sin(a) * rad * 1.004], b: [x + Math.cos(a) * rad * 1.004, H, z + Math.sin(a) * rad * 1.004], w: 0.6 }); }
  }
  // mezanino à esquerda com guarda-corpo
  const mz = new THREE.BoxGeometry(14, 0.6, 26); mz.translate(-17, 4.5, -15); occ(mz);
  segs.mezz.push(...boxEdges(-24, 4.2, -28, -10, 4.8, -2, 1.5));
  for (let z = -27.5; z < -2; z += 1.2) segs.mezz.push({ a: [-10, 4.8, z], b: [-10, 5.85, z], w: 0.5 });
  segs.mezz.push({ a: [-10, 5.85, -28], b: [-10, 5.85, -2], w: 1.0 }, { a: [-10, 5.35, -28], b: [-10, 5.35, -2], w: 0.5 });
  for (let k = 0; k < 40; k++) { const z0 = -27 + r() * 24; segs.mezz.push(...polyline([[-9.99, 4.3 + r() * 0.4, z0], [-9.99, 4.35 + r() * 0.4, z0 + 1.2 + r()], [-9.99, 4.3 + r() * 0.4, z0 + 2.4 + r()]], 0.45)); }
  // parede de fundo: granito em blocos, painel quadriculado central e portas
  for (let y = 0.8; y < H; y += 0.8) segs.wall.push({ a: [-20, y, -31.99], b: [-4, y, -31.99], w: 0.5 }, { a: [4, y, -31.99], b: [20, y, -31.99], w: 0.5 });
  for (let x = -20; x < 20; x += 1.6) for (let y = 0; y < H; y += 1.6) { if (Math.abs(x) < 4.5) continue; segs.wall.push({ a: [x + (y / 1.6 % 2) * 0.8, y, -31.99], b: [x + (y / 1.6 % 2) * 0.8, y + 0.8, -31.99], w: 0.4 }); }
  for (let x = -4; x <= 4.01; x += 0.8) segs.wall.push({ a: [x, 0, -31.98], b: [x, H, -31.98], w: 0.7 });
  for (let y = 0; y <= H; y += 0.8) segs.wall.push({ a: [-4, y, -31.98], b: [4, y, -31.98], w: 0.7 });
  segs.wall.push(...boxEdges(-3, 0, -31.97, 3, 2.8, -31.9, 1.2));
  segs.wall.push({ a: [-20, H, -32], b: [20, H, -32], w: 1.6 }, { a: [20, 0, -32], b: [20, H, -32], w: 1.6 }, { a: [20, H, -32], b: [20, H, 12], w: 1.6 }, { a: [20, 0, -32], b: [20, 0, 12], w: 1.2 });
  // vitrine baixa e mural de figuras na parede direita
  for (let z = -31; z < 10; z += 1.6) segs.wall.push({ a: [19.98, 0, z], b: [19.98, 4.2, z], w: 0.7 });
  segs.wall.push({ a: [19.98, 4.2, -32], b: [19.98, 4.2, 12], w: 1.2 }, { a: [19.98, 4.6, -32], b: [19.98, 4.6, 12], w: 1.0 });
  for (let k = 0; k < 46; k++) {
    const zc = -31 + k * 0.92 + r() * 0.3, h = 2.4 + r() * 1.2, y0 = 4.75, wd = 0.28 + r() * 0.18;
    const lean = (r() - 0.5) * 0.4;
    const pts = [[19.97, y0, zc - wd], [19.97, y0 + h * 0.55, zc - wd * 1.15 + lean * 0.5], [19.97, y0 + h * 0.85, zc - wd * 0.7 + lean], [19.97, y0 + h, zc + lean], [19.97, y0 + h * 0.85, zc + wd * 0.7 + lean], [19.97, y0 + h * 0.55, zc + wd * 1.15 + lean * 0.5], [19.97, y0, zc + wd]];
    segs.mural.push(...polyline(pts, 0.75));
    const hy = y0 + h + 0.22;
    segs.mural.push(...polyline([[19.97, hy - 0.2, zc + lean], [19.97, hy, zc + lean - 0.16], [19.97, hy + 0.2, zc + lean], [19.97, hy, zc + lean + 0.16], [19.97, hy - 0.2, zc + lean]], 0.7));
    if (r() < 0.5) segs.mural.push({ a: [19.97, y0 + h * 0.7, zc + lean], b: [19.97, y0 + h * (0.9 + r() * 0.4), zc + lean + (r() - 0.5) * 1.4], w: 0.6 });
  }
  // pessoas no hall
  for (let k = 0; k < 16; k++) {
    const x = -14 + r() * 30, zz = -26 + r() * 30, h = 1.65 + r() * 0.2;
    const P = (dx, y) => [x + dx, y, zz];
    segs.people.push(...polyline([P(-0.12, h - 0.12), P(0, h + 0.02), P(0.12, h - 0.12), P(0, h - 0.26), P(-0.12, h - 0.12)], 0.8));
    segs.people.push(...polyline([P(-0.22, h - 0.3), P(-0.16, 0.9), P(-0.12, 0), P(0, 0.85), P(0.12, 0), P(0.16, 0.9), P(0.22, h - 0.3), P(-0.22, h - 0.3)], 0.9));
  }
  const L = {};
  orderBy(segs.floor, (s) => -s.a[2] + r() * 4);
  orderBy(segs.cols, (s) => Math.min(s.a[1], s.b[1]) + r() * 0.5);
  orderBy(segs.mezz, (s) => -s.a[2] + r());
  orderBy(segs.wall, (s) => s.a[1] + r() * 2);
  orderBy(segs.mural, (s) => s.a[2] + r());
  orderBy(segs.people, (s) => r());
  for (const [k, sg] of Object.entries(segs)) {
    L[k] = new InkLines(sg, { overshoot: k === 'cols' ? 0.02 : 0.3, wobble: 0.02, subdiv: 4, seed: 400 + k.length, span: 0.12 });
    root.add(L[k]);
  }
  root.userData = { lines: L, colMeshes };
  return root;
}

// ---------------- folha de desenho (vira plano de chão) ----------------
export function buildSheet() {
  const root = new THREE.Group(); root.name = 'sheet';
  const W = 46, H = 82;
  const pg = new THREE.PlaneGeometry(W, H); pg.translate(0, H / 2, 0);
  const plane = new THREE.Mesh(pg, paperMat()); root.add(plane);
  const segs = [];
  for (const m of [1.4, 2.0]) segs.push(...polyline([[-W / 2 + m, m, 0.02], [W / 2 - m, m, 0.02], [W / 2 - m, H - m, 0.02], [-W / 2 + m, H - m, 0.02]], m < 1.6 ? 1.0 : 2.0, true));
  const ln = new InkLines(segs, { overshoot: 0.8, wobble: 0.05, subdiv: 6, seed: 777, span: 0.3 });
  root.add(ln);
  root.userData = { plane, lines: ln };
  return root;
}

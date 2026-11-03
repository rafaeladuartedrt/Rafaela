// Themis: malha escultórica (SDF), lâminas do cabelo, espada de latão, contornos em nanquim.
import * as THREE from 'three';
import { mat, paperMat } from './materials.js';
import { InkLines, hullMaterial, rng, polyline, orderBy } from './lines.js';

export const Z0 = 0.62, TILT = 0.035;
const zc = (y) => Z0 + TILT * y;

export async function loadMesh(name) {
  const meta = await (await fetch(`../assets/themis_${name}.json`)).json();
  const buf = await (await fetch(`../assets/themis_${name}.bin`)).arrayBuffer();
  const n = meta.vertices, m = meta.indices;
  const pos = new Float32Array(buf, 0, n * 3);
  const nor = new Float32Array(buf, n * 12, n * 3);
  const ao = new Float32Array(buf, n * 24, n);
  const idx = new Uint32Array(buf, n * 28, m);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('ao', new THREE.BufferAttribute(ao, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

function bladeGeometry(len, w0, curl, seed) {
  const r = rng(seed);
  const N = 14;
  const pos = [], idx = [], edgeA = [], edgeB = [];
  const tw = (r() - 0.5) * 1.2;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = s * len;
    const y = Math.sin(s * Math.PI * (0.8 + r() * 0.1)) * curl * len + s * s * curl * 0.6 * len;
    const w = w0 * Math.pow(1 - s, 0.8) * (0.8 + 0.4 * Math.sin(s * 3 + seed));
    const a = tw * s;
    // largura no plano perpendicular (torção leve)
    const ny = Math.cos(a), nz = Math.sin(a);
    pos.push(x, y + ny * w / 2, nz * w / 2, x, y - ny * w / 2, -nz * w / 2);
    edgeA.push([x, y + ny * w / 2, nz * w / 2]); edgeB.push([x, y - ny * w / 2, -nz * w / 2]);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('ao', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0.8), 1));
  const grooves = [];
  for (const f of [0.3, 0.55, 0.78]) grooves.push(...polyline(edgeA.map((a, i) => a.map((v, j) => v + (edgeB[i][j] - v) * f)).slice(0, -2), 0.35));
  return { g, segs: [...polyline(edgeA, 0.8), ...polyline(edgeB, 0.8), ...grooves] };
}

function swordGeometry() {
  // eixo da espada: da ponta até o pomo (reto)
  const T = new THREE.Vector3(0.16, 1.72, 1.18), P = new THREE.Vector3(0.12, 6.62, 1.88);
  const ax = P.clone().sub(T).normalize();
  const side = new THREE.Vector3(1, 0, 0).sub(ax.clone().multiplyScalar(ax.x)).normalize();
  const fwd = new THREE.Vector3().crossVectors(side, ax).normalize().negate();
  const at = (y) => T.clone().add(ax.clone().multiplyScalar((y - T.y) / ax.y));
  const blade = [], idx = [];
  const yG = 5.72;
  const stations = [];
  for (let i = 0; i <= 10; i++) stations.push(T.y + 0.35 + (yG - T.y - 0.35) * i / 10);
  const pushRing = (c, hw, ht) => {
    blade.push(...c.clone().add(side.clone().multiplyScalar(-hw)).toArray(), ...c.clone().add(fwd.clone().multiplyScalar(ht)).toArray(), ...c.clone().add(side.clone().multiplyScalar(hw)).toArray(), ...c.clone().add(fwd.clone().multiplyScalar(-ht)).toArray());
  };
  blade.push(...T.toArray());
  stations.forEach((y, i) => pushRing(at(y), 0.13 + 0.035 * (i / 10), 0.035));
  for (let k = 0; k < 4; k++) idx.push(0, 1 + k, 1 + ((k + 1) % 4));
  for (let i = 0; i < stations.length - 1; i++) for (let k = 0; k < 4; k++) {
    const a = 1 + i * 4 + k, b = 1 + i * 4 + ((k + 1) % 4), c = a + 4, d = b + 4;
    idx.push(a, c, b, b, c, d);
  }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(blade, 3)); bg.setIndex(idx);
  const bgn = bg.toNonIndexed(); bgn.computeVertexNormals();
  const parts = [bgn];
  // guarda em cruz com terminais arredondados e medalhão liso
  const gc = at(yG + 0.06);
  const guard = new THREE.CylinderGeometry(0.06, 0.06, 1.15, 16); guard.rotateZ(Math.PI / 2); guard.translate(gc.x, gc.y, gc.z); parts.push(guard.toNonIndexed());
  for (const s of [-1, 1]) { const k = new THREE.SphereGeometry(0.1, 16, 10); k.translate(gc.x + s * 0.6, gc.y, gc.z); parts.push(k.toNonIndexed()); }
  const med = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24); med.rotateX(Math.PI / 2); med.translate(gc.x, gc.y, gc.z + 0.06); parts.push(med.toNonIndexed());
  // empunhadura e pomo
  const gp = at(yG + 0.45);
  const grip = new THREE.CylinderGeometry(0.065, 0.075, 0.75, 14);
  grip.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ax)); grip.translate(gp.x, gp.y, gp.z); parts.push(grip.toNonIndexed());
  const pm = new THREE.SphereGeometry(0.12, 16, 12); const pp = at(6.72); pm.translate(pp.x, pp.y, pp.z); parts.push(pm.toNonIndexed());
  // linhas da espada
  const segs = [];
  const L = [], Rr = [], C = [];
  stations.forEach((y, i) => { const c = at(y); const hw = 0.13 + 0.035 * (i / 10); L.push(c.clone().add(side.clone().multiplyScalar(-hw)).toArray()); Rr.push(c.clone().add(side.clone().multiplyScalar(hw)).toArray()); C.push(c.clone().add(fwd.clone().multiplyScalar(0.036)).toArray()); });
  segs.push(...polyline([T.toArray(), ...L], 1.1), ...polyline([T.toArray(), ...Rr], 1.1), ...polyline([T.toArray(), ...C], 0.6));
  segs.push({ a: [gc.x - 0.6, gc.y + 0.06, gc.z + 0.07], b: [gc.x + 0.6, gc.y + 0.06, gc.z + 0.07], w: 1 }, { a: [gc.x - 0.6, gc.y - 0.06, gc.z + 0.07], b: [gc.x + 0.6, gc.y - 0.06, gc.z + 0.07], w: 1 });
  return { parts, segs };
}

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export async function buildThemis() {
  const root = new THREE.Group(); root.name = 'themis';
  const body = await loadMesh('final');
  const bronze = mat('bronze', { ao: true });
  const mesh = new THREE.Mesh(body, bronze); mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
  const hull = new THREE.Mesh(body, hullMaterial({ width: 1.5 })); root.add(hull);
  // vincos (arestas vivas) da escultura
  const eg = new THREE.EdgesGeometry(body, 48);
  const ep = eg.attributes.position; const csegs = [];
  for (let i = 0; i < ep.count; i += 2) csegs.push({ a: [ep.getX(i), ep.getY(i), ep.getZ(i)], b: [ep.getX(i + 1), ep.getY(i + 1), ep.getZ(i + 1)], w: 0.75 });
  orderBy(csegs, (s) => -s.a[1]);
  const creases = new InkLines(csegs, { seed: 501, span: 0.02 }); root.add(creases);

  // lâminas do cabelo ao vento
  const r = rng(2005);
  const head = new THREE.Vector3(0, 7.95, zc(7.95) + 0.1);
  const blades = [];
  const bladeGroup = new THREE.Group(); root.add(bladeGroup);
  const N = 30;
  for (let i = 0; i < N; i++) {
    const side = i % 2 ? 1 : -1;
    const k = Math.floor(i / 2) / (N / 2 - 1);
    // ângulo no plano da parede: dos lados da cabeça para fora, das mechas caídas às que sobem como chamas
    const a0 = THREE.MathUtils.lerp(-0.95, 1.05, k) + (r() - 0.5) * 0.18;
    const ang = side > 0 ? a0 : Math.PI - a0;
    const len = (1.3 + r() * 0.9) * (side > 0 ? 1.12 : 1.0) * (1 - 0.3 * Math.abs(k - 0.45));
    const { g, segs } = bladeGeometry(len, 0.24 + r() * 0.12, (0.15 + r() * 0.3) * (k > 0.5 ? 1 : -0.6), 900 + i);
    const piv = new THREE.Group();
    const rootPos = head.clone().add(new THREE.Vector3(Math.cos(ang) * 0.42, Math.sin(ang) * 0.32 + 0.12, -0.25 - r() * 0.15));
    piv.position.copy(rootPos);
    piv.rotation.set(0, 0, ang, 'YXZ');
    piv.rotation.y = side > 0 ? -(0.15 + r() * 0.3) : (0.15 + r() * 0.3);
    const inner = new THREE.Group(); inner.rotation.x = (r() - 0.5) * 0.8; inner.rotation.y = -0.1 - r() * 0.2;
    const bm = new THREE.Mesh(g, mat('bronze', { ao: true, side: THREE.DoubleSide, revealGroup: 'bronze' })); bm.castShadow = true;
    inner.add(bm);
    const bl = new InkLines(segs, { seed: 950 + i, span: 0.2 }); inner.add(bl);
    piv.add(inner); bladeGroup.add(piv);
    blades.push({ piv, inner, open: piv.rotation.z, lines: bl, delay: r() });
  }
  // espada (latão polido)
  const sw = swordGeometry();
  const sword = new THREE.Mesh(mergeGeometries(sw.parts.map((g) => { g.deleteAttribute('uv'); return g; })), mat('brass')); sword.castShadow = true; root.add(sword);
  const swordHull = new THREE.Mesh(sword.geometry, hullMaterial({ width: 1.2 })); root.add(swordHull);
  const swordLines = new InkLines(sw.segs, { seed: 777, span: 0.1 }); root.add(swordLines);

  root.userData = { mesh, hull, creases, blades, sword, swordHull, swordLines, head };
  return root;
}

// abre as lâminas uma a uma (0..1)
export function setBlades(th, t) {
  for (const b of th.userData.blades) {
    const local = THREE.MathUtils.clamp((t * 1.6 - b.delay * 0.6), 0, 1);
    const e = 1 - Math.pow(1 - local, 3);
    const s = 0.02 + 0.98 * e;
    b.inner.scale.set(s, 0.4 + 0.6 * e, 0.4 + 0.6 * e);
    b.inner.visible = local > 0;
  }
}

// ---------- estudos (ato 3): variantes achatadas como desenho a grafite ----------
export async function buildStudies() {
  const root = new THREE.Group(); root.name = 'studies';
  const names = ['study0', 'study1', 'study2', 'study3', 'final'];
  const items = [];
  for (let i = 0; i < names.length; i++) {
    const g = await loadMesh(names[i]);
    // achata em profundidade mantendo as normais originais: vira desenho sobre a folha
    const pa = g.attributes.position;
    for (let k = 0; k < pa.count; k++) pa.setZ(k, pa.getZ(k) * 0.008 + 0.02);
    const grp = new THREE.Group(); grp.scale.setScalar(0.5);
    const m = new THREE.Mesh(g, mat('bronze', { ao: true, revealGroup: 'study' + i, unique: true })); // fica como papel (revelação 0)
    const hull = new THREE.Mesh(g, hullMaterial({ width: 1.1, color: 0x3a3632 }));
    grp.add(m, hull);
    // acessórios desenhados: balança nos estudos antigos, espada no último
    const segs = [];
    if (i === 0) segs.push(...scale([-1.15, 6.9, 1.6], 0.95));
    if (i === 1 || i === 2) segs.push(...scale([0.0, 6.2, 1.8], 0.8));
    if (i >= 2) segs.push({ a: [0.15, 6.0, 1.9], b: [0.18, 1.8, 1.7], w: 1.4 }, { a: [-0.45, 5.75, 1.9], b: [0.75, 5.75, 1.9], w: 1.3 });
    if (i === 0) segs.push({ a: [0.95, 4.7, 1.4], b: [1.0, 1.0, 1.3], w: 1.3 }, { a: [0.6, 4.4, 1.4], b: [1.3, 4.45, 1.4], w: 1.2 });
    // linhas de construção (eixo, proporções)
    const guide = [{ a: [0, -0.3, 0.05], b: [0, 9.6, 0.05], w: 0.5 }];
    for (let k = 0; k <= 8; k++) guide.push({ a: [-0.5, k * 1.15, 0.05], b: [0.5, k * 1.15, 0.05], w: 0.4 });
    for (const q of [...segs, ...guide]) { q.a[2] = 0.05; q.b[2] = 0.05; }
    const acc = new InkLines(segs, { color: 0x34302c, seed: 600 + i, wobble: 0.02, subdiv: 0.6 });
    const gl = new InkLines(guide, { color: 0x8a847c, seed: 620 + i, overshoot: 0.3 });
    grp.add(acc, gl);
    if (i >= 3) {
      // lâminas do cabelo desenhadas em traço
      const hs = [];
      const rr = rng(40 + i);
      for (let k = 0; k < (i === 3 ? 9 : 16); k++) {
        const side = k % 2 ? 1 : -1, a = (side > 0 ? 0 : Math.PI) + side * (rr() * 1.4 - 0.3);
        const p0 = [Math.cos(a) * 0.35, 7.95 + Math.sin(a) * 0.3, 1.2];
        const L = 0.7 + rr() * 0.9;
        const p1 = [p0[0] + Math.cos(a) * L * 0.5, p0[1] + Math.sin(a) * L * 0.5 + 0.15, 1.2];
        const p2 = [p0[0] + Math.cos(a) * L, p0[1] + Math.sin(a) * L + 0.35, 1.2];
        hs.push(...polyline([p0, p1, p2], 0.9));
      }
      for (const q of hs) { q.a[2] = 0.05; q.b[2] = 0.05; }
      grp.add(new InkLines(hs, { color: 0x34302c, seed: 640 + i }));
    }
    // folha
    const sheet = new THREE.Group();
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 5.6), paperMat());
    const bs = polyline([[-1.9, -2.8, 0.005], [1.9, -2.8, 0.005], [1.9, 2.8, 0.005], [-1.9, 2.8, 0.005]], 0.7, true);
    sheet.add(sp, new InkLines(bs, { color: 0xb5ada2, seed: 660 + i }));
    root.add(sheet);
    items.push({ grp, mesh: m, hull, acc, gl, sheet });
    root.add(grp);
  }
  root.userData.items = items;
  return root;
}
function scale(c, s) {
  const [x, y, z] = c; const out = [];
  out.push({ a: [x - 0.7 * s, y, z], b: [x + 0.7 * s, y, z], w: 1.2 }, { a: [x, y - 0.15, z], b: [x, y + 0.35, z], w: 1.2 });
  for (const sx of [-1, 1]) {
    const px = x + sx * 0.7 * s, py = y - 0.8 * s;
    out.push({ a: [x + sx * 0.7 * s, y, z], b: [px - 0.28 * s, py, z], w: 0.6 }, { a: [x + sx * 0.7 * s, y, z], b: [px + 0.28 * s, py, z], w: 0.6 });
    const pts = []; for (let k = 0; k <= 8; k++) { const a = Math.PI + k / 8 * Math.PI; pts.push([px + Math.cos(a) * 0.3 * s, py + Math.sin(a) * 0.1 * s, z]); }
    out.push(...polyline(pts, 1.0));
  }
  return out;
}

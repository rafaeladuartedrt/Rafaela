// Pessoas em silhueta chapada (proporção real, 1,55 a 1,90 m), caminhando ou paradas em grupos
// só onde se pode andar (pórtico, calçadas, praça), com sombra projetada no chão pelo sol.
import * as THREE from 'three';
import { G } from './globals.js';
import { B } from './building.js';
import { rng } from './lines.js';

// silhueta de perfil em metros; o pé de apoio em (0,0). Compartilhada pelo corpo e pela sombra.
const SIL = /* glsl */`
float sdCap(vec2 p, vec2 a, vec2 b, float ra, float rb){
  vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  return length(pa - ba * h) - mix(ra, rb, h);
}
float sdEl(vec2 p, vec2 c, vec2 r){ vec2 q = (p - c) / r; return (length(q) - 1.) * min(r.x, r.y); }
vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
// ph fase, mv 0..1 (parado..andando), ht altura, ty 0 homem 1 mulher(saia) 2 sobretudo 3 mochila
float person(vec2 p, float ph, float mv, float ht, float ty){
  float k = ht / 1.75; p /= k;
  float bob = 0.025 * mv * abs(cos(ph));
  vec2 hip = vec2(0.0, 0.93 + bob), sh = vec2(0.035, 1.42 + bob);
  float d = sdEl(p, vec2(0.05, 1.615 + bob), vec2(0.085, 0.108));               // cabeça
  d = min(d, sdCap(p, vec2(0.035, 1.47 + bob), vec2(0.045, 1.54 + bob), 0.05, 0.045)); // pescoço
  d = min(d, sdCap(p, hip, sh, 0.118, 0.128));                                    // tronco
  d = min(d, sdEl(p, vec2(0.05, 1.33 + bob), vec2(0.13, 0.1)));                    // peito/ombro
  // pernas: coxa, canela e pé, em oposição de fase
  for (int i = 0; i < 2; i++) {
    float f = ph + float(i) * 3.14159;
    float th = (0.42 * sin(f)) * mv;
    float kn = (0.08 + 0.55 * max(0., sin(f + 1.7))) * mv;
    vec2 knee = hip + rot(vec2(0., -0.44), th);
    vec2 ank = knee + rot(vec2(0., -0.43), th - kn);
    float lift = max(0., ank.y - 0.06);
    d = min(d, sdCap(p, hip + vec2(0.0, 0.03), knee, 0.085, 0.062));
    d = min(d, sdCap(p, knee, ank, 0.058, 0.038));
    d = min(d, sdCap(p, ank + vec2(-0.03, -0.02), ank + vec2(0.13, -0.05 + lift * 0.2), 0.035, 0.028));
  }
  // braços em oposição às pernas
  for (int i = 0; i < 2; i++) {
    float f = ph + float(i) * 3.14159 + 3.14159;
    float a = 0.35 * sin(f) * mv + 0.04;
    vec2 elb = sh + vec2(-0.01, -0.02) + rot(vec2(0., -0.3), a);
    vec2 hand = elb + rot(vec2(0., -0.27), a + 0.25 + 0.2 * mv * max(0., sin(f)));
    d = min(d, sdCap(p, sh + vec2(0., -0.03), elb, 0.05, 0.042));
    d = min(d, sdCap(p, elb, hand, 0.04, 0.034));
  }
  if (ty > 0.5 && ty < 1.5) d = min(d, sdCap(p, vec2(0.01, 0.95), vec2(0.02, 0.5), 0.12, 0.2));    // saia
  if (ty > 1.5 && ty < 2.5) d = min(d, sdCap(p, vec2(0.03, 1.3), vec2(0.02, 0.55), 0.13, 0.17));   // sobretudo
  if (ty > 2.5) d = min(d, sdEl(p, vec2(-0.13, 1.22 + bob), vec2(0.1, 0.17)));                     // mochila
  return d * k;
}`;

const BODY_V = /* glsl */`
attribute vec3 iPos; attribute vec4 iP; attribute vec3 iCol; // iP: fase, mv, altura, tipo
attribute float iFace;
varying vec2 vL; varying vec4 vP; varying vec3 vCol; varying float vFace;
void main(){
  vec3 right = normalize(vec3(viewMatrix[0][0], 0., viewMatrix[2][0]));
  vec3 wp = iPos + right * position.x + vec3(0., position.y, 0.);
  vL = position.xy; vP = iP; vCol = iCol; vFace = iFace;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
}`;
const BODY_F = /* glsl */`
varying vec2 vL; varying vec4 vP; varying vec3 vCol; varying float vFace;
uniform float uOpacity; uniform vec2 uRes;
${SIL}
void main(){
  vec2 p = vec2(vL.x * vFace, vL.y);
  float d = person(p, vP.x, vP.y, vP.z, vP.w);
  float aa = fwidth(d) * 0.8;
  float a = (1. - smoothstep(-aa, aa, d)) * uOpacity;
  if (a < 0.5) discard;
  gl_FragColor = vec4(vCol, 1.);
}`;
const SHAD_V = /* glsl */`
attribute vec3 iPos; attribute vec4 iP; attribute float iFace;
uniform vec3 uSun; varying vec2 vG; varying vec4 vP; varying float vFace; varying vec3 vW;
void main(){
  vec3 wp = iPos + vec3(position.x, 0., position.y);
  wp.y = -0.055 * wp.x + 0.035;
  vG = position.xy; vP = iP; vFace = iFace; vW = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.);
}`;
const SHAD_F = /* glsl */`
varying vec2 vG; varying vec4 vP; varying float vFace; varying vec3 vW;
uniform vec3 uSun; uniform vec3 uCamR; uniform float uOpacity;
${SIL}
void main(){
  vec2 sd = -normalize(uSun.xz);               // sombra cai para longe do sol
  float along = dot(vG, sd);
  vec2 perp = vec2(-sd.y, sd.x);
  float lat = dot(vG, perp);
  float tanE = uSun.y / length(uSun.xz);
  if (along < -0.25) discard;
  vec2 p = vec2(lat * vFace * sign(dot(perp, uCamR.xz) + 1e-4), max(along, 0.) * tanE);
  float d = person(p, vP.x, vP.y, vP.z, vP.w);
  // contato dos pés mais escuro, borda suaviza com a distância
  float blur = 0.02 + 0.06 * clamp(along / 3., 0., 1.);
  float a = 1. - smoothstep(-blur, blur, d);
  float contact = 1. - smoothstep(0., 0.28, length(vG / vec2(1., 0.6)));
  a = max(a * 0.36, contact * 0.4) * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(0.09, 0.08, 0.08), a);
}`;

function lin(h) { const c = new THREE.Color(h); return [c.r, c.g, c.b]; }
const COLS = [lin(0x2f3033), lin(0x3a3b3e), lin(0x45464a), lin(0x2a2b2e), lin(0x55565a), lin(0x36373a)];
const ORANGE = lin(0xe8783c);

// percursos onde se pode caminhar: [x0, z0, x1, z1] (segmentos), largura lateral
const PATHS = [
  { a: [-22, 8.0], b: [26, 8.0], w: 1.0, n: 9 },     // pórtico leste (entre o térreo e a fila de pilares)
  { a: [-22, -8.0], b: [26, -8.0], w: 1.0, n: 6 },   // pórtico oeste
  { a: [-40, 13.5], b: [52, 13.5], w: 1.6, n: 12 },  // calçada leste
  { a: [-40, -13.8], b: [52, -13.8], w: 1.4, n: 8 }, // calçada oeste
  { a: [29, -22], b: [29, 22], w: 2.0, n: 10 },      // praça diante da empena sul
  { a: [36, -26], b: [36, 26], w: 3.5, n: 12 },
  { a: [23.5, -6], b: [23.5, 6], w: 0.8, n: 5 },     // entrada principal sob a empena
];

export function buildPeople3D() {
  const r = rng(733);
  const people = [];
  for (const P of PATHS) {
    const L = Math.hypot(P.b[0] - P.a[0], P.b[1] - P.a[1]);
    const ux = (P.b[0] - P.a[0]) / L, uz = (P.b[1] - P.a[1]) / L;
    let made = 0;
    while (made < P.n) {
      const group = r() < 0.35 ? 2 + Math.floor(r() * 2) : 1;
      const stand = r() < 0.22;
      const dir = r() < 0.5 ? 1 : -1, sp = stand ? 0 : 1.15 + r() * 0.3;
      const s0 = r() * L, off = (r() - 0.5) * 2 * P.w;
      for (let g = 0; g < group && made < P.n; g++, made++) {
        const h = 1.58 + r() * 0.3;
        people.push({
          a: P.a, u: [ux, uz], L, s0: s0 + g * (stand ? 0.55 : 0.35) * (r() < 0.5 ? 1 : -1), off: off + (g ? (r() - 0.5) * 0.9 : 0),
          dir, sp: sp * (0.97 + 0.06 * r()), ph: r() * 6.28, h, ty: Math.floor(r() * 4) % 4, face: stand ? (g % 2 ? -1 : 1) : dir,
          col: r() < 0.18 ? ORANGE : COLS[Math.floor(r() * COLS.length)],
        });
      }
    }
  }
  const N = people.length;
  const mk = (w, h, ox, oy) => { const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(w, h); q.translate(ox, oy, 0); g.index = q.index; g.setAttribute('position', q.attributes.position); return g; };
  const gb = mk(1.4, 2.1, 0, 1.05);
  const gs = mk(9, 9, 0, 0);
  const attrs = (g) => {
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4));
    g.setAttribute('iCol', new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('iFace', new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
    g.instanceCount = N; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  };
  attrs(gb); attrs(gs);
  const uSun = { value: new THREE.Vector3(0.4, 0.6, -0.5) }, uCamR = { value: new THREE.Vector3(1, 0, 0) }, uOpacity = { value: 1 };
  const body = new THREE.Mesh(gb, new THREE.ShaderMaterial({ vertexShader: BODY_V, fragmentShader: BODY_F, uniforms: { uOpacity, uRes: G.uRes }, extensions: { derivatives: true } }));
  const shad = new THREE.Mesh(gs, new THREE.ShaderMaterial({ vertexShader: SHAD_V, fragmentShader: SHAD_F, uniforms: { uSun, uCamR, uOpacity }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  body.frustumCulled = shad.frustumCulled = false;
  body.renderOrder = 6; shad.renderOrder = 4;
  const root = new THREE.Group(); root.add(shad, body);
  root.userData = { people, body, shad, uSun, uCamR, uOpacity };
  return root;
}

// t em segundos; sun = direção para o sol; cam = câmera
export function updatePeople3D(root, t, sun, cam, opacity = 1) {
  const { people, body, shad, uSun, uCamR, uOpacity } = root.userData;
  uSun.value.copy(sun).normalize(); uOpacity.value = opacity;
  const camR = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0); camR.y = 0; camR.normalize(); uCamR.value.copy(camR);
  for (const g of [body.geometry, shad.geometry]) {
    const P = g.attributes.iPos, Q = g.attributes.iP, C = g.attributes.iCol, F = g.attributes.iFace;
    people.forEach((p, i) => {
      let s = (p.s0 + p.dir * p.sp * t) % p.L; if (s < 0) s += p.L;
      const x = p.a[0] + p.u[0] * s - p.u[1] * p.off, z = p.a[1] + p.u[1] * s + p.u[0] * p.off;
      P.setXYZ(i, x, B.ground(x), z);
      const wd = new THREE.Vector3(p.u[0] * p.dir, 0, p.u[1] * p.dir);
      const side = wd.dot(camR);
      const face = p.sp > 0 ? (side >= 0 ? 1 : -1) : p.face;
      const mv = p.sp > 0 ? Math.max(0.35, Math.abs(side)) : 0;
      Q.setXYZ(i, 0, 0, 0); Q.setXYZW(i, p.ph + t * p.sp * 5.6, mv, p.h, p.ty);
      C.setXYZ(i, ...p.col); F.setX(i, face);
      // some suavemente perto das pontas do percurso para não "pipocar"
    });
    P.needsUpdate = Q.needsUpdate = C.needsUpdate = F.needsUpdate = true;
  }
}

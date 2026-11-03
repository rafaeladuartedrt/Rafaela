// Ponto de entrada: monta a cena, expõe window.renderFrame(f) para o render determinístico.
import * as THREE from 'three';
import { G } from './globals.js';
import { Post } from './post.js';
import { buildBuilding, buildContext, buildPeople } from './building.js';
import { buildThemis, buildStudies } from './themis.js';
import { buildSection, buildHall, buildSheet } from './scenes.js';
import { evaluate, FPS, DURATION } from './timeline.js';

const q = new URLSearchParams(location.search);
const W = +(q.get('w') || 540), H = +(q.get('h') || 960);

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(G.uPaper.value, 1);
G.uRes.value.set(W, H); G.uPx.value = H / 1920;

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(40, W / H, 0.3, 2000);

// luz
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x8a7f70, 0.9); scene.add(hemi);

// mapas de ambiente (céu para os reflexos do vidro e do granito polido)
function skyEnv(top, hor, gnd) {
  const s = new THREE.Scene();
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(hor) }, gnd: { value: new THREE.Color(gnd) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 top, hor, gnd; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec3 d = normalize(vP); float y = d.y;
        vec3 c = y > 0. ? mix(hor, top, pow(y, .55)) : mix(hor * .8, gnd, pow(-y, .4));
        float cl = smoothstep(.55, .8, sin(d.x * 7. + sin(d.z * 5.) * 2.) * .5 + .5) * smoothstep(0., .25, y) * (1. - smoothstep(.5, .9, y));
        c = mix(c, vec3(1.), cl * .35);
        // silhuetas de prédios no horizonte para o reflexo
        float sk = step(y, .06 + .05 * step(.5, fract(atan(d.z, d.x) * 6.)) + .03 * fract(atan(d.z, d.x) * 17.)) * step(-.02, y);
        c = mix(c, hor * .55, sk * .7);
        gl_FragColor = vec4(c, 1.); }`,
  });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), m));
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.02);
  return rt.texture;
}
const env = {
  day: skyEnv(new THREE.Color(0.33, 0.47, 0.68), new THREE.Color(0.85, 0.85, 0.82), new THREE.Color(0.25, 0.24, 0.22)),
  gold: skyEnv(new THREE.Color(0.30, 0.38, 0.6), new THREE.Color(1.0, 0.72, 0.45), new THREE.Color(0.25, 0.2, 0.17)),
};
scene.environment = env.day;

const post = new Post(renderer, W, H);
const ctx = { THREE, scene, cam, sun, hemi, renderer, post, env, W, H };

async function init() {
  const bld = buildBuilding(); scene.add(bld.root);
  const context = buildContext(); scene.add(context);
  const people = buildPeople(); scene.add(people);
  const themis = await buildThemis(); scene.add(themis);
  const studies = await buildStudies(); scene.add(studies);
  const section = buildSection(); scene.add(section);
  const hall = buildHall(); scene.add(hall);
  const sheet = buildSheet(); scene.add(sheet);
  Object.assign(ctx, { bld, context, people, themis, studies, section, hall, sheet });
  // compila todos os programas uma vez
  renderer.compile(scene, cam);
  window.__ready = true;
}

window.renderFrame = (f) => {
  const t = Math.min(f / FPS, DURATION - 1e-4);
  G.uTime.value = t; post.u.uFrame.value = f;
  const ev = evaluate(t);
  const u = post.u;
  const pa = ev.a.shot.apply(ctx, ev.a.tl, ev.a.tg); cull();
  renderer.setRenderTarget(post.rtA); renderer.clear(); renderer.render(scene, cam);
  setPost(pa, 'A');
  if (ev.b) {
    const pb = ev.b.shot.apply(ctx, ev.b.tl, ev.b.tg); cull();
    renderer.setRenderTarget(post.rtB); renderer.clear(); renderer.render(scene, cam);
    setPost(pb, 'B');
    u.uTrans.value = ev.trans.type; u.uTransT.value = ev.trans.t; u.uTransC.value.set(...(ev.trans.c || [0.5, 0.5]));
  } else u.uTrans.value = 0;
  const g = pa.global || {};
  u.uPaperAmt.value = g.paperAmt ?? 1; u.uRake.value = g.rake ?? 0; u.uLight.value.set(...(g.light || [0.7, 0.7]));
  u.uWhite.value = g.white ?? 0; u.uVig.value = g.vig ?? 0.28; u.uExposure.value = g.exposure ?? 1; u.uWarm.value = g.warm ?? 0;
  post.render();
};
function cull() { if (ctx.context.visible && cam.userData.tgt) ctx.context.userData.cull(cam.position, cam.userData.tgt); }
function setPost(p, k) {
  const u = post.u;
  u['uCam' + k].value.set(p.near ?? cam.near, p.far ?? cam.far, p.focus ?? 10, p.aperture ?? 0);
  u['uMB' + k].value.set(...(p.mb || [0, 0]));
  u['uPaper' + k].value.set(...(p.paper || [0, 0, 1, 1]));
  u['uSky' + k].value.set(...(p.sky || [0, 0, 0]));
}

window.__W = W; window.__H = H;
init().catch((e) => { console.error(e); window.__error = String(e.stack || e); });

// Materiais físicos com injeção de: (1) papel + hachura enquanto a superfície ainda é traço,
// (2) revelação por mancha de aquarela (máscara de ruído animada), (3) texturas procedurais.
import * as THREE from 'three';
import { G } from './globals.js';
import { NOISE } from './glsl.js';

export const REVEAL = {};   // uniforms de revelação por tipo de material
function revealUniforms(kind) {
  if (!REVEAL[kind]) REVEAL[kind] = {
    uReveal: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uRadius: { value: 60 },
    uMode: { value: 0 }, uDir: { value: new THREE.Vector3(0, -1, 0) }, uNAmp: { value: 0.5 },
    uNFreq: { value: 0.12 }, uStretch: { value: 1 }, uPatina: { value: 1 }, uHatchOn: { value: 1 },
    uShadeRef: { value: 1.0 },
  };
  return REVEAL[kind];
}

const PROC = {
  granite: `
    vec2 puv = abs(vWN.x) > .5 ? vWPos.zy : (abs(vWN.z) > .5 ? vWPos.xy : vWPos.xz);
    float RP = 4.45; float yy = mod(puv.y, RP); float rb = floor(puv.y / RP) * 4.;
    float ri, r0, rh;
    if (yy < 1.4) { ri = 0.; r0 = 0.; rh = 1.4; } else if (yy < 1.85) { ri = 1.; r0 = 1.4; rh = .45; } else if (yy < 3.15) { ri = 2.; r0 = 1.85; rh = 1.3; } else { ri = 3.; r0 = 3.15; rh = 1.3; }
    float rowk = rb + ri;
    float cw = ri == 1. ? 2.1 : 1.2;
    float off = fract(rowk * 0.618034) * cw;
    float qx = (puv.x + off) / cw;
    vec2 id = vec2(floor(qx), rowk); float fx = fract(qx);
    float joint = min(min(fx, 1. - fx) * cw, min(yy - r0, r0 + rh - yy));
    float tone = hash12(id * 1.7 + 3.1);
    float speck = vnoise3(vWPos * 38.) * .6 + vnoise3(vWPos * 9.) * .4;
    vec3 base = vec3(.40, .41, .43) * (0.9 + 0.16 * tone) * (0.9 + 0.2 * speck);
    base *= 1. - 0.45 * (1. - smoothstep(0.004, 0.018, joint));
    diffuseColor.rgb = base;`,
  travertine: `
    float v = fbm3(vWPos * vec3(0.9, 6.0, 0.9));
    float pores = smoothstep(.72, .78, vnoise3(vWPos * vec3(14., 40., 14.)));
    float rings = smoothstep(0.0, 0.02, abs(fract(vWPos.y / 1.2) - 0.5) * 1.2 - 0.585);
    vec3 base = mix(vec3(.66, .58, .45), vec3(.80, .74, .62), v);
    base *= 1. - .25 * pores; base *= 1. - .25 * (1.-smoothstep(0.,.006,abs(fract(vWPos.y/1.2)-.5)-.494));
    diffuseColor.rgb = base;`,
  blackgranite: `
    float s = vnoise3(vWPos * 30.);
    diffuseColor.rgb = vec3(.018, .018, .02) * (0.8 + 0.5 * s);`,
  glass: `
    diffuseColor.rgb = vec3(.035, .045, .05);`,
  concrete: `
    float s = fbm3(vWPos * 1.3) * .6 + vnoise3(vWPos * 25.) * .4;
    diffuseColor.rgb = vec3(.47, .46, .43) * (0.85 + 0.25 * s);`,
  relief: `
    float s = fbm3(vWPos * 2.3) * .6 + vnoise3(vWPos * 30.) * .4;
    diffuseColor.rgb = vec3(.52, .5, .46) * (0.8 + 0.3 * s);`,
  alu: `
    diffuseColor.rgb = vec3(.70, .71, .72);`,
  mullion: `
    diffuseColor.rgb = vec3(.16, .17, .18);`,
  redgranite: `
    float s = vnoise3(vWPos * 28.) * .6 + vnoise3(vWPos * 6.) * .4;
    diffuseColor.rgb = vec3(.36, .19, .15) * (0.8 + 0.4 * s);`,
  pave: `
    float w = sin(vWPos.x * 1.5 + sin(vWPos.z * 0.9 + vWPos.x * 0.25) * 2.2);
    float stone = vnoise2(vWPos.xz * 9.);
    vec2 cs = fract(vWPos.xz * 9.); float gap = smoothstep(0., .12, min(min(cs.x, 1.-cs.x), min(cs.y, 1.-cs.y)));
    vec3 white = vec3(.70, .68, .63), black = vec3(.07, .07, .07);
    vec3 base = mix(white, black, smoothstep(.83, .88, w));
    base *= (0.85 + 0.2 * stone) * (0.75 + 0.25 * gap);
    diffuseColor.rgb = base;`,
  asphalt: `
    diffuseColor.rgb = vec3(.09, .09, .095) * (0.85 + 0.3 * vnoise3(vWPos * 6.));`,
  bronze: `
    float pn = fbm3(vWPos * vec3(2.4, 0.8, 2.4));
    float streak = vnoise3(vWPos * vec3(11., 0.9, 11.));
    vec3 bronzeC = vec3(.30, .16, .07);
    vec3 patinaC = mix(vec3(.06, .16, .14), vec3(.15, .34, .29), smoothstep(.3, .8, pn));
    vec3 darkC = vec3(.035, .045, .035);
    float pat = clamp(uPatina * (0.45 + 0.75 * pn - 0.3 * streak), 0., 1.);
    vec3 c = mix(bronzeC, patinaC, pat);
    c = mix(c, darkC, clamp((1. - vAO) * 1.25, 0., 1.) * (0.4 + 0.6 * uPatina));
    diffuseColor.rgb = c;`,
  brass: `
    diffuseColor.rgb = vec3(.86, .62, .24) * (0.92 + 0.12 * vnoise3(vWPos * 20.));`,
  paper: `
    diffuseColor.rgb = vec3(.86, .82, .74);`,
  neutral: ``,
};

const PARAMS = {
  granite: { roughness: 0.82, metalness: 0 },
  travertine: { roughness: 0.75, metalness: 0 },
  blackgranite: { roughness: 0.12, metalness: 0.0, envMapIntensity: 1.6 },
  glass: { roughness: 0.04, metalness: 0.95, envMapIntensity: 1.25 },
  concrete: { roughness: 0.9, metalness: 0 },
  relief: { roughness: 0.92, metalness: 0 },
  alu: { roughness: 0.35, metalness: 0.75 },
  mullion: { roughness: 0.4, metalness: 0.6 },
  redgranite: { roughness: 0.7, metalness: 0 },
  pave: { roughness: 0.95, metalness: 0 },
  asphalt: { roughness: 0.95, metalness: 0 },
  bronze: { roughness: 0.42, metalness: 0.45 },
  brass: { roughness: 0.22, metalness: 1.0, envMapIntensity: 1.4 },
  paper: { roughness: 1, metalness: 0 },
  neutral: { roughness: 0.8, metalness: 0 },
};

const cache = {};
export function mat(kind, opts = {}) {
  const key = kind + JSON.stringify(opts);
  if (cache[key] && !opts.unique) return cache[key];
  const U = revealUniforms(opts.revealGroup || kind);
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, ...PARAMS[kind], side: opts.side ?? THREE.FrontSide });
  m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 2;
  const useAO = !!opts.ao;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { uPaper: G.uPaper, uInk: G.uInk, uHatch: G.uHatch, uPx: G.uPx, uHatchScale: G.uHatchScale });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos; varying vec3 vWN; ${useAO ? 'attribute float ao; varying float vAO;' : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); ${useAO ? 'vAO = ao;' : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWN; ${useAO ? 'varying float vAO;' : 'const float vAO = 1.0;'}
        uniform float uReveal; uniform vec3 uOrigin; uniform float uRadius; uniform float uMode; uniform vec3 uDir;
        uniform float uNAmp; uniform float uNFreq; uniform float uStretch; uniform float uPatina; uniform float uHatchOn; uniform float uShadeRef;
        uniform vec3 uPaper; uniform vec3 uInk; uniform float uHatch; uniform float uPx; uniform float uHatchScale;
        ${NOISE}
        float hatchL(vec2 p, float ang, float sp, float th){
          vec2 d = vec2(cos(ang), sin(ang));
          float v = dot(p, d) / sp + 0.35 * vnoise2(p * 0.018);
          float dist = abs(fract(v) - 0.5);
          return 1. - smoothstep(th, th + 0.12, dist);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${PROC[kind]}`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        {
          vec3 lit = gl_FragColor.rgb;
          float la = max(dot(diffuseColor.rgb, vec3(.299,.587,.114)), 0.02);
          float shade = clamp(dot(lit, vec3(.299,.587,.114)) / (la * uShadeRef), 0., 1.);
          float dark = 1. - shade;
          vec2 fp = gl_FragCoord.xy / (uPx * uHatchScale);
          float h = 0.;
          dark = max(dark, (1. - smoothstep(0.02, 0.2, la)) * 0.62);
          h = max(h, hatchL(fp, 0.785, 8.0, 0.08) * smoothstep(0.42, 0.52, dark));
          h = max(h, hatchL(fp, 2.36, 8.0, 0.07) * smoothstep(0.66, 0.76, dark));
          h = max(h, hatchL(fp, 0.2, 5.0, 0.08) * smoothstep(0.88, 0.96, dark));
          vec3 paperC = mix(uPaper, uInk, h * uHatch * uHatchOn * 0.85);
          float f = uMode < .5 ? length(vWPos - uOrigin) / uRadius : dot(vWPos - uOrigin, uDir) / uRadius;
          float n = fbm3(vWPos * uNFreq * vec3(1., uStretch, 1.));
          f += (n - 0.5) * uNAmp;
          float v = (uReveal * (1. + uNAmp + 0.1) - 0.5 * uNAmp - 0.05 - f) * uRadius;
          v += (fbm3(vWPos * 1.9 + 3.) - 0.5) * 0.9 + (vnoise3(vWPos * 7.) - 0.5) * 0.18;
          float m = smoothstep(0., 0.06, v);
          float ring = smoothstep(0., 0.05, v) * (1. - smoothstep(0.05, 0.45, v));
          vec3 col = lit * (0.95 + 0.1 * fbm3(vWPos * 0.4 + 7.)) * (1. - 0.38 * ring);
          gl_FragColor.rgb = mix(paperC, col, m);
        }`);
  };
  m.customProgramCacheKey = () => kind + (useAO ? 'ao' : '');
  cache[key] = m;
  return m;
}

// material de papel puro (folhas, chão de papel): fica sempre "papel", com hachura opcional
export function paperMat(opts = {}) {
  const m = new THREE.MeshBasicMaterial({ color: G.uPaper.value, side: THREE.DoubleSide });
  m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 2;
  if (opts.tint) m.color = new THREE.Color(opts.tint);
  return m;
}

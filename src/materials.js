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
  granite: `diffuseColor.rgb = vec3(0.6592, 0.6253, 0.5732);`,
  travertine: `diffuseColor.rgb = vec3(0.8913, 0.6524, 0.4423);`,
  blackgranite: `diffuseColor.rgb = vec3(0.0446, 0.0430, 0.0546);`,
  glass: `diffuseColor.rgb = vec3(0.8751, 0.1975, 0.0231);`,
  concrete: `diffuseColor.rgb = vec3(0.6187, 0.5732, 0.5114);`,
  relief: `diffuseColor.rgb = vec3(0.2158, 0.3686, 0.3787);`,
  alu: `diffuseColor.rgb = vec3(0.2158, 0.3686, 0.3787);`,
  mullion: `diffuseColor.rgb = vec3(0.0303, 0.0316, 0.0385);`,
  redgranite: `diffuseColor.rgb = vec3(0.8122, 0.0564, 0.2801);`,
  pave: `diffuseColor.rgb = vec3(0.8832, 0.8122, 0.6800);`,
  asphalt: `diffuseColor.rgb = vec3(0.6524, 0.6121, 0.5480);`,
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
  brass: `diffuseColor.rgb = vec3(0.8122, 0.1905, 0.0415);`,
  paper: `diffuseColor.rgb = vec3(0.8832, 0.8122, 0.6800);`,
  neutral: `diffuseColor.rgb = vec3(0.7012, 0.6661, 0.5989);`,
};

const PARAMS = {
  granite: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  travertine: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  blackgranite: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  glass: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  concrete: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  relief: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  alu: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  mullion: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  redgranite: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  pave: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  asphalt: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  bronze: { roughness: 0.42, metalness: 0.45 },
  brass: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  paper: { roughness: 1, metalness: 0, envMapIntensity: 0 },
  neutral: { roughness: 1, metalness: 0, envMapIntensity: 0 },
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
          vec3 paperC = mix(uPaper, uInk, h * uHatch * uHatchOn * 0.5);
          float f = uMode < .5 ? length(vWPos - uOrigin) / uRadius : dot(vWPos - uOrigin, uDir) / uRadius;
          float n = fbm3(vWPos * uNFreq * vec3(1., uStretch, 1.));
          f += (n - 0.5) * uNAmp;
          float v = (uReveal * (1. + uNAmp + 0.1) - 0.5 * uNAmp - 0.05 - f) * uRadius;
          v += (fbm3(vWPos * 1.9 + 3.) - 0.5) * 0.9 + (vnoise3(vWPos * 7.) - 0.5) * 0.18;
          // aquarela suave: mancha de borda macia, sem contorno escuro; papel aparece por baixo
          float m = smoothstep(0., 1.6, v);
          float ring = 0.;
          float gran = fbm3(vWPos * 0.9 + 4.) * .6 + vnoise3(vWPos * 6.) * .4;
          float band = mix(0.86, 1.0, smoothstep(0.3, 0.6, shade));
          vec3 tone = diffuseColor.rgb * band;
          float dens = 0.72 + 0.28 * gran;
          vec3 col = mix(uPaper, tone, dens);
          gl_FragColor.rgb = mix(mix(paperC, uPaper, 0.0), col, m);
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

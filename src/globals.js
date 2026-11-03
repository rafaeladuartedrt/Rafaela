import * as THREE from 'three';
// Uniforms globais compartilhados por todos os shaders
export const G = {
  uRes: { value: new THREE.Vector2(1080, 1920) },
  uPx: { value: 1 },                 // escala de pixel (1 em 1080x1920)
  uPaper: { value: new THREE.Color(0xf3ede0) },
  uInk: { value: new THREE.Color(0x141210) },
  uHatch: { value: 0 },              // intensidade da hachura nas faces ainda em traço
  uHatchScale: { value: 1 },
  uTime: { value: 0 },
};
export const PAPER = new THREE.Color(0xf3ede0);

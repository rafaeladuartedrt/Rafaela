/** Roteiro (segundos). Frames = segundos * fps; tudo escala para 60 fps sem mudar. */
export const SCENES = {
  s0_respiro: [0, 3],
  s1_jornalismo: [3, 8],
  s2_judiciario: [8, 13],
  s3_cotidiano: [13, 17],
  s4_inovacao: [17, 21],
  s5_trofeu: [21, 26],
  s6_logo: [26, 30],
} as const;

/** janelas em que o troféu e o logo estão no estado final, íntegros */
export const TROPHY_HOLD: [number, number] = [24.7, 25.8];
export const LOGO_HOLD: [number, number] = [27.95, 29.5];

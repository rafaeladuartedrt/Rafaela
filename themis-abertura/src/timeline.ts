/** Roteiro (segundos). Frames = segundos * fps; tudo escala para 60 fps sem mudar.
 *  As cenas se sobrepõem nas transições: cada uma sai revelando a seguinte por baixo. */
export const SCENES = {
  s0_respiro: [0, 3], // seda-tecido, feixe, poeira, linha verde se desenhando
  s1_jornalismo: [3, 7.75], // mosaico fotos 1/2/4 -> destaque JORNALISMO -> varredura
  s2_judiciario: [7.15, 12.8], // mosaico de matérias + TJRS (bloco) -> destaque JUDICIÁRIO -> varredura
  s3_cotidiano: [12.2, 17.2], // fotos 3 e 5 em blocos grandes, lentos; COTIDIANO e IMAGEM nos blocos
  s4_inovacao: [16.4, 21.3], // mosaico rápido IA/inovação; INOVAÇÃO e NOTÍCIA nos blocos; padrão NOTÍCIA
  s5_trofeu: [21, 26.9], // rim light -> spot -> especular -> hold 100% -> recuo
  s6_logo: [26.3, 30], // linhas do centro p/ fora -> textos -> hold -> dissolve na seda
} as const;

/** janelas em que o troféu e o logo estão no estado final, íntegros */
export const TROPHY_HOLD: [number, number] = [24.7, 25.8];
export const LOGO_HOLD: [number, number] = [27.95, 29.5];

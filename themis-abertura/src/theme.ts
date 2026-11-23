/**
 * Cores amostradas dos arquivos originais (não estimadas):
 * - GRAY: fundo do PDF do telão, operador `0.157 0.157 0.157 rg` => #282828
 * - GREEN: silhueta do troféu, operador `0.69 0.831 0.125 rg` => #B0D420
 *   (conferido no raster: 1.054.903 px com RGB 176,212,32)
 */
export const C = {
  gray: '#282828',
  grayDeep: '#1C1C1C',
  grayMid: '#3A3A3A',
  green: '#B0D420',
  greenRGB: '176,212,32',
  white: '#F2F2EE',
  whiteRGB: '242,242,238',
} as const;

export const FONT = {
  family: 'Montserrat',
  black: 900,
  extraBold: 800,
  light: 300,
  trackingWord: '0.04em', // +40
  trackingSupport: '0.2em', // +200
} as const;

/** As 7 palavras-destaque, grafia exata (NOTÍCIAS e IMAGENS no plural, a pedido). */
export const WORDS = {
  jornalismo: 'JORNALISMO',
  judiciario: 'JUDICIÁRIO',
  cotidiano: 'COTIDIANO',
  inovacao: 'INOVAÇÃO',
  tjrs: 'TJRS',
  noticia: 'NOTÍCIAS',
  imagem: 'IMAGENS',
} as const;

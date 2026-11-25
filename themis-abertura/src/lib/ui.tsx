import React from 'react';
import { Img } from 'remotion';
import { C, FONT } from '../theme';
import { useU } from './units';

/** Palavra-destaque: Montserrat Black, caixa-alta, tracking +40. */
export const Word: React.FC<{
  children: React.ReactNode; size: number; color?: string; weight?: number; tracking?: string;
  style?: React.CSSProperties;
}> = ({ children, size, color = C.white, weight = FONT.black, tracking = FONT.trackingWord, style }) => {
  const u = useU();
  return (
    <div style={{
      fontFamily: FONT.family, fontWeight: weight, fontSize: u(size), lineHeight: 1.18,
      letterSpacing: tracking, color, whiteSpace: 'nowrap', textTransform: 'uppercase',
      // compensa o tracking do último caractere para o centro óptico ficar correto
      marginRight: `-${tracking}`, ...style,
    }}>{children}</div>
  );
};

/** Foto P&B graduada, enquadrada em "cover" numa caixa, com deriva interna. */
export const Photo: React.FC<{
  src: string; iw: number; ih: number; w: number; h: number; scale?: number;
  dx?: number; dy?: number; fx?: number; fy?: number; style?: React.CSSProperties;
}> = ({ src, iw, ih, w, h, scale = 1, dx = 0, dy = 0, fx = 0.5, fy = 0.5, style }) => {
  const u = useU();
  const k = Math.max(w / iw, h / ih) * scale;
  const dw = iw * k, dh = ih * k;
  const left = (w - dw) * fx + dx, top = (h - dh) * fy + dy;
  return (
    <div style={{ position: 'absolute', width: u(w), height: u(h), overflow: 'hidden', ...style }}>
      <Img src={src} style={{ position: 'absolute', left: u(left), top: u(top), width: u(dw), height: u(dh), maxWidth: 'none' }} />
    </div>
  );
};

/** Recorte de jornal físico: papel com sombra projetada coerente com a luz (alto-esquerda). */
export const Clipping: React.FC<{
  src: string; w: number; h: number; scale: number; cx: number; cy: number; rot: number;
  lift?: number; opacity?: number; blur?: number;
}> = ({ src, w, h, scale, cx, cy, rot, lift = 0, opacity = 1, blur = 0 }) => {
  const u = useU();
  const W = w * scale, H = h * scale;
  // lift 0 = pousado na mesa; 1 = alto (sombra larga, difusa e deslocada)
  const ox = 14 + 70 * lift, oy = 22 + 110 * lift, b = 30 + 120 * lift, a = 0.55 - 0.3 * lift;
  return (
    <div style={{
      position: 'absolute', left: u(cx - W / 2), top: u(cy - H / 2), width: u(W), height: u(H),
      transform: `rotate(${rot}deg) scale(${1 + lift * 0.5})`, opacity,
      boxShadow: `${u(ox)}px ${u(oy)}px ${u(b)}px rgba(0,0,0,${a}), ${u(2)}px ${u(3)}px ${u(5)}px rgba(0,0,0,.35)`,
      filter: blur > 0.05 ? `blur(${u(blur)}px)` : undefined,
    }}>
      <Img src={src} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
};

/** Máscara de exclusão: tira o ativo (alfa) da camada de pós (grão/feixe/vinheta). */
export const excludeMask = (url: string, x: number, y: number, w: number, h: number): React.CSSProperties => ({
  WebkitMaskImage: `url(${url}), linear-gradient(#000,#000)`,
  maskImage: `url(${url}), linear-gradient(#000,#000)`,
  WebkitMaskSize: `${w}px ${h}px, 100% 100%`, maskSize: `${w}px ${h}px, 100% 100%`,
  WebkitMaskPosition: `${x}px ${y}px, 0 0`, maskPosition: `${x}px ${y}px, 0 0`,
  WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
  WebkitMaskComposite: 'xor', maskComposite: 'exclude',
} as React.CSSProperties);

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, WORDS } from '../theme';
import { E, lerp, phase, seg, useT } from '../lib/time';
import { asset, useU } from '../lib/units';
import { Photo, Word } from '../lib/ui';

/**
 * 0:13–0:17 COTIDIANO + IMAGEM. Momento emocional: ritmo desacelera.
 * Foto 2 em tela cheia com Ken Burns lento; anel verde abre como íris e mostra a
 * foto 3 (luto) por dentro. Sem texto sobre rostos; sem zoom forçado.
 */
const IRIS = { cx: 2380, cy: 780, r: 520 };

export const S3Cotidiano: React.FC = () => {
  const t = useT();
  const u = useU();
  if (t < 12.7 || t > 17.75) return null;
  const fadeIn = seg(t, 12.75, 13.45, E.soft);
  const kb = seg(t, 12.75, 17.6, E.soft);
  const open = seg(t, 13.95, 14.95, E.out);
  const full = seg(t, 16.75, 17.4, E.in);
  const r = lerp(0, IRIS.r, open) * (1 + 0.012 * Math.sin(phase(t, 4))) + full * 3800;
  const imagem = Math.min(seg(t, 14.45, 15.1, E.out), 1 - seg(t, 15.55, 15.95, E.soft));
  const bandIn = seg(t, 15.7, 16.2, E.main);
  const cot = seg(t, 15.9, 16.6, E.soft);
  const bandOut = 1 - seg(t, 16.8, 17.15, E.soft);
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <Photo src={asset('foto2_bw.jpg')} iw={3000} ih={2000} w={3500} h={2000}
        scale={lerp(1.0, 1.05, kb)} fx={0.42} fy={0.45} dx={lerp(0, -40, kb)} />
      {r > 1 && (
        <>
          <AbsoluteFill style={{ clipPath: `circle(${u(r)}px at ${u(IRIS.cx)}px ${u(IRIS.cy)}px)` }}>
            {/* foto 3: rosto do jovem próximo ao centro da íris; movimento mínimo */}
            <div style={{ position: 'absolute', left: 0, top: u(-199), width: u(4025), height: u(2683),
              transform: `scale(${1 + 0.025 * kb})`, transformOrigin: `${u(2214)}px ${u(979)}px` }}>
              <Photo src={asset('foto3_bw.jpg')} iw={2855} ih={1903} w={4025} h={2683} />
            </div>
          </AbsoluteFill>
          {/* anel verde */}
          <div style={{
            position: 'absolute', left: u(IRIS.cx - r), top: u(IRIS.cy - r), width: u(2 * r), height: u(2 * r),
            borderRadius: '50%', border: `${u(22)}px solid ${C.green}`, boxSizing: 'border-box',
            boxShadow: `0 0 ${u(40)}px rgba(${C.greenRGB},.45)`, opacity: 1 - full,
          }} />
        </>
      )}
      {/* IMAGEM: junto à íris, logo abaixo dela (fora de qualquer rosto) */}
      <div style={{ position: 'absolute', left: u(IRIS.cx + 60 - 1000), width: u(2000), top: u(1360), display: 'flex', justifyContent: 'center',
        opacity: imagem, transform: `translateY(${u(30) * (1 - imagem)}px)` }}>
        <Word size={270} color={C.white}>{WORDS.imagem}</Word>
      </div>
      {/* faixa inferior: COTIDIANO */}
      <div style={{ position: 'absolute', left: 0, top: u(1430), width: u(3500), height: u(300), opacity: bandOut,
        background: 'rgba(28,28,28,.74)', transform: `scaleX(${bandIn})`, transformOrigin: 'left center' }} />
      <div style={{ position: 'absolute', left: u(400), top: u(1430), height: u(300), display: 'flex', alignItems: 'center', opacity: bandOut,
        clipPath: `inset(0 ${(1 - cot) * 100}% 0 0)` }}>
        <Word size={270} color={C.white}>{WORDS.cotidiano}</Word>
        <div style={{ width: u(36), height: u(190), background: C.green, marginLeft: u(60) }} />
      </div>
    </AbsoluteFill>
  );
};

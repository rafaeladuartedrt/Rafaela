import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT, WORDS } from '../theme';
import { E, lerp, seg, useT } from '../lib/time';
import { asset, useU } from '../lib/units';
import { Photo, Word } from '../lib/ui';
import { MotionBlur } from '../lib/MotionBlur';

/**
 * 0:03–0:08 JORNALISMO (ref. A): a linha abre em grid, fotos 1/2/4 entram em blocos
 * com barras verdes deslizando; push-in lento; bloco verde central cresce e revela
 * a palavra, que escala e sai por varredura.
 */
const Tile: React.FC<{
  x: number; y: number; w: number; h: number; p: number; from: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
}> = ({ x, y, w, h, p, from, children }) => {
  const u = useU();
  const r = (1 - p) * 100;
  const inset = { top: `0 0 ${r}% 0`, bottom: `${r}% 0 0 0`, right: `0 0 0 ${r}%`, left: `0 ${r}% 0 0` }[from];
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: u(x), top: u(y), width: u(w), height: u(h), clipPath: `inset(${inset})`, overflow: 'hidden' }}>
      {children}
    </div>
  );
};

const Mosaic: React.FC = () => {
  const t = useT();
  const u = useU();
  // grid: a linha central (y=1000, 2800 px) se divide nas linhas do grid
  const g = seg(t, 3.0, 3.5, E.main);
  const gridOut = 1 - seg(t, 4.3, 4.7, E.soft);
  const hy1 = lerp(1000, 667, g), hy2 = lerp(1000, 1333, g);
  const hw = lerp(2800, 3500, g);
  const vh = 2000 * seg(t, 3.15, 3.6, E.main);
  const line = (s: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', background: C.green, opacity: gridOut,
    boxShadow: `0 0 ${u(18)}px rgba(${C.greenRGB},.6)`, ...s,
  });
  const pA = seg(t, 3.35, 3.95), pB = seg(t, 3.5, 4.1), pC = seg(t, 3.7, 4.7, E.soft);
  const pD = seg(t, 3.9, 4.35), pE = seg(t, 4.0, 4.45);
  return (
    <AbsoluteFill>
      {/* A: operação policial */}
      <Tile x={0} y={0} w={1750} h={667} p={pA} from="top">
        <Photo src={asset('foto1_bw.jpg')} iw={1478} ih={985} w={1750} h={667} scale={1.0} fx={0.08} fy={0.3} dx={-30 + 60 * seg(t, 3.3, 7.8, E.soft)} />
      </Tile>
      {/* B: Foro de Canoas */}
      <Tile x={1750} y={0} w={1750} h={1333} p={pB} from="right">
        <Photo src={asset('foto2_bw.jpg')} iw={3000} ih={2000} w={1750} h={1333} scale={1.05} fx={0.3} dy={-20 + 40 * seg(t, 3.3, 7.8, E.soft)} />
      </Tile>
      {/* C: criança / enchente — entrada lenta e respeitosa, sem zoom */}
      <Tile x={0} y={667} w={1750} h={1333} p={pC} from="bottom">
        <div style={{ opacity: pC }}>
          <Photo src={asset('foto4_duo.jpg')} iw={3120} ih={2080} w={1750} h={1333} scale={1.0} fy={0.95} />
        </div>
      </Tile>
      {/* D: bloco cinza com texto de apoio */}
      <Tile x={1750} y={1333} w={875} h={667} p={pD} from="right">
        <AbsoluteFill style={{ background: C.grayMid, alignItems: 'center', justifyContent: 'center' }}>
          <Word size={52} weight={FONT.light} tracking={FONT.trackingSupport} color={C.white}>6º Prêmio</Word>
        </AbsoluteFill>
      </Tile>
      {/* E: bloco verde */}
      <Tile x={2625} y={1333} w={875} h={667} p={pE} from="bottom">
        <AbsoluteFill style={{ background: C.green }} />
      </Tile>
      {/* linhas do grid */}
      <div style={line({ left: u(1750 - hw / 2), top: u(hy1 - 2.5), width: u(hw), height: u(5) })} />
      <div style={line({ left: u(1750 - hw / 2), top: u(hy2 - 2.5), width: u(hw), height: u(5) })} />
      <div style={line({ left: u(1750 - 2.5), top: u(1000 - vh / 2), width: u(5), height: u(vh) })} />
      {/* barras verdes deslizando entre as fotos */}
      <div style={{ position: 'absolute', top: u(640), height: u(54), width: u(900), left: u(lerp(-1000, 3600, seg(t, 4.15, 4.85, E.main))), background: C.green }} />
      <div style={{ position: 'absolute', top: u(1306), height: u(54), width: u(640), left: u(lerp(3600, -800, seg(t, 4.35, 5.05, E.main))), background: C.green }} />
    </AbsoluteFill>
  );
};

const CenterBlock: React.FC = () => {
  const t = useT();
  const u = useU();
  const slide = seg(t, 4.85, 5.35, E.main);
  const grow = seg(t, 5.45, 6.05, E.main);
  if (slide <= 0) return null;
  const w = lerp(900, 3540, grow), h = lerp(520, 2040, grow);
  const cx = lerp(-700, 1750, slide);
  const wordIn = seg(t, 5.8, 6.25, E.out);
  // a palavra cresce devagar e acelera para "tela cheia" na saída
  const sc = 1 + 0.12 * seg(t, 6.1, 7.2, E.soft) + 0.4 * seg(t, 6.95, 7.75, E.in);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: u(cx - w / 2), top: u(1000 - h / 2), width: u(w), height: u(h), background: C.green }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ overflow: 'hidden', padding: `${u(40)}px ${u(80)}px`, transform: `scale(${sc})` }}>
          <div style={{ transform: `translateY(${(1 - wordIn) * 110}%)`, opacity: wordIn }}>
            <Word size={330} color={C.grayDeep}>{WORDS.jornalismo}</Word>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const S1Jornalismo: React.FC = () => {
  const t = useT();
  const u = useU();
  if (t < 2.95 || t > 7.85) return null;
  const push = 1 + 0.07 * seg(t, 3.2, 6.2, E.dolly);
  const sweep = seg(t, 7.15, 7.75, E.main);
  return (
    <AbsoluteFill style={{ clipPath: sweep > 0 ? `inset(0 0 0 ${sweep * 100}%)` : undefined }}>
      <MotionBlur windows={[[4.1, 5.4], [5.45, 6.1], [6.95, 7.8]]}>
        <AbsoluteFill style={{ transform: `scale(${push})` }}>
          <Mosaic />
        </AbsoluteFill>
        <CenterBlock />
        {/* borda verde da varredura */}
        {sweep > 0 && sweep < 1 && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${sweep * 100}% - ${u(1)}px)`, width: u(46), background: C.green }} />
        )}
      </MotionBlur>
    </AbsoluteFill>
  );
};

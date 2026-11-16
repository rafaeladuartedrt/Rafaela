"""Estilizacao do video 2 (montagem do evento) no mesmo estilo do video 1.
Sem tracking vetorial por plano: tratamento de foto (P&B quente, ceu branco->mostarda, vegetacao oliva),
bloco de cor com borda de papel rasgado por plano, textura de papel e grao.
Uso (teste): python3 estilo2.py still <frame> ..."""
import cv2, numpy as np, sys, os, json
sys.path.insert(0, '/home/user/Rafaela/missoes-reestilizacao/scripts')
import render as RD
V2 = '/home/user/Rafaela/missoes-reestilizacao/video2'
CUTS = json.load(open(f'{V2}/work/cortes.json')); N = 1521
INI = [0] + CUTS; FIM = CUTS + [N]
def plano(i):
    k = int(np.searchsorted(CUTS, i, side='right')); return k, INI[k], FIM[k]
OW, OH = 1080, 1920
# layouts de bloco (fracoes da tela): x0,y0,x1,y1 e cor
LAY = [(.10, .16, .90, .70, 'coral'), (.00, .30, .62, .86, 'most'), (.38, .10, 1.0, .62, 'coral'), (.14, .24, .86, .80, 'most'),
       (.00, .12, .55, .66, 'coral'), (.45, .30, 1.0, .88, 'most')]
def classes(bgr):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV); H, S, V = [hsv[..., c].astype(np.int32) for c in range(3)]
    azul = ((H > 88) & (H < 128) & (S > 45) & (V > 95)).astype(np.uint8)
    # ceu = azul liso ligado ao topo do quadro
    n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.morphologyEx(azul, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)), 8)
    ceu = np.zeros(azul.shape, np.float32)
    for j in range(1, n):
        if st[j, cv2.CC_STAT_TOP] < 0.06 * azul.shape[0] and st[j, cv2.CC_STAT_AREA] > 0.01 * azul.size: ceu[lab == j] = 1
    nuv = ((S < 55) & (V > 205)).astype(np.float32)      # nuvens claras coladas no ceu
    ceu = np.clip(ceu + nuv * (cv2.dilate(ceu, np.ones((61, 61), np.uint8)) > 0), 0, 1)
    veg = ((H > 30) & (H < 88) & (S > 70) & (V > 35)).astype(np.float32) * (1 - ceu)
    return ceu, veg
def estiliza(i, canvas=(OW, OH), zoom=None):
    k, a, b = plano(i)
    src = cv2.imread(f'{V2}/work/frames/f_{i + 1:04d}.jpg')
    big = cv2.resize(src, canvas, interpolation=cv2.INTER_LANCZOS4)
    ceu, veg = classes(big)
    ceu = cv2.GaussianBlur(ceu, (0, 0), 2.5); veg = cv2.GaussianBlur(veg, (0, 0), 2.0)
    rgb = cv2.cvtColor(big, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    lum = cv2.GaussianBlur(rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32), (0, 0), 1.0)
    W, Hh = canvas; sh = (Hh, W, 3)
    # ceu: branco -> mostarda pela "densidade" do azul
    sat = cv2.cvtColor(big, cv2.COLOR_BGR2HSV)[..., 1].astype(np.float32) / 255
    t = np.clip(cv2.GaussianBlur(sat, (0, 0), 5) * 1.1 - 0.12, 0, 0.62)
    c_ceu = RD.mix(np.broadcast_to(RD.BRANCO, sh), RD.MOST, t)
    lv = RD.poster(np.clip((cv2.GaussianBlur(lum, (0, 0), 2) - 0.06) / 0.55, 0, 1), 3)
    c_veg = RD.mix(RD.mix(np.broadcast_to(RD.OLIVA, sh), RD.MARROM, np.full_like(lv, 0.55)), RD.OLIVA, RD.sstep(0.0, 0.5, lv))
    c_veg = RD.mix(c_veg, RD.BRANCO, 0.22 * RD.sstep(0.6, 1.0, lv))
    # equaliza a exposicao do plano (percentis) antes do P&B quente
    lo, hi = np.percentile(lum, 3), np.percentile(lum, 97); ln = np.clip((lum - lo) / max(hi - lo, .1), 0, 1) * 0.62 + 0.06
    c_pb = RD.tom_pedra(ln)
    foto = RD.mix(RD.mix(c_pb, c_veg, veg), c_ceu, ceu)
    # bloco de cor do plano (fixo na tela, entra com wipe de papel rasgado)
    x0, y0, x1, y1, cor = LAY[k % len(LAY)]; p = RD.ease_io((i - a - 3) / 9.)
    alfa = np.zeros((Hh, W), np.float32)
    if p > 0:
        P = RD.torn([(0, 0), (1, 0), (1, 1), (0, 1)], 0.004, 0.012, 5 + k) * [(x1 - x0) * W * p, (y1 - y0) * Hh] + [x0 * W, y0 * Hh]
        cv2.fillPoly(alfa, [np.round(P * 16).astype(np.int32)], 1.0, cv2.LINE_AA, 4)
    base = RD.CORAL if cor == 'coral' else RD.MOST
    sombra = RD.poster(1 - np.clip((ln - 0.08) / 0.5, 0, 1), 3)
    c_bl = RD.mix(np.broadcast_to(base, sh), RD.LARANJA, 0.80 * sombra * (1 - ceu))
    comp = RD.mix(foto, c_bl, alfa)
    return comp
def acabamento(comp, i):
    Hh, W = comp.shape[:2]; RD.set_view(W, Hh, 1.0, 0, 0); RD._paper = None; pp = RD.paper()
    out = comp * pp[..., None]; rng = np.random.default_rng(i)
    gr = rng.normal(0, 1, (Hh, W)).astype(np.float32); out = out + (gr * 0.012)[..., None]
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32); rr = ((xx / W - .5) ** 2 + (yy / Hh - .5) ** 2) / 0.5
    return np.clip(out * (1 - 0.06 * RD.sstep(0.45, 1.0, rr))[..., None], 0, 1)
if __name__ == '__main__':
    if sys.argv[1] == 'still':
        for s in sys.argv[2:]:
            i = int(s); o = acabamento(estiliza(i), i)
            cv2.imwrite(f'{V2}/work/t_{i:04d}.png', cv2.cvtColor((o * 255 + .5).astype(np.uint8), cv2.COLOR_RGB2BGR)); print('ok', i)

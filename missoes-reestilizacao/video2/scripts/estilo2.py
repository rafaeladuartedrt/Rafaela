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
RUINAS = {0, 1, 2, 3, 4, 22}
# blocos (fracoes da tela): ruinas = blocos grandes; pessoas = faixas menores nas bordas, sem cobrir rostos
LAY_R = [(.10, .16, .90, .70, 'coral'), (.00, .30, .62, .86, 'most'), (.38, .10, 1.0, .62, 'coral'), (.14, .24, .86, .80, 'most')]
LAY_P = [(.00, .06, .26, .58, 'most'), (.74, .30, 1.0, .84, 'coral'), (.00, .44, .28, .94, 'coral'), (.72, .05, 1.0, .52, 'most')]
# ---- retirada dos letreiros
# rodape (caixas e faixas com texto): o plano e reenquadrado para o letreiro sair do quadro
CORTE_Y = {}                       # plano -> ultima linha util do original (576x1024)
for k in (5, 6, 7, 8): CORTE_Y[k] = 824          # "Servicos publicos gratuitos" (y 838-916)
for k in (11, 12, 13): CORTE_Y[k] = 864          # faixas coloridas (y >= 874)
for k in (23, 24, 25, 26): CORTE_Y[k] = 814      # "27 municipios..." (y 827-911)
# centro vertical do recorte 16:9 em cada plano (fracao da altura), escolhido pelo assunto/rostos
CY_H = {0: .45, 1: .42, 2: .50, 3: .42, 4: .50, 5: .35, 6: .50, 7: .52, 8: .52, 9: .58, 10: .62, 11: .52, 12: .45, 13: .42, 14: .42,
        15: .50, 16: .42, 17: .33, 18: .42, 19: .38, 20: .50, 21: .72, 22: .45, 23: .52, 24: .50, 25: .60, 26: .70}
# blocos para o 16:9
LAY_RH = [(.05, .12, .47, .88, 'coral'), (.55, .14, .96, .86, 'most'), (.28, .08, .72, .80, 'coral'), (.00, .20, .40, .92, 'most')]
LAY_PH = [(.00, .08, .13, .70, 'most'), (.86, .22, 1.0, .92, 'coral'), (.00, .30, .14, .94, 'coral'), (.87, .06, 1.0, .68, 'most')]
LOGO = (404, 488, 30, 218, 552, 412)             # frames e retangulo (x0,y0,x1,y1) do logo com titulo, sobre o ceu
def limpa_fonte(i, formato='v'):
    """Frame original sem letreiros: logo apagado (ceu reconstruido) e rodape fora do quadro."""
    k, a, b = plano(i)
    im = cv2.imread(f'{V2}/work/frames/f_{i + 1:04d}.jpg')
    if LOGO[0] - 6 <= i <= LOGO[1]:
        x0, y0, x1, y1 = LOGO[2:]
        cima = cv2.GaussianBlur(im[y0 - 14:y0 - 2, x0:x1].astype(np.float32), (0, 0), 6).mean(0); baixo = cv2.GaussianBlur(im[y1 + 2:y1 + 14, x0:x1].astype(np.float32), (0, 0), 6).mean(0)
        t = np.linspace(0, 1, y1 - y0, dtype=np.float32)[:, None, None]
        rec = cima[None] * (1 - t) + baixo[None] * t
        rec += np.random.default_rng(i).normal(0, 1.5, rec.shape)            # leve ruido para nao ficar liso
        m = np.zeros(im.shape[:2], np.float32); m[y0:y1, x0:x1] = 1; m = cv2.GaussianBlur(m, (0, 0), 5)[..., None]
        full = im.astype(np.float32); full[y0:y1, x0:x1] = rec
        im = np.clip(im * (1 - m) + full * m, 0, 255).astype(np.uint8)
    if formato == 'h':
        # 16:9 = recorte horizontal do vertical (576x324), posicionado acima dos letreiros do rodape
        cy = CY_H.get(k, 0.45)
        y0 = int(np.clip(cy * 1024 - 162, 0, CORTE_Y.get(k, 1024) - 324))
        return im[y0:y0 + 324]
    if k in CORTE_Y:
        hy = CORTE_Y[k]; w = int(round(hy * 576 / 1024)); x0 = (576 - w) // 2
        im = im[:hy, x0:x0 + w]
    return im
def _expo():
    """Percentis de exposicao por frame, suavizados no tempo dentro de cada plano (sem pisca-pisca)."""
    pth = f'{V2}/work/expo.npy'
    if not os.path.exists(pth):
        from scipy.ndimage import gaussian_filter1d
        E = np.zeros((N, 2), np.float32)
        for i in range(N):
            g = cv2.cvtColor(cv2.resize(cv2.imread(f'{V2}/work/frames/f_{i + 1:04d}.jpg'), (144, 256)), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
            l = g @ np.array([0.2126, 0.7152, 0.0722], np.float32); E[i] = np.percentile(l, 3), np.percentile(l, 97)
        for a, b in zip(INI, FIM):
            for c in range(2): E[a:b, c] = gaussian_filter1d(E[a:b, c], 8, mode='nearest')
        np.save(pth, E)
    return np.load(pth)
EXPO = _expo()
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
    veg = ((H >= 24) & (H < 88) & (S > 75) & (V > 35)).astype(np.float32) * (1 - ceu)
    return ceu, veg
def estiliza(i, formato='v'):
    canvas = (1080, 1920) if formato == 'v' else (1920, 1080)
    k, a, b = plano(i)
    src = limpa_fonte(i, formato)
    big = cv2.resize(src, canvas, interpolation=cv2.INTER_LANCZOS4)
    ceu, veg = classes(big)
    if k not in RUINAS: ceu = ceu * 0      # nos planos do evento, azul liso nao e ceu (onibus, tendas, coletes)
    if k not in RUINAS:                      # e so verde bem saturado conta como vegetacao (evita manchas em roupas e pele)
        hsv_ = cv2.cvtColor(big, cv2.COLOR_BGR2HSV); veg = veg * ((hsv_[..., 0] >= 32) & (hsv_[..., 1] > 95))
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
    lo, hi = EXPO[i]; ln = np.clip((lum - lo) / max(hi - lo, .1), 0, 1) * 0.62 + 0.06
    c_pb = RD.tom_pedra(ln)
    foto = RD.mix(RD.mix(c_pb, c_veg, veg), c_ceu, ceu)
    # bloco de cor do plano (fixo na tela, entra com wipe de papel rasgado)
    L = (LAY_R if k in RUINAS else LAY_P) if formato == 'v' else (LAY_RH if k in RUINAS else LAY_PH)
    x0, y0, x1, y1, cor = L[k % len(L)]; p = RD.ease_io((i - a - 3) / 9.) if (b - a) >= 20 else 0.
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
def salva(path, o): cv2.imwrite(path, cv2.cvtColor((o * 255 + .5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_PNG_COMPRESSION, 2])
if __name__ == '__main__':
    fmt = sys.argv[1]                       # v ou h
    os.makedirs(f'{V2}/work/{fmt}', exist_ok=True)
    for s in sys.argv[2:]:
        i = int(s); salva(f'{V2}/work/{fmt}/s_{i:04d}.png', acabamento(estiliza(i, fmt), i)); print('ok', i, flush=True)

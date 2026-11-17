"""Estilizacao do video 2 (montagem do evento) no mesmo estilo do video 1.

- Foto: P&B quente com posterize suave, ceu do branco ao mostarda, vegetacao em verde oliva (so nas ruinas).
- Luminancia e mascaras estabilizadas no tempo por fluxo optico (scripts/prep2.py): sem tremido.
- Bloco de cor (coral/mostarda) com borda de papel rasgado. O bloco nao some no corte: ele desliza e muda
  de tamanho do enquadramento de um plano para o do seguinte, e a cor troca com um wipe rasgado.
- Dentro do bloco, o que ele cobre e redesenhado em traco branco (estilo dos cartazes de Vyborg).
- Letreiros retirados: logo com titulo apagado; rodapes com texto ficam fora do quadro.
Uso: python3 estilo2.py <v|h> <frame> [<frame> ...]"""
import cv2, numpy as np, sys, os, json
sys.path.insert(0, '/home/user/Rafaela/missoes-reestilizacao/scripts')
import render as RD
V2 = '/home/user/Rafaela/missoes-reestilizacao/video2'
CUTS = json.load(open(f'{V2}/work/cortes.json')); N = 1521
INI = [0] + CUTS; FIM = CUTS + [N]
def plano(i):
    k = int(np.searchsorted(CUTS, i, side='right')); return k, INI[k], FIM[k]
RUINAS = {0, 1, 2, 3, 4, 22}
SW, SH = 576, 1024                                 # tamanho do original

# ---- retirada dos letreiros
CORTE_Y = {}                                       # plano -> ultima linha util do original
for k in (5, 6, 7, 8): CORTE_Y[k] = 824            # "Servicos publicos gratuitos" (y 838-916)
for k in (11, 12, 13): CORTE_Y[k] = 864            # faixas coloridas (y >= 874)
for k in (23, 24, 25, 26): CORTE_Y[k] = 814        # "27 municipios..." (y 827-911)
LOGO = (404, 488, 30, 218, 552, 412)               # frames e retangulo do logo com titulo, sobre o ceu
# centro vertical do recorte 16:9 em cada plano (fracao da altura)
CY_H = {0: .45, 1: .42, 2: .50, 3: .42, 4: .50, 5: .35, 6: .50, 7: .52, 8: .52, 9: .58, 10: .62, 11: .52, 12: .45, 13: .42, 14: .42,
        15: .50, 16: .42, 17: .33, 18: .42, 19: .38, 20: .50, 21: .72, 22: .45, 23: .52, 24: .50, 25: .60, 26: .70}

# ---- bloco de cor por plano, em fracoes do quadro ORIGINAL (x0, y0, x1, y1), sobre o assunto do plano
BLK = {0: (.10, .22, .82, .62), 1: (.30, .30, .96, .60), 2: (.16, .30, .84, .72), 3: None, 4: (.10, .26, .80, .64),
       5: (.04, .16, .62, .62), 6: (.42, .10, 1.0, .56), 7: (.00, .34, .56, .78), 8: (.44, .30, 1.0, .76),
       9: (.00, .22, .52, .70), 10: (.40, .34, 1.0, .78), 11: (.00, .14, .56, .56), 12: (.48, .30, 1.0, .76),
       13: (.00, .24, .56, .70), 14: (.44, .20, 1.0, .64), 15: (.00, .36, .60, .80), 16: (.40, .24, 1.0, .70),
       17: (.00, .40, .56, .84), 18: (.44, .14, 1.0, .58), 19: (.00, .30, .60, .74), 20: (.40, .44, 1.0, .86),
       21: (.00, .20, .56, .64), 22: (.20, .26, .88, .60), 23: (.44, .40, 1.0, .80), 24: (.00, .30, .56, .74),
       25: (.44, .26, 1.0, .70), 26: (.12, .30, .82, .70)}
COR = {}
_c = 0
for k in range(len(INI)):
    if BLK[k] is None: COR[k] = COR[k - 1]; continue
    COR[k] = 'coral' if _c % 2 == 0 else 'most'; _c += 1
def blk(k): return BLK[k] if BLK[k] is not None else BLK[k - 1]
T_GLIDE = 14                                       # frames do deslize/troca de cor entre planos

def limpa_total(i):
    """Frame original com o logo-titulo apagado (ceu reconstruido), sem recorte."""
    im = cv2.imread(f'{V2}/work/frames/f_{i + 1:04d}.jpg')
    if LOGO[0] - 6 <= i <= LOGO[1]:
        x0, y0, x1, y1 = LOGO[2:]
        cima = cv2.GaussianBlur(im[y0 - 14:y0 - 2, x0:x1].astype(np.float32), (0, 0), 6).mean(0); baixo = cv2.GaussianBlur(im[y1 + 2:y1 + 14, x0:x1].astype(np.float32), (0, 0), 6).mean(0)
        t = np.linspace(0, 1, y1 - y0, dtype=np.float32)[:, None, None]
        rec = cima[None] * (1 - t) + baixo[None] * t + np.random.default_rng(i).normal(0, 1.5, (y1 - y0, x1 - x0, 3))
        m = np.zeros(im.shape[:2], np.float32); m[y0:y1, x0:x1] = 1; m = cv2.GaussianBlur(m, (0, 0), 5)[..., None]
        full = im.astype(np.float32); full[y0:y1, x0:x1] = rec
        im = np.clip(im * (1 - m) + full * m, 0, 255).astype(np.uint8)
    return im

def recorte(k, formato):
    """Retangulo do original (x, y, w, h) usado em cada formato."""
    if formato == 'h':
        y0 = int(np.clip(CY_H.get(k, 0.45) * SH - 162, 0, CORTE_Y.get(k, SH) - 324)); return 0, y0, SW, 324
    if k in CORTE_Y:
        hy = CORTE_Y[k]; w = int(round(hy * SW / SH)); return (SW - w) // 2, 0, w, hy
    return 0, 0, SW, SH

def _expo():
    """Percentis de exposicao por frame, suavizados no tempo dentro de cada plano."""
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

def poster(x, n, soft=0.34): return RD.poster(x, n, soft)
def tom_pedra(lum):
    lp = np.clip((lum - 0.10) / 0.50, 0, 1) ** 0.85
    lp = 0.55 * poster(lp, 5) + 0.45 * lp
    cinza = RD.MARROM * 0.55 + 0.42; sh = lum.shape + (3,)
    return np.where((lp < 0.5)[..., None], RD.mix(np.broadcast_to(RD.MARROM, sh), cinza, lp * 2), RD.mix(np.broadcast_to(cinza, sh), RD.BRANCO, lp * 2 - 1))

_clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
def linhas(ln, esc):
    """Traco branco de contorno (XDoG) sobre a luminancia estabilizada com contraste local:
    linhas continuas nas formas principais, sem pontinhos soltos."""
    eq = _clahe.apply(np.clip(ln * 255, 0, 255).astype(np.uint8)).astype(np.float32) / 255
    eq = cv2.bilateralFilter(eq, 0, 0.08, 3 * esc)               # alisa textura miuda, preserva bordas
    s = 1.5 * esc
    d = cv2.GaussianBlur(eq, (0, 0), s * 1.8) - cv2.GaussianBlur(eq, (0, 0), s)
    L = RD.sstep(0.010, 0.030, d)
    b = (L > 0.5).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(b, 8)
    keep = np.zeros(n, np.float32); keep[1:] = (st[1:, cv2.CC_STAT_AREA] > 90 * esc * esc)
    return cv2.GaussianBlur(L * keep[lab], (0, 0), 0.7)

def para_tela(r, k, formato, W, Hh):
    """Retangulo em fracoes do original -> pixels da tela (recortado as bordas, com margem)."""
    cx, cy, cw, ch = recorte(k, formato)
    x0, y0, x1, y1 = r[0] * SW, r[1] * SH, r[2] * SW, r[3] * SH
    sx, sy = W / cw, Hh / ch
    X0, X1 = (x0 - cx) * sx, (x1 - cx) * sx; Y0, Y1 = (y0 - cy) * sy, (y1 - cy) * sy
    mx, my = 0.0, (0.07 * Hh if formato == 'h' else 0.0)
    X0, X1 = np.clip([X0, X1], -0.02 * W, 1.02 * W); Y0, Y1 = np.clip([Y0, Y1], my, Hh - my)
    if Y1 - Y0 < 0.3 * Hh: c = (Y0 + Y1) / 2; Y0, Y1 = max(my, c - 0.18 * Hh), min(Hh - my, c + 0.18 * Hh)
    return np.array([X0, Y0, X1, Y1], np.float32)

def estado_bloco(i, formato, W, Hh):
    """Retangulo atual do bloco, cor nova, cor anterior e progresso da troca de cor."""
    k, a, b = plano(i)
    atual = para_tela(blk(k), k, formato, W, Hh)
    if k == 0:
        return atual, COR[0], None, 1.0, RD.ease_io((i - 3) / 12.)
    ant = para_tela(blk(k - 1), k, formato, W, Hh) if False else para_tela(blk(k - 1), k - 1, formato, W, Hh)
    t = RD.ease_io((i - a) / float(T_GLIDE))
    return ant * (1 - t) + atual * t, COR[k], COR[k - 1], t, 1.0

def estiliza(i, formato='v'):
    W, Hh = (1080, 1920) if formato == 'v' else (1920, 1080); sh = (Hh, W, 3)
    k, a, b = plano(i); cx, cy, cw, ch = recorte(k, formato); esc = W / cw
    corta = lambda im: im[cy:cy + ch, cx:cx + cw]
    big = cv2.resize(corta(limpa_total(i)), (W, Hh), interpolation=cv2.INTER_LANCZOS4)
    lum = cv2.resize(corta(cv2.imread(f'{V2}/work/lum/l_{i:04d}.png', 0)).astype(np.float32) / 255, (W, Hh), interpolation=cv2.INTER_CUBIC)
    ceu = cv2.resize(corta(cv2.imread(f'{V2}/work/ceu/c_{i:04d}.png', 0)).astype(np.float32) / 255, (W, Hh), interpolation=cv2.INTER_LINEAR)
    veg = cv2.resize(corta(cv2.imread(f'{V2}/work/veg/v_{i:04d}.png', 0)).astype(np.float32) / 255, (W, Hh), interpolation=cv2.INTER_LINEAR)
    lo, hi = EXPO[i]; ln = np.clip((lum - lo) / max(hi - lo, .1), 0, 1) * 0.62 + 0.06

    # ---- foto estilizada
    sat = cv2.cvtColor(big, cv2.COLOR_BGR2HSV)[..., 1].astype(np.float32) / 255
    c_ceu = RD.mix(np.broadcast_to(RD.BRANCO, sh), RD.MOST, np.clip(cv2.GaussianBlur(sat, (0, 0), 6 * esc / 1.875) * 1.1 - 0.12, 0, 0.62))
    lv = cv2.GaussianBlur(ln, (0, 0), 3 * esc / 1.875)
    c_veg = np.broadcast_to(RD.OLIVA, sh) * (0.80 + 0.32 * np.clip((lv - 0.15) / 0.5, 0, 1))[..., None]   # oliva continuo, sem manchas escuras
    c_veg = RD.mix(c_veg, RD.BRANCO, 0.12 * RD.sstep(0.6, 0.9, lv))
    foto = RD.mix(RD.mix(tom_pedra(ln), c_veg, veg), c_ceu, ceu)

    # ---- bloco de cor (desliza entre planos) e traco branco do que ele cobre
    (X0, Y0, X1, Y1), cor, cor_ant, tc, entra = estado_bloco(i, formato, W, Hh)
    alfa = np.zeros((Hh, W), np.float32)
    if entra > 0:
        P = RD.torn([(0, 0), (1, 0), (1, 1), (0, 1)], 0.004, 0.012, 5) * [(X1 - X0) * entra, Y1 - Y0] + [X0, Y0]
        cv2.fillPoly(alfa, [np.round(P * 16).astype(np.int32)], 1.0, cv2.LINE_AA, 4)
    base = RD.CORAL if cor == 'coral' else RD.MOST
    cor_bl = np.broadcast_to(base, sh)
    if cor_ant is not None and tc < 1 and cor_ant != cor:      # troca de cor com wipe rasgado dentro do bloco
        yy = np.arange(Hh, dtype=np.float32); rng = np.random.default_rng(31 + k)
        borda = X0 + (X1 - X0 + 0.06 * W) * tc - 0.03 * W + np.interp(yy, np.linspace(0, Hh, 60), np.convolve(rng.normal(0, 0.012 * W, 60), np.ones(3) / 3, 'same'))
        novo = RD.sstep(-1.5, 1.5, borda[:, None] - np.arange(W, dtype=np.float32)[None, :])
        cor_bl = RD.mix(np.broadcast_to(RD.CORAL if cor_ant == 'coral' else RD.MOST, sh), base, novo)
    sombra = poster(1 - np.clip((ln - 0.08) / 0.5, 0, 1), 3)
    c_bl = RD.mix(cor_bl, RD.LARANJA, 0.38 * sombra * (1 - ceu))           # tom leve: o traco branco e quem desenha
    comp = RD.mix(foto, c_bl, alfa)
    tr = linhas(ln, esc / 1.875)
    comp = RD.mix(comp, RD.BRANCO, np.clip(tr * alfa * 1.25, 0, 1))
    return comp

def acabamento(comp, i):
    Hh, W = comp.shape[:2]; RD.set_view(W, Hh, 1.0, 0, 0); RD._paper = None; pp = RD.paper()
    out = comp * pp[..., None]; rng = np.random.default_rng(i)
    out = out + (rng.normal(0, 1, (Hh, W)).astype(np.float32) * 0.010)[..., None]
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32); rr = ((xx / W - .5) ** 2 + (yy / Hh - .5) ** 2) / 0.5
    return np.clip(out * (1 - 0.06 * RD.sstep(0.45, 1.0, rr))[..., None], 0, 1)
def salva(path, o): cv2.imwrite(path, cv2.cvtColor((o * 255 + .5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_PNG_COMPRESSION, 2])
if __name__ == '__main__':
    fmt = sys.argv[1]
    os.makedirs(f'{V2}/work/{fmt}', exist_ok=True)
    for s in sys.argv[2:]:
        i = int(s); salva(f'{V2}/work/{fmt}/s_{i:04d}.png', acabamento(estiliza(i, fmt), i)); print('ok', i, flush=True)

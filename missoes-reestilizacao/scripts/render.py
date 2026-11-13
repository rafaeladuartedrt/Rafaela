"""Compositor 4K da reestilizacao (previa de estilo / render de referencia).
Camadas equivalentes as pre-comps do After Effects:
01_FOTO_ESTILIZADA, 02_BLOCOS_COR, 03_TRACO_MARROM, 04_LINHAS_BRANCAS, 05_TEXTURAS, 06_GRADE_FINAL.
Uso: python3 render.py <frame> [<frame> ...]   -> work/out/s_####.png (3840x2160, 16 bits)
"""
import cv2, numpy as np, cairo, json, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geometria as G

R = '/home/user/Rafaela/missoes-reestilizacao/work'
W, Hh, S = 3840, 2160, 2.0
hexc = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
CORAL, MOST, OLIVA, LARANJA, MARROM, BRANCO = map(hexc, ['#E76847', '#E7A22B', '#9A9F30', '#BB5108', '#592400', '#FFFFFF'])

# ---------------- CONTROLES (espelham o null "CONTROLES" do AE)
CTRL = dict(espessura=1.0, boil=1.0, opac_blocos=1.0, grao=1.0)

HT = np.load(f'{R}/track_fachada.npy')
CR = {int(k): v for k, v in json.load(open(f'{R}/track_cruz.json')).items()}
NB_MB = 8  # amostras de motion blur (obturador 180 graus)

def lum1080(i):
    return cv2.cvtColor(cv2.imread(f'{R}/frames/f_{i:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255

_tij = None
def tijolos():
    """Marcas de tijolo fixas no plano da fachada, mais densas onde a pedra e escura no frame 120."""
    global _tij
    if _tij is None:
        rng = np.random.default_rng(12); g = cv2.GaussianBlur(lum1080(120), (0, 0), 4); out = []
        for (x, y, w, h) in G.ZONAS:
            n = int(w * h / 520)
            for _ in range(n):
                bw = rng.uniform(12, 26); bx = rng.uniform(x, x + w - bw); by = y + round(rng.uniform(0, h - 7) / 9) * 9
                if any(a - 6 < bx + bw / 2 < c_ + 6 and b - 6 < by < d + 6 for a, b, c_, d in G.VAOS): continue
                if g[int(by), int(bx)] > 0.34 and rng.uniform() > 0.25: continue
                out.append((bx, by, bw, 5.5, 'torre' if bx < 600 else 'corpo'))
        _tij = out
    return _tij

# ---------------- easing
def clamp(x, a=0., b=1.): return max(a, min(b, x))
def expo_out(t): t = clamp(t); return 1 - 2 ** (-10 * t) if t < 1 else 1.
def ease_io(t): t = clamp(t); return t * t * t * (t * (6 * t - 15) + 10)
def sstep(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

# ---------------- utilidades
def load_rgb(i):
    im = cv2.imread(f'{R}/frames/f_{i:04d}.png', cv2.IMREAD_UNCHANGED)
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 65535

def matte(k, i, blur=1.3):
    m = cv2.imread(f'{R}/mattes/{k}/m_{i:04d}.png', 0).astype(np.float32) / 255
    m = cv2.GaussianBlur(m, (0, 0), blur)
    m = cv2.resize(m, (W, Hh), interpolation=cv2.INTER_CUBIC)
    return sstep(0.35, 0.65, m)

def Hof(i, t=0.):
    """Homografia (coords 4K) no instante i+t."""
    i = int(i)
    if np.isnan(HT[i, 0, 0]): return None
    j = i + 1 if i + 1 < 240 and not np.isnan(HT[i + 1, 0, 0]) else i
    return HT[i], HT[j], t

def proj(P, hh):
    h0, h1, t = hh
    P = np.asarray(P, np.float32)[None]
    a = cv2.perspectiveTransform(P, h0)[0]; b = cv2.perspectiveTransform(P, h1)[0]
    return (a * (1 - t) + b * t) * S

def surf():
    s = cairo.ImageSurface(cairo.FORMAT_A8, W, Hh); c = cairo.Context(s)
    c.set_line_cap(cairo.LINE_CAP_ROUND); c.set_line_join(cairo.LINE_JOIN_ROUND); c.set_antialias(cairo.ANTIALIAS_BEST)
    return s, c

def to_np(s):
    s.flush(); a = np.frombuffer(s.get_data(), np.uint8).reshape(Hh, s.get_stride())[:, :W]
    return a.astype(np.float32) / 255

def trim(P, f):
    """Trim Paths: mantem a fracao f inicial do comprimento."""
    if f >= 1: return P
    if f <= 0: return P[:0]
    d = np.linalg.norm(np.diff(P, axis=0), axis=1); c = np.concatenate([[0], np.cumsum(d)]); L = c[-1] * f
    k = int(np.searchsorted(c, L)) - 1; k = max(0, min(k, len(d) - 1))
    u = (L - c[k]) / max(d[k], 1e-6)
    return np.vstack([P[:k + 1], P[k] + (P[k + 1] - P[k]) * u])

def overshoot(P, e):
    P = P.copy()
    for a, b in ((0, 1), (-1, -2)):
        v = P[a] - P[b]; n = np.linalg.norm(v)
        if n > 1e-3: P[a] = P[a] + v / n * e
    return P

def stroke(c, P, w):
    if len(P) < 2: return
    c.set_line_width(w); c.move_to(*P[0])
    for p in P[1:]: c.line_to(*p)
    c.stroke()

def item_pts(it, n=24):
    g, t, p = it; p = np.array(p, np.float32)
    if t == 'rect': p = np.vstack([p, p[:1]])
    if t == 'q':
        s = np.linspace(0, 1, n)[:, None]; p = (1 - s) ** 2 * p[0] + 2 * s * (1 - s) * p[1] + s ** 2 * p[2]
    else:  # subdivide retas para acompanhar a perspectiva
        out = [p[0]]
        for a, b in zip(p[:-1], p[1:]):
            out += [a + (b - a) * k / 4 for k in range(1, 5)]
        p = np.array(out, np.float32)
    return p

# cronograma do desenho das linhas (frames) : inicio, duracao
TIMING = dict(torre=(40, 22), corpo=(48, 26), janela=(60, 14), frontao=(60, 24))
YB, YT = 780., 68.

def boil_offset(i, k, n, amp):
    rng = np.random.default_rng(1000 * (i // 2) + k)
    return rng.normal(0, amp, (n, 2)).astype(np.float32)

def torn(P, amp, step, seed, closed=True):
    """Borda de papel rasgado: subdivide e desloca na normal com ruido fixo."""
    rng = np.random.default_rng(seed); out = []
    n = len(P)
    for a in range(n if closed else n - 1):
        p0, p1 = np.array(P[a], np.float32), np.array(P[(a + 1) % n], np.float32)
        L = np.linalg.norm(p1 - p0); m = max(2, int(L / step)); nrm = np.array([-(p1 - p0)[1], (p1 - p0)[0]]) / max(L, 1e-6)
        r = rng.normal(0, 1, m); r = np.convolve(r, [0.25, 0.5, 0.25], 'same'); r[0] = 0
        r2 = rng.normal(0, 0.35, m)
        for k in range(m): out.append(p0 + (p1 - p0) * k / m + nrm * (r[k] + r2[k]) * amp)
    return np.array(out, np.float32)

BLOCO_F = None
def bloco_fachada_pts(p):
    """Bloco coral em coords do plano da fachada, com wipe (p=0..1) da esquerda p/ direita."""
    (x0, y0), (x1, _), (_, y1), _ = G.BLOCO
    xw = x0 + (x1 - x0) * p
    base = torn([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 2.2, 7, 7)
    if p >= 1: return base
    rng = np.random.default_rng(99); ys = np.arange(y0, y1, 6.)
    edge = xw + np.convolve(rng.normal(0, 9, len(ys)), np.ones(5) / 5, 'same') + rng.normal(0, 2.5, len(ys))
    b = base[base[:, 0] < xw]
    top = b[b[:, 1] < (y0 + y1) / 2]; bot = b[b[:, 1] >= (y0 + y1) / 2]
    top = top[np.argsort(top[:, 0])]; bot = bot[np.argsort(-bot[:, 0])]
    left = base[(base[:, 0] < x0 + 12)]; left = left[np.argsort(-left[:, 1])]
    e = np.stack([edge, ys], 1).astype(np.float32)
    return np.vstack([top, e, bot, left])

RECORTE = [(741, 512), (1262, 512), (1262, 786), (741, 786)]  # janela fotografica dentro do bloco (estilo Vyborg)

def cruz_rect(i, t=0.):
    """Retangulo do bloco mostarda (4K) a partir da caixa da cruz, suavizada."""
    def raw(j):
        j = min(max(j, min(CR)), max(CR)); x, y, w, h = CR[j]
        return np.array([x - 0.16 * w, y - 0.07 * h, x + 1.16 * w, y + 0.86 * h], np.float32)
    ws = [(-2, .1), (-1, .2), (0, .4), (1, .2), (2, .1)]
    a = sum(raw(i + d) * w for d, w in ws); b = sum(raw(i + 1 + d) * w for d, w in ws)
    return (a * (1 - t) + b * t) * S

def hatch(Hm, mask_dens, period=7.0, ang=0.7):
    """Hachura presa ao plano da fachada, com oitavas que se revelam conforme o zoom."""
    Hi = np.linalg.inv(Hm)
    ys, xs = np.mgrid[0:Hh, 0:W].astype(np.float32); xs /= S; ys /= S
    d = Hi[2, 0] * xs + Hi[2, 1] * ys + Hi[2, 2]
    u = (Hi[0, 0] * xs + Hi[0, 1] * ys + Hi[0, 2]) / d; v = (Hi[1, 0] * xs + Hi[1, 1] * ys + Hi[1, 2]) / d
    z = math.sqrt(abs(np.linalg.det(Hm[:2, :2] / Hm[2, 2]))) * S  # px de tela por unidade do plano
    k = math.log2(max(z / S, 1e-3)); k0 = math.floor(k); fr = k - k0
    s = u * math.cos(ang) + v * math.sin(ang)
    out = np.zeros((Hh, W), np.float32)
    for o, wgt in ((k0, 1.0), (k0 + 1, ease_io(fr))):
        per = period / (2 ** o)
        dist = np.abs(((s / per + 0.5) % 1.0) - 0.5) * per * z   # distancia em px de tela
        out = np.maximum(out, wgt * (1 - sstep(1.1, 2.4, dist)))
    return out * mask_dens

_paper = None
def paper():
    global _paper
    if _paper is None:
        p = f'{R}/papel_4k.png'
        if not os.path.exists(p):
            rng = np.random.default_rng(4); acc = np.zeros((Hh, W), np.float32)
            for sc, a in ((270, .5), (90, .3), (30, .22), (8, .2), (2, .25)):
                n = rng.normal(0, 1, (Hh // sc + 3, W // sc + 3)).astype(np.float32)
                acc += a * cv2.resize(n, (W, Hh), interpolation=cv2.INTER_CUBIC)
            fib = rng.normal(0, 1, (Hh, W)).astype(np.float32); fib = cv2.GaussianBlur(fib, (0, 0), sigmaX=14, sigmaY=0.8) * 6
            # vincos suaves de papel amassado
            cr = np.zeros((Hh, W), np.float32)
            for _ in range(26):
                a = rng.uniform(0, W), rng.uniform(0, Hh); ang = rng.uniform(0, math.pi); L = rng.uniform(500, 2200)
                b = a[0] + math.cos(ang) * L, a[1] + math.sin(ang) * L
                cv2.line(cr, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), float(rng.choice([-1, 1]) * rng.uniform(.4, 1)), 3, cv2.LINE_AA)
            cr = cv2.GaussianBlur(cr, (0, 0), 5) * 1.6 + cv2.GaussianBlur(cr, (0, 0), 40) * 3
            t = acc * 0.5 + fib * 0.35 + cr
            t = 1 - 0.045 * np.clip(t + 0.9, 0, 3)
            cv2.imwrite(p, np.clip(t * 65535, 0, 65535).astype(np.uint16))
        _paper = cv2.imread(p, cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535
    return _paper

def poster(x, n, soft=0.18):
    """Posterize com transicao suave (evita serrilhado e banding duro)."""
    y = x * n; f = np.floor(y); r = y - f
    return (f + sstep(0.5 - soft, 0.5 + soft, r)) / n

def mix(a, b, t): return a + (b - a) * t[..., None]

# =====================================================================
def render(i, layers=False):
    rgb = load_rgb(i)
    big = np.clip(cv2.resize(rgb, (W, Hh), interpolation=cv2.INTER_LANCZOS4), 0, 1)
    lum = big @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    m_ceu, m_veg, m_cruz, m_fac, m_jan = [matte(k, i) for k in ('ceu', 'veg', 'cruz', 'fachada', 'janela')]
    hh = Hof(i) if 40 <= i <= 212 else None
    if hh is not None:   # recorta o matte da fachada pelo contorno folgado do conjunto
        s, c = surf(); P = proj(G.CONTORNO, (hh[0], hh[0], 0)); c.move_to(*P[0]); [c.line_to(*p) for p in P[1:]]; c.close_path(); c.fill()
        dentro = cv2.GaussianBlur(to_np(s), (0, 0), 3)
        m_veg = np.clip(m_veg + m_fac * (1 - dentro), 0, 1); m_fac = m_fac * dentro
    m_pedra = np.clip(m_cruz + m_fac, 0, 1)

    # ---------- 01_FOTO_ESTILIZADA
    # ceu: branco -> mostarda conforme a densidade das nuvens
    ls = cv2.GaussianBlur(lum, (0, 0), 6)
    t_ceu = np.clip((0.97 - ls) * 1.5, 0, 0.62)
    ceu = mix(np.broadcast_to(BRANCO, big.shape), MOST, t_ceu)
    # vegetacao: verde oliva chapado em 3 tons
    lv = poster(np.clip((cv2.GaussianBlur(lum, (0, 0), 3) - 0.08) / 0.5, 0, 1), 3)
    veg = mix(mix(np.broadcast_to(OLIVA, big.shape), MARROM, np.full_like(lv, 0.55)), OLIVA, sstep(0.0, 0.5, lv))
    veg = mix(veg, BRANCO, 0.22 * sstep(0.6, 1.0, lv))
    # pedra: P&B quente de alto contraste (marrom -> cinza quente -> branco)
    lp = np.clip((lum - 0.10) / 0.50, 0, 1) ** 0.85
    lp = 0.65 * poster(lp, 5) + 0.35 * lp
    cinza = MARROM * 0.55 + 0.42
    pedra = np.where((lp < 0.5)[..., None], mix(np.broadcast_to(MARROM, big.shape), cinza, lp * 2), mix(np.broadcast_to(cinza, big.shape), BRANCO, lp * 2 - 1))
    foto = ceu.copy()
    foto = mix(foto, veg, m_veg); foto = mix(foto, pedra, m_pedra)
    foto = mix(foto, BRANCO, m_jan)

    # ---------- 02_BLOCOS_COR  (alpha em cairo, com motion blur por subamostras)
    a_coral = np.zeros((Hh, W), np.float32); a_rec = np.zeros((Hh, W), np.float32); a_most = np.zeros((Hh, W), np.float32)
    p_coral = ease_io((i - 80) / 10.); p_most = ease_io((i - 7) / 10.)
    for sidx in range(NB_MB):
        t = 0.5 * sidx / NB_MB
        if hh is not None and p_coral > 0:
            s, c = surf(); P = proj(bloco_fachada_pts(p_coral), (hh[0], hh[1], t))
            c.move_to(*P[0]); [c.line_to(*p) for p in P[1:]]; c.close_path(); c.fill(); a_coral += to_np(s) / NB_MB
            s, c = surf(); P = proj(torn(RECORTE, 1.2, 6, 21), (hh[0], hh[1], t))
            c.move_to(*P[0]); [c.line_to(*p) for p in P[1:]]; c.close_path(); c.fill(); a_rec += to_np(s) / NB_MB
        if i in CR and p_most > 0:
            x0, y0, x1, y1 = cruz_rect(i, t); xw = x0 + (x1 - x0) * p_most
            Pn = torn([(0, 0), (1, 0), (1, 1), (0, 1)], 0.004, 0.012, 5) * [xw - x0, y1 - y0] + [x0, y0]
            s, c = surf(); c.move_to(*Pn[0]); [c.line_to(*p) for p in Pn[1:]]; c.close_path(); c.fill(); a_most += to_np(s) / NB_MB
    a_coral *= (1 - a_rec)
    # dentro do bloco a foto vira tom sobre a cor (so 2 tons + vazios em laranja queimado)
    sombra = poster(1 - np.clip((lum - 0.06) / 0.42, 0, 1), 3)
    coral_l = mix(np.broadcast_to(CORAL, big.shape), LARANJA, 0.78 * sombra * m_fac)
    coral_l = mix(coral_l, BRANCO, m_jan)
    most_l = mix(np.broadcast_to(MOST, big.shape), LARANJA, 0.80 * sombra * m_cruz)
    blocos = np.zeros_like(big); a_bl = np.clip(a_coral + a_most, 0, 1) * CTRL['opac_blocos']
    blocos = mix(most_l, coral_l, a_coral / np.maximum(a_coral + a_most, 1e-4))
    comp = mix(foto, blocos, a_bl)

    # ---------- 03_TRACO_MARROM : hachura (so na pedra fora dos blocos)
    hat = np.zeros((Hh, W), np.float32)
    if hh is not None:
        dens = sstep(0.50, 0.25, lum) * m_fac * (1 - a_bl)
        hat = hatch(hh[0], dens)
        hat_in = hatch(hh[0], sstep(0.42, 0.2, lum) * m_fac * a_coral, period=7.0, ang=0.7) * 0.55
        comp = mix(comp, BRANCO, hat_in * 0.0)  # reservado: hachura branca dentro do bloco (desligada)
    comp = mix(comp, MARROM, hat * 0.38)

    # ---------- 04 linhas vetoriais (cruz por contorno do matte; fachada por geometria + tracking)
    lin = np.zeros((Hh, W), np.float32); lin_jan = np.zeros((Hh, W), np.float32)
    wm = 9.0 * CTRL['espessura']; ws_ = 6.0 * CTRL['espessura']; amp = 1.5 * CTRL['boil']
    # cruz
    cont = []
    if i in CR:
        mk = cv2.imread(f'{R}/mattes/cruz/m_{i:04d}.png', 0)
        mk = cv2.morphologyEx(mk, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (23, 23)))
        mk = (cv2.GaussianBlur(mk, (0, 0), 3) > 127).astype(np.uint8)
        cs, hier = cv2.findContours(mk, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        amax = max([cv2.contourArea(c_) for c_ in cs] + [1])
        for c_ in cs:
            if cv2.contourArea(c_) < 0.02 * amax: continue
            ap = cv2.approxPolyDP(c_, 2.2, True)[:, 0].astype(np.float32)
            ap = np.vstack([ap, ap[:1]])
            # quebra onde o contorno corre pela borda do quadro
            onb = (ap[:, 0] < 3) | (ap[:, 0] > 1916) | (ap[:, 1] < 3) | (ap[:, 1] > 1076)
            cur = []
            for k in range(len(ap)):
                if onb[k] and (k + 1 < len(ap) and onb[k + 1] or k > 0 and onb[k - 1]):
                    if cur and not onb[k - 1]: cur.append(ap[k])
                    if len(cur) > 1: cont.append(np.array(cur))
                    cur = [ap[k]] if (k + 1 < len(ap) and not onb[k + 1]) else []
                else: cur.append(ap[k])
            if len(cur) > 1: cont.append(np.array(cur))
        vx = np.zeros(2, np.float32)
        if i + 1 < 240:   # velocidade da cruz: mediana do fluxo optico dentro do matte
            g0 = (lum1080(i) * 255).astype(np.uint8); g1 = (lum1080(i + 1) * 255).astype(np.uint8)
            pts = cv2.goodFeaturesToTrack(g0, 400, 0.01, 8, mask=cv2.erode(mk * 255, np.ones((15, 15), np.uint8)))
            if pts is not None and len(pts) > 10:
                q, st, _ = cv2.calcOpticalFlowPyrLK(g0, g1, pts, None, winSize=(41, 41), maxLevel=4)
                d = (q - pts).reshape(-1, 2)[st.ravel() == 1]
                if len(d) > 10: vx = np.median(d, 0).astype(np.float32)
    f_cruz = expo_out(i / 16.)
    for sidx in range(NB_MB):
        t = 0.5 * sidx / NB_MB
        s, c = surf(); s2, c2 = surf()
        for k, P in enumerate(cont):
            Q = (P + vx * t) * S + boil_offset(i, k, len(P), amp)
            stroke(c, trim(Q, f_cruz), wm)
        if hh is not None:
            h3 = (hh[0], hh[1], t)
            for k, it in enumerate(G.L):
                g = it[0]; st, du = TIMING[g]
                P = item_pts(it)
                if P[0, 1] < P[-1, 1]: P = P[::-1]            # desenha da base para o topo
                yb = P[:, 1].max(); st_k = st + (1 - (yb - YT) / (YB - YT)) * 0.45 * du
                f = expo_out((i - st_k) / (0.55 * du))
                if f <= 0: continue
                Q = proj(P, h3)
                if it[1] == 'pl' and np.linalg.norm(P[0] - P[-1]) > 1: Q = overshoot(Q, 26)
                if it[1] == 'rect': Q = np.vstack([overshoot(Q[:5], 16), Q[5:]])
                Q = Q + np.repeat(boil_offset(i, 100 + k, len(Q) // 4 + 2, amp), 4, 0)[:len(Q)]
                Q = trim(Q, f)
                if g == 'janela': stroke(c2, Q, wm)
                else: stroke(c, Q, wm if it[1] != 'q' and g != 'frontao' else ws_ + 1.5)
            for k, (bx, by, bw, bh, g) in enumerate(tijolos()):
                st, du = TIMING[g]; f = expo_out((i - st - 0.6 * du - (1 - (by - YT) / (YB - YT)) * 14 - (k % 7)) / 8.)
                if f <= 0: continue
                Q = proj([(bx, by), (bx + bw, by), (bx + bw, by + bh), (bx, by + bh), (bx, by)], h3)
                stroke(c, trim(Q, f), 3.2 * CTRL['espessura'])
            # 6-9 s: linhas de construcao convergem para a janela
            if 144 <= i <= 212:
                e = ease_io((i - 144) / 18.) * (1 - ease_io((i - 176) / 30.))
                if e > 0:
                    x0, y0, x1, y1 = 972, 357, 1030, 455; Lx, Ly = 420 * e, 300 * e
                    for A, B in (((x0 - Lx, y0), (x0, y0)), ((x1 + Lx, y0), (x1, y0)), ((x0 - Lx, y1), (x0, y1)), ((x1 + Lx, y1), (x1, y1)),
                                 ((x0, y0 - Ly), (x0, y0)), ((x1, y0 - Ly), (x1, y0)), ((x0, y1 + Ly), (x0, y1)), ((x1, y1 + Ly), (x1, y1))):
                        stroke(c2, proj([A, B], h3), ws_ * 0.8)
        lin += to_np(s) / NB_MB; lin_jan += to_np(s2) / NB_MB
    # dissolucao final das linhas no papel
    fade = 1 - ease_io((i - 198) / 16.)
    lin *= fade; lin_jan *= fade
    dest = ease_io((i - 144) / 24.)                     # destaque da janela
    glow = cv2.GaussianBlur(lin_jan, (0, 0), 14) * 0.9 * dest + cv2.GaussianBlur(lin_jan, (0, 0), 40) * 0.8 * dest
    allin = np.clip(lin + lin_jan, 0, 1)
    # cor da linha: marrom sobre papel/ceu claro, branca sobre pedra e blocos
    claro = m_ceu * (1 - a_bl) + m_jan * (1 - dest)
    claro = np.clip(cv2.GaussianBlur(claro, (0, 0), 2), 0, 1)
    l_mar = allin * claro; l_bra = allin * (1 - claro)
    comp = mix(comp, MARROM, l_mar)
    comp = mix(comp, BRANCO, np.clip(glow, 0, 1) * 0.55)
    comp = mix(comp, BRANCO, l_bra)

    # ---------- 05_TEXTURAS + 06_GRADE_FINAL
    pp = paper()
    out = comp * pp[..., None]
    rng = np.random.default_rng(i)
    gr = rng.normal(0, 1, (Hh // 2, W // 2)).astype(np.float32)
    gr = cv2.resize(gr, (W, Hh), interpolation=cv2.INTER_LINEAR) * 0.55 + rng.normal(0, 1, (Hh, W)).astype(np.float32) * 0.45
    out = out + (gr * 0.012 * CTRL['grao'])[..., None] * (0.35 + 0.65 * (1 - np.abs(out.mean(-1, keepdims=True) * 2 - 1)))
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32); rr = ((xx / W - .5) ** 2 + (yy / Hh - .5) ** 2) / 0.5
    out = out * (1 - 0.06 * sstep(0.45, 1.0, rr))[..., None]
    out = np.clip(out, 0, 1)
    if layers:
        return dict(final=out, foto=foto, blocos=np.dstack([blocos, a_bl]), traco=np.dstack([np.broadcast_to(MARROM, big.shape), np.clip(hat * .55 + l_mar, 0, 1)]),
                    linhas=np.dstack([np.broadcast_to(BRANCO, big.shape), np.clip(l_bra + glow * .55, 0, 1)]), plano=comp)
    return out

def save(path, img):
    cv2.imwrite(path, cv2.cvtColor((img * 65535 + 0.5).astype(np.uint16), cv2.COLOR_RGB2BGR))

if __name__ == '__main__':
    os.makedirs(f'{R}/out', exist_ok=True)
    for a in sys.argv[1:]:
        i = int(a); save(f'{R}/out/s_{i:04d}.png', render(i)); print('ok', i, flush=True)

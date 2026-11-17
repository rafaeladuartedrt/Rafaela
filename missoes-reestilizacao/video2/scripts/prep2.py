"""Pre-processamento do video 2 (roda uma vez):
- frame limpo (logo com titulo apagado);
- luminancia estabilizada no tempo: media dos vizinhos (i-1, i+1) alinhados por fluxo optico ao frame i,
  so dentro do mesmo plano e so onde o alinhamento confere -> tira o tremido do posterize e do traco;
- mascaras de ceu e vegetacao (so nos planos das ruinas), limpas (sem buracos nem manchas pequenas)
  e tambem suavizadas no tempo pelo mesmo fluxo.
Saidas: work/lum/l_####.png, work/veg/v_####.png, work/ceu/c_####.png (576x1024, 8 bits)."""
import cv2, numpy as np, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import estilo2 as E2
V2 = E2.V2
for d in ('lum', 'veg', 'ceu'): os.makedirs(f'{V2}/work/{d}', exist_ok=True)

def mascaras(bgr, k):
    h, w = bgr.shape[:2]
    if k not in E2.RUINAS: return np.zeros((h, w), np.float32), np.zeros((h, w), np.float32)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV); H, S, V = [hsv[..., c].astype(np.int32) for c in range(3)]
    azul = ((H > 88) & (H < 130) & (S > 30) & (V > 90)) | ((S < 40) & (V > 200))
    azul = cv2.morphologyEx(azul.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(azul, 8); ceu = np.zeros((h, w), np.uint8)
    for j in range(1, n):
        if st[j, cv2.CC_STAT_TOP] < 0.05 * h and st[j, cv2.CC_STAT_AREA] > 0.01 * h * w: ceu[lab == j] = 1
    veg = (((H >= 24) & (H < 90) & (S > 60) & (V > 40)).astype(np.uint8)) * (1 - ceu)
    # limpeza: fecha buracos, tira manchas pequenas, preenche furos pequenos
    veg = cv2.morphologyEx(veg, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
    veg = cv2.morphologyEx(veg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(veg, 8); keep = np.zeros(n, np.uint8); keep[1:] = st[1:, cv2.CC_STAT_AREA] > 0.004 * h * w
    veg = keep[lab]
    inv = 1 - veg; n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 8); fill = np.zeros(n, np.uint8); fill[1:] = st[1:, cv2.CC_STAT_AREA] < 0.002 * h * w
    veg = np.maximum(veg, fill[lab])
    return cv2.GaussianBlur(ceu.astype(np.float32), (0, 0), 2.5), cv2.GaussianBlur(veg.astype(np.float32), (0, 0), 3.0)

def fluxo(a, b):
    """Fluxo de a para b (em 288x512, devolvido em 576x1024)."""
    sa, sb = cv2.resize(a, (288, 512)), cv2.resize(b, (288, 512))
    f = cv2.calcOpticalFlowFarneback((sa * 255).astype(np.uint8), (sb * 255).astype(np.uint8), None, 0.5, 4, 21, 3, 5, 1.1, 0)
    return cv2.resize(f, (576, 1024)) * 2

def alinha(img, flow):
    h, w = flow.shape[:2]; gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(img, gx + flow[..., 0], gy + flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

def dados(i):
    k = E2.plano(i)[0]; bgr = E2.limpa_total(i)
    lum = (cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    c, v = mascaras(bgr, k)
    return k, lum, c, v

if __name__ == '__main__':
    a0, a1 = int(sys.argv[1]), int(sys.argv[2])
    cache = {}
    def get(i):
        if i not in cache: cache[i] = dados(i)
        return cache[i]
    for i in range(a0, a1):
        k, lum, c, v = get(i); acc = [lum * 0.5, c * 0.5, v * 0.5]; wsum = np.full(lum.shape, 0.5, np.float32)
        for j in (i - 1, i + 1):
            if j < 0 or j >= E2.N or E2.plano(j)[0] != k: continue
            kj, lj, cj, vj = get(j); fl = fluxo(lum, lj)
            lw = alinha(lj, fl); ok = (np.abs(lw - lum) < 0.07).astype(np.float32) * 0.25
            ok = cv2.GaussianBlur(ok, (0, 0), 2)
            acc[0] += lw * ok; acc[1] += alinha(cj, fl) * ok; acc[2] += alinha(vj, fl) * ok; wsum += ok
        out = [a / wsum for a in acc]
        cv2.imwrite(f'{V2}/work/lum/l_{i:04d}.png', np.clip(out[0] * 255 + .5, 0, 255).astype(np.uint8))
        cv2.imwrite(f'{V2}/work/ceu/c_{i:04d}.png', np.clip(out[1] * 255 + .5, 0, 255).astype(np.uint8))
        cv2.imwrite(f'{V2}/work/veg/v_{i:04d}.png', np.clip(out[2] * 255 + .5, 0, 255).astype(np.uint8))
        for j in list(cache):
            if j < i - 1: del cache[j]
        print('ok', i, flush=True)

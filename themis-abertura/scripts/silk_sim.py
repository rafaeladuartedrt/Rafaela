"""Seda do telão como tecido em movimento: campo de ondas (altura h) que desloca as dobras
originais e re-ilumina a superfície (luz do alto à esquerda, mesma do feixe).
Cada onda completa n ciclos INTEIROS em 30 s => frame N == frame 0 (loop fechado).
Uso: python3 silk_sim.py <fps> <largura_saida>   (saída a 50% da largura da composição)"""
import sys, os, numpy as np, cv2
fps = int(sys.argv[1]); OUTW = int(sys.argv[2]); T = 30.0; N = int(T * fps)
src = cv2.imread('public/assets/seda_3500.png', cv2.IMREAD_GRAYSCALE).astype(np.float32)
OUTH = round(OUTW * 2000 / 3500)
base = cv2.resize(src, (OUTW, OUTH), interpolation=cv2.INTER_AREA)
k = OUTW / 3500.0                                  # px de saída por px do master
yy, xx = np.mgrid[0:OUTH, 0:OUTW].astype(np.float32)
X, Y = xx / k, yy / k                              # coordenadas em px do master
# (comprimento de onda px master, direção graus, ciclos em 30 s, amplitude, fase)
# ondas correm perpendiculares às dobras (dobras ~horizontais => propagação ~vertical);
# uma onda longa lateral dá o balanço do tecido
WAVES = [(1900, 96, 1, 1.00, 0.0), (1150, 76, 2, 0.50, 1.7), (720, 108, 3, 0.22, 4.1),
         (3400, 8, 1, 0.30, 2.6), (540, 88, 4, 0.08, 0.9)]
L = np.array([-0.62, -0.55]); L = L / np.linalg.norm(L)   # luz vindo do alto à esquerda
DISP = 26.0                                         # deslocamento máx. das dobras (px master)
SHADE = 0.15; SPEC = 0.30
out = f'public/assets/silk{fps}_{OUTW}'; os.makedirs(out, exist_ok=True)
FR = [int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else range(N)
for f in FR:
    t = f / fps
    h = np.zeros_like(X); gx = np.zeros_like(X); gy = np.zeros_like(X)
    for lam, ang, n, a, ph in WAVES:
        dx, dy = np.cos(np.radians(ang)), np.sin(np.radians(ang))
        kk = 2 * np.pi / lam
        arg = kk * (X * dx + Y * dy) - 2 * np.pi * n * t / T + ph
        h += a * np.sin(arg); c = a * kk * np.cos(arg)
        gx += c * dx; gy += c * dy
    gx *= 900; gy *= 900                            # inclinação normalizada (~ -1..1)
    # dobras deslocadas ao longo do gradiente + leve "respiro" para não amostrar fora da borda
    mx = ((X - 1750) * 0.975 + 1750 + DISP * gx) * k
    my = ((Y - 1000) * 0.975 + 1000 + DISP * gy) * k
    warped = cv2.remap(base, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    lit = -(gx * L[0] + gy * L[1])                  # face voltada para a luz => positivo
    shade = 1 + SHADE * np.tanh(lit * 0.9)
    # brilho de seda: realce especular nas faces mais voltadas à luz, puxado pelas dobras claras
    spec = SPEC * np.clip(lit - 0.35, 0, None) ** 2 * np.clip((warped - 38) / 30, 0.15, 1)
    img = warped * shade + spec * 38
    # compressão suave dos realces: seda viva, sem brilho exagerado (realce ~80-95 de 255)
    img = 34 + 62 * np.tanh((img - 34) / 62)
    cv2.imwrite(f'{out}/f{f:04d}.jpg', np.clip(img, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 93])
    if f % 150 == 0: print(f, img.min().round(1), img.max().round(1), img.mean().round(2), flush=True)
print('ok', out, N)

"""Controle de qualidade das entregas. Gera previews/comparativo.jpg e imprime o relatorio."""
import cv2, numpy as np, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
B = '/home/user/Rafaela/missoes-reestilizacao'; R = f'{B}/work'
PAL = {'coral': '#E76847', 'mostarda': '#E7A22B', 'oliva': '#9A9F30', 'laranja': '#BB5108', 'marrom': '#592400', 'branco': '#FFFFFF'}
rgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
rd = lambda p: cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2RGB).astype(np.float32)

# 1) comparativo original x estilizado, 1 frame por segundo
tiles = []
for i in range(0, 240, 24):
    o = cv2.resize(cv2.imread(f'{R}/frames/f_{i:04d}.png'), (640, 360), interpolation=cv2.INTER_AREA)
    s = cv2.resize(cv2.imread(f'{R}/out/s_{i:04d}.png'), (640, 360), interpolation=cv2.INTER_AREA)
    v = cv2.resize(cv2.imread(f'{R}/out_reels_B/s_{i:04d}.png'), (203, 360), interpolation=cv2.INTER_AREA)
    t = np.hstack([o, s, v]); cv2.putText(t, f'{i // 24}s', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 4); cv2.putText(t, f'{i // 24}s', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 36, 89), 2)
    tiles.append(t)
cv2.imwrite(f'{B}/previews/comparativo.jpg', np.vstack([np.hstack(tiles[k:k + 2]) for k in range(0, 10, 2)]), [cv2.IMWRITE_JPEG_QUALITY, 90])
print('comparativo.jpg gerado (original | 16:9 | 9:16, 1 frame por segundo)')

# 2) paleta: amostras de areas chapadas no master (a textura de papel em Multiply escurece ~3 a 7%)
print('\nPALETA (master 4K, mediana de uma area chapada; desvio em relacao ao HEX)')
am = [('mostarda', 20, (600, 300, 760, 420)), ('coral', 120, (1700, 150, 2400, 260)), ('oliva', 120, (300, 1800, 1200, 2000)), ('branco', 230, (1500, 800, 2300, 1300))]
for nome, f, (x0, y0, x1, y1) in am:
    m = np.median(rd(f'{R}/out/s_{f:04d}.png')[y0:y1, x0:x1].reshape(-1, 3), 0); alvo = rgb(PAL[nome])
    print(f'  {nome:9s} alvo {PAL[nome]} -> medido #{int(m[0]):02X}{int(m[1]):02X}{int(m[2]):02X}  razao por canal {np.round(m / np.maximum(alvo, 1), 3)}')

# 3) flicker: areas paradas (ultimo segundo = papel) e diferenca media entre frames consecutivos
print('\nFLICKER (diferenca media absoluta entre frames consecutivos, escala 0-255)')
def dif(pasta, a, b, box=None):
    v = []
    for i in range(a, b):
        p, q = rd(f'{R}/{pasta}/s_{i:04d}.png'), rd(f'{R}/{pasta}/s_{i + 1:04d}.png')
        if box: x0, y0, x1, y1 = box; p, q = p[y0:y1, x0:x1], q[y0:y1, x0:x1]
        v.append(np.abs(p - q).mean())
    return np.mean(v), np.max(v)
print('  16:9 papel final (frames 225-238): media %.2f, pico %.2f  (so grao: esperado ~2 a 3)' % dif('out', 225, 238))
print('  9:16 papel final (frames 225-238): media %.2f, pico %.2f' % dif('out_reels_B', 225, 238))
print('  16:9 ceu, cruz quase parada (frames 60-70, canto sup. direito do ceu): media %.2f, pico %.2f' % dif('out', 60, 70, (1500, 60, 2300, 500)))
picos = [np.abs(rd(f'{R}/out/s_{i:04d}.png')[::4, ::4] - rd(f'{R}/out/s_{i + 1:04d}.png')[::4, ::4]).mean() for i in range(239)]
k = int(np.argmax(picos)); print('  16:9 maior salto entre frames: %.1f no frame %d->%d (mediana %.1f)' % (picos[k], k, k + 1, np.median(picos)))
picos = [np.abs(rd(f'{R}/out_reels_B/s_{i:04d}.png')[::3, ::3] - rd(f'{R}/out_reels_B/s_{i + 1:04d}.png')[::3, ::3]).mean() for i in range(239)]
k = int(np.argmax(picos)); print('  9:16 maior salto entre frames: %.1f no frame %d->%d (mediana %.1f)' % (picos[k], k, k + 1, np.median(picos)))

# 4) banding: degrade do ceu - numero de niveis distintos numa faixa vertical suave
print('\nBANDING (ceu do frame 120, coluna de 40 px: niveis distintos de 8 bits no canal azul)')
col = rd(f'{R}/out/s_0120.png')[20:520, 3000:3040, 2]; print('  niveis distintos:', len(np.unique(col.astype(np.uint8))), '(com grao; faixas chapadas teriam poucos niveis)')

# 5) zona segura do 9:16: a estrutura principal fica entre y=250 e y=1580?
import render as RD, vertical as V
a, tx, ty = V.pista('reels', 'B'); print('\nZONA SEGURA 9:16 (topo 250 px, base 340 px -> area util y de 250 a 1580)')
fora = []
for i in range(240):
    q = RD.fitq(i)
    if q is not None and i < 74:
        y0 = (q[1] + q[3] * (127 - 300)) * a[i] + ty[i]; y1 = (q[1] + q[3] * 100 + q[4] * (751 - 400)) * a[i] + ty[i]
        if y0 < 250 - 2 or y1 > 1580 + 2: fora.append((i, 'cruz', round(y0), round(y1)))
    if 96 <= i <= 150:
        P = cv2.perspectiveTransform(np.array([[[998, 130], [998, 780]]], np.float32), RD.HT[i])[0]; y0 = P[0, 1] * a[i] + ty[i]; y1 = P[1, 1] * a[i] + ty[i]
        if y0 < 250 - 2 or y1 > 1580 + 2: fora.append((i, 'fachada', round(y0), round(y1)))
print('  frames com cruz (0-73) ou fachada (96-150) fora da area util:', len(fora), fora[:6])

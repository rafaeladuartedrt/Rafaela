# Verifica a regra das duas cores: todo pixel deve estar sobre a reta BG-FG (misturas de antialiasing)
# e conta a fração de pixels intermediários (só bordas). Uso: python3 palette_check.py <pasta_png>
import sys, glob, numpy as np
from PIL import Image
BG = np.array([0x28, 0x0A, 0x96], float); FG = np.array([0xD7, 0xED, 0xE3], float)
v = FG - BG; vv = v @ v
worst = 0; report = []
for fp in sorted(glob.glob(sys.argv[1] + '/*.png')):
    x = np.asarray(Image.open(fp).convert('RGB'), float).reshape(-1, 3)
    t = np.clip(((x - BG) @ v) / vv, 0, 1)
    proj = BG + t[:, None] * v
    off = np.linalg.norm(x - proj, axis=1)  # distância fora da reta = terceira cor
    mid = np.mean((t > 0.08) & (t < 0.92))
    bgshare = np.mean(t <= 0.08)
    worst = max(worst, off.max())
    report.append((fp.split('/')[-1], off.max(), mid, bgshare))
for r in report:
    if r[1] > 3 or r[2] > 0.03: print('ATENÇÃO', r)
print(f'quadros: {len(report)} | maior desvio fora da paleta: {worst:.2f} (0-255) | maior fração de pixels de borda: {max(r[2] for r in report)*100:.2f}%')
print('fundo azul presente em todos:', all(r[3] > 0.5 for r in report))

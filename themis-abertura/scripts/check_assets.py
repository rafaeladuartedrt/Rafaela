"""Confere pixel a pixel que logo e troféu aparecem íntegros no frame renderizado.
Compara somente onde o ativo é 100% opaco (borda antisserrilhada mistura com o fundo por definição)."""
import sys, numpy as np
from PIL import Image
def check(frame_png, asset_png, x, y, label):
    F = np.array(Image.open(frame_png).convert('RGB')).astype(int)
    A = np.array(Image.open(asset_png).convert('RGBA')).astype(int)
    h, w = A.shape[:2]
    sub = F[y:y+h, x:x+w]
    m = A[..., 3] == 255
    d = np.abs(sub[m] - A[..., :3][m])
    ident = (d.max(1) == 0).mean() * 100
    print(f'{label}: {m.sum()} px opacos | idênticos: {ident:.4f}% | dif. máx: {d.max()} | dif. média: {d.mean():.4f}')
    return d.max()
a = check(sys.argv[1], 'public/assets/trofeu2.png', 1287, 201, 'TROFÉU')
b = check(sys.argv[2], 'public/assets/logo_3500.png', 0, 0, 'LOGO')
sys.exit(0 if a == 0 and b == 0 else 1)

"""Acumula as subamostras (motion blur) e gera as sequências PNG finais.

Uso: python3 assemble.py <dir_subamostras> <dir_saida>
Saída: <dir_saida>/rgba/NNNN.png (alfa, para o ProRes 4444) e
       <dir_saida>/white/NNNN.png (sobre branco, para os MP4).
A média é feita em alfa pré-multiplicado; quadros sem movimento ficam idênticos.
"""
import os
import re
import sys
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
frames = defaultdict(list)
for d in sorted(os.listdir(src)):
    for f in os.listdir(os.path.join(src, d)):
        m = re.match(r"element-(\d+)\.png$", f)
        if m:
            frames[int(m.group(1))].append(os.path.join(src, d, f))
os.makedirs(os.path.join(dst, "rgba"), exist_ok=True)
os.makedirs(os.path.join(dst, "white"), exist_ok=True)


def build(fr):
    acc = None
    for p in frames[fr]:
        a = np.asarray(Image.open(p).convert("RGBA")).astype(np.float64)
        al = a[..., 3:4] / 255.0
        pm = np.concatenate([a[..., :3] * al, a[..., 3:4]], axis=2)
        acc = pm if acc is None else acc + pm
    acc /= len(frames[fr])
    alpha = acc[..., 3:4]
    with np.errstate(invalid="ignore", divide="ignore"):
        straight = np.where(alpha > 0, acc[..., :3] * 255.0 / alpha, 0)
    rgba = np.concatenate([straight, alpha], axis=2)
    rgba = np.clip(np.rint(rgba), 0, 255).astype(np.uint8)
    white = acc[..., :3] + 255.0 * (1 - alpha / 255.0)
    white = np.clip(np.rint(white), 0, 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(os.path.join(dst, "rgba", f"{fr:04d}.png"), compress_level=1)
    Image.fromarray(white, "RGB").save(os.path.join(dst, "white", f"{fr:04d}.png"), compress_level=1)
    return fr, len(frames[fr])


with ProcessPoolExecutor(4) as ex:
    counts = dict(ex.map(build, sorted(frames)))
print(f"{len(counts)} quadros; amostras por quadro: {sorted(set(counts.values()))}")

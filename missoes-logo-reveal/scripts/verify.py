"""Checagens de entrega: quadro final x original, cores, recortes a 200%.

Uso: python3 verify.py <dir_seq> <pdf_original> <dir_relatorio>
O original é rasterizado por um renderizador independente (poppler/pdftocairo)
exatamente na escala e posição do quadro final.
"""
import json
import math
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

seq, pdf, rep = sys.argv[1:4]
os.makedirs(rep, exist_ok=True)
FORMATS = [("Reveal-3840x2160", 3840, 2160, 1.3), ("Reveal-1920x1080", 1920, 1080, 0.65),
           ("Reveal-1080x1920", 1080, 1920, 0.41), ("Reveal-1080x1080", 1080, 1080, 0.41)]
LOCKUP = (1177.0, 472.625)
PDF_RGB = {  # operadores rg do PDF (DeviceRGB) x 255
    "verde-oliva": (0.604, 0.624, 0.188), "ocre/mostarda": (0.906, 0.635, 0.169),
    "coral": (0.906, 0.408, 0.278), "ferrugem": (0.733, 0.318, 0.031),
    "marrom (títulos)": (0.349, 0.141, 0.0), "marrom (linha inferior)": (0.298, 0.153, 0.059)}
# Pontos (em pt) cujo entorno é cor sólida no original; o raio do patch cabe no traço.
SAMPLES = {"verde-oliva": (252, 254, 4), "ocre/mostarda": (790, 419, 4), "coral": (449, 701, 4),
           "ferrugem": (799, 719, 4), "marrom (títulos)": (1323, 401, 4), "marrom (linha inferior)": (1130, 741, 1.5)}
jsround = lambda v: math.floor(v + 0.5)
out = {}
for cid, W, H, S in FORMATS:
    ox, oy = jsround(W / 2 - LOCKUP[0] * S), jsround(H / 2 - LOCKUP[1] * S)
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["pdftocairo", "-png", "-singlefile", "-r", repr(S * 72), pdf, f"{td}/r"], check=True)
        page = Image.open(f"{td}/r.png").convert("RGB")
    ref = Image.new("RGB", (W, H), (255, 255, 255))
    ref.paste(page, (ox, oy))
    ref = np.asarray(ref).astype(int)
    import pypdfium2 as pdfium  # segundo renderizador independente
    pg = pdfium.PdfDocument(pdf)[0].render(scale=S).to_pil().convert("RGB")
    ref2 = Image.new("RGB", (W, H), (255, 255, 255))
    ref2.paste(pg, (ox, oy))
    ref2 = np.asarray(ref2).astype(int)
    last = np.asarray(Image.open(f"{seq}/{cid}/white/0359.png").convert("RGB")).astype(int)
    hold0 = np.asarray(Image.open(f"{seq}/{cid}/white/0258.png").convert("RGB")).astype(int)
    d = np.abs(last - ref)
    dm = d.max(2)
    ink = (ref < 250).any(2)
    r = {
        "offset_px": [ox, oy], "escala_px_por_pt": S,
        "diff_media_0a255": round(float(d.mean()), 4),
        "diff_max_0a255": int(d.max()),
        "pct_pixels_identicos": round(100 * float((dm == 0).mean()), 3),
        "pct_pixels_diff_ate_2": round(100 * float((dm <= 2).mean()), 3),
        "pct_pixels_diff_maior_8": round(100 * float((dm > 8).mean()), 4),
        "psnr_db": round(float(10 * np.log10(255 ** 2 / max(1e-9, (d ** 2).mean()))), 2),
        "pdfium_diff_media": round(float(np.abs(last - ref2).mean()), 4),
        "pdfium_pct_pixels_diff_ate_2": round(100 * float((np.abs(last - ref2).max(2) <= 2).mean()), 3),
        "pdfium_pct_pixels_diff_maior_32": round(100 * float((np.abs(last - ref2).max(2) > 32).mean()), 4),
        "pct_pixels_diff_maior_32": round(100 * float((dm > 32).mean()), 4),
        "quadros_258_a_359_identicos": bool((hold0 == last).all()),
        "bbox_tinta_final": None, "bbox_tinta_original": None,
    }
    for name, arr in (("bbox_tinta_final", last), ("bbox_tinta_original", ref)):
        ys, xs = np.where((arr < 250).any(2))
        r[name] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    cores = {}
    for k, (px, py, rad) in SAMPLES.items():
        x, y = jsround(ox + px * S), jsround(oy + py * S)
        h = max(0, int(rad * S) - 1)
        patch = last[y - h:y + h + 1, x - h:x + h + 1].reshape(-1, 3)
        uniq = {tuple(map(int, p)) for p in patch}
        exp = tuple(jsround(c * 255) for c in PDF_RGB[k])
        cores[k] = {"esperado_pdf": "#%02X%02X%02X" % exp, "amostrado": ["#%02X%02X%02X" % u for u in sorted(uniq)],
                    "confere": uniq == {exp}}
    r["cores"] = cores
    if cid == "Reveal-3840x2160":
        Image.fromarray(np.clip(dm * 16, 0, 255).astype(np.uint8)).save(f"{rep}/diff_4k_x16.png")
        img = Image.open(f"{seq}/{cid}/white/0359.png")
        img.save(f"{rep}/ultimo_quadro_4k.png")
        crops = {"linhas_igreja": (ox + int(250 * S), oy + int(470 * S)),
                 "cruz": (ox + int(700 * S), oy + int(190 * S)),
                 "padrao_indigena": (ox + int(820 * S), oy + int(560 * S)),
                 "texto_fino_missoes": (ox + int(1100 * S), oy + int(150 * S)),
                 "texto_fino_sao_miguel": (ox + int(1100 * S), oy + int(720 * S)),
                 "borda_blocos": (ox + int(560 * S), oy + int(420 * S))}
        tiles = []
        for name, (x, y) in crops.items():
            c = img.crop((x, y, x + 300, y + 170)).resize((600, 340), Image.NEAREST)
            c.save(f"{rep}/zoom200_{name}.png"); tiles.append(c)
        sheet = Image.new("RGB", (1208, 3 * 348), (60, 60, 60))
        for n, t in enumerate(tiles):
            sheet.paste(t, (4 + (n % 2) * 604, 4 + (n // 2) * 348))
        sheet.save(f"{rep}/zoom200_folha.png")
    out[cid] = r
json.dump(out, open(f"{rep}/verificacao.json", "w"), indent=2, ensure_ascii=False)
print(json.dumps(out, indent=1, ensure_ascii=False))

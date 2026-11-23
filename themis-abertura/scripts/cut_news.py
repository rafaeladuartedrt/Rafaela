"""Recorta as notícias (p6–p12) do fundo branco, a partir das imagens originais (pdfimages):
- manchete_*.png : só o texto, alfa pela tinta (escuro sobre branco), recolorido em branco quente
- notfoto_*.jpg  : a fotografia da matéria isolada, em P&B graduado
Imagens que trazem manchete + foto juntas (n-013, n-014, n-015/16) são separadas pelo
ponto em que começa o bloco fotográfico (linhas majoritariamente não-brancas)."""
import numpy as np
from PIL import Image
R = 'raw/news'; A = 'public/assets'
WARM = np.array([242, 242, 238], np.float32)

def lum(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255
    return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722

def photo_start(im, frac=0.55):
    L = lum(im); dark = (L < 0.85).mean(1)
    rows = np.where(dark > frac)[0]
    # primeira linha que inicia um bloco contínuo de >= 40 linhas "fotográficas"
    for r in rows:
        if (dark[r:r + 40] > frac).all(): return r
    return None

def headline(im, name, crop=None):
    if crop: im = im.crop(crop)
    L = lum(im)
    a = np.clip((0.86 - L) / 0.6, 0, 1) ** 0.85         # tinta -> opacidade
    ys, xs = np.where(a > 0.08)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    out = np.zeros(a.shape + (4,), np.uint8); out[..., :3] = WARM; out[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(out).save(f'{A}/{name}.png'); return out.shape[1], out.shape[0]

def bw(im):
    y = lum(im); y = 0.5 + np.tanh((y - 0.45) * 2.6) / (2 * np.tanh(1.43))
    out = np.array([40, 40, 40.]) * (1 - y[..., None]) + np.array([242, 240, 232.]) * y[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

def photo(im, name, crop=None):
    if crop: im = im.crop(crop)
    # remove margem branca residual
    L = lum(im); m = L < 0.93
    ys, xs = np.where(m); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    bw(im).save(f'{A}/{name}.jpg', quality=94); return im.size

meta = {}
o = lambda n: Image.open(f'{R}/{n}.png').convert('RGB')
meta['manchete6'] = headline(o('n-005'), 'manchete6')          # IA na Justiça
meta['notfoto6'] = photo(o('n-006'), 'notfoto6')
meta['manchete7'] = headline(o('n-009'), 'manchete7')          # Inovação e tecnologia
meta['notfoto7'] = photo(o('n-008'), 'notfoto7')
meta['manchete8'] = headline(o('n-010'), 'manchete8')          # Porto Alegre pós-enchente
meta['manchete9'] = headline(o('n-011'), 'manchete9')          # maus-tratos
meta['notfoto9'] = photo(o('n-012'), 'notfoto9')
for src, k in [('n-013', 10), ('n-014', 11)]:
    im = o(src); s = photo_start(im); print(src, 'foto começa na linha', s, 'de', im.height)
    meta[f'manchete{k}'] = headline(im, f'manchete{k}', (0, 0, im.width, s - 6))
    meta[f'notfoto{k}'] = photo(im, f'notfoto{k}', (0, s, im.width, im.height - 5))
im = o('n-015'); h = im.height
meta['manchete12'] = headline(im, 'manchete12', (0, int(h * 0.08), im.width, int(h * 0.56)))  # título TJ-RS
im = o('n-016'); s2 = photo_start(im, 0.5)
L = lum(im); dark = (L < 0.85).mean(1); end = s2
while end < im.height and dark[end] > 0.5: end += 1
print('n-016 foto', s2, end, im.height)
meta['notfoto12'] = photo(im, 'notfoto12', (0, s2, im.width, end))
import json; json.dump(meta, open(f'{A}/meta_noticias.json', 'w'), indent=1); print(meta)

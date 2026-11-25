"""Arte do troféu (arquivo vertical): a página é composta no PDF por silhueta verde vetorial
+ fotografia dos troféus em Multiply com máscara própria. Rasteriza a PÁGINA pelo renderizador
de PDF (fundo transparente) direto no tamanho de exibição, para a peça aparecer exatamente como
o PDF a desenha, sem reamostragem posterior. Uso: trophy_art.py <pdf> <altura_px> [sufixo]"""
import sys, subprocess, numpy as np
from PIL import Image, ImageFilter
pdf, target = sys.argv[1], int(sys.argv[2]); suf = sys.argv[3] if len(sys.argv) > 3 else ''
A = 'public/assets'; tmp = 'raw/trophy2'
subprocess.run(['pdftocairo', '-png', '-transp', '-r', '40', '-singlefile', pdf, f'{tmp}/bbox40'], check=True)
a = np.array(Image.open(f'{tmp}/bbox40.png'))[..., 3]; ys, _ = np.where(a > 0)
frac = (ys.max() - ys.min() + 1) / a.shape[0]
dpi = target / (frac * 1414.71 / 72)
subprocess.run(['pdftocairo', '-png', '-transp', '-r', str(dpi), '-singlefile', pdf, f'{tmp}/page_display'], check=True)
im = Image.open(f'{tmp}/page_display.png').convert('RGBA'); al = np.array(im)[..., 3]
ys, xs = np.where(al > 0); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
im.save(f'{A}/trofeu2{suf}.png'); al = im.split()[-1]
Image.merge('RGBA', [Image.new('L', im.size, 255)] * 3 + [al]).save(f'{A}/trofeu2{suf}_alpha.png')
pad = 8; a2 = Image.new('L', (im.width + 2 * pad, im.height + 2 * pad), 0); a2.paste(al, (pad, pad))
a2 = a2.point(lambda v: 255 if v > 0 else 0).filter(ImageFilter.MaxFilter(7))
Image.merge('RGBA', [Image.new('L', a2.size, 255)] * 3 + [a2]).save(f'{A}/trofeu2{suf}_exclude.png')
print('trofeu2', im.size, 'dpi', round(dpi, 3), 'escala da foto vs nativa', round(dpi / 162.6, 3))

# placas ilegíveis (pedido do cliente): camada derivada da própria arte, desfocada só nas
# placas, com borda suave. Coordenadas medidas na arte de 926 px de largura (escalam juntas).
k = im.width / 926
PLACAS = [((455, 1140, 757, 1407), 9), ((318, 1022, 445, 1245), 6), ((222, 938, 305, 1125), 4)]
base = im.copy(); over = Image.new('RGBA', im.size, (0, 0, 0, 0)); mtot = Image.new('L', im.size, 0)
for (x0, y0, x1, y1), r in PLACAS:
    box = tuple(int(round(v * k)) for v in (x0, y0, x1, y1))
    blur = base.filter(ImageFilter.GaussianBlur(r * k))
    m = Image.new('L', im.size, 0); m.paste(255, box); m = m.filter(ImageFilter.GaussianBlur(5 * k))
    over = Image.composite(blur, over, m); mtot = Image.composite(m, mtot, m)
# alfa final = alfa da arte desfocada dentro da região, zero fora (a arte original segue embaixo)
o = np.array(over); o[..., 3] = (o[..., 3].astype(np.float32) * np.array(mtot, np.float32) / 255).astype(np.uint8)
Image.fromarray(o).save(f'{A}/trofeu2{suf}_placas.png')
Image.fromarray((np.array(mtot) > 0).astype(np.uint8) * 255).save(f'{tmp}/placas_mask{suf}.png')
print('placas desfocadas:', len(PLACAS))

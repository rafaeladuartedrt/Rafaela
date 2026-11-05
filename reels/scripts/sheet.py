# Monta o contact sheet a partir dos PNGs em out/sheet (com rótulo de tempo e guias da zona segura opcionais)
import sys, glob, os
from PIL import Image, ImageDraw
files = sorted(glob.glob(os.path.join(sys.argv[1], 'f*.png')))
out = sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 10
guides = len(sys.argv) > 4 and sys.argv[4] == 'guides'
w, h = Image.open(files[0]).size
tw, th = (w // 2, h // 2) if (len(files) > 12 and w > 400) else (w, h)
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 26)), (255, 255, 255))
d = ImageDraw.Draw(sheet)
for i, fp in enumerate(files):
    im = Image.open(fp).convert('RGB').resize((tw, th))
    if guides:
        g = ImageDraw.Draw(im); s = th / 1920
        for y in (250, 1500): g.line([(0, y * s), (tw, y * s)], fill=(255, 0, 0))
        g.line([((1080 - 140) * s, 0), ((1080 - 140) * s, th)], fill=(255, 0, 0))
    x, y = (i % cols) * tw, (i // cols) * (th + 26)
    sheet.paste(im, (x, y + 26))
    fr = int(os.path.basename(fp)[1:4])
    d.text((x + 4, y + 6), f'{fr/30:05.2f}s  f{fr}', fill=(0, 0, 0))
sheet.save(out)
print(out, sheet.size)

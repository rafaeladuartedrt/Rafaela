"""Folha de contato: 1 quadro a cada 0,2 s (12 quadros a 60 fps), com rótulo de tempo."""
import sys
from PIL import Image, ImageDraw

seq, out = sys.argv[1], sys.argv[2]
cols, tw = 5, int(sys.argv[3]) if len(sys.argv) > 3 else 640
frames = list(range(0, 360, 12)) + [359]
ims = [Image.open(f"{seq}/{f:04d}.png").convert("RGB") for f in frames]
th = round(tw * ims[0].height / ims[0].width)
rows = -(-len(ims) // cols)
pad, lab = 8, 26
sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + lab + pad) + pad), (40, 40, 40))
d = ImageDraw.Draw(sheet)
for n, (f, im) in enumerate(zip(frames, ims)):
    x, y = pad + (n % cols) * (tw + pad), pad + (n // cols) * (th + lab + pad)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + lab))
    d.text((x + 4, y + 6), f"{f / 60:.2f}s  (quadro {f})", fill=(230, 230, 230))
sheet.save(out)

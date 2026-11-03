#!/usr/bin/env python3
"""Folha de contato: 1 quadro a cada 2 s, com tempo e linhas da area segura do Reels.
Uso: python3 scripts/contact_sheet.py video.mp4 saida.png"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

video, out = sys.argv[1], sys.argv[2]
step, cols, tw = 2, 6, 270
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], text=True))
tmp = tempfile.mkdtemp()
times = [t for t in range(0, int(dur) + 1, step) if t < dur - 0.1]
thumbs = []
for t in times:
    p = os.path.join(tmp, f"{t:03d}.png")
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-ss", str(t + 0.001), "-i", video, "-frames:v", "1", p])
    thumbs.append(Image.open(p).convert("RGB"))
w0, h0 = thumbs[0].size
th = int(tw * h0 / w0)
rows = (len(thumbs) + cols - 1) // cols
lab = 26
sheet = Image.new("RGB", (cols * (tw + 10) + 10, rows * (th + lab + 10) + 10), (40, 40, 42))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
except OSError:
    font = ImageFont.load_default()
portrait = h0 > w0
for i, (t, im) in enumerate(zip(times, thumbs)):
    x = 10 + (i % cols) * (tw + 10)
    y = 10 + (i // cols) * (th + lab + 10)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + lab))
    d.text((x, y + 4), f"{t // 60:02d}:{t % 60:02d}", fill=(230, 230, 230), font=font)
    if portrait:  # area segura: 250 px topo, 350 px base (em 1920)
        for yy in (250 / 1920 * th, th - 350 / 1920 * th):
            d.line([(x, y + lab + yy), (x + tw, y + lab + yy)], fill=(0, 170, 255), width=1)
sheet.save(out)
print(out, sheet.size)

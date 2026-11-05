#!/usr/bin/env python3
"""Compara, pixel a pixel, os quadros da composicao IntegrityCheck (recortes a 100%)
com o PNG sRGB convertido. Gera out/verificacao_pixels.json."""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.load(open(os.path.join(ROOT, "src/generated/manifest.json")))
items = [(aid, c) for aid, a in man["assets"].items() if a["present"] for c in a["crops"]]
frames = sorted(f for f in os.listdir(os.path.join(ROOT, "out/integrity")) if f.endswith(".png"))

def raw(path, w, h, crop=None):
    args = ["convert", path]
    if crop:
        args += ["-crop", "%dx%d+%d+%d" % crop, "+repage"]
    args += ["-depth", "8", "rgb:-"]
    return np.frombuffer(subprocess.check_output(args), np.uint8).reshape(h, w, 3).astype(np.int16)

res, ok = [], True
for (aid, cname), fr in zip(items, frames):
    a, c = man["assets"][aid], man["assets"][aid]["crops"][cname]
    w, h = c["w"], c["h"]
    src = raw(os.path.join(ROOT, "public", a["src"]), w, h, (w, h, c["x"], c["y"]))
    out = raw(os.path.join(ROOT, "out/integrity", fr), w, h, (w, h, 0, 0))
    d = np.abs(src - out)
    r = {"recorte": f"{aid}/{cname}", "px": int(w * h), "identicos_%": round(float((d.max(2) == 0).mean() * 100), 4),
         "dif_max": int(d.max()), "dif_media": round(float(d.mean()), 5)}
    ok &= r["dif_max"] <= 1
    res.append(r)
    print(r)
json.dump(res, open(os.path.join(ROOT, "out/verificacao_pixels.json"), "w"), indent=1, ensure_ascii=False)
sys.exit(0 if ok else 1)

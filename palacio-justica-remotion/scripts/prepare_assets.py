#!/usr/bin/env python3
"""
Prepara o acervo para a animacao.

1. Localiza cada TIF de assets/originais/ pelo nome (campo "match" de assets/crops.json).
2. Converte CMYK -> sRGB com gerenciamento de cor (ICC): usa o perfil embutido no
   arquivo; se nao houver, usa assets/icc/USWebCoatedSWOP.icc. Sem perfil, o script
   PARA (nao existe conversao ingenua de CMYK aqui). Saida: PNG 16 bits em public/img/.
   Os TIFs originais sao apenas lidos (hash SHA-256 conferido antes e depois).
3. Resolve os recortes (fracao -> px) e grava src/generated/manifest.json.
4. Gera os mapas de tempo de revelacao (public/maps/). Os mapas sao imagens auxiliares
   em tons de cinza usadas como mascara; nunca tocam a imagem original.

Uso: python3 scripts/prepare_assets.py
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import unicodedata

import numpy as np
from PIL import Image, ImageCms

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(ROOT, "assets", "originais")
ICC_DIR = os.path.join(ROOT, "assets", "icc")
PUB = os.path.join(ROOT, "public")
IMG_OUT = os.path.join(PUB, "img")
MAP_OUT = os.path.join(PUB, "maps")
GEN = os.path.join(ROOT, "src", "generated")
CROPS = os.path.join(ROOT, "assets", "crops.json")

MAP_MAX = 900          # lado maior dos mapas de revelacao (px)
NOISE_WEIGHT = 0.16    # peso do ruido no mapa (traco "feito a mao")
PLACEHOLDER_LONG = 3000  # tamanho assumido para arquivos pendentes


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().replace("_", " ")


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def find_file(match, files, used):
    for f in files:
        if f in used:
            continue
        n = norm(f)
        if any(norm(m) in n for m in match):
            return f
    return None


def ensure_srgb_icc() -> str:
    path = os.path.join(ICC_DIR, "sRGB.icc")
    if not os.path.exists(path):
        os.makedirs(ICC_DIR, exist_ok=True)
        prof = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB"))
        with open(path, "wb") as f:
            f.write(prof.tobytes())
    return path


def identify(path: str) -> dict:
    out = subprocess.check_output(
        ["identify", "-format", "%w|%h|%[colorspace]|%z|%[profiles]\n", path + "[0]"],
        text=True,
    ).strip().splitlines()[0]
    w, h, cs, depth, profiles = (out.split("|") + [""])[:5]
    return {"w": int(w), "h": int(h), "colorspace": cs, "depth": int(depth),
            "has_icc": "icc" in profiles.lower()}


def convert(src: str, dst: str, info: dict, srgb: str):
    cmd = ["convert", src + "[0]"]
    if info["colorspace"].upper() == "CMYK":
        if not info["has_icc"]:
            swop = os.path.join(ICC_DIR, "USWebCoatedSWOP.icc")
            if not os.path.exists(swop):
                sys.exit(f"ERRO: {os.path.basename(src)} e CMYK sem perfil embutido. "
                         f"Coloque o perfil em {swop} e rode de novo.")
            cmd += ["-profile", swop]
        cmd += ["-intent", "Relative", "-black-point-compensation", "-profile", srgb]
    elif info["has_icc"]:
        cmd += ["-intent", "Relative", "-profile", srgb]
    # Sem gAMA/cHRM: o navegador nao reinterpreta a gama; o iCCP sRGB e mantido.
    cmd += ["-alpha", "off", "-depth", "16",
            "-define", "png:exclude-chunks=gAMA,cHRM,bKGD,tIME,date", dst]
    subprocess.check_call(cmd)


def read16(path: str) -> np.ndarray:
    """Le o PNG 16 bits sem perda (Pillow reduz RGB 16 bits para 8)."""
    w, h = (int(v) for v in subprocess.check_output(["identify", "-format", "%w %h", path], text=True).split())
    raw = subprocess.check_output(["convert", path, "-depth", "16", "rgb:-"])
    return np.frombuffer(raw, ">u2").reshape(h, w, 3)


def smooth_noise(h, w, rng):
    acc = np.zeros((h, w), np.float32)
    amp_total = 0.0
    for cells, amp in ((6, 1.0), (14, 0.5), (32, 0.25)):
        gh = max(2, int(round(cells * h / max(h, w))) + 1)
        gw = max(2, int(round(cells * w / max(h, w))) + 1)
        grid = rng.random((gh, gw)).astype(np.float32)
        img = Image.fromarray((grid * 65535).astype(np.uint16)).resize((w, h), Image.BICUBIC)
        acc += amp * (np.asarray(img).astype(np.float32) / 65535.0)
        amp_total += amp
    acc /= amp_total
    acc = (acc - acc.min()) / max(1e-6, acc.max() - acc.min())
    return acc


def luminance(img16: np.ndarray) -> np.ndarray:
    f = img16.astype(np.float32) / 65535.0
    if f.ndim == 2:
        return f
    lum = 0.2126 * f[..., 0] + 0.7152 * f[..., 1] + 0.0722 * f[..., 2]
    return lum


def save_map(m: np.ndarray, path: str, rng):
    # mapa 0..1 -> 8 bits com pontilhado para evitar faixas na borda da revelacao
    m = (m - m.min()) / max(1e-6, m.max() - m.min())
    dith = (rng.random(m.shape) - rng.random(m.shape)) / 255.0
    q = np.clip((m + dith) * 255.0 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(q, "L").save(path, optimize=True)


def build_maps(asset_id, crop_name, crop_img16, rng):
    h, w = crop_img16.shape[:2]
    k = MAP_MAX / max(h, w)
    mh, mw = max(2, int(round(h * k))), max(2, int(round(w * k)))
    yy, xx = np.mgrid[0:mh, 0:mw].astype(np.float32)
    ny, nx = yy / (mh - 1), xx / (mw - 1)
    noise = smooth_noise(mh, mw, rng)
    # luminancia reduzida (somente para o mapa)
    lum_full = luminance(crop_img16)
    lum = np.asarray(Image.fromarray((lum_full * 65535).astype(np.uint16)).resize((mw, mh), Image.BOX)).astype(np.float32) / 65535.0
    maps = {
        "up": (1 - NOISE_WEIGHT) * (1 - ny) + NOISE_WEIGHT * noise,
        "down": (1 - NOISE_WEIGHT) * ny + NOISE_WEIGHT * noise,
        "right": (1 - NOISE_WEIGHT) * nx + NOISE_WEIGHT * noise,
        "luma": 0.85 * (1 - lum) + 0.15 * noise,
        "luma-up": 0.5 * (1 - lum) + 0.4 * (1 - ny) + 0.1 * noise,
    }
    out = {}
    for name, m in maps.items():
        fn = f"{asset_id}__{crop_name}__{name}.png"
        save_map(m, os.path.join(MAP_OUT, fn), rng)
        out[name] = f"maps/{fn}"
    return out


def resolve_rect(c, W, H):
    if "rect" in c:
        return [int(v) for v in c["rect"]]
    fx, fy, fw, fh = c["frac"]
    return [int(round(fx * W)), int(round(fy * H)), int(round(fw * W)), int(round(fh * H))]


def resolve_sub(obj, cw, ch, frac_mode):
    """Converte blocks/focus de fracao do recorte para px do recorte."""
    if obj is None:
        return None
    if "rect" in obj:
        return {"rect": obj["rect"]}
    if "frac" in obj:
        fx, fy, fw, fh = obj["frac"]
        return {"rect": [fx * cw, fy * ch, fw * cw, fh * ch]}
    if "poly" in obj:
        return {"poly": obj["poly"]}
    if "polyFrac" in obj:
        return {"poly": [[x * cw, y * ch] for x, y in obj["polyFrac"]]}
    return obj


def main():
    with open(CROPS) as f:
        spec = json.load(f)
    for d in (IMG_OUT, MAP_OUT, GEN):
        os.makedirs(d, exist_ok=True)
    srgb = ensure_srgb_icc()
    files = sorted(f for f in os.listdir(ORIG) if f.lower().endswith((".tif", ".tiff"))) if os.path.isdir(ORIG) else []
    used = set()
    rng = np.random.default_rng(20261103)
    manifest = {"assets": {}, "optional": {}}
    report = []

    for aid, a in spec["assets"].items():
        fname = find_file(a["match"], files, used)
        entry = {"item": a["item"], "file": a["file"], "present": False, "crops": {}}
        if fname:
            used.add(fname)
            src = os.path.join(ORIG, fname)
            before = sha256(src)
            info = identify(src)
            dst = os.path.join(IMG_OUT, f"{aid}.png")
            if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
                convert(src, dst, info, srgb)
            web = os.path.join(IMG_OUT, f"{aid}_web8.png")
            if not os.path.exists(web) or os.path.getmtime(web) < os.path.getmtime(dst):
                # copia de exibicao 8 bits (o navegador decodifica em 8 bits; assim o
                # arredondamento e deterministico e verificavel pixel a pixel)
                subprocess.check_call(["convert", dst, "-depth", "8", "-define", "png:exclude-chunks=gAMA,cHRM,bKGD,tIME,date", web])
            after = sha256(src)
            assert before == after, f"TIF original foi alterado: {fname}"
            W, H = info["w"], info["h"]
            img16 = read16(dst)
            entry.update(present=True, sourceFile=fname, sha256=before, w=W, h=H,
                         src=f"img/{aid}_web8.png", master16=f"img/{aid}.png", colorspace=info["colorspace"],
                         iccEmbedded=info["has_icc"])
            report.append(f"[ok] item {a['item']:>2} {fname}  {W}x{H}  {info['colorspace']}  ICC embutido={info['has_icc']}")
        else:
            if "native" in a:
                W, H = a["native"]
            else:
                ar = a.get("estimatedAspect", 1.4)
                W, H = (PLACEHOLDER_LONG, int(PLACEHOLDER_LONG / ar)) if ar >= 1 else (int(PLACEHOLDER_LONG * ar), PLACEHOLDER_LONG)
            entry.update(w=W, h=H, estimated=True)
            img16 = None
            report.append(f"[--] item {a['item']:>2} PENDENTE: {a['file']}")

        for cname, c in a["crops"].items():
            x, y, w, h = resolve_rect(c, W, H)
            x, y = max(0, x), max(0, y)
            w, h = min(w, W - x), min(h, H - y)
            ce = {"x": x, "y": y, "w": w, "h": h, "reveal": c.get("reveal")}
            frac_mode = "frac" in c
            ce["blocks"] = {k: resolve_sub(v, w, h, frac_mode) for k, v in c.get("blocks", {}).items()}
            ce["focus"] = {k: ([v[0] * w, v[1] * h] if frac_mode else v) for k, v in c.get("focus", {}).items()}
            if img16 is not None:
                ce["maps"] = build_maps(aid, cname, img16[y:y + h, x:x + w], rng)
            entry["crops"][cname] = ce
        manifest["assets"][aid] = entry

    for key, rel in {"trilha": "audio/trilha.mp3", "lapis": "audio/lapis.mp3",
                     "logo": "assets/logo_tjrs.png", "orbita": "assets/orbita.mp4"}.items():
        manifest["optional"][key] = rel if os.path.exists(os.path.join(PUB, rel)) else None

    with open(os.path.join(GEN, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
    extra = [f for f in files if f not in used]
    print("\n".join(report))
    if extra:
        print("Arquivos nao identificados (conferir nomes em crops.json):", extra)
    print("Opcionais:", manifest["optional"])


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Reels 30s — App Adoção TJRS
Python + Pillow + MoviePy 2.x + NumPy
Output: /mnt/user-data/outputs/reels_30s_adocao.mp4
"""

import os, math, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import ImageClip, AudioFileClip, CompositeVideoClip, concatenate_videoclips
from moviepy import AudioArrayClip

# ── Constants ─────────────────────────────────────────────────────────────────
W, H   = 1080, 1920
FPS    = 30
TOTAL  = 30.0
OUT    = "/mnt/user-data/outputs/reels_30s_adocao.mp4"

BG      = "#E8F5F0"
BLUE    = "#1A1A4E"
ORANGE  = "#E85D1A"
WHITE   = "#FFFFFF"
GREEN   = "#4CAF50"

def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

BG_RGB     = hex2rgb(BG)
BLUE_RGB   = hex2rgb(BLUE)
ORANGE_RGB = hex2rgb(ORANGE)
WHITE_RGB  = hex2rgb(WHITE)
GREEN_RGB  = hex2rgb(GREEN)

SR = 44100  # sample rate

# ── Font helpers ──────────────────────────────────────────────────────────────
def load_font(size, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: pass
    return ImageFont.load_default()

# ── Easing ────────────────────────────────────────────────────────────────────
def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def bounce(t):
    t = max(0.0, min(1.0, t))
    return 1 - abs(math.sin(t * math.pi)) * (1 - t) ** 1.5

# ── Drawing primitives ────────────────────────────────────────────────────────
def new_frame(bg=BG_RGB):
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)

def draw_text_centered(draw, text, y, font, color, shadow=False):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (W - tw) // 2
    if shadow:
        draw.text((x+3, y+3), text, font=font, fill=(0,0,0,60))
    draw.text((x, y), text, font=font, fill=color)
    return tw, bbox[3] - bbox[1]

def draw_text_at(draw, text, x, y, font, color):
    draw.text((x, y), text, font=font, fill=color)

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

# ── Child illustration (cartoon outline) ─────────────────────────────────────
def draw_child(draw, cx, cy, scale=1.0, skin="#C68642", facing="front", with_family=False):
    s = scale
    sk = hex2rgb(skin)
    bl = BLUE_RGB
    # body
    bw = int(60*s); bh = int(80*s)
    draw.rectangle([cx-bw//2, cy-bh//2, cx+bw//2, cy+bh//2], fill=hex2rgb("#4A90D9"), outline=bl, width=max(1,int(3*s)))
    # head
    hr = int(45*s)
    draw.ellipse([cx-hr, cy-bh//2-hr*2, cx+hr, cy-bh//2], fill=sk, outline=bl, width=max(1,int(3*s)))
    # eyes
    ey = cy - bh//2 - hr + int(25*s)
    ex_off = int(14*s)
    er = max(2, int(5*s))
    draw.ellipse([cx-ex_off-er, ey-er, cx-ex_off+er, ey+er], fill=bl)
    draw.ellipse([cx+ex_off-er, ey-er, cx+ex_off+er, ey+er], fill=bl)
    # hair
    draw.ellipse([cx-hr, cy-bh//2-hr*2, cx+hr, cy-bh//2-hr+int(20*s)], fill=hex2rgb("#3D2B1F"), outline=bl, width=max(1,int(2*s)))
    # legs
    lw = int(18*s); lh = int(50*s)
    draw.rectangle([cx-bw//2+int(5*s), cy+bh//2, cx-bw//2+lw+int(5*s), cy+bh//2+lh], fill=sk, outline=bl, width=max(1,int(2*s)))
    draw.rectangle([cx+bw//2-lw-int(5*s), cy+bh//2, cx+bw//2-int(5*s), cy+bh//2+lh], fill=sk, outline=bl, width=max(1,int(2*s)))
    # arms
    aw = int(55*s); ah = int(16*s)
    draw.rectangle([cx-bw//2-aw, cy-bh//2+int(10*s), cx-bw//2, cy-bh//2+int(10*s)+ah], fill=sk, outline=bl, width=max(1,int(2*s)))
    draw.rectangle([cx+bw//2, cy-bh//2+int(10*s), cx+bw//2+aw, cy-bh//2+int(10*s)+ah], fill=sk, outline=bl, width=max(1,int(2*s)))

def draw_adult(draw, cx, cy, scale=1.0, skin="#F5CBA7", side="left"):
    s = scale
    sk = hex2rgb(skin)
    bl = BLUE_RGB
    bw = int(70*s); bh = int(110*s)
    draw.rectangle([cx-bw//2, cy-bh//2, cx+bw//2, cy+bh//2], fill=hex2rgb("#2E6B3E"), outline=bl, width=max(1,int(3*s)))
    hr = int(55*s)
    draw.ellipse([cx-hr, cy-bh//2-hr*2, cx+hr, cy-bh//2], fill=sk, outline=bl, width=max(1,int(3*s)))
    ey = cy - bh//2 - hr + int(32*s)
    ex_off = int(17*s); er = max(2, int(6*s))
    draw.ellipse([cx-ex_off-er, ey-er, cx-ex_off+er, ey+er], fill=bl)
    draw.ellipse([cx+ex_off-er, ey-er, cx+ex_off+er, ey+er], fill=bl)
    draw.ellipse([cx-hr, cy-bh//2-hr*2, cx+hr, cy-bh//2-hr+int(28*s)], fill=hex2rgb("#1A0A00"), outline=bl, width=max(1,int(2*s)))
    lw = int(22*s); lh = int(70*s)
    draw.rectangle([cx-bw//2+int(6*s), cy+bh//2, cx-bw//2+lw+int(6*s), cy+bh//2+lh], fill=sk, outline=bl, width=max(1,int(2*s)))
    draw.rectangle([cx+bw//2-lw-int(6*s), cy+bh//2, cx+bw//2-int(6*s), cy+bh//2+lh], fill=sk, outline=bl, width=max(1,int(2*s)))
    aw = int(65*s); ah = int(20*s)
    draw.rectangle([cx-bw//2-aw, cy-bh//2+int(14*s), cx-bw//2, cy-bh//2+int(14*s)+ah], fill=sk, outline=bl, width=max(1,int(2*s)))
    draw.rectangle([cx+bw//2, cy-bh//2+int(14*s), cx+bw//2+aw, cy-bh//2+int(14*s)+ah], fill=sk, outline=bl, width=max(1,int(2*s)))

def draw_dandelion_particles(draw, seed, n=18, alpha_base=120):
    rng = np.random.default_rng(seed)
    for i in range(n):
        px = int(rng.integers(50, W-50))
        py = int(rng.integers(50, H-50))
        r = int(rng.integers(3, 8))
        draw.ellipse([px-r, py-r, px+r, py+r], fill=(255,255,255))

def draw_rs_map_icon(draw, cx, cy, size=120):
    # Simplified RS state outline as polygon
    pts = [
        (cx, cy-size//2),
        (cx+size//3, cy-size//3),
        (cx+size//2, cy),
        (cx+size//3, cy+size//3),
        (cx, cy+size//2),
        (cx-size//3, cy+size//3),
        (cx-size//2, cy),
        (cx-size//3, cy-size//3),
    ]
    draw.polygon(pts, outline=WHITE_RGB, fill=None, width=4)
    draw.ellipse([cx-8, cy-8, cx+8, cy+8], fill=ORANGE_RGB)

def draw_smartphone(draw, cx, cy, w=200, h=360):
    draw_rounded_rect(draw, [cx-w//2, cy-h//2, cx+w//2, cy+h//2], 24, BLUE_RGB, WHITE_RGB, 4)
    sw = w - 24; sh = h - 60
    draw_rounded_rect(draw, [cx-sw//2, cy-sh//2, cx+sw//2, cy+sh//2], 8, (230,240,255))
    # home button
    draw.ellipse([cx-12, cy+h//2-35, cx+12, cy+h//2-11], fill=(100,120,160))

def draw_icon_download(draw, cx, cy, size=32, color=ORANGE_RGB):
    # arrow down + tray
    draw.line([(cx, cy-size//2), (cx, cy+size//4)], fill=color, width=4)
    draw.polygon([(cx-size//3, cy), (cx+size//3, cy), (cx, cy+size//2)], fill=color)
    draw.line([(cx-size//2, cy+size//2), (cx+size//2, cy+size//2)], fill=color, width=4)

def draw_icon_search(draw, cx, cy, size=32, color=ORANGE_RGB):
    r = size//2
    draw.ellipse([cx-r, cy-r, cx+r//2, cy+r//2], outline=color, width=4)
    draw.line([(cx+r//3, cy+r//3), (cx+r, cy+r)], fill=color, width=4)

def draw_icon_heart(draw, cx, cy, size=32, color=ORANGE_RGB, scale=1.0):
    s = int(size * scale)
    pts = []
    for angle in range(0, 360, 5):
        rad = math.radians(angle)
        hx = s * (16 * math.sin(rad)**3) / 16
        hy = -s * (13*math.cos(rad) - 5*math.cos(2*rad) - 2*math.cos(3*rad) - math.cos(4*rad)) / 16
        pts.append((cx + hx, cy + hy))
    if len(pts) > 2:
        draw.polygon(pts, fill=color)

# ── Audio generators ──────────────────────────────────────────────────────────
def sine(freq, dur, amp=0.4):
    t = np.linspace(0, dur, int(SR*dur), endpoint=False)
    return (amp * np.sin(2*np.pi*freq*t)).astype(np.float32)

def decay_envelope(n, tau=0.05):
    t = np.linspace(0, 1, n)
    return np.exp(-t / max(tau, 1e-6)).astype(np.float32)

def adsr(n, a=0.01, d=0.02, s_level=0.6, r=0.05):
    env = np.ones(n, dtype=np.float32)
    sr_n = SR
    ai = int(a*sr_n); di = int(d*sr_n); ri = int(r*sr_n)
    if ai > 0: env[:ai] = np.linspace(0, 1, ai)
    if di > 0 and ai+di < n: env[ai:ai+di] = np.linspace(1, s_level, di)
    if ai+di < n: env[ai+di:max(ai+di, n-ri)] = s_level
    if ri > 0 and n-ri >= 0: env[n-ri:] = np.linspace(s_level, 0, ri)
    return env

def make_pop(freq=440, dur=0.08):
    n = int(SR*dur)
    s = sine(freq, dur, amp=0.35)[:n]
    return s * adsr(n, a=0.005, d=0.02, s_level=0.3, r=0.05)

def make_whoosh(dur=0.15, amp=0.25):
    n = int(SR*dur)
    noise = np.random.uniform(-1, 1, n).astype(np.float32)
    # simple low-pass via cumsum approximation
    lp = np.cumsum(noise) / np.arange(1, n+1) * 20
    lp = np.clip(lp, -1, 1)
    env = np.hanning(n).astype(np.float32)
    return lp * env * amp

def make_ping(freq=880, dur=0.06):
    n = int(SR*dur)
    s = sine(freq, dur, amp=0.4)[:n]
    return s * decay_envelope(n, tau=0.03)

def make_thump(freq=70, dur=0.18, amp=0.5):
    n = int(SR*dur)
    s = sine(freq, dur, amp=amp)[:n]
    return s * decay_envelope(n, tau=0.06)

def make_chord(freqs=(261, 329, 392), dur=1.5, amp=0.2):
    n = int(SR*dur)
    s = np.zeros(n, dtype=np.float32)
    for f in freqs:
        s += sine(f, dur, amp=amp)[:n]
    fade = np.linspace(1, 0, n).astype(np.float32)
    return s * fade

def make_ambient(freq=220, dur=6.0, amp=0.05):
    n = int(SR*dur)
    s = sine(freq, dur, amp=amp)[:n]
    fade_in = np.linspace(0, 1, min(n, int(SR*1.5))).astype(np.float32)
    s[:len(fade_in)] *= fade_in
    return s

def samples_to_audio_array(samples, duration):
    target = int(SR * duration)
    if len(samples) < target:
        samples = np.concatenate([samples, np.zeros(target - len(samples), dtype=np.float32)])
    else:
        samples = samples[:target]
    stereo = np.column_stack([samples, samples])
    return stereo

def make_silence(duration):
    n = int(SR * duration)
    return np.column_stack([np.zeros(n, dtype=np.float32), np.zeros(n, dtype=np.float32)])

# ── Voiceover via espeak ──────────────────────────────────────────────────────
def make_voiceover(text, out_wav):
    subprocess.run([
        "espeak", "-v", "pt+f3", "-s", "148", "-p", "55",
        "-w", out_wav, text
    ], check=True, capture_output=True)

# ── Frame builders ────────────────────────────────────────────────────────────
def build_frame_c1(t, dur=6.0):
    """Cena 1: gancho emocional — criança espera"""
    img, draw = new_frame(BG_RGB)
    # dandelion particles (static seed varies slightly with time)
    seed_offset = int(t * 2)
    draw_dandelion_particles(draw, seed=42 + seed_offset % 3, n=20)
    # breathing child: scale oscillates
    breath = 1.0 + 0.03 * math.sin(2 * math.pi * t / 3.0)
    child_cx, child_cy = W//2, H//2 + 80
    draw_child(draw, child_cx, child_cy, scale=breath * 1.4, skin="#C68642")

    # Text blocks appear progressively
    blocks = [
        ("Uma criança",  BLUE_RGB,   160, 0.5),
        ("espera por",   ORANGE_RGB, 160, 1.2),
        ("uma família...", BLUE_RGB, 140, 2.0),
    ]
    f_big  = load_font(120, bold=True)
    f_med  = load_font(100, bold=True)
    y_start = 180
    for i, (txt, color, size, start) in enumerate(blocks):
        if t < start:
            break
        progress = smoothstep(min(1.0, (t - start) / 0.3))
        alpha_val = int(255 * progress)
        scale_val = 0.6 + 0.4 * bounce(min(1.0, (t - start) / 0.25))
        font = load_font(int(size * scale_val), bold=True)
        # fade approximation via lighter color blend
        r = int(color[0] + (BG_RGB[0]-color[0]) * (1-progress))
        g = int(color[1] + (BG_RGB[1]-color[1]) * (1-progress))
        b = int(color[2] + (BG_RGB[2]-color[2]) * (1-progress))
        draw_text_centered(draw, txt, y_start + i*190, font, (r,g,b))

    return np.array(img)

def build_frame_c2(t, dur=6.0):
    """Cena 2: dado impactante — 3º estado"""
    progress_scene = smoothstep(min(1.0, t / 0.35))
    # bg transition dark
    bg_r = int(BG_RGB[0] + (BLUE_RGB[0]-BG_RGB[0]) * progress_scene)
    bg_g = int(BG_RGB[1] + (BLUE_RGB[1]-BG_RGB[1]) * progress_scene)
    bg_b = int(BG_RGB[2] + (BLUE_RGB[2]-BG_RGB[2]) * progress_scene)
    img, draw = new_frame((bg_r, bg_g, bg_b))

    # "3º" number entry
    num_start = 0.4
    if t >= num_start:
        np_ = min(1.0, (t - num_start) / 0.35)
        sc = 1.2 * bounce(np_) if np_ < 1 else 1.0
        font_num = load_font(int(260 * sc), bold=True)
        draw_text_centered(draw, "3º", 180, font_num, ORANGE_RGB)

    # Text lines
    lines = [
        ("O RS é o 3º estado do Brasil", 1.0, WHITE_RGB, 70, True),
        ("em crianças disponíveis para adoção", 1.6, WHITE_RGB, 60, False),
        ("e em pretendentes habilitados.", 2.1, WHITE_RGB, 60, False),
        ("Fonte: SNA, 2026", 2.6, ORANGE_RGB, 48, False),
    ]
    y = 600
    for txt, start, color, size, bold in lines:
        if t < start: break
        p = smoothstep(min(1.0, (t - start) / 0.3))
        dy = int(40 * (1 - p))
        font = load_font(size, bold=bold)
        blend = tuple(int(color[i] + (bg_r if i==0 else bg_g if i==1 else bg_b) * (1-p) / 255 * 255) for i in range(3))
        draw_text_centered(draw, txt, y + dy, font, color)
        y += size + 30

    # RS map icon fade in
    if t >= 2.0:
        map_alpha = smoothstep(min(1.0, (t - 2.0) / 0.4))
        if map_alpha > 0.05:
            draw_rs_map_icon(draw, W//2 + 350, H//2 + 200, size=int(130 * map_alpha))

    return np.array(img)

def build_frame_c3(t, dur=7.0):
    """Cena 3: app passo a passo"""
    img, draw = new_frame(BG_RGB)

    # Smartphone slides in from bottom
    phone_start = 0.0
    phone_target_cy = H//2
    phone_entry = smoothstep(min(1.0, t / 0.5))
    phone_cy = int(H + 200 - (H + 200 - phone_target_cy) * phone_entry)
    draw_smartphone(draw, W//2, phone_cy, w=220, h=390)

    # Character inside phone: simple two figures approach
    if t > 0.3:
        inner_prog = min(1.0, (t - 0.3) / 1.0)
        child_x = int(W//2 - 40 + 30 * inner_prog)
        adult_x = int(W//2 + 80 - 30 * inner_prog)
        screen_cy = phone_cy
        draw_child(draw, child_x, screen_cy, scale=0.45, skin="#C68642")
        draw_adult(draw, adult_x, screen_cy, scale=0.5, skin="#F5CBA7")

    # Steps
    steps = [
        (1, "Baixe o App Adoção",      draw_icon_download, 1.0),
        (2, "Conheça os perfis",        draw_icon_search,   1.8),
        (3, "Manifeste interesse",      draw_icon_heart,    2.6),
    ]
    step_x = 80
    step_ys = [H//2 + 300, H//2 + 460, H//2 + 620]
    connector_x = step_x + 24

    f_step = load_font(56, bold=True)
    # Draw connecting line progressively
    if t >= 1.0:
        line_prog = smoothstep(min(1.0, (t - 1.0) / 2.2))
        line_end_y = int(step_ys[0] + (step_ys[2] - step_ys[0]) * line_prog)
        if line_end_y > step_ys[0]:
            draw.line([(connector_x, step_ys[0]), (connector_x, line_end_y)], fill=ORANGE_RGB, width=4)

    for num, label, icon_fn, start in steps:
        if t < start: continue
        p = smoothstep(min(1.0, (t - start) / 0.3))
        sy = step_ys[num-1]
        # circle
        cr = 28
        cx_c = step_x + cr
        draw.ellipse([cx_c-int(cr*p), sy-int(cr*p), cx_c+int(cr*p), sy+int(cr*p)], fill=ORANGE_RGB)
        fn = load_font(int(36*p), bold=True)
        draw_text_at(draw, str(num), cx_c - int(11*p), sy - int(18*p), fn, WHITE_RGB)
        # icon
        icon_fn(draw, cx_c + 80, sy, size=30, color=BLUE_RGB)
        # label
        draw_text_at(draw, label, cx_c + 120, sy - 28, f_step, BLUE_RGB)

    return np.array(img)

def build_frame_c4(t, dur=6.0):
    """Cena 4: perfis que mais precisam"""
    img, draw = new_frame(BG_RGB)

    # Split screen
    split_prog = smoothstep(min(1.0, t / 0.4))
    left_w = int(W//2 * split_prog)

    # Left panel: dark blue
    if left_w > 0:
        draw.rectangle([0, 0, left_w, H], fill=BLUE_RGB)
    # Right panel: orange
    right_x = W // 2
    draw.rectangle([right_x, 0, W, H], fill=ORANGE_RGB)

    # Right text
    text_lines = [
        "A maioria",
        "são adolescentes,",
        "grupos de irmãos",
        "ou jovens com",
        "deficiência.",
    ]
    f_right = load_font(70, bold=True)
    ty = 300
    for i, line in enumerate(text_lines):
        start = 0.5 + i * 0.3
        if t >= start:
            p = smoothstep(min(1.0, (t - start) / 0.3))
            blend_r = int(255 * p)
            blend_g = int(255 * p)
            blend_b = int(255 * p)
            draw_text_at(draw, line, right_x + 30, ty + i*90, f_right, (blend_r, blend_g, blend_b))

    # Left illustrations: adolescent, siblings, wheelchair child
    illusts = [
        (0.6, "#8B6914"),
        (1.0, "#C68642"),
        (1.4, "#F5CBA7"),
    ]
    cx_left = W // 4
    icy_positions = [H//2 - 200, H//2, H//2 + 200]
    for i, (start, skin) in enumerate(illusts):
        if t >= start:
            p = bounce(min(1.0, (t - start) / 0.4))
            draw_child(draw, cx_left, icy_positions[i], scale=0.75 * p, skin=skin)

    # Heart pulse at end
    if t >= 4.5:
        hp = (t - 4.5) / 0.4
        pulse_sc = 1.0 + 0.3 * abs(math.sin(hp * math.pi))
        draw_icon_heart(draw, W//2, H - 300, size=60, color=ORANGE_RGB, scale=pulse_sc)
        f_cta = load_font(72, bold=True)
        draw_text_centered(draw, "Eles esperam por", H - 240, f_cta, BLUE_RGB)
        draw_text_centered(draw, "uma chance.", H - 155, f_cta, BLUE_RGB)

    return np.array(img)

def build_frame_c5(t, dur=5.0):
    """Cena 5: CTA final"""
    img, draw = new_frame(BG_RGB)
    draw_dandelion_particles(draw, seed=99 + int(t), n=22)

    # Family group (child + 2 adults)
    fam_prog = bounce(min(1.0, t / 0.5))
    fam_cy = H//2 - 50
    if fam_prog > 0.05:
        draw_adult(draw, W//2 - 200, fam_cy, scale=fam_prog * 1.1, skin="#F5CBA7")
        draw_child(draw, W//2, fam_cy + 80, scale=fam_prog * 1.0, skin="#C68642")
        draw_adult(draw, W//2 + 200, fam_cy, scale=fam_prog * 1.1, skin="#8B6914")

    # Pulsing heart above
    if t > 0.3:
        hpulse = 1.0 + 0.08 * math.sin(t * 3 * math.pi)
        draw_icon_heart(draw, W//2, fam_cy - 280, size=70, color=ORANGE_RGB, scale=hpulse)

    # Text
    texts = [
        ("Deixa o amor",    BLUE_RGB,   140, 0.6),
        ("te surpreender.", ORANGE_RGB, 140, 1.1),
    ]
    f_cta_big = load_font(130, bold=True)
    ty_cta = H//2 + 280
    for txt, color, size, start in texts:
        if t >= start:
            p = smoothstep(min(1.0, (t - start) / 0.3))
            dy = int(40 * (1-p))
            font = load_font(int(size * (0.6 + 0.4*p)), bold=True)
            draw_text_centered(draw, txt, ty_cta + dy, font, color)
            ty_cta += 170

    # Badge
    if t >= 2.0:
        bp = smoothstep(min(1.0, (t - 2.0) / 0.4))
        badge_h = int(110 * bp)
        if badge_h > 10:
            by = H - 160
            draw_rounded_rect(draw, [80, by, W-80, by+badge_h], 18, BLUE_RGB)
            if bp > 0.5:
                f_badge = load_font(48, bold=False)
                draw_text_centered(draw, "@adocaotjrs  |  tjrs.jus.br/app-adocao", by + badge_h//2 - 24, f_badge, WHITE_RGB)

    return np.array(img)

# ── Build full audio track ────────────────────────────────────────────────────
def build_audio(vo_paths):
    """Mix voiceovers + SFX into a 30s stereo float32 array."""
    total_n = int(SR * TOTAL)
    mix = np.zeros(total_n, dtype=np.float32)

    def place(arr, t_sec, vol=1.0):
        start = int(t_sec * SR)
        end = start + len(arr)
        if end > total_n: end = total_n; arr = arr[:end-start]
        if start < total_n:
            mix[start:end] += arr[:end-start] * vol

    # Ambient background
    place(make_ambient(220, TOTAL, amp=0.04), 0)

    # Scene 1 SFX: pops per text block
    place(make_pop(440, 0.08), 0.5, 0.4)
    place(make_pop(440, 0.08), 1.2, 0.4)
    place(make_pop(440, 0.08), 2.0, 0.4)

    # Scene 2: whoosh transition + bass
    place(make_whoosh(0.15), 6.0, 0.6)
    place(make_thump(80, 0.2), 6.4, 0.7)

    # Scene 3: swipes + ping
    place(make_whoosh(0.04), 12.0, 0.4)
    for ts in [13.0, 13.8, 14.6]:
        place(make_pop(330, 0.04), ts, 0.35)
    place(make_ping(880, 0.06), 15.2, 0.5)

    # Scene 4: pops per illustration + heart thump
    for ts in [19.6, 20.0, 20.4]:
        place(make_pop(330, 0.06), ts, 0.3)
    place(make_thump(60, 0.18), 24.5, 0.6)

    # Scene 5: whoosh + chord
    place(make_whoosh(0.15), 25.0, 0.5)
    place(make_chord((261, 329, 392), 1.5, amp=0.18), 28.0, 0.7)

    # Voiceovers
    vo_times = [0.3, 6.5, 12.2, 19.3, 25.3]
    for vo_path, t_sec in zip(vo_paths, vo_times):
        if os.path.exists(vo_path):
            try:
                from scipy.io import wavfile
                rate, data = wavfile.read(vo_path)
                if data.dtype == np.int16:
                    data = data.astype(np.float32) / 32768.0
                elif data.dtype == np.int32:
                    data = data.astype(np.float32) / 2147483648.0
                if data.ndim > 1:
                    data = data.mean(axis=1)
                if rate != SR:
                    # simple resample
                    ratio = SR / rate
                    new_len = int(len(data) * ratio)
                    data = np.interp(np.linspace(0, len(data)-1, new_len), np.arange(len(data)), data).astype(np.float32)
                place(data, t_sec, vol=0.85)
            except Exception as e:
                print(f"Warning: could not load VO {vo_path}: {e}")

    # Normalize
    peak = np.max(np.abs(mix))
    if peak > 0.9:
        mix = mix * (0.9 / peak)

    stereo = np.column_stack([mix, mix])
    return stereo

# ── Main render ───────────────────────────────────────────────────────────────
def render():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmpdir = tempfile.mkdtemp()

    print("Generating voiceovers...")
    vo_texts = [
        "Uma criança espera por uma família.",
        "O Rio Grande do Sul é o terceiro estado do Brasil em crianças disponíveis para adoção.",
        "O TJRS criou o App Adoção. Baixe, conheça os perfis e manifeste seu interesse diretamente pelo celular.",
        "A maioria das crianças disponíveis são adolescentes, grupos de irmãos ou jovens com deficiência. Eles esperam por uma chance.",
        "Deixa o amor te surpreender. Baixe o App Adoção.",
    ]
    vo_paths = []
    for i, txt in enumerate(vo_texts):
        wav = os.path.join(tmpdir, f"vo_{i}.wav")
        try:
            make_voiceover(txt, wav)
            vo_paths.append(wav)
            print(f"  VO {i+1} ok")
        except Exception as e:
            print(f"  VO {i+1} failed: {e}")
            vo_paths.append(wav)  # path anyway (will be skipped if missing)

    print("Rendering scenes...")
    scene_defs = [
        (build_frame_c1, 0.0,  6.0),
        (build_frame_c2, 6.0,  12.0),
        (build_frame_c3, 12.0, 19.0),
        (build_frame_c4, 19.0, 25.0),
        (build_frame_c5, 25.0, 30.0),
    ]

    clips = []
    for fn, t_start, t_end in scene_defs:
        dur = t_end - t_start
        n_frames = int(dur * FPS)
        frames = []
        for fi in range(n_frames):
            t_local = fi / FPS
            frame = fn(t_local, dur)
            frames.append(frame)
        arr = np.array(frames, dtype=np.uint8)
        clip = ImageClip(arr[0], duration=dur)

        def make_frame_fn(frames_arr):
            def frame_fn(t):
                idx = min(int(t * FPS), len(frames_arr)-1)
                return frames_arr[idx]
            return frame_fn

        from moviepy import VideoClip
        vc = VideoClip(make_frame_fn(arr), duration=dur)
        clips.append(vc)
        print(f"  Scene {fn.__name__} done ({dur:.1f}s, {n_frames} frames)")

    print("Building audio...")
    audio_arr = build_audio(vo_paths)
    audio_clip = AudioArrayClip(audio_arr, fps=SR)

    print("Concatenating and exporting...")
    video = concatenate_videoclips(clips)
    video = video.with_audio(audio_clip)

    video.write_videofile(
        OUT,
        fps=FPS,
        codec="libx264",
        audio_codec="aac",
        bitrate="6000k",
        audio_bitrate="128k",
        preset="medium",
        logger="bar",
    )
    print(f"\nDone! Output: {OUT}")


if __name__ == "__main__":
    render()

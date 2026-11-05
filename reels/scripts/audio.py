# Trilha + efeitos sintetizados (sem narração). 48 kHz estéreo. Silêncio absoluto 11,5s a 13,5s.
import numpy as np, wave, sys, subprocess, json, re
SR = 48000; DUR = 30.0; n = int(SR * DUR)
rng = np.random.default_rng(7)
mus = np.zeros((n, 2)); sfx = np.zeros((n, 2))
t_all = np.arange(n) / SR
FPS = 30

def env_exp(length, tau, attack=0.003):
    t = np.arange(length) / SR
    e = np.exp(-t / tau)
    a = int(attack * SR)
    if a > 0: e[:a] *= np.linspace(0, 1, a)
    return e

def add(buf, start, sig, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= n: return
    sig = sig[: n - i] * gain
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(sig), 0] += sig * l * 1.414
    buf[i:i + len(sig), 1] += sig * r * 1.414

def midi(m): return 440 * 2 ** ((m - 69) / 12)

def marimba(f, dur=0.9, bright=1.0):
    L = int(dur * SR); t = np.arange(L) / SR
    s = np.sin(2 * np.pi * f * t) * env_exp(L, 0.32)
    s += 0.35 * bright * np.sin(2 * np.pi * f * 3.98 * t) * env_exp(L, 0.06)
    s += 0.08 * bright * np.sin(2 * np.pi * f * 9.9 * t) * env_exp(L, 0.02)
    return s

def pad(freqs, dur, att=0.5, rel=0.8, wob=0.0):
    L = int(dur * SR); t = np.arange(L) / SR
    s = np.zeros(L)
    for f in freqs:
        vib = 1 + wob * np.sin(2 * np.pi * 0.7 * t)
        for d in (1.0, 1.004):
            s += np.sin(2 * np.pi * f * d * np.cumsum(vib) / SR) + 0.22 * np.sin(2 * np.pi * 2 * f * d * t)
    e = np.ones(L); a = int(att * SR); r = int(rel * SR)
    e[:a] = np.linspace(0, 1, a) ** 2; e[-r:] *= np.linspace(1, 0, r) ** 2
    return s * e / (len(freqs) * 2)

def kick(gain=1.0):
    L = int(0.22 * SR); t = np.arange(L) / SR
    f = 50 + 70 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(L, 0.07, 0.002) * gain

def band_noise(dur, f0, f1, q=0.35):
    L = int(dur * SR); out = np.zeros(L); hop = 1024; win = np.hanning(2048)
    for k in range(0, L, hop):
        seg = rng.standard_normal(2048) * win
        fc = f0 + (f1 - f0) * (k / max(L, 1))
        S = np.fft.rfft(seg); fr = np.fft.rfftfreq(2048, 1 / SR)
        S *= np.exp(-0.5 * (np.log(fr + 1) - np.log(fc)) ** 2 / q ** 2)
        y = np.fft.irfft(S)
        e = min(k + 2048, L) - k
        out[k:k + e] += y[:e]
    return out / (np.max(np.abs(out)) + 1e-9)

def whoosh(dur=0.55, f0=500, f1=2600):
    s = band_noise(dur, f0, f1); L = len(s)
    return s * np.sin(np.linspace(0, np.pi, L)) ** 2

def click():
    L = int(0.05 * SR); t = np.arange(L) / SR
    s = np.sin(2 * np.pi * 2100 * t) * env_exp(L, 0.006, 0.0005)
    s += 0.5 * rng.standard_normal(L) * env_exp(L, 0.002, 0.0002)
    return s

def pop(f0=380, f1=980):
    L = int(0.12 * SR); t = np.arange(L) / SR
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(L, 0.035, 0.002)

def thump():
    L = int(0.3 * SR); t = np.arange(L) / SR
    f = 62 + 40 * np.exp(-t / 0.02)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(L, 0.09, 0.002)
    s += 0.25 * band_noise(0.3, 180, 160, 0.4) * env_exp(L, 0.03, 0.001)
    return s

def chime(f=1318.5):
    L = int(1.4 * SR); t = np.arange(L) / SR
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.5 * t)) * env_exp(L, 0.45, 0.01)

# ---------------- TRILHA (120 BPM, compasso = 2s) ----------------
# Progressão I-V-vi-IV em Dó maior; trecho da escada em vi-ii (mais contido)
chords = {
    'C': [60, 64, 67], 'G': [55, 59, 62], 'Am': [57, 60, 64], 'F': [53, 57, 60], 'Dm': [50, 53, 57], 'Em': [52, 55, 59],
}
bars = ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Am', 'Dm', 'F', 'G', 'C', 'F', 'C']
arp_pat = [0, 1, 2, 1, 3, 2, 1, 2]  # colcheias
for b, name in enumerate(bars):
    t0 = b * 2.0
    notes = chords[name]
    lost = 3.0 <= t0 < 6.0
    pad_f = [midi(m - 12) for m in notes]
    add(mus, t0, pad(pad_f, 2.4, wob=0.004 if lost else 0.0), 0, 0.16 if not lost else 0.13)
    for k, idx in enumerate(arp_pat):
        tt = t0 + k * 0.25
        if lost and k % 2 == 1: continue  # cena da visão: trilha rarefeita
        if 17.0 <= tt < 20.0 and k % 2 == 1: continue  # escada: contida
        m = (notes + [notes[0] + 12])[idx] + 12
        g = 0.22 if not lost else 0.14
        if tt >= 24.0: g = 0.26
        add(mus, tt, marimba(midi(m), bright=0.4 if lost else 1.0), pan=(-0.35 if k % 2 else 0.35), gain=g)
    add(mus, t0, marimba(midi(notes[0] - 12), 1.4, 0.5), 0, 0.28)
# pulso leve nas batidas (mais marcado na onda sonora, 10s a 11,5s)
for k in range(60):
    tt = k * 0.5
    if 3.0 <= tt < 6.0: continue
    g = 0.5 if 10.0 <= tt < 11.5 else 0.22
    add(mus, tt, kick(), 0, g)
# acorde final que resolve em Dó e se apaga antes do loop
add(mus, 28.0, pad([midi(48), midi(55), midi(64), midi(72)], 1.9, att=0.05, rel=1.4), 0, 0.2)

# entrada suave da trilha após o silêncio e curva final
g = np.ones(n)
i0, i1 = int(13.5 * SR), int(14.0 * SR)
g[i0:i1] = np.linspace(0, 1, i1 - i0) ** 2
i2 = int(29.2 * SR); g[i2:] = np.linspace(1, 0, n - i2) ** 2
mus *= g[:, None]

# ---------------- EFEITOS ----------------
F = lambda fr: fr / FPS
add(sfx, F(100), whoosh(0.7, 2600, 500), -0.2, 0.18)     # o post começa a apagar
add(sfx, F(205), chime(), 0, 0.10)                         # AD acende (pulso suave)
add(sfx, F(205), pop(), 0, 0.22)
add(sfx, F(212), whoosh(0.8, 500, 2400), 0.2, 0.15)       # partículas remontam o post
add(sfx, F(261), click(), 0.5, 0.35)                       # clique no curtir
add(sfx, F(262), pop(500, 1200), 0.5, 0.2)
add(sfx, F(278), whoosh(0.7), 0, 0.17)                     # coração vira onda
add(sfx, F(326), pop(900, 600), 0, 0.12)                   # ícone de som cortado
add(sfx, F(405) + 0.02, whoosh(0.55, 700, 2200), 0, 0.15)  # linha vira legenda
add(sfx, F(432), pop(), -0.4, 0.22)                        # mão de Libras
add(sfx, F(486), whoosh(0.9, 2200, 600), 0, 0.15)          # legendas viram degraus
add(sfx, F(514), pop(), 0.4, 0.18)                         # botão Seguir
add(sfx, F(541), thump(), -0.3, 0.6)                       # batidas na escada
add(sfx, F(587), thump(), -0.3, 0.6)
add(sfx, F(600), whoosh(0.7, 400, 1500), 0.5, 0.2)        # rampa desliza
add(sfx, F(619), thump(), 0, 0.35)                         # rampa se encaixa
add(sfx, F(680), click(), 0.3, 0.35)                       # clique no Seguir
add(sfx, F(687), pop(500, 1300), 0.3, 0.22)
add(sfx, F(704), whoosh(0.7, 2400, 600), 0, 0.16)         # rampa vira linha
for k in range(4): add(sfx, F(730 + k * 4.5), pop(420 + 80 * k, 1000 + 120 * k), -0.5 + k / 3, 0.2)
# ticks quando a seta passa pelos ícones (mesma curva cubic-bezier(.65,0,.35,1))
def bez(x):
    lo, hi = 0.0, 1.0
    for _ in range(60):
        u = (lo + hi) / 2
        bx = 3 * (1 - u) ** 2 * u * 0.65 + 3 * (1 - u) * u ** 2 * 0.35 + u ** 3
        lo, hi = (u, hi) if bx < x else (lo, u)
    u = (lo + hi) / 2
    return 3 * (1 - u) * u ** 2 + u ** 3
for x in (255, 445, 635, 825):
    for fr in np.arange(752, 818, 0.25):
        if 130 + 750 * bez((fr - 752) / 66) >= x:
            add(sfx, F(fr), pop(1200, 1500), (x - 540) / 400, 0.07); break
add(sfx, F(842), whoosh(1.0, 600, 2800), 0, 0.18)         # ícones se recolhem em espiral

mix = mus + sfx
# silêncio absoluto e obrigatório
s0, s1 = int(11.5 * SR), int(13.5 * SR)
fade = int(0.008 * SR)
mix[s0 - fade:s0] *= np.linspace(1, 0, fade)[:, None]
mix[s0:s1] = 0.0

def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())

def lufs(path):
    o = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', o)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', o)[-1])
    return I, TP

out = sys.argv[1]
x = mix / (np.max(np.abs(mix)) + 1e-9) * 0.5
for it in range(6):
    write(out, x); I, TP = lufs(out)
    print(f'iter {it}: {I:.2f} LUFS, true peak {TP:.2f} dBTP')
    if abs(I + 14) < 0.15 and TP <= -1.0: break
    x *= 10 ** ((-14 - I) / 20)
    # limitador suave para manter o pico real abaixo de -1 dBTP
    lim = 10 ** (-1.3 / 20)
    x = np.where(np.abs(x) > lim * 0.8, np.sign(x) * (lim * 0.8 + (lim * 0.2) * np.tanh((np.abs(x) - lim * 0.8) / (lim * 0.2))), x)
x[s0:s1] = 0.0
write(out, x)
print('final', lufs(out))

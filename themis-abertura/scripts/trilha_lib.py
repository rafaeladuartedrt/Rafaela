"""Biblioteca de síntese da trilha (instrumentos, posicionamento em loop, mixagem)."""
import sys
import numpy as np
from scipy import signal

SR = 48000
T = 30.0
N = int(T * SR)
rng = np.random.default_rng(6)

dry = np.zeros((2, 3 * N))
send = np.zeros((2, 3 * N))   # envio para a reverberação


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tvec(dur):
    return np.arange(int(dur * SR)) / SR


def place(sig, t0, amp=1.0, pan=0.0, rev=0.3):
    """Coloca o sinal (mono ou estéreo) nos 3 ciclos, com pan de potência constante."""
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        st = np.vstack([sig * np.cos(a), sig * np.sin(a)])
    else:
        st = sig
    st = st * amp
    for k in range(3):
        i0 = int(round((t0 + k * T) * SR))
        i1 = i0 + st.shape[1]
        a0, b0 = max(i0, 0), min(i1, 3 * N)
        if b0 <= a0:
            continue
        seg = st[:, a0 - i0:b0 - i0]
        dry[:, a0:b0] += seg
        send[:, a0:b0] += seg * rev


def fade(sig, a=0.005, r=0.05):
    n = len(sig); na, nr = int(a * SR), int(r * SR)
    env = np.ones(n)
    if na: env[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    if nr: env[-nr:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    return sig * env


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def sweep_bp(x, f0, f1, q=1.2, curve=1.0):
    """passa-faixa com frequência variando no tempo (blocos com estado contínuo)"""
    n = len(x); out = np.zeros(n); blk = 256; zi = np.zeros(2)
    for s in range(0, n, blk):
        p = (s / n) ** curve
        fc = f0 * (f1 / f0) ** p
        w = 2 * np.pi * fc / SR; al = np.sin(w) / (2 * q)
        b = np.array([al, 0, -al]) / (1 + al); a = np.array([1, -2 * np.cos(w) / (1 + al), (1 - al) / (1 + al)])
        out[s:s + blk], zi = signal.lfilter(b, a, x[s:s + blk], zi=zi)
    return out


# ---------------------------------------------------------------- instrumentos
def piano(m, vel=0.4, dur=None):
    f = hz(m)
    dur = dur or min(7.0, 2.5 + 3.5 * (220 / f) ** 0.5)
    t = tvec(dur); out = np.zeros_like(t); B = 0.00035
    for k in range(1, 18):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > 15000: break
        tau = (2.6 * (220 / f) ** 0.35) / (1 + 0.22 * (k - 1))
        ak = (vel ** (0.6 + 0.12 * k)) / k ** 1.1
        for d in (-0.0007, 0.0007):  # duas cordas levemente desafinadas (batimento)
            out += ak * np.exp(-t / tau) * np.sin(2 * np.pi * fk * (1 + d) * t + rng.uniform(0, 6.28))
    out *= 1 - np.exp(-t / 0.0025)
    ham = lp(rng.normal(0, 1, len(t)) * np.exp(-t / 0.004), 2500 + 4000 * vel) * 0.08 * vel
    return fade(out / 8 + ham, 0.001, 0.4)


def strings(notes, dur, cutoff=2200, att=1.0, rel=1.4, vib=0.003, voices=4, trem=0.0):
    """cordas: serras aditivas detunadas, filtradas, com vibrato lento"""
    t = tvec(dur); out = np.zeros_like(t)
    for m in notes:
        f = hz(m)
        for v in range(voices):
            det = 1 + (v - (voices - 1) / 2) * 0.0035
            vr = 1 + vib * np.sin(2 * np.pi * (4.6 + 0.4 * v) * t + v)
            ph = 2 * np.pi * np.cumsum(f * det * vr) / SR
            for k in range(1, 40):
                fk = f * k
                if fk > min(cutoff * 2.2, 9000): break
                w = (1 / k) / (1 + (fk / cutoff) ** 4)
                out += w * np.sin(k * ph + rng.uniform(0, 6.28))
    out /= max(1, len(notes) * voices) * 1.5
    if trem: out *= 1 - trem * (0.5 + 0.5 * np.sin(2 * np.pi * 6.5 * t))
    env = np.ones_like(t); na, nr = int(min(att, dur * 0.6) * SR), int(min(rel, dur * 0.6) * SR)
    env[:na] = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))) ** 1.3
    env[-nr:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    return out * env


def stereo_strings(notes, dur, **kw):
    """par descorrelacionado para largura"""
    return np.vstack([strings(notes, dur, **kw), strings(notes, dur, **kw)])


def boom(size=1.0, dur=3.2):
    t = tvec(dur)
    f = 30 + 34 * np.exp(-t / 0.13)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (1.0 * size)) * (1 - np.exp(-t / 0.003))
    s += 0.45 * lp(rng.normal(0, 1, len(t)) * np.exp(-t / 0.035), 280)
    s += 0.25 * np.sin(2 * np.pi * 46 * t) * np.exp(-t / 2.2)
    return np.tanh(1.6 * s) * 0.8


def whoosh(dur, f0, f1, curve=1.0, peak=0.6):
    t = tvec(dur); n = rng.normal(0, 1, len(t))
    x = sweep_bp(n, f0, f1, q=0.9, curve=curve)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    pk = int(peak * len(t)); env = np.interp(np.arange(len(t)), [0, pk, len(t) - 1], [0, 1, 0]) ** 1.6
    a = x * env; b = sweep_bp(rng.normal(0, 1, len(t)), f0 * 1.1, f1 * 1.1, q=0.9, curve=curve) * env
    return np.vstack([a, b]) * 0.5


def riser(dur, f0=180, f1=5000):
    """crescendo: ruído filtrado subindo + tons em glissando, termina seco no impacto"""
    t = tvec(dur); p = t / dur
    nz = sweep_bp(rng.normal(0, 1, len(t)), f0, f1, q=1.4, curve=2.2) * p ** 2.2
    g = sum(np.sin(2 * np.pi * np.cumsum(fb * (1 + 1.0 * p ** 2)) / SR) for fb in (hz(50), hz(57), hz(62)))
    out = nz * 0.7 + 0.12 * g * p ** 2.5
    return fade(out, 0.02, 0.012)


def reverse_swell(dur):
    t = tvec(dur); x = hp(rng.normal(0, 1, len(t)), 3500) * (t / dur) ** 3
    return fade(x * 0.35, 0.01, 0.01)


def typekey(bright=1.0):
    t = tvec(0.09)
    clk = hp(rng.normal(0, 1, len(t)) * np.exp(-t / 0.0016), 2200) * 0.9
    ring = np.sin(2 * np.pi * rng.uniform(2300, 3000) * t) * np.exp(-t / 0.012) * 0.25 * bright
    body = np.sin(2 * np.pi * rng.uniform(150, 210) * t) * np.exp(-t / 0.018) * 0.55
    return fade(clk + ring + body, 0.0005, 0.02)


def tick(tock=False):
    t = tvec(0.05); f = 2400 if tock else 3100
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.0045) + 0.5 * np.sin(2 * np.pi * f * 0.37 * t) * np.exp(-t / 0.009)
    return fade(s * 0.5, 0.0003, 0.01)


def bell(m, dur=2.8):
    t = tvec(dur); f = hz(m); s = np.zeros_like(t)
    for r, a, d in ((1, 1, 1.6), (2.76, 0.45, 0.8), (5.4, 0.22, 0.35), (8.9, 0.1, 0.18)):
        s += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d)
    return fade(s * (1 - np.exp(-t / 0.002)) * 0.3, 0.001, 0.3)


def shimmer(dur, notes=(81, 86, 88, 93), rise=False):
    t = tvec(dur); s = np.zeros_like(t)
    for i, m in enumerate(notes):
        f = hz(m) * (1 + (0.04 * t / dur if rise else 0))
        s += np.sin(2 * np.pi * f * t + i) * (0.6 + 0.4 * np.sin(2 * np.pi * (5 + i) * t))
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return s * env * 0.08


def timp(m=38, vel=0.5):
    t = tvec(1.6); f = hz(m) * (1 + 0.15 * np.exp(-t / 0.05))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55) + 0.3 * lp(rng.normal(0, 1, len(t)) * np.exp(-t / 0.02), 400)
    return fade(s * vel, 0.001, 0.2)


def paper(dur=0.35):
    t = tvec(dur); x = sweep_bp(rng.normal(0, 1, len(t)), 900, 4200, q=0.7)
    return fade(x * np.sin(np.pi * t / dur) ** 2 * 0.35, 0.005, 0.05)



# ---------------------------------------------------------------- mixagem
def reverb_ir(rt60=2.6, dur=3.4):
    t = tvec(dur); decay = np.exp(-6.91 * t / rt60)
    ir = np.vstack([lp(rng.normal(0, 1, len(t)), 6500, 1) * decay, lp(rng.normal(0, 1, len(t)), 6500, 1) * decay])
    pre = int(0.022 * SR); ir = np.pad(ir, ((0, 0), (pre, 0)))[:, :len(t)]
    for d, g in ((0.011, 0.5), (0.017, 0.35), (0.029, 0.3)):   # primeiras reflexões
        ir[0, int(d * SR)] += g; ir[1, int((d + 0.003) * SR)] += g
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))

def render(path, wet_amt=0.55):
    ir = reverb_ir()
    wet = np.vstack([signal.fftconvolve(send[c], ir[c])[:3 * N] for c in range(2)])
    mix = dry + wet_amt * wet
    mix = np.vstack([hp(mix[c], 28, 2) for c in range(2)])
    # cola suave + limitador simples (envelope de pico com relaxamento)
    mix = np.tanh(mix * 1.1) / 1.1
    mid = mix[:, N:2 * N]                      # ciclo do meio = loop perfeito
    peak = np.max(np.abs(mid)); mid = mid / peak * 0.89   # ~ -1 dBFS de pico
    import wave
    pcm = (np.clip(mid.T, -1, 1) * 8388607).astype(np.int32)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR)
        b = pcm.astype('<i4').tobytes()
        w.writeframes(b''.join(b[i:i + 3] for i in range(0, len(b), 4)))
    print('ok', path, mid.shape, 'pico normalizado')


# ---------------------------------------------------------------- instrumentos de telejornal
def kick(vel=1.0):
    t = tvec(0.35); f = 48 + 90 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) + 0.25 * hp(rng.normal(0, 1, len(t)) * np.exp(-t / 0.003), 2000)
    return fade(np.tanh(1.8 * s) * 0.8 * vel, 0.0005, 0.03)


def rim(vel=1.0):
    t = tvec(0.12)
    s = sweep_bp(rng.normal(0, 1, len(t)), 1900, 1700, q=3) * np.exp(-t / 0.018) + 0.4 * np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.012)
    return fade(s * 0.55 * vel, 0.0005, 0.02)


def snare(vel=1.0):
    t = tvec(0.25)
    s = hp(rng.normal(0, 1, len(t)), 1200) * np.exp(-t / 0.07) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04) * 0.5
    return fade(s * vel, 0.0005, 0.03)


def shaker(vel=1.0):
    t = tvec(0.06)
    return fade(hp(rng.normal(0, 1, len(t)), 6500) * (np.exp(-t / 0.012) * (1 - np.exp(-t / 0.004))) * 0.35 * vel, 0.001, 0.01)


def pulse_bass(m, dur=0.24, vel=1.0):
    """baixo sintético em colcheias, curto e redondo"""
    t = tvec(dur); f = hz(m)
    saw = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 12))
    s = lp(saw, 420) + lp(saw, 1600) * 0.6 * np.exp(-t / 0.03) + 0.6 * np.sin(2 * np.pi * f * t)
    return fade(s * np.exp(-t / 0.16) * 0.5 * vel, 0.002, 0.03)


def pluck(m, vel=1.0):
    """ostinato "ticker": pluck curto e brilhante (FM)"""
    t = tvec(0.32); f = hz(m)
    mod = np.sin(2 * np.pi * f * 2 * t) * 2.2 * np.exp(-t / 0.05)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 0.11)
    return fade(s * 0.3 * vel, 0.001, 0.04)


def stab(notes, dur=1.4, vel=1.0, warm=False):
    """acorde de metais sintéticos: ataque rápido, filtro abre e fecha (warm = trompas, mais escuro e longo)"""
    t = tvec(dur); out = np.zeros_like(t)
    cut = (500 + 2300 * np.exp(-t / 0.35)) if warm else (600 + 5200 * np.exp(-t / 0.18))
    for m in notes:
        f = hz(m)
        for d in (-0.004, 0, 0.004):
            ph = 2 * np.pi * f * (1 + d) * t + rng.uniform(0, 6.28)
            for k in range(1, 30):
                if f * k > 9000: break
                out += np.sin(k * ph) / k * (1 / (1 + (f * k / cut) ** 3))
    env = (1 - np.exp(-t / (0.02 if warm else 0.006))) * np.exp(-t / (0.9 if warm else 0.45))
    return fade(out / (len(notes) * 3) * env * (2.0 if warm else 1.6) * vel, 0.001, 0.35)


def crash(vel=1.0, dur=2.2):
    t = tvec(dur); x = hp(rng.normal(0, 1, len(t)), 4000) * np.exp(-t / 0.7) * (1 - np.exp(-t / 0.002))
    x2 = hp(rng.normal(0, 1, len(t)), 4000) * np.exp(-t / 0.7) * (1 - np.exp(-t / 0.002))
    return np.vstack([x, x2]) * 0.22 * vel

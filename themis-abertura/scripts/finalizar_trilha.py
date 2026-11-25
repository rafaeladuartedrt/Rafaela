"""Acabamento da trilha gerada (Eleven Music) para a vinheta:
corta o silêncio inicial, fixa 30 s, sobrepõe os impactos ("bum") em JORNALISMO (6 s), JUDICIÁRIO (11 s),
troféu (21 s) e logo (27 s), automação de volume para o início ser audível no telão, limitador suave e
masterização (-14 LUFS, -1 dBTP, 48 kHz/24 bits).
Uso: python3 scripts/finalizar_trilha.py <entrada.mp3> <saida.wav>"""
import sys, json, subprocess, wave
import numpy as np
from scipy import signal
sys.path.insert(0, __import__('os').path.dirname(__file__))
import trilha_lib as L

SR = 48000
src, dst = sys.argv[1], sys.argv[2]
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'],
                                 capture_output=True).stdout, np.float32).reshape(-1, 2).T.astype(np.float64)
start = max(0, int(np.argmax(np.abs(x).mean(0) > 10 ** (-45 / 20))) - int(0.01 * SR))
y = x[:, start:start + 30 * SR].copy()
if y.shape[1] < 30 * SR: y = np.pad(y, ((0, 0), (0, 30 * SR - y.shape[1])))
pk = np.abs(y).max()


def add(sig, t0, g):
    if sig.ndim == 1: sig = np.vstack([sig, sig])
    i0 = int(t0 * SR); n = min(sig.shape[1], y.shape[1] - i0); y[:, i0:i0 + n] += g * sig[:, :n]


n = int(2.2 * SR); tt = np.arange(n) / SR; rng = np.random.default_rng(5)
ir = np.vstack([rng.normal(0, 1, n), rng.normal(0, 1, n)]) * np.exp(-6.91 * tt / 1.8); ir /= np.sqrt((ir ** 2).sum(1, keepdims=True))


def impact(size):
    b = L.boom(size, 3.0); tp = L.timp(38, 1.0); cr = L.crash(0.7, 3.0)
    m = np.zeros((2, int(3.2 * SR))); m[:, :b.shape[0]] += b * 0.9; m[:, :tp.shape[0]] += tp * 0.7; m[:, :cr.shape[1]] += cr * 0.6
    return m + 0.25 * np.vstack([signal.fftconvolve(m[c], ir[c])[:m.shape[1]] for c in range(2)])


# impactos em escada: JORNALISMO, JUDICIÁRIO, troféu, nome (logo)
for t0, size, g in ((6.0, 1.0, 0.42), (11.0, 1.05, 0.48), (21.0, 1.1, 0.55), (27.0, 1.4, 0.7)):
    add(L.reverse_swell(0.6), t0 - 0.6, g * 0.8)
    add(impact(size), t0, g * pk)

t = np.arange(y.shape[1]) / SR
y = y * 10 ** (np.interp(t, [0, 4, 8, 12, 30], [10, 9, 5, 1.5, 0]) / 20)   # automação de volume
y = y / np.abs(y).max()
thr = 0.5; y = np.where(np.abs(y) > thr, np.sign(y) * (thr + (1 - thr) * np.tanh((np.abs(y) - thr) / (1 - thr))), y)
f = int(0.06 * SR); y[:, -f:] *= np.linspace(1, 0, f); fi = int(0.01 * SR); y[:, :fi] *= np.linspace(0, 1, fi)
y = y / np.abs(y).max() * 0.95
tmp = dst + '.tmp.wav'
pcm = (np.clip(y.T, -1, 1) * 8388607).astype('<i4').tobytes()
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR); w.writeframes(b''.join(pcm[i:i + 3] for i in range(0, len(pcm), 4)))
out = subprocess.run(['ffmpeg', '-nostats', '-i', tmp, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
d = json.loads(out[out.rindex('{'):out.rindex('}') + 1])
mi = f"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}"
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'loudnorm=I=-14:TP=-1:LRA=11:{mi}:linear=true', '-ar', '48000', '-c:a', 'pcm_s24le', '-t', '30', dst], check=True)
__import__('os').remove(tmp)
print('ok', dst, 'início cortado em', round(start / SR, 2), 's')

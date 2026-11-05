# Trilha + efeitos do Reels v2 (150 BPM, batida a cada 12 frames), sincronizados com os eventos de cada cena.
import numpy as np, wave, sys, subprocess, re, json
SR = 48000; FPS = 30
L = json.loads(sys.argv[2])  # {"s1":..,"s2":..,"s3":..,"s4":..,"s5":..,"cut":..,"silEnd":..}
S = {'s1': 0}; S['s2'] = L['s1']; S['s3'] = S['s2'] + L['s2']; S['s4'] = S['s3'] + L['s3']; S['s5'] = S['s4'] + L['s4']
TOTAL = S['s5'] + L['s5']
n = int(TOTAL / FPS * SR) + 1
rng = np.random.default_rng(11)
mus = np.zeros((n, 2)); sfx = np.zeros((n, 2))
G = lambda sc, fr: (S[sc] + fr) / FPS  # segundo global de um frame local

def env(L_, tau, att=0.003):
    t = np.arange(L_) / SR; e = np.exp(-t / tau); a = int(att * SR)
    if a: e[:a] *= np.linspace(0, 1, a)
    return e
def add(buf, t0, sig, pan=0.0, g=1.0):
    i = int(t0 * SR)
    if i >= n or i < 0: return
    sig = sig[: n - i] * g
    l = np.cos((pan + 1) * np.pi / 4) * 1.414; r = np.sin((pan + 1) * np.pi / 4) * 1.414
    buf[i:i + len(sig), 0] += sig * l; buf[i:i + len(sig), 1] += sig * r
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
def marimba(f, d=0.7, b=1.0):
    L_ = int(d * SR); t = np.arange(L_) / SR
    return np.sin(2*np.pi*f*t)*env(L_, .28) + .35*b*np.sin(2*np.pi*f*3.98*t)*env(L_, .05) + .08*b*np.sin(2*np.pi*f*9.9*t)*env(L_, .02)
def pad(fs, d, att=.4, rel=.6):
    L_ = int(d * SR); t = np.arange(L_) / SR; s = np.zeros(L_)
    for f in fs:
        for dt in (1, 1.004): s += np.sin(2*np.pi*f*dt*t) + .2*np.sin(4*np.pi*f*dt*t)
    e = np.ones(L_); a = int(att*SR); r = int(rel*SR); e[:a] = np.linspace(0, 1, a)**2; e[-r:] *= np.linspace(1, 0, r)**2
    return s * e / (len(fs) * 2)
def kick(g=1):
    L_ = int(.2*SR); t = np.arange(L_)/SR; f = 48 + 80*np.exp(-t/.025)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*env(L_, .07, .002)*g
def hat():
    L_ = int(.05*SR); s = rng.standard_normal(L_); s = np.diff(np.concatenate([[0], s])); return s*env(L_, .012, .001)*.5
def band_noise(d, f0, f1, q=.35):
    L_ = int(d*SR); out = np.zeros(L_); hop = 1024; win = np.hanning(2048)
    for k in range(0, L_, hop):
        seg = rng.standard_normal(2048)*win; fc = f0 + (f1-f0)*(k/max(L_, 1))
        Sx = np.fft.rfft(seg); fr = np.fft.rfftfreq(2048, 1/SR); Sx *= np.exp(-.5*(np.log(fr+1)-np.log(fc))**2/q**2)
        y = np.fft.irfft(Sx); e = min(k+2048, L_)-k; out[k:k+e] += y[:e]
    return out/(np.max(np.abs(out))+1e-9)
def whoosh(d=.5, f0=500, f1=2600):
    s = band_noise(d, f0, f1); return s*np.sin(np.linspace(0, np.pi, len(s)))**2
def click():
    L_ = int(.05*SR); t = np.arange(L_)/SR
    return np.sin(2*np.pi*2200*t)*env(L_, .006, .0005) + .5*rng.standard_normal(L_)*env(L_, .002, .0002)
def pop(f0=380, f1=980, d=.12):
    L_ = int(d*SR); t = np.arange(L_)/SR; f = f0+(f1-f0)*(1-np.exp(-t/.02))
    return np.sin(2*np.pi*np.cumsum(f)/SR)*env(L_, .035, .002)
def thump(g=1, low=58):
    L_ = int(.32*SR); t = np.arange(L_)/SR; f = low+45*np.exp(-t/.02)
    return (np.sin(2*np.pi*np.cumsum(f)/SR)*env(L_, .09, .002) + .25*band_noise(.32, 200, 160, .4)*env(L_, .03, .001))*g
def chime(f=1318.5, d=1.2):
    L_ = int(d*SR); t = np.arange(L_)/SR; return (np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*1.5*t))*env(L_, .4, .01)
def boing(f0=300, f1=700, d=.25):
    L_ = int(d*SR); t = np.arange(L_)/SR; f = f0+(f1-f0)*np.sin(np.pi*t/d)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*env(L_, .12, .003)
def rumble(d=.7):
    s = band_noise(d, 90, 140, .5); return s*np.sin(np.linspace(0, np.pi, len(s)))*.9

# ---------------- TRILHA ----------------
BEAT = 12 / FPS  # 0,4 s
OFF = (S['s3'] % 12) / FPS  # grade de batidas alinhada com a cena 3 (onda sincronizada)
chords = {'C': [60, 64, 67], 'G': [55, 59, 62], 'Am': [57, 60, 64], 'F': [53, 57, 60], 'Dm': [50, 53, 57]}
prog = ['C', 'G', 'Am', 'F']
problem = [(G('s2', 26), G('s2', 154)), (G('s3', 0), G('s3', L['cut'])), (G('s4', 0), G('s4', 100)), (G('s5', 0), G('s5', 142))]
in_problem = lambda t: any(a <= t < b for a, b in problem)
bar = BEAT * 4
t = OFF; k = 0
while t < TOTAL / FPS:
    name = prog[k % 4] if not in_problem(t) else ['Am', 'Dm', 'Am', 'G'][k % 4]
    notes = chords[name]
    add(mus, t, pad([midi(m - 12) for m in notes], bar + .3), 0, .15)
    add(mus, t, marimba(midi(notes[0] - 12), 1.2, .5), 0, .26)
    for j in range(8):
        tt = t + j * BEAT / 2
        if in_problem(tt) and j % 2: continue
        m = (notes + [notes[0] + 12])[[0, 1, 2, 1, 3, 2, 1, 2][j]] + 12
        add(mus, tt, marimba(midi(m), b=.5 if in_problem(tt) else 1), (-.35 if j % 2 else .35), .14 if in_problem(tt) else .2)
    for j in range(4):
        tt = t + j * BEAT
        add(mus, tt, kick(), 0, .5 if G('s3', 0) <= tt < G('s3', L['cut']) else .24)
        if not in_problem(tt): add(mus, tt + BEAT / 2, hat(), .3, .12)
    t += bar; k += 1
# acorde final que resolve e se abre nas curtidas
add(mus, G('s5', 206), pad([midi(48), midi(55), midi(64), midi(72)], 3.4, att=.05, rel=1.6), 0, .22)
g = np.ones(n)
i0 = int(G('s3', L['silEnd']) * SR); i1 = int((G('s3', L['silEnd']) + .35) * SR)
g[i0:i1] = np.linspace(0, 1, i1 - i0) ** 2
i2 = int((TOTAL / FPS - 0.9) * SR); g[i2:] = np.linspace(1, 0, n - i2) ** 2
mus *= g[:, None]

# ---------------- EFEITOS ----------------
E = []
# cena 1
for fr in (2, 6, 10): E.append(('s1', fr, pop(600, 900, .08), -.2, .1))
E += [('s1', 14, whoosh(.5, 400, 1800), 0, .16), ('s1', 30, thump(.5), 0, .45), ('s1', 28, whoosh(.55, 600, 2400), .3, .14),
      ('s1', 38, pop(500, 1000), 0, .12), ('s1', 50, whoosh(.35, 2400, 800), .4, .1), ('s1', 60, boing(260, 620), .4, .35),
      ('s1', 60, whoosh(.6, 500, 2600), 0, .15), ('s1', 96, whoosh(.6, 300, 3200), 0, .22), ('s1', 114, whoosh(.5, 2600, 500), 0, .14),
      ('s1', 140, click(), -.3, .2)]
# cena 2
E += [('s2', 6, whoosh(.6, 2200, 600), 0, .12), ('s2', 30, pop(500, 800), 0, .1), ('s2', 72, whoosh(.8, 300, 1800), 0, .18)]
for fr in (96, 108, 120): E.append(('s2', fr, pop(700, 420, .2), .2, .12))
E += [('s2', 140, pop(), 0, .22), ('s2', 154, chime(), 0, .12), ('s2', 154, whoosh(.6, 500, 2600), 0, .16),
      ('s2', 172, whoosh(.7, 2200, 500), 0, .12), ('s2', 222, click(), -.3, .3), ('s2', 222, pop(500, 1200), -.3, .2),
      ('s2', 250, click(), .2, .3), ('s2', 254, whoosh(.5, 1800, 300), 0, .15), ('s2', 260, whoosh(.6, 600, 2000), 0, .12),
      ('s2', 300, click(), .3, .25), ('s2', 302, boing(300, 760), .3, .3), ('s2', 316, whoosh(.6, 300, 3200), 0, .2)]
# cena 3 (até o corte)
for fr in (6, 12, 18, 24): E.append(('s3', fr, thump(.55, 70), -.1, .4))
E += [('s3', 32, pop(400, 1000), .2, .2), ('s3', 64, click(), .3, .3), ('s3', 67, whoosh(.3, 1600, 400), .2, .12)]
# depois do silêncio
E += [('s3', L['silEnd'], whoosh(.6, 300, 2400), 0, .18), ('s3', L['silEnd'] + 18, pop(600, 1200, .08), -.3, .1),
      ('s3', L['silEnd'] + 21, pop(600, 1200, .08), 0, .1), ('s3', L['silEnd'] + 24, pop(600, 1200, .08), .3, .1),
      ('s3', L['silEnd'] + 44, chime(1568, 1.0), 0, .08), ('s3', L['silEnd'] + 104, whoosh(.5, 2000, 500), 0, .12),
      ('s3', L['silEnd'] + 116, thump(.4, 80), 0, .3), ('s3', L['silEnd'] + 130, whoosh(.7, 400, 2200), 0, .14)]
# cena 4
for fr in (4, 9, 14, 19): E.append(('s4', fr, pop(420, 640, .08), -.2, .1))
E += [('s4', 14, pop(), .4, .18), ('s4', 44, thump(1, 55), -.3, .7), ('s4', 76, thump(1.1, 50), -.3, .8),
      ('s4', 100, whoosh(.8, 300, 2400), 0, .18), ('s4', 104, chime(1318, 1.2), 0, .1), ('s4', 120, whoosh(1.2, 300, 900), 0, .08),
      ('s4', 160, click(), .4, .3), ('s4', 161, pop(500, 1300), .4, .22), ('s4', 228, whoosh(.6, 2400, 600), 0, .14)]
# cena 5
E += [('s5', 0, whoosh(.6, 400, 2400), 0, .16), ('s5', 18, pop(500, 800), 0, .1), ('s5', 72, pop(500, 800), 0, .1),
      ('s5', 90, rumble(.8), 0, .7), ('s5', 130, thump(.8, 60), 0, .5), ('s5', 142, whoosh(.6, 400, 2600), 0, .16),
      ('s5', 170, thump(1, 62), 0, .6), ('s5', 175, boing(240, 520, .3), 0, .25), ('s5', 185, thump(.5, 90), 0, .35),
      ('s5', 206, chime(1568, 1.6), 0, .12), ('s5', 228, click(), .3, .3)]
# curtidas: pops cada vez mais frequentes
for i in range(70):
    fr = 230 + 40 * (i / 70) ** 0.7
    E.append(('s5', fr, pop(700 + 400 * rng.random(), 1300 + 500 * rng.random(), .07), rng.uniform(-.8, .8), .06))
for sc, fr, sig, pan, gg in E: add(sfx, G(sc, fr), sig, pan, gg)

mix = mus + sfx
s0 = int(G('s3', L['cut']) * SR); s1 = int(G('s3', L['silEnd']) * SR)
fade = int(.008 * SR); mix[s0 - fade:s0] *= np.linspace(1, 0, fade)[:, None]; mix[s0:s1] = 0.0

def write(p, x):
    x = np.clip(x, -1, 1)
    with wave.open(p, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())
def lufs(p):
    o = subprocess.run(['ffmpeg', '-nostats', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', o)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', o)[-1])
out = sys.argv[1]; x = mix / (np.max(np.abs(mix)) + 1e-9) * .5
for it in range(6):
    write(out, x); I, TP = lufs(out); print(f'iter {it}: {I:.2f} LUFS, pico {TP:.2f}')
    if abs(I + 14) < .15 and TP <= -1: break
    x *= 10 ** ((-14 - I) / 20); lim = 10 ** (-1.3 / 20)
    x = np.where(np.abs(x) > lim * .8, np.sign(x) * (lim * .8 + lim * .2 * np.tanh((np.abs(x) - lim * .8) / (lim * .2))), x)
x[s0:s1] = 0; write(out, x); print('final', lufs(out), 'silêncio', s0 / SR, s1 / SR, 'total', TOTAL / FPS)

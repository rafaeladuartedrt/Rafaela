"""Trilha da vinheta: tom de premiação (ré maior: nobre, inspirador, de reconhecimento),
jornalística e com peso histórico. Nem festiva, nem dramática.
Sem efeitos agudos de "tic" (nada de teclas, relógio ou dedilhados): as passagens são
musicais, encaixadas na harmonia, com crescendos de cordas e rufos de timbale que
deságuam em impactos nobres (metais quentes + timbale) nas cenas importantes.

120 BPM, 60 batidas = 15 compassos em 30 s: o pulso fecha no loop.
Impactos: 6,0 s JORNALISMO · 11,0 s JUDICIÁRIO · 21,0 s troféu · 27,0 s logo.
A energia sobe em degraus até o clímax do logo e se recolhe para o loop.
Uso: python3 scripts/trilha_jornal.py <saida.wav>
"""
import sys
from trilha_lib import *

BEAT = 0.5
# harmonia por trecho: (início, fim, acorde, raiz do baixo) — ré maior, progressão de elevação
D_, G_, BM, A_, DF, EM = [50, 54, 57, 62], [43, 50, 55, 59], [47, 50, 54, 59], [45, 49, 52, 57], [42, 50, 54, 57], [40, 47, 52, 55]
HARM = [(0, 4, D_, 38), (4, 6, G_, 43), (6, 8, D_, 38), (8, 10, BM, 35), (10, 11, A_, 33), (11, 12, G_, 43),
        (12, 14, G_, 43), (14, 16, DF, 42), (16, 18, EM, 40), (18, 20, BM, 35), (20, 21, A_, 33),
        (21, 23, D_, 38), (23, 25, G_, 43), (25, 27, A_, 33), (27, 29, D_, 38), (29, 30, D_, 38)]
SENS = (12.0, 20.0)   # COTIDIANO / IMAGENS / INOVAÇÃO / NOTÍCIAS: recolhido


def intensity(tt):
    """curva de energia: sobe em degraus até o clímax do logo (27 s) e se recolhe para o loop"""
    pts = [(0, 0.35), (6, 0.55), (11, 0.7), (12, 0.45), (20, 0.75), (21, 0.85), (27, 1.0), (28.5, 0.6), (30, 0.35)]
    xs, ys = zip(*pts)
    return float(np.interp(tt, xs, ys))


def chord_at(tt):
    return next(h for h in HARM if h[0] <= tt % 30 < h[1])


# 1) pulso grave redondo (semínimas; no trecho sensível, mínimas) — atravessa a emenda do loop
for i in range(60):
    tt = i * BEAT
    _, _, ch, root = chord_at(tt)
    sens = SENS[0] <= tt < SENS[1]
    if sens and i % 2: continue
    place(pulse_bass(root, 0.42 if not sens else 0.9, vel=1.0 if i % 2 == 0 else 0.8), tt, amp=0.5 if not sens else 0.36, rev=0.08)

# 2) cama de cordas (sustenta a harmonia, sem crescendos dramáticos)
for t0, t1, ch, root in HARM:
    place(stereo_strings([root + 12] + ch[:3], t1 - t0 + 0.35, cutoff=1200 + 1600 * intensity(t0), att=0.3, rel=0.45, vib=0.002), t0, amp=0.12 + 0.26 * intensity(t0) ** 1.3, rev=0.5)
    if t0 >= 11:   # cordas na oitava de cima, entrando conforme a energia sobe
        place(stereo_strings([m + 12 for m in ch[1:]], t1 - t0 + 0.35, cutoff=3000, att=0.4, rel=0.45, vib=0.004), t0, amp=0.22 * max(0, intensity(t0) - 0.4), rev=0.55)

# 3) cordas graves em marcato (condução com peso histórico) nos trechos de energia
def marcato(m, tt, vel=1.0):
    place(stereo_strings([m, m + 12], 0.42, cutoff=1800, att=0.025, rel=0.18, vib=0.0), tt, amp=0.3 * vel, rev=0.35)

for t0, t1, step in ((4.0, 11.0, BEAT), (16.0, 20.0, BEAT), (21.0, 27.0, BEAT / 2)):
    i = 0; tt = t0
    while tt < t1 - 0.01:
        _, _, ch, root = chord_at(tt)
        marcato(root + 12 if i % 4 != 2 else root + 19, tt, (1.0 if i % 4 == 0 else 0.75) * (0.3 + 1.1 * intensity(tt) ** 1.5) * (0.6 if 16 <= tt < 20 else 1))
        tt += step; i += 1

# timbale marcando o tempo, cada vez mais presente
for t0, t1, step in ((6.0, 11.0, 2 * BEAT), (18.0, 20.0, 4 * BEAT), (21.0, 25.0, 2 * BEAT), (25.0, 27.0, BEAT)):
    tt = t0
    while tt < t1 - 0.01:
        _, _, ch, root = chord_at(tt)
        place(timp(root, 0.25 + 0.6 * intensity(tt) ** 1.5), tt, amp=0.3 + 0.45 * intensity(tt), pan=-0.1, rev=0.3)
        tt += step

# 4) piano no trecho sensível: melodia simples, no tempo
for tt, m, v in ((12.0, 71, 0.4), (13.0, 69, 0.36), (14.0, 66, 0.38), (15.0, 69, 0.36), (16.0, 67, 0.38),
                 (17.0, 64, 0.36), (18.0, 66, 0.38), (19.0, 74, 0.38), (20.0, 73, 0.36)):
    place(piano(m, v, dur=3.0), tt, amp=0.55, pan=0.1, rev=0.5)
for tt, m in ((12.0, 43), (14.0, 42), (16.0, 40), (18.0, 35)):   # baixo do piano
    place(piano(m, 0.3, dur=3.0), tt, amp=0.45, pan=-0.1, rev=0.45)


# 5) passagens musicais: crescendo de cordas + rufo de timbale que deságuam no impacto
def swell_into(t_hit, dur, notes, amp=0.32):
    sw = stereo_strings(notes, dur, cutoff=2600, att=dur * 0.95, rel=0.02, vib=0.003)
    place(sw, t_hit - dur, amp=amp, rev=0.4)


def timp_roll(t_hit, dur, m):
    n = int(dur / (BEAT / 4))
    for k in range(n):
        tt = t_hit - dur + k * BEAT / 4
        place(timp(m, 0.15 + 0.55 * (k / n) ** 1.6), tt, amp=0.5, pan=-0.1, rev=0.3)


for t_hit, notes, m, d in ((6.0, [45, 52, 57, 61], 33, 1.5), (11.0, [50, 54, 57, 62], 38, 1.2),
                           (21.0, [45, 52, 57, 61], 33, 1.8), (27.0, [45, 52, 55, 61], 33, 1.2)):
    swell_into(t_hit, d, notes)
    timp_roll(t_hit, min(1.0, d), m)

# varreduras de saída (7,15 s e 12,2 s): a mudança de acorde já marca; só um leve crescendo
swell_into(8.0, 0.9, [47, 54, 59], amp=0.18)
swell_into(12.2, 1.0, [43, 50, 59], amp=0.2)

# 6) IMPACTOS nas cenas importantes: metais quentes + timbale + bumbo (prato discreto)
STINGS = [(6.0, [38, 50, 57, 62, 66], 38, 1.0),        # JORNALISMO (ré maior)
          (11.0, [31, 43, 50, 55, 59, 62], 43, 1.0),   # JUDICIÁRIO (sol maior, elevação)
          (21.0, [38, 50, 57, 62, 66, 69], 38, 1.1),   # troféu (ré maior pleno)
          (27.0, [38, 50, 57, 62, 64, 66, 69], 38, 0.95)]  # logo (ré maior com nona: honra, chegada)
for tt, notes, root, v in STINGS:
    g = 0.6 + 0.5 * intensity(tt)          # cada impacto maior que o anterior
    place(np.vstack([stab(notes, dur=2.4, vel=v, warm=True), stab(notes, dur=2.4, vel=v, warm=True)]), tt, amp=0.7 * g, rev=0.45)
    if tt >= 11: place(np.vstack([stab([n - 12 for n in notes[1:4]], dur=2.6, vel=v, warm=True)] * 2), tt, amp=0.45 * g, rev=0.45)
    place(kick(1.0), tt, amp=0.6, rev=0.05)
    place(timp(root, 1.0), tt, amp=0.9, rev=0.35)
    place(crash(v * 0.5, 2.8), tt, amp=0.5, rev=0.4)

# 6b) assinatura: chamado curto de metais depois do impacto (identidade sonora do prêmio)
def horn(m, tt, dur=1.1, amp=0.5):
    place(np.vstack([stab([m, m - 12], dur=dur, vel=0.9, warm=True), stab([m, m - 12], dur=dur, vel=0.9, warm=True)]), tt, amp=amp, rev=0.5)

for tt, a, b, g in ((6.0, 57, 62, 0.45), (11.0, 62, 67, 0.5), (21.0, 57, 62, 0.55), (27.0, 62, 69, 0.6)):
    horn(a, tt + 0.5, 0.6, g); horn(b, tt + 1.0, 1.6, g * 1.1)

# 7) logo: ré maior com nona sustentado, voltando ao pulso do início para o loop
place(stereo_strings([38, 50, 54, 57, 64], 2.4, cutoff=2200, att=0.2, rel=0.9), 27.0, amp=0.3, rev=0.6)
for tt, m, v in ((27.5, 66, 0.34), (28.0, 69, 0.32), (28.5, 74, 0.3)):
    place(piano(m, v, dur=3.0), tt, amp=0.5, pan=0.1, rev=0.55)

render(sys.argv[1], wet_amt=0.42)

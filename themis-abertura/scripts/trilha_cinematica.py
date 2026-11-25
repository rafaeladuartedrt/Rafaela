"""Versão 1 (cinematográfica) da trilha. Uso: trilha_cinematica.py <saida.wav>"""
import sys
from trilha_lib import *

# ---------------------------------------------------------------- partitura
DM, BB, F_, C_, GM, A_ = [50, 53, 57, 62], [46, 53, 58, 62], [45, 53, 57, 60], [48, 52, 55, 60], [43, 50, 55, 58], [45, 52, 57, 61]

# drone de ré que atravessa a emenda do loop (29 s -> 3,4 s do ciclo seguinte)
place(stereo_strings([38, 45, 50], 4.4, cutoff=520, att=1.2, rel=1.3, vib=0.002), 29.0, amp=0.55, rev=0.5)

# tique-taque de relógio de redação (prazo do jornalismo): 0–12 s e volta no fim (28,5–30)
for i in range(60):
    tt = i * 0.5
    if tt < 12.0: lvl = 0.06 if tt < 3 else 0.04 * (1 - max(0, tt - 10.5) / 1.5)
    elif tt >= 28.5: lvl = 0.06 * (tt - 28.5 + 0.5) / 2.0
    else: continue
    place(tick(i % 2 == 1), tt, amp=lvl, pan=0.25 if i % 2 else -0.25, rev=0.15)

# 0–3 s respiro: piano esparso
for tt, m, v in ((0.35, 69, 0.30), (1.25, 76, 0.26), (2.0, 77, 0.28), (2.65, 74, 0.26)):
    place(piano(m, v), tt, amp=0.55, pan=0.1, rev=0.45)

# ---- JORNALISMO (3–7,75 s)
place(stereo_strings(DM, 1.9, cutoff=1500), 2.85, amp=0.5, rev=0.5)
place(stereo_strings(BB, 1.3, cutoff=1900, att=0.4), 4.35, amp=0.5, rev=0.5)
for tt, x in ((3.35, -0.5), (3.5, 0.5), (3.7, -0.5), (3.9, 0.2), (4.0, 0.7)):   # blocos do mosaico
    for j in range(2): place(typekey(), tt + j * 0.045, amp=0.22, pan=x, rev=0.12)
place(whoosh(0.7, 300, 3500), 3.9, amp=0.28, rev=0.2)           # barras verdes
place(whoosh(0.7, 3500, 400), 4.1, amp=0.25, rev=0.2)
place(whoosh(0.55, 250, 2500, peak=0.8), 4.8, amp=0.32, rev=0.2)  # bloco entra
place(riser(0.95), 5.1, amp=0.42, rev=0.25)
place(reverse_swell(0.6), 5.45, amp=0.5, rev=0.3)
HIT1 = 6.05
place(boom(1.0), HIT1, amp=0.95, rev=0.2)
place(stereo_strings([38, 50, 57, 62, 65, 69], 1.9, cutoff=3200, att=0.05, rel=1.0), HIT1, amp=0.62, rev=0.55)
for m, v in ((26, 0.7), (38, 0.6), (74, 0.45), (81, 0.35)): place(piano(m, v), HIT1, amp=0.6, rev=0.5)
place(whoosh(0.75, 500, 6000, peak=0.6), 7.05, amp=0.4, rev=0.25)   # varredura de saída

# ---- JUDICIÁRIO (7,2–12,8 s)
place(stereo_strings(GM, 1.8, cutoff=1500), 7.25, amp=0.48, rev=0.5)
place(stereo_strings(BB, 1.4, cutoff=1700), 8.85, amp=0.48, rev=0.5)
place(stereo_strings(C_, 0.9, cutoff=2000, att=0.3, rel=0.4), 9.95, amp=0.48, rev=0.5)
for i, tt in enumerate((7.2, 7.3, 7.35, 7.45, 7.5, 7.6, 7.75, 7.85, 7.9, 8.0, 8.1, 8.2)):
    place(typekey(), tt, amp=0.2, pan=((i % 4) - 1.5) / 2, rev=0.12)
place(whoosh(0.65, 300, 3500), 8.4, amp=0.25, rev=0.2)
place(whoosh(0.65, 3500, 400), 8.6, amp=0.22, rev=0.2)
place(whoosh(0.55, 250, 2500, peak=0.8), 9.85, amp=0.32, rev=0.2)
place(riser(1.0), 10.05, amp=0.45, rev=0.25)
place(reverse_swell(0.6), 10.45, amp=0.5, rev=0.3)
HIT2 = 11.05
place(boom(1.1), HIT2, amp=1.0, rev=0.2)
place(stereo_strings([34, 46, 53, 58, 62, 65], 1.6, cutoff=3400, att=0.05, rel=1.0), HIT2, amp=0.62, rev=0.55)
for m, v in ((22, 0.7), (34, 0.6), (77, 0.45), (86, 0.3)): place(piano(m, v), HIT2, amp=0.6, rev=0.5)
place(whoosh(0.75, 500, 6000, peak=0.6), 12.1, amp=0.4, rev=0.25)

# ---- espaço contínuo (12,2–20,5 s): momento emocional
PROG = [(12.3, 14.6, BB, 34), (14.4, 16.7, F_, 33), (16.5, 18.7, GM, 31), (18.5, 20.8, DM, 38), (20.4, 21.45, A_, 33)]
for t0, t1, ch, bass in PROG:
    place(stereo_strings([m + 12 for m in ch[1:]], t1 - t0, cutoff=2600, att=0.9, rel=1.0, vib=0.004), t0, amp=0.36, rev=0.6)
    place(stereo_strings([bass, bass + 12], t1 - t0, cutoff=600, att=0.7, rel=0.9), t0, amp=0.42, rev=0.4)
# arpejo de piano (colcheias ~71 bpm)
arp_t = 12.4
while arp_t < 20.35:
    ch = next(c for a, b, c, _ in PROG if a <= arp_t < b - 0.2)
    pat = [ch[0], ch[2], ch[3], ch[1] + 12, ch[3], ch[2]]
    i = int(round((arp_t - 12.4) / 0.42))
    place(piano(pat[i % 6], 0.2 + 0.05 * (i % 3 == 0)), arp_t, amp=0.42, pan=-0.2 + 0.4 * ((i % 6) / 5), rev=0.5)
    arp_t += 0.42
# melodia
for tt, m, v in ((12.55, 77, 0.42), (13.4, 74, 0.38), (14.55, 72, 0.4), (15.3, 69, 0.36), (15.75, 72, 0.36),
                 (16.1, 77, 0.42), (16.65, 74, 0.4), (17.5, 70, 0.36), (18.05, 69, 0.36), (18.65, 69, 0.38),
                 (19.4, 74, 0.4), (20.05, 76, 0.42), (20.55, 73, 0.4)):
    place(piano(m, v), tt, amp=0.62, pan=0.15, rev=0.55)
# palavras: teclas acompanhando as letras + sino suave
for at, n, bm in ((13.2, 9, 74), (15.0, 7, 77), (17.15, 8, 74), (19.15, 8, 81)):
    place(bell(bm), at + 0.3, amp=0.35, pan=0.3, rev=0.6)
    for i in range(n): place(typekey(0.6), at + 0.3 + i * 0.07, amp=0.13, pan=-0.3 + 0.6 * i / n, rev=0.15)
# peças entrando (papel) e pulsos graves nas viradas
for tt in (12.5, 12.7, 13.0, 14.5, 14.8, 15.1, 15.4, 15.7, 16.15, 16.4, 16.8, 18.25, 18.45, 18.7, 18.95):
    place(paper(), tt, amp=0.18, pan=rng.uniform(-0.6, 0.6), rev=0.3)
for tt in (14.45, 16.55, 18.55): place(timp(38, 0.5), tt, amp=0.45, rev=0.35)

# ---- troféu (20,45–26,8 s)
place(stereo_strings([45, 52, 57, 61, 64], 0.95, cutoff=2400, att=0.6, rel=0.1, trem=0.5), 20.4, amp=0.42, rev=0.5)
place(riser(0.9, 150, 7000), 20.4, amp=0.5, rev=0.25)
place(reverse_swell(0.75), 20.55, amp=0.55, rev=0.3)
HIT3 = 21.3   # entrada estourada de luz
place(boom(1.3, 3.8), HIT3, amp=1.0, rev=0.25)
place(stereo_strings([38, 50, 57, 62, 64, 65, 69], 1.6, cutoff=3800, att=0.04, rel=0.9), HIT3, amp=0.6, rev=0.6)
place(np.vstack([shimmer(2.4), shimmer(2.4)]), HIT3, amp=0.9, rev=0.7)
for m, v in ((26, 0.7), (50, 0.5), (57, 0.45), (62, 0.45)): place(piano(m, v), HIT3, amp=0.55, rev=0.5)
place(stereo_strings([46, 53, 57, 62, 65], 1.6, cutoff=2600, att=0.5), 22.5, amp=0.45, rev=0.6)
place(stereo_strings([41, 53, 57, 60, 65], 1.0, cutoff=2600, att=0.4), 23.8, amp=0.45, rev=0.6)
place(stereo_strings([36, 48, 53, 55, 60, 67], 0.75, cutoff=2600, att=0.3, rel=0.3), 24.7, amp=0.48, rev=0.6)   # Csus4
place(stereo_strings([36, 48, 52, 55, 60, 67], 0.85, cutoff=2800, att=0.25, rel=0.4), 25.3, amp=0.5, rev=0.6)   # C
for tt, m, v in ((22.6, 77, 0.38), (23.9, 72, 0.38), (24.75, 79, 0.36)): place(piano(m, v), tt, amp=0.55, rev=0.55)
place(np.vstack([shimmer(0.95, (88, 93, 96), True), shimmer(0.95, (88, 93, 96), True)]), 23.7, amp=0.8, rev=0.6)  # reflexo
place(whoosh(1.0, 120, 5000, curve=2.0, peak=0.92), 25.8, amp=0.55, rev=0.25)   # avança para a câmera
place(riser(0.9, 200, 6000), 25.85, amp=0.35, rev=0.25)

# ---- logo (26,5–30 s): resolução em fá maior, quente, e volta ao drone
place(timp(29, 0.55), 26.75, amp=0.5, rev=0.4)
for tt, pan in ((26.55, -0.6), (26.6, 0.6)): place(bell(84, 2.4), tt, amp=0.32, pan=pan, rev=0.65)   # brilho nas linhas
place(stereo_strings([41, 53, 57, 60, 67, 72], 3.3, cutoff=3000, att=0.5, rel=1.6), 26.7, amp=0.5, rev=0.65)
place(stereo_strings([29, 41], 3.1, cutoff=500, att=0.5, rel=1.5), 26.75, amp=0.45, rev=0.4)
for tt, m, v in ((26.95, 53, 0.4), (26.95, 60, 0.35), (27.35, 69, 0.36), (27.75, 72, 0.36), (28.25, 79, 0.32), (28.9, 77, 0.3)):
    place(piano(m, v), tt, amp=0.6, pan=0.1, rev=0.6)


render(sys.argv[1])

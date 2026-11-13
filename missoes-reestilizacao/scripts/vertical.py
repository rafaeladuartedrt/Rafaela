"""Etapa C - Reenquadramento para 9:16 (Reels/Stories) e 4:5 (Feed).
O movimento de camera original nao muda: so o recorte acompanha o assunto
(cruz -> fachada -> janela), com transicoes suaves.

Abordagem A (recorte): recorte de altura cheia que segue o assunto; corta cruz/fachada nos trechos largos.
Abordagem B (extensao): a estrutura principal fica inteira; ceu/papel, gramado e blocos sao
prolongados para cima e para baixo, no estilo dos cartazes de Vyborg.

Uso: python3 vertical.py <reels|feed> <A|B> <frame> [<frame> ...]
     python3 vertical.py <reels|feed> pista     -> imprime a pista de camera
"""
import sys, os, cv2, numpy as np
from scipy.ndimage import gaussian_filter1d
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render as RD

FORM = dict(reels=dict(w=1080, h=1920, topo=250, base=340), feed=dict(w=1080, h=1350, topo=60, base=60))

def ease(t): t = np.clip(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10)

def pista(fmt, modo):
    """Devolve (a, tx, ty) por frame: saida = a * coords_1080p + (tx, ty)."""
    F = FORM[fmt]; w, h = F['w'], F['h']; a_cheio = h / 1080.
    cyc = (F['topo'] + (h - F['base'])) / 2.          # centro da zona segura
    N = 240; fit = RD.FIT; HT = RD.HT
    # ----- assunto 1: cruz
    cz = np.zeros((N, 3))
    for i in range(N):
        q = fit[min(i, 94)]
        larg = 234 * q[2]                             # envergadura dos bracos
        topo = q[1] + q[3] * (127 - 300); pe = q[1] + q[3] * 100 + q[4] * (751 - 400)
        alt = pe - topo
        a = min(a_cheio, w / (1.22 * larg), (h - F['topo'] - F['base']) / (1.04 * alt) if modo == 'B' else 9)
        cz[i] = (a, q[0], q[1] + q[3] * 20)           # centro: cruzamento dos bracos
        if modo == 'B': cz[i, 2] = (topo + pe) / 2
    # ----- assunto 2: fachada inteira (enquanto couber no quadro original)
    fc = np.zeros((N, 3)); jn = np.zeros((N, 3))
    for i in range(N):
        j = int(np.clip(i, 40, 212)); Hm = HT[j]
        P = cv2.perspectiveTransform(np.array([[[270, 60], [1740, 60], [270, 790], [1740, 790], [1001, 406]]], np.float32), Hm)[0]
        x0, x1 = max(P[:, 0].min(), 0), min(P[:, 0].max(), 1920); y0, y1 = max(P[:2, 1].mean(), -200), min(P[2:4, 1].mean(), 1280)
        fc[i] = (min(a_cheio, w / (1.06 * (x1 - x0))), (x0 + x1) / 2, (y0 + y1) / 2)
        jn[i] = (a_cheio, np.clip(P[4, 0], w / 2 / a_cheio, 1920 - w / 2 / a_cheio), 540)
    if modo == 'A':
        cz[:, 0] = a_cheio; fc[:, 0] = a_cheio; cz[:, 2] = 540; fc[:, 2] = 540
    # ----- pesos (ease in-out): cruz -> fachada (frames 74-96) -> janela (150-186)
    f = np.arange(N); w_f = ease((f - 74) / 22.); w_j = ease((f - 150) / 36.)
    la = (1 - w_f) * np.log(cz[:, 0]) + w_f * ((1 - w_j) * np.log(fc[:, 0]) + w_j * np.log(jn[:, 0]))
    cx = (1 - w_f) * cz[:, 1] + w_f * ((1 - w_j) * fc[:, 1] + w_j * jn[:, 1])
    cy = (1 - w_f) * cz[:, 2] + w_f * ((1 - w_j) * fc[:, 2] + w_j * jn[:, 2])
    alvo_y = (1 - w_j * w_f) * cyc + (w_j * w_f) * (h / 2)
    la, cx, cy = [gaussian_filter1d(v, 5, mode='nearest') for v in (la, cx, cy)]
    a = np.exp(la)
    if modo == 'A':   # recorte puro: nunca sai do quadro original
        a = np.full(N, a_cheio); cx = np.clip(cx, w / 2 / a, 1920 - w / 2 / a); cy = np.full(N, 540.); alvo_y = np.full(N, h / 2)
    else:             # extensao so na vertical: nas laterais o recorte fica dentro do quadro
        cx = np.clip(cx, w / 2 / a, 1920 - w / 2 / a)
        a = np.maximum(a, w / 1920.)
    tx = w / 2 - a * cx; ty = alvo_y - a * cy
    if modo == 'B':   # quando o recorte ja enche a altura, nao deixa sobrar faixa estendida
        cheio = a >= a_cheio - 1e-6
        ty = np.where(cheio, np.clip(ty, h - a * 1080, 0), ty)
    return a, tx, ty

if __name__ == '__main__':
    fmt, modo = sys.argv[1], sys.argv[2]
    if modo == 'pista':
        for m in 'AB':
            a, tx, ty = pista(fmt, m)
            for i in range(0, 240, 12): print(m, i, round(a[i], 3), round(tx[i]), round(ty[i]))
        sys.exit()
    a, tx, ty = pista(fmt, modo); F = FORM[fmt]
    out = f'{RD.R}/out_{fmt}_{modo}'; os.makedirs(out, exist_ok=True)
    for s in sys.argv[3:]:
        i = int(s)
        RD.set_view(F['w'], F['h'], a[i], tx[i], ty[i], ext=(modo == 'B'), bloco_y=(-140, 1000) if modo == 'B' else None)
        RD._paper = None
        RD.save(f'{out}/s_{i:04d}.png', RD.render(i)); print('ok', i, flush=True)

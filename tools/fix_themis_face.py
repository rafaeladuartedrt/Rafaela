"""Mantém a Themis idêntica à original na tomada de drone gerada por IA.

A parede é plana: estima-se, quadro a quadro, a homografia da parede (pontos fora da estátua)
e recoloca-se por cima a estátua real do primeiro quadro, deformada pela mesma homografia,
com máscara suave. Quando a estátua fica pequena demais para se distinguir, a sobreposição some.

uso: python3 tools/fix_themis_face.py clip.mp4 primeiro_quadro.jpg saida.mp4
"""
import sys, subprocess
import numpy as np, cv2

clip, src_path, out_path = sys.argv[1:4]
ROOT = '/home/user/Rafaela/'

src = cv2.imread(src_path)
cap = cv2.VideoCapture(clip)
fps = cap.get(cv2.CAP_PROP_FPS)
W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
src = cv2.resize(src, (W, H), interpolation=cv2.INTER_AREA)

# --- máscara da estátua no primeiro quadro: foto original -> quadro, via homografia
photo = cv2.imread(ROOT + 'assets/photos/themis_frontal.jpg')
cut = cv2.imread(ROOT + 'assets/photos/themis_cut_mask.png', 0)
full = np.zeros(photo.shape[:2], np.uint8)
full[150:150 + cut.shape[0], 940:940 + cut.shape[1]] = cut
sift = cv2.SIFT_create(4000)
def match(a, b, ma=None, mb=None, ratio=0.75):
    ka, da = sift.detectAndCompute(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), ma)
    kb, db = sift.detectAndCompute(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), mb)
    if da is None or db is None: return None
    m = cv2.BFMatcher().knnMatch(da, db, k=2)
    good = [x for x, y in (p for p in m if len(p) == 2) if x.distance < ratio * y.distance]
    if len(good) < 12: return None
    pa = np.float32([ka[g.queryIdx].pt for g in good]); pb = np.float32([kb[g.trainIdx].pt for g in good])
    Hm, inl = cv2.findHomography(pa, pb, cv2.RANSAC, 3.0)
    return Hm
ps = 0.5
Hp = match(cv2.resize(photo, None, fx=ps, fy=ps), src)
S = np.diag([ps, ps, 1.0])
Hp = Hp @ S
mask0 = cv2.warpPerspective(full, Hp, (W, H))
# região ampla: estátua + entorno de parede (cobre o cabelo maior que a IA inventa), borda suave
hull = cv2.convexHull(np.column_stack(np.where(mask0.T > 128)).astype(np.int32))
big = np.zeros_like(mask0); cv2.fillConvexPoly(big, hull, 255)
big = cv2.dilate(np.maximum(big, mask0), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (161, 161)))
mask0_statue = mask0
mask0 = cv2.GaussianBlur(big, (0, 0), 30)
ys, xs = np.where(mask0_statue > 128)
statue_h0 = ys.max() - ys.min()
print('estátua no 1º quadro: altura', statue_h0, 'px')

# --- acompanhamento da parede (fora da estátua) e recomposição
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
                       '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', out_path], stdin=subprocess.PIPE)
Hacc = np.eye(3)
prev = None
k = 0
fade_from = None
lost = False
fade = 1.0
while True:
    ok, fr = cap.read()
    if not ok: break
    if prev is not None:
        # homografia anterior -> atual usando só a parede (estátua mascarada)
        ms = cv2.warpPerspective(mask0, Hacc, (W, H))
        wall = cv2.bitwise_not(cv2.dilate((ms > 20).astype(np.uint8) * 255, np.ones((41, 41), np.uint8)))
        Hk = match(prev, fr, wall, wall, 0.7)
        if Hk is not None: Hacc = Hk @ Hacc
        else: lost = True
    warped = cv2.warpPerspective(src, Hacc, (W, H), flags=cv2.INTER_LANCZOS4)
    m = cv2.warpPerspective(mask0, Hacc, (W, H)).astype(np.float32) / 255.0
    sh = (np.abs(np.linalg.det(Hacc[:2, :2])) ** 0.5) * statue_h0
    # some quando a estátua ocupa menos de 14% da altura do quadro
    a = np.clip((sh / H - 0.22) / 0.08, 0, 1)
    if lost: fade = max(0.0, fade - 0.1)
    a = min(a, fade)
    out = fr.astype(np.float32) * (1 - m[..., None] * a) + warped.astype(np.float32) * (m[..., None] * a)
    ff.stdin.write(np.clip(out, 0, 255).astype(np.uint8).tobytes())
    if k % 24 == 0: print(f'quadro {k}: estátua {sh / H * 100:.0f}% da altura, sobreposição {a:.2f}')
    prev = fr; k += 1
ff.stdin.close(); ff.wait()
print('ok', k, 'quadros')

"""Etapa A.4 - Movimento: homografia do plano da fachada (ref = frame 120) por
fluxo optico LK + RANSAC, acumulada nos dois sentidos, com refinamento ECC contra a referencia.
Saida: work/track_fachada.npy  (240x3x3, NaN onde a fachada nao existe), work/track_cruz.json (bbox/centro por frame)."""
import cv2, numpy as np, json
R='/home/user/Rafaela/missoes-reestilizacao/work'; REF=120; A,B=40,212
g=lambda i:cv2.cvtColor(cv2.imread(f'{R}/frames/f_{i:04d}.png'),cv2.COLOR_BGR2GRAY)
m=lambda i:cv2.imread(f'{R}/mattes/fachada/m_{i:04d}.png',0)
def step(i,j):
    gi,gj=g(i),g(j); mk=cv2.erode(m(i),np.ones((9,9),np.uint8))
    p=cv2.goodFeaturesToTrack(gi,2500,0.005,6,mask=mk)
    if p is None or len(p)<30: return None
    q,st,_=cv2.calcOpticalFlowPyrLK(gi,gj,p,None,winSize=(31,31),maxLevel=4)
    p2,st2,_=cv2.calcOpticalFlowPyrLK(gj,gi,q,None,winSize=(31,31),maxLevel=4)
    ok=(st.ravel()==1)&(st2.ravel()==1)&(np.linalg.norm((p-p2).reshape(-1,2),axis=1)<1.0)
    if ok.sum()<30: return None
    Hm,inl=cv2.findHomography(p[ok],q[ok],cv2.RANSAC,2.0)
    return Hm,int(inl.sum()),int(ok.sum())
H=np.full((240,3,3),np.nan); H[REF]=np.eye(3); log={}
for rng,d in [(range(REF,B),1),(range(REF,A,-1),-1)]:
    for i in rng:
        r=step(i,i+d)
        if r is None: print('parou em',i+d); break
        H[i+d]=r[0]@H[i]; log[i+d]=r[1:]
np.save(f'{R}/track_fachada.npy',H)
v=[i for i in range(240) if not np.isnan(H[i,0,0])]
print('fachada rastreada de',v[0],'a',v[-1]); print({k:log[k] for k in list(log)[::15]})
# cruz: bbox e centro por frame (objeto nao rigido -> contorno vem do matte)
cr={}
for i in range(240):
    c=cv2.imread(f'{R}/mattes/cruz/m_{i:04d}.png',0)
    if c.sum()==0: continue
    x,y,w,h=cv2.boundingRect(c); cr[i]=[x,y,w,h]
json.dump(cr,open(f'{R}/track_cruz.json','w')); print('cruz presente de',min(cr),'a',max(cr))

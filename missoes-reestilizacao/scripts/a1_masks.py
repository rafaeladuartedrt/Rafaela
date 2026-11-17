"""Etapa A.3 - Mattes por elemento (ceu, vegetacao, cruz, fachada, janela).
Segmentacao por cor em HSV + morfologia + rastreio de componentes entre frames.
Saida: work/mattes/<elemento>/m_####.png (1920x1080, 8 bits)."""
import cv2, numpy as np, os, sys
R='/home/user/Rafaela/missoes-reestilizacao/work'
N=240
for k in ['ceu','veg','cruz','fachada','janela']: os.makedirs(f'{R}/mattes/{k}',exist_ok=True)
def fill_holes(m):
    h,w=m.shape; ff=np.zeros((h+2,w+2),np.uint8); inv=cv2.copyMakeBorder(m,1,1,1,1,cv2.BORDER_CONSTANT,value=0)
    cv2.floodFill(inv,None,(0,0),255); inv=inv[1:-1,1:-1]
    return m|cv2.bitwise_not(inv)
K=lambda n:cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(n,n))
prev_cross=None; cross_alive=True; prev_win=None
stats=[]
for i in range(N):
    im=cv2.imread(f'{R}/frames/f_{i:04d}.png')
    b,g,r=[im[...,c].astype(np.int32) for c in range(3)]
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV); H,S,V=[hsv[...,c].astype(np.int32) for c in range(3)]
    veg=((H>=20)&(H<75)&(S>60)&(V<235))|((H>=19)&(H<75)&(V>110)&(S>90)&(V<235))
    sky0=((V>190)&(S<120)&(~veg))|(V>232)|((S<45)&(V>150))
    stone=(~veg)&(~sky0)
    stone=stone.astype(np.uint8)*255; veg=veg.astype(np.uint8)*255
    stone=cv2.morphologyEx(stone,cv2.MORPH_CLOSE,K(15)); stone=cv2.morphologyEx(stone,cv2.MORPH_OPEN,K(7))
    n,lab,st,cen=cv2.connectedComponentsWithStats(stone,8)
    cross=np.zeros_like(stone); fac=np.zeros_like(stone)
    comps=[(st[j,cv2.CC_STAT_AREA],j) for j in range(1,n) if st[j,cv2.CC_STAT_AREA]>2500]
    comps.sort(reverse=True)
    for a,j in comps:
        m=(lab==j)
        if cross_alive and prev_cross is None and i==0 and (a,j)==comps[0]: cross[m]=255; continue
        if cross_alive and prev_cross is not None:
            ov=(m&(prev_cross>0)).sum()
            if ov>0.5*a or ov>0.5*prev_area:
                mm=m.copy(); mm[:,min(1920,prev_x1+80):]=False; cross[mm]=255
                rest=m&~mm
                if i>=36 and rest.sum()>2500: fac[rest]=255
                continue
        if i>=36: fac[m]=255
    if cross.sum()==0: cross_alive=False
    prev_cross=cv2.dilate(cross,K(21)) if cross_alive else None
    if cross_alive:
        prev_area=int((cross>0).sum()); xs=np.where(cross.any(0))[0]; prev_x1=int(xs.max())
    # janela: buraco claro dentro da fachada
    win=np.zeros_like(stone)
    if fac.any():
        filled=fill_holes(fac); holes=filled&~fac
        holes=cv2.morphologyEx(holes,cv2.MORPH_OPEN,K(5))
        n2,l2,s2,_=cv2.connectedComponentsWithStats(holes,8)
        best=None
        for j in range(1,n2):
            mm=l2==j
            if s2[j,cv2.CC_STAT_AREA]>300 and V[mm].mean()>200:
                if best is None or s2[j,cv2.CC_STAT_AREA]>s2[best,cv2.CC_STAT_AREA]: best=j
        if best: win[l2==best]=255
        elif prev_win is not None:   # janela tocando a borda do quadro (push-in final)
            nf=cv2.morphologyEx(cv2.bitwise_not(fac|veg),cv2.MORPH_OPEN,K(5))
            n3,l3,s3,_=cv2.connectedComponentsWithStats(nf,8)
            for j in range(1,n3):
                mm=l3==j
                if (mm&(prev_win>0)).sum()>0.5*(prev_win>0).sum(): win[mm]=255
        prev_win=win.copy() if win.any() else None
        fac=(filled|fac)&~win
    cross=fill_holes(cross) if i>=60 else cross   # no close inicial os vazios entre bracos sao ceu real
    veg=cv2.morphologyEx(veg,cv2.MORPH_CLOSE,K(9))&~cross&~fac&~win
    sky=cv2.bitwise_not(veg|cross|fac|win)
    for k,m in [('ceu',sky),('veg',veg),('cruz',cross),('fachada',fac),('janela',win)]:
        cv2.imwrite(f'{R}/mattes/{k}/m_{i:04d}.png',m)
    if i%12==0 or i in (30,72,220):
        ov=im.copy()
        for m,c in [(veg,(0,200,0)),(cross,(0,180,255)),(fac,(60,60,255)),(win,(255,255,255)),(sky,(255,180,0))]:
            ov[m>0]=(0.55*ov[m>0]+0.45*np.array(c)).astype(np.uint8)
        cv2.imwrite(f'{R}/dbg/mask_{i:04d}.jpg',cv2.resize(ov,(640,360)))
    stats.append((i,int(cross.sum()/255),int(fac.sum()/255),int(win.sum()/255)))
np.save(f'{R}/mask_stats.npy',np.array(stats))
for s in stats[::12]: print(s)

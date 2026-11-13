"""Etapa A.6 - Encaixe do pictograma da cruz sobre a cruz do video, quadro a quadro.
A cruz do video muda de forma ao longo do plano, entao o encaixe e parametrico (6 valores):
posicao, escala x, escala y dos bracos, escala y da haste e inclinacao. Otimiza a sobreposicao
(IoU) entre a silhueta do pictograma e o matte da cruz. Saida: work/fit_cruz.npy (240x7, NaN sem cruz)."""
import cv2, numpy as np, json
from scipy.optimize import minimize
from scipy.ndimage import gaussian_filter1d
B='/home/user/Rafaela/missoes-reestilizacao/work'; D=4
pc=json.load(open(f'{B}/picto_cruz.json')); SIL=np.array(pc['silhueta'],float)
X0,Y0,YS=219.0,300.0,400.0
def T(P,q):
    cx,ty,sx,sy,sy2,k,k2=q; x,y=P[:,0],P[:,1]
    Ya=ty+sy*(np.minimum(y,YS)-Y0); Yb=sy2*np.maximum(y-YS,0); Y=Ya+Yb
    X=cx+sx*(x-X0)+k*(Ya-ty)+k2*Yb
    return np.stack([X,Y],1)
if __name__=='__main__':
    def rast(q):
        q=q.copy(); q[5]=q[6]=0      # cruz sempre a prumo: sem inclinacao de bracos, haste ou base
        m=np.zeros((1080//D,1920//D),np.uint8); cv2.fillPoly(m,[np.round(T(SIL,q)/D*16).astype(np.int32)],255,cv2.LINE_AA,4); return m.astype(np.float32)/255
    def cost(q,tg,q0):
        m=rast(q); i=(m*tg).sum(); u=m.sum()+tg.sum()-i
        return 1-i/max(u,1)+0.02*np.sum(((q-q0)/np.array([200,200,2,2,1.0,.3,.3]))**2)
    qi=np.array([468,399,2.29,1.93,1.45,0,0]); q=qi.copy(); F=np.full((240,7),np.nan); last=0
    for i in list(range(72,-1,-1))+list(range(73,96)):
        if i==73: q=F[72].copy()
        mk=cv2.imread(f'{B}/mattes/cruz/m_{i:04d}.png',0)
        if mk is None or mk.sum()==0: break
        last=max(last,i)
        mk=cv2.morphologyEx(mk,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(23,23)))
        tg=cv2.resize(mk,(1920//D,1080//D),interpolation=cv2.INTER_AREA).astype(np.float32)/255
        tg=cv2.GaussianBlur(tg,(0,0),1.5)
        best=None
        for st in ([40,40,.4,.3,.3,.06,.06],[15,15,.12,.1,.1,.03,.03]):
            r=minimize(cost,q,args=(tg,q),method='Nelder-Mead',options=dict(initial_simplex=np.vstack([q]+[q+np.eye(7)[j]*st[j] for j in range(7)]),maxiter=500,xatol=.02,fatol=1e-5))
            q=r.x
        q[5]=q[6]=0; F[i]=q
        if i%8==0: print(i,q.round(2),'IoU',round(1-cost(q,tg,q),3),flush=True)
    for c in range(7): F[:last+1,c]=gaussian_filter1d(F[:last+1,c],1.2,mode='nearest')
    np.save(f'{B}/fit_cruz.npy',F); print('cruz encaixada de 0 a',last)
    tiles=[]
    for i in (0,16,30,48,72,90):
        im=cv2.imread(f'{B}/frames/f_{i:04d}.png')
        if not np.isnan(F[i,0]): cv2.polylines(im,[np.round(T(SIL,F[i])*8).astype(np.int32)],True,(255,255,0),4,cv2.LINE_AA,3)
        tiles.append(cv2.resize(im,(960,540)))
    cv2.imwrite(f'{B}/dbg_cruz.jpg',np.vstack([np.hstack(tiles[k:k+2]) for k in (0,2,4)]),[cv2.IMWRITE_JPEG_QUALITY,85])

"""Etapa A.7 - Retangulo limpo da janela central por frame.
O raio de sol do original estoura a borda da janela e deforma o matte. Aqui cada lado do
retangulo e medido pela mediana do lado correspondente do matte, usando so a metade que o
brilho nao atinge; lados que encostam na borda do quadro vem do tracking da fachada.
Saida: work/janela_rect.npy (240x4: x0,y0,x1,y1 em coords 1080p; NaN sem janela)."""
import cv2, numpy as np
from scipy.ndimage import gaussian_filter1d, median_filter
B='/home/user/Rafaela/missoes-reestilizacao/work'; HT=np.load(f'{B}/track_fachada.npy')
PL=np.array([[[972,357],[1030,357],[1030,455],[972,455]]],np.float32)
Rt=np.full((240,4),np.nan); src=np.zeros((240,4),bool)
for i in range(40,213):
    if np.isnan(HT[i,0,0]): continue
    q=cv2.perspectiveTransform(PL,HT[i])[0]
    r=np.array([q[[0,3],0].mean(),q[[0,1],1].mean(),q[[1,2],0].mean(),q[[2,3],1].mean()])
    m=cv2.imread(f'{B}/mattes/janela/m_{i:04d}.png',0)>127
    if m.sum()>300:
        ys,xs=np.nonzero(m); y0b,y1b,x0b,x1b=ys.min(),ys.max(),xs.min(),xs.max(); h=y1b-y0b; w=x1b-x0b
        rows=np.arange(y0b,y1b+1); cols=np.arange(x0b,x1b+1)
        rmin=np.array([np.nonzero(m[y])[0].min() if m[y].any() else np.nan for y in rows]); rmax=np.array([np.nonzero(m[y])[0].max() if m[y].any() else np.nan for y in rows])
        cmin=np.array([np.nonzero(m[:,x])[0].min() if m[:,x].any() else np.nan for x in cols]); cmax=np.array([np.nonzero(m[:,x])[0].max() if m[:,x].any() else np.nan for x in cols])
        up=rows<y0b+0.5*h; rt=cols>x0b+0.45*w                 # brilho do sol: canto inferior esquerdo
        est=np.array([np.nanmedian(rmin[up]),np.nanmedian(cmin[rt]),np.nanmedian(rmax[up])+1,np.nanmedian(cmax[rt])+1])
        borda=[est[0]<4,est[1]<4,est[2]>1915,est[3]>1075]
        for k in range(4):
            if not borda[k] and abs(est[k]-r[k])<0.25*max(w,h)+12: r[k]=est[k]; src[i,k]=True
    Rt[i]=r
v=~np.isnan(Rt[:,0])
# diferenca entre a medida e o tracking, suavizada no tempo (evita trancos quando um lado troca de fonte)
for k in range(4):
    Rt[v,k]=gaussian_filter1d(median_filter(Rt[v,k],5,mode='nearest'),1.2,mode='nearest')
np.save(f'{B}/janela_rect.npy',Rt)
for i in range(60,213,24): print(i,Rt[i].round(1),src[i].astype(int))

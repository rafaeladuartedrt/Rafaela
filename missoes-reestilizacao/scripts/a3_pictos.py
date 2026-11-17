"""Etapa A.5 - Linhas-base a partir dos vetores originais do logo (input/logos_do_evento.pdf).
Pagina 2 = igreja, pagina 3 = cruz. Os caminhos sao tracos reais (linha de centro, 10,564 pt).
A igreja e levada ao frame 120 por mapa linear por trechos (mantem verticais e horizontais retas);
a cruz fica em coordenadas proprias e e encaixada quadro a quadro em a4_fit_cruz.py.
Saidas: work/picto_igreja.json, work/picto_cruz.json, output/camadas/*.svg"""
import cv2, numpy as np, json, os, warnings
warnings.filterwarnings('ignore')
import pymupdf
B='/home/user/Rafaela/missoes-reestilizacao'
doc=pymupdf.open(f'{B}/input/logos_do_evento.pdf')
def caminhos(pg):
    out=[]
    for dr in doc[pg].get_drawings():
        if 's' not in dr['type']: continue
        r=dr['rect']
        if r.x0<0 or r.y0<0: continue                       # sobras fora da pagina
        cur=[]
        def flush():
            if len(cur)>1: out.append(np.array(cur,float))
        for it in dr['items']:
            if it[0]=='l': pts=[(it[1].x,it[1].y),(it[2].x,it[2].y)]
            elif it[0]=='c':
                P=[np.array((p.x,p.y)) for p in it[1:5]]; t=np.linspace(0,1,24)[:,None]
                pts=[tuple(v) for v in (1-t)**3*P[0]+3*(1-t)**2*t*P[1]+3*(1-t)*t**2*P[2]+t**3*P[3]]
            elif it[0]=='qu':
                q=it[1]; pts=[(q.ul.x,q.ul.y),(q.ur.x,q.ur.y),(q.lr.x,q.lr.y),(q.ll.x,q.ll.y),(q.ul.x,q.ul.y)]
            elif it[0]=='re':
                q=it[1]; pts=[(q.x0,q.y0),(q.x1,q.y0),(q.x1,q.y1),(q.x0,q.y1),(q.x0,q.y0)]
            else: continue
            if cur and np.hypot(cur[-1][0]-pts[0][0],cur[-1][1]-pts[0][1])<0.6: cur.extend(pts[1:])
            else: flush(); cur=list(pts)
        flush()
    return out
def svg(polys,w,h,path,sw):
    os.makedirs(os.path.dirname(path),exist_ok=True)
    d=''.join('M'+' L'.join(f'{x:.2f},{y:.2f}' for x,y in p) for p in polys)
    open(path,'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><path d="{d}" fill="none" stroke="#FFFFFF" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>')
# ---------- cruz
cz=caminhos(2); print('cruz: caminhos',len(cz),[len(p) for p in cz])
main=max(cz,key=len)
json.dump(dict(linhas=[p.tolist() for p in cz],silhueta=main.tolist(),w=438.26,h=846.77),open(f'{B}/work/picto_cruz.json','w'))
svg(cz,438.26,846.77,f'{B}/output/camadas/linhas_cruz_pictograma.svg',10.564)
# ---------- igreja: pictograma -> frame 120
ig=caminhos(1); print('igreja: caminhos',len(ig))
XK=np.array([(92,274),(99,286),(146,378),(178,440),(230,556),(254,600),(284,648),(315,718),(328,735),(347,778),(431,962),(438,972),(463,1030),(469,1040),(558,1226),(577,1268),(586,1277),(617,1345),(641,1440),(663,1560),(709,1650),(740,1690),(775,1712),(802,1725)],float)
YT=np.array([(101,68),(111,82),(187,240),(201,268),(257,392),(295,468),(312,505),(372,640),(443,780)],float)                    # torre
YC=np.array([(136,130),(150,158),(162,188),(197,262),(216,278),(244,357),(290,455),(312,498),(365,615),(384,650),(443,780)],float) # corpo
YR=np.array([(291,560),(299,572),(344,612),(410,720),(445,780)],float)                                                             # ruina a direita
def mapa(p):
    x,y=p[:,0],p[:,1]
    X=np.interp(x,XK[:,0],XK[:,1])
    yt=np.interp(y,YT[:,0],YT[:,1]); yc=np.interp(y,YC[:,0],YC[:,1]); yr=np.interp(y,YR[:,0],YR[:,1])
    a=np.clip((x-231)/(253-231),0,1); b=np.clip((x-664)/(680-664),0,1)
    Y=(yt*(1-a)+yc*a)*(1-b)+yr*b
    return np.stack([X,Y],1)
def dens(p,step=5.0):
    o=[p[0]]
    for a,b in zip(p[:-1],p[1:]):
        n=max(1,int(np.linalg.norm(b-a)/step)); o+=[a+(b-a)*k/n for k in range(1,n+1)]
    return np.array(o)
res=[]
for p in ig:
    c=(p.min(0)+p.max(0))/2
    g='torre' if c[0]<232 else 'janela' if (430<c[0]<472 and 235<c[1]<300) else 'frontao' if (c[1]<218 and 300<c[0]<610) else 'corpo'
    res.append(dict(g=g,p=mapa(dens(p)).round(2).tolist()))
json.dump(res,open(f'{B}/work/picto_igreja.json','w'))
svg(ig,892.17,516.52,f'{B}/output/camadas/linhas_igreja_pictograma.svg',10.564)
svg([np.array(r['p']) for r in res],1920,1080,f'{B}/output/camadas/linhas_igreja_frame120.svg',7.5)
fr=cv2.imread(f'{B}/work/frames/f_0120.png')
for r in res: cv2.polylines(fr,[np.round(np.array(r['p'])*8).astype(np.int32)],False,(255,255,0),3,cv2.LINE_AA,3)
cv2.imwrite(f'{B}/work/dbg_picto.jpg',fr,[cv2.IMWRITE_JPEG_QUALITY,88])

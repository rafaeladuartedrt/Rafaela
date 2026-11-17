import cv2,numpy as np,sys
sys.path.insert(0,'/home/user/Rafaela/missoes-reestilizacao/scripts'); import geometria as G
R='/home/user/Rafaela/missoes-reestilizacao/work'; H=np.load(f'{R}/track_fachada.npy')
def pts(item,n=16):
    g,t,p=item; p=np.array(p,float)
    if t=='rect': p=np.vstack([p,p[:1]])
    if t=='q':
        s=np.linspace(0,1,n)[:,None]; p=(1-s)**2*p[0]+2*s*(1-s)*p[1]+s**2*p[2]
    return p
fr=[int(a) for a in sys.argv[1:]]; out=[]
for i in fr:
    im=cv2.imread(f'{R}/frames/f_{i:04d}.png')
    for it in G.L:
        q=cv2.perspectiveTransform(pts(it)[None].astype(np.float32),H[i])[0]
        cv2.polylines(im,[np.round(q*8).astype(np.int32)],False,(255,255,0),2,cv2.LINE_AA,3)
    cv2.putText(im,str(i),(20,50),0,1.5,(0,0,255),3); out.append(im)
cv2.imwrite(f'{R}/dbg_overlay.jpg',np.vstack([np.hstack(out[k:k+2]) for k in range(0,len(out),2)]) if len(out)>1 else out[0],[cv2.IMWRITE_JPEG_QUALITY,85])

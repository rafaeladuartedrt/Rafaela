"""Prepara ativos derivados em public/assets a partir de raw/ (extraídos com pdfimages).
Fotos e recortes recebem gradação (não são ativos protegidos). Logo e troféu NÃO passam por aqui."""
import json, os, numpy as np
from PIL import Image, ImageFilter
R='raw'; A='public/assets'; os.makedirs(f'{A}/grain',exist_ok=True)
GRAY=np.array([40,40,40.]); WARM=np.array([242,240,232.]); GREEN=np.array([176,212,32.])

def lum(im):
    a=np.asarray(im.convert('RGB')).astype(np.float32)/255
    return a[...,0]*.2126+a[...,1]*.7152+a[...,2]*.0722

def scurve(x, k=1.18):
    # contraste cinematográfico suave em torno de 0.45
    x=np.clip(x,0,1); y=0.5+np.tanh((x-0.45)*2.4*k)/(2*np.tanh(1.32*k))
    return np.clip(y,0,1)

def halation(y, amt=0.16, r=22):
    # brilho suave que "vaza" dos realces (halation de película), embutido na foto
    hi=np.clip((y-0.72)/0.28,0,1)
    b=np.asarray(Image.fromarray((hi*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)/255
    return 1-(1-y)*(1-b*amt)

def grade_bw(im):
    y=halation(scurve(lum(im)))
    # sombras levantadas até o cinza da marca, realces levemente quentes
    out=GRAY[None,None]*(1-y[...,None])+WARM[None,None]*y[...,None]
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8))

def grade_duo(im, amt=0.13):
    y=halation(scurve(lum(im)))
    base=GRAY*(1-y[...,None])+WARM*y[...,None]
    # duotone: meios-tons puxados para o verde, em baixa intensidade
    w=(4*y*(1-y))[...,None]*amt
    out=base*(1-w)+GREEN*w*0.85+base*w*0.15
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8))

meta={}
# seda: versão "brilho" (realces das dobras amplificados) para o movimento ondulante
sd=np.asarray(Image.open(f'{A}/seda_3500.png').convert('L')).astype(np.float32)
sh=np.clip((sd-40)/27,0,1)**0.8
sheen=np.clip(40+sh*120,0,255).astype(np.uint8)
Image.fromarray(np.dstack([sheen]*3)).save(f'{A}/seda_sheen_3500.jpg',quality=92)
for i in range(5):
    src=Image.open(f'{R}/news/n-00{i}.jpg')
    grade_bw(src).save(f'{A}/foto{i+1}_bw.jpg',quality=94,subsampling=0)
    grade_duo(src).save(f'{A}/foto{i+1}_duo.jpg',quality=94,subsampling=0)
    meta[f'foto{i+1}']=src.size

# recortes: imagens originais (pdfimages) montadas como papel, na ordem da página
clips={6:['n-005','n-006'],7:['n-009','n-007','n-008'],8:['n-010'],9:['n-011','n-012'],10:['n-013'],11:['n-014'],12:['n-015','n-016']}
PAPER=(240,238,231)
for p,names in clips.items():
    ims=[Image.open(f'{R}/news/{n}.png').convert('RGB') for n in names]
    w=max(i.width for i in ims); pad=34; gap=14
    h=sum(i.height for i in ims)+gap*(len(ims)-1)+2*pad
    paper=np.ones((h,w+2*pad,3),np.float32)*np.array(PAPER)
    rng=np.random.default_rng(p); paper+=rng.normal(0,2.2,paper.shape[:2])[...,None]
    canvas=Image.fromarray(np.clip(paper,0,255).astype(np.uint8)); y=pad
    for im in ims:
        # P&B suave: preserva legibilidade da manchete, multiplica sobre o papel
        g=lum(im); g=np.clip((g-0.02)/0.96,0,1)
        tile=np.array(PAPER,np.float32)*g[...,None]+np.array([34,34,34.])*(1-g[...,None])
        x=pad+(w-im.width)//2
        canvas.paste(Image.fromarray(np.clip(tile,0,255).astype(np.uint8)),(x,y)); y+=im.height+gap
    canvas.save(f'{A}/recorte{p}.png'); meta[f'recorte{p}']=canvas.size

# grão: 30 tiles (divisor de 900 e de 1800) => ciclo fechado no loop
rng=np.random.default_rng(6)
for k in range(30):
    n=rng.normal(0,1,(1000,1750)).astype(np.float32)
    n=np.asarray(Image.fromarray(np.clip(n*40+128,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.55))).astype(np.float32)
    n=(n-128)*1.9+128
    Image.fromarray(np.clip(n,0,255).astype(np.uint8)).save(f'{A}/grain/g{k:02d}.jpg',quality=88)

# rim light do troféu: borda da silhueta, mais forte no topo (luz vinda de trás/alto)
t=Image.open(f'{A}/trofeu.png'); al=np.asarray(t)[...,3].astype(np.float32)/255
er=np.asarray(Image.fromarray((al*255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))).astype(np.float32)/255
edge=np.clip(al-er,0,1)
edge=np.asarray(Image.fromarray((edge*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2))).astype(np.float32)/255
yy=np.linspace(1,0.35,al.shape[0])[:,None]; edge=np.clip(edge*yy*1.6,0,1)*al
rim=np.zeros(al.shape+(4,),np.uint8); rim[...,:3]=255; rim[...,3]=(edge*255).astype(np.uint8)
Image.fromarray(rim).save(f'{A}/trofeu_rim.png')
Image.fromarray(np.dstack([np.full(al.shape,255,np.uint8)]*3+[(al*255).astype(np.uint8)])).save(f'{A}/trofeu_alpha.png')
meta['trofeu']=t.size
json.dump(meta,open(f'{A}/meta.json','w'),indent=1); print(meta)

# máscaras de exclusão (alfa dilatado 3 px) para as camadas de pós não tocarem os ativos
from PIL import ImageFilter as _F
for src, dst in [(f'{A}/trofeu.png', f'{A}/trofeu_exclude.png')] + [
        (f'{A}/logo_{w}.png', f'{A}/logo_exclude_{w}.png') for w in [int(p[5:-4]) for p in os.listdir(A) if p.startswith('logo_') and p[5:-4].isdigit()]]:
    a0 = Image.open(src).split()[-1]
    pad = 8 if 'trofeu' in src else 0  # margem para a dilatação não ser cortada na borda da caixa
    al = Image.new('L', (a0.width + 2 * pad, a0.height + 2 * pad), 0); al.paste(a0, (pad, pad))
    al = al.point(lambda v: 255 if v > 0 else 0).filter(_F.MaxFilter(7))
    Image.merge('RGBA', [Image.new('L', al.size, 255)] * 3 + [al]).save(dst)
    print('exclusão', dst)

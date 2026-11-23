import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0,'tools')
from extract import extract, rows_of, bgcolor

def analyze(path, T=30):
    im,bg,boxes,mask=extract(path,T=T)
    rows=rows_of(boxes)
    return im,bg,mask,rows

def band(rows):
    return [(min(b[1] for b in r),max(b[3] for b in r)) for r in rows]

def colgrid(rows,ncols):
    # centers from rows that have exactly ncols blobs; else evenly spread over widest row
    good=[r for r in rows if len(r)==ncols]
    if good:
        c=np.mean([[ (b[0]+b[2])/2 for b in r] for r in good],axis=0)
    else:
        allx=[(b[0]+b[2])/2 for r in rows for b in r]
        c=np.linspace(min(allx),max(allx),ncols)
    return list(c)

def cut(im,bg,mask,y0,y1,cx,sp):
    x0=int(max(0,cx-sp/2)); x1=int(cx+sp/2)
    y0=int(max(0,y0-6)); y1=int(y1+6)
    m=mask[y0:y1,x0:x1]
    # keep biggest merged component
    dm=ndi.binary_dilation(m,iterations=4)
    lab,n=ndi.label(dm)
    if n==0: return None
    sizes=ndi.sum(m,lab,range(1,n+1)); k=int(np.argmax(sizes))+1
    keep=(lab==k)&ndi.binary_dilation(m,iterations=2)
    if m[lab==k].sum()<150: return None
    ys,xs=np.where(keep&m)
    ty0,ty1,tx0,tx1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    crop=np.asarray(im.crop((x0+tx0,y0+ty0,x0+tx1,y0+ty1)).convert('RGBA')).copy()
    # alpha: pixels differing from bg, within kept component (soft)
    a=np.asarray(im.crop((x0+tx0,y0+ty0,x0+tx1,y0+ty1))).astype(np.int16)
    d=np.abs(a-bg).max(axis=2)
    alpha=np.clip((d-14)*255/22,0,255).astype(np.uint8)
    kc=keep[ty0:ty1,tx0:tx1]
    # fill holes in the kept silhouette so dark interior pixels stay opaque
    sil=ndi.binary_fill_holes(ndi.binary_closing(kc,iterations=2)) & kc | (ndi.binary_fill_holes(kc))
    alpha=np.where(sil&(d>14),alpha,np.where(sil,255,0)).astype(np.uint8)
    # interior holes -> opaque
    inner=ndi.binary_erosion(sil,iterations=3)
    alpha[inner]=255
    alpha[~kc & ~sil]=0
    crop[...,3]=alpha
    return Image.fromarray(crop,'RGBA')

def build(name,path,specs,ncols,out,T=30,cellpad=4):
    """specs: list of (rowname,row_index). returns meta dict"""
    im,bg,mask,rows=analyze(path,T)
    bands=band(rows); cg=colgrid(rows,ncols)
    sp=np.median(np.diff(cg)) if len(cg)>1 else im.width/ncols
    frames={}
    for rn,ri in specs:
        y0,y1=bands[ri]
        fr=[]
        for cx in cg:
            f=cut(im,bg,mask,y0,y1,cx,sp)
            if f is not None: fr.append(f)
        frames[rn]=fr
    # normalize: common cell
    cw=max(f.width for fr in frames.values() for f in fr)+cellpad*2
    ch=max(f.height for fr in frames.values() for f in fr)+cellpad*2
    nmax=max(len(fr) for fr in frames.values())
    atlas=Image.new('RGBA',(cw*nmax,ch*len(specs)),(0,0,0,0))
    meta={'cell':[cw,ch],'rows':{}}
    for r,(rn,_) in enumerate(specs):
        for c,f in enumerate(frames[rn]):
            # anchor bottom-centre
            ox=c*cw+(cw-f.width)//2; oy=r*ch+ch-cellpad-f.height
            atlas.alpha_composite(f,(ox,oy))
        meta['rows'][rn]={'row':r,'n':len(frames[rn])}
    hs=sorted(f.height for f in frames.get('walk',frames[specs[0][0]]))
    meta['bodyH']=hs[len(hs)//2]
    atlas.save(out)
    return meta

if __name__=='__main__':
    os.makedirs('/tmp/atlas',exist_ok=True)
    for f in sys.argv[1:]:
        im,bg,mask,rows=analyze(f)
        print(os.path.basename(f),[ (y0,y1,len(r)) for (y0,y1),r in zip(band(rows),rows)])

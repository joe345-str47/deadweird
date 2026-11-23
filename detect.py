import numpy as np, sys, json
from PIL import Image
from scipy import ndimage as ndi
SP='/home/claude/dw/assets/sprites/'
def load(name):
    im=np.array(Image.open(SP+name+'.png').convert('RGB')).astype(int)
    return im
def bgcolor(im):
    h,w,_=im.shape
    pts=np.concatenate([im[2:8,2:8].reshape(-1,3),im[h-8:h-2,2:8].reshape(-1,3),im[h-8:h-2,w-8:w-2].reshape(-1,3)])
    return np.median(pts,axis=0)
def mask(im,bg,thr=26):
    d=np.abs(im-bg).max(axis=2)
    m=d>thr
    # kill "Made with AI" badge (top-right)
    h,w=m.shape
    m[0:int(h*0.075),int(w*0.80):]=False
    return m
def comps(m,dil=5,minh=24):
    st=np.ones((dil*2+1,dil*2+1),bool)
    lab,n=ndi.label(ndi.binary_dilation(m,st))
    out=[]
    for i,sl in enumerate(ndi.find_objects(lab),1):
        y0,y1=sl[0].start,sl[0].stop;x0,x1=sl[1].start,sl[1].stop
        # tighten to real mask pixels
        sub=m[sl]&(lab[sl]==i)
        ys,xs=np.where(sub)
        if len(ys)==0: continue
        by0,by1,bx0,bx1=y0+ys.min(),y0+ys.max()+1,x0+xs.min(),x0+xs.max()+1
        if by1-by0<minh: continue
        out.append((bx0,by0,bx1,by1))
    return out
def rows(cs,gap=0.6):
    cs=sorted(cs,key=lambda c:(c[1]+c[3])/2)
    R=[]
    for c in cs:
        cy=(c[1]+c[3])/2; h=c[3]-c[1]
        if R and abs(cy-np.mean([ (q[1]+q[3])/2 for q in R[-1]]))<h*gap: R[-1].append(c)
        else: R.append([c])
    return [sorted(r) for r in R]
if __name__=='__main__':
    names=sys.argv[1:]
    for n in names:
        im=load(n); bg=bgcolor(im); m=mask(im,bg)
        cs=comps(m)
        print('==',n,im.shape[:2],'bg',bg,'comps',len(cs))
        for i,r in enumerate(rows(cs)):
            print(i,len(r),[ (c[0],c[1],c[2]-c[0],c[3]-c[1]) for c in r])

def strip_text(im,m):
    mx=im.max(axis=2);mn=im.min(axis=2)
    t=(mx>140)&((mx-mn)<30)&m
    st=np.ones((5,13),bool)
    lab,n=ndi.label(ndi.binary_dilation(t,st))
    out=m.copy()
    for i,sl in enumerate(ndi.find_objects(lab),1):
        h=sl[0].stop-sl[0].start
        if h<=14:
            reg=(lab[sl]==i)
            # only erase thin text pixels (the bright candidates themselves, dilated by 1)
            blk=ndi.binary_dilation(t[sl]&reg,np.ones((3,3),bool))
            out[sl][blk]=False
    return out

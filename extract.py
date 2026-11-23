import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def bgcolor(a):
    h,w,_=a.shape
    pts=np.concatenate([a[5:25,5:25].reshape(-1,3),a[-25:-5,5:25].reshape(-1,3),a[-25:-5,-25:-5].reshape(-1,3),a[h//2-10:h//2+10,5:15].reshape(-1,3)])
    return np.median(pts,axis=0)

def extract(path, T=30, dil=5, minh=18):
    im=Image.open(path).convert('RGB'); a=np.asarray(im).astype(np.int16)
    h,w,_=a.shape
    bg=bgcolor(a)
    dist=np.abs(a-bg).max(axis=2)
    mask=dist>T
    # kill watermark pill (top-right)
    mask[:int(h*0.085), int(w*0.80):]=False
    st=ndi.generate_binary_structure(2,2)
    dm=ndi.binary_dilation(mask,structure=st,iterations=dil)
    lab,n=ndi.label(dm)
    objs=ndi.find_objects(lab)
    boxes=[]
    for i,sl in enumerate(objs):
        y0,y1=sl[0].start,sl[0].stop; x0,x1=sl[1].start,sl[1].stop
        bh,bw=y1-y0,x1-x0
        area=(mask[sl]&(lab[sl]==i+1)).sum()
        if bh<minh+2*dil or area<120: continue   # text / specks
        # real bbox from un-dilated mask
        m=mask[sl]&(lab[sl]==i+1)
        ys,xs=np.where(m)
        boxes.append([x0+xs.min(),y0+ys.min(),x0+xs.max()+1,y0+ys.max()+1])
    return im,bg,boxes,mask

def rows_of(boxes):
    if not boxes: return []
    hs=sorted(b[3]-b[1] for b in boxes); mh=hs[len(hs)//2]
    bs=sorted(boxes,key=lambda b:(b[1]+b[3])/2)
    rows=[[bs[0]]]
    for b in bs[1:]:
        cy=(b[1]+b[3])/2; last=rows[-1]
        ly=np.mean([(q[1]+q[3])/2 for q in last])
        if abs(cy-ly)<mh*0.55: last.append(b)
        else: rows.append([b])
    return [sorted(r,key=lambda b:b[0]) for r in rows]

if __name__=='__main__':
    import glob,os
    for f in sorted(glob.glob(sys.argv[1]+'/*.png')):
        im,bg,boxes,mask=extract(f)
        rows=rows_of(boxes)
        print(os.path.basename(f), 'bg',bg.astype(int).tolist(),'blobs',len(boxes),'rows',[len(r) for r in rows])

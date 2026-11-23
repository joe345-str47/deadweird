import numpy as np, json, os, sys
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0,os.path.dirname(__file__))
from detect import load,bgcolor,SP
def eq(x0,x1,n): p=(x1-x0)/n; return [x0+p*(i+.5) for i in range(n)],p
# name -> (y0,y1,x0,x1,n)  (equal division) ; anim names used by the game
S={
'zombie_tp':{'walk':(92,165,20,740,8),'run':(172,242,20,740,8),'attack':(245,328,20,740,8),'hurt':(500,578,20,740,8),'death':(580,655,20,740,8)},
'zombie_fp':{'walk':(115,222,20,760,8),'run':(225,328,20,760,8),'attack':(338,432,20,790,8),'hurt':(440,540,425,785,4),'death':(548,655,10,790,7)},
'player_tp':{k:(c-46,c+46,142,814,7) for k,c in dict(idle_d=60,idle_s=140,idle_u=215,walk_d=297,walk_s=375,walk_u=450,run_d=527,run_s=603,run_u=680,attack=760,hurt=846,death=932).items()},
'player_fp':{'idle':(25,142,10,790,6),'shoot':(190,312,10,640,5),'reload':(358,480,10,790,7),'melee':(528,640,10,790,6)},
'cow_tp':{'walk':(70,132,8,386,7),'run':(135,202,8,386,7),'hit':(268,326,10,190,3),'death':(268,326,195,390,3)},
'cow_fp':{'walk':(88,160,27,715,8),'run':(165,242,27,715,8),'attack':(248,322,27,715,8),'hurt':(503,578,27,715,8),'death':(580,652,10,790,9)},
'clown_tp':{k:(a,b,50,390,5) for k,(a,b) in dict(idle=(22,88),walk=(95,160),attack=(165,235),death=(322,396)).items()},
'clown_fp':{k:(a,b,8,395,6) for k,(a,b) in dict(walk=(52,102),attack=(102,150),lunge=(150,200),slash=(200,250),hurt=(250,302),death=(302,352),laugh=(352,400)).items()},
'boss_tp':{'walk':(280,396,[375,490,605,725],115),'attack':(445,590,[125,285,490,640],165),'hurt':(640,770,[125,285,440],160),'death':(640,770,[650],200)},
'boss_fp':{'walk':(205,305,5),'attack':(335,445,4),'hurt':(598,705,5),'death':(712,792,5)},
'ufo_tp':{'idle':(0,40,8,356,7),'run':(80,122,8),'hurt':(240,288,8),'death':(290,335,8)},
'ufo_fp':{'walk':(125,225,6),'hurt':(800,900,6),'death':(900,1000,6)},
}
# resolve special forms
def cells(sheet,spec,W):
    out=[]
    for name,v in spec.items():
        if len(v)==5 and not isinstance(v[2],list):
            y0,y1,x0,x1,n=v; cs,p=eq(x0,x1,n); out.append((name,y0,y1,cs,p))
        elif len(v)==4:
            y0,y1,cs,w=v; out.append((name,y0,y1,cs,w))
        else:
            y0,y1,n=v; cs,p=eq(8,W-8,n); out.append((name,y0,y1,cs,p))
    return out
def cut(im,bg,x0,x1,y0,y1,first=False):
    H,W,_=im.shape
    sub=im[max(0,y0):min(H,y1),max(0,x0):min(W,x1)]
    isbg=np.abs(sub-bg).max(axis=2)<24
    lab,n=ndi.label(isbg)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    keep=np.ones(isbg.shape,bool)
    for b in border: keep&=~(lab==b)
    # drop thin label text & stray bits: keep components touching biggest blob after dilation
    fg=ndi.binary_dilation(keep,np.ones((7,7),bool))
    l2,n2=ndi.label(fg)
    if n2>1:
        sizes=ndi.sum(keep,l2,range(1,n2+1)); big=np.argmax(sizes)+1
        keep&=(l2==big)|np.isin(l2,[i+1 for i,s in enumerate(sizes) if s>0.25*sizes.max()])
    keep=ndi.binary_fill_holes(keep)
    l3,n3=ndi.label(ndi.binary_dilation(keep,np.ones((5,5),bool)))
    for i,sl in enumerate(ndi.find_objects(l3),1):
        if sl[0].stop-sl[0].start<=17: keep[sl]&=~(l3[sl]==i)
    if first:   # leftover row-label fragments sit in the top-left of the first cell
        l4,n4=ndi.label(keep,structure=np.ones((3,3),bool))
        if n4>1:
            ar=ndi.sum(keep,l4,range(1,n4+1)); big=int(np.argmax(ar))+1; h_,w_=keep.shape
            for i,sl in enumerate(ndi.find_objects(l4),1):
                if i!=big and ar[i-1]<70 and sl[0].stop<h_*.4 and sl[1].stop<w_*.5: keep[sl]&=~(l4[sl]==i)
    rgba=np.dstack([sub,(keep*255)]).astype(np.uint8)
    return rgba
def clean(im,bg,text=False):
    # erase the 'Made with AI' badge (top-right) and the left-edge row labels so they never end up inside a frame
    H,W,_=im.shape; im=im.copy(); im[0:int(H*.075),int(W*.80):]=bg
    if not text: return im
    mx=im.max(axis=2);mn=im.min(axis=2);t=(mx>140)&((mx-mn)<30)
    lab,n=ndi.label(ndi.binary_dilation(t,np.ones((3,11),bool)))
    for sl in ndi.find_objects(lab):
        h=sl[0].stop-sl[0].start
        if h<=10 and sl[1].stop<W*.16:
            y0,y1,x0,x1=max(0,sl[0].start-1),sl[0].stop+1,max(0,sl[1].start-1),sl[1].stop+1
            im[y0:y1,x0:x1]=bg
    return im
atlas={}
os.makedirs('/home/claude/dw/assets/atlas',exist_ok=True)
for sheet,spec in S.items():
    im=load(sheet); bg=bgcolor(im); H,W,_=im.shape
    im=clean(im,bg,text=(sheet=='clown_fp'))
    cl=cells(sheet,spec,W); frames=[]
    for name,y0,y1,cs,p in cl:
        row=[]
        for ci_,cx in enumerate(cs):
            x0=int(cx-p/2);x1=int(cx+p/2)
            row.append(cut(im,bg,x0,x1,y0,y1,first=(ci_==0)))
        frames.append((name,row))
    # ---- stabilise loops: line every frame up on the same body anchor (horizontal mass-centre + feet line) so walk/run/idle don't jitter ----
    STABLE={'walk','run','idle','laugh','hurt','hit','lunge','walk_d','walk_s','walk_u','idle_d','idle_s','idle_u','run_d','run_s','run_u'}
    def anchor(f):
        a=f[:,:,3]>40
        if a.sum()<20: return None
        ys,xs=np.where(a); return (xs.mean(), np.percentile(ys,96))
    jit_before=[];jit_after=[]
    for ri,(name,row) in enumerate(frames):
        if name not in STABLE or len(row)<3: continue
        anc=[anchor(f) for f in row]
        if any(a is None for a in anc): continue
        mx=float(np.median([a[0] for a in anc])); my=float(np.median([a[1] for a in anc]))
        jit_before.append(np.std([a[0] for a in anc])+np.std([a[1] for a in anc]))
        newrow=[]
        for f,a in zip(row,anc):
            dx=int(round(max(-12,min(12,mx-a[0])))); dy=int(round(max(-8,min(8,my-a[1]))))
            g=np.zeros_like(f); H_,W_=f.shape[:2]
            ys0,ys1=max(0,dy),min(H_,H_+dy); xs0,xs1=max(0,dx),min(W_,W_+dx)
            g[ys0:ys1,xs0:xs1]=f[ys0-dy:ys1-dy, xs0-dx:xs1-dx]
            newrow.append(g)
        anc2=[anchor(g) for g in newrow]
        jit_after.append(np.std([a[0] for a in anc2])+np.std([a[1] for a in anc2]))
        frames[ri]=(name,newrow)
    if jit_before: print(f'   [{sheet}] frame jitter (px) {np.mean(jit_before):.2f} -> {np.mean(jit_after):.2f}')
    # trim each frame to content, then place on uniform cells (center-anchored per anim row bbox union)
    cw=max(f.shape[1] for _,r in frames for f in r); ch=max(f.shape[0] for _,r in frames for f in r)
    nmax=max(len(r) for _,r in frames)
    sheetimg=np.zeros((ch*len(frames),cw*nmax,4),np.uint8); anims={}
    for ri,(name,row) in enumerate(frames):
        for ci,f in enumerate(row):
            h,w=f.shape[:2]; oy=ri*ch+(ch-h)//2; ox=ci*cw+(cw-w)//2
            sheetimg[oy:oy+h,ox:ox+w]=f
        anims[name]=[ri,len(row)]
    Image.fromarray(sheetimg).save(f'/home/claude/dw/assets/atlas/{sheet}.png',optimize=True)
    atlas[sheet]={'cw':int(cw),'ch':int(ch),'anims':anims}
    print(sheet,cw,ch,anims)
json.dump(atlas,open('/home/claude/dw/assets/atlas/atlas.json','w'))

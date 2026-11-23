import sys, json, os
sys.path.insert(0,'tools')
import numpy as np
from PIL import Image
from build import cut, bgcolor
from extract import extract

def run(name, path, rows, sp, T=30, out_dir='assets/clean'):
    im,bg,boxes,mask=extract(path,T=T)
    frames=[]
    for rn,y0,y1,cxs in rows:
        fr=[]
        for cx in cxs:
            f=cut(im,bg,mask,y0,y1,cx,sp)
            fr.append(f)            # may be None (kept to preserve indexing)
        frames.append((rn,fr))
    pad=3
    cw=max(f.width for _,fr in frames for f in fr if f)+pad*2
    ch=max(f.height for _,fr in frames for f in fr if f)+pad*2
    nmax=max(len(fr) for _,fr in frames)
    atlas=Image.new('RGBA',(cw*nmax,ch*len(frames)),(0,0,0,0))
    meta={'cell':[cw,ch],'rows':{}}
    for r,(rn,fr) in enumerate(frames):
        ok=[]
        for c,f in enumerate(fr):
            if not f: continue
            ox=len(ok)*cw+(cw-f.width)//2; oy=r*ch+ch-pad-f.height
            atlas.alpha_composite(f,(ox,oy)); ok.append(f.height)
        meta['rows'][rn]={'row':r,'n':len(ok),'h':int(np.median(ok)) if ok else 0}
    os.makedirs(out_dir,exist_ok=True)
    atlas.save(f'{out_dir}/{name}.png',optimize=True)
    # preview on magenta-ish checker for review
    prev=Image.new('RGBA',atlas.size,(60,90,60,255)); prev.alpha_composite(atlas); prev.convert('RGB').save(f'/tmp/atlas/{name}.png')
    return meta

def xs(*v): return list(v)
SPEC={}
Z=[60,152,245,337,420,513,605,690]
SPEC['zombie']=('assets/sprites/zombie_tp.png',[
 ('idle',9,80,Z),('walk',90,165,Z),('run',172,240,Z),('attack',245,330,Z),('lunge',335,400,Z),
 ('hurt',505,578,Z),('death',588,652,Z)],88)
P=[190,288,385,480,577,670,760]
def prow(n,cy): return (n,cy-36,cy+38,P)
SPEC['player']=('assets/sprites/player_tp.png',[
 prow('idle_down',61),prow('idle_side',141),prow('idle_up',217),prow('walk_down',298),prow('walk_side',376),
 prow('walk_up',451),prow('run_down',527),prow('run_side',603),prow('run_up',681),prow('attack',761),
 prow('hurt',846),prow('death',932)],96)
C=[35,90,145,198,250,305,360]
SPEC['cow']=('assets/sprites/cow_tp.png',[
 ('idle',8,64,C),('walk',73,129,C),('run',137,197,C),('turn',203,260,C),
 ('hurt',272,324,[33,100,150]),('death',272,324,[225,272,330]),('spawn',340,392,[35,100,150,200,255,310])],54)
D=[62,130,198,262,335]
SPEC['clown']=('assets/sprites/clown_tp.png',[
 ('idle',8,84,D),('walk',102,160,D),('attack',172,236,D),('lunge',258,313,D),('death',328,392,D)],62)
U=[30,77,124,170,215,258,302,346]
SPEC['ufo']=('assets/sprites/ufo_tp.png',[
 ('idle',2,34,U),('walk',40,78,U),('run',80,120,U),('beam',120,172,U),('missiles',168,212,U),
 ('spin',214,250,U),('hurt',254,290,U),('death',292,330,U)],44)
B=[400,555,700]
SPEC['boss']=('assets/sprites/boss_tp.png',[
 ('idle',50,200,[400,555,700]),('walk',245,395,[365,490,610,725]),
 ('attack',440,600,[90,265,470,640]),('hurt',640,770,[100,260,440]),('death',640,770,[640])],150)

if __name__=='__main__':
    names=sys.argv[1:] or list(SPEC)
    allmeta={}
    for n in names:
        path,rows,sp=SPEC[n]
        allmeta[n]=run(n,path,rows,sp)
        print(n,allmeta[n]['cell'],{k:(v['n'],v['h']) for k,v in allmeta[n]['rows'].items()})
    json.dump(allmeta,open('/tmp/atlas/meta_partial.json','w'))

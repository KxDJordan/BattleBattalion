"""The orc warrior's and crusher's painted weapons taken out of their drawn frames, and their hands found (imported by
assets/make-orc-atlas.py; not a script).

The sheets paint the warrior's axe and the crusher's war hammer into the frames; the game now draws the unit's own weapon live in the
hand (src/76mo-orcweap.js). Per frame (WEAPONS below, sheet px, placed by eye on the sheet): a polygon round the painted weapon and its
haft line (H: a point on the head, B: towards the butt).
  erase()  every opaque pixel in the polygon that is not the orc's skin (the fists over the haft stay; a war cry's purple haze stays) is
           taken out. What the body closes round (the haft across the belly, a fist's grip) is repainted: across the haft, between the
           body's pixels either side of it; elsewhere by diffusion from round the hole. What the body does not close round (the head held
           out beside it) goes transparent, the new edge inked like the sheet's outline. Loose crumbs of the weapon go too.
  grips()  the hands: walking the erased haft line from the head towards the butt, each run of skin it crosses is a fist on the haft, the
           first the weapon hand, the next (the crusher's two-handed hold) the off hand.
  Frames with no weapon painted (the warrior's cast, hurt and death rows; the crusher's hurt 3, 4 and death 1 to 3): the weapon hand is
  the right-most fist (the far hand, as it holds the weapon in the other frames; fist()) or placed by eye (MANUAL).
  fist_patch() the fist round a grip (skin within 12 px and its outline) as its own piece, drawn over a live weapon held in front.
No randomness: the output is the same every run.
"""
import math
from collections import deque
import numpy as np
from PIL import Image, ImageDraw
def skin(t):
    r,g,b,a=t[...,0],t[...,1],t[...,2],t[...,3]
    return (a>0)&(g>45)&(g-b>.36*g)&(g>=.78*r)
def dil(m,k):
    for _ in range(k):
        g=m.copy();g[1:]|=m[:-1];g[:-1]|=m[1:];g[:,1:]|=m[:,:-1];g[:,:-1]|=m[:,1:];m=g
    return m
def ero(m,k): return ~dil(~m,k)
def poly_mask(shape,poly,o):
    m=Image.new('L',(shape[1],shape[0]),0);ImageDraw.Draw(m).polygon([(x-o[0],y-o[1]) for x,y in poly],fill=255);return np.array(m)>0
def erase(t,o,poly,close=5,axis=None,reach=20):
    t=t.copy();P=poly_mask(t.shape,poly,o);SK=ero(dil(skin(t),2),2)&(t[...,3]>0)   # the hands kept whole (their shadowed creases too)
    from collections import deque
    seen=np.zeros(SK.shape,bool)
    for y,x in zip(*np.nonzero(SK&P)):           # skin crumbs in the weapon (a reflection, a wooden grain) are not hands
        if seen[y,x]: continue
        q=deque([(y,x)]);seen[y,x]=True;px=[]
        while q:
            cy,cx=q.popleft();px.append((cy,cx))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=cy+dy,cx+dx
                if 0<=ny<SK.shape[0] and 0<=nx<SK.shape[1] and SK[ny,nx] and not seen[ny,nx]: seen[ny,nx]=True;q.append((ny,nx))
        if len(px)<25:
            for cy,cx in px: SK[cy,cx]=False
    GL=(t[...,3]<235)&(t[...,2]>t[...,1]+20)&(t[...,0]>t[...,1])   # a glow's purple haze (the war cry) is not the weapon: it stays
    E=P&(t[...,3]>0)&~SK&~GL
    R=(t[...,3]>0)&~E
    inside=ero(dil(R,close),close)&E          # holes the body closes over: repainted
    across={}
    if axis is not None:                      # across the haft: a hole pixel with the body on both sides within reach px is inside, and is
        ux,uy=axis[0]-axis[2],axis[1]-axis[3];l=math.hypot(ux,uy);px_,py_=-uy/l,ux/l   # painted between them
        Hh,Ww=E.shape
        def ray(y,x,sg):
            for k in range(1,reach+1):
                yy,xx=int(round(y+py_*k*sg)),int(round(x+px_*k*sg))
                if not(0<=yy<Hh and 0<=xx<Ww): return None
                if R[yy,xx]: return (k,yy,xx)
                if not E[yy,xx]: return None
            return None
        for y,x in zip(*np.nonzero(E)):
            if abs((x-axis[2])*px_+(y-axis[3])*py_)>12: continue      # only the haft's band
            a=ray(y,x,1);b=ray(y,x,-1)
            if a and b: inside[y,x]=True;across[(y,x)]=(a,b)
    out=E&~inside
    # the cut edge: opaque pixels within 2 px of what goes transparent get the sheet's ink
    t[out]=0
    # crumbs: small bits of the weapon outside the polygon, cut off from the figure, go too
    from collections import deque
    A=t[...,3]>0;near=dil(P,4);L=np.zeros(A.shape,int);n=0;H_,W_=A.shape
    for y,x in zip(*np.nonzero(A&near)):
        if L[y,x]: continue
        n+=1;q=deque([(y,x)]);L[y,x]=n;px=[]
        while q:
            cy,cx=q.popleft();px.append((cy,cx))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                ny,nx=cy+dy,cx+dx
                if 0<=ny<H_ and 0<=nx<W_ and A[ny,nx] and not L[ny,nx]: L[ny,nx]=n;q.append((ny,nx))
        if len(px)<=400:
            for cy,cx in px: t[cy,cx]=0;out[cy,cx]=True
    edge=dil(out,2)&(t[...,3]>=200)&~inside&~GL
    ink=np.array([38.,30.,32.])
    t[edge,:3]=t[edge,:3]*.25+ink*.75; t[edge,3]=np.maximum(t[edge,3],200)
    # holes the figure now encloses (cut off from the frame's edge through transparent pixels): repainted too
    from collections import deque
    T_=t[...,3]==0;seen=np.zeros(T_.shape,bool);q=deque();Hh,Ww=T_.shape
    for y in range(Hh):
        for x in (0,Ww-1):
            if T_[y,x] and not seen[y,x]: seen[y,x]=True;q.append((y,x))
    for x in range(Ww):
        for y in (0,Hh-1):
            if T_[y,x] and not seen[y,x]: seen[y,x]=True;q.append((y,x))
    while q:
        cy,cx=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=cy+dy,cx+dx
            if 0<=ny<Hh and 0<=nx<Ww and T_[ny,nx] and not seen[ny,nx]: seen[ny,nx]=True;q.append((ny,nx))
    inside=inside|(T_&~seen&dil(E,1))
    # holes: diffusion fill from the known pixels round them
    known=~inside; c=t.copy()
    for it in range(400):
        if not inside.any(): break
        acc=np.zeros(t.shape[:2]+(4,));n=np.zeros(t.shape[:2])
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
            sk=np.roll(np.roll(known,dy,0),dx,1);sv=np.roll(np.roll(c,dy,0),dx,1)
            acc+=sv*sk[...,None];n+=sk
        new=inside&~known&(n>=2)
        if not new.any(): new=inside&~known&(n>=1)
        if not new.any(): break
        c[new]=acc[new]/n[new][:,None];known=known|new
    for (y,x),(a,b) in across.items():
        w=b[0]/(a[0]+b[0]);c[y,x]=t[a[1],a[2]]*w+t[b[1],b[2]]*(1-w)
    t[inside]=c[inside]; t[inside,3]=255
    return t,E,inside
def grips(t,H,B,o,two,ext=1.4):
    """walk the haft from the head point H towards B: the skin runs it passes are the fists (the first the weapon hand, the next the off hand)"""
    SK=skin(t);hx,hy=H[0]-o[0],H[1]-o[1];bx,by=B[0]-o[0],B[1]-o[1];L=math.hypot(bx-hx,by-hy)*ext;ux,uy=(bx-hx)/L*ext,(by-hy)/L*ext
    runs=[];cur=None;s=0
    while s<L:
        x,y=hx+ux*s,hy+uy*s;hit=False
        for d in (-2,-1,0,1,2):
            xx,yy=int(round(x-uy*d)),int(round(y+ux*d))
            if 0<=yy<t.shape[0] and 0<=xx<t.shape[1] and SK[yy,xx]: hit=True
        if hit:
            if cur is None: cur=[s,s]
            cur[1]=s
        elif cur is not None:
            if cur[1]-cur[0]>=3: runs.append(cur)
            cur=None
        s+=.5
    if cur is not None and cur[1]-cur[0]>=3: runs.append(cur)
    pts=[(hx+ux*(a+b)/2+o[0],hy+uy*(a+b)/2+o[1]) for a,b in runs]
    return pts[:2 if two else 1]

def blobs(m):
    L=np.zeros(m.shape,int);out=[]
    for y,x in zip(*np.nonzero(m)):
        if L[y,x]: continue
        q=deque([(y,x)]);L[y,x]=len(out)+1;ys=[];xs=[]
        while q:
            cy,cx=q.popleft();ys.append(cy);xs.append(cx)
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=cy+dy,cx+dx
                if 0<=ny<m.shape[0] and 0<=nx<m.shape[1] and m[ny,nx] and not L[ny,nx]: L[ny,nx]=len(out)+1;q.append((ny,nx))
        out.append((len(ys),np.mean(xs),np.mean(ys)))
    return out
def fist(t,lo=.4):
    S=erase.ero(erase.skin(t),1);h=t.shape[0]
    B=[b for b in blobs(S) if b[0]>60 and b[2]>h*lo]
    return max(B,key=lambda b:b[1]) if B else None

def fist(t, lo=.4):
    """the right-most fist (a skin blob of 60 px or more, below lo of the frame's height): the far, weapon hand of a frame with no weapon"""
    S = ero(skin(t), 1); h = t.shape[0]
    B = [b for b in blobs(S) if b[0] > 60 and b[2] > h * lo]
    return (max(B, key=lambda b: b[1])[1:]) if B else None

def fist_patch(t, g, r=12):
    """the fist round grip g (frame px): its skin blob within r px and the outline 2 px round it -> (image, the grip in it)"""
    S = ero(dil(skin(t), 1), 1) & (t[..., 3] > 0); H, W = S.shape
    yy, xx = np.mgrid[0:H, 0:W]; disk = (xx - g[0]) ** 2 + (yy - g[1]) ** 2 <= r * r
    S = S & disk
    seed = [(y, x) for y, x in zip(*np.nonzero(S)) if (x - g[0]) ** 2 + (y - g[1]) ** 2 <= 36]
    if not seed: return None
    m = np.zeros(S.shape, bool); q = deque(seed)
    for y, x in seed: m[y, x] = True
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < H and 0 <= nx < W and S[ny, nx] and not m[ny, nx]: m[ny, nx] = True; q.append((ny, nx))
    m = dil(m, 2) & (t[..., 3] > 0) & dil(disk, 1)
    ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    im = t[y0:y1, x0:x1].copy(); im[~m[y0:y1, x0:x1], 3] = 0; im[im[..., 3] == 0, :3] = 0
    return im, (g[0] - x0, g[1] - y0)

# (row, i): (poly, H head point, B towards the butt) sheet px
WEAPONS = {}
WEAPONS['ORA'] = {
 ('run',0):([(129,512),(140,498),(175,500),(175,563),(132,563),(129,540)],(155,530),(110,527)),
 ('run',1):([(303,508),(345,508),(345,570),(303,570)],(320,530),(285,530)),
 ('run',2):([(463,503),(508,503),(508,568),(463,568)],(485,525),(450,522)),
 ('run',3):([(634,500),(678,500),(678,566),(634,566)],(655,528),(620,528)),
 ('run',4):([(799,518),(846,518),(846,576),(799,576)],(825,540),(785,535)),
 ('run',5):([(960,515),(1010,515),(1010,573),(967,573),(967,545),(960,545)],(985,535),(950,535)),
 ('run',6):([(1148,503),(1193,503),(1193,570),(1150,570)],(1170,535),(1135,537)),
 ('attack',0):([(129,700),(131,678),(175,678),(175,745),(131,745),(129,725)],(150,712),(115,712)),
 ('attack',1):([(294,668),(342,668),(342,732),(294,732)],(318,700),(285,703)),
 ('attack',2):([(436,592),(502,592),(502,650),(476,650),(476,664),(452,664),(452,650),(436,650)],(462,625),(470,690)),
 ('attack',3):([(581,616),(586,596),(604,584),(626,582),(642,598),(641,633),(605,632),(583,633)],(615,605),(565,628)),
 ('attack',4):([(770,595),(822,595),(822,648),(778,648),(778,635),(770,635)],(795,622),(755,625)),
 ('attack',5):([(962,728),(1025,728),(1025,780),(975,780),(975,752),(962,752)],(1000,745),(948,740)),
 ('attack',6):([(1155,705),(1195,705),(1195,766),(1158,766)],(1175,730),(1140,728)),
}
WEAPONS['OCA'] = {
 ('run',0):([(96,444),(137,444),(137,500),(98,500),(98,491),(60,491),(60,474),(96,474)],(115,475),(40,482)),
 ('run',1):([(238,446),(276,446),(276,503),(240,503),(240,491),(212,491),(212,474),(238,474)],(255,478),(190,482)),
 ('run',2):([(378,448),(418,448),(418,503),(380,503),(380,491),(352,491),(352,474),(378,474)],(395,478),(335,485)),
 ('run',3):([(518,448),(558,448),(558,502),(520,502),(520,491),(493,491),(493,474),(518,474)],(535,478),(475,483)),
 ('run',4):([(668,450),(705,450),(705,506),(670,506),(670,491),(635,491),(635,474),(668,474)],(685,480),(615,482)),
 ('run',5):([(808,450),(845,450),(845,506),(810,506),(810,491),(778,491),(778,474),(808,474)],(825,480),(760,483)),
 ('run',6):([(945,457),(983,457),(983,507),(947,507),(947,496),(922,496),(922,478),(945,478)],(963,483),(900,488)),
 ('run',7):([(1080,450),(1116,450),(1116,506),(1082,506),(1082,492),(1055,492),(1055,473),(1080,473)],(1098,478),(1040,482)),
 ('attack',0):([(99,657),(143,657),(143,721),(100,721),(100,706),(62,706),(62,689),(99,689)],(118,690),(45,697)),
 ('attack',1):([(236,625),(286,625),(286,683),(245,683),(240,690),(215,690),(212,668),(236,660)],(260,655),(200,680)),
 ('attack',2):([(340,558),(393,558),(393,610),(345,610),(320,622),(308,637),(286,637),(286,610),(305,598),(338,590)],(365,585),(290,628)),
 ('attack',3):([(490,562),(543,562),(543,612),(495,612),(490,606),(455,612),(425,612),(425,588),(450,582),(490,585)],(515,590),(430,600)),
 ('attack',4):([(668,677),(715,677),(715,735),(668,735),(668,715),(660,715),(660,697),(668,697)],(690,705),(640,705)),
 ('attack',5):([(838,697),(885,697),(885,755),(842,755),(842,738),(818,738),(815,722),(838,712)],(860,725),(800,712)),
 ('attack',6):([(958,677),(1003,677),(1003,738),(960,738),(960,716),(938,716),(938,700),(958,700)],(975,705),(925,708)),
 ('attack',7):([(1080,662),(1120,662),(1120,715),(1082,715),(1082,705),(1053,705),(1053,688),(1080,688)],(1100,690),(1030,697)),
 ('cast',0):([(95,852),(136,852),(136,915),(98,915),(98,903),(62,903),(62,884),(95,884)],(115,885),(45,893)),
 ('cast',1):([(240,862),(280,862),(280,915),(244,915),(244,902),(205,902),(205,886),(240,886)],(260,890),(190,897)),
 ('cast',2):([(380,849),(425,849),(425,905),(390,905),(387,888),(334,914),(326,911),(326,900),(379,875)],(400,880),(330,907)),
 ('cast',3):([(523,840),(566,840),(566,898),(535,898),(531,882),(452,915),(445,912),(446,900),(524,868)],(545,870),(450,908)),
 ('cast',4):([(686,852),(731,852),(731,910),(690,910),(687,894),(630,912),(615,911),(615,895),(676,880)],(705,880),(620,905)),
 ('cast',5):([(826,854),(870,854),(870,910),(830,910),(830,902),(790,902),(790,885),(826,885)],(845,885),(760,897)),
 ('cast',6):([(956,857),(998,857),(998,911),(960,911),(960,903),(925,903),(925,886),(956,886)],(975,888),(905,897)),
 ('cast',7):([(1081,852),(1121,852),(1121,908),(1084,908),(1084,901),(1052,901),(1052,883),(1081,883)],(1100,885),(1030,893)),
 ('hurt',0):([(100,1049),(140,1049),(140,1101),(103,1101),(103,1088),(62,1088),(62,1069),(100,1069)],(120,1073),(45,1080)),
 ('hurt',1):([(246,1042),(288,1042),(288,1101),(252,1101),(252,1090),(215,1090),(215,1071),(246,1071)],(265,1075),(200,1083)),
 ('hurt',4):([(674,1054),(715,1054),(715,1108),(672,1108),(672,1100),(647,1100),(647,1083),(674,1083)],(695,1085),(625,1092)),
 ('hurt',5):([(805,1062),(868,1062),(868,1121),(808,1121),(808,1104),(775,1104),(775,1084),(805,1084)],(825,1090),(755,1095)),
 ('hurt',6):([(948,1059),(990,1059),(990,1118),(952,1118),(952,1104),(918,1104),(918,1083),(948,1083)],(968,1090),(900,1095)),
 ('hurt',7):([(1080,1057),(1118,1057),(1118,1115),(1083,1115),(1083,1104),(1053,1104),(1053,1083),(1080,1083)],(1100,1088),(1030,1094)),
 ('death',3):([(500,1293),(526,1290),(558,1290),(558,1323),(500,1323)],(540,1305),(470,1305)),
 ('death',4):([(650,1295),(673,1285),(711,1285),(711,1325),(652,1325)],(690,1305),(600,1305)),
 ('death',5):([(765,1296),(833,1296),(835,1286),(873,1286),(873,1325),(765,1325)],(850,1303),(745,1303)),
 ('death',6):([(955,1296),(1024,1296),(1026,1286),(1065,1286),(1065,1325),(955,1325)],(1043,1303),(930,1303)),
}
# frames with no weapon drawn: the hands as placed by eye (weapon hand, off hand), sheet px
MANUAL = {'ORA': {}}
MANUAL['OCA'] = {('hurt',2):((392,1027),(357,1050)),('hurt',3):((541,1082),(475,1080)),('death',0):((120,1268),(48,1272)),('death',1):((268,1268),(198,1285)),('death',2):((390,1272),(352,1292))}

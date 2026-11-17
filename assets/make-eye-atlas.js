// Builds src/73n-eyesatlas.js (EYA: the expression sheet cut into near-eye / far-eye pieces, one trimmed webp atlas) from assets/eyes.webp.
// Usage: node assets/make-eye-atlas.js [scale=0.32] [--debug out.png]
// The sheet is 9 rows x 6 columns of eye pairs (three-quarter view facing right: near eye left and bigger, far eye right). Rows are cut at the
// transparent bands, columns on the sixths; inside a cell the pair is split at the emptiest column between the eyes, and every piece keeps
// whatever belongs to it (brow, tears, zzz, sparkles, flames, anger marks by position). EYA.c[i] = [near, far] (i = row*6+col), each
// [ax,ay,aw,ah, ox,oy,ow,oh]: the rect in the atlas and the box it covers in the cell (sheet px, cell origin top-left).
// EYA.ref = {n:[x,y], f:[x,y], h}: the near / far eye centres and the eye height of the neutral row, averaged (cell coords), so an
// expression is placed by mapping those points onto a head's painted eye positions (HPA.p[head].eyes). Needs python3 with Pillow.
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const args=process.argv.slice(2),dbg=args.indexOf('--debug'),scale=+(args.find(a=>/^[\d.]+$/.test(a))||0.32);
const PY=String.raw`
import sys, json, io, base64
from PIL import Image, ImageDraw
src, scale, dbg = sys.argv[1], float(sys.argv[2]), sys.argv[3]
im = Image.open(src).convert('RGBA'); W, H = im.size; px = im.load()
A = [[px[x, y][3] > 20 for x in range(W)] for y in range(H)]
def bands(vals, gap):
    out = []; s = None; p = None
    for i, v in enumerate(vals):
        if v:
            if s is None: s = i
            elif i > p + gap: out.append((s, p)); s = i
            p = i
    if s is not None: out.append((s, p))
    return out
rows = bands([any(r) for r in A], 4)
assert len(rows) == 9, rows
CX = [round(i * W / 6) for i in range(7)]
# connected pieces of ink (8-neighbour, faint alpha joins), each given to the cell its centre falls in, then to the near or far eye
Af = [[px[x, y][3] > 70 for x in range(W)] for y in range(H)]
lab = [[-1] * W for _ in range(H)]; comps = []
for y in range(H):
    for x in range(W):
        if Af[y][x] and lab[y][x] < 0:
            st = [(x, y)]; lab[y][x] = len(comps); n = 0; sx = sy = 0; x0 = x1 = x; y0_ = y1_ = y
            while st:
                a_, b_ = st.pop(); n += 1; sx += a_; sy += b_; x0 = min(x0, a_); x1 = max(x1, a_); y0_ = min(y0_, b_); y1_ = max(y1_, b_)
                for (c_, d_) in ((a_ + 1, b_), (a_ - 1, b_), (a_, b_ + 1), (a_, b_ - 1)):
                    if 0 <= c_ < W and 0 <= d_ < H and Af[d_][c_] and lab[d_][c_] < 0: lab[d_][c_] = len(comps); st.append((c_, d_))
            comps.append((sx / n, sy / n, x0, y0_, x1, y1_, n))
# faint edge pixels join the strong piece nearest to them
for y in range(H):
    for x in range(W):
        if lab[y][x] < 0 and px[x, y][3] > 3:
            best = -1
            for r in range(1, 5):
                for dy in range(-r, r + 1):
                    for dx in (-r, r) if abs(dy) < r else range(-r, r + 1):
                        c_, d_ = x + dx, y + dy
                        if 0 <= c_ < W and 0 <= d_ < H and lab[d_][c_] >= 0 and px[c_, d_][3] > 70: best = lab[d_][c_]; break
                    if best >= 0: break
                if best >= 0: break
            lab[y][x] = best if best >= 0 else -2
def rowof(cy):
    for i, (a_, b_) in enumerate(rows):
        if a_ - 20 <= cy <= b_ + 20: return i
    return -1
bigs = [i for i, c in enumerate(comps) if c[6] > 700]
def cellof(i):
    c = comps[i]; r = rowof(c[1])
    if r < 0: return -1
    if c[6] > 700: return r * 6 + min(5, int(c[0] / (W / 6)))
    nb = min((b for b in bigs if rowof(comps[b][1]) == r), key=lambda b: (comps[b][0] - c[0]) ** 2 + (comps[b][1] - c[1]) ** 2)
    return r * 6 + min(5, int(comps[nb][0] / (W / 6)))
cellc = [[] for _ in range(54)]
for i, c in enumerate(comps):
    if c[6] < 4: continue
    k = cellof(i)
    if k >= 0: cellc[k].append(i)
pieces = []; refs = {'n': [], 'f': [], 'h': []}
for ci_ in range(54):
    ri, ci = ci_ // 6, ci_ % 6; ids = cellc[ci_]; X0 = CX[ci]; Y0 = rows[ri][0] - 2
    cs = sorted(ids, key=lambda i: comps[i][0]); big = [i for i in cs if comps[i][6] > 150]
    xs = sorted(comps[i][0] for i in big); gaps = [(xs[j + 1] - xs[j], (xs[j + 1] + xs[j]) / 2) for j in range(len(xs) - 1)]
    cut = max(gaps)[1] if gaps else (X0 + CX[ci + 1]) / 2
    for side in ('n', 'f'):
        sel = [i for i in ids if (comps[i][0] < cut) == (side == 'n')]
        if not sel: pieces.append((ci_, side, None, 0, 0, 0, 0)); continue
        bx0 = min(comps[i][2] for i in sel); by0 = min(comps[i][3] for i in sel); bx1 = max(comps[i][4] for i in sel) + 1; by1 = max(comps[i][5] for i in sel) + 1
        P = Image.new('RGBA', (bx1 - bx0, by1 - by0), (0, 0, 0, 0)); pp = P.load(); ss = set(sel)
        for y in range(by0, by1):
            for x in range(bx0, bx1):
                l = lab[y][x]
                if l in ss: pp[x - bx0, y - by0] = px[x, y]
        ox, oy = bx0 - X0, by0 - Y0
        if ri == 0:
            pw, ph = P.size; ys = [y for y in range(int(ph * 0.38), ph) for x in range(pw) if pp[x, y][3] > 20]; xs2 = [x for y in range(int(ph * 0.38), ph) for x in range(pw) if pp[x, y][3] > 20]
            refs[side].append((ox + (min(xs2) + max(xs2)) / 2, oy + (min(ys) + max(ys)) / 2))
            if side == 'n': refs['h'].append(max(ys) - min(ys) + 1)
        tw, th = max(1, round(P.size[0] * scale)), max(1, round(P.size[1] * scale))
        pieces.append((ci_, side, P.resize((tw, th), Image.LANCZOS), ox, oy, P.size[0], P.size[1]))
ref = {'n': [round(sum(p[0] for p in refs['n']) / 6, 1), round(sum(p[1] for p in refs['n']) / 6, 1)], 'f': [round(sum(p[0] for p in refs['f']) / 6, 1), round(sum(p[1] for p in refs['f']) / 6, 1)], 'h': round(sum(refs['h']) / 6, 1)}
order = sorted([p for p in pieces if p[2]], key=lambda p: -p[2].size[1]); AW = 512; x = y = sh = 0; pos = {}
for p in order:
    tw, th = p[2].size
    if x + tw + 1 > AW: x = 0; y += sh + 1; sh = 0
    pos[(p[0], p[1])] = (x, y); x += tw + 1; sh = max(sh, th)
AH = y + sh; atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0)); cells = [[None, None] for _ in range(54)]
for p in order:
    ax, ay = pos[(p[0], p[1])]; atlas.paste(p[2], (ax, ay)); cells[p[0]][0 if p[1] == 'n' else 1] = [ax, ay, p[2].size[0], p[2].size[1], p[3], p[4], p[5], p[6]]
buf = io.BytesIO(); atlas.save(buf, 'WEBP', lossless=True, quality=100, method=6)
if dbg != '-':
    sh_ = Image.new('RGBA', (6 * 210, 9 * 160), (200, 220, 210, 255)); d = ImageDraw.Draw(sh_)
    for i, c in enumerate(cells):
        cx, cy = (i % 6) * 210, (i // 6) * 160
        for j, q in enumerate(c):
            if not q: continue
            t = atlas.crop((q[0], q[1], q[0] + q[2], q[1] + q[3])).resize((q[6], q[7]), Image.LANCZOS); sh_.alpha_composite(t, (cx + q[4], cy + q[5]))
            d.rectangle([cx + q[4], cy + q[5], cx + q[4] + q[6], cy + q[5] + q[7]], outline=(255, 0, 0) if j == 0 else (0, 0, 255))
        d.text((cx + 2, cy + 148), str(i), fill=(0, 0, 0))
    sh_.save(dbg)
print(json.dumps({'k': scale, 'w': AW, 'h': AH, 'c': cells, 'ref': ref, 'src': 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()}))
`;
const res=JSON.parse(execFileSync('python3',['-c',PY,path.join(__dirname,'eyes.webp'),String(scale),dbg>=0?args[dbg+1]:'-'],{maxBuffer:1<<28,stdio:['ignore','pipe','inherit']}).toString());
const js='/* ================= EYE EXPRESSIONS ATLAS (generated by assets/make-eye-atlas.js from assets/eyes.webp; do not edit) =================\n'+
 '   EYA.c[row*6+col] = [near, far]: [ax,ay,aw,ah, ox,oy,ow,oh] the piece in the atlas and its box in the cell (sheet px). EYA.ref: the neutral\n'+
 '   row\'s near / far eye centres and eye height (cell coords). EYA.k atlas px per sheet px. The sets are named in 73o-eyes.js (EYE_SET). */\n'+
 'const EYA={k:'+res.k+',w:'+res.w+',h:'+res.h+',ref:'+JSON.stringify(res.ref)+',\n c:'+JSON.stringify(res.c)+',\n src:\''+res.src+'\'};\n';
fs.writeFileSync(path.join(__dirname,'..','src','73n-eyesatlas.js'),js);
console.log('eyes atlas',res.w+'x'+res.h,'webp',Math.round(res.src.length*3/4/1024)+' KB','ref',JSON.stringify(res.ref));

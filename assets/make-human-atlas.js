// Builds src/73j-humanatlas.js (HPA: one trimmed webp atlas of the human body parts + the part table) from assets/human-parts.webp.
// Usage: node assets/make-human-atlas.js [scale=0.5] [--debug out.png]
// The sheet (1024x1536, 5 rows x 4 columns; rows 3-5 hold a pair per cell) is cut into its 32 pieces. Every piece is split
// into material layers at full resolution: 'o' the black outline (and eyes), then the fills found as regions between outline
// strokes: 's' skin, 'c' cloth (torso, sleeves), 'p' trousers, 'k' boots, 'b' belt, 'g' buckle. A fill layer stores its shade
// as grey (255 = the material's light tone, darker = the sheet's shade tone) so 73k-humans.js can multiply it by any colour and
// keep the shading; the outline layer stays black. Each layer is downscaled on its own (premultiplied box filter) and packed.
// HPA.p[name] = {w,h (piece size, sheet px), L:{mat:[ax,ay,aw,ah, ox,oy]}} : the layer's atlas rect and its offset in the piece
// (sheet px); HPA.k = atlas px per sheet px. Needs python3 with Pillow (webp).
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const args=process.argv.slice(2),dbg=args.indexOf('--debug'),scale=+(args.find(a=>/^[\d.]+$/.test(a))||0.5);
const PY=String.raw`
import sys, json, io, base64
from PIL import Image
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
rows = bands([any(r) for r in A], 5)
names = [['head_f', 'head_b', 'elf_f', 'elf_b'], ['torso_mf', 'torso_mb', 'torso_wf', 'torso_wb'],
         ['arm_mf_a', 'arm_mf_b', 'arm_mb_a', 'arm_mb_b', 'arm_wf_a', 'arm_wf_b', 'arm_wb_a', 'arm_wb_b'],
         ['hand_mf_a', 'hand_mf_b', 'hand_mb_a', 'hand_mb_b', 'hand_wf_a', 'hand_wf_b', 'hand_wb_a', 'hand_wb_b'],
         ['leg_pf_a', 'leg_pf_b', 'leg_pb_a', 'leg_pb_b', 'leg_sf_a', 'leg_sf_b', 'leg_sb_a', 'leg_sb_b']]
def lum(c): return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
pieces = []
for ri, (y0, y1) in enumerate(rows):
    cols = bands([any(A[y][x] for y in range(y0, y1 + 1)) for x in range(W)], 3)
    assert len(cols) == len(names[ri]), (ri, len(cols))
    for ci, (x0, x1) in enumerate(cols):
        ys = [y for y in range(y0, y1 + 1) if any(A[y][x] for x in range(x0, x1 + 1))]
        pieces.append((names[ri][ci], x0, ys[0], x1 + 1, ys[-1] + 1))
out = {}; layers = []
for (nm, x0, y0, x1, y1) in pieces:
    w, h = x1 - x0, y1 - y0
    P = [[px[x0 + x, y0 + y] for x in range(w)] for y in range(h)]
    fill = [[P[y][x][3] > 20 and max(P[y][x][:3]) > 26 for x in range(w)] for y in range(h)]
    lab = [[-1] * w for _ in range(h)]; comps = []
    for y in range(h):
        for x in range(w):
            if fill[y][x] and lab[y][x] < 0:
                st = [(x, y)]; lab[y][x] = len(comps); pts = []
                while st:
                    a, b = st.pop(); pts.append((a, b))
                    for (c, d) in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                        if 0 <= c < w and 0 <= d < h and fill[d][c] and lab[d][c] < 0: lab[d][c] = len(comps); st.append((c, d))
                comps.append(pts)
    mat = []
    for ci_, pts in enumerate(comps):
        inner = sum(1 for (a, b) in pts if all(0 <= a + dx < w and 0 <= b + dy < h and lab[b + dy][a + dx] == ci_ for dx in (-1, 0, 1) for dy in (-1, 0, 1)))
        if inner < max(4, len(pts) * 0.35):   # a thin rim of dark-red/grey edge pixels along a stroke: outline
            mat.append(['o', 0, len(pts)]); continue
        cs = sorted(P[b][a] for (a, b) in pts); n = len(cs)
        r = sum(c[0] for c in cs) / n; g = sum(c[1] for c in cs) / n; bl = sum(c[2] for c in cs) / n; L = lum((r, g, bl))
        my = sum(b for (a, b) in pts) / n
        if r - bl > 60 and r > 150: m = 's'
        elif r - bl > 60: m = 'g'
        elif r - bl > 18 and L < 110: m = 'b'
        elif L > 140: m = 'c'
        else: m = 'p'
        mat.append([m, my, n])
    if nm.startswith('leg'):   # the lowest dark region of a leg is the boot
        dk = [i for i, q in enumerate(mat) if q[0] == 'p' and q[2] > 40]
        if dk:
            lo = max(dk, key=lambda i: mat[i][1])
            mat[lo][0] = 'k'
    if nm.startswith('torso'):   # the belt buckle: a small light region (not skin) on the belt
        big = max(q[2] for q in mat)
        for q in mat:
            if q[0] in 'cps' and 6 <= q[2] < big * 0.06 and q[1] > h * 0.6: q[0] = 'g'
    for i, q in enumerate(mat):   # specks too small to matter join the outline
        if q[2] < 6: q[0] = 'o'
    mats = {}
    for i, q in enumerate(mat):
        mats.setdefault(q[0], []).append(i)
    ent = {'w': w, 'h': h, 'L': {}}
    order = ['o'] + [m for m in 'scpkbg' if m in mats]
    for m in order:
        ref = 1
        if m != 'o':
            ls = sorted(lum(P[b][a]) for i in mats[m] for (a, b) in comps[i]); ref = max(1, ls[int(len(ls) * 0.85)])
        L = Image.new('RGBa', (w, h), (0, 0, 0, 0)); lp = L.load()
        for y in range(h):
            for x in range(w):
                c = P[y][x]
                if c[3] <= 0: continue
                l = lab[y][x]
                if m == 'o':
                    if l >= 0 and mat[l][0] != 'o': continue
                    a = c[3]; lp[x, y] = (0, 0, 0, a)
                else:
                    if l < 0 or mat[l][0] != m: continue
                    v = min(255, int(round(255 * lum(c) / ref))); a = c[3]
                    lp[x, y] = (v * a // 255, v * a // 255, v * a // 255, a)
        bb = L.getbbox()
        if not bb: continue
        sx0, sy0, sx1, sy1 = bb; sx0 = max(0, sx0 - 1); sy0 = max(0, sy0 - 1); sx1 = min(w, sx1 + 1); sy1 = min(h, sy1 + 1)
        tw, th = max(1, round((sx1 - sx0) * scale)), max(1, round((sy1 - sy0) * scale))
        S = L.crop((sx0, sy0, sx1, sy1)).resize((tw, th), Image.BOX).convert('RGBA')
        layers.append((nm, m, S, sx0, sy0, sx1 - sx0, sy1 - sy0))
    out[nm] = ent
# shelf packing
layers.sort(key=lambda q: -q[2].size[1]); AW = 512; x = y = sh = 0; pos = []
for q in layers:
    tw, th = q[2].size
    if x + tw + 1 > AW: x = 0; y += sh + 1; sh = 0
    pos.append((x, y)); x += tw + 1; sh = max(sh, th)
AH = y + sh
atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
for q, (ax, ay) in zip(layers, pos):
    atlas.paste(q[2], (ax, ay))
    out[q[0]]['L'][q[1]] = [ax, ay, q[2].size[0], q[2].size[1], q[3], q[4], q[5], q[6]]
buf = io.BytesIO(); atlas.save(buf, 'WEBP', lossless=True, quality=100, method=6)
if dbg != '-': atlas.save(dbg)
print(json.dumps({'k': scale, 'w': AW, 'h': AH, 'p': out, 'src': 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()}))
`;
const res=JSON.parse(execFileSync('python3',['-c',PY,path.join(__dirname,'human-parts.webp'),String(scale),dbg>=0?args[dbg+1]:'-'],{maxBuffer:1<<28}).toString());
const parts=Object.keys(res.p).map(n=>{const P=res.p[n];return' '+n+':{w:'+P.w+',h:'+P.h+',L:{'+Object.keys(P.L).map(m=>m+':['+P.L[m].join(',')+']').join(',')+'}}'}).join(',\n');
const js='/* ================= HUMAN BODY PARTS ATLAS (generated by assets/make-human-atlas.js from assets/human-parts.webp; do not edit) =================\n'+
 '   HPA.p[name] = {w,h: the piece in sheet px, L:{layer:[ax,ay,aw,ah, ox,oy,ow,oh]}}: the layer\'s rect in the atlas and the box it covers in the piece (sheet px).\n'+
 '   Layers: o outline (black), s skin, c cloth, p trousers, k boots, b belt, g buckle; fills are grey shade (255 = light tone) to be multiplied by a colour.\n'+
 '   HPA.k atlas px per sheet px. Pieces: head_f/b, elf_f/b, torso_{m|w}{f|b}, arm_/hand_{m|w}{f|b}_{a|b} (a = screen-left one), leg_{p|s}{f|b}_{a|b}. */\n'+
 'const HPA={k:'+res.k+',w:'+res.w+',h:'+res.h+',p:{\n'+parts+'},\n src:\''+res.src+'\'};\n';
fs.writeFileSync(path.join(__dirname,'..','src','73j-humanatlas.js'),js);
console.log('atlas',res.w+'x'+res.h,'webp',Math.round(res.src.length*3/4/1024)+' KB','js',Math.round(js.length/1024)+' KB');

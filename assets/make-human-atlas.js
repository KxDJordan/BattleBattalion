// Builds src/73j-humanatlas.js (HPA: one trimmed webp atlas of the human body parts + the part table) from assets/human-parts.webp.
// Also cuts assets/halforc-parts.webp and assets/dwarf-parts.webp (same layout; pieces prefixed 'o' / 'd', their row 1 = ohead_f/b, ohead2_f/b).
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
srcs, scale, dbg = sys.argv[1].split(','), float(sys.argv[2]), sys.argv[3]
def bands(vals, gap):
    out = []; s = None; p = None
    for i, v in enumerate(vals):
        if v:
            if s is None: s = i
            elif i > p + gap: out.append((s, p)); s = i
            p = i
    if s is not None: out.append((s, p))
    return out
NAMES = [['head_f', 'head_b', 'elf_f', 'elf_b'], ['torso_mf', 'torso_mb', 'torso_wf', 'torso_wb'],
         ['arm_mf_a', 'arm_mf_b', 'arm_mb_a', 'arm_mb_b', 'arm_wf_a', 'arm_wf_b', 'arm_wb_a', 'arm_wb_b'],
         ['hand_mf_a', 'hand_mf_b', 'hand_mb_a', 'hand_mb_b', 'hand_wf_a', 'hand_wf_b', 'hand_wb_a', 'hand_wb_b'],
         ['leg_pf_a', 'leg_pf_b', 'leg_pb_a', 'leg_pb_b', 'leg_sf_a', 'leg_sf_b', 'leg_sb_a', 'leg_sb_b']]
def lum(c): return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
out = {}; layers = []
for si, srcf in enumerate(srcs):
  pre, srcf = srcf.split('=') if '=' in srcf else ('', srcf)
  im = Image.open(srcf).convert('RGBA'); W, H = im.size; px = im.load()
  A = [[px[x, y][3] > 20 for x in range(W)] for y in range(H)]
  rows = bands([any(r) for r in A], 5)
  names = [[pre + n for n in r] for r in NAMES]
  if pre in ('o', 'd'): names[0] = [pre + 'head_f', pre + 'head_b', pre + 'head2_f', pre + 'head2_b']
  pieces = []
  for ri, (y0, y1) in enumerate(rows):
    cols = bands([any(A[y][x] for y in range(y0, y1 + 1)) for x in range(W)], 3)
    while len(cols) < len(names[ri]):   # a pair drawn touching: cut the widest band at its thinnest column
        i = max(range(len(cols)), key=lambda j: cols[j][1] - cols[j][0]); a, b = cols[i]; m0, m1 = a + (b - a) * 3 // 10, a + (b - a) * 7 // 10
        cut = min(range(m0, m1), key=lambda x: sum(1 for y in range(y0, y1 + 1) if A[y][x]))
        cols[i:i + 1] = [(a, cut - 1), (cut + 1, b)]
    assert len(cols) == len(names[ri]), (srcf, ri, len(cols))
    for ci, (x0, x1) in enumerate(cols):
        ys = [y for y in range(y0, y1 + 1) if any(A[y][x] for x in range(x0, x1 + 1))]
        pieces.append((names[ri][ci], x0, ys[0], x1 + 1, ys[-1] + 1))
  for (nm, x0, y0, x1, y1) in pieces:
      w, h = x1 - x0, y1 - y0
      P = [[px[x0 + x, y0 + y] for x in range(w)] for y in range(h)]
      eyes = None
      if nm.endswith('_f') and ('head' in nm or nm.startswith('elf')):   # a front head: lift the painted eyes (and brows) off, keep where they were
          dk = [[P[y][x][3] > 20 and max(P[y][x][:3]) <= 70 for x in range(w)] for y in range(h)]
          dl = [[-1] * w for _ in range(h)]; blobs = []
          for y in range(h):
              for x in range(w):
                  if dk[y][x] and dl[y][x] < 0:
                      st = [(x, y)]; dl[y][x] = len(blobs); pts = []
                      while st:
                          a_, b_ = st.pop(); pts.append((a_, b_))
                          for (c_, d_) in ((a_ + 1, b_), (a_ - 1, b_), (a_, b_ + 1), (a_, b_ - 1)):
                              if 0 <= c_ < w and 0 <= d_ < h and dk[d_][c_] and dl[d_][c_] < 0: dl[d_][c_] = len(blobs); st.append((c_, d_))
                      blobs.append(pts)
          big = max(range(len(blobs)), key=lambda i: len(blobs[i]))
          cand = []
          for i, pts in enumerate(blobs):
              if i == big or len(pts) < 12: continue
              xs = [q[0] for q in pts]; ys = [q[1] for q in pts]; cx = sum(xs) / len(xs); cy = sum(ys) / len(ys)
              if cx > w * 0.38 and h * 0.3 < cy < h * 0.85: cand.append((cx, cy, min(ys), max(ys), min(xs), max(xs), pts))
          skinpx = [P[y][x] for y in range(h) for x in range(w) if P[y][x][3] > 250 and P[y][x][0] > 60 and max(P[y][x][:3]) > 90]
          def skin_near(cx, cy, r):
              vs = [P[y][x] for y in range(max(0, int(cy - r)), min(h, int(cy + r))) for x in range(max(0, int(cx - r)), min(w, int(cx + r)))
                    if P[y][x][3] > 250 and max(P[y][x][:3]) > 90 and dl[y][x] < 0]
              vs = vs or skinpx; vs.sort(key=lambda c: sum(c[:3])); return vs[len(vs) // 2]
          for (cx, cy, y0b, y1b, x0b, x1b, pts) in cand:
              col = skin_near(cx, cy, max(y1b - y0b, x1b - x0b) + 8)
              for yy in range(max(0, y0b - 3), min(h, y1b + 4)):
                  for xx in range(max(0, x0b - 3), min(w, x1b + 4)):
                      if dl[yy][xx] == big: continue
                      near = any(0 <= yy + j < h and 0 <= xx + i < w and dl[yy + j][xx + i] >= 0 and dl[yy + j][xx + i] != big for j in range(-3, 4) for i in range(-3, 4))
                      if near and P[yy][xx][3] > 20 and (dl[yy][xx] >= 0 or max(P[yy][xx][:3]) < sum(col[:3]) / 3 + 10): P[yy][xx] = (col[0], col[1], col[2], 255)
          if cand:
              cand.sort(key=lambda c: c[0]); gaps = [(cand[i + 1][0] - cand[i][0], i) for i in range(len(cand) - 1)]
              cut = max(gaps)[1] if gaps and max(gaps)[0] > w * 0.12 else len(cand) - 1
              def eye_of(cl):
                  e = max(cl, key=lambda c: c[3]); return [round(e[0], 1), round(e[1], 1), e[3] - e[2] + 1]
              n_ = eye_of(cand[:cut + 1]); f_ = eye_of(cand[cut + 1:]) if cut + 1 < len(cand) else [round(n_[0] + w * 0.3, 1), n_[1], n_[2]]
              eyes = n_ + f_
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
          if (r - bl > 60 and r > 150) or (pre == 'o' and abs(r - g) < 30 and g - bl > 35 and L > 60): m = 's'
          elif r - bl > 60: m = 'g'
          elif r - bl > 18 and L < 110: m = 'b'
          elif L > 140: m = 'c'
          else: m = 'p'
          mat.append([m, my, n])
      if nm[len(pre):].startswith('leg'):   # the lowest dark region of a leg is the boot (brown trousers read as belt colour: trousers)
          for q in mat:
              if q[0] == 'b': q[0] = 'p'
          dk = [i for i, q in enumerate(mat) if q[0] == 'p' and q[2] > 40]
          if dk:
              lo = max(dk, key=lambda i: mat[i][1])
              mat[lo][0] = 'k'
      if nm[len(pre):].startswith('torso'):   # the belt buckle: a small light region (not skin) on the belt
          big = max(q[2] for q in mat)
          for q in mat:
              if q[0] in 'cps' and 6 <= q[2] < big * 0.06 and q[1] > h * 0.6: q[0] = 'g'
      for i, q in enumerate(mat):   # specks too small to matter join the outline
          if q[2] < 6: q[0] = 'o'
      mats = {}
      for i, q in enumerate(mat):
          mats.setdefault(q[0], []).append(i)
      ent = {'w': w, 'h': h, 'L': {}}
      if eyes: ent['eyes'] = eyes
      order = ['o'] + [m for m in 'scpkbg' if m in mats]
      for m in order:
          ref = 1
          if m != 'o':
              ls = sorted(lum(P[b][a]) for i in mats[m] for (a, b) in comps[i]); ref = max(1, ls[int(len(ls) * 0.85)])
          L = Image.new('RGBa', (w, h), (0, 0, 0, 0)); lp = L.load()
          for y in range(h):
              for x in range(w):
                  c = P[y][x]
                  if c[3] < 16: continue
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
const res=JSON.parse(execFileSync('python3',['-c',PY,['human-parts.webp','o=halforc-parts.webp','d=dwarf-parts.webp'].map(f=>f.replace(/[^=]*$/,m=>path.join(__dirname,m))).join(','),String(scale),dbg>=0?args[dbg+1]:'-'],{maxBuffer:1<<28,stdio:['ignore','pipe','inherit']}).toString());
const parts=Object.keys(res.p).map(n=>{const P=res.p[n];return' '+n+':{w:'+P.w+',h:'+P.h+(P.eyes?',eyes:['+P.eyes.join(',')+']':'')+',L:{'+Object.keys(P.L).map(m=>m+':['+P.L[m].join(',')+']').join(',')+'}}'}).join(',\n');
const js='/* ================= HUMAN BODY PARTS ATLAS (generated by assets/make-human-atlas.js from assets/human-parts.webp; do not edit) =================\n'+
 '   HPA.p[name] = {w,h: the piece in sheet px, L:{layer:[ax,ay,aw,ah, ox,oy,ow,oh]}}: the layer\'s rect in the atlas and the box it covers in the piece (sheet px).\n'+
 '   Layers: o outline (black), s skin, c cloth, p trousers, k boots, b belt, g buckle; fills are grey shade (255 = light tone) to be multiplied by a colour.\n'+
 '   HPA.k atlas px per sheet px. Pieces: head_f/b, elf_f/b, torso_{m|w}{f|b}, arm_/hand_{m|w}{f|b}_{a|b} (a = screen-left one), leg_{p|s}{f|b}_{a|b}. */\n'+
 'const HPA={k:'+res.k+',w:'+res.w+',h:'+res.h+',p:{\n'+parts+'},\n src:\''+res.src+'\'};\n';
fs.writeFileSync(path.join(__dirname,'..','src','73j-humanatlas.js'),js);
console.log('atlas',res.w+'x'+res.h,'webp',Math.round(res.src.length*3/4/1024)+' KB','js',Math.round(js.length/1024)+' KB');

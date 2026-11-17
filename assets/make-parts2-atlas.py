# Cuts the character part sheets in assets/parts2/ (heads, hands, legs, hair, helmets, armor) into labelled pieces and packs them into
# src/73p-parts2atlas.js (P2A). Run: python3 assets/make-parts2-atlas.py [--sheet out.png]   (Pillow + numpy)
# Every piece is cut by its alpha (rows, then columns; touching neighbours are split at the thinnest column, stray bits join the nearest
# piece), scaled from sheet px into the figure's units (SU: about 390 SU from feet to the top of the head, as the old parts sheet) with one
# factor per sheet chosen so head : torso : hands : legs match the user's approved composite (.ref/helm-characters.png), then split
# into layers at full resolution: 'c' the piece in its own colours, 's' its skin alone as grey shade (heads, hands: drawn over 'c' multiplied by
# another skin tone), 'h' a hair piece as grey shade with its black outline (multiplied by the merc's hair colour). Each layer is stored at P2A.k atlas px per SU.
# P2A.p[name] = {w,h (SU), a:{...anchors in SU, piece-local}, L:{layer:[ax,ay,aw,ah, ox,oy,ow,oh]}} ; P2A.src[i] the atlas images.
import sys, json, io, base64, os
import numpy as np
from PIL import Image, ImageDraw
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parts2')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', '73p-parts2atlas.js')
K = 0.42                      # atlas px per SU
SHEET = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None

def load(n):
    im = Image.open(os.path.join(D, n)).convert('RGBA'); a = np.array(im); return im, a

def bands(v, gap):
    out = []; s = None; p = None
    for i, x in enumerate(v):
        if x:
            if s is None: s = i
            elif i > p + gap: out.append([s, p]); s = i
            p = i
    if s is not None: out.append([s, p])
    return out

def cut_row(M, y0, y1, n):
    """columns of one row band -> n [x0,x1] spans (merge slivers, split touching pairs at the thinnest column)"""
    col = M[y0:y1 + 1].sum(0); cs = bands(col > 0, 2)
    while len(cs) > n:   # the narrowest span joins its nearest neighbour
        i = min(range(len(cs)), key=lambda j: cs[j][1] - cs[j][0])
        if i == 0: j = 1
        elif i == len(cs) - 1: j = i - 1
        else: j = i - 1 if cs[i][0] - cs[i - 1][1] < cs[i + 1][0] - cs[i][1] else i + 1
        a, b = sorted([i, j]); cs[a:b + 1] = [[cs[a][0], cs[b][1]]]
    while len(cs) < n:
        i = max(range(len(cs)), key=lambda j: cs[j][1] - cs[j][0]); a, b = cs[i]; w = b - a
        guess = round(w / round(w / ((b - a) / 2))) if False else w // 2
        lo, hi = a + int(w * .3), a + int(w * .7); c = lo + int(np.argmin(col[lo:hi]))
        cs[i:i + 1] = [[a, c - 1], [c + 1, b]]
    return cs

def cut(a, counts, rowgap=6):
    M = a[:, :, 3] > 24; rowsum = M.sum(1); rs = bands(rowsum > 0, rowgap)
    while len(rs) < len(counts):   # rows drawn touching: cut the tallest band at its thinnest row (middle half)
        i = max(range(len(rs)), key=lambda j: rs[j][1] - rs[j][0]); a_, b_ = rs[i]; hh = b_ - a_
        lo, hi = a_ + int(hh * .55), a_ + int(hh * .85); c = lo + int(np.argmin(rowsum[lo:hi])); rs[i:i + 1] = [[a_, c - 1], [c + 1, b_]]
    assert len(rs) == len(counts), (len(rs), counts, rs)
    out = []
    for (y0, y1), n in zip(rs, counts):
        row = []
        for x0, x1 in cut_row(M, y0, y1, n):
            sub = M[y0:y1 + 1, x0:x1 + 1]; ys = np.where(sub.any(1))[0]; xs = np.where(sub.any(0))[0]
            row.append([x0 + xs[0], y0 + ys[0], x0 + xs[-1] + 1, y0 + ys[-1] + 1])
        out.append(row)
    return out

def piece(a, box, kind):
    x0, y0, x1, y1 = box; P = a[y0:y1, x0:x1].astype(np.float32)
    # clear bits of neighbouring pieces that intrude into the box: keep the components that touch the biggest one's bbox core
    return P

def layers(P, kind):
    r, g, b, al = P[:, :, 0], P[:, :, 1], P[:, :, 2], P[:, :, 3]
    mx = np.maximum(np.maximum(r, g), b); lum = .3 * r + .59 * g + .11 * b
    ol = (mx < 62) & (al > 0)
    if kind == 'hair': sk = (~ol) & (al > 0); hl = sk; sk = np.zeros_like(ol)
    else:
        hl = np.zeros_like(ol)
        skin = (r > 180) & (g > r * .5) & (g < r * .86) & (b > r * .3) & (b < r * .72) & (r - b > 55)
        sk = skin & (~ol) & (al > 0) if kind in ('head', 'hand', 'torso') else np.zeros_like(ol)
    L = {}
    def grey(m, keep_ol):
        ref = max(1., float(np.percentile(lum[m], 85))); v = np.clip(255 * lum / ref, 0, 255)
        if keep_ol: v[ol] = np.minimum(v[ol], lum[ol])
        o = np.zeros(P.shape, np.float32); o[..., 0] = o[..., 1] = o[..., 2] = v; o[..., 3] = al; o[~(m | (ol if keep_ol else m))] = 0; return o
    if kind == 'hair': L['h'] = grey(hl, True)          # grey shade with the outline in it: multiplied by the hair colour, the outline stays black
    else:
        L['c'] = P.copy()                                 # the piece in its own colours
        if sk.any() and kind in ('head', 'hand'): L['s'] = grey(sk, False)   # the skin alone, grey: drawn over 'c' tinted for other skin tones
    return L

PIECES = []   # (name, kind, P (float rgba), sf)
def add(name, kind, a, box, sf): PIECES.append((name, kind, a[box[1]:box[3], box[0]:box[2]].astype(np.float32), sf, box))

# ---- sheets ----
_, H = load('heads.webp'); hb = cut(H, [8])[0]
_, HA = load('hands.png'); nb = cut(HA, [2])[0]
_, LG = load('legs.png'); lb = cut(LG, [10])[0]
_, HR = load('hair.webp'); rb = cut(HR, [8, 8, 8, 6], 10)
_, HM = load('helmets.webp'); mb = cut(HM, [10, 10, 10, 10], 20)
_, AR = load('armor.webp'); ab = cut(AR, [10, 20, 7, 14, 10, 20, 10, 20, 10, 20, 4, 8], 6)
def width(bx): return bx[2] - bx[0]
med = lambda xs: float(np.median(xs))
# per-sheet scales: SU per sheet px. Targets from the approved composite (ref px) x 1.18 SU per ref px
SU = 1.18
sf_head = 170 * SU / med([width(b) for b in hb])
sf_torso = 130 * SU / med([width(b) for b in ab[0] + ab[2] + ab[4] + ab[6] + ab[8]])
sf_legs = 75 * SU / med([width(b) for b in lb])          # one leg of the pair
sf_hand = 62 * SU / med([width(b) for b in nb])
for i, b in enumerate(hb): add('head%d' % i, 'head', H, b, sf_head)
for i, b in enumerate(nb): add('hand_' + 'ab'[i], 'hand', HA, b, sf_hand)
for i, b in enumerate(lb): add('leg%d_%s' % (i // 2, 'ab'[i % 2]), 'leg', LG, b, sf_legs)
k = 0
for row in rb:
    for b in row: add('hair%d' % k, 'hair', HR, b, sf_head); k += 1
k = 0
for row in mb:
    for b in row: add('helm%d' % k, 'helm', HM, b, sf_head); k += 1
MA = AR[:, :, 3] > 24
def caps_under(row, tb):
    """the shoulder pair drawn below torso box tb: the pieces of that row whose centre lies under the torso, the two widest (one wide = a touching
    pair, split at its thinnest column)"""
    y0 = min(r[1] for r in row); y1 = max(r[3] for r in row); col = MA[y0:y1].sum(0); X0 = max(0, tb[0] - 25); spans = bands(col[X0:tb[2] + 25] > 0, 1)
    spans = [[a_ + X0, b_ + X0] for a_, b_ in spans if b_ - a_ > 12]
    spans.sort(key=lambda q: -(q[1] - q[0]))
    if len(spans) > 1 and spans[1][1] - spans[1][0] < (spans[0][1] - spans[0][0]) * .45: spans = spans[:1]
    spans = sorted(spans[:2])
    if len(spans) == 1:
        a_, b_ = spans[0]; lo, hi = a_ + (b_ - a_) * 3 // 10, a_ + (b_ - a_) * 7 // 10; c = lo + int(np.argmin(col[lo:hi])); spans = [[a_, c - 1], [c + 1, b_]]
    out = []
    for a_, b_ in spans:
        sub = MA[y0:y1, a_:b_ + 1]; ys = np.where(sub.any(1))[0]; out.append([a_, y0 + ys[0], b_ + 1, y0 + ys[-1] + 1])
    return out
k = 0
for ti in range(0, 12, 2):
    for j, b in enumerate(ab[ti]):
        add('torso%d' % (k + j), 'torso', AR, b, sf_torso)
        ca, cb = caps_under(ab[ti + 1], b); add('sh%d_a' % (k + j), 'arm', AR, ca, sf_torso); add('sh%d_b' % (k + j), 'arm', AR, cb, sf_torso)
    k += len(ab[ti])

# ---- anchors (piece-local SU) ----
def anchors(kind, P, s):
    al = P[:, :, 3] > 40; h, w = al.shape; A = {}
    def span(y):
        xs = np.where(al[min(h - 1, max(0, int(y)))])[0]; return (xs[0], xs[-1]) if len(xs) else (0, w - 1)
    if kind == 'head':
        x0, x1 = span(h * .5); x0 = x0 + (x1 - x0) * .12   # skip the ear at the back (left)
        A['cx'] = (x0 + x1) / 2 * s; A['cy'] = h * .5 * s; A['r'] = (x1 - x0) / 2 * s; A['nx'] = (x0 + x1) / 2 * s + 4; A['ny'] = (h - 4) * s; A['top'] = 0
        q0, q1 = span(h * .36); A['sx0'] = q0 * s; A['sx1'] = q1 * s
        A['ex'] = w * .185 * s; A['ey'] = h * .677 * s   # the ear (measured on the sheet: the same on every expression)   # the skull's back and front edges above the ear
    elif kind == 'torso':
        sk = (P[:, :, 0] > 180) & (P[:, :, 0] - P[:, :, 2] > 55) & (P[:, :, 1] > P[:, :, 0] * .5) & al
        ys = np.where(sk.any(1))[0]; ny = ys[0] if len(ys) else 0; nxs = np.where(sk[ny])[0] if len(ys) else [w / 2]
        A['nx'] = float(np.mean(nxs)) * s; A['ny'] = float(ny) * s
        x0, x1 = span(h * .3); A['sax'] = (x0 + 6) * s; A['sbx'] = (x1 - 6) * s; A['sy'] = h * .26 * s
        x0, x1 = span(h - 6); A['hx'] = (x0 + x1) / 2 * s; A['hy'] = (h - 10) * s
    elif kind == 'arm':
        x0, x1 = span(4); A['px'] = (x0 + x1) / 2 * s; A['py'] = 10 * s
        x0, x1 = span(h - 4); A['wx'] = (x0 + x1) / 2 * s; A['wy'] = (h - 12) * s
    elif kind == 'hand':
        x0, x1 = span(h * .2); A['px'] = (x0 + x1) / 2 * s; A['py'] = h * .22 * s
    elif kind == 'leg':
        x0, x1 = span(3); A['px'] = (x0 + x1) / 2 * s; A['py'] = 3 * s; A['fy'] = (h - 1) * s
    elif kind in ('helm', 'hair'):
        rows = [span(y) for y in (range(int(h * .45), h) if kind == 'helm' else range(int(h * .12), int(h * .42)))]
        ws = sorted(r[1] - r[0] for r in rows); bw = ws[int(len(ws) * .7)]   # hair: measured at its crown (tails, braids and long ends hang lower)
        mids = [(r[0] + r[1]) / 2 for r in rows if r[1] - r[0] >= bw * .8]
        A['bw'] = bw * s; A['bcx'] = (float(np.mean(mids)) if mids else w / 2) * s
        ys = np.where(al.any(1))[0]; topb = 0
        for y in range(h):   # the body's top: the first row at least 40% as wide as the body (a plume / feather / horns are thinner)
            a_, b_ = span(y)
            if al[y].any() and b_ - a_ >= bw * .4 and al[y, a_:b_ + 1].mean() > .55: topb = y; break
        A['btop'] = topb * s
        if kind == 'hair':   # the ear hole: the notch on the left edge of the face opening (the opening = the biggest enclosed transparent region)
            above = np.maximum.accumulate(al, axis=0); lft = np.maximum.accumulate(al, axis=1); rgt = np.maximum.accumulate(al[:, ::-1], axis=1)[:, ::-1]
            cand = (~al) & above & lft & rgt; lab = -np.ones(al.shape, int); best = None; nid = 0
            for y0_ in range(h):
                for x0_ in range(w):
                    if cand[y0_, x0_] and lab[y0_, x0_] < 0:
                        st = [(y0_, x0_)]; lab[y0_, x0_] = nid; pts = []
                        while st:
                            yy, xx = st.pop(); pts.append((yy, xx))
                            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                                y2, x2 = yy + dy, xx + dx
                                if 0 <= y2 < h and 0 <= x2 < w and cand[y2, x2] and lab[y2, x2] < 0: lab[y2, x2] = nid; st.append((y2, x2))
                        if best is None or len(pts) > len(best): best = pts
                        nid += 1
            if best:
                ys_ = [p_[0] for p_ in best]; oy0, oy1 = min(ys_), max(ys_); rows_ = {}
                for yy, xx in best: rows_[yy] = min(rows_.get(yy, w), xx)
                lo = oy0 + int((oy1 - oy0) * .3); hi = oy0 + int((oy1 - oy0) * .9); rr = [(rows_[y_], y_) for y_ in range(lo, hi + 1) if y_ in rows_]
                if rr:
                    mx = min(r_[0] for r_ in rr); ys2 = [y_ for x_, y_ in rr if x_ <= mx + 2]; A['ehx'] = mx * s; A['ehy'] = float(np.median(ys2)) * s
        if kind == 'helm':   # the steel bowl alone (grey, unsaturated, not white): its top row and its width / centre below that, for crested / winged helms
            r_, g_, b_ = P[:, :, 0], P[:, :, 1], P[:, :, 2]; lum = .3 * r_ + .59 * g_ + .11 * b_; sat = np.maximum(np.maximum(r_, g_), b_) - np.minimum(np.minimum(r_, g_), b_)
            met = al & (sat < 28) & (lum > 95) & (lum < 222); rows_ = np.where(met.sum(1) >= max(3, met.sum(1).max() * .35))[0]
            if len(rows_):
                mt = rows_[0]; sub = met[mt:mt + max(4, (h - mt) // 2)]; cols = np.where(sub.any(0))[0]
                A['mtop'] = mt * s; A['mbw'] = (cols[-1] - cols[0] + 1) * s; A['mbcx'] = (cols[0] + cols[-1]) / 2 * s
    return {k_: round(float(v), 1) for k_, v in A.items()}

# ---- layers, scaled, packed ----
items = []; meta = {}
for name, kind, P, sf, box in PIECES:
    h0, w0 = P.shape[:2]; s = sf   # SU per sheet px
    meta[name] = {'w': round(w0 * s, 1), 'h': round(h0 * s, 1), 'a': anchors(kind, P, s), 'L': {}, 'k': kind}
    for m, arr in layers(P, kind).items():
        im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA'); bb = im.getbbox()
        if not bb: continue
        im = im.crop(bb); tw, th = max(1, round(im.width * s * K)), max(1, round(im.height * s * K))
        # premultiplied resize keeps colours clean at the edges
        im = im.convert('RGBa').resize((tw, th), Image.LANCZOS).convert('RGBA')
        items.append((name, m, im, bb[0] * s, bb[1] * s, (bb[2] - bb[0]) * s, (bb[3] - bb[1]) * s))
items.sort(key=lambda q: -q[2].height)
AW = 1024; x = y = sh = 0; atl = 0; pos = []; heights = [0]
for q in items:
    tw, th = q[2].size
    if x + tw + 1 > AW: x = 0; y += sh + 1; sh = 0
    if y + th > 1024: atl += 1; heights.append(0); x = y = sh = 0
    pos.append((atl, x, y)); x += tw + 1; sh = max(sh, th); heights[atl] = max(heights[atl], y + sh)
ims = [Image.new('RGBA', (AW, hgt), (0, 0, 0, 0)) for hgt in heights]
for q, (ai, x, y) in zip(items, pos):
    ims[ai].paste(q[2], (x, y)); meta[q[0]]['L'][q[1]] = [ai, x, y, q[2].width, q[2].height, round(q[3], 1), round(q[4], 1), round(q[5], 1), round(q[6], 1)]
srcs = []
for im in ims:
    b = io.BytesIO(); im.save(b, 'WEBP', quality=82, method=6, alpha_quality=90); srcs.append('data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode())
js = ('/* ================= CHARACTER PARTS ATLAS 2 (generated by assets/make-parts2-atlas.py from assets/parts2/*; do not edit) =================\n'
      '   P2A.p[name] = {w,h (SU), k (kind), a (anchors, SU, piece-local), L:{layer:[atlas, ax,ay,aw,ah, ox,oy,ow,oh]}}: the layer\'s rect in atlas P2A.src[atlas]\n'
      '   and the box it covers in the piece (SU). Layers: c own colours, s skin only (grey shade, over c for other skin tones), h hair (grey shade with the outline). P2A.k atlas px per SU.\n'
      '   Pieces: head0..7 (neutral, gritted, shouting, happy, content, surprised, nervous, knocked out), hand_a / hand_b, leg<c>_a / _b (c: tan, blue,\n'
      '   green, rust, grey), hair0..29, helm0..39, torso0..50 with sh<i>_a / sh<i>_b (the shoulder caps below it). Names in 73q-parts2.js. */\n'
      'const P2A={k:%s,p:%s,\n src:%s};\n') % (K, json.dumps(meta, separators=(',', ':')), json.dumps(srcs))
open(OUT, 'w').write(js)
print('parts', len(meta), 'atlases', [im.size for im in ims], 'KB', [round(len(s_) * 3 / 4 / 1024) for s_ in srcs], 'scales head %.2f torso %.2f legs %.2f hand %.2f' % (sf_head, sf_torso, sf_legs, sf_hand))
if SHEET:
    names = list(meta.keys()); cols = 12; cw, ch = 150, 170; S = Image.new('RGBA', (cols * cw, ((len(names) + cols - 1) // cols) * ch), (215, 225, 218, 255)); d = ImageDraw.Draw(S)
    for i, (name, kind, P, sf, box) in enumerate(PIECES):
        im = Image.fromarray(P.astype(np.uint8), 'RGBA'); s = min((cw - 10) / im.width, (ch - 30) / im.height, 1); im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
        cx, cy = (i % cols) * cw, (i // cols) * ch; S.alpha_composite(im, (cx + 5, cy + 5)); A = meta[name]['a']; q = s / sf
        for kx, ky, colr in (('px', 'py', (255, 0, 0)), ('wx', 'wy', (0, 0, 255)), ('nx', 'ny', (0, 160, 0)), ('hx', 'hy', (255, 0, 255)), ('cx', 'cy', (0, 0, 160)), ('bcx', 'btop', (255, 120, 0))):
            if kx in A: X, Y = cx + 5 + A[kx] * q, cy + 5 + A[ky] * q; d.ellipse([X - 3, Y - 3, X + 3, Y + 3], fill=colr)
        if 'sax' in A:
            for kx in ('sax', 'sbx'): X, Y = cx + 5 + A[kx] * q, cy + 5 + A['sy'] * q; d.ellipse([X - 3, Y - 3, X + 3, Y + 3], fill=(255, 0, 255))
        d.text((cx + 4, cy + ch - 16), name, fill=(0, 0, 0))
    S.save(SHEET)

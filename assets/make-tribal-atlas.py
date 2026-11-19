# Cuts the user's tribal heads sheet (assets/parts2/tribal-heads.webp: 2 rows x 10 bald human heads, three-quarter facing right, no eyes or
# mouth, each with its own dark-red tribal marking) into src/73pb-tribalatlas.js (TRA), merged into P2A at load (pieces trh0..19, trf0..7,
# trff0..7). Run: python3 assets/make-tribal-atlas.py [--sheet out.png]   (Pillow + numpy)
# The heads: cut by alpha, each registered onto the human head (P2A head0, heads-mf.webp row 1) by its silhouette and ear (scale + shift
# minimising the outline mismatch, the ear weighted: hair is fitted to the ear), and resampled into head0's own frame, so every head0
# anchor (neck, skull edges, ear, mouth) holds and the hair, beards and helmets sit as on a human head. Layers:
#   c  the head without its marking (the skin under the marking filled from the skin round it), the skin brought to heads-mf's tone
#   s  the skin alone as grey shade (multiplied by the merc's skin tone, as the human heads)
#   p  the marking alone as grey shade, its alpha unmixed from the skin (multiplied by the paint colour; the sheet's red by default)
#   o  the outer outline ring (drawn last, over the face, so the face never pokes past the head's edge)
# The faces: the sheet has none, so the faces of the human heads (heads-mf.webp: eight expressions, row 1 men, row 2 women with lashes,
# P2_FACE order) are lifted off them: inside each head (not its outline ring, ear, or the crown's shine) the pixels that differ from the
# skin round them (the skin estimated per pixel from the nearby skin), each unmixed from the skin (colour of the nearest solid face pixel,
# alpha by projection), so the overlay carries no skin and sits on any tone. Each human head is first registered on head0 (shift
# minimising the silhouette mismatch), so its face lands in head0's frame where the tribal heads are. trf<e> men's, trff<e> women's.
import sys, json, io, base64, os, re
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, 'parts2')
OUT = os.path.join(HERE, '..', 'src', '73pb-tribalatlas.js')
SHEET = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
s_ = open(os.path.join(HERE, '..', 'src', '73p-parts2atlas.js')).read()
K = float(re.search(r'const P2A=\{k:([0-9.]+)', s_).group(1))
_m = re.search(r'"head0":\{"w":([0-9.]+),"h":([0-9.]+),"a":(\{[^}]*\})', s_); HEAD0W, HEAD0H, HEAD0A = float(_m.group(1)), float(_m.group(2)), json.loads(_m.group(3))

# ---- the human heads, cut exactly as assets/make-parts2-atlas.py does (its cut functions) ----
_src = open(os.path.join(HERE, 'make-parts2-atlas.py')).read(); _ns = {}
exec(compile('import numpy as np\n' + _src[_src.index('def bands'):_src.index('def piece')], 'make-parts2-atlas.py', 'exec'), _ns)
cut = _ns['cut']; bands = _ns['bands']
def load(n): return np.array(Image.open(os.path.join(D, n)).convert('RGBA')).astype(np.float32)
med = lambda x: float(np.median(x))
HS0 = load('heads.webp'); hb0 = cut(HS0, [8])[0]
HMF = load('heads-mf.webp'); hmf = cut(HMF, [8, 8], 10)
sf = 170 * 1.18 / med([b[2] - b[0] for b in hb0]); sf = sf * med([b[3] - b[1] for b in hb0]) / med([b[3] - b[1] for b in hmf[0]])   # SU per heads-mf px
def crop(A, b): return A[b[1]:b[3], b[0]:b[2]].copy()
H0 = crop(HMF, hmf[0][0]); FH, FW = H0.shape[:2]   # the frame: head0's box in heads-mf px
assert abs(FW * sf - HEAD0W) < 1 and abs(FH * sf - HEAD0H) < 1, (FW * sf, HEAD0W, FH * sf, HEAD0H)

def shift(P, dx, dy, h=None, w=None):
    """P placed at (dx, dy) on an empty (h, w) canvas"""
    h = h or FH; w = w or FW; o = np.zeros((h, w, 4), np.float32); ph, pw = P.shape[:2]
    sx0, sy0, dx0, dy0 = max(0, -dx), max(0, -dy), max(0, dx), max(0, dy); ww = min(pw - sx0, w - dx0); hh = min(ph - sy0, h - dy0)
    if ww > 0 and hh > 0: o[dy0:dy0 + hh, dx0:dx0 + ww] = P[sy0:sy0 + hh, sx0:sx0 + ww]
    return o
def dil(m, n=1):
    for _ in range(n): m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return m
def ero(m, n=1): return ~dil(~m, n)
def dist_out(al):
    """per pixel of al: its 4-distance (px) to the outside (capped at 40)"""
    d = np.zeros(al.shape, np.int32); cur = al.copy()
    for i in range(40):
        d[cur] += 1; cur = ero(cur)
        if not cur.any(): break
    return d
def lum(P): return .3 * P[:, :, 0] + .59 * P[:, :, 1] + .11 * P[:, :, 2]
def ink(P): return (P[:, :, :3].max(2) < 70) & (P[:, :, 3] > 100)
def skinm(P):
    r, g, b = P[:, :, 0], P[:, :, 1], P[:, :, 2]
    return (P[:, :, 3] > 200) & (r > 180) & (g > r * .6) & (g < r * .86) & (b > r * .45) & (b < r * .72) & (r - b > 55)
def skin_est(P, m, rad=9):
    """the skin colour at every pixel: a box-filtered average of the skin pixels m nearby (normalised), widened until it covers"""
    out = np.zeros(P.shape[:2] + (3,), np.float32); have = np.zeros(P.shape[:2], bool)
    for r in (rad, rad * 2, rad * 4, rad * 8):
        acc = np.zeros(P.shape[:2] + (3,), np.float64); cnt = np.zeros(P.shape[:2], np.float64)
        ii = np.cumsum(np.cumsum(np.pad(P[:, :, :3] * m[:, :, None], ((1, 0), (1, 0), (0, 0))), 0), 1); ic = np.cumsum(np.cumsum(np.pad(m.astype(np.float64), ((1, 0), (1, 0))), 0), 1)
        h, w = m.shape; ys = np.arange(h); xs = np.arange(w); y0 = np.clip(ys - r, 0, h); y1 = np.clip(ys + r + 1, 0, h); x0 = np.clip(xs - r, 0, w); x1 = np.clip(xs + r + 1, 0, w)
        S = ii[y1][:, x1] - ii[y0][:, x1] - ii[y1][:, x0] + ii[y0][:, x0]; C = ic[y1][:, x1] - ic[y0][:, x1] - ic[y1][:, x0] + ic[y0][:, x0]
        ok = (C > 4) & ~have; out[ok] = (S[ok] / C[ok][:, None]); have |= ok
    return out
def nearest(m):
    """for every pixel the coordinates of the nearest m pixel (brushfire, 8-neighbour)"""
    h, w = m.shape; ny = np.full((h, w), -1, np.int32); nx = np.full((h, w), -1, np.int32); ys, xs = np.where(m); ny[ys, xs] = ys; nx[ys, xs] = xs; cur = m.copy()
    for _ in range(12):
        new = cur.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            sh = np.roll(np.roll(cur, dy, 0), dx, 1) & ~new; yy, xx = np.where(sh)
            ny[yy, xx] = ny[(yy - dy) % h, (xx - dx) % w]; nx[yy, xx] = nx[(yy - dy) % h, (xx - dx) % w]; new |= sh
        cur = new
    return ny, nx, cur

# ---- the human faces ----
AL0 = H0[:, :, 3] > 128
def reg_shift(P, ref=AL0, win=10):
    al = P[:, :, 3] > 128; best = None
    for dy in range(-win, win + 1):
        for dx in range(-win, win + 1):
            c = (shift(P, dx, dy)[:, :, 3] > 128) ^ ref; c = c.sum()
            if best is None or c < best[0]: best = (c, dx, dy)
    return best
SKIN_H = np.percentile(H0[skinm(H0)][:, :3], 85, axis=0)   # heads-mf's skin, light tone
RING_H = None
def comps4(m):
    h, w = m.shape; lab = -np.ones((h, w), np.int32); out = []
    for y in range(h):
        for x in np.where(m[y] & (lab[y] < 0))[0]:
            if lab[y, x] >= 0: continue
            st = [(y, x)]; lab[y, x] = len(out); n = 0
            while st:
                yy, xx = st.pop(); n += 1
                for y2, x2 in ((yy + 1, xx), (yy - 1, xx), (yy, xx + 1), (yy, xx - 1)):
                    if 0 <= y2 < h and 0 <= x2 < w and m[y2, x2] and lab[y2, x2] < 0: lab[y2, x2] = len(out); st.append((y2, x2))
            out.append(n)
    return lab, out
def face_of(P):
    """the face overlay (RGBA, unmixed from the skin) of a human head in its own (already registered) frame"""
    h, w = P.shape[:2]; al = P[:, :, 3] > 128; d = dist_out(al)
    # the outline ring's thickness: the ink run from the top edge down the middle columns
    th = int(np.median([np.argmax(~ink(P)[np.argmax(al[:, x]):, x]) for x in range(int(w * .35), int(w * .6))]))
    inner = al & (d > th + 2)
    yy, xx = np.mgrid[0:h, 0:w]
    zone = inner & (yy > h * .27) & ~((yy < h * .3) & (xx > w * .45)) & ~((xx < w * .32) & (yy > h * .52))   # not the crown's shine (upper right), not the ear
    sk = skinm(P) & inner; S = skin_est(P, sk)
    diff = np.abs(P[:, :, :3] - S).max(2)
    core = zone & (diff > 70); core = core & ~(ero(dil(core, 1), 1) ^ core) | core
    # holes inside the face marks (an eye white's or a mouth's inside, between lines) are face too
    reach = zone & (diff > 22); band = dil(core, 3) & reach & zone
    # specks (a cut's stray dots) dropped: core components under 30 px
    lab, cs = comps4(core); core = np.isin(lab, [j for j, n in enumerate(cs) if n >= 30])
    band &= dil(core, 3); fm = core | band
    # the pockets the face lines close (eye whites with their lid shadow, a mouth's inside): all face, solid
    lab, cs = comps4(inner & ~core); big = int(np.argmax(cs)); holes = (lab >= 0) & (lab != big) & np.isin(lab, [j for j, n in enumerate(cs) if n < 4000])
    ny, nx, got = nearest(core)
    F = np.zeros((h, w, 4), np.float32)
    ys, xs = np.where(fm); Fc = P[ny[ys, xs], nx[ys, xs], :3]; Sc = S[ys, xs]; p = P[ys, xs, :3]; v = Fc - Sc
    a = np.clip(((p - Sc) * v).sum(1) / np.maximum((v * v).sum(1), 1), 0, 1); a[core[ys, xs]] = 1
    F[ys, xs, :3] = np.where(a[:, None] > .999, p, Fc); F[ys, xs, 3] = a * 255 * (P[ys, xs, 3] / 255)
    F[holes, :3] = P[holes, :3]; F[holes, 3] = P[holes, 3]; return F, th
FACES = {}; HREG = {}
for sx, row in (('m', hmf[0]), ('f', hmf[1])):
    for e, b in enumerate(row):
        P = crop(HMF, b); c, dx, dy = reg_shift(P); HREG[(sx, e)] = (dx, dy)
        Pf = shift(P, dx, dy); F, th = face_of(Pf); FACES[(sx, e)] = F
        print('human %s%d: on head0 at %+d,%+d (mismatch %d px), ring %d px, face px %d' % (sx, e, dx, dy, c, th, (F[:, :, 3] > 128).sum()), file=sys.stderr)

# ---- the tribal heads ----
T = load('tribal-heads.webp'); MT = T[:, :, 3] > 24
rows = bands(MT.sum(1) > 0, 6); assert len(rows) == 2, rows
TB = []
for y0, y1 in rows:
    cs = bands(MT[y0:y1 + 1].sum(0) > 0, 2); assert len(cs) == 10, len(cs)
    for x0, x1 in cs:
        sub = MT[y0:y1 + 1, x0:x1 + 1]; ys = np.where(sub.any(1))[0]; TB.append([x0, y0 + ys[0], x1 + 1, y0 + ys[-1] + 1])
def skull_fit(al):
    """skull circle (cx, cy, r) from the left and top outline above the ear"""
    h, w = al.shape; pts = []
    for y in range(int(h * .06), int(h * .36)):
        xs = np.where(al[y])[0]
        if len(xs): pts.append((xs[0], y))
    for x in range(int(w * .3), int(w * .75)):
        ys = np.where(al[:, x])[0]
        if len(ys): pts.append((x, ys[0]))
    p_ = np.array(pts, float); x, y = p_[:, 0], p_[:, 1]; A_ = np.c_[2 * x, 2 * y, np.ones(len(x))]
    c = np.linalg.lstsq(A_, x * x + y * y, rcond=None)[0]; return c[0], c[1], np.sqrt(c[2] + c[0] ** 2 + c[1] ** 2)
def ear_c(al):
    """the ear: the silhouette's pixels left of and outside the skull circle, below its centre; their centroid"""
    cx, cy, r = skull_fit(al); h, w = al.shape; yy, xx = np.mgrid[0:h, 0:w]
    e = al & ((xx - cx) ** 2 + (yy - cy) ** 2 > (r + 2) ** 2) & (xx < cx - r * .4) & (yy > cy); ys, xs = np.where(e)
    return (xs.mean(), ys.mean()) if len(xs) else (0, 0)
EAR0 = ear_c(AL0)
def resample(P, s):
    im = Image.fromarray(np.clip(P, 0, 255).astype(np.uint8), 'RGBA').convert('RGBa'); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    return np.array(im.convert('RGBA')).astype(np.float32)
def reg_tribal(P):
    s0 = FH / P.shape[0]; best = None
    for s in np.arange(s0 * .94, s0 * 1.06, s0 * .01):
        Q = resample(P, s); al = Q[:, :, 3] > 128; qh, qw = al.shape; ex, ey = ear_c(al)
        for dy in range(-12 + (FH - qh) // 2, 13 + (FH - qh) // 2):
            for dx in range(-14 + (FW - qw) // 2, 15 + (FW - qw) // 2):
                m = shift(Q[:, :, 3:4].repeat(4, 2), dx, dy)[:, :, 3] > 128; xo = (m ^ AL0).sum(); ed = np.hypot(ex + dx - EAR0[0], ey + dy - EAR0[1])
                c = xo / 40. + ed * 2
                if best is None or c < best[0]: best = (c, s, dx, dy, xo, ed, (m & ~AL0).sum())
    return best
SKIN_T = None
def mark_mask(P):
    r, g, b = P[:, :, 0], P[:, :, 1], P[:, :, 2]
    return (P[:, :, 3] > 100) & (r > 90) & (g < r * .55) & (b < r * .45) & (r - g > 50)
TR = []
for i, b in enumerate(TB):
    P = crop(T, b); c, s, dx, dy, xo, ed, out = reg_tribal(P); Q = shift(resample(P, s), dx, dy)
    TR.append(Q); print('tribal %d: scale %.3f at %+d,%+d: silhouette mismatch %d px (%d outside head0), ear off %.1f px' % (i, s, dx, dy, xo, out, ed), file=sys.stderr)

MARK_C = None; meta = {}; items = []
def grey_of(P, m):
    l = lum(P); ref = max(1., float(np.percentile(l[m], 85))) if m.any() else 255.; v = np.clip(255 * l / ref, 0, 255)
    o = np.zeros(P.shape, np.float32); o[..., 0] = o[..., 1] = o[..., 2] = v; o[..., 3] = P[:, :, 3]; o[~m] = 0; return o
mk_cols = []
LAYERS = {}
for i, Q in enumerate(TR):
    al = Q[:, :, 3] > 128; d = dist_out(Q[:, :, 3] > 100); h, w = al.shape; yy, xx = np.mgrid[0:h, 0:w]
    sk = skinm(Q); mm = mark_mask(Q); S = skin_est(Q, sk & ~dil(mm, 1))
    # the marking: unmixed between the skin and the marking's own solid colour
    core = mm & ero(mm, 1) | mm & (np.abs(Q[:, :, :3] - S).max(2) > 90); MC = np.median(Q[core][:, :3], 0) if core.any() else np.array([140, 57, 33.]); mk_cols.append(MC)
    v = MC - S; a = np.clip(((Q[:, :, :3] - S) * v).sum(2) / np.maximum((v * v).sum(2), 1), 0, 1)
    resid = np.abs(Q[:, :, :3] - (S + a[:, :, None] * v)).max(2)
    near = dil(mm, 2) & (Q[:, :, 3] > 100) & ~ink(Q)
    ma = np.where(near & (resid < 40), a, 0); ma[mm & ~ink(Q)] = np.maximum(ma[mm & ~ink(Q)], .9)
    # the base: the marking's pixels filled with the skin round them
    base = Q.copy(); fill = ma > 0; base[fill, :3] = S[fill]
    # pixels mixing marking with outline: un-blend the marking towards skin
    skall = (skinm(base) | fill) & ~ink(base)
    # the skin brought to heads-mf's tone
    ref = np.percentile(base[skinm(base)][:, :3], 85, axis=0); base[skall, :3] = np.clip(base[skall, :3] * (SKIN_H / ref), 0, 255)
    mk = np.zeros_like(Q); mk[:, :, :3] = MC; mk[:, :, 3] = ma * Q[:, :, 3]
    mg = np.zeros_like(Q); mg[..., 0] = mg[..., 1] = mg[..., 2] = 255; mg[..., 3] = mk[..., 3]
    # the marking's own shading (its lum over the solid colour's), kept in the grey
    lm = lum(Q); sh = np.clip(255 * lm / max(1., float(.3 * MC[0] + .59 * MC[1] + .11 * MC[2])), 0, 255); sh[~core] = 255
    mg[..., 0] = mg[..., 1] = mg[..., 2] = sh
    ring = ink(Q) & (d <= 12) & ~((xx < w * .3) & (yy > h * .45) & (d > 6))   # the outer outline (not the ear's inner lines)
    o = Q.copy(); o[~dil(ring, 1)] = 0; o[dil(ring, 1) & ~ring, 3] *= .5
    LAYERS['trh%d' % i] = {'c': base, 's': grey_of(base, skall), 'p': mg, 'o': o}
MARK_RGB = np.median(np.array(mk_cols), 0)
print('marking colour (sheet) #%02x%02x%02x' % tuple(int(v) for v in MARK_RGB), file=sys.stderr)
for (sx, e), F in FACES.items(): LAYERS[('trf' if sx == 'm' else 'trff') + str(e)] = {'c': F}

# ---- anchors: head0's (the tribal heads are in its frame); the faces: the near eye's centre (its white's) and the mouth's ----
def eyes_of(F):
    """the face's centre: its solid pixels in the upper three quarters (the eyes and brows), and its eye whites' centre (or that again)"""
    h, w = F.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]; l = lum(F); sat = F[:, :, :3].max(2) - F[:, :, :3].min(2)
    m = (F[:, :, 3] > 160) & (yy < h * .7); ys, xs = np.where(m); c = (xs.mean(), ys.mean())
    wh = (F[:, :, 3] > 200) & (l > 200) & (sat < 45) & (yy < h * .7); ys, xs = np.where(wh)
    return c + ((xs.mean(), ys.mean()) if len(xs) > 30 else c)
for n, L in LAYERS.items():
    a = dict(HEAD0A); a['edx'] = 0.0; a['edy'] = 0.0
    if n.startswith('trf'):
        a = {}; fx, fy, ex, ey = eyes_of(L['c']); a['fcx'] = fx * sf; a['fcy'] = fy * sf; a['ewx'] = ex * sf; a['ewy'] = ey * sf
    meta[n] = {'w': round(FW * sf, 1), 'h': round(FH * sf, 1), 'a': {k_: round(float(v), 1) for k_, v in a.items()}, 'L': {}, 'k': 'trface' if n.startswith('trf') else 'trhead'}
    for m, arr in L.items():
        im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA'); bb = im.getbbox()
        if not bb: continue
        im = im.crop(bb); tw, th = max(1, round(im.width * sf * K)), max(1, round(im.height * sf * K))
        im = im.convert('RGBa').resize((tw, th), Image.LANCZOS).convert('RGBA')
        items.append((n, m, im, bb[0] * sf, bb[1] * sf, (bb[2] - bb[0]) * sf, (bb[3] - bb[1]) * sf))
items.sort(key=lambda q: -q[2].height)
AW = 1024; x = y = sh_ = 0; pos = []; hgt = 0
for q in items:
    tw, th = q[2].size
    if x + tw + 1 > AW: x = 0; y += sh_ + 1; sh_ = 0
    pos.append((x, y)); x += tw + 1; sh_ = max(sh_, th); hgt = max(hgt, y + sh_)
atl = Image.new('RGBA', (AW, hgt), (0, 0, 0, 0))
for q, (x, y) in zip(items, pos):
    atl.paste(q[2], (x, y)); meta[q[0]]['L'][q[1]] = [0, x, y, q[2].width, q[2].height, round(q[3], 1), round(q[4], 1), round(q[5], 1), round(q[6], 1)]
bio = io.BytesIO(); atl.save(bio, 'WEBP', quality=86, method=6, alpha_quality=95); src = 'data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode()
mc = '#%02x%02x%02x' % tuple(int(v) for v in MARK_RGB)
js = ('/* ================= TRIBAL HEADS ATLAS (generated by assets/make-tribal-atlas.py from assets/parts2/tribal-heads.webp and heads-mf.webp; do not edit) =================\n'
      '   trh0..19 the bald tribal heads (no face), each in head0\'s frame with head0\'s anchors: layers c (the head, its marking taken out), s (skin, grey\n'
      '   shade), p (the marking, grey shade: multiplied by the paint colour), o (the outer outline ring, drawn over the face). trf0..7 / trff0..7 the face\n'
      '   overlays lifted off the human heads (men / women, P2_FACE order), in the same frame: layer c, own colours, no skin. TRA.mark the sheet\'s paint.\n'
      '   Same record as P2A; merged into P2A below (its atlas appended to P2A.src). */\n'
      'const TRA={k:%s,mark:%s,p:%s,\n src:[%s]};\n'
      'if(typeof P2A===\'object\'){const o=P2A.src.length;P2A.src.push(...TRA.src);for(const n in TRA.p){const P=TRA.p[n];for(const m in P.L)P.L[m][0]+=o;P2A.p[n]=P}}\n') % (K, json.dumps(mc), json.dumps(meta, separators=(',', ':')), json.dumps(src))
open(OUT, 'w').write(js)
print('pieces', len(meta), 'atlas', atl.size, 'KB', round(len(src) * 3 / 4 / 1024), 'SU per px %.3f' % sf, 'mark', mc)
if SHEET:
    cw, ch = FW + 10, FH + 24; S = Image.new('RGBA', (10 * cw, 4 * ch), (215, 225, 218, 255)); dr = ImageDraw.Draw(S)
    for i in range(20):
        L = LAYERS['trh%d' % i]; im = Image.fromarray(np.clip(L['c'], 0, 255).astype(np.uint8)); mk = Image.fromarray(np.clip(L['p'] * np.array([MARK_RGB[0] / 255, MARK_RGB[1] / 255, MARK_RGB[2] / 255, 1]), 0, 255).astype(np.uint8))
        im.alpha_composite(mk); fc = Image.fromarray(np.clip(FACES[('m' if i < 10 else 'f', 0)], 0, 255).astype(np.uint8)); hm = np.array(im)[:, :, 3:4] / 255.; fa = np.array(fc).astype(np.float32); fa[:, :, 3:4] *= hm; im.alpha_composite(Image.fromarray(fa.astype(np.uint8))); im.alpha_composite(Image.fromarray(np.clip(L['o'], 0, 255).astype(np.uint8)))
        S.alpha_composite(im, ((i % 10) * cw + 5, (i // 10) * ch + 4)); dr.text(((i % 10) * cw + 6, (i // 10) * ch + FH + 6), 'trh%d' % i, fill=(0, 0, 0))
    for j, (k_, F) in enumerate(FACES.items()):
        S.alpha_composite(Image.fromarray(np.clip(F, 0, 255).astype(np.uint8)), ((j % 8) * cw + 5, (2 + j // 8) * ch + 4)); dr.text(((j % 8) * cw + 6, (2 + j // 8) * ch + FH + 6), '%s%d' % k_, fill=(0, 0, 0))
    S.save(SHEET)

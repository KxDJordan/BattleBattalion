# Cuts the user's half-orc sheet (assets/parts2/halforc-heads.webp: row 1 eight bald half-orc heads, one per expression; row 2 ten
# hairstyles drawn to sit on them, each with the head's ear drawn in as a placement cue) into src/73pa-halforcatlas.js (HOA), merged into
# P2A at load (the pieces orch0..7 and ohair0..9, its atlas image appended to P2A.src). Run: python3 assets/make-halforc-atlas.py [--sheet out.png]
# Pieces are cut by alpha (8-connected components; specks join the piece whose box they touch, others are dropped), scaled so the bald
# head stands as tall as the human head (P2A head0, 204 SU: the approved figure proportions), the hair at the same scale (same sheet).
# Layers (as make-parts2-atlas.py): heads c (own colours) + s (the olive skin alone as grey shade, multiplied by the merc's skin tone);
# hair h (grey shade with the black outline, multiplied by the hair colour), s (its drawn ear, recoloured like the head's skin: the hair's
# sideburn passes behind the ear, so the ear must be drawn over it; it lands exactly on the head's ear, so no double ear), c (the light
# hair ties, kept in their own colour). Anchors: the head's as make-parts2-atlas.py (cx, cy, r, nx, ny, sx0, sx1, eyb, ex, ey, etx, ety)
# plus edx, edy (its ear relative to orch0's); a hair's fx, fy (its top-left from orch0's top-left, SU) found by registering its drawn ear
# on orch0's ear (translation minimising the colour difference over the ear's pixels), fs 1.
import sys, json, io, base64, os, re
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'parts2', 'halforc-heads.webp')
OUT = os.path.join(HERE, '..', 'src', '73pa-halforcatlas.js')
SHEET = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
s_ = open(os.path.join(HERE, '..', 'src', '73p-parts2atlas.js')).read()
K = float(re.search(r'const P2A=\{k:([0-9.]+)', s_).group(1))
HEAD_H = float(re.search(r'"head0":\{"w":[0-9.]+,"h":([0-9.]+)', s_).group(1))

A = np.array(Image.open(SRC).convert('RGBA')); H_, W_ = A.shape[:2]; M = A[:, :, 3] > 24

def components(m):
    h, w = m.shape; lab = -np.ones((h, w), np.int32); out = []
    for y in range(h):
        for x in np.where(m[y] & (lab[y] < 0))[0]:
            if lab[y, x] >= 0: continue
            st = [(y, x)]; lab[y, x] = len(out); n = 0; x0 = x1 = x; y0 = y1 = y
            while st:
                yy, xx = st.pop(); n += 1; x0 = min(x0, xx); x1 = max(x1, xx); y0 = min(y0, yy); y1 = max(y1, yy)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        Y, X = yy + dy, xx + dx
                        if 0 <= Y < h and 0 <= X < w and m[Y, X] and lab[Y, X] < 0: lab[Y, X] = len(out); st.append((Y, X))
            out.append([n, x0, y0, x1 + 1, y1 + 1])
    return lab, out

lab, comps = components(M)
big = [i for i, c in enumerate(comps) if c[0] >= 2000]
heads = sorted([i for i in big if comps[i][2] < H_ * .35], key=lambda i: comps[i][1])
hairs = sorted([i for i in big if comps[i][2] >= H_ * .35], key=lambda i: comps[i][1])
assert len(heads) == 8 and len(hairs) == 10, (len(heads), len(hairs))
own = {i: [i] for i in heads + hairs}
for j, c in enumerate(comps):   # specks: to the piece whose box (+4 px) holds them, else dropped (stray marks between the pieces)
    if j in own: continue
    for i in heads + hairs:
        b = comps[i]
        if c[1] >= b[1] - 4 and c[3] <= b[3] + 4 and c[2] >= b[2] - 4 and c[4] <= b[4] + 4: own[i].append(j); break

def cut(i):
    m = np.isin(lab, own[i]); ys, xs = np.where(m); x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    P = A[y0:y1, x0:x1].astype(np.float32).copy(); mm = m[y0:y1, x0:x1]
    # faint edge pixels (alpha <= 24, not in a component) next to the piece stay
    grow = mm.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): grow |= np.roll(np.roll(mm, dy, 0), dx, 1)
    P[~grow] = 0; return P, (x0, y0, x1, y1)

sf = HEAD_H / float(np.median([comps[i][4] - comps[i][2] for i in heads]))   # SU per sheet px

def skin_mask(P):
    r, g, b, al = P[:, :, 0], P[:, :, 1], P[:, :, 2], P[:, :, 3]
    return (al > 0) & (r > 70) & (r < 200) & (g >= r * .88) & (g <= r * 1.04) & (b < r * .73) & (b > r * .4)   # olive (the ties are paler and pinker: b > .7 r or g < .88 r)

def tie_mask(P):
    r, g, b, al = P[:, :, 0], P[:, :, 1], P[:, :, 2], P[:, :, 3]
    return (al > 0) & (r > 150) & (g > r * .75) & (b > r * .6) & (b < g) & ~skin_mask(P)

def ink(P): return (P[:, :, :3].max(2) < 62) & (P[:, :, 3] > 0)

def biggest(m, score):
    """the 4-connected component of m with the lowest score(points)"""
    h, w = m.shape; lb = -np.ones((h, w), np.int32); best = None
    for y in range(h):
        for x in np.where(m[y] & (lb[y] < 0))[0]:
            if lb[y, x] >= 0: continue
            st = [(y, x)]; lb[y, x] = 1; pts = []
            while st:
                yy, xx = st.pop(); pts.append((yy, xx))
                for y2, x2 in ((yy + 1, xx), (yy - 1, xx), (yy, xx + 1), (yy, xx - 1)):
                    if 0 <= y2 < h and 0 <= x2 < w and m[y2, x2] and lb[y2, x2] < 0: lb[y2, x2] = 1; st.append((y2, x2))
            if len(pts) >= 30 and (best is None or score(pts) < score(best)): best = pts
    o = np.zeros_like(m)
    if best: ys, xs = zip(*best); o[list(ys), list(xs)] = True
    return o

def hair_ear(P):
    """the drawn ear: the sizeable olive blob nearest the piece's lower left"""
    h, w = P.shape[:2]
    return biggest(skin_mask(P), lambda p: (np.mean([q[1] for q in p]) / w) ** 2 + (np.mean([q[0] for q in p]) / h - .8) ** 2)

def head_ear(P):
    """the head's ear: its olive pixels left of the skull (left 30% of the piece, below the top third)"""
    h, w = P.shape[:2]; m = skin_mask(P); m[:int(h * .3)] = False; m[:, int(w * .3):] = False; return m

def grey(P, m, keep_ol):
    lum = .3 * P[:, :, 0] + .59 * P[:, :, 1] + .11 * P[:, :, 2]; ol = ink(P)
    ref = max(1., float(np.percentile(lum[m], 85))); v = np.clip(255 * lum / ref, 0, 255)
    if keep_ol: v[ol] = np.minimum(v[ol], lum[ol])
    o = np.zeros(P.shape, np.float32); o[..., 0] = o[..., 1] = o[..., 2] = v; o[..., 3] = P[:, :, 3]; o[~(m | (ol if keep_ol else m))] = 0; return o

PIECES = []
for k, i in enumerate(heads):
    P, box = cut(i); PIECES.append(('orch%d' % k, 'head', P, box))
for k, i in enumerate(hairs):
    P, box = cut(i); PIECES.append(('ohair%d' % k, 'hair', P, box))

def head_anchors(P, s):
    al = P[:, :, 3] > 40; h, w = al.shape; Aa = {}
    def span(y):
        xs = np.where(al[min(h - 1, max(0, int(y)))])[0]; return (xs[0], xs[-1]) if len(xs) else (0, w - 1)
    q0, q1 = span(h * .3)   # the skull's back and front edges (above the ear)
    Aa['cx'] = (q0 + q1) / 2 * s; Aa['cy'] = h * .5 * s; Aa['r'] = (q1 - q0) / 2 * s; Aa['nx'] = (q0 + q1) / 2 * s + 4; Aa['ny'] = (h - 4) * s; Aa['top'] = 0
    q0, q1 = span(h * .36); Aa['sx0'] = q0 * s; Aa['sx1'] = q1 * s
    lum = .3 * P[:, :, 0] + .59 * P[:, :, 1] + .11 * P[:, :, 2]; sat = P[:, :, :3].max(2) - P[:, :, :3].min(2)
    wh = al & (lum > 215) & (sat < 40); wh[:int(h * .3)] = False; wh[int(h * .8):] = False; wh[:, :int(w * .4)] = False; ys = np.where(wh.sum(1) > 2)[0]
    Aa['eyb'] = float(ys[-1] if len(ys) else int(h * .66)) * s   # the bottom of the eyes (shield wall: the shield's top sits just below)
    e = head_ear(P); ys, xs = np.where(e)
    Aa['ex'] = float(xs.mean()) * s; Aa['ey'] = float(ys.mean()) * s; Aa['etx'] = float(xs.mean()) * s; Aa['ety'] = float(ys.min()) * s
    Aa['tipx'] = float(np.where(al.any(0))[0][0]) * s
    return Aa

def ear_match(Ec, mc, T, win):
    """translation (tx, ty) of a cropped ear (Ec colours, mc mask) on the piece T minimising the colour difference; win = (x0, x1, y0, y1) search"""
    best = None; eh, ew = mc.shape
    for ty in range(win[2], win[3]):
        for tx in range(win[0], win[1]):
            if ty < 0 or tx < 0 or ty + eh > T.shape[0] or tx + ew > T.shape[1]: continue
            Wd = T[ty:ty + eh, tx:tx + ew]; ok = Wd[:, :, 3] > 128
            d = np.abs(Wd[:, :, :3] - Ec[:, :, :3]).sum(2); c = (d[mc & ok].sum() + 600 * (mc & ~ok).sum()) / mc.sum()
            if best is None or c < best[0]: best = (c, tx, ty)
    return best

H0 = PIECES[0][2]; meta = {}; ANC = {}
def fitc(pts):
    p_ = np.array(pts, float); x, y = p_[:, 0], p_[:, 1]; A_ = np.c_[2 * x, 2 * y, np.ones(len(x))]
    c = np.linalg.lstsq(A_, x * x + y * y, rcond=None)[0]; return c[0], c[1], np.sqrt(c[2] + c[0] ** 2 + c[1] ** 2)
def skull(P):
    """the skull circle (cx, cy, r, sheet px) fitted to the head's outline above the ear (left and top edges)"""
    al = P[:, :, 3] > 100; h, w = al.shape; pts = []
    for y in range(int(h * .06), int(h * .36)): xs = np.where(al[y])[0]; pts.append((xs[0], y))
    for x in range(int(w * .3), int(w * .75)): ys = np.where(al[:, x])[0]; pts.append((x, ys[0]))
    return fitc(pts)
# orch0's ear (piece px, read off the sheet): the tip, along its top outline to where that line ends in the cheek, down past the
# concha to the jaw, back along the outer outline. The right side (inside the face) fades over EARF px: drawn over the hair at run time,
# the ear's skin blends into the sideburn instead of ending in a hard edge.
EARPOLY = [(0, 66), (22, 69), (42, 75), (60, 85), (65, 96), (64, 112), (63, 127), (40, 134), (24, 131), (0, 86)]; EARF = 7
def ear_of_head(P, dx=0, dy=0):
    h, w = P.shape[:2]; m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon([(x + dx, y + dy) for x, y in EARPOLY], fill=255)
    m = np.array(m) > 0; return m & (P[:, :, 3] > 0)
def ear_alpha(P):
    """the ear mask as alpha (0..1): 1 inside, fading out towards its right (face) side"""
    m = ear_of_head(P).astype(np.float32); h, w = m.shape; xr = max(x for x, y in EARPOLY); xs = np.arange(w)[None, :]
    return m * np.clip((xr - xs) / EARF, 0, 1)
EAR0 = ear_of_head(H0); CX0, CY0, R0_ = skull(H0)
ey_, ex_ = np.where(EAR0 & skin_mask(H0)); EARC = (ex_.mean(), ey_.mean())   # the head's ear centre (its skin)
yy0, xx0 = np.mgrid[0:H0.shape[0], 0:H0.shape[1]]; alH = H0[:, :, 3] > 100
SCALP = alH & ((xx0 - CX0) ** 2 + (yy0 - CY0) ** 2 < R0_ ** 2) & (yy0 < CY0 - R0_ * .3)   # the crown above the brows
lumH = .3 * H0[:, :, 0] + .59 * H0[:, :, 1] + .11 * H0[:, :, 2]; satH = H0[:, :, :3].max(2) - H0[:, :, :3].min(2)
EYES = alH & (lumH > 200) & (satH < 45) & (xx0 > H0.shape[1] * .45) & (yy0 > H0.shape[0] * .3) & (yy0 < H0.shape[0] * .75)
def fit_hair(P, e):
    """the hair's place on orch0 (sheet px, scale): its drawn ear on the head's ear (the cue, 1 per px off), the crown covered (150 x the
    fraction left bare), the eyes clear (40 x the fraction covered)"""
    best = None; hh, hw = H0.shape[:2]
    for S in (.96, 1.0, 1.04, 1.08, 1.12, 1.16, 1.2):
        im = Image.fromarray(np.clip(P, 0, 255).astype(np.uint8), 'RGBA'); im = im.resize((round(im.width * S), round(im.height * S)), Image.LANCZOS)
        hal = (np.array(im)[:, :, 3] > 100); em = np.array(Image.fromarray((e * 255).astype(np.uint8)).resize(im.size)) > 127; hal &= ~em
        ys, xs = np.where(em); ec = (xs.mean(), ys.mean()); rh, rw = hal.shape
        for ty in range(-int(rh * .6), int(hh * .4), 2):
            for tx in range(-int(rw * .4), int(hw * .4), 2):
                d = np.hypot(ec[0] + tx - EARC[0], ec[1] + ty - EARC[1])
                if d > 40: continue
                cov = np.zeros_like(alH); sx0, sy0, dx0, dy0 = max(0, -tx), max(0, -ty), max(0, tx), max(0, ty); w_ = min(rw - sx0, hw - dx0); h_ = min(rh - sy0, hh - dy0)
                if w_ > 0 and h_ > 0: cov[dy0:dy0 + h_, dx0:dx0 + w_] = hal[sy0:sy0 + h_, sx0:sx0 + w_]
                unc = (SCALP & ~cov).sum() / SCALP.sum(); ec_ = (EYES & cov).sum() / max(1, EYES.sum())
                c = d + 150 * unc + 40 * ec_ + 40 * abs(S - 1)
                if best is None or c < best[0]: best = (c, tx, ty, S, d, unc, ec_)
    return best
for name, kind, P, box in PIECES:
    if kind == 'head':
        a = head_anchors(P, sf); E = ear_of_head(P); ys, xs = np.where(E & skin_mask(P))
        a['edx'] = (xs.mean() - EARC[0]) * sf; a['edy'] = (ys.mean() - EARC[1]) * sf; ANC[name] = a   # its ear relative to orch0's
        print(name, 'ear vs orch0 %+.1f,%+.1f px' % (xs.mean() - EARC[0], ys.mean() - EARC[1]), file=sys.stderr)
    else:
        e = hair_ear(P); ties = tie_mask(P)
        # the drawn ear is only the cue: it is cut out of the hair (the head's own ear is drawn over the hair at run time, piece oear), with
        # the part of its outline that borders no hair
        hairpx = (P[:, :, 3] > 0) & ~e & ~ink(P) & ~ties; near = hairpx.copy()
        for _ in range(4): near = near | np.roll(near, 1, 0) | np.roll(near, -1, 0) | np.roll(near, 1, 1) | np.roll(near, -1, 1)
        eg = e.copy()
        for _ in range(6): eg = eg | np.roll(eg, 1, 0) | np.roll(eg, -1, 0) | np.roll(eg, 1, 1) | np.roll(eg, -1, 1)
        cutm = e | (eg & ink(P) & ~near) | (eg & (P[:, :, 3] < 200) & ~near)
        Q = P.copy(); Q[cutm] = 0
        b = fit_hair(P, e); S = b[3]
        hl = (Q[:, :, 3] > 0) & ~ink(Q) & ~ties
        a = {'fx': round(float(b[1] * sf), 1), 'fy': round(float(b[2] * sf), 1), 'fs': round(float(S), 3)}
        al = Q[:, :, 3] > 40; a['btop'] = float(np.where(al.any(1))[0][0]) * sf; xs_ = np.where(al[:int(al.shape[0] * .3)].any(0))[0]; a['bcx'] = (xs_[0] + xs_[-1]) / 2 * sf; a['bw'] = (xs_[-1] - xs_[0]) * sf
        ANC[name] = a; ANC[name + '_m'] = (Q, hl, ties)
        print(name, 'on orch0 at %d,%d x%.2f: ear off %.1f px, crown bare %.2f, eyes covered %.2f; ties px %d' % (b[1], b[2], S, b[4], b[5], b[6], ties.sum()), file=sys.stderr)
# the head's ear, drawn over the hair (from orch0; each head's edx / edy moves it)
EA = ear_alpha(H0); OE = H0.copy(); OE[:, :, 3] *= EA; PIECES.append(('oear', 'ear', OE, None))
ANC['oear'] = {'ox': 0.0, 'oy': 0.0}

items = []
for name, kind, P, box in PIECES:
    h0, w0 = P.shape[:2]; L = {}
    if kind in ('head', 'ear'):
        L['c'] = P.copy(); sk = skin_mask(P) & ~ink(P); L['s'] = grey(P, sk, False)
    else:
        Q, hl, ties = ANC.pop(name + '_m')
        L['h'] = grey(Q, hl, True)
        if ties.any(): c = Q.copy(); c[~ties] = 0; L['c'] = c
    meta[name] = {'w': round(w0 * sf, 1), 'h': round(h0 * sf, 1), 'a': {k_: round(float(v), 1) for k_, v in ANC[name].items()}, 'L': {}, 'k': {'head': 'ohead', 'ear': 'oear'}.get(kind, 'ohair')}
    for m, arr in L.items():
        im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA'); bb = im.getbbox()
        if not bb: continue
        im = im.crop(bb); tw, th = max(1, round(im.width * sf * K)), max(1, round(im.height * sf * K))
        im = im.convert('RGBa').resize((tw, th), Image.LANCZOS).convert('RGBA')
        items.append((name, m, im, bb[0] * sf, bb[1] * sf, (bb[2] - bb[0]) * sf, (bb[3] - bb[1]) * sf))
items.sort(key=lambda q: -q[2].height)
AW = 1024; x = y = sh = 0; pos = []; hgt = 0
for q in items:
    tw, th = q[2].size
    if x + tw + 1 > AW: x = 0; y += sh + 1; sh = 0
    pos.append((x, y)); x += tw + 1; sh = max(sh, th); hgt = max(hgt, y + sh)
atl = Image.new('RGBA', (AW, hgt), (0, 0, 0, 0))
for q, (x, y) in zip(items, pos):
    atl.paste(q[2], (x, y)); meta[q[0]]['L'][q[1]] = [0, x, y, q[2].width, q[2].height, round(q[3], 1), round(q[4], 1), round(q[5], 1), round(q[6], 1)]
b = io.BytesIO(); atl.save(b, 'WEBP', quality=82, method=6, alpha_quality=90); src = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
js = ('/* ================= HALF-ORC HEADS ATLAS (generated by assets/make-halforc-atlas.py from assets/parts2/halforc-heads.webp; do not edit) =================\n'
      '   orch0..7 the bald half-orc heads (neutral, gritted, shouting, happy, content, surprised, nervous, knocked out: P2_FACE order), ohair0..9 the\n'
      '   half-orc hairstyles (73q-parts2.js P2_OHAIR). Same record as P2A (w, h SU; a anchors; L layers [atlas, ax,ay,aw,ah, ox,oy,ow,oh]): heads c + s\n'
      '   (skin grey shade), hair h (grey shade with outline) + s (its drawn ear, skin) + c (ties). Merged into P2A below (its atlas appended to P2A.src). */\n'
      'const HOA={k:%s,p:%s,\n src:[%s]};\n'
      'if(typeof P2A===\'object\'){const o=P2A.src.length;P2A.src.push(...HOA.src);for(const n in HOA.p){const P=HOA.p[n];for(const m in P.L)P.L[m][0]+=o;P2A.p[n]=P}}\n') % (K, json.dumps(meta, separators=(',', ':')), json.dumps(src))
open(OUT, 'w').write(js)
print('pieces', len(meta), 'atlas', atl.size, 'KB', round(len(src) * 3 / 4 / 1024), 'SU per px %.3f' % sf)
if SHEET:
    S = Image.new('RGBA', (10 * 150, 2 * 170), (215, 225, 218, 255)); d = ImageDraw.Draw(S)
    for i, (name, kind, P, box) in enumerate(PIECES):
        im = Image.fromarray(P.astype(np.uint8), 'RGBA'); cx, cy = (i % 10) * 150 if i < 8 else ((i - 8) % 10) * 150, 0 if i < 8 else 170
        S.alpha_composite(im, (cx + 5, cy + 5)); d.text((cx + 4, cy + 154), name, fill=(0, 0, 0))
    S.save(SHEET)

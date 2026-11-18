#!/usr/bin/env python3
"""Cut the user's Ogre sheet (assets/foes/ogre.webp) into the pieces of the ogre rig and pack them.

  python3 -I assets/make-ogre-atlas.py

Writes
  assets/foes/ogre_tex.png   the DragonBones texture atlas (full sheet resolution)
  assets/foes/ogre_tex.json  its DragonBones 5.5 TextureAtlas data
  src/76c-ogreatlas.js       OGA: the same atlas as a webp data URL at half size, the piece rects and the rig's anchors
                             (the in-game player 76d-ogre.js reads it; assets/make-ogre-db.js writes ogre_ske.json from both)

The sheet: row 1 the compiled figure (the reference for the setup pose), row 2 three heads (neutral, angry snarl, grin),
row 3 right upper arm, right forearm + fist, torso, left upper arm, left forearm + fist, row 4 right leg, left leg, club.
The background is transparent already; lossy noise (alpha < 12) is cleared, nearly opaque pixels made opaque, and each
piece is cut by its connected component so a neighbour's stray pixels never come along.
Two pieces are painted here for the back three-quarter view (there is no back art): head_back (the neutral head with
brows, eyes, nose, tusks and mouth painted over with skin by diffusion, the scalp spots and the ear kept) and torso_back
(the torso with its front buckle painted over with the belt beside it). No randomness: the output is the same every run.
"""
import base64, io, json, os, sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'foes', 'ogre.webp')
K_GAME = 0.5          # the in-game atlas: px per sheet px

im = np.array(Image.open(SRC).convert('RGBA')).astype(np.float64)
a = im[..., 3]
a[a < 12] = 0
a[a > 240] = 255
H, W = a.shape

# ---- connected components of the opaque area (4-neighbour flood fill)
mask = a > 40
lab = np.zeros((H, W), np.int32)
comps = []
for y in range(H):
    row = mask[y]
    for x in np.nonzero(row & (lab[y] == 0))[0]:
        if lab[y, x]:
            continue
        n = len(comps) + 1
        q = deque([(y, x)]); lab[y, x] = n; ys = []; xs = []
        while q:
            cy, cx = q.popleft(); ys.append(cy); xs.append(cx)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
        comps.append((n, len(ys), min(xs), min(ys), max(xs), max(ys)))
big = [c for c in comps if c[1] > 2000]

def comp_at(px, py):
    for c in big:
        if c[2] <= px <= c[4] and c[3] <= py <= c[5]:
            return c
    raise SystemExit('no piece at %d,%d' % (px, py))

# each piece by a point inside its box on the sheet
WHERE = {'ref': (520, 260), 'head_neutral': (200, 670), 'head_angry': (540, 670), 'head_grin': (880, 670),
         'upper_r': (120, 940), 'fore_r': (290, 980), 'torso': (540, 970), 'upper_l': (790, 950), 'fore_l': (980, 980),
         'leg_r': (277, 1230), 'leg_l': (497, 1230), 'club': (846, 1227)}

def cut(name, pad=2):
    c = comp_at(*WHERE[name]); n, _, x0, y0, x1, y1 = c
    # the component grown by 2 px keeps its soft (alpha < 40) edge
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
    sub = im[y0:y1 + 1, x0:x1 + 1].copy(); L = lab[y0:y1 + 1, x0:x1 + 1]
    own = L == n
    grow = own.copy()
    for _ in range(pad):
        g2 = grow.copy(); g2[1:] |= grow[:-1]; g2[:-1] |= grow[1:]; g2[:, 1:] |= grow[:, :-1]; g2[:, :-1] |= grow[:, 1:]; grow = g2
    keep = grow & ((L == n) | (L == 0))
    sub[~keep, 3] = 0
    sub[sub[..., 3] == 0, :3] = 0
    return sub, (x0, y0)

P = {n: cut(n) for n in WHERE}

# ---- the three heads share one frame: the angry and grin heads are shifted onto the neutral one (masked difference
# over the skull, which is the same painting in all three)
def align(src, ref):
    A = src[..., :3]; Ma = src[..., 3] > 250
    R = ref[..., :3]; Mr = ref[..., 3] > 250
    h = min(A.shape[0], R.shape[0]); best = (1e18, 0, 0)
    for dy in range(-12, 13):
        for dx in range(-12, 13):
            # compare the top 45 % (skull and ear) only
            ys = slice(max(0, dy), int(h * .45)); yr = slice(max(0, dy) - dy, int(h * .45) - dy)
            xa0 = max(0, dx); xa1 = min(A.shape[1], R.shape[1] + dx)
            xs = slice(xa0, xa1); xr = slice(xa0 - dx, xa1 - dx)
            m = Ma[ys, xs] & Mr[yr, xr]
            if m.sum() < 1000:
                continue
            d = np.abs(A[ys, xs] - R[yr, xr]).sum(-1)
            s = (d * m).sum() / m.sum() + 40 * (Ma[ys, xs] ^ Mr[yr, xr]).mean()
            if s < best[0]:
                best = (s, dx, dy)
    return best[1], best[2]

hn = P['head_neutral'][0]
HEAD_OFF = {'head_neutral': (0, 0)}
for n in ('head_angry', 'head_grin'):
    dx, dy = align(P[n][0], hn)
    HEAD_OFF[n] = (-dx, -dy)       # the piece's top left in the neutral head's px

# ---- painting over by diffusion: masked pixels relax to the average of their neighbours (the edges hold)
def diffuse(img, m, it=900):
    out = img.copy()
    rgb = out[..., :3]
    known = ~m
    # start from the mean of the known ring
    ring = m.copy(); ring[1:] |= m[:-1]; ring[:-1] |= m[1:]; ring[:, 1:] |= m[:, :-1]; ring[:, :-1] |= m[:, 1:]
    ring &= known
    rgb[m] = rgb[ring].mean(0)
    for _ in range(it):
        s = np.zeros_like(rgb); c = np.zeros(rgb.shape[:2])
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(rgb, dy, 0), dx, 1); ok = np.roll(np.roll(out[..., 3] > 200, dy, 0), dx, 1)
            s += sh * ok[..., None]; c += ok
        avg = s / np.maximum(c, 1)[..., None]
        rgb[m] = avg[m]
    out[..., :3] = rgb
    return out

def dilate(m, r):
    for _ in range(r):
        g = m.copy(); g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]; m = g
    return m

def erode(m, r):
    return ~dilate(~m, r)

# head_back: a new back of the skull. Silhouette: the neutral head without its ear, made convex and rounded (the brow, nose
# and tusk bumps go), plus the ear as painted. Fill: the skin's tone shaded from the top left, the scalp and its spots copied
# from the neutral head (feathered), and the sheet's ink outline (7 px) round it.
def blur(m, r):
    o = m.astype(np.float64)
    for _ in range(r):
        o = (o + np.roll(o, 1, 0) + np.roll(o, -1, 0) + np.roll(o, 1, 1) + np.roll(o, -1, 1)) / 5
    return o

def hull_mask(m):
    ys, xs = np.nonzero(m); pts = sorted(set(zip(xs.tolist(), ys.tolist())))
    def cross(o, a_, b_): return (a_[0] - o[0]) * (b_[1] - o[1]) - (a_[1] - o[1]) * (b_[0] - o[0])
    lo = []; up = []
    for p_ in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p_) <= 0: lo.pop()
        lo.append(p_)
    for p_ in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p_) <= 0: up.pop()
        up.append(p_)
    poly = lo[:-1] + up[:-1]
    from PIL import ImageDraw
    I = Image.new('L', (m.shape[1], m.shape[0]), 0); ImageDraw.Draw(I).polygon(poly, fill=255)
    return np.array(I) > 0

op = hn[..., 3] > 128
yy, xx = np.mgrid[0:hn.shape[0], 0:hn.shape[1]]
EAR_X = 116
skull = hull_mask(op & (xx >= EAR_X - 8))
# pull the face side in a little (no nose or tusks behind it) and round it
cx = 186; skull &= ~((xx > cx) & (((xx - cx) / 100.0) ** 2 + ((yy - 128) / 124.0) ** 2 > 1))
skull = blur(skull, 40) > .5
ear = op & (xx < EAR_X)
sil = skull | ear
rgb = hn[..., :3]; r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
skin = (r_ > 175) & (r_ - g_ > 40) & (g_ > 105) & erode(op, 12)
tone = np.median(rgb[skin], 0)
# shade: light from the top left
d = ((xx - 140) * .55 + (yy - 70)) / 220.0
sh = np.clip(d, -.6, 1)
fill = tone[None, None, :] * (1 - .18 * sh)[..., None] + np.array([255, 235, 215]) * np.clip(-sh, 0, 1)[..., None] * .18
hb = np.zeros_like(hn); hb[..., :3] = fill; hb[..., 3] = 255
# the scalp (top left, with its spots) and the ear as painted, feathered into the fill
keep = ((xx < 230) & (yy < 66)) | ((xx < 150) & (yy < 80)) | ear | ((xx < EAR_X + 6) & (yy < 215))
kf = np.clip(blur(keep & op & erode(op, 9) | ear, 6), 0, 1)
hb[..., :3] = hn[..., :3] * kf[..., None] + hb[..., :3] * (1 - kf[..., None])
ink = np.array([38, 24, 20])
# outline: the band within 7 px of the silhouette's edge (anti-aliased), the ear keeps its own
inner7 = erode(sil, 7)
band = np.clip(1 - blur(inner7, 2) * 1.0, 0, 1)
band = np.where(ear & ~dilate(skull, 2), 0, band)
hb[..., :3] = hb[..., :3] * (1 - band[..., None]) + ink * band[..., None]
al = np.clip(blur(sil, 1) * 255 * 1.6, 0, 255)
al = np.where(ear & ~skull, hn[..., 3], al)
hb[..., 3] = al
hb[hb[..., 3] < 8] = 0
# torso_back: the front buckle painted over with the belt beside it (each column a blend of the columns just left and
# right of the buckle, so the belt's slope carries through); the strap ring stays (straps cross behind as well)
tb = P['torso'][0].copy()
bx0, by0, bx1, by1 = 126, 130, 204, 204      # the buckle (torso cut px)
cl = tb[by0:by1, bx0 - 3].copy(); crr = tb[by0:by1, bx1 + 3].copy()
for x_ in range(bx0, bx1):
    t_ = (x_ - bx0) / float(bx1 - bx0)
    tb[by0:by1, x_] = cl * (1 - t_) + crr * t_

# ---- the pieces and their anchors (piece px from the cut's top left, sheet resolution):
#   pv  the pivot (shoulder, elbow, hip, neck, waist: where the piece turns)
#   ax  a second point on the piece's axis (elbow end, fist, foot): with pv it gives the piece's rest angle
#   gp  the club's grip, tp its tip;  nk  the torso's neck, sn / sf near / far shoulder, hn / hf near / far hip
pieces = {
    'head_neutral': P['head_neutral'][0], 'head_angry': P['head_angry'][0], 'head_grin': P['head_grin'][0], 'head_back': hb,
    'torso': P['torso'][0], 'torso_back': tb,
    'upper_r': P['upper_r'][0], 'fore_r': P['fore_r'][0], 'upper_l': P['upper_l'][0], 'fore_l': P['fore_l'][0],
    'leg_r': P['leg_r'][0], 'leg_l': P['leg_l'][0], 'club': P['club'][0],
}
A = {
    'head': {'pv': [162, 232]},
    'torso': {'pv': [142, 182], 'nk': [134, 44], 'sn': [62, 66], 'sf': [222, 74], 'hn': [86, 196], 'hf': [196, 196]},
    'upper_r': {'pv': [84, 50], 'ax': [52, 140]},
    'fore_r': {'pv': [76, 38], 'ax': [60, 166]},
    'upper_l': {'pv': [64, 50], 'ax': [104, 142]},
    'fore_l': {'pv': [58, 38], 'ax': [66, 156]},
    'leg_r': {'pv': [64, 24], 'ax': [64, 178]},
    'leg_l': {'pv': [68, 24], 'ax': [68, 178]},
    'club': {'pv': [88, 186], 'ax': [362, 80]},
}

def trim(img):
    al = img[..., 3] > 0
    ys, xs = np.nonzero(al)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    return img[y0:y1 + 1, x0:x1 + 1], (int(x0), int(y0))

order = ['torso', 'torso_back', 'club', 'head_neutral', 'head_angry', 'head_grin', 'head_back',
         'upper_r', 'fore_r', 'upper_l', 'fore_l', 'leg_r', 'leg_l']
cut_pc = {}
for n in order:
    t, off = trim(pieces[n])
    cut_pc[n] = (t, off)

# shelf packing (sizes multiple of 2 so the half-size atlas lands on whole px)
PADP = 4
WMAX = 1024
x = y = 0; rowh = 0; rects = {}
for n in sorted(order, key=lambda n: -cut_pc[n][0].shape[0]):
    t = cut_pc[n][0]; w, h = t.shape[1] + PADP, t.shape[0] + PADP
    w += w & 1; h += h & 1
    if x + w > WMAX:
        x = 0; y += rowh; rowh = 0
    rects[n] = (x + PADP // 2, y + PADP // 2, t.shape[1], t.shape[0]); x += w; rowh = max(rowh, h)
AW_, AH_ = WMAX, y + rowh
AH_ += AH_ & 1
atlas = np.zeros((AH_, AW_, 4))
for n, (rx, ry, rw, rh) in rects.items():
    atlas[ry:ry + rh, rx:rx + rw] = cut_pc[n][0]
atlas = np.clip(atlas, 0, 255).astype(np.uint8)
# premultiplied-safe: colour under alpha 0 is black already
out_png = os.path.join(ROOT, 'assets', 'foes', 'ogre_tex.png')
Image.fromarray(atlas).save(out_png, optimize=True)

tex = {'name': 'ogre', 'imagePath': 'ogre_tex.png', 'width': AW_, 'height': AH_, 'SubTexture': []}
for n in order:
    rx, ry, rw, rh = rects[n]
    tex['SubTexture'].append({'name': n, 'x': rx, 'y': ry, 'width': rw, 'height': rh})
with open(os.path.join(ROOT, 'assets', 'foes', 'ogre_tex.json'), 'w') as f:
    json.dump(tex, f, indent=1)

# the in-game atlas: half size webp
half = Image.fromarray(atlas).resize((AW_ // 2, AH_ // 2), Image.LANCZOS)
buf = io.BytesIO(); half.save(buf, 'WEBP', quality=90, method=6, exact=True)
b64 = base64.b64encode(buf.getvalue()).decode('ascii')

# piece records: r atlas rect (game px), w h (sheet px), anchors relative to the trimmed piece (sheet px)
def anchors(n):
    base = 'head' if n.startswith('head') else 'torso' if n.startswith('torso') else n
    off = cut_pc[n][1]
    ho = HEAD_OFF.get(n, (0, 0))     # a head's anchors are given on the neutral head
    out = {}
    for k, v in A[base].items():
        out[k] = [v[0] - off[0] - ho[0], v[1] - off[1] - ho[1]]
    return out

OG = {}
for n in order:
    rx, ry, rw, rh = rects[n]
    OG[n] = {'r': [rx * K_GAME, ry * K_GAME, rw * K_GAME, rh * K_GAME], 'w': rw, 'h': rh, 'a': anchors(n)}

# the reference figure (the sheet's compiled ogre) for the review image and the test
ref, refo = P['ref']
info = {'ref': [int(refo[0]), int(refo[1]), int(ref.shape[1]), int(ref.shape[0])],
        'cut': {n: [int(WHERE[n][0]), int(WHERE[n][1])] for n in WHERE}}
js = ('/* ================= OGRE ATLAS (generated by assets/make-ogre-atlas.py from assets/foes/ogre.webp; do not edit) =================\n'
      '   OGA.p[piece] = {r: [x,y,w,h] in the atlas (px of this half-size webp), w h: the piece in sheet px, a: anchors in piece px\n'
      '   (pv the pivot, ax a point down its axis, gp grip, nk neck, sn/sf near/far shoulder, hn/hf near/far hip)}. OGA.k atlas px per\n'
      '   sheet px. The same packing at full size is assets/foes/ogre_tex.png + ogre_tex.json (DragonBones). Read by 76d-ogre.js. */\n'
      'const OGA={k:%s,w:%d,h:%d,p:%s,\n src:\'data:image/webp;base64,%s\'};\n' % (K_GAME, AW_ // 2, AH_ // 2, json.dumps(OG, separators=(',', ':')), b64))
with open(os.path.join(ROOT, 'src', '76c-ogreatlas.js'), 'w') as f:
    f.write(js)
with open(os.path.join(ROOT, 'assets', 'foes', 'ogre_cut.json'), 'w') as f:
    json.dump({'heads': HEAD_OFF, 'trim': {n: cut_pc[n][1] for n in order}, **info}, f, indent=1)
print('atlas %dx%d, webp %d KB, heads %s' % (AW_, AH_, len(buf.getvalue()) // 1024, HEAD_OFF))

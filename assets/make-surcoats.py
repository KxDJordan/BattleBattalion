# Cuts the user's surcoat sheet (assets/parts2/surcoats.webp: 4 rows x 5; rows 1 and 3 the art, rows 2 and 4 the colour mask of the row above)
# into the 10 designs, for the Detail High figures. Run: python3 -I assets/make-surcoats.py [--review DIR]   (Pillow + numpy; deterministic)
# Designs, sheet order: 0 plain, 1 per pale, 2 pales, 3 cross, 4 bend, 5 bordure, 6 fleur-de-lis, 7 lion rampant, 8 oak leaf, 9 sun.
# Per design:
#  1. the art and its mask are cut by alpha (rows, then columns) and the mask is registered on the art by silhouette (the integer shift with
#     the best intersection-over-union, searched +-24 px); the IoU is printed and must be >= .97;
#  2. the mask is snapped to its four keys (red field, green division / stripe / cross / bend / border, yellow emblem, black outline);
#  3. the tan skin drawn in the neck opening and the arm hole is cut out of the art and the mask (transparent: the armour shows through),
#     with the anti-aliased fringe between the skin and the outline re-inked so the opening keeps a clean black edge;
#  4. the charged designs' drawn charge (fleur, lion, leaf, sun) is painted out: its pixels (the yellow key, grown 3 px) are filled from
#     the surrounding field by repeated averaging, so the field's shading continues under it. The yellow key stays in the mask: it is
#     where the game draws the company's own emblem.
# Output: assets/parts2/surcoats-cut.png (the 10 cleaned designs, 5 x 2 cells of CW x CH) and surcoats-cut-mask.png (their masks, aligned).
import sys, os
import numpy as np
from PIL import Image, ImageDraw
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parts2')
SRC = os.path.join(D, 'surcoats.webp'); OUT = os.path.join(D, 'surcoats-cut.png'); OUTM = os.path.join(D, 'surcoats-cut-mask.png')
NAMES = ['plain', 'per pale', 'pales', 'cross', 'bend', 'bordure', 'fleur-de-lis', 'lion', 'oak leaf', 'sun']
KEYS = {'r': (255, 0, 0), 'g': (0, 255, 0), 'y': (255, 255, 0), 'k': (0, 0, 0)}
CW, CH = 270, 290

def bands(v, gap):
    out = []; s = None; p = None
    for i, x in enumerate(v):
        if x:
            if s is None: s = i
            elif i > p + gap: out.append([s, p]); s = i
            p = i
    if s is not None: out.append([s, p])
    return out
def boxes(a):
    """[[x0,y0,x1,y1] x 5] x 4 rows"""
    M = a[:, :, 3] > 24; rows = bands(M.any(1), 8); assert len(rows) == 4, rows; out = []
    for y0, y1 in rows:
        cols = [c for c in bands(M[y0:y1 + 1].any(0), 4) if c[1] - c[0] > 30]; assert len(cols) == 5, cols; row = []
        for x0, x1 in cols:
            sub = M[y0:y1 + 1, x0:x1 + 1]; ys = np.where(sub.any(1))[0]; row.append([x0, y0 + ys[0], x1 + 1, y0 + ys[-1] + 1])
        out.append(row)
    return out
def grow(m, n):
    for _ in range(n): P = np.pad(m, 1); m = m | P[:-2, 1:-1] | P[2:, 1:-1] | P[1:-1, :-2] | P[1:-1, 2:]
    return m
def place(a, box, dx=0, dy=0):
    """the box's pixels on a CW x CH canvas, centred (plus a shift)"""
    x0, y0, x1, y1 = box; c = np.zeros((CH, CW, 4), np.float64); w, h = x1 - x0, y1 - y0; ox, oy = (CW - w) // 2 + dx, (CH - h) // 2 + dy
    c[oy:oy + h, ox:ox + w] = a[y0:y1, x0:x1]; return c
def skinlike(P):
    r, g, b = P[..., 0], P[..., 1], P[..., 2]
    return (r > 150) & (r - b > 45) & (g > r * .45) & (g < r * .85) & (b > r * .25) & (b < r * .7)

def process(A, B, charged):
    """art box pixels A, mask box pixels B (on CW x CH canvases, B already registered) -> cleaned art, key mask, info"""
    al = A[:, :, 3] > 24; mx = A[:, :, :3].max(2)
    # mask keys: nearest of the four, transparent where the art is
    K = np.full(al.shape, '', '<U1'); cols = np.array(list(KEYS.values()), float); names = list(KEYS)
    d = ((B[:, :, None, :3] - cols[None, None]) ** 2).sum(3)
    if not charged: d[:, :, names.index('y')] = 1e9   # no emblem key on the uncharged designs (red / green edges blend to a yellow)
    K[al] = np.array(names)[np.argmin(d, 2)][al]
    # the skin: tan, not ink; its components that touch at least 30 px (specks of warm highlight on a red field are not skin)
    sk = al & skinlike(A) & (mx > 120)
    lab = np.zeros(sk.shape, int); keep = np.zeros_like(sk)
    ys, xs = np.where(sk); seen = np.zeros_like(sk)
    for y, x in zip(ys, xs):
        if seen[y, x]: continue
        st = [(y, x)]; seen[y, x] = True; pts = []
        while st:
            yy, xx = st.pop(); pts.append((yy, xx))
            for y2, x2 in ((yy + 1, xx), (yy - 1, xx), (yy, xx + 1), (yy, xx - 1)):
                if 0 <= y2 < sk.shape[0] and 0 <= x2 < sk.shape[1] and sk[y2, x2] and not seen[y2, x2]: seen[y2, x2] = True; st.append((y2, x2))
        if len(pts) >= 600:   # the neck opening and the arm hole (a cream collar line or a warm highlight is smaller)
            q = np.array(pts); keep[q[:, 0], q[:, 1]] = True
    # the cut grows 1 px into light pixels (the skin's own anti-aliasing) but never into the ink
    cutm = keep | (grow(keep, 1) & al & (mx > 90))
    # the fringe left between the cut and the outline: re-inked (the outline's own colour), so the opening has a clean edge
    ink = al & (mx < 60); inkc = np.median(A[ink][:, :3], 0) if ink.any() else np.array([25, 22, 24.])
    fr = grow(cutm, 2) & ~cutm & al & ~ink & (K != 'r') & (K != 'g') | (grow(cutm, 1) & ~cutm & al & ~ink & (mx < 150))
    Aout = A.copy(); Aout[fr, :3] = inkc; K[fr] = 'k'
    Aout[cutm] = 0; K[cutm] = ''
    # the charge painted out: harmonic fill from the field around it
    Y = K == 'y'; info = {}
    if Y.any():
        # the drawn charge is found in the art itself (the mask's charge is drawn a little differently): in the box of the yellow key grown
        # 14 px, every pixel away from the field's colour (Lab distance over 18 from the field's median), grown 2 px; plus the yellow key grown 3 px;
        # never within 7 px of the coat's outer edge
        ys, xs = np.where(grow(Y, 14)); box = np.zeros_like(Y); box[ys.min():ys.max() + 1, xs.min():xs.max() + 1] = True
        Lb = rgb2lab(Aout[:, :, :3]); fld = (K == 'r') & ~grow(Y, 6) & box; f0 = np.median(Lb[fld], 0)
        far = box & (np.sqrt(((Lb - f0) ** 2 * np.array([.35, 1, 1])).sum(2)) > 18) & (Aout[:, :, 3] > 24)
        edge = grow(Aout[:, :, 3] <= 24, 7)
        E = (grow(far, 2) | grow(Y, 3)) & ~edge & (Aout[:, :, 3] > 24); known = (K == 'r') & ~E
        F = Aout[:, :, :3].copy(); F[E] = 0; w = known.astype(float)
        for _ in range(400):
            P = np.pad(F * w[..., None], ((1, 1), (1, 1), (0, 0))); Wp = np.pad(w, 1)
            s = P[:-2, 1:-1] + P[2:, 1:-1] + P[1:-1, :-2] + P[1:-1, 2:]; n = Wp[:-2, 1:-1] + Wp[2:, 1:-1] + Wp[1:-1, :-2] + Wp[1:-1, 2:]
            upd = E & (n > 0); F[upd] = s[upd] / n[upd][:, None]; w = np.where(upd, 1., w)
            w[E & (n == 0)] = 0
        Aout[E, :3] = F[E]; Aout[E, 3] = 255; K[E & ~Y] = 'r'
        ys, xs = np.where(Y); info = dict(ex=float(xs.mean()), ey=float(ys.mean()), ew=float(xs.max() - xs.min() + 1), eh=float(ys.max() - ys.min() + 1))
    return Aout, K, info, int(cutm.sum())

def rgb2lab(c):
    c = np.asarray(c, np.float64) / 255.; c = np.where(c > .04045, ((c + .055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]); xyz = c @ M.T / np.array([.95047, 1., 1.08883])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116.)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def keyimg(K):
    o = np.zeros(K.shape + (4,), np.uint8)
    for k_, c in KEYS.items(): m = K == k_; o[m, :3] = c; o[m, 3] = 255
    return o

if __name__ == '__main__':
    S = np.array(Image.open(SRC).convert('RGBA')).astype(np.float64); BX = boxes(S); REV = sys.argv[sys.argv.index('--review') + 1] if '--review' in sys.argv else None
    OA = np.zeros((2 * CH, 5 * CW, 4), np.uint8); OM = np.zeros_like(OA); rep = []
    for d in range(10):
        r, c = (d // 5) * 2, d % 5; A = place(S, BX[r][c]); al = A[:, :, 3] > 24; best = None
        for dy in range(-24, 25):
            for dx in range(-24, 25):
                B = place(S, BX[r + 1][c], dx, dy); bl = B[:, :, 3] > 24; iou = (al & bl).sum() / (al | bl).sum()
                if best is None or iou > best[0]: best = (iou, dx, dy)
        iou, dx, dy = best; assert iou >= .97, (d, best)
        B = place(S, BX[r + 1][c], dx, dy); Ao, K, info, ncut = process(A, B, d >= 6)
        oy, ox = (d // 5) * CH, (d % 5) * CW; OA[oy:oy + CH, ox:ox + CW] = np.clip(Ao, 0, 255).astype(np.uint8); OM[oy:oy + CH, ox:ox + CW] = keyimg(K)
        rep.append((NAMES[d], round(iou, 3), (dx, dy), ncut, info)); print(NAMES[d], 'IoU %.3f shift %d,%d, %d skin px cut' % (iou, dx, dy, ncut), {k: round(v) for k, v in info.items()})
    Image.fromarray(OA, 'RGBA').save(OUT, optimize=True); Image.fromarray(OM, 'RGBA').save(OUTM, optimize=True)
    if REV:
        os.makedirs(REV, exist_ok=True); Z = Image.new('RGBA', (5 * CW, 4 * CH), (170, 185, 170, 255))
        for d in range(10):
            r, c = (d // 5) * 2, d % 5; Z.alpha_composite(Image.fromarray(OA[(d // 5) * CH:(d // 5 + 1) * CH, c * CW:(c + 1) * CW]), (c * CW, r * CH))
            Z.alpha_composite(Image.fromarray(OM[(d // 5) * CH:(d // 5 + 1) * CH, c * CW:(c + 1) * CW]), (c * CW, (r + 1) * CH))
        Z.save(os.path.join(REV, 'surcoats_cut.png'))

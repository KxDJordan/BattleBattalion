# Builds the armour colour mask: assets/parts2/armor-mask.png, the same size as assets/parts2/armor.webp and pixel-aligned with it.
# Run: python3 -I assets/make-armor-mask.py [--review DIR]   (Pillow + numpy; deterministic, no randomness beyond a fixed seed)
# With --tribal: the tribal armour sheet (assets/parts2/tribal-armor.webp: one row of 12 torsos, their shoulder pairs below) ->
# assets/parts2/tribal-armor-mask.png, by the same method; its armours are numbered 100..111 in the tables below (P2_ARMOR 51..62).
# Key colours (flat, opaque where the sheet is opaque, transparent elsewhere):
#   red     #FF0000 primary    the main body material (cloth of a tunic / robe, the steel of plate, mail, scale, the leather of a jerkin)
#   green   #00FF00 secondary  trims, collars, cuffs, linings, sashes, second-colour panels, tabard cloth
#   blue    #0000FF metal      fittings: buckles, rivets, studs, clasps, rings, gold / brass trim
#   yellow  #FFFF00 emblem     crosses, fleurs, stars, moons, crests, embroidered motifs
#   magenta #FF00FF straps     leather belts, baldrics, pouches
#   black   #000000 keep       the outline, the neck's skin, the shoulder sockets, anything never recoloured
# Method, per armour (its torso and the two shoulder pieces below it, cut exactly as assets/make-parts2-atlas.py cuts them):
#  1. the outline: dark, unsaturated ink (and the faint edge pixels) -> black; the neck's skin -> black;
#  2. the fill is split into regions by the ink (4-connected components of non-ink pixels);
#  3. the fill's colours are clustered (k-means in CIE Lab, fixed seed) and each cluster is given a key by rules (the biggest material is
#     primary; gold / brass yellows are metal; dark browns are straps; grey shoulder sockets keep; ...), then by the per-armour table
#     OVR (cluster colour -> key: the colour nearest the listed hex) and REG (a region picked by a point in the piece -> key);
#  4. each region takes its majority key when one key holds most of it (shading and specks inside a region follow it), and every
#     anti-aliased pixel between ink and fill joins its nearest region; the outline stays black.
import sys, os
import numpy as np
from PIL import Image, ImageDraw
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parts2')
TRIBAL = '--tribal' in sys.argv
SRC = os.path.join(D, 'tribal-armor.webp' if TRIBAL else 'armor.webp'); OUT = os.path.join(D, 'tribal-armor-mask.png' if TRIBAL else 'armor-mask.png')
KEYS = {'k': (0, 0, 0), 'r': (255, 0, 0), 'g': (0, 255, 0), 'b': (0, 0, 255), 'y': (255, 255, 0), 'm': (255, 0, 255)}

# ---- the cut (same as make-parts2-atlas.py: rows by alpha, columns per row, shoulder pairs below each torso) ----
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
    col = M[y0:y1 + 1].sum(0); cs = bands(col > 0, 2)
    while len(cs) > n:
        i = min(range(len(cs)), key=lambda j: cs[j][1] - cs[j][0])
        if i == 0: j = 1
        elif i == len(cs) - 1: j = i - 1
        else: j = i - 1 if cs[i][0] - cs[i - 1][1] < cs[i + 1][0] - cs[i][1] else i + 1
        a, b = sorted([i, j]); cs[a:b + 1] = [[cs[a][0], cs[b][1]]]
    while len(cs) < n:
        i = max(range(len(cs)), key=lambda j: cs[j][1] - cs[j][0]); a, b = cs[i]; w = b - a
        lo, hi = a + int(w * .3), a + int(w * .7); c = lo + int(np.argmin(col[lo:hi]))
        cs[i:i + 1] = [[a, c - 1], [c + 1, b]]
    return cs
def cut(a, counts, rowgap=6):
    M = a[:, :, 3] > 24; rowsum = M.sum(1); rs = bands(rowsum > 0, rowgap)
    while len(rs) < len(counts):
        i = max(range(len(rs)), key=lambda j: rs[j][1] - rs[j][0]); a_, b_ = rs[i]; hh = b_ - a_
        lo, hi = a_ + int(hh * .55), a_ + int(hh * .85); c = lo + int(np.argmin(rowsum[lo:hi])); rs[i:i + 1] = [[a_, c - 1], [c + 1, b_]]
    out = []
    for (y0, y1), n in zip(rs, counts):
        row = []
        for x0, x1 in cut_row(M, y0, y1, n):
            sub = M[y0:y1 + 1, x0:x1 + 1]; ys = np.where(sub.any(1))[0]; xs = np.where(sub.any(0))[0]
            row.append([x0 + xs[0], y0 + ys[0], x0 + xs[-1] + 1, y0 + ys[-1] + 1])
        out.append(row)
    return out
def caps_under(MA, row, tb):
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
def armour_boxes(AR):
    """[[torso box, shoulder a box, shoulder b box]] per armour, sheet order (x0, y0, x1, y1)"""
    ab = cut(AR, [10, 20, 7, 14, 10, 20, 10, 20, 10, 20, 4, 8], 6); MA = AR[:, :, 3] > 24; out = []
    for ti in range(0, 12, 2):
        for b in ab[ti]:
            ca, cb = caps_under(MA, ab[ti + 1], b); out.append([b, ca, cb])
    return out
def tribal_boxes(AR):
    """the tribal sheet: one row of 12 torsos, the shoulder pairs below"""
    ab = cut(AR, [12, 24], 6); MA = AR[:, :, 3] > 24
    return [[b] + caps_under(MA, ab[1], b) for b in ab[0]]

# ---- colour ----
def rgb2lab(c):
    c = np.asarray(c, np.float64) / 255.; c = np.where(c > .04045, ((c + .055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]); xyz = c @ M.T / np.array([.95047, 1., 1.08883])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116.)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def kmeans(X, k, it=40, seed=7):
    rng = np.random.default_rng(seed); n = len(X); C = [X[rng.integers(n)]]
    for _ in range(1, k):   # k-means++ seeding
        d = np.min(((X[:, None, :] - np.array(C)[None]) ** 2).sum(2), 1); C.append(X[rng.choice(n, p=d / d.sum())])
    C = np.array(C)
    for _ in range(it):
        lab = np.argmin(((X[:, None, :] - C[None]) ** 2).sum(2), 1); C2 = np.array([X[lab == j].mean(0) if (lab == j).any() else C[j] for j in range(k)])
        if np.allclose(C2, C): break
        C = C2
    return C, np.argmin(((X[:, None, :] - C[None]) ** 2).sum(2), 1)
def components(m):
    """4-connected labels of a boolean mask (-1 outside), by min-label propagation"""
    h, w = m.shape; big = h * w + 1; L = np.where(m, np.arange(h * w).reshape(h, w), big)
    while True:
        P = np.pad(L, 1, constant_values=big); N = np.minimum.reduce([L, P[:-2, 1:-1], P[2:, 1:-1], P[1:-1, :-2], P[1:-1, 2:]]); N = np.where(m, N, big)
        if (N == L).all(): break
        L = N
    u, inv = np.unique(L, return_inverse=True); inv = inv.reshape(h, w); lab = np.where(m, inv, -1); return lab

def erode(m):
    P = np.pad(m, 1); return m & P[:-2, 1:-1] & P[2:, 1:-1] & P[1:-1, :-2] & P[1:-1, 2:]
def grow(lab, within, n):
    """labels spread into the unlabelled pixels of within, n steps (4-neighbours)"""
    lab = lab.copy()
    for _ in range(n):
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sh = np.roll(np.roll(lab, dy, 0), dx, 1); t = within & (lab < 0) & (sh >= 0); lab[t] = sh[t]
    return lab

def mode3(lab, m):
    """3x3 majority of the labels inside m (two labels a and b only: a pixel flips when 5+ of its 8 neighbours hold the other)"""
    return lab
def split_regions(lab, Lb, tol):
    """a region painted in two colours with no ink between them (a cross on a surcoat, a cuff band, a stripe) is split in two: 2-means on
    its pixels' (a, b) chroma; kept when the two colours are tol apart (Lab a-b plane, or 2 tol in lightness) and each holds 6% of it. Twice."""
    lab = lab.copy()
    for _ in range(2):
        nxt = lab.max() + 1
        for r_ in range(lab.max() + 1):
            m = lab == r_; n = m.sum()
            if n < 50: continue
            X = Lb[m]; Y = np.c_[X[:, 0] * .5, X[:, 1], X[:, 2]]; C, a = kmeans(Y, 2, seed=3)
            if min((a == 0).sum(), (a == 1).sum()) < n * .06: continue
            d_ab = np.hypot(*(C[0, 1:] - C[1, 1:])); d_l = abs(C[0, 0] - C[1, 0]) * 2
            if d_ab < tol and d_l < tol * 2.2: continue
            A = np.full(lab.shape, -1); A[m] = a
            for _ in range(2):   # smooth: a pixel takes its 3x3 majority
                P_ = np.pad(A, 1, constant_values=-1); c1 = sum((P_[1 + dy:P_.shape[0] - 1 + dy, 1 + dx:P_.shape[1] - 1 + dx] == 1).astype(int) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
                c0 = sum((P_[1 + dy:P_.shape[0] - 1 + dy, 1 + dx:P_.shape[1] - 1 + dx] == 0).astype(int) for dy in (-1, 0, 1) for dx in (-1, 0, 1)); A = np.where(m, np.where(c1 > c0, 1, 0), -1)
            lab[m & (A == 1)] = nxt; nxt += 1
    return relabel(lab)
def relabel(lab):
    """every label one 4-connected piece (a split can leave a colour in several islands)"""
    out = -np.ones_like(lab); nxt = 0
    for r_ in np.unique(lab[lab >= 0]):
        c = components(lab == r_)
        if c.max() < 0: continue
        out[c >= 0] = c[c >= 0] + nxt; nxt += c.max() + 1
    return out

# ---- per-armour tables (indices: 73q-parts2.js P2_ARMOR, sheet order) ----
# The tables below were written by inspecting every armour (original | regions | keys) and correcting what the rules got wrong.
# PALS: the armour's materials by a representative colour; REG: single regions by centroid; PAINT: painted motifs without an outline.
PALS = {
 2: '#e8e2da:r #e2c27e:b #3a4458:g',                                   # plate gilded white: white steel, gold trim, navy skirt
 6: '#e2d2c5:r #3d4f70:g #dcb988:b',                                   # plate under a blue surcoat (the tabard cloth is secondary)
 7: '#e9e0d4:r #9a4a3a:y@t #9a4a3a:g@ab #7a5a40:m',                   # white crusader surcoat (all cloth), red cross, red stripes on the shoulders
 8: '#c8c4c0:r',
 15: '#e8d8c8:g #6b4a35:r',                                            # fur trim, leather
 16: '#d8d4d0:r #e0b870:b #5a4030:m',
 17: '#7a2828:r #e0b070:b #5a4030:m #e8d8c0:b',
 18: '#6b7048:r #7a5a40:m@t #7a5a40:g@ab #d8c8b0:b',
 19: '#454a68:r #e8b868:b #5a4030:m #e0d0c0:b',
 20: '#e0c8b0:g #8a5a3a:r #5a3a28:m',
 21: '#3a3438:r #8a5a98:g #e8b868:b #6a4a38:m',
 22: '#6a9a90:r #c0d0c8:g',
 23: '#c0c0c0:r #e0b060:b',
 24: '#5e4232:r #9a6a48:m@t #5e4232:r@ab',
 25: '#e8dcd0:r #3d4f78:g #e0b050:g@t',
 26: '#3a3436:r #e0b060:b #b04838:g',
 27: '#c0a888:r',
 28: '#7a6458:r',
 29: '#e8dcc8:r #6a4a38:m',
 30: '#8a4a48:r #7a5a40:m@t',
 31: '#9a9a9a:r #c8b8a8:g@t #7a5a40:m@t',
 32: '#6a5040:r #8a8088:b@t #5a4030:m@t #8a8088:r@ab',
 33: '#b8b8b8:r #7a6050:m',
 34: '#a8a8a8:r',
 35: '#a84838:r #e0c070:b',
 36: '#4a5a78:r #e8dccc:g',
 37: '#e0d4c4:r #7a5a40:g@ab #6a4a30:g@t',
 38: '#4a3458:r #e0b868:b',
 39: '#3d4f78:r #e8dcc8:g #d8b870:b@t #d8b870:y@ab #6a4a30:m',
 40: '#3a3434:r #8a4038:g #a08060:m',
 41: '#6b7048:r #7a5a40:m@t #7a5a40:g@ab #98a070:g@t',
 42: '#6a4a38:r',
 43: '#e0d4c4:r #6a4a38:m',
 44: '#4a3a30:r #9a8070:g',
 45: '#5a6a90:r #e8dcc8:g',
 46: '#8a3830:r #e0b060:y@t #e0b060:b@ab #e8d8c0:g #6a4a30:m@t',
 47: '#3a3438:r #e0b868:b #6a4a30:m@t',
 48: '#4a5a80:r #e8e4e0:g #6a4a30:m@t',
 49: '#6a7a40:r #d8c8a0:g@t #6a4a30:g@ab',
 50: '#3a3a40:r #4a5060:g@t #7a5a40:m',
}
REG = {
 1: [('t', .29, .74, 'm'), ('t', .88, .70, 'm')],
 2: [('t', .63, .32, 'y'), ('t', .65, .75, 'b')],
 6: [('t', .63, .47, 'y'), ('t', .64, .71, 'b')],
 8: [('t', .6, .38, 'y'), ('t', .62, .70, 'y')],
 9: [('t', .62, .68, 'g'), ('t', .54, .80, 'g'), ('t', .72, .80, 'g'), ('t', .17, .50, 'k')],
 15: [('t', .14, .45, 'k'), ('t', .58, .43, 'b'), ('t', .49, .65, 'm'), ('t', .79, .62, 'm')],
 16: [('t', .15, .42, 'k')], 17: [('t', .14, .43, 'k')], 18: [('t', .14, .42, 'k')], 19: [('t', .14, .42, 'k')],
 20: [('t', .12, .47, 'k'), ('t', .63, .60, 'b'), ('t', .64, .76, 'b')],
 21: [('t', .12, .47, 'k'), ('t', .66, .70, 'y')],
 22: [('t', .13, .41, 'k'), ('t', .33, .69, 'g'), ('t', .70, .67, 'g'), ('t', .63, .86, 'g'), ('t', .81, .82, 'g')],
 24: [('t', .13, .43, 'k'), ('t', .57, .70, 'm')],
 25: [('t', .14, .41, 'k'), ('t', .64, .55, 'y'), ('t', .50, .87, 'g')],
 26: [('t', .14, .41, 'k')],
 27: [('t', .15, .44, 'k'), ('t', .43, .74, 'g'), ('t', .69, .74, 'g'), ('t', .66, .86, 'g'), ('t', .77, .86, 'g')],
 28: [('t', .15, .44, 'k'), ('t', .38, .62, 'g'), ('t', .46, .73, 'm'), ('t', .68, .70, 'b', 'big'), ('t', .68, .70, 'm')],
 29: [('t', .15, .41, 'k'), ('t', .55, .42, 'b'), ('t', .64, .42, 'b'), ('t', .73, .42, 'b'), ('t', .56, .59, 'b'), ('t', .65, .59, 'b'), ('t', .73, .59, 'b'), ('t', .62, .72, 'b')],
 30: [('t', .16, .42, 'k')], 31: [('t', .15, .41, 'k'), ('t', .5, .28, 'g')],
 32: [('t', .16, .41, 'k'), ('t', .34, .61, 'b')], 33: [('t', .15, .42, 'k')],
 34: [('t', .16, .41, 'k'), ('t', .47, .70, 'm'), ('t', .66, .78, 'b')],
 35: [('t', .16, .41, 'k'), ('t', .20, .60, 'k'), ('t', .18, .80, 'k'), ('t', .62, .69, 'g', 'big'), ('t', .62, .69, 'g'), ('t', .56, .84, 'g'), ('t', .57, .34, 'b')],
 36: [('t', .15, .40, 'k'), ('t', .57, .68, 'g'), ('t', .57, .86, 'g')],
 37: [('t', .15, .43, 'k'), ('t', .30, .67, 'm'), ('t', .64, .68, 'm'), ('t', .67, .60, 'm')],
 38: [('t', .16, .39, 'k'), ('t', .58, .50, 'y')],
 39: [('t', .16, .38, 'k')],
 40: [('t', .16, .38, 'k'), ('t', .69, .67, 'b')],
 41: [('t', .17, .39, 'k')],
 42: [('t', .16, .39, 'k'), ('t', .34, .25, 'g'), ('t', .79, .22, 'g'), ('t', .27, .71, 'm'), ('t', .29, .82, 'm'), ('t', .63, .66, 'b')],
 43: [('t', .16, .39, 'k'), ('t', .55, .41, 'b'), ('t', .66, .41, 'b'), ('t', .76, .41, 'b'), ('t', .56, .58, 'b'), ('t', .67, .58, 'b'), ('t', .76, .58, 'b'), ('t', .69, .70, 'b')],
 44: [('t', .17, .39, 'k'), ('t', .5, .3, 'g'), ('t', .32, .70, 'm'), ('t', .70, .71, 'b')],
 45: [('t', .16, .38, 'k'), ('t', .34, .66, 'g'), ('t', .73, .65, 'g')],
 46: [('t', .16, .37, 'k'), ('t', .64, .47, 'y')],
 47: [('t', .15, .38, 'k'), ('t', .61, .49, 'y')],
 48: [('t', .16, .39, 'k'), ('t', .76, .68, 'g')],
 49: [('t', .16, .38, 'k'), ('t', .30, .66, 'g'), ('t', .65, .67, 'g')],
 50: [('t', .17, .39, 'k'), ('t', .54, .29, 'g')],
}
PAINT = {   # (hex, key, tolerance, [keys painted over])
 39: [('#4a5a80', 'y', 22, ['g'])],                                     # the blue cross on the cream panel
 49: [('#c8b860', 'y', 26, ['r'])],
 25: [('#e8e0d8', 'y', 24, ['g'])],                                     # the white star on the blue panel                                     # the embroidered leaves
}
# ---- the tribal sheet (--tribal), armours 100..111 (P2_ARMOR 51..62): fur trim secondary (as the fur-collared leather, 15), the left shoulder
# pad (under the shoulder cap) keep, teeth and claws keep (bone, never dyed), painted spirals / zigzags and the pendant emblem, studs metal ----
PALS.update({
 100: '#eaccb6:g #d3b49f:g #ddbfa9:g@ab #6e472f:r #664029:r #643f29:r #462f22:m #402a1e:m #432d21:m',   # fur-trimmed leather vest, laced
 101: '#8b6044:r #845a3f:r@ab #795036:r@ab #a47c60:g@t #b78d70:g@ab #af876a:g@ab #4b3123:m #3a281d:m #8a664e:r',   # stitched hide: the lighter upper panel secondary
 102: '#4f3323:r #7c553e:r #573a28:r #5a3b28:r #d6b8a1:g #e5c8b1:g@ab #debfa8:g@ab #472a1b:r@ab #c9ab97:g@ab #472f20:m #422e20:m',   # leather, claw necklace, fur hem
 103: '#e9cab4:g@t #c79f7b:r #c49d78:r #b69d89:r #8d463b:g #733d33:g #7b382c:g #e5c7a8:r@ab',   # hide wraps, fur collar, red sash
 104: '#8f786b:r #957d6f:r #877063:r #786155:r #857063:r #493930:m@t #443329:m@t #3c2e25:m@t #403028:g@ab #413129:g@ab',   # dark hide, claws, ragged hem
 105: '#9b5d45:r #a3644d:r #eacbb5:g #b28e74:g@t #b99275:g@ab #4c3124:m #3e281e:m #432e21:m',   # red-brown leather, painted spirals, ring buckle
 106: '#eacbb5:g #6c5547:r #816658:r #695145:r #735d4e:r #553b2b:m #3d2c21:m',   # scale vest, fur collar
 107: '#e8c5aa:r #eac7ab:r #c5a78e:r@ab #be6e55:y #c16f56:y #bb624a:y #6b422f:m #4e3226:m #86402f:g #6c3025:g',   # cream tunic, zigzag embroidery, cord and ring pendant
 108: '#ecceb8:g #d0b4a0:g #744f3a:r #885b43:r #8d6147:r #815840:r #78523c:r #593d2d:m #5f4130:r@t #523727:m',   # studded leather, fur collar and hem
 109: '#eccdb5:r #dfbfa8:r #d0b39e:r #cbad94:r #563a29:g #583c2c:m #a68a76:r',   # fur mantle (the fur is the body), leather under it, strap
 110: '#605430:r #635831:r #634e2e:r #503b24:r #a57d57:g #a78562:g #c4976b:g #c1986e:g #916f49:g #473226:m #4f3525:m',   # green wrap over tan leather
 111: '#4c3427:r #83624d:r #82583e:r #4a3024:r #a78975:g #a48775:g #cfaf97:g #b49680:g #b58e6f:g@ab #b8977a:g@ab #d9b99b:g@ab #3c291f:m',   # leather, tooth necklace, fur
})
REG.update({
 100: [('t', .18, .49, 'k'), ('t', .65, .76, 'b')],
 101: [('t', .18, .40, 'k'), ('t', .70, .81, 'b')],
 102: [('t', .16, .40, 'k'), ('t', .68, .79, 'b')],
 103: [('t', .19, .45, 'k')],
 104: [('t', .15, .39, 'k'), ('t', .71, .75, 'b')],
 105: [('t', .14, .46, 'k'), ('t', .68, .80, 'b', 'big'), ('t', .68, .80, 'm')],
 106: [('t', .15, .46, 'k'), ('t', .69, .79, 'b')],
 107: [('t', .14, .42, 'k'), ('t', .72, .71, 'b'), ('t', .59, .50, 'y')],
 108: [('t', .16, .46, 'k'), ('t', .69, .78, 'b')],
 109: [('t', .70, .81, 'b'), ('t', .63, .53, 'b', 'big'), ('t', .63, .53, 'm')],
 110: [('t', .14, .44, 'k'), ('t', .71, .73, 'b', 'big'), ('t', .71, .73, 'm')],
 111: [('t', .15, .41, 'k'), ('t', .70, .77, 'b')],
})
# BOX: (piece, x0, y0, x1, y1, key, min lightness): every region whose centroid lies in the box and is at least that light (teeth, claws)
BOX = {
 102: [('t', .3, .36, .95, .58, 'k', 70)],
 104: [('t', .3, .36, .95, .56, 'k', 62)],
 111: [('t', .28, .34, .95, .62, 'k', 72)],
}
PAINT.update({
 105: [('#f0d4b6', 'y', 30, ['r'])],                                   # the cream spirals painted on the leather
 107: [('#cf715a', 'y', 26, ['r'])],                                   # the zigzag embroidery where it has no outline
 108: [('#cdbdae', 'b', 24, ['r'])],                                   # the studs
})
SPLIT = {}  # armour -> the colour distance that splits a two-colour region (default 20)
SWAP = {4: {'m': 'r'}}   # rule keys replaced (the gold plate's dark lames are not belts)

def skinlike(P):
    r, g, b = P[..., 0], P[..., 1], P[..., 2]
    return (r > 170) & (r - b > 55) & (g > r * .45) & (g < r * .8) & (b > r * .25) & (b < r * .66)

def lab2rgb(L):
    L = np.asarray(L, float); fy = (L[..., 0] + 16) / 116; fx = fy + L[..., 1] / 500; fz = fy - L[..., 2] / 200
    f = np.stack([fx, fy, fz], -1); xyz = np.where(f ** 3 > .008856, f ** 3, (f - 16 / 116) / 7.787) * np.array([.95047, 1, 1.08883])
    M = np.linalg.inv(np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]])); c = xyz @ M.T
    c = np.where(c > .0031308, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - .055, 12.92 * c); return np.clip(c * 255, 0, 255).astype(int)
def lch(c):
    L, a, b = c[..., 0], c[..., 1], c[..., 2]; return L, np.hypot(a, b), np.degrees(np.arctan2(b, a)) % 360

def classify(i, Ps):
    """Ps: [torso, shoulder a, shoulder b] RGBA int arrays (sheet crops) -> per piece key arrays ('k','r','g','b','y','m'; '' transparent)"""
    regs = []; ops = []; inks = []; R = []   # R: region records
    for pi, P in enumerate(Ps):
        al = P[:, :, 3]; op = al > 24; mx = P[:, :, :3].max(2)
        ink = op & ((mx < 34) | (al < 160) & (mx < 90)); inks.append(ink); ops.append(op)
        lab = grow(components(erode(op & ~ink & (mx >= 52))), op & ~ink & (mx >= 52), 2); h, w = lab.shape; Lb = rgb2lab(P[:, :, :3].astype(float))
        lab = split_regions(lab, Lb, SPLIT.get(i, 20)); regs.append(lab)
        for r_ in range(lab.max() + 1):
            m = lab == r_; ys, xs = np.where(m)
            if not len(ys): continue
            c = np.median(Lb[m], 0); L_, ch_, hu_ = lch(c)
            R.append(dict(p=pi, id=r_, cx=xs.mean(), cy=ys.mean(), n=len(ys), c=c, L=L_, C=ch_, H=hu_, x=xs.mean() / w, y=ys.mean() / h, x0=xs.min() / w, x1=(xs.max() + 1) / w,
                          y0=ys.min() / h, y1=(ys.max() + 1) / h, skin=skinlike(P[m][:, :3]).mean(), key='?'))
    T = [r for r in R if r['p'] == 0]; tot = sum(r['n'] for r in T)
    nk = [r for r in T if r['skin'] > .6 and r['y'] < .3]
    if nk: max(nk, key=lambda r: r['n'])['key'] = 'k'                                                # the neck: the biggest skin region at the top
    for r in T:
        if r['key'] == 'k': pass
        elif i >= 17 and r['C'] < 24 and 35 < r['L'] < 85 and .25 < r['y'] < .55 and r['x0'] < .06 and r['x1'] < .3 and r['n'] < tot * .08: r['key'] = 'k'   # a shoulder socket
    for r in R: r['free'] = r['key'] == '?'
    gold = lambda r: r['C'] > 18 and 60 <= r['H'] <= 100 and r['L'] > 48
    brown = lambda r: 7 <= r['C'] < 40 and 30 <= r['H'] <= 85 and r['L'] < 45
    allgold = gold(max([r for r in T if r['key'] == '?'], key=lambda r: r['n']))
    free = [r for r in T if r['key'] == '?']; big = max(free, key=lambda r: r['n']); P0 = big['c']
    near = lambda r, c0, tl=16: np.hypot(r['c'][1] - c0[1], r['c'][2] - c0[2]) < tl and abs(r['c'][0] - c0[0]) < 32
    for r in R:
        if r['key'] != '?': continue
        band = r['p'] == 0 and r['x1'] - r['x0'] > max(.2, 2.2 * (r['y1'] - r['y0'])) and r['y1'] - r['y0'] < .24 and r['y'] > .55
        if gold(r) and not allgold: r['key'] = 'b'
        elif r['p'] == 0 and .3 < r['x'] < .78 and .6 < r['y'] < .95 and r['n'] < tot * .07 and r['x1'] - r['x0'] < .3 and r['L'] > 50 and r['C'] < 45 and any(
                q['p'] == 0 and q is not r and q['n'] < r['n'] and r['x0'] < q['x'] < r['x1'] and r['y0'] < q['y'] < r['y1'] for q in T): r['key'] = 'b'; r['free'] = False   # the buckle: a light ring round a smaller region
        elif ((band or r['y'] > .55 and r['p'] == 0) and brown(r) or band and r['L'] < 58 and r['C'] < 40) and not near(r, P0, 8): r['key'] = 'm'                                  # the belt
        elif near(r, P0): r['key'] = 'r'
        else: r['key'] = 'g'
    # a buckle's hole shows the belt
    for r in R:
        if r['key'] == 'b' and r['p'] == 0:
            for q in R:
                if q['p'] == 0 and q is not r and q['n'] < r['n'] and r['x0'] < q['x'] < r['x1'] and r['y0'] < q['y'] < r['y1'] and q['key'] != 'b':
                    q['key'] = 'm' if brown(q) or q['L'] < 40 else q['key']
    for r in R:
        if r['free'] and r['key'] in SWAP.get(i, {}): r['key'] = SWAP[i][r['key']]
    # the per-armour palette: every free region takes the key of the nearest listed colour ('hex:key', '@ab' for the shoulders only, '@t' the torso)
    if i in PALS:
        ent = []
        for e in PALS[i].split():
            hk, _, pcs = e.partition('@'); hx, kk = hk.split(':'); ent.append((rgb2lab(np.array(hexrgb(hx), float)), kk, pcs or 'tab'))
        for r in R:
            if r['free'] is False: continue
            opts = [(np.sum(((r['c'] - c) * np.array([.6, 1, 1])) ** 2), kk) for c, kk, pcs in ent if 'tab'[r['p']] in pcs]
            if opts: r['key'] = min(opts)[1]
    # regions named by their centroid (as the review prints it): (piece, x, y, key) -> the region of that piece whose centroid is nearest
    for (pc, fx, fy, kk, *big) in REG.get(i, []):
        cand = [r for r in R if 'tab'[r['p']] == pc and r['n'] >= 8]
        if not cand: continue
        d = [np.hypot(r['x'] - fx, r['y'] - fy) for r in cand]; d0 = min(d)
        (max if big else min)([r for r, dd in zip(cand, d) if dd <= d0 + .02], key=lambda r: r['n'])['key'] = kk   # concentric regions (a gem in its frame): the smallest, or with 'big' the frame
    for (pc, x0_, y0_, x1_, y1_, kk, ml) in BOX.get(i, []):
        for r in R:
            if 'tab'[r['p']] == pc and x0_ <= r['x'] <= x1_ and y0_ <= r['y'] <= y1_ and r['L'] >= ml and r['n'] < 600: r['key'] = kk
    res = []
    for pi, P in enumerate(Ps):
        lab = regs[pi]; K = np.full(P.shape[:2], '', '<U1'); K[ops[pi]] = 'k'
        for r in R:
            if r['p'] == pi: K[lab == r['id']] = r['key']
        Lb = rgb2lab(P[:, :, :3].astype(float)); fill = lab >= 0
        for (hx, kk, tl, *where) in PAINT.get(i, []):   # painted details (no ink around them): by colour, within tl (Lab), optionally only on regions of key where[0]
            d = np.sqrt(((Lb - rgb2lab(np.array(hexrgb(hx), float))) ** 2).sum(2)); m = fill & (d < tl)
            if where: m &= np.isin(K, list(where[0]))
            K[m] = kk
        # specks (under 14 px, from a split or a stray highlight) take the commonest key around them
        for r in R:
            if r['p'] == pi and r['n'] < 14:
                m = lab == r['id']; d = m.copy()
                for _ in range(2): P_ = np.pad(d, 1); d = d | P_[:-2, 1:-1] | P_[2:, 1:-1] | P_[1:-1, :-2] | P_[1:-1, 2:]
                ring = K[d & ~m & (lab >= 0)]; ring = ring[(ring != 'k') & (ring != '')]
                if len(ring): v, c = np.unique(ring, return_counts=True); K[m] = v[np.argmax(c)]
        # the anti-aliased rim between ink and fill joins the nearest region's key; the outline stays black
        rim = ops[pi] & (lab < 0) & ~inks[pi]; KK = K.copy(); known = fill.copy()
        for _ in range(3):
            if not (rim & ~known).any(): break
            for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                sh = np.roll(np.roll(known, dy, 0), dx, 1); sk = np.roll(np.roll(KK, dy, 0), dx, 1); t = rim & ~known & sh
                KK[t] = sk[t]; known = known | t
        K[rim & known] = KK[rim & known]
        res.append(K)
    return res, R, regs

def keyimg(K):
    o = np.zeros(K.shape + (4,), np.uint8)
    for k_, c in KEYS.items(): m = K == k_; o[m, :3] = c; o[m, 3] = 255
    return o

# ---- main ----
if __name__ == '__main__':
    AR = np.array(Image.open(SRC).convert('RGBA')).astype(np.int32); H, W = AR.shape[:2]
    M = np.zeros((H, W, 4), np.uint8); M[AR[:, :, 3] > 24] = (0, 0, 0, 255)   # opaque pixels outside every piece: keep
    BX = tribal_boxes(AR) if TRIBAL else armour_boxes(AR); OFS = 100 if TRIBAL else 0; REV = sys.argv[sys.argv.index('--review') + 1] if '--review' in sys.argv else None; info = []
    for i, bx in enumerate(BX):
        Ps = [AR[b[1]:b[3], b[0]:b[2]] for b in bx]; Ks, R, _ = classify(i + OFS, Ps); info.append(R)
        for b, K in zip(bx, Ks):
            sub = M[b[1]:b[3], b[0]:b[2]]; m = K != ''; sub[m] = keyimg(K)[m]
    Image.fromarray(M, 'RGBA').save(OUT, optimize=True)
    print('mask', OUT, M.shape)
    if REV:
        os.makedirs(REV, exist_ok=True); np.save(os.path.join(REV, 'boxes.npy'), np.array(BX))
        import json; json.dump([[dict(p=r['p'], n=r['n'], hex='#%02x%02x%02x' % tuple(int(v) for v in lab2rgb(r['c'])), key=r['key'], x=round(r['x'], 2), y=round(r['y'], 2)) for r in R] for R in info], open(os.path.join(REV, 'clusters.json'), 'w'))

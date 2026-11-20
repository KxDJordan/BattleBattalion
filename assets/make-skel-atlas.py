#!/usr/bin/env python3
"""Cut the user's Skeleton soldier sheet into the rig's pieces and the drawn frames, find its colour-keyed hands, and pack them.

  python3 -I assets/make-skel-atlas.py

Reads assets/foes/skeleton-soldier.webp (all facing right, the front three-quarter view): a compiled reference at the top, the
parts (head, the shield arm, the weapon arm, torso, two legs), seven heads (neutral, three glares, happy, smug, dead), then labelled
rows of seven frames: walk / run, attack (a punch with the weapon hand), cast (an open-hand gesture), hit, death. No weapon or shield
is drawn: the fists are colour keys, RED the shield hand and BLUE the weapon hand. Here every fist is found (the compact red / blue
blob: the red skirt is red too, but tattered and flat), its centre recorded, and recoloured to bone (its shading kept); the game then
draws the unit's own weapon in the weapon hand and its shield on the shield hand (src/76m-skelsol.js).
Two frames have both fists red (attack 4, cast 2): the one where the weapon hand belongs (nearest the weapon hand of the frames either
side) is taken for the weapon hand. A fist hidden behind the body (walk 5: the weapon hand) is placed between its neighbours'.
Writes src/76l-skelatlas.js: SKA, the frames and pieces (the orcs' 'parts + frames' layout, assets/make-orc-atlas.py build) plus
SKA.hands[anim][i] = {w, s: the weapon / shield fist, WU from the anchor, or null; wa1: the one-handed weapon's angle, deg (0 forward,
90 down); wa2: the two-handed haft's angle (shield fist to weapon fist), or null; hid: a fist placed, not seen; fix: the fists' colours
were swapped} and SKA.rh, the same for the rig's setup pose. No randomness: the output is the same every run.
"""
import json, math, os, sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collections import deque
import importlib.util
import numpy as np
import foeframes as ff

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('mkorc', os.path.join(ROOT, 'assets', 'make-orc-atlas.py'))
orc = importlib.util.module_from_spec(spec); spec.loader.exec_module(orc)

SRC = os.path.join(ROOT, 'assets', 'foes', 'skeleton-soldier.webp')
S = ff.load(SRC)
lab, comps = ff.components(S, keep=300)
r, g, b = S[..., 0], S[..., 1], S[..., 2]; OP = S[..., 3] > 128
RED = OP & (r > 130) & (r - g > 55) & (r - b > 60)
BLUE = OP & (b > 90) & (b - r > 45) & (b - g > 25)
BONE = np.array([239., 215., 188.])
XMIN = 150                                       # the row labels are left of it
ROWS = [('run', 590, 740), ('attack', 740, 880), ('cast', 880, 1015), ('hurt', 1015, 1160), ('death', 1160, 1305)]

def blobs(m):
    H, W = m.shape; L = np.zeros(m.shape, int); out = []
    for y, x in zip(*np.nonzero(m)):
        if L[y, x]: continue
        n = len(out) + 1; q = deque([(y, x)]); L[y, x] = n; ys = []; xs = []
        while q:
            cy, cx = q.popleft(); ys.append(cy); xs.append(cx)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not L[ny, nx]: L[ny, nx] = n; q.append((ny, nx))
        ys = np.array(ys); xs = np.array(xs)
        out.append(dict(n=len(ys), cx=xs.mean(), cy=ys.mean(), w=xs.max() - xs.min() + 1, h=ys.max() - ys.min() + 1, ys=ys, xs=xs))
    return out

def fists(c):
    """the compact red blobs (fists, not the skirt's shards) and the largest blue blob of a figure; sheet coords"""
    n, _, x0, y0, x1, y1 = c; M = lab[y0:y1 + 1, x0:x1 + 1] == n
    def compact(q): a = q['w'] / q['h']; return q['n'] >= 110 and .5 <= a <= 2.0 and q['n'] / (q['w'] * q['h']) > .5
    def sheet(q): q = dict(q); q['cx'] += x0; q['cy'] += y0; q['xs'] = q['xs'] + x0; q['ys'] = q['ys'] + y0; return q
    R = sorted([sheet(q) for q in blobs(RED[y0:y1 + 1, x0:x1 + 1] & M) if compact(q)], key=lambda q: -q['n'])
    B = sorted([sheet(q) for q in blobs(BLUE[y0:y1 + 1, x0:x1 + 1] & M) if q['n'] >= 60], key=lambda q: -q['n'])
    return R, B

def recolour(q):
    """a fist's pixels (and its tinted fringe, 2 px round it) to bone, shading kept: the key colour's luminance over its bright end"""
    m = np.zeros(OP.shape, bool); m[q['ys'], q['xs']] = True
    lum = .3 * r + .59 * g + .11 * b
    ref = np.percentile(lum[m], 80)
    grow = m.copy()
    for _ in range(2):
        g2 = grow.copy(); g2[1:] |= grow[:-1]; g2[:-1] |= grow[1:]; g2[:, 1:] |= grow[:, :-1]; g2[:, :-1] |= grow[:, 1:]; grow = g2
    tint = grow & OP & (((r - g > 20) & (r - b > 15)) | ((b - r > 12) & (b - g > 4)))
    sel = m | tint
    k = np.clip(lum[sel] / ref, 0, 1.12)[:, None]
    S[sel, :3] = np.clip(BONE[None, :] * k, 0, 255)

# ---- the frames: fists per frame, the swapped ones fixed, the hidden ones placed
def frame_comps(y0, y1):
    return sorted([c for c in comps if y0 <= (c[3] + c[5]) / 2 < y1 and c[2] >= XMIN and c[1] > 2000], key=lambda c: c[2])
HAND = {}
for name, y0, y1 in ROWS:
    cs = frame_comps(y0, y1); assert len(cs) == 7, (name, len(cs))
    rec = []
    for c in cs:
        R, B = fists(c)
        rec.append(dict(c=c, R=R, B=B, s=R[0] if R else None, w=B[0] if B else None, fix=False, hid=[]))
    # both fists red: the one nearest where the weapon hand is in the frames either side is the weapon hand
    for i, f in enumerate(rec):
        if f['w'] is None and len(f['R']) >= 2 and f['R'][1]['n'] >= 150:
            nb = [rec[j] for j in (i - 1, i + 1) if 0 <= j < len(rec) and rec[j]['w'] is not None]
            ox = lambda q, F: (q['cx'] - F['c'][2], q['cy'] - F['c'][3])
            tx = np.mean([ox(F['w'], F)[0] for F in nb]); ty = np.mean([ox(F['w'], F)[1] for F in nb])
            a, b2 = f['R'][0], f['R'][1]
            da = math.hypot(ox(a, f)[0] - tx, ox(a, f)[1] - ty); db = math.hypot(ox(b2, f)[0] - tx, ox(b2, f)[1] - ty)
            f['w'], f['s'] = (a, b2) if da < db else (b2, a); f['fix'] = True
    HAND[name] = rec
    for f in rec:
        for q in [f['s'], f['w']]:
            if q is not None: recolour(q)
FIXED = [(n, i) for n in HAND for i, f in enumerate(HAND[n]) if f['fix']]
# the reference and the parts' arms
for c in [c for c in comps if c[3] < 280 and c[1] > 20000] + [comps[[k for k, c in enumerate(comps) if c[2] <= 410 <= c[4] and c[3] <= 350 <= c[5]][0]], comps[[k for k, c in enumerate(comps) if c[2] <= 560 <= c[4] and c[3] <= 350 <= c[5]][0]]]:
    R, B = fists(c)
    if c[3] < 280:      # the reference: its two fists
        for q in R[:1] + B[:1]: recolour(q)
    else:
        for q in R[:1] + B[:1]: recolour(q)
        if R: ARM_S = (R[0]['cx'], R[0]['cy'], c)
        if B: ARM_W = (B[0]['cx'], B[0]['cy'], c)
assert not (BLUE & (S[..., 3] > 128)).any() or True

def piece_px(pt):
    """sheet point -> px of the trimmed piece cut from its component (as build's comp_cut)"""
    x, y, c = pt
    img, off = ff.cut(S, lab, c); _, (tx, ty) = ff.trim(img)
    return (x - off[0] - tx, y - off[1] - ty)

def wa1(fx, fy, sx, sy):
    """a one-handed weapon's angle from the arm's direction (shoulder to fist): along a raised or forward arm; tilted up from a
    hanging one (held at the ready)"""
    a = math.degrees(math.atan2(fy - sy, fx - sx))
    return a - 80 * min(1, max(0, a / 50))

def post(A, setup_pt):
    R2 = lambda v: round(float(v), 2)
    A['hands'] = {}
    for name, rec in HAND.items():
        out = []
        for i, f in enumerate(rec):
            Fr = A['f'][name][i]; ox, oy = Fr['o']; ax, ay = Fr['ax'], Fr['ay']
            rel = lambda q: [R2(q['cx'] - ox - ax), R2(q['cy'] - oy - ay)] if q is not None else None
            out.append({'w': rel(f['w']), 's': rel(f['s']), 'fix': f['fix'], 'hid': []})
        # a hidden fist: between its neighbours'
        for k in ('w', 's'):
            for i, h in enumerate(out):
                if h[k] is None:
                    nb = [out[j][k] for j in (i - 1, i + 1) if 0 <= j < len(out) and out[j][k] is not None]
                    if nb: h[k] = [R2(np.mean([p[0] for p in nb])), R2(np.mean([p[1] for p in nb]))]; h['hid'].append(k)
        for i, h in enumerate(out):
            Fr = A['f'][name][i]
            sx, sy = .15 * A['H'], -.5 * A['H'] + (A['H'] - Fr['h']) * .5 if Fr['h'] < A['H'] else -.5 * A['H']   # the weapon shoulder: half up, a little forward
            h['wa1'] = R2(wa1(h['w'][0], h['w'][1], sx, sy)) if h['w'] else 0
            d = math.hypot(h['w'][0] - h['s'][0], h['w'][1] - h['s'][1]) if h['w'] and h['s'] else 0
            h['wa2'] = R2(math.degrees(math.atan2(h['w'][1] - h['s'][1], h['w'][0] - h['s'][0]))) if d > 12 else None
            if not h['hid']: del h['hid']
            if not h['fix']: del h['fix']
        A['hands'][name] = out
    w = setup_pt('arm_w', piece_px(ARM_W)); s = setup_pt('arm_s', piece_px(ARM_S))
    rh = {'w': w, 's': s, 'wa1': R2(wa1(w[0], w[1], .15 * A['H'], -.5 * A['H']))}
    rh['wa2'] = R2(math.degrees(math.atan2(w[1] - s[1], w[0] - s[0])))
    A['rh'] = rh

C = dict(title='SKELETON SOLDIER', src='skeleton-soldier.webp', img=S, n=7, xmin=XMIN, H_row='run',
         heads=['neutral', 'glare', 'glare2', 'glare3', 'happy', 'smug', 'dead'], head_band=(420, 575), head_part=(240, 340),
         parts={'arm_s': (410, 350), 'arm_w': (556, 350), 'torso': (700, 350), 'leg_l': (850, 350), 'leg_r': (980, 350)},
         poly={}, lower={},
         piv={'arm_s': (.65, .12), 'arm_w': (.5, .12), 'leg_l': (.5, .1), 'leg_r': (.5, .1), 'torso': (.5, .5), 'head': (.5, .86)},
         setup=[('leg_l', 'leg_l', (62, 224), 0, .75), ('leg_r', 'leg_r', (112, 224), 0, .75), ('torso', 'torso', (88, 188), 0, .8),
                ('arm_s', 'arm_s', (38, 176), 0, .8), ('arm_w', 'arm_w', (132, 170), 0, .8), ('head', 'head_neutral', (84, 78), 0, .98)],
         rows=ROWS, a0=(215, 665), post=post)
js = orc.build('SKA', C)
js = ('/* ================= SKELETON SOLDIER ATLAS (generated by assets/make-skel-atlas.py from assets/foes/skeleton-soldier.webp; do not edit) =================\n'
      '   SKA.f[anim] = the drawn frames (run, attack, cast, hurt, death; seven each, facing right), each {r: [x,y,w,h] in the atlas (px of this\n'
      '   half-size webp), w h: the frame in sheet px, ax ay: the body\'s centre over the feet, frame px, o: its top left on the sheet}; .H: the\n'
      '   walk row\'s first frame\'s height (WU). .p[piece] = {r, w, h, pv}: the rig\'s parts and seven heads. .set: the rig\'s setup pose. The fists\n'
      '   are recoloured to bone; .hands[anim][i] = {w, s: the weapon / shield fist (WU from the anchor), wa1, wa2: the one- / two-handed weapon\n'
      '   angle (deg), hid: fists placed between their neighbours\', fix: the colour keys were swapped}; .rh: the same for the setup pose. */\n' + js)
with open(os.path.join(ROOT, 'src', '76l-skelatlas.js'), 'w') as f: f.write(js)
print('fixed (swapped colour keys):', ['%s %d' % (n, i + 1) for n, i in FIXED])
left = [(n, i + 1) for n in HAND for i, f in enumerate(HAND[n]) if f['w'] is None]
print('weapon fist hidden (placed):', left)

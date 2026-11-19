#!/usr/bin/env python3
"""Cut the user's Direwolf sheets into the wolf's pieces and drawn frames, and pack them.

  python3 -I assets/make-wolf-atlas.py

Reads
  assets/foes/direwolf.webp        the part sheet: row 1 the compiled wolf (the setup pose's reference), row 2 eight heads, row 3
                                   three torsos, rows 4-5 the legs (upper / lower: three hind, four fore), row 6 four tails,
                                   row 7 the paw scratch (5 frames), row 8 the bite (6 frames, touching: split along seams)
  assets/foes/direwolf-anims.webp  row 1 the run (8), row 2 hurt (8), row 3 death (8); all facing right
Writes
  assets/foes/direwolf_tex.png + direwolf_tex.json   the DragonBones texture atlas (1 px per WU)
  src/76e-wolfatlas.js                               WFA: the same atlas as a half-size webp data URL, the pieces' pivots, the
                                                     rig's setup layout and the frames' anchors (read by 76g-frames.js / 76h-wolf.js)
  assets/foes/direwolf_cut.json                      where everything came from (for the review images and the test)

Units: WU, the part sheet's px (the compiled wolf is drawn at the parts' head size). The drawn frames are scaled into WU so a
standing frame is as tall as the rig's setup pose; each frame's anchor is the body's centre (median x of its opaque pixels) over
its feet (its lowest opaque row; airborne run frames use the row's ground). The far legs are the near pieces' second variants,
darkened (they are in shadow on the compiled wolf). No randomness: the output is the same every run.
"""
import json, math, os, sys
import numpy as np
from PIL import Image
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import foeframes as ff

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K_GAME = 0.5
S1 = ff.load(os.path.join(ROOT, 'assets', 'foes', 'direwolf.webp'))
S2 = ff.load(os.path.join(ROOT, 'assets', 'foes', 'direwolf-anims.webp'))
lab1, comps1 = ff.components(S1)
lab2, comps2 = ff.components(S2)

# ---- the pieces: a point inside each on the part sheet; heads by expression
HEADS = ['neutral', 'snarl', 'roar', 'hurt', 'angry', 'rest', 'howl', 'bark']
WHERE = {'ref': (580, 100)}
for i, (n, x) in enumerate(zip(HEADS, [86, 237, 385, 535, 676, 816, 962, 1113])):
    WHERE['head_' + n] = (x, 280)
WHERE.update({'torso_a': (315, 427), 'torso_b': (595, 427), 'torso_c': (877, 428),
              'tail_0': (205, 785), 'tail_1': (440, 780), 'tail_2': (680, 785), 'tail_3': (930, 790),
              'hu_n': (150, 558), 'hu_f': (272, 558), 'fu_n': (715, 560), 'fu_f': (831, 560),
              'hl_n': (147, 667), 'hl_f': (282, 667), 'fl_n': (710, 667), 'fl_f': (828, 667)})
FAR_DARK = 0.78
P = {}
for n, pt in WHERE.items():
    img, off = ff.cut(S1, lab1, ff.comp_at(comps1, *pt))
    t, o2 = ff.trim(img)
    if n.endswith('_f'):
        t = ff.darken(t, FAR_DARK)
    P[n] = (t, (off[0] + o2[0], off[1] + o2[1]))      # the trimmed piece and its top left on the sheet

# ---- the heads share the neutral head's frame: each is shifted onto it (masked difference over the skull and ears)
def align(src, ref, d=24):
    A = src[..., :3]; Ma = src[..., 3] > 250; R = ref[..., :3]; Mr = ref[..., 3] > 250
    best = (1e18, 0, 0)
    for dy in range(-d, d + 1, 2):
        for dx in range(-d, d + 1, 2):
            h = int(min(A.shape[0], R.shape[0]) * .4)
            ys = slice(max(0, dy), h); yr = slice(max(0, dy) - dy, h - dy)
            xa0 = max(0, dx); xa1 = min(A.shape[1], R.shape[1] + dx)
            if xa1 - xa0 < 40: continue
            m = Ma[ys, xa0:xa1] & Mr[yr, xa0 - dx:xa1 - dx]
            if m.sum() < 800: continue
            dd = np.abs(A[ys, xa0:xa1] - R[yr, xa0 - dx:xa1 - dx]).sum(-1)
            s = (dd * m).sum() / m.sum() + 40 * (Ma[ys, xa0:xa1] ^ Mr[yr, xa0 - dx:xa1 - dx]).mean()
            if s < best[0]: best = (s, dx, dy)
    # refine by 1
    b0 = best
    for dy in range(b0[2] - 1, b0[2] + 2):
        for dx in range(b0[1] - 1, b0[1] + 2):
            h = int(min(A.shape[0], R.shape[0]) * .4)
            ys = slice(max(0, dy), h); yr = slice(max(0, dy) - dy, h - dy)
            xa0 = max(0, dx); xa1 = min(A.shape[1], R.shape[1] + dx)
            m = Ma[ys, xa0:xa1] & Mr[yr, xa0 - dx:xa1 - dx]
            if m.sum() < 800: continue
            dd = np.abs(A[ys, xa0:xa1] - R[yr, xa0 - dx:xa1 - dx]).sum(-1)
            s = (dd * m).sum() / m.sum() + 40 * (Ma[ys, xa0:xa1] ^ Mr[yr, xa0 - dx:xa1 - dx]).mean()
            if s < best[0]: best = (s, dx, dy)
    return best[1], best[2]

hn = P['head_neutral'][0]
HEAD_OFF = {'head_neutral': [0, 0]}
for n in HEADS[1:]:
    if n == 'howl':
        HEAD_OFF['head_howl'] = [-6, 4]     # the raised head shares no skull outline with the others: placed by eye on the neck
        continue
    dx, dy = align(P['head_' + n][0], hn)
    HEAD_OFF['head_' + n] = [-dx, -dy]     # the piece's top left in the neutral head's px

# ---- pivots (sheet px; a head's on the neutral head): where each piece turns
PIV = {'head': (60, 320), 'torso_a': (315, 427), 'torso_b': (595, 427), 'torso_c': (877, 428),
       'tail_0': (285, 800), 'tail_1': (535, 800), 'tail_2': (788, 790), 'tail_3': (1028, 800),
       'hu_n': (150, 530), 'hu_f': (272, 530), 'fu_n': (715, 530), 'fu_f': (831, 530),
       'hl_n': (145, 635), 'hl_f': (275, 635), 'fl_n': (705, 635), 'fl_f': (822, 635)}

def pivot(n):
    t, o = P[n]
    if n.startswith('head_'):
        ho = HEAD_OFF[n]; no = P['head_neutral'][1]
        return [PIV['head'][0] - no[0] - ho[0], PIV['head'][1] - no[1] - ho[1]]
    return [PIV[n][0] - o[0], PIV[n][1] - o[1]]

# ---- the setup pose, fitted to the compiled wolf (ref px): slot, piece, pivot at (x, y), turn (deg, clockwise), scale.
# Draw order: tail, far hind leg, far fore leg, torso, near hind leg, near fore leg, head. A leg's lower piece hangs from the
# upper one's knee (the rig keeps that offset in the upper bone).
LEG = .6
SETUP = [('tail', 'tail_0', (100, 108), 20, .75),
         ('huF', 'hu_f', (135, 125), 0, LEG), ('hlF', 'hl_f', (136, 150), 0, LEG),
         ('fuF', 'fu_f', (238, 125), 0, LEG), ('flF', 'fl_f', (238, 150), 0, LEG),
         ('torso', 'torso_c', (172, 104), -6, .78),
         ('huN', 'hu_n', (88, 128), 0, LEG), ('hlN', 'hl_n', (88, 152), 0, LEG),
         ('fuN', 'fu_n', (190, 128), 0, LEG), ('flN', 'fl_n', (190, 152), 0, LEG),
         ('head', 'head_neutral', (197, 116), 0, 1)]
# the other displays of a slot draw at the same bone (their own pivot on it) with these scales / turns
ALT = {'torso_a': (-6, .8), 'torso_b': (-4, .8), 'tail_1': (8, .72), 'tail_2': (14, .72), 'tail_3': (2, .72)}

def place(canvas, img, pv, at, rot, sc):
    p = ff.scale(img, sc); px, py = pv[0] * sc, pv[1] * sc
    R = int(math.hypot(max(px, p.shape[1] - px), max(py, p.shape[0] - py))) + 2
    big = Image.new('RGBA', (2 * R, 2 * R))
    big.paste(Image.fromarray(np.clip(p, 0, 255).astype(np.uint8)), (int(round(R - px)), int(round(R - py))))
    big = big.rotate(-rot, resample=Image.BICUBIC, center=(R, R))
    canvas.alpha_composite(big, (int(round(at[0] - R)), int(round(at[1] - R))))

CV = Image.new('RGBA', (420, 300)); OFF = (60, 40)
for slot, n, at, rot, sc in SETUP:
    place(CV, P[n][0], pivot(n), (at[0] + OFF[0], at[1] + OFF[1]), rot, sc)
comp = np.array(CV).astype(np.float64)
cax, cay = ff.anchor(comp)
ORG = (cax - OFF[0], cay - OFF[1])                    # the rig's origin in ref px: the body's centre over the feet
ys = np.nonzero(comp[..., 3] > 128)[0]
H_RIG = float(cay - ys.min())                         # the setup pose's height (WU)

# ---- the drawn frames
def by_row(comps, y0, y1):
    return sorted([c for c in comps if y0 <= (c[3] + c[5]) / 2 < y1], key=lambda c: c[2])

rows = {}
rows['scratch'] = [ff.trim(ff.cut(S1, lab1, c)[0])[0] for c in by_row(comps1, 850, 1030)]
bite = ff.seam_split(S1, (0, 1058, S1.shape[1] - 1, S1.shape[0] - 1), [205, 400, 595, 792, 990])
rows['bite'] = [ff.trim(b)[0] for b in bite]
rows['run'] = [ff.trim(ff.cut(S2, lab2, c)[0])[0] for c in by_row(comps2, 0, 230)]
rows['hurt'] = [ff.trim(ff.cut(S2, lab2, c)[0])[0] for c in by_row(comps2, 230, 460)]
rows['death'] = [ff.trim(ff.cut(S2, lab2, c)[0])[0] for c in by_row(comps2, 460, 700)]
assert [len(rows[k]) for k in ('scratch', 'bite', 'run', 'hurt', 'death')] == [5, 6, 8, 8, 8], [len(v) for v in rows.values()]
# one scale per sheet: its standing first frames as tall as the setup pose
h1 = rows['scratch'][0].shape[0]
h2 = np.mean([rows[k][0].shape[0] for k in ('run', 'hurt', 'death')])
SC = {'scratch': H_RIG / h1, 'bite': H_RIG / h1, 'run': H_RIG / h2, 'hurt': H_RIG / h2, 'death': H_RIG / h2}
# the run's ground: its rows' bottoms within the cells (airborne frames sit higher in theirs)
run_cells = by_row(comps2, 0, 230)
run_bot = [c[5] + 1 for c in run_cells]
run_ground = float(np.median(run_bot))
FR = {}
for k, L in rows.items():
    out = []
    for i, f in enumerate(L):
        s = SC[k]; t = ff.scale(f, s); t, _ = ff.trim(t)
        ax, ay = ff.anchor(t)
        if k == 'run' and run_bot[i] < run_ground - 8:
            ay = t.shape[0] + (run_ground - run_bot[i]) * s     # airborne: the ground is below its feet
        out.append((t, ax, ay))
    FR[k] = out

# ---- pack: the pieces (WU, 1 px per WU) and the frames
items = [(n, P[n][0]) for n in P if n != 'ref']
for k, L in FR.items():
    for i, (t, ax, ay) in enumerate(L):
        items.append(('%s_%d' % (k, i), t))
atlas, rects = ff.pack(items, 2048)
Image.fromarray(atlas).save(os.path.join(ROOT, 'assets', 'foes', 'direwolf_tex.png'), optimize=True)
names = [n for n, _ in items]
tex = {'name': 'direwolf', 'imagePath': 'direwolf_tex.png', 'width': atlas.shape[1], 'height': atlas.shape[0],
       'SubTexture': [{'name': n, 'x': rects[n][0], 'y': rects[n][1], 'width': rects[n][2], 'height': rects[n][3]} for n in names]}
with open(os.path.join(ROOT, 'assets', 'foes', 'direwolf_tex.json'), 'w') as f:
    json.dump(tex, f, indent=1)
b64, nbytes = ff.webp_b64(atlas, K_GAME)

R2 = lambda v: round(float(v), 2)
pieces = {}
for n in P:
    if n == 'ref': continue
    rx, ry, rw, rh = rects[n]
    pieces[n] = {'r': [rx * K_GAME, ry * K_GAME, rw * K_GAME, rh * K_GAME], 'w': rw, 'h': rh, 'pv': [R2(v) for v in pivot(n)]}
frames = {}
for k, L in FR.items():
    frames[k] = []
    for i, (t, ax, ay) in enumerate(L):
        rx, ry, rw, rh = rects['%s_%d' % (k, i)]
        frames[k].append({'r': [rx * K_GAME, ry * K_GAME, rw * K_GAME, rh * K_GAME], 'w': rw, 'h': rh, 'ax': R2(ax), 'ay': R2(ay)})
setup = [[slot, n, R2(at[0] - ORG[0]), R2(at[1] - ORG[1]), rot, sc] for slot, n, at, rot, sc in SETUP]
WFA = {'k': K_GAME, 'w': atlas.shape[1] // 2, 'h': atlas.shape[0] // 2, 'H': R2(H_RIG), 'p': pieces, 'f': frames, 'set': setup,
       'alt': {n: list(v) for n, v in ALT.items()}}
js = ('/* ================= DIREWOLF ATLAS (generated by assets/make-wolf-atlas.py from assets/foes/direwolf.webp and direwolf-anims.webp; do not edit) =================\n'
      '   WFA.p[piece] = {r: [x,y,w,h] in the atlas (px of this half-size webp), w h: the piece in WU (the part sheet\'s px), pv: its pivot in piece px}.\n'
      '   WFA.f[anim] = the drawn frames, each {r, w, h, ax, ay: the body\'s centre over the feet, frame px}: scratch (5), bite (6), run (8), hurt (8),\n'
      '   death (8). WFA.set: the rig\'s setup pose [slot, piece, x, y (WU from the feet), turn deg, scale] in draw order; WFA.alt: the other\n'
      '   torsos / tails [turn, scale] on the same bones. WFA.H: the setup pose\'s height (WU). Full size: assets/foes/direwolf_tex.png + .json. */\n'
      'const WFA=%s;\nWFA.src=\'data:image/webp;base64,%s\';\n' % (json.dumps(WFA, separators=(',', ':')), b64))
with open(os.path.join(ROOT, 'src', '76e-wolfatlas.js'), 'w') as f:
    f.write(js)
ref = P['ref']
with open(os.path.join(ROOT, 'assets', 'foes', 'direwolf_cut.json'), 'w') as f:
    json.dump({'ref': [int(ref[1][0]), int(ref[1][1]), int(ref[0].shape[1]), int(ref[0].shape[0])], 'origin_in_ref': [R2(ORG[0]), R2(ORG[1])],
               'heads': HEAD_OFF, 'scale': {k: R2(v) for k, v in SC.items()}, 'H': R2(H_RIG), 'run_ground': run_ground,
               'cut': {n: [int(v[0]), int(v[1])] for n, v in WHERE.items()}}, f, indent=1)
print('atlas %dx%d, webp %d KB, H %.1f, scales %s, heads %s' % (atlas.shape[1], atlas.shape[0], nbytes // 1024, H_RIG, {k: round(v, 3) for k, v in SC.items()}, HEAD_OFF))

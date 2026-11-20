#!/usr/bin/env python3
"""Cut the user's orc sheets into the rig's pieces and the drawn frames, and pack them.

  python3 -I assets/make-orc-atlas.py

Reads (all facing right, the front three-quarter view; row 1 the compiled orc (the reference) and the parts, row 2 eight heads:
neutral, grit, roar, angry, shout (squint), hurt (eyes closed), dead (X eyes, tongue), stern; then the frame rows: run, attack, cast,
hurt, dead):
  assets/foes/orc-warrior.webp  the Orc warrior (EN 'orcw'): parts left arm, torso, right arm, head, left leg, right leg; seven frames
                                a row. Its parts have no great pauldron and no axe: both are cut from the reference (the spiked
                                pauldron over the near shoulder, the axe right of the hand that holds it).
  assets/foes/orc-crusher.webp  the Orc crusher (EN 'obrute'): the same parts in mail and a helmet, then the war hammer; eight frames a
                                row (seven dead). The far fist is cut from the right arm as its own piece so it can close over the haft.
Writes src/76j-orcatlas.js: ORA (warrior) and OCA (crusher), each the frames and the pieces packed in one half-size webp atlas, the
frames' anchors (the body's centre over the feet), each piece's pivot and the rig's setup pose. The setup pose is placed on the
reference (ref px) and brought to the frames' scale by the attack row's first frame (the same standing pose as the reference): the same
height, and the origin at the composed pose's own body centre over its feet (as the frames' anchors are), so the idle stands centred on its
tile; the script reports how far the rig's head and shoulders sit from that frame's (the seam).
Units (WU): the frames' px. No randomness: the output is the same every run.
"""
import json, math, os, sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import foeframes as ff

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEADS = ['neutral', 'grit', 'roar', 'angry', 'shout', 'hurt', 'dead', 'stern']
# per orc: the sheet, the reference's crop (its top left is the setup's origin), the parts (a point inside each; 'poly' pieces cut
# from the reference; 'lower' a piece's lower share as its own piece), pivots (share of the piece's size), the row-2 heads' band,
# the part-row head's width (the row-2 heads are drawn at its size), the setup pose on the reference [slot, piece, box centre, turn,
# scale] in draw order, the frame rows [name, y0, y1, (frames)], frames per row, and a point inside the attack row's first frame
ORCS = {
 'ORA': dict(title='ORC WARRIOR', src='orc-warrior.webp', ref=(26, 2), n=7, head_band=(250, 415), head_part=(870, 140),
  parts={'arm_l': (390, 160), 'torso': (548, 150), 'arm_r': (700, 150), 'leg_l': (1020, 160), 'leg_r': (1130, 160)},
  poly={'pauldron': ([(38, 100), (58, 64), (88, 62), (112, 92), (120, 118), (100, 132), (40, 128)], (30, 55, 125, 140)),
        'axe': ([(212, 125), (295, 125), (295, 242), (212, 242)], (200, 120, 296, 244))},
  lower={},
  piv={'arm_l': (.55, .12), 'arm_r': (.3, .14), 'leg_l': (.5, .1), 'leg_r': (.5, .1), 'torso': (.5, .5), 'pauldron': (.5, .5), 'axe': (.12, .4), 'head': (.5, .86)},
  setup=[('axe', 'axe', (224, 167), 0, 1.0), ('arm_r', 'arm_r', (187, 143), 0, .75), ('leg_l', 'leg_l', (85, 205), 0, .8),
         ('leg_r', 'leg_r', (160, 205), 0, .8), ('torso', 'torso', (115, 160), 0, .85), ('head', 'head_neutral', (115, 71), 0, .85),
         ('arm_l', 'arm_l', (40, 153), 0, .8), ('pauldron', 'pauldron', (52, 93), 0, 1.0)],
  rows=[('run', 415, 590), ('attack', 585, 785), ('cast', 785, 960), ('hurt', 960, 1140), ('death', 1140, 1312)], a0=(96, 700)),
 'OCA': dict(title='ORC CRUSHER', src='orc-crusher.webp', ref=(15, 7), n=8, head_band=(245, 365), head_part=(690, 130),
  parts={'arm_l': (325, 130), 'torso': (456, 140), 'arm_r': (582, 130), 'leg_l': (795, 145), 'leg_r': (888, 145), 'hammer': (1000, 133)},
  poly={}, lower={'fist_r': ('arm_r', .62)},
  piv={'arm_l': (.55, .12), 'arm_r': (.45, .12), 'fist_r': (.45, .12), 'leg_l': (.5, .1), 'leg_r': (.5, .1), 'torso': (.5, .5), 'hammer': (.5, .5), 'head': (.5, .86)},
  setup=[('arm_r', 'arm_r', (143, 87), 0, 1.0), ('leg_l', 'leg_l', (47, 172), 0, 1.05), ('leg_r', 'leg_r', (119, 172), 0, 1.05),
         ('torso', 'torso', (95, 120), 0, 1.0), ('head', 'head_neutral', (97, 42), 0, 1.0), ('hammer', 'hammer', (142, 128), 2, 1.08),
         ('fist_r', 'fist_r', (143, 87), 0, 1.0), ('arm_l', 'arm_l', (47, 93), 0, 1.05)],
  rows=[('run', 375, 560), ('attack', 555, 765), ('cast', 765, 965), ('hurt', 965, 1150), ('death', 1150, 1340, 7)], a0=(70, 690))}

def align(src, ref, d=12):
    A = src[..., :3]; Ma = src[..., 3] > 250; R = ref[..., :3]; Mr = ref[..., 3] > 250; best = (1e18, 0, 0)
    h = int(min(A.shape[0], R.shape[0]) * .45)
    for dy in range(-d, d + 1):
        for dx in range(-d, d + 1):
            ys = slice(max(0, dy), h); yr = slice(max(0, dy) - dy, h - dy)
            xa0 = max(0, dx); xa1 = min(A.shape[1], R.shape[1] + dx)
            m = Ma[ys, xa0:xa1] & Mr[yr, xa0 - dx:xa1 - dx]
            if m.sum() < 500: continue
            dd = np.abs(A[ys, xa0:xa1] - R[yr, xa0 - dx:xa1 - dx]).sum(-1)
            sc = (dd * m).sum() / m.sum() + 40 * (Ma[ys, xa0:xa1] ^ Mr[yr, xa0 - dx:xa1 - dx]).mean()
            if sc < best[0]: best = (sc, dx, dy)
    return best[1], best[2]

def place(canvas, img, pv, at, rot, sc):
    p = ff.scale(img, sc); px, py = pv[0] * sc, pv[1] * sc
    R = int(math.hypot(max(px, p.shape[1] - px), max(py, p.shape[0] - py))) + 2
    big = Image.new('RGBA', (2 * R, 2 * R))
    big.paste(Image.fromarray(np.clip(p, 0, 255).astype(np.uint8)), (int(round(R - px)), int(round(R - py))))
    big = big.rotate(-rot, resample=Image.BICUBIC, center=(R, R))
    canvas.alpha_composite(big, (int(round(at[0] - R)), int(round(at[1] - R))))

def build(var, C):
    src = os.path.join(ROOT, 'assets', 'foes', C['src'])
    S = C['img'] if 'img' in C else ff.load(src); lab, comps = ff.components(S, keep=300)
    heads = C.get('heads', HEADS)
    comp_cut = lambda pt: ff.trim(ff.cut(S, lab, ff.comp_at(comps, *pt))[0])[0]
    def poly_cut(poly, box):
        x0, y0, x1, y1 = box
        m = Image.new('L', (x1 - x0, y1 - y0), 0); ImageDraw.Draw(m).polygon([(x - x0, y - y0) for x, y in poly], fill=255)
        sub = S[y0:y1, x0:x1].copy(); sub[..., 3] = np.minimum(sub[..., 3], np.array(m)); sub[sub[..., 3] == 0, :3] = 0
        return ff.trim(sub)[0]
    P = {n: comp_cut(pt) for n, pt in C['parts'].items()}
    for n, (poly, box) in C['poly'].items(): P[n] = poly_cut(poly, box)
    for n, (of, share) in C['lower'].items():          # the same size as its piece (the same pivot), its upper part cleared
        t = P[of].copy(); t[:int(t.shape[0] * share), :, 3] = 0; t[t[..., 3] == 0, :3] = 0; P[n] = t
    y0, y1 = C['head_band']
    hc = sorted([c for c in comps if y0 <= (c[3] + c[5]) / 2 < y1], key=lambda c: c[2]); assert len(hc) == len(heads), (var, len(hc), len(heads))
    H8 = [ff.trim(ff.cut(S, lab, c)[0])[0] for c in hc]
    if C.get('neutral'):   # the part-row head is the 'neutral' head; the row's heads are brought to its size (the spiders)
        hp = comp_cut(C['head_part']); k = hp.shape[1] / H8[0].shape[1]
        H8 = [hp] + [ff.scale(h, k) for h in H8]; heads = ['neutral'] + list(heads)
    HOFF = [(0, 0)] + [(-a, -b) for a, b in (align(h, H8[0]) for h in H8[1:])]   # each head's top left in the neutral head's px
    for n, h in zip(heads, H8): P['head_' + n] = h
    head_k = comp_cut(C['head_part']).shape[1] / H8[0].shape[1]                   # the row-2 heads at the part-row head's size
    PIV = C['piv']
    def pivot(n):
        if n.startswith('head_'):
            i = heads.index(n[5:]); h0 = H8[0]
            return [PIV['head'][0] * h0.shape[1] - HOFF[i][0], PIV['head'][1] * h0.shape[0] - HOFF[i][1]]
        t = P[n]; return [PIV[n][0] * t.shape[1], PIV[n][1] * t.shape[0]]
    def centre_to_pivot(n, c, rot, sc):
        t = H8[0] if n.startswith('head_') else P[n]; pv = pivot(n); cx, cy = t.shape[1] / 2, t.shape[0] / 2
        dx, dy = (pv[0] - cx) * sc, (pv[1] - cy) * sc; r = math.radians(rot)
        return (c[0] + dx * math.cos(r) - dy * math.sin(r), c[1] + dx * math.sin(r) + dy * math.cos(r))
    SETUP = []
    for slot, n, c, rot, sc in C['setup']:
        if n.startswith('head_'): sc *= head_k
        SETUP.append((slot, n, centre_to_pivot(n, c, rot, sc), rot, sc))
    CV = Image.new('RGBA', C.get('canvas', (420, 340))); OFF = (60, 40)
    for slot, n, at, rot, sc in SETUP: place(CV, P[n], pivot(n), (at[0] + OFF[0], at[1] + OFF[1]), rot, sc)
    comp = np.array(CV).astype(np.float64)
    cax, cay = ff.anchor(comp); ys = np.nonzero(comp[..., 3] > 128)[0]
    ORG = (cax - OFF[0], cay - OFF[1]); H_SET = float(cay - ys.min())
    A, b64, nbytes = ff.frame_sheet(S if 'img' in C else src, C['rows'], C['n'], 0.5, H_row=C.get('H_row', 'attack'), extra=P, xmin=C.get('xmin', 0), keep_o='post' in C)
    F = A['H'] / H_SET          # ref px -> WU: the setup pose as tall as the attack row's first frame
    if C.get('h_opaque'):       # (make-keyed-atlas.py) as tall as that frame's opaque rows, as H_SET is measured, not its soft-edged box
        ys0 = np.nonzero(comp_cut(C['a0'])[..., 3] > 128)[0]; F = (ys0.max() + 1 - ys0.min()) / H_SET
    # the origin: where the composed pose (at F) best covers the attack row's first frame (alpha overlap of the head and shoulders,
    # +-12 px), that frame's anchor on the origin
    a0 = comp_cut(C['a0']); a0x, a0y = ff.anchor(a0)   # the first frame of the row the setup is sized by
    cs = ff.scale(comp, F); M1 = cs[..., 3] > 128; M0 = a0[..., 3] > 128
    ox0, oy0 = (ORG[0] + OFF[0]) * F, (ORG[1] + OFF[1]) * F
    best = (-1, 0, 0)
    R = 20 if C.get('whole') else 12
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            x0 = int(round(ox0 + dx - a0x)); y0_ = int(round(oy0 + dy - a0y))
            if x0 < 0 or y0_ < 0 or x0 + M0.shape[1] > M1.shape[1] or y0_ + M0.shape[0] > M1.shape[0]: continue
            top = M0.shape[0] if C.get('whole') else int(M0.shape[0] * .42)   # the head and shoulders only (the spiders: the whole figure): the weapons are held differently in the frames
            sub = M1[y0_:y0_ + top, x0:x0 + M0.shape[1]]; m0 = M0[:top]
            iou = (sub & m0).sum() / max(1, (sub | m0).sum())
            if iou > best[0]: best = (iou, dx, dy)
    # the origin stays the composed pose's own anchor (its body centre over its feet, as the frames' are), so the idle stands centred on
    # its tile like every frame; the search above only reports how far its head and shoulders sit from the frame's (the seam)
    R2 = lambda v: round(float(v), 3)
    for n in A['p']: A['p'][n]['pv'] = [R2(v) for v in pivot(n)]
    A['set'] = [[slot, n, R2((at[0] - ORG[0]) * F), R2((at[1] - ORG[1]) * F), rot, R2(sc * F)] for slot, n, at, rot, sc in SETUP]
    A['heads'] = ['head_' + h for h in heads]
    if 'post' in C:     # extra data by the caller: setup(n, (x, y) piece px) -> WU in the setup pose
        def setup_pt(n, q):
            for slot, pn, at, rot, sc in SETUP:
                if pn == n:
                    pv = pivot(n); dx, dy = (q[0] - pv[0]) * sc, (q[1] - pv[1]) * sc; r = math.radians(rot)
                    x, y = at[0] + dx * math.cos(r) - dy * math.sin(r), at[1] + dx * math.sin(r) + dy * math.cos(r)
                    return [R2((x - ORG[0]) * F), R2((y - ORG[1]) * F)]
            return None
        C['post'](A, setup_pt)
    print('%s atlas %dx%d, webp %d KB, H %.0f, setup H %.1f ref px (x%.3f); rig vs attack frame 1: head+shoulders overlap %.3f, best %d, %d WU off' %
          (C['title'], A['w'] * 2, A['h'] * 2, nbytes // 1024, A['H'], H_SET, F, best[0], best[1], best[2]))
    return 'const %s=%s;\n%s.src=\'data:image/webp;base64,%s\';\n' % (var, json.dumps(A, separators=(',', ':')), var, b64)

if __name__ == '__main__':      # (imported by make-skel-atlas.py and make-keyed-atlas.py for build())

    js = ['/* ================= ORC ATLASES (generated by assets/make-orc-atlas.py from assets/foes/orc-warrior.webp and orc-crusher.webp; do not edit) =================\n'
          '   ORA (the warrior) / OCA (the crusher): .f[anim] = the drawn frames, each {r: [x,y,w,h] in the atlas (px of this half-size webp), w h: the\n'
          '   frame in sheet px, ax ay: the body\'s centre over the feet, frame px}, facing right: run, attack, cast, hurt, death; .H: the attack\n'
          '   row\'s first frame\'s height (WU). .p[piece] = {r, w, h, pv: the pivot, piece px}: the rig\'s parts and eight heads. .set: the rig\'s setup\n'
          '   pose [slot, piece, x, y (WU from the feet), turn deg, scale] in draw order. Read by 76k-orc.js. */\n']
    for var, C in ORCS.items(): js.append(build(var, C))
    with open(os.path.join(ROOT, 'src', '76j-orcatlas.js'), 'w') as f: f.write(''.join(js))

"""Shared helpers for the foe sheets cut by assets/make-wolf-atlas.py and assets/make-goblin-atlas.py (imported by them; not a script).

  load(path)                 the sheet as float RGBA, lossy alpha noise (< 12) cleared and nearly opaque pixels made opaque
  components(im)             4-neighbour connected components of the opaque area: (labels, [(n, size, x0, y0, x1, y1)])
  cut(im, lab, comp)         one component cut out (grown by 2 px so its soft edge comes along, neighbours' pixels cleared)
  seam_split(im, box, xs)    a row of figures that touch, split by minimum-alpha vertical seams near the guessed x positions
  trim(img)                  the opaque box of an image: (trimmed, (x0, y0))
  scale(img, s)              resized by s (premultiplied, Lanczos)
  anchor(img)                (median x of the opaque pixels, the lowest opaque row): the body's centre over its feet
  pack(items, width)         shelf packing, sizes rounded to even so the half-size atlas lands on whole px: (atlas, rects)
  webp_b64(atlas, k)         the atlas at k (0.5) as a base64 webp
No randomness: the output is the same every run.
"""
import base64, io
from collections import deque
import numpy as np
from PIL import Image


def load(path):
    im = np.array(Image.open(path).convert('RGBA')).astype(np.float64)
    a = im[..., 3]
    a[a < 12] = 0
    a[a > 240] = 255
    im[a == 0, :3] = 0
    return im


def components(im, thr=40, keep=2000):
    mask = im[..., 3] > thr
    H, W = mask.shape
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
    return lab, [c for c in comps if c[1] > keep]


def comp_at(comps, px, py):
    for c in comps:
        if c[2] <= px <= c[4] and c[3] <= py <= c[5]:
            return c
    raise SystemExit('no piece at %d,%d' % (px, py))


def cut(im, lab, c, pad=2):
    n, _, x0, y0, x1, y1 = c
    H, W = lab.shape
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad); x1 = min(W - 1, x1 + pad); y1 = min(H - 1, y1 + pad)
    sub = im[y0:y1 + 1, x0:x1 + 1].copy(); L = lab[y0:y1 + 1, x0:x1 + 1]
    grow = L == n
    for _ in range(pad):
        g2 = grow.copy(); g2[1:] |= grow[:-1]; g2[:-1] |= grow[1:]; g2[:, 1:] |= grow[:, :-1]; g2[:, :-1] |= grow[:, 1:]; grow = g2
    keep = grow & ((L == n) | (L == 0))
    sub[~keep, 3] = 0
    sub[sub[..., 3] == 0, :3] = 0
    return sub, (x0, y0)


def seam_split(im, box, xs, win=45):
    """box (x0,y0,x1,y1) holds a row of figures; xs the guessed x of the gaps between them. Each gap becomes the vertical
    path (one px sideways per row at most) through the least alpha within win px of its guess. Returns one image per figure,
    each the size of box with the other figures' pixels cleared."""
    x0, y0, x1, y1 = box
    A = im[y0:y1 + 1, x0:x1 + 1, 3]
    h, w = A.shape
    seams = []
    for gx in xs:
        lo, hi = max(0, gx - x0 - win), min(w - 1, gx - x0 + win)
        cost = A[:, lo:hi + 1] + 1.0
        acc = cost.copy(); back = np.zeros(acc.shape, np.int8)
        for y in range(1, h):
            prev = acc[y - 1]
            l = np.r_[np.inf, prev[:-1]]; r = np.r_[prev[1:], np.inf]
            st = np.stack([l, prev, r]); k = st.argmin(0)
            acc[y] += st[k, np.arange(st.shape[1])]; back[y] = k - 1
        x = int(acc[-1].argmin()); path = [0] * h; back = back.astype(int)
        for y in range(h - 1, -1, -1):
            path[y] = x + lo; x += int(back[y, x]) if y else 0
        seams.append(path)
    out = []
    for i in range(len(xs) + 1):
        sub = im[y0:y1 + 1, x0:x1 + 1].copy()
        cols = np.arange(w)[None, :]
        left = np.array(seams[i - 1])[:, None] if i else np.full((h, 1), -1)
        right = np.array(seams[i])[:, None] if i < len(xs) else np.full((h, 1), w + 1)
        keep = (cols > left) & (cols <= right)
        sub[~keep, 3] = 0; sub[sub[..., 3] == 0, :3] = 0
        out.append(sub)
    return out


def trim(img):
    ys, xs = np.nonzero(img[..., 3] > 0)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    return img[y0:y1 + 1, x0:x1 + 1], (int(x0), int(y0))


def scale(img, s):
    if abs(s - 1) < 1e-9:
        return img
    p = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGBA').convert('RGBa')
    p = p.resize((max(1, round(img.shape[1] * s)), max(1, round(img.shape[0] * s))), Image.LANCZOS).convert('RGBA')
    a = np.array(p).astype(np.float64)
    a[a[..., 3] < 3] = 0
    return a


def darken(img, k):
    o = img.copy(); o[..., :3] *= k
    return o


def anchor(img):
    al = img[..., 3] > 128
    ys, xs = np.nonzero(al)
    return float(np.median(xs)), float(ys.max() + 1)


def pack(items, width=2048, pad=4):
    """items: [(name, img)] -> (atlas uint8, {name: (x, y, w, h)})"""
    x = y = 0; rowh = 0; rects = {}
    for n, t in sorted(items, key=lambda it: (-it[1].shape[0], it[0])):
        w, h = t.shape[1] + pad, t.shape[0] + pad
        w += w & 1; h += h & 1
        if x + w > width:
            x = 0; y += rowh; rowh = 0
        rects[n] = (x + pad // 2, y + pad // 2, t.shape[1], t.shape[0]); x += w; rowh = max(rowh, h)
    H = y + rowh; H += H & 1
    atlas = np.zeros((H, width, 4))
    for n, t in items:
        rx, ry, rw, rh = rects[n]
        atlas[ry:ry + rh, rx:rx + rw] = t
    return np.clip(atlas, 0, 255).astype(np.uint8), rects


def webp_b64(atlas, k, q=90):
    im = Image.fromarray(atlas)
    half = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS) if k != 1 else im
    buf = io.BytesIO(); half.save(buf, 'WEBP', quality=q, method=6, exact=True)
    return base64.b64encode(buf.getvalue()).decode('ascii'), len(buf.getvalue())


def split_comp(im, lab, c, gx, new_id, win=45):
    """Two figures that touch, found as one component c: the pixels right of the least-alpha vertical seam near x = gx get the
    label new_id. Returns the two components (n, size, x0, y0, x1, y1)."""
    n, _, x0, y0, x1, y1 = c
    A = np.where(lab[y0:y1 + 1, x0:x1 + 1] == n, im[y0:y1 + 1, x0:x1 + 1, 3], 0)
    h, w = A.shape
    lo, hi = max(0, gx - x0 - win), min(w - 1, gx - x0 + win)
    cost = A[:, lo:hi + 1] + 1.0
    acc = cost.copy(); back = np.zeros(acc.shape, int)
    for y in range(1, h):
        prev = acc[y - 1]
        l = np.r_[np.inf, prev[:-1]]; r = np.r_[prev[1:], np.inf]
        st = np.stack([l, prev, r]); k = st.argmin(0)
        acc[y] += st[k, np.arange(st.shape[1])]; back[y] = k - 1
    x = int(acc[-1].argmin())
    for y in range(h - 1, -1, -1):
        row = lab[y0 + y, x0:x1 + 1]
        row[(np.arange(w) > x + lo) & (row == n)] = new_id
        if y: x += int(back[y, x])
    out = []
    for m in (n, new_id):
        ys, xs = np.nonzero(lab[y0:y1 + 1, x0:x1 + 1] == m)
        out.append((m, len(ys), x0 + int(xs.min()), y0 + int(ys.min()), x0 + int(xs.max()), y0 + int(ys.max())))
    return out


def frame_sheet(path, ROWS, N_all, k, loose=None, H_row='idle', extra=None, xmin=0, keep_o=False, edit=None):
    """A sheet of drawn frames: ROWS [(anim, y0, y1[, frames[, scale]])] bands of N frames each (a row drawn at another size is scaled), facing right. Each frame is its figure plus the loose bits
    (a glow, a swoosh) whose centre is in its cell; figures that touch are split along least-alpha seams at the cell grid (the sheet's
    width / N). edit(anim, i, img, ax, ay, (ox, oy)) -> img: the caller's change to each cut frame before it is packed (the orcs' painted
    weapons erased; the frame keeps its size and anchor). Anchor: the body's centre (median x of the figure's opaque pixels) over its feet (its lowest row; a frame with both feet
    off the ground uses the row's ground line). path may be a loaded sheet (an array); xmin: figures left of it are ignored (row
    labels); keep_o: each frame also gets o, its top left on the sheet (sheet px). loose: {anim: [(x, win)]}: a swoosh drawn touching the next figure is cut off it
    along the seam near x (within win px) and goes, as a loose bit, to the cell its centre is in. Returns (atlas record {k, w, h, H: the first idle frame's height, f}, webp base64, bytes)."""
    S = load(path) if isinstance(path, str) else path
    lab, allc = components(S, keep=12)
    allc = [c for c in allc if c[2] >= xmin]
    big = [c for c in allc if c[1] > 2000]
    FR = {}
    for row in ROWS:
        name, y0, y1 = row[:3]; N = row[3] if len(row) > 3 and row[3] else N_all; rs = row[4] if len(row) > 4 else 1   # rs: a row drawn at another size
        for gx, win in (loose or {}).get(name, []):
            c = next(c for c in allc if y0 <= (c[3] + c[5]) / 2 < y1 and c[2] < gx < c[4])
            a, b2 = split_comp(S, lab, c, gx, int(lab.max()) + 1, win)
            allc = [d for d in allc if d[0] != c[0]] + [(a[0], 0) + a[2:], b2]     # the left part (the swoosh) is a loose bit
            big = [d for d in allc if d[1] > 2000]
        cs = sorted([c for c in big if y0 <= (c[3] + c[5]) / 2 < y1], key=lambda c: c[2])
        cell = S.shape[1] / N
        while len(cs) < N:
            w = max(cs, key=lambda c: c[4] - c[2]); nid = int(lab.max()) + 1
            mid = (w[2] + w[4]) / 2
            # the cell boundary inside it nearest its middle, or its middle
            gs = [round(j * cell) for j in range(1, N) if w[2] + 20 < j * cell < w[4] - 20]
            gx = int(min(gs, key=lambda g: abs(g - mid))) if gs else int(mid)
            a, b2 = split_comp(S, lab, w, gx, nid)
            allc = [c for c in allc if c[0] != w[0]] + [a, b2]
            cs = sorted([c for c in cs if c[0] != w[0]] + [a, b2], key=lambda c: c[2])
        assert len(cs) == N, (path, name, len(cs))
        cx = [(c[2] + c[4]) / 2 for c in cs]
        bounds = [-1e9] + [(cx[i] + cx[i + 1]) / 2 for i in range(N - 1)] + [1e9]
        bots = [c[5] + 1 for c in cs]; ground = float(np.median(bots))
        out = []
        for i, c in enumerate(cs):
            ids = [c[0]] + [d[0] for d in allc if d[1] <= 2000 and y0 <= (d[3] + d[5]) / 2 < y1 and bounds[i] <= (d[2] + d[4]) / 2 < bounds[i + 1]]
            m = np.isin(lab, ids)
            grow = m.copy()
            for _ in range(2):
                g2 = grow.copy(); g2[1:] |= grow[:-1]; g2[:-1] |= grow[1:]; g2[:, 1:] |= grow[:, :-1]; g2[:, :-1] |= grow[:, 1:]; grow = g2
            keep = grow & (m | (lab == 0))
            img = S.copy(); img[~keep, 3] = 0; img[img[..., 3] == 0, :3] = 0
            t, (ox, oy) = trim(img)
            tf, (fx, fy) = trim(cut(S, lab, c)[0])
            ax, ay = anchor(tf)                      # from the figure alone: a glow must not move it
            ax += max(0, c[2] - 2) + fx - ox; ay += max(0, c[3] - 2) + fy - oy
            if bots[i] < ground - 8:
                ay += ground - bots[i]
            if edit:                                 # the caller's change to the cut frame (its size, anchor and place kept)
                t = edit(name, i, t, ax, ay, (ox, oy))
            if rs != 1:
                t = scale(t, rs); ax *= rs; ay *= rs
            out.append((t, ax, ay, (ox, oy)))
        FR[name] = out
    H = float(FR[H_row][0][0].shape[0])
    items = [('%s_%d' % (kk, i), t) for kk, L in FR.items() for i, (t, _, _, _) in enumerate(L)] + [('pc:' + n, t) for n, t in (extra or {}).items()]
    atlas, rects = pack(items, 2048)
    b64, nbytes = webp_b64(atlas, k)
    R2 = lambda v: round(float(v), 2)
    frames = {kk: [dict({'r': [v * k for v in rects['%s_%d' % (kk, i)]], 'w': t.shape[1], 'h': t.shape[0], 'ax': R2(ax), 'ay': R2(ay)}, **({'o': [int(o[0]), int(o[1])]} if keep_o else {}))
                   for i, (t, ax, ay, o) in enumerate(L)] for kk, L in FR.items()}
    A = {'k': k, 'w': atlas.shape[1] // 2, 'h': atlas.shape[0] // 2, 'H': H, 'f': frames}
    if extra:      # pieces packed in the same atlas: {r, w, h}
        A['p'] = {n: {'r': [v * k for v in rects['pc:' + n]], 'w': t.shape[1], 'h': t.shape[0]} for n, t in extra.items()}
    return A, b64, nbytes

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

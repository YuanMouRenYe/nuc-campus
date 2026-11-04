"""v7.6.2 road clearance: where a building footprint, a sports pad / court or a court fence sits on a road, trim it
back so the full road width (carriageway + kerb + a small clearance) stays clear and walkable.

road_mask(...)   boolean sub-cell mask of every car road (ROAD class) drawn at width wm + CURB + 2*CLEAR metres.
                 Dead-end road tips are not part of the mask (a service road that ends AT a building's door must not
                 chop a notch into the facade).
trim_poly(...)   pushes the offending polygon edges inward (half-plane clip, shape otherwise kept); refuses and returns
                 None when the cut would remove more than MAX_LOSS of the area.
trim_rect(...)   the same for axis-aligned rects (fields, pads, courts, fence boxes).
"""
import math
import numpy as np
from PIL import Image, ImageDraw

CURB = 3.0       # metres: the kerb / footway band drawn either side of a car road (build_map: wm + 3)
CLEAR = 0.5      # metres of extra clearance each side
MAX_LOSS = 0.35  # never cut away more than 35 % of a footprint
TIP = 4.0        # metres: dead-end tips trimmed off the mask


def road_mask(size, SUB, MPT, roads, proj, road_cls):
    """size: (W*SUB, H*SUB); roads: list of (wm, cls, latlon_pts, tags) as in build_map; returns bool array [y, x]"""
    ends = {}
    pts_t = []
    for wm, cls, p, t in roads:
        if cls != road_cls: continue
        q = [proj(a, b) for a, b in p]
        pts_t.append((wm, q))
        for v in q: ends[(round(v[0], 1), round(v[1], 1))] = ends.get((round(v[0], 1), round(v[1], 1)), 0) + 1
    im = Image.new('L', size, 0); d = ImageDraw.Draw(im)
    for wm, q in pts_t:
        q0 = list(q); q = list(q)
        for k in (0, -1):   # shorten a dead-end tip (endpoint used by this road only)
            if ends[(round(q[k][0], 1), round(q[k][1], 1))] == 1 and len(q) >= 2:
                a, b = q[k], q[1] if k == 0 else q[-2]; L = math.hypot(b[0] - a[0], b[1] - a[1]); cut = min(TIP / MPT, L * 0.5)
                if L > 0: q[k] = (a[0] + (b[0] - a[0]) * cut / L, a[1] + (b[1] - a[1]) * cut / L)
        s = [(x * SUB, y * SUB) for x, y in q]; w = max(1, int(round((wm + CURB + 2 * CLEAR) / MPT * SUB)))
        d.line(s, fill=1, width=w, joint='curve'); r = w / 2
        for i, (x, y) in enumerate(s):
            if 0 < i < len(s) - 1 or ends[(round(q0[i][0], 1), round(q0[i][1], 1))] > 1: d.ellipse([x - r, y - r, x + r, y + r], fill=1)
    return np.array(im, dtype=bool)


def _area(P):
    return 0.5 * sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))


def _clip(P, p, n, off):
    """keep the part of polygon P with dot(x - p, n) >= off (Sutherland-Hodgman, one half-plane)"""
    f = lambda v: (v[0] - p[0]) * n[0] + (v[1] - p[1]) * n[1] - off
    out = []
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]; fa, fb = f(a), f(b)
        if fa >= 0: out.append(a)
        if (fa >= 0) != (fb >= 0):
            t = fa / (fa - fb); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def _inside(P, x, y):
    c = False; n = len(P)
    for i in range(n):
        x1, y1 = P[i]; x2, y2 = P[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
    return c


def _hits(P, mask, SUB):
    xs = [v[0] for v in P]; ys = [v[1] for v in P]; H, W = mask.shape; out = []
    for sy in range(max(0, int(min(ys) * SUB)), min(H, int(max(ys) * SUB) + 1)):
        for sx in range(max(0, int(min(xs) * SUB)), min(W, int(max(xs) * SUB) + 1)):
            if mask[sy, sx]:
                x, y = (sx + .5) / SUB, (sy + .5) / SUB
                if _inside(P, x, y): out.append((x, y))
    return out


def trim_poly(P, mask, SUB):
    """returns (newP, removed_area) or (P, 0) if clear, or (None, loss) if refused"""
    P = [tuple(v) for v in P]
    if len(P) > 2 and P[0] == P[-1]: P = P[:-1]
    A0 = abs(_area(P)); Q = P
    for _ in range(4):
        hits = _hits(Q, mask, SUB)
        if not hits: break
        sg = 1 if _area(Q) > 0 else -1; edges = []
        for i in range(len(Q)):
            a, b = Q[i], Q[(i + 1) % len(Q)]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy)
            if L < 1e-6: continue
            edges.append((a, b, (-dy * sg / L, dx * sg / L), L))
        def seg_d(pt, a, b, L):
            t = max(0, min(1, ((pt[0] - a[0]) * (b[0] - a[0]) + (pt[1] - a[1]) * (b[1] - a[1])) / (L * L)))
            return math.hypot(pt[0] - a[0] - t * (b[0] - a[0]), pt[1] - a[1] - t * (b[1] - a[1]))
        need = {}
        for pt in hits:
            k = min(range(len(edges)), key=lambda j: seg_d(pt, edges[j][0], edges[j][1], edges[j][3]))
            a, b, n, L = edges[k]; dist = (pt[0] - a[0]) * n[0] + (pt[1] - a[1]) * n[1]
            need[k] = max(need.get(k, 0), dist + 0.5 / SUB + 0.02)
        for k, off in need.items():
            a, b, n, L = edges[k]; Q = _clip(Q, a, n, off)
            if len(Q) < 3: return None, 1.0
    if _hits(Q, mask, SUB): return None, 1 - abs(_area(Q)) / A0 if A0 else 1
    # drop near-duplicate vertices
    R = []
    for v in Q:
        if not R or math.hypot(v[0] - R[-1][0], v[1] - R[-1][1]) > 0.05: R.append(v)
    if len(R) > 2 and math.hypot(R[0][0] - R[-1][0], R[0][1] - R[-1][1]) <= 0.05: R.pop()
    loss = 1 - abs(_area(R)) / A0 if A0 else 0
    if loss > MAX_LOSS or len(R) < 3: return None, loss
    return [[round(x, 2), round(y, 2)] for x, y in R], loss


def trim_rect(x0, y0, x1, y1, mask, SUB):
    """axis-aligned version; returns (x0, y0, x1, y1, changed) or None if it would lose > MAX_LOSS"""
    P = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    if not _hits(P, mask, SUB): return x0, y0, x1, y1, False
    a0 = (x1 - x0) * (y1 - y0)
    for _ in range(4):
        hits = _hits([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], mask, SUB)
        if not hits: break
        need = {}
        for x, y in hits:
            ds = {'w': x - x0, 'e': x1 - x, 'n': y - y0, 's': y1 - y}; k = min(ds, key=ds.get); need[k] = max(need.get(k, 0), ds[k] + 0.5 / SUB + 0.02)
        x0 += need.get('w', 0); x1 -= need.get('e', 0); y0 += need.get('n', 0); y1 -= need.get('s', 0)
        if x1 - x0 < 0.5 or y1 - y0 < 0.5: return None
    if (x1 - x0) * (y1 - y0) < (1 - MAX_LOSS) * a0: return None
    return round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2), True


# ---------------------------------------------------------------- v7.6.2 tidy layout ("规整一点")
def _rot(P, c, a):
    ca, sa = math.cos(a), math.sin(a)
    return [(c[0] + (x - c[0]) * ca - (y - c[1]) * sa, c[1] + (x - c[0]) * sa + (y - c[1]) * ca) for x, y in P]


def _centroid(P):
    A = _area(P)
    if abs(A) < 1e-9: return (sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P))
    cx = cy = 0
    for i in range(len(P)):
        x1, y1 = P[i]; x2, y2 = P[(i + 1) % len(P)]; k = x1 * y2 - x2 * y1; cx += (x1 + x2) * k; cy += (y1 + y2) * k
    return (cx / (6 * A), cy / (6 * A))


def square_poly(P, rect_fill=0.82):
    """rotate a footprint to 0 deg around its centroid (orientation = min-area bounding box, folded to +-45 deg).
    Near-rectangular footprints (area / OBB area >= rect_fill) become the exact axis-aligned OBB rectangle; others keep
    their shape, just turned square to the grid. returns (newP, angle_deg, is_rect)"""
    P = [tuple(v) for v in P]
    if len(P) < 3: return [list(v) for v in P], 0.0, False
    best = None
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]
        if math.hypot(b[0] - a[0], b[1] - a[1]) < 0.3: continue
        th = math.atan2(b[1] - a[1], b[0] - a[0]); th = (th + math.pi / 4) % (math.pi / 2) - math.pi / 4
        R = _rot(P, (0, 0), -th); xs = [p[0] for p in R]; ys = [p[1] for p in R]; ar = (max(xs) - min(xs)) * (max(ys) - min(ys))
        if best is None or ar < best[0] - 1e-6: best = (ar, th)
    th = best[1]; c = _centroid(P); R = _rot(P, c, -th)
    xs = [p[0] for p in R]; ys = [p[1] for p in R]; box = (max(xs) - min(xs)) * (max(ys) - min(ys))
    if box > 0 and abs(_area(P)) / box >= rect_fill:
        R = [(min(xs), min(ys)), (max(xs), min(ys)), (max(xs), max(ys)), (min(xs), max(ys))]; rect = True
    else:   # snap almost-axis edges exactly (vertex coordinates of near-horizontal / near-vertical edges averaged)
        R = [list(p) for p in R]; rect = False
        for _ in range(2):
            for i in range(len(R)):
                a, b = R[i], R[(i + 1) % len(R)]; dx, dy = b[0] - a[0], b[1] - a[1]
                if abs(dy) <= abs(dx) * 0.18: m = (a[1] + b[1]) / 2; a[1] = b[1] = m
                elif abs(dx) <= abs(dy) * 0.18: m = (a[0] + b[0]) / 2; a[0] = b[0] = m
    return [[round(x, 2), round(y, 2)] for x, y in R], math.degrees(th), rect


def straighten_roads(segs, cap=1.6, tol_deg=14.0, iters=40):
    """segs: list of polylines given as lists of node keys; pos: dict key -> [x, y] (tile coords, edited in place).
    Near-axis segments (within tol_deg of horizontal / vertical) are pulled to exact H / V by moving their end nodes
    toward a shared coordinate; diagonal segments within tol_deg of 45 deg are pulled to a clean 45. Shared nodes move
    once for every road using them, so junctions stay connected. Each node moves at most `cap` tiles."""
    def run(pos, fixed=()):
        orig = {k: tuple(v) for k, v in pos.items()}
        for _ in range(iters):
            acc = {}
            for pl in segs:
                for a, b in zip(pl, pl[1:]):
                    if a == b: continue
                    (x1, y1), (x2, y2) = pos[a], pos[b]; dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy)
                    if L < 0.5: continue
                    ang = math.degrees(math.atan2(abs(dy), abs(dx)))
                    if ang < tol_deg: m = (y1 + y2) / 2; acc.setdefault(a, []).append((None, m)); acc.setdefault(b, []).append((None, m))
                    elif ang > 90 - tol_deg: m = (x1 + x2) / 2; acc.setdefault(a, []).append((m, None)); acc.setdefault(b, []).append((m, None))
                    elif abs(ang - 45) < tol_deg * 0.6:   # clean 45: move both ends along the perpendicular
                        s = 1 if dx * dy > 0 else -1; u = (dx + s * dy) / 2; tx, ty = u, s * u
                        ex, ey = (dx - tx) / 2, (dy - ty) / 2
                        acc.setdefault(a, []).append(('d', (x1 + ex, y1 + ey))); acc.setdefault(b, []).append(('d', (x2 - ex, y2 - ey)))
            moved = 0
            for k, lst in acc.items():
                if k in fixed: continue
                xs = [v[0] for v in lst if v[0] is not None and v[0] != 'd']; ys = [v[1] for v in lst if v[1] is not None and v[0] != 'd']
                ds = [v[1] for v in lst if v[0] == 'd']
                x, y = pos[k]
                if ds and not xs and not ys: x = sum(d[0] for d in ds) / len(ds); y = sum(d[1] for d in ds) / len(ds)
                if xs: x = sum(xs) / len(xs)
                if ys: y = sum(ys) / len(ys)
                ox, oy = orig[k]; d = math.hypot(x - ox, y - oy)
                if d > cap: x, y = ox + (x - ox) * cap / d, oy + (y - oy) * cap / d
                moved = max(moved, abs(x - pos[k][0]) + abs(y - pos[k][1])); pos[k] = [x, y]
            if moved < 1e-3: break
        return pos
    return run

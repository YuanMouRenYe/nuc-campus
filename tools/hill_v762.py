"""v7.6.2 二龙山 continuous climbing route.

Problem (user: 「二龙山这里上山路是断着的 根本上不去」): the v6 stepped terraces turn every contour band edge into a 1.5-tile
terrace wall (blocking). Stairs were only cut where a path cell lay exactly on the wall face, widened sideways by half a
tile. Where a path crosses a wall obliquely, bends at the wall, or the OSM steps way stops a little short of the wall,
the flight ended against the cliff (or left a gap narrower than the player's 0.6 x 0.35 tile footprint), so the route
from the foot of the hill to the 二龙山长廊 broke into islands.

Fix (run on the final class raster, sub-cell resolution):
 1. carve(): along every hill footway / path / steps polyline, any TERRACE cell within ~0.9 tile of the line becomes
    STEPS (the flight is extended through the wall and lands on the next level).
 2. connect(): the route network (PATH / STEPS cells on the hill, footprint-feasible) is flood-labelled; every route
    island that is not joined to the main network gets the cheapest crossing (Dijkstra, walls cost 6, open ground 1,
    within 14 tiles) carved as a 1.75-tile-wide stair. Repeats until one network remains.
Pure python / numpy (no scipy).
"""
import heapq
from collections import deque
import numpy as np

FOOT = ((-1, -1), (0, -1), (1, -1), (-1, 0), (0, 0), (1, 0))   # player footprint in sub-cells (as tests/v7 item hill)


def feasible(walk):
    """bool: the player's footprint centred at this sub-cell is free."""
    H, W = walk.shape; F = np.zeros_like(walk)
    F[1:, 1:-1] = walk[1:, 1:-1] & walk[1:, :-2] & walk[1:, 2:] & walk[:-1, 1:-1] & walk[:-1, :-2] & walk[:-1, 2:]
    return F


def label(mask):
    H, W = mask.shape; lab = np.zeros(mask.shape, np.int32); n = 0; m = mask.ravel(); L = lab.ravel()
    for s in np.flatnonzero(m):
        if L[s]: continue
        n += 1; L[s] = n; q = deque([s])
        while q:
            i = q.popleft(); x = i % W
            for j in ((i - 1) if x else -1, (i + 1) if x < W - 1 else -1, i - W, i + W):
                if 0 <= j < H * W and m[j] and not L[j]: L[j] = n; q.append(j)
    return lab, n


def _disk(a, x, y, r, src, dst):
    H, W = a.shape
    y0, y1, x0, x1 = max(0, int(y - r)), min(H, int(y + r) + 1), max(0, int(x - r)), min(W, int(x + r) + 1)
    if y0 >= y1 or x0 >= x1: return 0
    yy, xx = np.mgrid[y0:y1, x0:x1]; m = ((yy - y) ** 2 + (xx - x) ** 2 <= r * r) & np.isin(a[y0:y1, x0:x1], src)
    a[y0:y1, x0:x1][m] = dst; return int(m.sum())


def carve(a, C, SUB, lines, r=3.6):
    """lines: tile polylines. TERRACE within r sub-cells of a line -> STEPS."""
    n = 0
    for P in lines:
        for (ax, ay), (bx, by) in zip(P, P[1:]):
            L = max(1, int(np.hypot(bx - ax, by - ay) * SUB * 2))
            for k in range(L + 1):
                t = k / L; n += _disk(a, (ax + (bx - ax) * t) * SUB, (ay + (by - ay) * t) * SUB, r, [C['TERRACE']], C['STEPS'])
    return n


def route_mask(a, C, win):
    R = np.zeros(a.shape, bool); R[win] = np.isin(a[win], [C['PATH'], C['STEPS']])
    g = R.copy(); g[1:] |= R[:-1]; g[:-1] |= R[1:]; g[:, 1:] |= R[:, :-1]; g[:, :-1] |= R[:, 1:]   # path verge (1 sub-cell)
    return g


def connect(a, C, SUB, win, seed, blocking, min_cells=24, reach=14, log=None, E=None):
    """Join every hill route island to the network containing `seed` (sub-cell (x, y)). Returns carved crossings."""
    done = []; skip = set()
    for _ in range(80):
        walk = ~np.isin(a, blocking); F = feasible(walk) & route_mask(a, C, win)
        lab, n = label(F); cnt = np.bincount(lab.ravel(), minlength=n + 1)
        # the main network: the seed's island plus every island that leaves the window (joined to the campus outside)
        ys_, xs_ = win; edge = set(np.unique(np.concatenate([lab[ys_.start, xs_], lab[ys_.stop - 1, xs_], lab[ys_, xs_.start], lab[ys_, xs_.stop - 1]]))) - {0}
        mains = edge | ({int(lab[seed[1], seed[0]])} - {0})
        if E is not None:   # v7.6.2: every island that climbs the hill must join the summit's own island
            sk = np.unique(lab[seed[1] - 12:seed[1] + 13, seed[0] - 12:seed[0] + 13]); sk = sk[sk > 0]
            top = int(sk[np.argmax(cnt[sk])]) if len(sk) else int(cnt[1:].argmax()) + 1
            if not hasattr(connect, '_hz') or connect._hz[0] is not E:
                z = E >= 1
                for _ in range(8 * SUB): z[1:] |= z[:-1].copy(); z[:-1] |= z[1:].copy(); z[:, 1:] |= z[:, :-1].copy(); z[:, :-1] |= z[:, 1:].copy()
                connect._hz = (E, z)
            onhill = set(np.unique(lab[connect._hz[1] & (lab > 0)]))   # islands on the hill or within 8 tiles of its foot
            mains = {top}; offhill = {k for k in range(1, n + 1) if k not in onhill}   # off-hill islands are not ours to join
        else: offhill = set()
        if not mains: mains = {int(cnt[1:].argmax()) + 1}
        MM = np.isin(lab, list(mains))
        isl = [k for k in range(1, n + 1) if k not in mains and k not in offhill and cnt[k] >= min_cells and int(np.flatnonzero((lab == k).ravel())[0]) not in skip]
        if not isl: break
        k = max(isl, key=lambda k: cnt[k])
        # Dijkstra from the island through anything except buildings / water / rail; walls are expensive
        H, W = a.shape; ys, xs = np.nonzero(lab == k)
        bx0, by0 = max(0, xs.min() - reach * SUB), max(0, ys.min() - reach * SUB)
        bx1, by1 = min(W, xs.max() + reach * SUB + 1), min(H, ys.max() + reach * SUB + 1)
        sub = a[by0:by1, bx0:bx1]; sl = lab[by0:by1, bx0:bx1]; h, w = sub.shape
        cost = np.where(sub == C['TERRACE'], 6, 1).astype(np.int32)
        cost[np.isin(sub, [C['BUILDING'], C['WATER'], C['RAIL'], C['CLIFF']])] = 0   # impassable
        dist = np.full(h * w, 1 << 30, np.int64); prev = np.full(h * w, -1, np.int64); pq = []
        for y, x in zip(ys - by0, xs - bx0): i = y * w + x; dist[i] = 0; heapq.heappush(pq, (0, i))
        goal = -1; S = sl.ravel(); MS = MM[by0:by1, bx0:bx1].ravel(); cr = cost.ravel()
        while pq:
            d, i = heapq.heappop(pq)
            if d > dist[i]: continue
            if MS[i]: goal = i; break
            x = i % w
            for j in ((i - 1) if x else -1, (i + 1) if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < h * w and cr[j]:
                    nd = d + cr[j]
                    if nd < dist[j]: dist[j] = nd; prev[j] = i; heapq.heappush(pq, (nd, j))
        if goal < 0:
            if log is not None: log.append(('unjoinable', int(cnt[k])))
            skip.add(int(np.flatnonzero((lab == k).ravel())[0])); continue
        path = []; i = goal
        while i >= 0: path.append((i % w + bx0, i // w + by0)); i = prev[i]
        walls = 0
        for (x, y) in path: walls += _disk(a, x, y, 3.6, [C['TERRACE']], C['STEPS'])
        for (x, y) in path[::3]: _disk(a, x, y, 1.6, [C['WOOD'], C['DEEPWOOD'], C['GRASS'], C['HILL'], C['BARE']], C['PATH'])
        done.append(dict(island=int(cnt[k]), at=[float(round(path[len(path) // 2][0] / SUB, 1)), float(round(path[len(path) // 2][1] / SUB, 1))], len=round(len(path) / SUB, 1), wall_cells=walls))
    return done


def stair_ends(a, C, win):
    """STEPS segments on the hill: list of (top (x, y), bottom (x, y)) sub-cell positions."""
    S = np.zeros(a.shape, bool); S[win] = a[win] == C['STEPS']
    lab, n = label(S); out = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) < 12: continue
        it, ib = ys.argmin(), ys.argmax(); out.append(((int(xs[it]), int(ys[it])), (int(xs[ib]), int(ys[ib]))))
    return out


def carve_raster(a, C, win, r=4):
    """Every TERRACE cell within r sub-cells of a hill PATH / STEPS cell becomes STEPS: wherever a walkway meets a
    terrace wall, the wall is opened at least 2 tiles wide and the flight runs through the full wall thickness."""
    R = np.zeros(a.shape, bool); R[win] = np.isin(a[win], [C['PATH'], C['STEPS']])
    D = R.copy(); H, W = a.shape
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r or (dx == 0 and dy == 0): continue
            ys, yd = (slice(0, H - dy), slice(dy, H)) if dy >= 0 else (slice(-dy, H), slice(0, H + dy))
            xs, xd = (slice(0, W - dx), slice(dx, W)) if dx >= 0 else (slice(-dx, W), slice(0, W + dx))
            D[yd, xd] |= R[ys, xs]
    m = D & (a == C['TERRACE']); m2 = np.zeros_like(m); m2[win] = m[win]; a[m2] = C['STEPS']
    return int(m2.sum())


def trailheads(a, C, E, SUB):
    """Foot of each climbing walkway: walkway cells on the lowest band (0) right below the first terrace (band >= 1).
    Returns tile points (one per foot)."""
    up = E >= 1; d = up.copy()
    for _ in range(3): d[1:] |= d[:-1].copy(); d[:-1] |= d[1:].copy(); d[:, 1:] |= d[:, :-1].copy(); d[:, :-1] |= d[:, 1:].copy()
    foot = np.isin(a, [C['PATH'], C['STEPS'], C['ROAD']]) & (E == 0) & d
    lab, n = label(foot); out = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) < 6: continue
        j = int(np.argmin((xs - xs.mean()) ** 2 + (ys - ys.mean()) ** 2)); out.append([round(int(xs[j]) / SUB, 2), round(int(ys[j]) / SUB, 2)])
    return out

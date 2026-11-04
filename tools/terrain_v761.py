"""v7.6.1 terrain: real elevation from a public DEM, quantized into terraces.

DEM: Mapzen / Tilezen "Terrarium" terrain tiles on AWS Open Data (s3://elevation-tiles-prod, z15), which over China
are derived from SRTM (NASA / USGS, public domain). Tiles are cached in data/dem/ (fetched by tools/fetch_dem.py).
Attribution: "Terrain tiles: Mapzen / Tilezen (AWS Open Data), SRTM data courtesy of NASA / USGS."

The DEM is ~30 m native, so it is smoothed (~10 m) and only the big shape is used. Levels every STEP metres.
"""
import math, os
import numpy as np
from PIL import Image

Z = 15
STEP = 3.0        # metres per terrace level
FACE = 4          # sub-cells (1 tile) of visible wall below each step up (二龙山 uses 6)
RAMP_W = 2.5      # tiles: half-width of the ramp shading on paved ground either side of a level line

def load_dem(D):
    d = os.path.join(D, 'dem'); tiles = {}
    for f in os.listdir(d):
        if f.startswith('t15_') and f.endswith('.png'):
            _, x, y = f[:-4].split('_'); a = np.array(Image.open(os.path.join(d, f)).convert('RGB')).astype(np.float64)
            tiles[(int(x), int(y))] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    xs = sorted({k[0] for k in tiles}); ys = sorted({k[1] for k in tiles})
    A = np.zeros((256 * len(ys), 256 * len(xs)))
    for (x, y), t in tiles.items(): A[(y - ys[0]) * 256:(y - ys[0] + 1) * 256, (x - xs[0]) * 256:(x - xs[0] + 1) * 256] = t
    return A, xs[0], ys[0]

def merc(lat, lon):
    n = 2 ** Z; x = (lon + 180) / 360 * n
    y = (1 - np.log(np.tan(np.radians(lat)) + 1 / np.cos(np.radians(lat))) / math.pi) / 2 * n
    return x, y

def bilinear(A, px, py):
    x0 = np.clip(np.floor(px).astype(int), 0, A.shape[1] - 2); y0 = np.clip(np.floor(py).astype(int), 0, A.shape[0] - 2)
    u = px - x0; v = py - y0
    return A[y0, x0] * (1 - u) * (1 - v) + A[y0, x0 + 1] * u * (1 - v) + A[y0 + 1, x0] * (1 - u) * v + A[y0 + 1, x0 + 1] * u * v

def box(a, r):
    p = np.pad(a, r, mode='edge'); c = np.cumsum(np.cumsum(p, 0), 1); c = np.pad(c, ((1, 0), (1, 0)))
    k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def height_tiles(D, W, H, inv):
    """inv(x, y) -> (lat, lon) for tile coords. Returns smoothed height (m) per tile."""
    A, mx0, my0 = load_dem(D)
    yy, xx = np.mgrid[0:H, 0:W] + 0.5
    lat, lon = inv(xx, yy)
    px, py = merc(lat, lon); px = (px - mx0) * 256 - 0.5; py = (py - my0) * 256 - 0.5
    h = bilinear(A, px, py)
    for _ in range(3): h = box(h, 4)      # 3 box passes ~ gaussian sigma ~ 4.5 tiles (~11 m): removes building bumps
    return h

def upsample(h, SUB, shape):
    H, W = h.shape
    sy, sx = np.mgrid[0:shape[0], 0:shape[1]]
    tx = (sx + 0.5) / SUB - 0.5; ty = (sy + 0.5) / SUB - 0.5
    return bilinear(h, np.clip(tx, 0, W - 1.001), np.clip(ty, 0, H - 1.001))

def apply(a, C, SUB, h_t, excl_t, seed, min_pocket=6):
    """a: class array (sub-cells). Returns (new classes, terrain RGB, stats)."""
    gh, gw = a.shape
    hs = upsample(h_t, SUB, a.shape)
    base = math.floor(float(h_t.min()) / STEP) * STEP
    lev = np.floor((hs - base) / STEP).astype(np.int32)
    excl = np.kron(excl_t.astype(np.uint8), np.ones((SUB, SUB), np.uint8))[:gh, :gw].astype(bool)
    NATC = [C['GRASS'], C['WOOD'], C['DEEPWOOD'], C['HILL'], C['BARE']]
    NAT = np.isin(a, NATC) & ~excl
    face = np.zeros(a.shape, bool); edge = np.zeros(a.shape, bool)
    for k in range(1, FACE + 1): face[k:, :] |= lev[:-k, :] > lev[k:, :]
    edge[:, 1:] |= lev[:, :-1] != lev[:, 1:]; edge[:, :-1] |= lev[:, 1:] != lev[:, :-1]
    edge[:-1, :] |= lev[1:, :] > lev[:-1, :]
    new = a.copy()
    new[(face | edge) & NAT] = C['TERRACE']
    # footpaths crossing a wall that faces you become a flight of stairs (widened half a tile each side)
    WALKP = np.isin(a, [C['PATH'], C['STEPS']]) & ~excl
    # sidewalks running beside a road follow the road's ramp instead of getting stairs
    rd = a == C['ROAD']; near = rd.copy()
    for _ in range(6): n2 = near.copy(); n2[1:] |= near[:-1]; n2[:-1] |= near[1:]; n2[:, 1:] |= near[:, :-1]; n2[:, :-1] |= near[:, 1:]; near = n2
    WALKP &= ~near
    wf = face & WALKP; dil = wf.copy()
    for k in (1, 2): dil[:, k:] |= wf[:, :-k]; dil[:, :-k] |= wf[:, k:]
    new[dil & face & (NAT | WALKP)] = C['STEPS']
    m = dil & edge & NAT & ~face; new[m] = a[m]
    # ramps: paved ground near a level line gets slope shading (t = 0 top .. 1 bottom) + a downhill direction
    gy, gx = np.gradient(hs)            # metres per sub-cell
    g = np.hypot(gx, gy) * SUB          # metres per tile
    frac = (hs - base) / STEP - lev
    d = np.minimum(frac, 1 - frac) * STEP / np.maximum(g, 1e-3)   # tiles to the nearest level line
    paved = np.isin(new, [C['ROAD'], C['PATH']]) & ~excl   # v7.6.2: plazas, parking and aprons stay flat (no ramp tint at all)
    ramp = paved & (d < RAMP_W) & (g > 0.02)
    t = np.where(frac < 0.5, 0.5 - 0.5 * d / RAMP_W, 0.5 + 0.5 * d / RAMP_W)
    ang = np.arctan2(-gy, -gx)          # downhill, screen coords (y down)
    di = (np.round(ang / (math.pi / 4)).astype(np.int32) % 8) + 1
    # connectivity: no walkable pocket may be cut off by the new walls (checked at half-tile resolution)
    BLK = [C['BUILDING'], C['WATER'], C['CLIFF'], C['RAIL'], C['TERRACE']]
    from PIL import ImageDraw
    def coarse(cl):
        b = np.isin(cl, BLK); hh, ww = gh // 2 * 2, gw // 2 * 2
        b = b[:hh, :ww].reshape(hh // 2, 2, ww // 2, 2).any(axis=(1, 3)); return b
    def reach(b):
        sx_, sy_ = seed[0] * SUB // 2, seed[1] * SUB // 2
        for r_ in range(0, 40):
            ok = [(sx_ + dx, sy_ + dy) for dx in range(-r_, r_ + 1) for dy in range(-r_, r_ + 1) if not b[sy_ + dy, sx_ + dx]]
            if ok: sx_, sy_ = ok[0]; break
        im = Image.fromarray(np.where(b, 0, 255).astype(np.uint8)).copy(); ImageDraw.floodfill(im, (sx_, sy_), 128, thresh=0)
        return np.array(im) == 128
    b0 = coarse(a); r0 = reach(b0); carved = 0; npock = 0
    for it in range(400):
        b1 = coarse(new); r1 = reach(b1)
        pock = r0 & ~b1 & ~r1
        if not pock.any(): break
        im = Image.fromarray(np.where(b1, 0, 255).astype(np.uint8)).copy()
        ys, xs = np.nonzero(pock); done = False
        for k in range(0, len(ys)):
            y0, x0 = int(ys[k]), int(xs[k])
            if im.getpixel((x0, y0)) != 255: continue
            ImageDraw.floodfill(im, (x0, y0), 64, thresh=0)
            comp = np.array(im) == 64
            size = int(comp.sum())
            im = Image.fromarray(np.where(comp, 10, np.array(im)).astype(np.uint8)).copy()
            if size < min_pocket: continue
            # BFS from the pocket through wall-only cells to the reachable area
            from collections import deque
            wallonly = b1 & ~b0
            cy, cx = np.nonzero(comp); q = deque(); prev = {}
            for yy_, xx_ in zip(cy, cx): prev[(yy_, xx_)] = None; q.append((yy_, xx_))
            hit = None
            while q and hit is None:
                y_, x_ = q.popleft()
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y_ + dy, x_ + dx
                    if (ny, nx) in prev or not (0 <= ny < b1.shape[0] and 0 <= nx < b1.shape[1]): continue
                    if r1[ny, nx]: hit = (y_, x_); prev[(ny, nx)] = (y_, x_); break
                    if wallonly[ny, nx] and len(prev) < 200000: prev[(ny, nx)] = (y_, x_); q.append((ny, nx))
            if hit is None: continue
            node = hit; path = []
            while node is not None and not comp[node]: path.append(node); node = prev[node]
            for (py_, px_) in path:
                for oy in (-1, 0, 1):
                    for ox in (-1, 0, 1):
                        sy0, sx0 = (py_ + oy) * 2, (px_ + ox) * 2
                        blk = new[sy0:sy0 + 2, sx0:sx0 + 2]; fc = face[sy0:sy0 + 2, sx0:sx0 + 2]; orig = a[sy0:sy0 + 2, sx0:sx0 + 2]
                        w_ = blk == C['TERRACE']; blk[w_ & fc] = C['STEPS']; blk[w_ & ~fc] = orig[w_ & ~fc]
            carved += 1; done = True
        npock += 1
        if not done: break
    stats_pockets = int((r0 & ~coarse(new) & ~reach(coarse(new))).sum())
    rgb = np.zeros(a.shape + (3,), np.uint8)
    rgb[..., 0] = np.where(excl, 0, np.clip(lev + 1, 1, 255))
    rgb[..., 1] = np.where(ramp, np.clip(1 + t * 254, 1, 255), 0).astype(np.uint8)
    rgb[..., 2] = np.where(ramp, di, 0)
    stats = dict(base=base, levels=int(lev[~excl].max() - lev[~excl].min() + 1) if (~excl).any() else 0, walls=int(((new == C['TERRACE']) & ~excl).sum()),
                 stairs=int(((new == C['STEPS']) & (a != C['STEPS'])).sum()), ramp=int(ramp.sum()), carved=carved, left_cells=stats_pockets, reach_before=int(r0.sum()))
    return new, rgb, lev, stats

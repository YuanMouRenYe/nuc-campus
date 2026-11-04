"""v7.6.1: the four big slopes the user named, drawn as continuous road ramps on top of the DEM terraces.

Each slope is one or more polylines (tile coords) along the real road. Paved cells (road / footway / plaza / parking /
apron) within `w` tiles of a polyline get ramp shading + hatching for their whole length, with the downhill direction
taken from the DEM height along the polyline (plus an assumed `dip` for the cut under the rail bridge), and the
natural cells right beside the paved strip get a low stone side wall (drawn only, not blocking, so lawns stay open).
Heights are from the same Terrarium / SRTM DEM as terrain_v761 (smoothed ~10 m); the rail-bridge dip is assumed.
"""
import math
import numpy as np

SLOPES = [
    dict(id='slope1', spot=(241.2, 366.0), name='南区铁路桥下坡', w=2.6,
         lines=[[(240.6, 361.0, 0.0), (241.25, 372.2, 3.0), (242.15, 378.2, 3.0), (243.6, 391.0, 0.0)]],
         a=(241.0, 362.0), b=(242.0, 375.2), c=(243.6, 391.0),
         txt='南北大路从北往南一路下坡，到铁路桥下是最低点（路面下沉，坡度为假设），出桥后再爬上 15号楼前。'),
    dict(id='slope2', mono=True, spot=(282.5, 420.0), name='1.5道门 → 二道门 长坡', w=2.4,
         lines=[[(284.6, 478.0), (283.9, 452.0), (283.0, 430.0), (281.2, 410.0), (280.0, 395.0), (279.0, 385.0), (277.6, 370.0), (276.9, 361.5)]],
         a=(284.6, 477.4), b=(276.85, 361.6),
         txt='从 1.5道门进来往北走，一路慢慢爬坡到二道门（大柳树）。'),
    dict(id='slope3', mono=True, spot=(530.0, 55.5), name='软件实验大楼 ↔ 兵器陈列馆 高差', w=2.2,
         lines=[[(560.2, 27.0), (559.6, 50.0), (559.2, 79.0)], [(497.6, 27.0), (497.0, 50.0), (496.0, 72.0)]],
         a=(527.0, 34.0), b=(536.0, 67.0),
         txt='北区：软件实验大楼在高处，兵器教学陈列馆在低处，两边的南北路都是坡。'),
    dict(id='slope4', mono=True, spot=(495.5, 112.0), name='瑾瑜国际会议中心 → 兵器陈列馆 爬坡', w=2.4,
         lines=[[(498.6, 153.0), (497.0, 132.0), (495.4, 110.0), (494.0, 92.0), (492.6, 80.0), (492.4, 73.0)],
                [(489.0, 73.2), (505.0, 75.4), (520.0, 77.4), (536.0, 79.6), (548.0, 81.0)]],
         a=(511.5, 128.0), b=(536.0, 67.0),
         txt='从瑾瑜国际会议中心（科学楼群西侧）沿科学楼西路一路往北爬坡，到银杏大道再到兵器教学陈列馆门前。学校基建部列有“科学楼西路、挡土墙及边坡工程”。'),
]
JINYU = dict(name='瑾瑜国际会议中心', x=511.5, y=128.0,
             txt='瑾瑜国际会议中心：现代分析测试中心（科学楼 A/B/C 座 + 瑾瑜国际会议中心）的一部分，地上一层、局部二层，用于会议、会展和科研院办公。'
                 '位置按卫星图上科学楼群西侧的低层会议厅推定（近似）。')
SRC = ['https://admin.qy-office.com/shtml/zbdx/20240906/283.shtml (中北大学报：现代分析测试中心 = 科学楼 A/B/C + 瑾瑜国际会议中心；新北区建筑“依地势而建”)',
       'https://jbjsc.nuc.edu.cn/ (基本建设部：科学楼西路、挡土墙及边坡工程)']
PAVED = ('ROAD', 'PATH')   # v7.6.2: plazas / parking / aprons are flat - never part of a slope strip
NATW = ('GRASS', 'WOOD', 'DEEPWOOD', 'HILL', 'BARE', 'TERRACE')
DIRS = [(1, 0), (0.7071, 0.7071), (0, 1), (-0.7071, 0.7071), (-1, 0), (-0.7071, -0.7071), (0, -1), (0.7071, -0.7071)]


def hat(ht, x, y):
    x = min(max(x, 0), ht.shape[1] - 1.001); y = min(max(y, 0), ht.shape[0] - 1.001)
    x0, y0 = int(x), int(y); u, v = x - x0, y - y0
    return float(ht[y0, x0] * (1 - u) * (1 - v) + ht[y0, x0 + 1] * u * (1 - v) + ht[y0 + 1, x0] * (1 - u) * v + ht[y0 + 1, x0 + 1] * u * v)


def profile(sl, ht):
    """(h_top, h_bottom, rise) of a slope from the DEM (+ dip)."""
    hs = []
    for L in sl['lines']:
        for p in L: hs.append(hat(ht, p[0], p[1]) - (p[2] if len(p) > 2 else 0.0))
    return max(hs), min(hs)


def apply(a, C, SUB, terr, ht, slopes=SLOPES):
    """Paint corridor ramps into terr (H x W x 3 uint8 at sub-cell res). Returns per-slope stats."""
    H, W = a.shape; paved = np.isin(a, [C[k] for k in PAVED if k in C]); natw = np.isin(a, [C[k] for k in NATW if k in C])
    stats = []
    for sl in slopes:
        n_ramp = n_wall = 0; hmax, hmin = profile(sl, ht); span = max(0.5, hmax - hmin)
        for L in sl['lines']:
            P = [(p[0], p[1], hat(ht, p[0], p[1]) - (p[2] if len(p) > 2 else 0.0)) for p in L]
            if sl.get('mono'):  # one even grade between the DEM heights at the two ends (the ~10 m DEM wobbles by < 0.5 m in between)
                arc = [0.0]
                for q0, q1 in zip(P, P[1:]): arc.append(arc[-1] + math.hypot(q1[0] - q0[0], q1[1] - q0[1]))
                P = [(q[0], q[1], P[0][2] + (P[-1][2] - P[0][2]) * arc[k] / arc[-1]) for k, q in enumerate(P)]
            for (x0, y0, h0), (x1, y1, h1) in zip(P, P[1:]):
                dx, dy = x1 - x0, y1 - y0; Ls = math.hypot(dx, dy)
                k0 = [q[:2] for q in P].index((x0, y0)); dips = [(L[k][2] if len(L[k]) > 2 else 0.0) for k in (k0, k0 + 1)]
                if Ls < 1e-6 or abs(h1 - h0) < 0.15 or (dips[0] > 0 and dips[0] == dips[1]): continue   # flat piece (the road under the bridge deck)
                ux, uy = dx / Ls, dy / Ls
                if h1 > h0: ux, uy = -ux, -uy                            # unit vector pointing downhill
                d = max(range(8), key=lambda k: DIRS[k][0] * ux + DIRS[k][1] * uy) + 1
                w = sl['w']
                gx0, gx1 = int((min(x0, x1) - w - 1) * SUB), int((max(x0, x1) + w + 1) * SUB) + 1
                gy0, gy1 = int((min(y0, y1) - w - 1) * SUB), int((max(y0, y1) + w + 1) * SUB) + 1
                gx0, gy0 = max(0, gx0), max(0, gy0); gx1, gy1 = min(W, gx1), min(H, gy1)
                yy, xx = np.mgrid[gy0:gy1, gx0:gx1]; px = (xx + 0.5) / SUB; py = (yy + 0.5) / SUB
                s = ((px - x0) * dx + (py - y0) * dy) / (Ls * Ls); sc = np.clip(s, 0, 1)
                dist = np.hypot(px - (x0 + sc * dx), py - (y0 + sc * dy))
                inside = (dist <= w) & (s >= -0.02) & (s <= 1.02)
                hh = h0 + sc * (h1 - h0); t = np.clip(0.12 + 0.76 * (hmax - hh) / span, 0.02, 0.98)
                sub = np.s_[gy0:gy1, gx0:gx1]
                m = inside & paved[sub]
                terr[sub][..., 1][m] = (1 + t[m] * 254).astype(np.uint8); terr[sub][..., 2][m] = d | 16; n_ramp += int(m.sum())
                # low side wall: natural cells touching the paved strip, just outside it
                pm = np.zeros((H, W), bool); pm[sub] = m
                ring = pm.copy()
                for _ in range(2):  # two sub-cells (8 px) thick
                    r2 = ring.copy(); r2[1:] |= ring[:-1]; r2[:-1] |= ring[1:]; r2[:, 1:] |= ring[:, :-1]; r2[:, :-1] |= ring[:, 1:]; ring = r2 & (natw | pm)
                ring &= natw & ~pm
                rs = ring[sub] & (dist <= w + 1.0); terr[sub][..., 2][rs] = 32; terr[sub][..., 1][rs] = 0; n_wall += int(rs.sum())
        stats.append(dict(id=sl['id'], name=sl['name'], top=round(hmax, 1), bottom=round(hmin, 1), rise=round(hmax - hmin, 1), ramp=n_ramp, side=n_wall))
    return stats

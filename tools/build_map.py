#!/usr/bin/env python3
"""Convert raw OSM (data/osm_map.xml) + hand-traced supplement (data/supplement_px.json)
into the game's tile map: game/data/ground.png (class index per sub-cell) and game/data/map.json.
Reproducible: python3 tools/build_map.py   (needs Pillow; satellite mosaic optional, only used
for roof tint + tree hints if data/sat_z18.jpg exists)."""
import xml.etree.ElementTree as ET, json, math, os, random
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import layout_v6 as L6
import layout_v7 as L7
import layout_v71 as L71
import layout_v72 as L72
import layout_v73 as L73
import layout_v76 as L76
import layout_v761 as L761
import apply_v762 as A762   # v7.6.2: tidy layout, road clearance, 主楼/11号楼, 瑾瑜, stands, library, 西北 relabels
import clear_v762 as CL762
# v7.1 overrides (willow on the crossing, sub-area labels)
L7.WILLOW = L71.WILLOW
L7.SUBAREAS = [L71.SUBAREAS.get(n, (n, x, y)) for n, x, y in L7.SUBAREAS if n not in L72.SUBAREAS_DROP] + L71.SUBAREAS_ADD
L7.ARCADES = [dict(a, name=None) for a in L7.ARCADES]
L7.INTROS.update(L72.INTROS)
L7.SUBAREAS = L7.SUBAREAS + L76.SUBAREAS_ADD + L761.SUBAREAS_ADD
L7.FOUNTAINS = list(L7.FOUNTAINS) + [L761.GROVE['fountain']]   # v7.6.2: 柏林园 has a small pond, no fountain
import layout_v762 as L762, layout_v764 as V764
V764.early(L7, L72, L761, L762, L71)   # v7.6.4: 北门 plaza, 东看台, garage drive-through, 行知广场, 四道门 entrances swapped
for _g, _t in L72.GATE_TXT.items(): L7.REAL_GATES[_g]['txt'] = _t

_TK = L71.RAIL_TRACK
def track_y(x): (ax, ay), (bx, by) = _TK; return ay + (x - ax) * (by - ay) / (bx - ax)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'data'); OUT = os.path.join(ROOT, 'game', 'data')
os.makedirs(OUT, exist_ok=True)
LON0, LON1, LAT0, LAT1 = 112.4290, 112.4505, 38.0082, 38.0198
MPT = 2.5           # metres per tile
TILE = 16           # px per tile
SUB = 4             # ground sub-cells per tile
LATC = (LAT0 + LAT1) / 2
MX = math.cos(math.radians(LATC)) * 111320.0
MY = 110574.0
W = int(math.ceil((LON1 - LON0) * MX / MPT)); H = int(math.ceil((LAT1 - LAT0) * MY / MPT))

def proj(lat, lon):
    """lat/lon -> tile coordinates (float). x east, y south."""
    return ((lon - LON0) * MX / MPT, (LAT1 - lat) * MY / MPT)

C = dict(OUT=0, GRASS=1, WOOD=2, HILL=3, ROAD=4, PATH=5, PLAZA=6, WATER=7, PITCH=8, TRACK=9,
         COURT=10, PARKING=11, RAIL=12, BARE=13, VILLAGE=14, APRON=15, FLOWERS=16, CLIFF=17,
         BUILDING=18, STEPS=19, SAND=20, DEEPWOOD=21, TERRACE=22)

# ---------- OSM parse
r = ET.parse(os.path.join(D, 'osm_map.xml')).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in r.findall('node')}
ways = []
for w in r.findall('way'):
    t = {x.get('k'): x.get('v') for x in w.findall('tag')}
    pts = [nodes[x.get('ref')] for x in w.findall('nd') if x.get('ref') in nodes]
    if len(pts) >= 2: ways.append((w.get('id'), t, pts))
wayById = {i: (t, p) for i, t, p in ways}
pois_osm = []
for n in r.findall('node'):
    t = {x.get('k'): x.get('v') for x in n.findall('tag')}
    if t: pois_osm.append((float(n.get('lat')), float(n.get('lon')), t))

def inb(pts, pad=0.002):
    return any(LAT0 - pad < a < LAT1 + pad and LON0 - pad < b < LON1 + pad for a, b in pts)

# ---------- raster helpers (sub-cell space)
img = Image.new('L', (W * SUB, H * SUB), C['OUT'])
dr = ImageDraw.Draw(img)
def sp(pts): return [(x * SUB, y * SUB) for x, y in (proj(a, b) for a, b in pts)]
def fillpoly(pts, cls, d=dr): 
    if len(pts) >= 3: d.polygon(sp(pts), fill=cls)
def line(pts, cls, wm, d=dr):
    s = sp(pts); wpx = max(1, int(round(wm / MPT * SUB)))
    d.line(s, fill=cls, width=wpx, joint='curve')
    rr = wpx / 2
    for x, y in s: d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=cls)

uni = wayById['535200478'][1]
# base: mountain west, campus grass, outside muted
def rect_ll(la1, lo0, la0, lo1): return [(la1, lo0), (la1, lo1), (la0, lo1), (la0, lo0)]
fillpoly(rect_ll(LAT1 + .01, LON0 - .01, 38.0103, 112.4352), C['DEEPWOOD'])   # 二龙山 forest block
fillpoly(rect_ll(LAT1 + .01, 112.4352, 38.0191, LON1 + .01), C['HILL'])        # north foothills / undeveloped
fillpoly(uni, C['GRASS'])
# north of campus the polygon includes barren slope
fillpoly([(LAT1 + .01, 112.4365), (LAT1 + .01, 112.4495), (38.0193, 112.4495), (38.0193, 112.4365)], C['HILL'])
# off-campus village south of railway (east part) and east strip
fillpoly([(38.0124, 112.4462), (38.0124, 112.4492), (38.0106, 112.4492), (38.0106, 112.4462)], C['VILLAGE'])
fillpoly([(38.0157, 112.4495), (38.0157, 112.4520), (38.0136, 112.4520), (38.0136, 112.4495)], C['VILLAGE'])

areas = []
for i, t, p in ways:
    if not inb(p): continue
    closed = p[0] == p[-1]
    lu = t.get('landuse'); le = t.get('leisure'); na = t.get('natural'); am = t.get('amenity')
    if closed:
        if na == 'wood': fillpoly(p, C['WOOD'])
        elif le in ('park', 'garden') and i != '886466294': fillpoly(p, C['GRASS'])
        elif lu == 'construction': fillpoly(p, C['BARE'])
        elif am == 'parking': fillpoly(p, C['PARKING'])
        elif t.get('place') == 'square': fillpoly(p, C['PLAZA'])
for i, t, p in ways:   # pitches & water after
    if not inb(p) or p[0] != p[-1]: continue
    le = t.get('leisure'); sport = t.get('sport', '')
    if le == 'pitch' and i in L6.FIELD_OSM: continue
    if le == 'pitch':
        if sport in ('tennis', 'basketball', 'badminton'): fillpoly(p, C['COURT'])
        else:
            xs = [proj(*q) for q in p]
            area = abs(sum(xs[k][0] * xs[k - 1][1] - xs[k - 1][0] * xs[k][1] for k in range(len(xs)))) / 2 * MPT * MPT
            if area > 6000:  # football field inside athletics track
                cx = sum(a for a, b in p) / len(p); cy = sum(b for a, b in p) / len(p)
                big = [(cx + (a - cx) * 1.28, cy + (b - cy) * 1.22) for a, b in p]
                fillpoly(big, C['TRACK'])
            fillpoly(p, C['PITCH'])
    elif le == 'swimming_pool' or t.get('natural') == 'water': fillpoly(p, C['WATER'])

# Fen river (line) & ditches
for i, t, p in ways:
    if not inb(p, .01): continue
    ww = t.get('waterway')
    if ww == 'river': line(p, C['SAND'], 70); 
for i, t, p in ways:
    if not inb(p, .01): continue
    ww = t.get('waterway')
    if ww == 'river': line(p, C['WATER'], 52)
    elif ww == 'ditch' and t.get('tunnel') is None and t.get('layer') is None: line(p, C['WATER'], 2.5)

# hand-placed plazas (approximate, from imagery)
meta = json.load(open(os.path.join(D, 'crops', 'meta.json')))
def px2ll(c, x, y):
    la1, lo0, la0, lo1 = meta[c]
    return (la1 - y / 464.5 * (la1 - la0), lo0 + x / 1024 * (lo1 - lo0))
def pxrect(c, rr):
    a = px2ll(c, rr[0], rr[1]); b = px2ll(c, rr[2], rr[3])
    return [(a[0], a[1]), (a[0], b[1]), (b[0], b[1]), (b[0], a[1])]
PLAZAS = [('a2', [525, 100, 740, 360]), ('dh', [255, 110, 450, 235]), ('c1', [835, 290, 990, 330]),
          ('c1', [840, 330, 1000, 464]), ('b2', [40, 60, 160, 270]), ('d1', [845, 20, 1024, 110])]
for c, rr in PLAZAS: fillpoly(pxrect(c, rr), C['PLAZA'])
# v6: the old hand COURTS / PITCH fills are replaced by the traced FIELDS (tools/layout_v6.py), drawn after the roads
def trect(x0, y0, x1, y1, cls, d=dr): d.rectangle([x0 * SUB, y0 * SUB, x1 * SUB - 1, y1 * SUB - 1], fill=cls)
def tline(pts, cls, wm, d=dr):
    s_ = [(x * SUB, y * SUB) for x, y in pts]; wpx = max(1, int(round(wm / MPT * SUB)))
    d.line(s_, fill=cls, width=wpx, joint='curve'); rr = wpx / 2
    for x, y in s_: d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=cls)

# roads
RW = {'trunk': 16, 'primary': 14, 'secondary': 12, 'tertiary': 10, 'residential': 7, 'unclassified': 6,
      'living_street': 6, 'service': 4.5, 'track': 3.5, 'footway': 3, 'path': 2.5, 'pedestrian': 5,
      'cycleway': 3, 'steps': 3}
roads = []
tunnels = []
for i, t, p in ways:
    hw = t.get('highway')
    if not hw or hw not in RW or not inb(p): continue
    if t.get('area') == 'yes' and p[0] == p[-1]: fillpoly(p, C['PLAZA']); continue
    if t.get('tunnel') in ('yes', 'building_passage') or t.get('layer', '0').lstrip('-').isdigit() and int(t.get('layer', '0')) < 0:
        tunnels.append((i, t.get('name'), [[round(v, 2) for v in proj(a, b)] for a, b in p])); continue
    cls = C['STEPS'] if hw == 'steps' else C['PATH'] if hw in ('footway', 'path', 'pedestrian', 'cycleway', 'track') else C['ROAD']
    roads.append((RW[hw], cls, p, t))
# v7.6.2 tidy: near-axis road runs pulled straight (H / V / 45 deg, <= 1.6 tiles per node; 二龙山 trails untouched)
A762.straighten(roads, proj, lambda x, y: (LAT1 - y * MPT / MY, LON0 + x * MPT / MX), C, skip=lambda x, y: x < 240 and y < 306)
ROADMASK = CL762.road_mask(img.size, SUB, MPT, roads, proj, C['ROAD'])   # v7.6.2: carriageway + kerb + clearance
for wm, cls, p, t in sorted(roads, key=lambda q: q[0]):  # curb/edge: draw road slightly wider as path first
    if cls == C['ROAD']: line(p, C['PATH'], wm + 3)
for wm, cls, p, t in sorted(roads, key=lambda q: q[0]):
    line(p, cls, wm)
# cliffs
for i, t, p in ways:
    if t.get('natural') == 'cliff' and inb(p): line(p, C['CLIFF'], 3)
# railway (not tunnels)
rails = []
for i, t, p in ways:
    if t.get('railway') == 'rail' and inb(p, .005):
        if t.get('tunnel') == 'yes': continue
        line(p, C['RAIL'], 6); rails.append([[round(v, 2) for v in proj(a, b)] for a, b in p])
# v6: level crossing (二道门) re-paved over the rails; everywhere else the railway is fenced (blocking)
for cr in L6.CROSSINGS: tline(cr['pts'], C['PATH'], cr['w'] + 2); tline(cr['pts'], C['ROAD'], cr['w'])
# v7: 七道门 link road, 铁路主题广场 pad
for r_ in L7.GATE_ROADS: dr.rectangle([r_[0] * SUB, r_[1] * SUB, r_[2] * SUB - 1, r_[3] * SUB - 1], fill=C['ROAD'])
# v7.1: tank lawn + plinth (old rail-plaza spot), round 二道门 junction, rail-park platform (only over open ground)
# v7.5.1: the tank sits SOUTH of the 怡丁苑 field (across the road); the old north spot is just a lawn again
_tl = L71.TANK['north_lawn']; dr.rectangle([_tl[0] * SUB, _tl[1] * SUB, _tl[2] * SUB - 1, _tl[3] * SUB - 1], fill=C['GRASS'])
_tl = L71.TANK['lawn']; dr.rectangle([_tl[0] * SUB, _tl[1] * SUB, _tl[2] * SUB - 1, _tl[3] * SUB - 1], fill=C['GRASS'])
_tk = L71.TANK['link']; dr.rectangle([_tk[0] * SUB, _tk[1] * SUB, _tk[2] * SUB - 1, _tk[3] * SUB - 1], fill=C['PATH'])
_tp = L71.TANK['plinth']; dr.rectangle([_tp[0] * SUB, _tp[1] * SUB, _tp[2] * SUB - 1, _tp[3] * SUB - 1], fill=C['PLAZA'])
_a = np.array(img, dtype=np.uint8); _yy, _xx = np.mgrid[0:_a.shape[0], 0:_a.shape[1]]; _X = (_xx + .5) / SUB; _Y = (_yy + .5) / SUB
_jc, _jr = L71.JUNCTION['c'], L71.JUNCTION['r']; _d = np.hypot(_X - _jc[0], _Y - _jc[1]); _free = ~np.isin(_a, [C['RAIL'], C['BUILDING'], C['WATER']])
_a[(_d < _jr + 0.6) & (_d >= _jr) & _free & ~np.isin(_a, [C['ROAD']])] = C['PATH']; _a[(_d < _jr) & _free] = C['ROAD']
_pf = L71.RAIL_PARK['platform']; _ty = _TK[0][1] + (_X - _TK[0][0]) * (_TK[1][1] - _TK[0][1]) / (_TK[1][0] - _TK[0][0])
_a[(_X > _pf['x0']) & (_X < _pf['x1']) & (_Y > _ty + _pf['n0']) & (_Y < _ty + _pf['n1']) & np.isin(_a, [C['OUT'], C['GRASS']])] = C['PLAZA']
img.paste(Image.fromarray(_a)); del _a, _yy, _xx, _X, _Y, _d, _free, _ty
# v7.6 柏林园 (entrance square, pond, 青石小路, 长廊 floor, 凉亭 pad) + paved floors under the 南区 underpass canopies.
# Painted only over open ground so roads / rails stay exactly as they were.
_bl = L76.BAILIN; _v6 = Image.new('L', img.size, 0); _d6 = ImageDraw.Draw(_v6)
for _pp in _bl['paths']: tline(_pp, 1, _bl['path_w'] * MPT, d=_d6)
_g = _bl['gallery']; trect(_g['x0'], _g['y0'], _g['x1'], _g['y1'], 1, d=_d6)
_pv = _bl['pavilion']; trect(_pv['x'] - _pv['w'] / 2, _pv['y'] - _pv['h'] + 0.4, _pv['x'] + _pv['w'] / 2, _pv['y'] + 0.4, 2, d=_d6)
trect(*_bl['plaza'], 2, d=_d6); trect(*_bl['entry'], 2, d=_d6)
for _po in (_bl['pond'], _bl['pond']['lobe']):   # v7.6.2: small two-lobed pond beside the 文化长廊
    _pc, _pr = _po['c'], _po['r']; _d6.ellipse([(_pc[0] - _pr[0]) * SUB, (_pc[1] - _pr[1]) * SUB, (_pc[0] + _pr[0]) * SUB, (_pc[1] + _pr[1]) * SUB], fill=3)
_a = np.array(img, dtype=np.uint8); _m = np.array(_v6); _open = np.isin(_a, [C['OUT'], C['GRASS'], C['WOOD'], C['DEEPWOOD'], C['APRON'], C['PATH']] + ([C['FLOWERS']] if 'FLOWERS' in C else []))
_a[(_m == 1) & _open] = C['PATH']; _a[(_m == 2) & _open] = C['PLAZA']; _a[(_m == 3) & _open] = C['WATER']
img.paste(Image.fromarray(_a)); del _a, _m, _open, _v6, _d6
# v7.6.1: (1) the N-S road runs on under the rail bridge: RAIL cells between the road edges become ROAD (the deck is a
# sprite); (2) 地下停车场: lawn roof + vehicle ramp; (3) 小树林: paths, fountain plaza, 凉亭 pad. Open ground only.
_rb = L761.RAIL_BRIDGE; _gr = L761.GARAGE; _gv = L761.GROVE; _v6 = Image.new('L', img.size, 0); _d6 = ImageDraw.Draw(_v6)
trect(*_rb['repave'], 4, d=_d6)
trect(*_gr['roof'], 3, d=_d6); trect(*_gr['ramp'], 4, d=_d6); trect(*_gr['mouth'], 4, d=_d6)
for _pp in _gv['paths']: tline(_pp, 1, _gv['path_w'] * MPT, d=_d6)
_pc, _pr = _gv['plaza_c'], _gv['plaza_r']; _d6.ellipse([(_pc[0] - _pr) * SUB, (_pc[1] - _pr) * SUB, (_pc[0] + _pr) * SUB, (_pc[1] + _pr) * SUB], fill=2)
_pv = _gv['pavilion']; trect(_pv['x'] - _pv['w'] / 2 - .3, _pv['y'] - _pv['h'] + .1, _pv['x'] + _pv['w'] / 2 + .3, _pv['y'] + .6, 2, d=_d6)
_a = np.array(img, dtype=np.uint8); _m = np.array(_v6); _open = np.isin(_a, [C['OUT'], C['GRASS'], C['WOOD'], C['DEEPWOOD'], C['APRON'], C['PATH']] + ([C['FLOWERS']] if 'FLOWERS' in C else []))
_a[(_m == 4) & (_a == C['RAIL'])] = C['ROAD']; _a[(_m == 4) & _open] = C['ROAD']
_a[(_m == 3) & _open & (_a != C['PATH'])] = C['GRASS']
_a[(_m == 1) & _open] = C['PATH']; _a[(_m == 2) & _open] = C['PLAZA']
img.paste(Image.fromarray(_a)); del _a, _m, _open, _v6, _d6
# v6: sports fields from one template per sport. Fenced pitches get a grass margin first.
FIELDS = L6.fields()
A762.fields(FIELDS, L6, L7)   # v7.6.2: pitch inside the track's inner kerb, stands -> buildings, court pad / fences moved
A762.road_trim([], FIELDS, L7.COURT_FENCES, ROADMASK, SUB)   # fields / courts / court fences first (buildings later)
_ft = dict(A762.STATS['road_trim'])
V764.fields(FIELDS, L6, L7)   # v7.6.4: courts east, fence dropped, pads = fence rects, beach volleyball
for f in L6.FENCES:
    xs = [q[0] for q in f['pts']]; ys = [q[1] for q in f['pts']]
    dr.polygon([(x * SUB, y * SUB) for x, y in f['pts']], fill=C['GRASS'])
for f in FIELDS:
    x0, y0, x1, y1 = f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']
    cls = {'track': C['TRACK'], 'football': C['PITCH'], 'stand': C['PLAZA'], 'sand': C['SAND']}.get(f['k'], C['COURT'])
    if f['k'] == 'track':
        r = f['w'] / 2; dr.rounded_rectangle([x0 * SUB, y0 * SUB, x1 * SUB - 1, y1 * SUB - 1], radius=r * SUB, fill=cls)
        lw = f['lanes'] * 0.49; ri = r - lw
        dr.rounded_rectangle([(x0 + lw) * SUB, (y0 + lw) * SUB, (x1 - lw) * SUB - 1, (y1 - lw) * SUB - 1], radius=ri * SUB, fill=C['PITCH'])
    elif not f.get('sand'): trect(x0, y0, x1, y1, cls)
A762.gym_path(trect, C)
V764.paths(trect, C)
for _r in V764.sidaomen_links(L71): trect(*_r, C['PATH'])   # v7.6.2: footpath between the 羽毛球馆 and the basketball-court fence

# ---------- v6: 二龙山 terraces (stepped contour bands, after the v0.3.28 look)
cls_now = np.array(img, dtype=np.uint8)
TW, TH = W, H
tile_cls = cls_now[SUB // 2::SUB, SUB // 2::SUB][:TH, :TW]
hill = np.isin(tile_cls, [C['WOOD'], C['DEEPWOOD'], C['STEPS'], C['PATH']])
yy, xx = np.mgrid[0:TH, 0:TW]
hill &= (xx < 232) & (yy < 300)
# chamfer distance to the hill edge (tiles)
INF = 10 ** 6
dist = np.where(hill, INF, 0).astype(np.int64)
for y in range(TH):
    for x in range(TW):
        if dist[y, x]:
            v = dist[y, x]
            if x: v = min(v, dist[y, x - 1] + 1)
            if y: v = min(v, dist[y - 1, x] + 1)
            dist[y, x] = v
for y in range(TH - 1, -1, -1):
    for x in range(TW - 1, -1, -1):
        if dist[y, x]:
            v = dist[y, x]
            if x < TW - 1: v = min(v, dist[y, x + 1] + 1)
            if y < TH - 1: v = min(v, dist[y + 1, x] + 1)
            dist[y, x] = v
dist = np.minimum(dist, 200).astype(np.float64)
def seg_d(px_, py_, a, b):
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay
    t = np.clip(((px_ - ax) * dx + (py_ - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(px_ - ax - t * dx, py_ - ay - t * dy)
RIDGE = [(20, 128), (70, 146), (108, 163), (143, 181), (152, 190)]
rd = np.min([seg_d(xx, yy, RIDGE[k], RIDGE[k + 1]) for k in range(len(RIDGE) - 1)], axis=0)
rng = np.random.default_rng(11)
nz = rng.uniform(-1, 1, (TH // 10 + 3, TW // 10 + 3))
fx, fy = xx / 10.0, yy / 10.0; ix, iy = fx.astype(int), fy.astype(int); u, v = fx - ix, fy - iy
noise = (nz[iy, ix] * (1 - u) * (1 - v) + nz[iy, ix + 1] * u * (1 - v) + nz[iy + 1, ix] * (1 - u) * v + nz[iy + 1, ix + 1] * u * v)
hgt = np.minimum(dist * 1.6, 84 - rd) + noise * 4
band_t = np.where(hill, np.clip(np.floor(hgt / 12), 0, 6), 0).astype(np.uint8)
# sub-cell bands (nearest tile, then smooth the staircase with a 3x3 majority so contours are not blocky)
band = np.kron(band_t, np.ones((SUB, SUB), dtype=np.uint8))[:img.height, :img.width]
bimg_ = Image.fromarray(band * 30).filter(ImageFilter.ModeFilter(9))
band = (np.array(bimg_) // 30).astype(np.uint8)
NAT = np.isin(cls_now, [C['WOOD'], C['DEEPWOOD'], C['GRASS'], C['HILL']])
WALK = np.isin(cls_now, [C['PATH'], C['STEPS']])
face = np.zeros_like(band, dtype=bool); edge = np.zeros_like(face)
FACE = 6   # sub-cells (1.5 tiles) of visible terrace wall below each step up
for k in range(1, FACE + 1):
    face[k:, :] |= band[:-k, :] > band[k:, :]
edge[:, 1:] |= band[:, :-1] != band[:, 1:]
edge[:, :-1] |= band[:, 1:] != band[:, :-1]
edge[:-1, :] |= band[1:, :] > band[:-1, :]
cls_new = cls_now.copy()
cls_new[(face | edge) & NAT] = C['TERRACE']
WALK2 = WALK | (cls_now == C['ROAD'])
wf = face & WALK2; dil = wf.copy()
for k in (1, 2):   # v7: widen every flight by half a tile each side so diagonal paths get a usable stair, and roads get one too
    dil[:, k:] |= wf[:, :-k]; dil[:, :-k] |= wf[:, k:]
cls_new[dil & face & (NAT | WALK2)] = C['STEPS']
cls_new[dil & edge & NAT & ~face] = cls_now[dil & edge & NAT & ~face]
import layout_v7 as _L7s
for (fx0, fy0, fx1, fy1) in getattr(_L7s, 'STAIR_FIX', []):
    sl = (slice(int(fy0 * SUB), int(math.ceil(fy1 * SUB))), slice(int(fx0 * SUB), int(math.ceil(fx1 * SUB))))
    blk = cls_new[sl]; blk[np.isin(blk, [C['TERRACE'], C['WOOD'], C['DEEPWOOD'], C['GRASS']])] = C['STEPS']
img.paste(Image.fromarray(cls_new))
ELEV = band
print('terraces: bands', int(band.max()), 'terrace cells', int(((face | edge) & NAT).sum()))

# ---------- buildings
sat = None
if os.path.exists(os.path.join(D, 'sat_z18.jpg')):
    sat = Image.open(os.path.join(D, 'sat_z18.jpg')).convert('RGB')
    z, X0, Y0, nx, ny = map(int, open(os.path.join(D, 'sat_z18.txt')).read().split())
    def satpx(lat, lon):
        n = 2 ** z; x = (lon + 180) / 360 * n
        y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
        return (x - X0) * 256, (y - Y0) * 256
    def tile2ll(tx, ty): return (LAT1 - ty * MPT / MY, LON0 + tx * MPT / MX)
def roof_color(polyt):
    if sat is None: return None
    xs = [q[0] for q in polyt]; ys = [q[1] for q in polyt]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    acc = [0, 0, 0]; n = 0
    for dx in (-.25, 0, .25):
        for dy in (-.25, 0, .25):
            tx = cx + dx * (max(xs) - min(xs)); ty = cy + dy * (max(ys) - min(ys))
            px, py = satpx(*tile2ll(tx, ty))
            if 0 <= px < sat.width and 0 <= py < sat.height:
                c = sat.getpixel((int(px), int(py))); acc = [acc[k] + c[k] for k in range(3)]; n += 1
    return [a // max(1, n) for a in acc]

LEVELS = {'dormitory': 6, 'apartments': 6, 'university': 5, 'yes': 3, 'retail': 2, 'restaurant': 3}
KIND = {'dormitory': 'dorm', 'apartments': 'res', 'university': 'teach', 'retail': 'shop', 'restaurant': 'canteen'}
SPECIAL = {'535204584': dict(f=9, special='main', enter='main'), '543817503': dict(f=6, enter='library', k='library'),
           '543807069': dict(f=3, enter='canteen', k='canteen'), '543867978': dict(f=3, enter='canteen', k='canteen'),
           '543807070': dict(f=3, k='canteen'), '543807071': dict(f=2, k='canteen'), '544015350': dict(f=5, special='dehuai'),
           '1069150671': dict(roof='red'), '1069150672': dict(roof='red'), '543873269': dict(f=1, roof='pavilion', k='pavilion', name='二龙山长廊')}
buildings = []
def add_building(bid, name, kind, floors, pts_ll, extra=None, approx=False):
    pt = [proj(a, b) for a, b in pts_ll]
    if pt[0] == pt[-1]: pt = pt[:-1]
    xs = [q[0] for q in pt]; ys = [q[1] for q in pt]
    if max(xs) < 0 or min(xs) > W or max(ys) < 0 or min(ys) > H: return
    b = dict(id=bid, name=name, k=kind, f=floors, poly=[[round(x, 2), round(y, 2)] for x, y in pt],
             bbox=[round(min(xs), 2), round(min(ys), 2), round(max(xs), 2), round(max(ys), 2)])
    rc = roof_color(pt)
    if rc: b['rc'] = rc
    if approx: b['approx'] = True
    if extra: b.update(extra)
    buildings.append(b)
for i, t, p in ways:
    if ('building' in t or i == '543873269') and inb(p, 0) and p[0] == p[-1]:
        bt = t.get('building', 'yes')
        f = int(float(t.get('building:levels', LEVELS.get(bt, 3))))
        ex = dict(SPECIAL.get(i, {})); f = ex.pop('f', f); k = ex.pop('k', KIND.get(bt, 'low'))
        nm = ex.pop('name', t.get('name'))
        if nm in ('大学建筑',): nm = None
        add_building('w' + i, nm, k, f, p, ex)
sup = json.load(open(os.path.join(D, 'supplement_px.json')))
for n, it in enumerate(sup['items']):
    ex = {}
    if 'roof' in it: ex['roof'] = it['roof']
    add_building('s%d' % n, it.get('name'), it['k'], it['f'], pxrect(it['c'], it['r']), ex, approx=True)
# v7.6: 15号楼 · 逸夫楼 and 4号楼 · 酬学楼 (traced on the satellite mosaic; not in OSM)
def _t2ll(tx, ty): return (LAT1 - ty * MPT / MY, LON0 + tx * MPT / MX)
for _b in L76.BUILDINGS: add_building(_b['id'], _b['name'], _b['k'], _b['f'], [_t2ll(x, y) for x, y in _b['poly']], dict(intro=_b['intro']), approx=True)

# ---- verified names (see docs/NAMES.md). OFFICIAL = 中北大学校园平面图, zbzs.nuc.edu.cn/info/1002/3696.htm,
# matched to footprints by affine registration (tools/official_map_fit.py). None = deliberately left generic.
NAMES = {
    'w543807069': dict(name='食味坊', k='canteen'), 'w1069157046': dict(name='文瀛食堂', k='canteen', enter='canteen'),   # v7.6.2: 学生第一食堂 = 文瀛食堂, 学生第二食堂 = 食味坊 (user)
    'w543817501': dict(name='体育馆', k='gym', f=3, enter='gym'), 's44': dict(name=None, k='low'), 's45': dict(name='游泳馆 · 健身馆'),
    'w1069155870': dict(name='12号楼 · 鸿学楼', enter='classroom'), 'w544670356': dict(name='旧1号楼'),
    'w544670357': dict(name='9号楼 · 实验楼'), 'w544670358': dict(name='14号教学楼'), 'w1069157043': dict(name='10号楼 · 敏学楼'),
    'w1069155868': dict(name='怡丁苑1号公寓'), 'w1069155872': dict(name='文韬苑1号公寓'), 'w1069155873': dict(name='文韬苑2号公寓'),
    'w1069155874': dict(name='文韬苑4号公寓'), 'w1069155875': dict(name='文韬苑5号公寓'), 'w1069155876': dict(name='龙山餐厅', k='canteen'),
    'w1069157044': dict(name='文澜苑1号公寓'), 'w1069157045': dict(name='文澜苑2号公寓'),
    'w1069150669': dict(name=None), 'w1069150670': dict(name=None),
    'w543813345': dict(enter='dorm'),
    's25': dict(name='化学实验楼'), 's50': dict(name='老年活动中心'), 's51': dict(name='思学楼'), 's55': dict(name='测试技术实验室'),
    's56': dict(name='炮库'), 's59': dict(name='电子实验楼'), 's60': dict(name='文韬苑9号公寓', k='dorm'), 's61': dict(name='文韬苑8号公寓', k='dorm'),
    's62': dict(name='文韬苑3号公寓', k='dorm'), 's64': dict(name='训练馆'), 's16': dict(name='兵器教学陈列馆'), 's21': dict(name='教学楼18#'),
    's68': dict(name='文瀛苑1号公寓', k='dorm'), 's69': dict(name='怡丁苑单身公寓楼'), 's72': dict(name='后勤铁木中心'), 's73': dict(name='洗涤中心'),
    's74': dict(name='5号楼 · 明学楼'), 's75': dict(name='3号楼 · 诚学楼'), 'w1069155869': dict(name='工字楼'),
}
NAMES.update(L7.NAMES7)
NAMES.update(L72.NAMES)
NAMES.update({'s2': dict(name='仪器科学大楼'), 's12': dict(name='软件实验大楼'),
              's8': dict(name='半导体与能源学院楼'), 's9': dict(name='工程训练中心')})   # v7 北区: approximate, see docs/NAMES.md
for b in buildings:
    if b['id'] in NAMES:
        o = NAMES[b['id']]
        if 'name' in o: b['name'] = o['name']
        if 'k' in o: b['k'] = o['k']
        if 'f' in o: b['f'] = o['f']
        if 'enter' in o: b['enter'] = o['enter']
        for _k in ('kz', 'lookId', 'fadeGroup'):
            if _k in o: b[_k] = o[_k]
# coarse OSM '家属区' compounds relabelled from the official map (generated slabs inside stay unnamed)
ESTATE_LABEL = {'w1069155864': '西苑教工宿舍', 'w1069158509': '怡丁苑公寓', 'w1069155866': '学术交流中心',
                'w1069155865': '怡丁苑教工宿舍', 'w1069155867': None}
labels_extra = []
# estates: coarse OSM outlines around whole housing compounds -> paved compound + generated slab rows
def pip(x, y, poly):
    ins = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1: ins = not ins
    return ins
def overlaps(a, b): return not (a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1])
estates = [b for b in buildings if b.get('name') in ('家属区', '红房子')]
buildings = [b for b in buildings if b not in estates]
for e in estates:
    dr.polygon([(x * SUB, y * SUB) for x, y in e['poly']], fill=C['APRON'])
    x0, y0, x1, y1 = e['bbox']; y = y0 + 3; n = 0
    while y + 5 < y1 - 2:
        x = x0 + 2.5
        while x + 8 < x1 - 2:
            L = min(26, x1 - 2.5 - x)
            r_ = [x, y, x + L, y + 5]
            if all(pip(px_, py_, e['poly']) for px_, py_ in ((r_[0], r_[1]), (r_[2], r_[1]), (r_[0], r_[3]), (r_[2], r_[3]))) \
               and not any(overlaps(r_, [b['bbox'][0] - 1, b['bbox'][1] - 1, b['bbox'][2] + 1, b['bbox'][3] + 1]) for b in buildings):
                n += 1
                buildings.append(dict(id=e['id'] + '_%d' % n, name=None, k='res', f=5 if e['name'] == '家属区' else 3,
                    poly=[[r_[0], r_[1]], [r_[2], r_[1]], [r_[2], r_[3]], [r_[0], r_[3]]], bbox=[round(v, 2) for v in r_],
                    roof='red' if e['name'] == '红房子' else None, approx=True, estate=e['name']))
            x += L + 3
        y += 11.5
    if (e['name'] == '红房子' or n) and ESTATE_LABEL.get(e['id'], e['name']):
        cx = (x0 + x1) / 2
        labels_extra.append(dict(t=ESTATE_LABEL.get(e['id'], e['name']), x=round(cx, 2), y=round(y0 + 1, 2), k='b'))
# v6 porches: entrance vestibules where the real door is not on the south face (the porch is the enterable part)
for b in list(buildings):
    pc = L6.PORCHES.get(b['id'])
    if not pc: continue
    x0, y0, x1, y1 = pc['r']
    po = dict(id=b['id'] + '_porch', name=b.get('name'), k=b.get('k', 'canteen'), f=1, porch=b['id'],
              poly=[[x0, y0], [x1, y0], [x1, y1], [x0, y1]], bbox=[x0, y0, x1, y1], roof='dark')
    if b.get('enter'): po['enter'] = b.pop('enter')
    b['entry'] = po['id']
    buildings.append(po)
# v7 item 19: the east wing of 兵器馆 (s15) is a bridge on upper floors with an open ground floor (门洞)
# v7 item 18: sky bridge between 17# and 18#
for b in buildings:
    if b['id'] == 'w543873269':   # v7: 二龙山长廊 centre line (traced on the OSM outline) + pavilions at both ends and the bend
        b['corridor'] = dict(line=[[110.2, 164.4], [122.3, 169.9], [130.9, 176.0], [140.6, 180.9]], peak=0.42,
                             pav=[[108.7, 164.1, 1.45, 0], [142.6, 181.6, 1.45, 0], [122.3, 169.9, 1.25, 1]])
    if b['id'] in {a['id'] for a in L7.ARCADES}: b['bridge'] = dict(clear=2, arcade=True, y=56.3); b.pop('enter', None)
    if b.get('name') in L7.INTROS: b['intro'] = L7.INTROS[b['name']]
# v7.6.2: grid-square footprints, 主楼 / 11号楼, 科学楼 A/B/C + 瑾瑜国际会议中心, stands, 17号穿堂, 羽毛球馆, 西北 relabels
A762.buildings(buildings, NAMES, L7.INTROS, L7.SUBAREAS)
V764.buildings(buildings, ROADMASK, SUB, L7.INTROS)   # v7.6.4: facades, 东北区, 龙山餐厅 west entry, new buildings, tidy shapes
A762.road_trim(buildings, [], [], ROADMASK, SUB, protect={'w543873269'})
A762.STATS['road_trim'].update(fields=_ft['fields'], fields_refused=_ft['fields_refused'], fences=_ft['fences'])
for ln in L7.LINKS:
    A = next(b for b in buildings if b['id'] == ln['a']); B = next(b for b in buildings if b['id'] == ln['b'])
    A['link'] = B['id']; B['link'] = A['id']
    x0, y0, x1, y1 = ln['x0'], ln['y0'], ln['x1'], ln['y1']
    buildings.append(dict(id='link_%s_%s' % (ln['a'], ln['b']), name=None, k='teach', f=A.get('f', 6), bridge=dict(clear=ln['clear']),
                          linkname=ln['name'], info=ln['txt'], poly=[[x0, y0], [x1, y0], [x1, y1], [x0, y1]], bbox=[x0, y0, x1, y1], approx=True))
# footprint raster: aprons then building
bimg = Image.new('L', img.size, 0); bd = ImageDraw.Draw(bimg)
for b in buildings:
    if b.get('bridge'): continue
    s = [(x * SUB, y * SUB) for x, y in b['poly']]
    bd.polygon(s, fill=255)
apron = bimg.filter(ImageFilter.MaxFilter(9))
px = img.load(); ap = apron.load(); bp = bimg.load()
for y in range(img.height):
    for x in range(img.width):
        if bp[x, y]: px[x, y] = C['BUILDING']
        elif ap[x, y] and px[x, y] in (C['GRASS'], C['HILL']): px[x, y] = C['APRON']
for b in buildings:   # paved floor under the 门洞
    if b.get('bridge', {}).get('arcade'): dr.polygon([(x * SUB, y * SUB) for x, y in b['poly']], fill=C['PLAZA'])

# doors (south side centre) for every building; enterable flagged
def door_of(b):
    cx = b.get('axis', (b['bbox'][0] + b['bbox'][2]) / 2)   # v7.6.2: 主楼 entrance on the real plaza / forecourt axis
    best = None
    sx = int(cx * SUB)
    for y in range(int(b['bbox'][3] * SUB) + 1, int(b['bbox'][1] * SUB) - 1, -1):
        if 0 <= sx < img.width and 0 <= y < img.height and bp[sx, y]: best = y; break
    if best is None: best = int(b['bbox'][3] * SUB)
    return [round(cx, 2), round((best + 1) / SUB, 2)]
for b in buildings:   # v7.6.2: the real 主楼 entrance, steps and 行知广场 share one axis (satellite forecourt / steps centre),
    if b['id'] == 'w535204584': b['axis'] = L7.PAVE[0]['axis']   # ~3.5 tiles east of the OSM outline's bbox centre
for b in buildings: b['door'] = door_of(b)

# ---------- v6 fences (with gates), passages, crossings
fences = []
for f in L6.FENCES:
    segs, gates = L6.fence_segments(f)
    for sg in segs:   # warn if a fence runs through a building
        n_ = max(1, int(math.hypot(sg[2] - sg[0], sg[3] - sg[1]) * SUB))
        hits = sum(1 for k in range(n_ + 1) if bp[int((sg[0] + (sg[2] - sg[0]) * k / n_) * SUB), int((sg[1] + (sg[3] - sg[1]) * k / n_) * SUB)])
        if hits: print('WARN fence', f['name'], 'crosses a building at', sg, hits)
    fences.append(dict(name=f['name'], segs=segs, gates=gates))
for f in L7.COURT_FENCES:
    segs, gates = L6.fence_segments(f)
    for sg in segs:
        n_ = max(1, int(math.hypot(sg[2] - sg[0], sg[3] - sg[1]) * SUB))
        hits = sum(1 for k in range(n_ + 1) if bp[int((sg[0] + (sg[2] - sg[0]) * k / n_) * SUB), int((sg[1] + (sg[3] - sg[1]) * k / n_) * SUB)])
        if hits: print('WARN court fence', f['name'], 'crosses a building at', sg, hits)
    fences.append(dict(name=f['name'], segs=segs, gates=gates, court=True))
# v7 perimeter wall (item 10) — openings only at the real gates (item 14)
walls = []
for w in L7.PERIMETER:
    pcs = L7.wall_pieces(w)
    for sg in pcs:
        mx, my = (sg[0] + sg[2]) / 2, (sg[1] + sg[3]) / 2
        if 0 <= mx * SUB < img.width and 0 <= my * SUB < img.height and bp[int(mx * SUB), int(my * SUB)]: print('WARN wall', w['name'], 'crosses a building at', sg)
    walls += pcs
wall_gates = [dict(name=n, hw=next(r for w in L7.PERIMETER for (nn, _, _, r) in w['gates'] if nn == n), **g) for n, g in L7.REAL_GATES.items()]
passages = L71.PASSAGES + [p_ for p_ in L6.PASSAGES if p_['id'] not in ('sidaomen', 'lanhuo')]  # v7.6.4: 七道门 = road under the rail  # v7.6.1: no 南区 underpass (road under a rail bridge)
crossings = [dict(name=c['name'], pts=[list(q) for q in c['pts']], w=c['w']) for c in L6.CROSSINGS]

# ---------- trees
random.seed(7)
trees = []
occupied = set()
def can_tree(tx, ty, allowed):
    x0, y0 = int(tx * SUB), int(ty * SUB)
    for dx in (-3, 0, 3):
        for dy in (-3, 0, 3):
            xx, yy = x0 + dx, y0 + dy
            if not (0 <= xx < img.width and 0 <= yy < img.height): return False
            if px[xx, yy] not in allowed: return False
    k = (int(tx / 1.6), int(ty / 1.6))
    if k in occupied: return False
    occupied.add(k); return True
GREENISH = {C['GRASS'], C['APRON']}
# forest
for ty in range(2, H - 2, 2):
    for tx in range(1, W - 1, 2):
        c = px[tx * SUB, ty * SUB]
        if c in (C['DEEPWOOD'], C['WOOD']):
            if random.random() < (.42 if tx < 232 and ty < 300 else .75):
                x = tx + random.uniform(-.8, .8); y = ty + random.uniform(-.8, .8)
                if can_tree(x, y, {C['DEEPWOOD'], C['WOOD']}): trees.append([round(x, 1), round(y, 1), random.choice([0, 0, 1, 3])])
        elif c == C['HILL'] and random.random() < .05:
            x = tx + random.uniform(-.8, .8); y = ty + random.uniform(-.8, .8)
            if can_tree(x, y, {C['HILL']}): trees.append([round(x, 1), round(y, 1), random.choice([2, 4])])
# campus greenery from imagery hint + random sprinkle
for ty in range(1, H - 1):
    for tx in range(1, W - 1):
        c = px[tx * SUB + 2, ty * SUB + 2]
        if c != C['GRASS']: continue
        p = .035
        if sat is not None:
            sx, sy = satpx(*tile2ll(tx + .5, ty + .5))
            if 0 <= sx < sat.width and 0 <= sy < sat.height:
                R, G, B = sat.getpixel((int(sx), int(sy)))
                if G > R + 6 and G > B and G < 140: p = .33   # green canopy (summer tiles)
                elif R + G + B < 160: p = .14                # dark winter canopy / shadow
        if random.random() < p:
            x = tx + random.uniform(0, 1); y = ty + random.uniform(0, 1)
            if can_tree(x, y, GREENISH): trees.append([round(x, 1), round(y, 1), random.choice([0, 1, 2, 4, 5])])
# roadside rows along campus roads
for wm, cls, p, t in roads:
    if cls != C['ROAD']: continue
    pts = [proj(a, b) for a, b in p]
    off = wm / MPT / 2 + 1.1
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        if L < .1: continue
        nx_, ny_ = -(y1 - y0) / L, (x1 - x0) / L
        s = 1.5
        while s < L:
            for side in (-1, 1):
                x = x0 + (x1 - x0) * s / L + nx_ * off * side; y = y0 + (y1 - y0) * s / L + ny_ * off * side
                if can_tree(x, y, GREENISH): trees.append([round(x, 1), round(y, 1), 1 if side > 0 else 0])
            s += 3.2

# v6: keep fence lines and gate approaches clear of trees
def _dseg(x, y, sg):
    ax, ay, bx, by = sg; dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy or 1e-9
    t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); return math.hypot(x - ax - t * dx, y - ay - t * dy)
_n0 = len(trees)
trees = [t for t in trees if not any(_dseg(t[0], t[1], sg) < .8 for f in fences for sg in f['segs'])
         and not any(abs(t[0] - sg[0]) < 2 and abs(t[1] - sg[1]) < 2 and _dseg(t[0], t[1], sg) < .9 for sg in walls)
         and not any(math.hypot(t[0] - g['x'], t[1] - g['y']) < 5 for g in wall_gates)
         and not (L7.RAIL_PLAZA['rect'][0] - 1 < t[0] < L7.RAIL_PLAZA['rect'][2] + 1 and L7.RAIL_PLAZA['rect'][1] - 1 < t[1] < L7.RAIL_PLAZA['rect'][3] + 1)
         and not (L71.TANK['lawn'][0] - 0.5 < t[0] < L71.TANK['lawn'][2] + 0.5 and L71.TANK['lawn'][1] - 0.5 < t[1] < L71.TANK['lawn'][3] + 1.0)
         and math.hypot(t[0] - L7.WILLOW['x'], t[1] - L7.WILLOW['y']) > 3
         and math.hypot(t[0] - L71.JUNCTION['c'][0], t[1] - L71.JUNCTION['c'][1]) > L71.JUNCTION['r'] + 1
         and not any(e.get('canopy') and e['canopy'][0] - 1 < t[0] < e['canopy'][2] + 1 and e['canopy'][1] - 1 < t[1] < e['canopy'][3] + 1.5 for ps in passages for e in (ps['a'], ps['b']))
         and not (L72.HELI['clear'][0] < t[0] < L72.HELI['clear'][2] and L72.HELI['clear'][1] < t[1] < L72.HELI['clear'][3])
         and not any(abs(t[0] - _b['x']) < 2.2 and -1.5 < _b['y'] - t[1] < 2.5 for _b in L72.BOARDS)
         and not (L71.RAIL_PARK['x0'] - 2 < t[0] < 540 and track_y(t[0]) - 4 < t[1] < track_y(t[0]) + 2)
         and not any(math.hypot(t[0] - (g[0] + g[2]) / 2, t[1] - (g[1] + g[3]) / 2) < 3.2 for f in fences for g in f['gates'])
         and not any(math.hypot(t[0] - e['out'][0], t[1] - e['out'][1]) < 2.5 or math.hypot(t[0] - e['x'], t[1] - e['y']) < 2 for ps in passages for e in (ps['a'], ps['b']))]
print('trees cleared from fences / gates / underpass ends:', _n0 - len(trees))
# v7.6 柏林园: the mixed sprinkle inside the park becomes a dense 侧柏 (type 6) stand on the open ground between the paths
def _inpoly(x, y, P):
    c = False
    for (ax, ay), (bx, by) in zip(P, P[1:] + P[:1]):
        if (ay > y) != (by > y) and x < ax + (y - ay) * (bx - ax) / (by - ay): c = not c
    return c
_BP = L76.BAILIN_POLY; _n0 = len(trees); trees = [t for t in trees if not _inpoly(t[0], t[1], _BP)]
_bx0, _by0 = min(q[0] for q in _BP), min(q[1] for q in _BP); _bx1, _by1 = max(q[0] for q in _BP), max(q[1] for q in _BP)
_rnd = random.Random(76); _stp = L76.BAILIN['tree_step']; _nc = 0; _ok = {C['GRASS'], C['WOOD'], C['DEEPWOOD'], C['APRON']}
_keep = [(L76.LIUDING['x'], L76.LIUDING['y'], 3.0), (L76.BAILIN['pond']['x'], L76.BAILIN['pond']['y'], 5.6)]
_y = _by0 + .8
while _y < _by1:
    _x = _bx0 + .8 + (_stp / 2 if int((_y - _by0) / _stp) % 2 else 0)
    while _x < _bx1:
        x, y = round(_x + _rnd.uniform(-.45, .45), 1), round(_y + _rnd.uniform(-.4, .4), 1)
        if _inpoly(x, y, _BP) and all(0 <= int(x * SUB) + dx < img.width and 0 <= int(y * SUB) + dy < img.height and px[int(x * SUB) + dx, int(y * SUB) + dy] in _ok for dx in (-4, 0, 4) for dy in (-5, 0, 3)) \
           and all(math.hypot(x - kx, y - ky) > kr for kx, ky, kr in _keep):
            trees.append([x, y, 6 if _rnd.random() < .9 else 4]); _nc += 1
        _x += _stp
    _y += _stp * .8
print('v7.6 柏林园: %d mixed trees -> %d cypresses/shrubs' % (_n0 - len(trees) + _nc, _nc))
# v7.6.1: no trees on the bridge approaches / garage lawn roof / grove paths, plaza and 凉亭; fill the grove a bit denser
def _dpl(x, y, P): return min(_dseg(x, y, [a[0], a[1], b[0], b[1]]) for a, b in zip(P, P[1:]))
_rb, _gr, _gv = L761.RAIL_BRIDGE, L761.GARAGE, L761.GROVE; _pv = _gv['pavilion']; _n0 = len(trees)
def _free761(x, y, m=0.0):
    return not (_rb['deck'][0] - 1.5 < x < _rb['deck'][1] + 1.5 and _rb['slope_n'][0] - 1.5 < y < _rb['slope_s'][1] + 1.5) \
       and not (_gr['roof'][0] - .4 < x < _gr['roof'][2] + .4 and _gr['roof'][1] - .4 < y < _gr['roof'][3] + 1.0) \
       and all(_dpl(x, y, P) > .9 + m for P in _gv['paths']) and math.hypot(x - _gv['plaza_c'][0], y - _gv['plaza_c'][1]) > _gv['plaza_r'] + 1.0 + m \
       and not (_pv['x'] - _pv['w'] / 2 - 1.2 < x < _pv['x'] + _pv['w'] / 2 + 1.2 and _pv['y'] - _pv['h'] - .6 < y < _pv['y'] + 1.6)
trees = [t for t in trees if _free761(t[0], t[1])]
_rnd = random.Random(761); _nc = 0; _GP = _gv['poly']; _ok = {C['GRASS'], C['WOOD'], C['DEEPWOOD']}
for _ in range(900):
    x, y = round(_rnd.uniform(248.5, 281.5), 1), round(_rnd.uniform(420.5, 446.0), 1)
    if _inpoly(x, y, _GP) and _free761(x, y, .3) and px[int(x * SUB), int(y * SUB)] in _ok and all(math.hypot(x - t[0], y - t[1]) > 2.1 for t in trees if abs(t[0] - x) < 3 and abs(t[1] - y) < 3):
        trees.append([x, y, _rnd.choice([0, 1, 2, 0, 1])]); _nc += 1
print('v7.6.1: trees cleared %d, grove trees added %d' % (_n0 - len(trees) + _nc, _nc))

# ---------- labels / POIs
# v7 wayfinding: unnamed 北区 blocks get a generic, clearly marked placeholder name (docs/NAMES.md)
_gen = {'teach': [0, '北区教学楼'], 'res': [0, '北区公寓'], 'dorm': [0, '北区宿舍']}
for b in sorted(buildings, key=lambda b: (round(b['bbox'][1] / 30), b['bbox'][0])):
    if not b.get('name') and not b.get('bridge') and b['bbox'][1] < 175 and b.get('k') in _gen:
        g_ = _gen[b['k']]; b['name'] = '%s %s' % (g_[1], 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[g_[0]]); g_[0] += 1; b['generic'] = True
def ptl(lat, lon): return [round(v, 2) for v in proj(lat, lon)]
labels = []
for b in buildings:
    if b.get('name') and not b.get('porch') and not b.get('nolabel'):   # v7.6.2: nolabel = one label for a group
        labels.append(dict(t=b['name'], x=round((b['bbox'][0] + b['bbox'][2]) / 2, 2), y=round(b['bbox'][1], 2), k='b', id=b['id']))
labels += labels_extra
road_names = {}
for wm, cls, p, t in roads:
    if t.get('name') and cls == C['ROAD']:
        pts = [proj(a, b) for a, b in p]
        L = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:]))
        if L > road_names.get(t['name'], (0,))[0]: road_names[t['name']] = (L, pts[len(pts) // 2])
for n, (L, q) in road_names.items():
    if 0 < q[0] < W and 0 < q[1] < H: labels.append(dict(t=n, x=round(q[0], 2), y=round(q[1], 2), k='road'))
AREAS = [('二龙山', 38.0150, 112.4318), ('西区 · 文瀛苑', 38.0131, 112.4368), ('东区', 38.0150, 112.4478),
         ('北区', 38.0182, 112.4420), ('中心区 · 行知广场', 38.0133, 112.4426), ('南区 · 德怀广场', 38.0099, 112.4372),
         ('汾河', 38.0093, 112.4305)]
for n, x, y in L7.SUBAREAS: labels.append(dict(t=n, x=x, y=y, k='sub'))
for n, a, o in AREAS:
    x, y = ptl(a, o); labels.append(dict(t=n, x=x, y=y, k='area'))
pois = []
for lat, lon, t in pois_osm:
    if not (LAT0 < lat < LAT1 and LON0 < lon < LON1): continue
    n = t.get('name')
    if not n: continue
    x, y = ptl(lat, lon)
    kind = 'statue' if t.get('artwork_type') == 'statue' else 'gate' if n.endswith('道门') else t.get('railway') or t.get('amenity') or t.get('historic') or t.get('natural') or 'poi'
    pois.append(dict(id=n, name=n, x=x, y=y, k=kind))
statue = next(p for p in pois if p['name'] == '彭德怀雕像')
for g in wall_gates: pois.append(dict(id=g['name'], name=g['name'] if g['name'] != '一道门' else '一道门 · 中北大学', x=g['x'], y=g['y'], k=g['kind'], txt=g['txt'], real=True))
pois.append(dict(id='刘鼎塑像', name='刘鼎塑像', x=L76.LIUDING['x'], y=L76.LIUDING['y'] + 0.4, k='statue', txt=L76.LIUDING['txt'], approx=True))
if not any(p_['name'] == '四道门' for p_ in pois): pois.append(dict(id='四道门', name='四道门', x=488.6, y=320.4, k='gate'))
main = next(b for b in buildings if b['id'] == 'w535204584')
# v7.1 rail park: cars laid end to end along the north track (each car: x0..x1 and the rail y at both ends)
_rp = L71.RAIL_PARK; _x = _rp['x0']; _cars = []
for k_, ln in _rp['cars']: _cars.append(dict(k=k_, x0=round(_x, 2), x1=round(_x + ln, 2), y0=round(track_y(_x), 2), y1=round(track_y(_x + ln), 2))); _x += ln + _rp['gap']
rail_park = dict(name=_rp['name'], txt=_rp['txt'], cars=_cars, track=[list(q) for q in _TK],
                 platform=dict(x0=_rp['platform']['x0'], x1=_rp['platform']['x1'], y0a=round(track_y(_rp['platform']['x0']) + _rp['platform']['n0'], 2), y1a=round(track_y(_rp['platform']['x1']) + _rp['platform']['n0'], 2), h=_rp['platform']['n1'] - _rp['platform']['n0']),
                 sign=dict(x=_rp['sign'][0], y=_rp['sign'][1], name=_rp['sign'][2]), signals=[dict(x=x_, y=round(track_y(x_) + dy_, 2)) for x_, dy_ in _rp['signals']])
spawn = [main['door'][0], main['door'][1] + 6]

# v7.3 龙山餐厅 outdoor staircase + the paved service lane at its foot (stamped last so nothing repaints it)
_a = np.array(img)
def _stamp(r, c):
    x0, y0, x1, y1 = r; _a[int(round(y0 * SUB)):int(round(y1 * SUB)), int(round(x0 * SUB)):int(round(x1 * SUB))] = c
_ln = _a[int(L73.LANE[1] * SUB):int(L73.LANE[3] * SUB), int(L73.LANE[0] * SUB):int(L73.LANE[2] * SUB)]
_ln[~np.isin(_ln, [C['BUILDING'], C['ROAD']])] = C['PATH']
_st = L73.STAIRS   # v7.6.4: the south stair is gone (west entrance instead)
img = Image.fromarray(_a); del _a, _ln
for b_ in buildings:
    if False and b_['id'] == _st['bid']: b_['stairs'] = dict(x0=_st['x0'], x1=_st['x1'], y0=_st['y0'], y1=_st['y1'], treads=_st['treads'])
_n0 = len(trees)
trees = [t for t in trees if not (_st['x0'] - 1.2 < t[0] < _st['x1'] + 1.2 and _st['y0'] - .5 < t[1] < _st['y1'] + 1.5)
         and not (L73.LANE[0] < t[0] < L73.LANE[2] and L73.LANE[1] - .6 < t[1] < L73.LANE[3] + .4)]
print('v7.3 longshan stairs: trees cleared', _n0 - len(trees))

# v7.6.1: rail centre-line y at the two ends of the bridge deck (for the deck sprite)
def _ry(x):
    for ln in rails:
        for (x0, y0), (x1, y1) in zip(ln, ln[1:]):
            if min(x0, x1) <= x <= max(x0, x1) and abs(x1 - x0) > 1e-6 and abs(y0 + (x - x0) * (y1 - y0) / (x1 - x0) - 375) < 6: return round(y0 + (x - x0) * (y1 - y0) / (x1 - x0), 2)
_rail761 = [_ry(L761.RAIL_BRIDGE['deck'][0]), _ry(L761.RAIL_BRIDGE['deck'][1])]; print('v7.6.1 rail bridge rail y', _rail761)
# ---------- v7.6.1 real terrain (DEM terraces, ramps, stairs) — see tools/terrain_v761.py
import terrain_v761 as TV
_ht = TV.height_tiles(D, W, H, lambda x, y: (LAT1 - y * MPT / MY, LON0 + x * MPT / MX))
_ex = hill.copy()
_ex[:, :120] = True   # west of x 120 is off campus (二龙山 south flank down to the 汾河): left as before
for _ in range(6):   # keep the hand-made 二龙山 terraces (v6) as they are: no DEM walls on / near the hill
    _e2 = _ex.copy(); _e2[1:] |= _ex[:-1]; _e2[:-1] |= _ex[1:]; _e2[:, 1:] |= _ex[:, :-1]; _e2[:, :-1] |= _ex[:, 1:]; _ex = _e2
_flat = [(236, 368, 249, 383), tuple(L761.GARAGE['roof'])]   # the rail-bridge cut and the garage roof keep their own look
# designed / levelled ground stays flat: sports fields, fenced yards, the tank lawn, 柏林园 and the 小树林
_flat += [(f_['x'] - 3, f_['y'] - 3, f_['x'] + f_['w'] + 3, f_['y'] + f_['h'] + 3) for f_ in FIELDS]
for f_ in fences:
    for sg in f_['segs']: _flat.append((min(sg[0], sg[2]) - 2, min(sg[1], sg[3]) - 2, max(sg[0], sg[2]) + 2, max(sg[1], sg[3]) + 2))
_flat += [tuple(L71.TANK['lawn']), tuple(L71.TANK['north_lawn'])]
for _P in (L76.BAILIN_POLY, L761.GROVE['poly']):
    _flat.append((min(q[0] for q in _P) - 1, min(q[1] for q in _P) - 1, max(q[0] for q in _P) + 1, max(q[1] for q in _P) + 1))
for (_x0, _y0, _x1, _y1) in _flat:
    _x0, _y0 = max(0, _x0), max(0, _y0)
    _ex[int(_y0):int(math.ceil(_y1)) + 1, int(_x0):int(math.ceil(_x1)) + 1] = True
_a = np.array(img)
if os.environ.get('NUC_TERRAIN', '1') == '0': _ex[:] = True   # NUC_TERRAIN=0: flat map (for before/after comparisons)
_pre764 = _a.copy()
_new, TERRAIN, _lev, _tst = TV.apply(_a, C, SUB, _ht, _ex, (int(spawn[0]), int(spawn[1])))
img = Image.fromarray(_new); del _a
print('v7.6.1 terrain: DEM %.0f-%.0f m, %s' % (_ht.min(), _ht.max(), _tst))
_n0 = len(trees)
def _tfree(t):
    for dx, dy in ((0, 0), (-2, 0), (2, 0), (0, -2), (0, 2)):
        xx_, yy_ = int(t[0] * SUB) + dx, int(t[1] * SUB) + dy
        if 0 <= xx_ < _new.shape[1] and 0 <= yy_ < _new.shape[0] and _new[yy_, xx_] in (C['TERRACE'], C['STEPS']) and not _ex[yy_ // SUB, xx_ // SUB]: return False
    return True
trees = [t for t in trees if _tfree(t)]; print('v7.6.1 terrain: trees off walls', _n0 - len(trees))
# v7.6.1: the four named slopes as continuous road ramps + low side walls (tools/slopes_v761.py)
import slopes_v761 as SL
if os.environ.get('NUC_TERRAIN', '1') != '0':
    SLOPE_STATS = SL.apply(_new, C, SUB, TERRAIN, _ht)
else: SLOPE_STATS = [dict(id=s_['id'], name=s_['name'], top=0, bottom=0, rise=0, ramp=0, side=0) for s_ in SL.SLOPES]
print('v7.6.1 slopes:', SLOPE_STATS)
# exposed foundation on the low (south) side of buildings standing on a slope: drop below the highest ground under the footprint
for _b in buildings:
    _x0, _y0, _x1, _y1 = _b['bbox']; _cx, _cy = int((_x0 + _x1) / 2), int((_y0 + _y1) / 2)
    if os.environ.get('NUC_TERRAIN', '1') == '0' or _ex[min(H - 1, max(0, _cy)), min(W - 1, max(0, _cx))] or _b.get('corridor') or _b.get('bridge'): continue
    _win = _ht[max(0, int(_y0)):int(_y1) + 1, max(0, int(_x0)):int(_x1) + 1]
    if _win.size == 0: continue
    _top = float(_win.max()); _dw = _top - SL.hat(_ht, _x0, _y1); _de = _top - SL.hat(_ht, _x1, _y1)
    if max(_dw, _de) >= 1.0: _b['found'] = [round(min(10.0, max(0.0, _dw) * 3), 1), round(min(10.0, max(0.0, _de) * 3), 1), round(_x0, 2), round(_x1, 2), round(max(_dw, _de), 1)]
print('v7.6.1 foundations:', sum(1 for _b in buildings if 'found' in _b))
_jb = next(b for b in buildings if b['id'] == 'jinyu_hall')   # v7.6.2: the hall is a real footprint now (label comes with it)
SL.JINYU = dict(SL.JINYU, x=round(_jb['fan'][0], 2), y=round(_jb['bbox'][3] - 1.8, 2), txt=_jb['intro'])   # spot = y + 3: just south of the fan hall
TERRAIN_INFO = dict(src='Mapzen/Tilezen Terrarium terrain tiles (AWS Open Data, z15; SRTM, NASA/USGS)', step=TV.STEP, base=_tst['base'])
# biggest local height differences (named places, within ~60 m)
_rel = []
for lb in labels:
    if lb.get('k') == 'road': continue
    x_, y_ = int(lb['x']), int(lb['y'])
    if not (0 <= x_ < W and 0 <= y_ < H) or _ex[min(H - 1, y_), min(W - 1, x_)]: continue
    win = _ht[max(0, y_ - 24):y_ + 25, max(0, x_ - 24):x_ + 25]; _rel.append((round(float(win.max() - win.min()), 1), lb['t'], x_, y_))
_rel.sort(reverse=True); RELIEF = _rel[:12]; print('v7.6.1 terrain: biggest local relief', RELIEF[:10])
# ---------- v7.6.2 二龙山, simplified (tools/erlong_v762.py): old broken trails wiped, two straight 益足道 stairways
# from the 公园大门 at the campus-side foot to the summit 长廊, and the real features ON the mountain placed on them
import hill_v762 as HV, erlong_v762 as ERL
_a = np.array(img)
_cor = next(b for b in buildings if b['id'] == 'w543873269')
ERL_STATS = ERL.apply(_a, C, SUB, ELEV, _cor['corridor']['line'], trees)
img = Image.fromarray(_a)
_cor['corridor']['pav'] = [p_ for p_ in _cor['corridor']['pav'] if not p_[3]]   # real: 两座四角亭 (one at each end), no middle one
_cor['intro'] = ERL.CORRIDOR_TXT
HILL_FIX = dict(window=[0, 56, 236, 304], trailheads=HV.trailheads(_a, C, ELEV, SUB), summit=[126, 176], foot=list(ERL.FOOT), routes=ERL_STATS['routes'],
                stats={k_: v_ for k_, v_ in ERL_STATS.items() if k_ != 'routes'}, features=[dict(id=q_['id'], name=q_['name'], x=q_['x'], y=q_['y'], kind=q_['kind']) for q_ in ERL.FEATURES],
                platforms=[dict(name=n_, x=x_, y=y_, r=r_) for n_, x_, y_, r_ in ERL.PLATFORMS], src=ERL.SRC)
pois = [p_ for p_ in pois if p_['id'] not in ('继往开来', '瀑布')] + ERL.labels()   # OSM 继往开来 = the 世纪碑 inscription, 瀑布 = 龙山飞瀑
print('v7.6.2 二龙山:', {k_: v_ for k_, v_ in HILL_FIX.items() if k_ not in ('src', 'features')}); del _a
# ---------- v7.6.2: 17号楼穿堂 floor, 图书馆 arched stair + two fountains, steps onto the stands (tools/apply_v762.py)
_a = np.array(img); _FT = []; A762.stamp(_a, C, buildings, SUB, np, _FT, labels); L7.FOUNTAINS = list(L7.FOUNTAINS) + _FT
_n0 = len(trees); _cb = A762.STATS['stamp'].pop('clear_box'); trees = [t for t in trees if _a[min(_a.shape[0] - 1, int(t[1] * SUB)), min(_a.shape[1] - 1, int(t[0] * SUB))] not in (C['WATER'], C['STEPS'], C['BUILDING'])
         and not (_cb[0] < t[0] < _cb[2] and _cb[1] < t[1] < _cb[3])]
A762.STATS['stamp']['trees_removed'] = _n0 - len(trees); img = Image.fromarray(_a); del _a
print('v7.6.2 apply:', A762.STATS)
# ---------- v7.6.4 (tools/layout_v764.py): stairs, lots, underpass, tiny terraces, road audit, tidy trees
_a = np.array(img)
_prot = [(min(s_['a'][0], s_['b'][0]) - 4, min(s_['a'][1], s_['b'][1]) - 4, max(s_['a'][0], s_['b'][0]) + 4, max(s_['a'][1], s_['b'][1]) + 4) for s_ in SL.SLOPES]
V764.stamp(_a, C, SUB, _pre764, _ex, _prot, rails)
trees = V764.tidy_trees(trees, _a, C, SUB, hill, [L76.BAILIN_POLY, L761.GROVE['poly']], rails, L6.CROSSINGS, buildings, W, H)
img = Image.fromarray(_a); del _a, _pre764
print('v7.6.4:', {k_: v_ for k_, v_ in V764.STATS.items() if k_ != 'sidaomen_swap'})
# ---------- write
img.save(os.path.join(OUT, 'ground.png'), optimize=True)
Image.fromarray(ELEV).save(os.path.join(OUT, 'elev.png'), optimize=True)
Image.fromarray(TERRAIN).save(os.path.join(OUT, 'terrain.png'), optimize=True)
classes = {v: k for k, v in C.items()}
_byid = {b['id']: b for b in buildings}
for _d, _s in L72.RC_FROM.items():
    if 'rc' in _byid[_s]: _byid[_d]['rc'] = _byid[_s]['rc']
out = dict(meta=dict(w=W, h=H, tile=TILE, sub=SUB, mpt=MPT, bounds=[LON0, LAT0, LON1, LAT1],
                     source='OpenStreetMap contributors (ODbL) + approximate footprints traced from imagery',
                     classes=[classes[i] for i in range(len(C))], openPlazas=L72.OPEN_PLAZAS, revealRects=L72.REVEAL_RECTS, areaRects=L72.AREA_RECTS),
           buildings=buildings, walls=walls, wallGates=wall_gates, props=dict(stairs=None, v764=V764.props(buildings), heli=L72.HELI, boards=dict(items=L72.BOARDS, txt=L72.BOARD_TXT, src=L72.FUND_URL), flags=L7.FLAGS, fountains=L7.FOUNTAINS, willow=L7.WILLOW, railPark=rail_park, tank=L71.TANK, bailin=dict((k_, v_) for k_, v_ in L76.BAILIN.items() if k_ in ('name', 'gallery', 'pavilion', 'wall', 'txt')), liuding=L76.LIUDING, erlong=ERL.props(),
                     railBridge=dict(L761.RAIL_BRIDGE, rail=_rail761), underpass=V764.UNDERPASS, garage=L761.GARAGE, grove=dict((k_, v_) for k_, v_ in L761.GROVE.items() if k_ in ('name', 'pavilion', 'txt'))),
           terrain=dict(TERRAIN_INFO, relief=RELIEF), hillFix=HILL_FIX, v762=A762.STATS, v764={k_: v_ for k_, v_ in V764.STATS.items() if k_ != 'sidaomen_swap'},
           pave=L7.PAVE, trees=trees, rails=rails, fields=FIELDS, fences=fences, passages=passages, crossings=crossings, tunnels=tunnels, labels=labels, pois=pois, spawn=spawn,
           areas=[dict(t=n, x=ptl(a, o)[0], y=ptl(a, o)[1]) for n, a, o in AREAS],
           slopes=[dict(st_, txt=s_['txt'], a=list(s_['a']), b=list(s_['b'])) for st_, s_ in zip(SLOPE_STATS, SL.SLOPES)], slopeSrc=SL.SRC,
           spots=[dict(id=s_['id'], name=s_['name'], kz='坡 · DEM 高差约 %.0f 米' % st_['rise'] if st_['rise'] else '坡', x=s_['spot'][0], y=s_['spot'][1], r=5.0,
                       intro=s_['txt'] + ('（DEM：坡顶约 %.0f 米、坡底约 %.0f 米，高差约 %.1f 米）' % (st_['top'], st_['bottom'], st_['rise']) if st_['rise'] else '')) for st_, s_ in zip(SLOPE_STATS, SL.SLOPES)]
                + [dict(id='jinyu', name=SL.JINYU['name'], kz='现代分析测试中心 · 位置为近似', x=SL.JINYU['x'], y=SL.JINYU['y'] + 3, r=6.0, intro=SL.JINYU['txt'])]
                + [dict(id='rail_bridge', name='南区铁路桥', kz='道路从铁路桥下穿过', x=242.1, y=375.2, r=4.5, intro=L761.RAIL_BRIDGE['txt']),
                  dict(id='garage', name='地下停车场', kz='15号楼南侧 · 坡道位置为近似', x=(L761.GARAGE['roof'][0] + L761.GARAGE['roof'][2]) / 2, y=(L761.GARAGE['roof'][1] + L761.GARAGE['roof'][3]) / 2, r=6.5, intro=L761.GARAGE['txt']),
                  dict(id='grove', name='小树林', kz='凉亭 · 喷泉（凉亭位置为近似）', poly=[list(q) for q in L761.GROVE['poly']], intro=L761.GROVE['txt']),
                  dict(id='bailinyuan', name='柏林园', kz='公园 · 侧柏林（太原市四星级公园）', poly=[list(q) for q in L76.BAILIN_POLY], intro=L76.BAILIN['txt'])] + ERL.spots() + [dict(id='erlongshan', name='二龙山', kz='山 · 龙园（太原市内的避暑胜地）', poly=[[60, 140], [200, 140], [200, 262], [60, 262]], intro=ERL.HILL_TXT),
                  dict(id='liuding', name='刘鼎塑像', kz='纪念塑像 · 园内位置为近似', x=L76.LIUDING['x'], y=L76.LIUDING['y'], r=4.0, intro=L76.LIUDING['txt'])] + V764.spots())
json.dump(out, open(os.path.join(OUT, 'map.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('map', W, 'x', H, 'tiles; buildings', len(buildings), 'trees', len(trees), 'labels', len(labels), 'pois', len(pois))

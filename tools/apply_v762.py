"""v7.6.2 integration: applies layout_v762 (data) with clear_v762 (geometry helpers) inside build_map.
Each hook edits build_map's lists in place and returns a stats dict that ends up in map.json (v762) and the README."""
import math
import layout_v762 as L
import clear_v762 as CL

STATS = {}


def _bbox(P):
    xs = [p[0] for p in P]; ys = [p[1] for p in P]
    return [round(min(xs), 2), round(min(ys), 2), round(max(xs), 2), round(max(ys), 2)]


def _rect(x0, y0, x1, y1):
    return [[round(x0, 2), round(y0, 2)], [round(x1, 2), round(y0, 2)], [round(x1, 2), round(y1, 2)], [round(x0, 2), round(y1, 2)]]


def _clip_y(P, y, keep_south):
    return CL._clip(P, (0, y), (0, 1) if keep_south else (0, -1), 0)


def _clip_x(P, x, keep_east):
    return CL._clip(P, (x, 0), (1, 0) if keep_east else (-1, 0), 0)


# ------------------------------------------------------------------ roads (before they are drawn)
def straighten(roads, proj, inv, C, skip):
    """roads: build_map list of (wm, cls, latlon pts, tags). Car roads and footpaths outside `skip` are pulled to clean
    H / V / 45-degree runs (nodes move <= 1.6 tiles, shared nodes move together, nodes shared with skipped ways stay)."""
    key = lambda ll: (round(ll[0], 7), round(ll[1], 7))
    pos, segs, use, fixed = {}, [], [], set()
    for n, (wm, cls, p, t) in enumerate(roads):
        q = [proj(a, b) for a, b in p]; ks = [key(ll) for ll in p]
        if cls not in (C['ROAD'], C['PATH']) or any(skip(x, y) for x, y in q):
            fixed.update(ks); continue
        for k, v in zip(ks, q): pos[k] = list(v)
        segs.append(ks); use.append(n)
    orig = {k: tuple(v) for k, v in pos.items()}
    CL.straighten_roads(segs, cap=1.6)(pos, fixed)
    def axis_share():
        good = tot = 0
        for pl in segs:
            for a, b in zip(pl, pl[1:]):
                (x1, y1), (x2, y2) = pos[a], pos[b]; Ls = math.hypot(x2 - x1, y2 - y1)
                if Ls < 0.5: continue
                ang = math.degrees(math.atan2(abs(y2 - y1), abs(x2 - x1))); tot += Ls
                if min(ang, 90 - ang, abs(ang - 45)) < 0.5: good += Ls
        return good / max(tot, 1e-9)
    after = axis_share()
    pos_b = dict(pos); pos.update({k: list(v) for k, v in orig.items()}); before = axis_share(); pos.update(pos_b)
    moved = [math.hypot(pos[k][0] - orig[k][0], pos[k][1] - orig[k][1]) for k in pos]
    for n, ks in zip(use, segs):
        wm, cls, p, t = roads[n]
        roads[n] = (wm, cls, [inv(*pos[k]) for k in ks], t)
    STATS['roads'] = dict(ways=len(segs), nodes=len(pos), nodes_moved=sum(1 for m in moved if m > 0.05),
                          max_move_tiles=round(max(moved or [0]), 2),
                          clean_share_before=round(before, 3), clean_share_after=round(after, 3))
    return STATS['roads']


# ------------------------------------------------------------------ fields / fences (before they are rasterised)
def fields(FIELDS, L6, L7):
    st = {}
    tracks = [f for f in FIELDS if f['k'] == 'track']
    fit = []
    for f in FIELDS:   # pitches inside a track: fit inside the inner kerb (rounded-rect, inner radius) with a 0.5 tile margin
        if f['k'] != 'football': continue
        cx, cy = f['x'] + f['w'] / 2, f['y'] + f['h'] / 2
        for t in tracks:
            if not (t['x'] < cx < t['x'] + t['w'] and t['y'] < cy < t['y'] + t['h']): continue
            lw = t['lanes'] * 0.49; ix0, iy0, iw, ih = t['x'] + lw, t['y'] + lw, t['w'] - 2 * lw, t['h'] - 2 * lw
            def inside(px, py, m=0.5):   # point inside the inner kerb (rounded rect, radius ri) shrunk by m
                rI = min(iw, ih) / 2; qx = min(max(px, ix0 + rI), ix0 + iw - rI); qy = min(max(py, iy0 + rI), iy0 + ih - rI)
                return math.hypot(px - qx, py - qy) <= rI - m + 1e-9
            def ok(s):
                hw, hh = f['w'] * s / 2, f['h'] * s / 2
                return all(inside(cx + sx * hw, cy + sy * hh) for sx in (-1, 1) for sy in (-1, 1))
            s = 1.0
            while s > 0.5 and not ok(s): s -= 0.0005
            s = round(s, 4)
            if s < 1.0:
                f['w'], f['h'] = round(f['w'] * s, 2), round(f['h'] * s, 2); f['x'], f['y'] = round(cx - f['w'] / 2, 2), round(cy - f['h'] / 2, 2)
            f['in_track'] = True; fit.append(dict(scale=s, x=f['x'], y=f['y'], w=f['w'], h=f['h']))
    st['pitch_fit'] = fit
    # east 'stand' strips become the 体育器材室 · 东看台 building
    n0 = len(FIELDS); FIELDS[:] = [f for f in FIELDS if f['k'] != 'stand']; st['stand_fields_removed'] = n0 - len(FIELDS)
    # basketball pad moves south so a footpath runs between the 羽毛球馆 and the court fence
    for f in FIELDS:
        if f['k'] == 'pad' and 420 < f['x'] < 425 and 262 < f['y'] < 264:
            y1 = f['y'] + f['h']; f['y'] = L.COURT_Y0; f['h'] = round(y1 - L.COURT_Y0, 2); st['pad'] = [f['x'], f['y'], f['w'], f['h']]
    for i, cf in enumerate(L7.COURT_FENCES):
        if cf['name'] == '体育馆南篮球场':
            xs = [p[0] for p in cf['pts']]; ys = [p[1] for p in cf['pts']]
            nf = L7._box('羽毛球馆南篮球场', min(xs) + 0.5, L.COURT_Y0 + 0.4, max(xs) - 0.5, max(ys) - 0.5, gates=('e', 'n'))
            L7.COURT_FENCES[i] = nf; st['court_fence'] = nf['pts']
    # 大操场: fence west side moves behind the west stands; west gate south of them; east gate south of the 东看台
    for fz in L6.FENCES:
        if fz['name'] != '大操场': continue
        old = 375.6; fz['pts'] = [(L.FIELD_FENCE_WEST if abs(x - old) < 1e-6 else x, y) for x, y in fz['pts']]
        g = []
        for k in fz['gates']:
            if k[0] == 'v' and abs(k[1] - old) < 1e-6: g.append(('v', L.FIELD_FENCE_WEST, 302.4, 304.9))
            elif k[0] == 'v' and abs(k[1] - 421.4) < 1e-6: g.append(('v', 421.4, 302.4, 305.4))
            else: g.append(k)
        fz['gates'] = g; st['field_fence'] = dict(pts=fz['pts'], gates=g)
    STATS['fields'] = st
    return st


def gym_path(trect, C, fence_east=421.4):
    x0, y0, x1, y1 = L.GYM_PATH; trect(max(x0, fence_east), y0, x1, y1, C['PATH'])


# ------------------------------------------------------------------ buildings (before the footprint raster)
def buildings(B, NAMES, INTROS, labels_sub):
    st = dict(squared=[], kept=[], split=[], renamed=[])
    byid = {b['id']: b for b in B}
    # 1. tidy: footprints turned square to the grid (min-area box orientation, only when within 12 deg)
    skip = {'w543873269'}
    for b in B:
        if b['id'] in skip or b.get('corridor') or b.get('bridge') or b.get('k') == 'pavilion' or len(b.get('poly', [])) < 3: continue
        if not (b['id'].startswith('w') or b['id'].startswith('s')): continue
        P, ang, rect = CL.square_poly(b['poly'])
        if abs(ang) <= 12.0:
            if abs(ang) > 0.05 or rect: b['poly'] = P; b['bbox'] = _bbox(P); st['squared'].append((b['id'], round(ang, 2), rect))
        else: st['kept'].append((b['id'], round(ang, 2)))
    # 2. 主楼 (front, with the 中北大学 sign) / 11号楼 (rear)
    m = byid[L.MAIN_ID]; x0, y0, x1, y1 = m['bbox']; h = y1 - y0
    front = _clip_y(m['poly'], y0 + L.MAIN_V * h, True); rear = _clip_y(m['poly'], y0 + 0.425 * h, False)
    m['poly'] = [[round(x, 2), round(y, 2)] for x, y in front]; m['bbox'] = _bbox(m['poly']); m['intro'] = L.MAIN_INTRO; m['name'] = '主楼'
    r = dict(L.REAR); r['poly'] = [[round(x, 2), round(y, 2)] for x, y in rear]; r['bbox'] = _bbox(r['poly']); r['approx'] = True
    for k in ('rc',):
        if k in m: r[k] = m[k]
    B.append(r); st['split'].append(('主楼', m['bbox'], '11号楼', r['bbox']))
    # 3. 科学楼 A/B/C + 瑾瑜国际会议中心
    s = byid[L.SCI_ID]; x0, y0, x1, y1 = s['bbox']; W, H = x1 - x0, y1 - y0
    U = lambda u: x0 + u * W; V = lambda v: y0 + v * H
    B.remove(s)
    for sid, nm, fl, (u0, v0, u1, v1) in L.SCIENCE:
        nb = dict(id=sid, name=nm, k='teach', f=fl, poly=_rect(U(u0), V(v0), U(u1), V(v1)), approx=True)
        for k in ('rc',):
            if k in s: nb[k] = s[k]
        if nm: nb['intro'] = L.SCI_INTRO
        if sid == 'sciA': nb['enter'] = s.get('enter', 'classroom') if s.get('enter') else None
        if nb.get('enter') is None: nb.pop('enter', None)
        nb['bbox'] = _bbox(nb['poly']); B.append(nb)
    J = L.JINYU; u0, v0, u1, v1 = J['podium']; px0, py0, px1, py1 = U(u0), V(v0), U(u1), V(v1)
    rr = min(J['fan_r'] * W, 0.9 * (px1 - px0), 0.9 * (py1 - py0)); cx, cy = px0 + rr, py1 - rr
    arc = [(cx + rr * math.cos(a), cy + rr * math.sin(a)) for a in [math.pi / 2 + i * (math.pi / 2) / 12 for i in range(13)]]
    P = [(px0, py0), (px1, py0), (px1, py1)] + arc   # arc runs south point -> west point (SW quarter)
    jb = dict(id=J['id'], name=J['name'], k=J['k'], special=J['special'], f=J['f'], intro=J['intro'], approx=True,
              poly=[[round(x, 2), round(y, 2)] for x, y in P], fan=[round(cx, 2), round(cy, 2), round(rr, 2)])
    jb['bbox'] = _bbox(jb['poly']); B.append(jb); st['jinyu'] = dict(bbox=jb['bbox'], fan=jb['fan'])
    # 4. grandstands / 主席台 / 体育器材室 (base-only collision like any building)
    for sd in L.STANDS:
        nb = {k: v for k, v in sd.items() if k != 'r'}; nb['poly'] = _rect(*sd['r']); nb['bbox'] = _bbox(nb['poly']); nb['approx'] = True; B.append(nb)
    # 19号公寓 sits on the old fence line: trim its east end behind the moved fence
    d19 = byid.get('w543815150')
    if d19:
        e0 = d19['bbox'][2]; d19['poly'] = [[round(x, 2), round(y, 2)] for x, y in _clip_x(d19['poly'], L.FIELD_FENCE_WEST - 0.5, False)]
        d19['bbox'] = _bbox(d19['poly']); st['dorm19'] = dict(east_before=e0, east_after=d19['bbox'][2])
    # 5. 17号公寓 穿堂
    p17 = byid[L.PASSAGE17['id']]; p17['passage'] = [L.PASSAGE17['y0'], L.PASSAGE17['y1']]; p17['passage_name'] = L.PASSAGE17['name']; p17['passage_txt'] = L.PASSAGE17['txt']
    # 6. 羽毛球馆
    g = byid[L.GYM_ID]; old = g.get('name'); g['name'] = L.GYM['name']; g['intro'] = L.GYM['intro']; st['renamed'].append((L.GYM_ID, old, g['name']))
    # 7. 西北: 附属学校, 家属楼, 校医院, 研究院 ...
    for sid, d in L.NW.items():
        b = byid.get(sid)
        if not b: continue
        old = b.get('name'); b.update(d); b['approx'] = True; b.pop('gen', None)
        if b['name'] in L.NW_INTRO: b['intro'] = L.NW_INTRO[b['name']]
        if b.get('k') == 'school': b.pop('enter', None)
        st['renamed'].append((sid, old, b['name']))
    for sid in L.NW_HOUSING:
        b = byid.get(sid)
        if not b: continue
        old = b.get('name'); b['name'] = '家属楼'; b['k'] = 'res'; b['nolabel'] = True; b['kz'] = '教工住宅'; b['intro'] = L.NW_INTRO['家属楼']; b['approx'] = True; b.pop('enter', None)
        st['renamed'].append((sid, old, '家属楼'))
    for sid in ('s1', 's8', 's9', 'stand_ws'):   # one label per group of same-named blocks
        if sid in byid: byid[sid]['nolabel'] = True
    for b in B:
        if b['id'] == 'stand_ws': b['nolabel'] = True
    # sub-area labels
    out = []
    for n, x, y in labels_sub:
        if n in L.NW_LABELS: out.append(L.NW_LABELS[n])
        elif n == '体育馆': out.append(('羽毛球馆', x, y))
        else: out.append((n, x, y))
    labels_sub[:] = out
    STATS['buildings'] = dict(squared=len(st['squared']), squared_rect=sum(1 for q in st['squared'] if q[2]),
                              kept_angle=st['kept'], split=st['split'], jinyu=st['jinyu'], dorm19=st.get('dorm19'), renamed=st['renamed'])
    return st


def road_trim(B, FIELDS, court_fences, mask, SUB, protect=()):
    """trim footprints / pads / courts / court-fence boxes back off the road mask; returns counts"""
    st = dict(buildings=0, buildings_refused=[], fields=0, fields_refused=[], fences=0, area_tiles=0.0)
    for b in B:
        if b.get('bridge') or b.get('corridor') or b['id'] in protect or len(b.get('poly', [])) < 3: continue
        P = None; bx = _bbox(b['poly']); a_ = abs(CL._area(b['poly']))
        if len(b['poly']) == 4 and a_ >= 0.999 * (bx[2] - bx[0]) * (bx[3] - bx[1]):   # axis-aligned rect: trim it as a rect (stays square)
            r = CL.trim_rect(*bx, mask, SUB)
            if r: P = _rect(*r[:4]); loss = 1 - abs(CL._area(P)) / a_
        if P is None: P, loss = CL.trim_poly(b['poly'], mask, SUB)
        if P is None: st['buildings_refused'].append((b['id'], b.get('name'), round(loss, 2))); continue
        if loss > 0:
            a0 = abs(CL._area(b['poly'])); b['poly'] = P; b['bbox'] = _bbox(P); st['buildings'] += 1; st['area_tiles'] += a0 * loss
            st.setdefault('list', []).append((b['id'], b.get('name'), round(loss, 3), round(a0 * loss, 1)))
    for f in FIELDS:
        if f.get('in_track') or f['k'] == 'track': continue
        r = CL.trim_rect(f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'], mask, SUB)
        if r is None: st['fields_refused'].append((f['k'], f['x'], f['y'])); continue
        if r[4]: f['x'], f['y'], f['w'], f['h'] = r[0], r[1], round(r[2] - r[0], 2), round(r[3] - r[1], 2); st['fields'] += 1
    for cf in court_fences:
        xs = [p[0] for p in cf['pts']]; ys = [p[1] for p in cf['pts']]
        r = CL.trim_rect(min(xs), min(ys), max(xs), max(ys), mask, SUB)
        if r and r[4]:
            dx0, dy0, dx1, dy1 = r[0] - min(xs), r[1] - min(ys), r[2] - max(xs), r[3] - max(ys)
            cf['pts'] = [(r[0] if abs(x - min(xs)) < 1e-6 else r[2] if abs(x - max(xs)) < 1e-6 else x,
                          r[1] if abs(y - min(ys)) < 1e-6 else r[3] if abs(y - max(ys)) < 1e-6 else y) for x, y in cf['pts']]
            G = []
            for g in cf.get('gates', []):
                if g[0] == 'h': G.append(('h', r[1] if abs(g[1] - min(ys)) < 1e-6 else r[3] if abs(g[1] - max(ys)) < 1e-6 else g[1], g[2], g[3]))
                else: G.append(('v', r[0] if abs(g[1] - min(xs)) < 1e-6 else r[2] if abs(g[1] - max(xs)) < 1e-6 else g[1], g[2], g[3]))
            cf['gates'] = G; st['fences'] += 1
    st['area_tiles'] = round(st['area_tiles'], 1)
    STATS['road_trim'] = st
    return st


# ------------------------------------------------------------------ ground stamps (after the footprint raster)
def stamp(a, C, B, SUB, np, props_fountains, labels):
    """a: ground array (edited in place). 17号 passage floor, library arched stair + two fountains, stand steps."""
    st = {}
    H, W = a.shape; yy, xx = np.mgrid[0:H, 0:W]; X = (xx + .5) / SUB; Y = (yy + .5) / SUB
    byid = {b['id']: b for b in B}
    # 17号 穿堂: building cells between y0..y1 become paved floor, plus 1 tile of paving at both mouths
    b = byid[L.PASSAGE17['id']]; y0, y1 = b['passage']; x0, _, x1, _ = b['bbox']
    band = (Y >= y0) & (Y < y1) & (X >= x0 - 1.0) & (X < x1 + 1.0)
    n = int((band & (a == C['BUILDING'])).sum())
    a[band & np.isin(a, [C['BUILDING'], C['APRON'], C['GRASS'], C['OUT']])] = C['PLAZA']; st['passage_cells'] = n
    # library: arched stair on the axis from the door, a fountain basin either side
    lb = byid[L.LIB_ID]; ly1 = lb['door'][1] if lb.get('door') else lb['bbox'][3]; LB = L.LIBRARY
    sx0, sx1 = L.LIB_AXIS - LB['stair_w'] / 2, L.LIB_AXIS + LB['stair_w'] / 2; sy0, sy1 = ly1 - 0.2, ly1 + LB['stair_len']
    blk = np.isin(a, [C['BUILDING'], C['RAIL']])
    # arched stair: straight flight from the door, its lower end bowing out in a half-ellipse (拱形), 1 tile wider each side
    ac = L.LIB_AXIS; arx, ary = LB['stair_w'] / 2 + 1.0, 1.8; ay = sy1 - ary
    arch = (((X - ac) / arx) ** 2 + ((Y - ay) / ary) ** 2 <= 1.0) & (Y >= ay)
    a[(((X >= sx0) & (X < sx1) & (Y >= sy0) & (Y < ay)) | arch) & ~blk] = C['STEPS']
    fy = ly1 + LB['stair_len'] / 2 + 0.3; rx, ry = LB['fountain_r']; F = []
    for i, dx in enumerate((-LB['fountain_dx'], LB['fountain_dx'])):
        fx = L.LIB_AXIS + dx; e = ((X - fx) / rx) ** 2 + ((Y - fy) / ry) ** 2
        a[(e <= 1.0) & (e > 0.62) & ~blk] = C['PLAZA']   # stone rim
        a[(e <= 0.62) & ~blk] = C['WATER']
        F.append(dict(x=round(fx, 2), y=round(fy, 2), name=LB['names'][i], txt=LB['txt'], r=round(rx * 0.75, 2)))
    props_fountains.extend(F)
    # walk from the foot of the stair straight down to the first road / path (the stair should lead somewhere)
    walk_end = None
    for k in range(int(sy1 * SUB), int((sy1 + 12) * SUB)):
        row = a[k, int((ac - 0.3) * SUB):int((ac + 0.3) * SUB)]
        if np.isin(row, [C['ROAD'], C['PATH']]).all(): walk_end = k / SUB; break
    if walk_end:
        a[(X >= ac - 1.25) & (X < ac + 1.25) & (Y >= sy1 - 0.1) & (Y < walk_end + 0.25) & ~blk & ~np.isin(a, [C['ROAD'], C['STEPS']])] = C['PATH']
    st['library_walk'] = [round(sy1, 2), walk_end]
    lb['stair'] = dict(x0=round(sx0, 2), y0=round(sy0, 2), x1=round(sx1, 2), y1=round(sy1, 2), arch=[round(ac, 2), round(ay, 2), round(arx, 2), round(ary, 2)], txt=LB['stair_txt'])
    st['clear_box'] = (ac - LB['fountain_dx'] - rx - 0.8, sy0 - 0.5, ac + LB['fountain_dx'] + rx + 0.8, (walk_end or sy1) + 0.8)   # no trees on the forecourt
    st['library'] = dict(stair=lb['stair'], fountains=[(f['x'], f['y']) for f in F])
    # little flights from the track onto the stands (only on open ground; the stands themselves stay solid)
    for r in L.STAND_STEPS:
        a[(X >= r[0]) & (X < r[2]) & (Y >= r[1]) & (Y < r[3]) & ~np.isin(a, [C['BUILDING'], C['WATER'], C['RAIL']])] = C['STEPS']
    STATS['stamp'] = st
    return st

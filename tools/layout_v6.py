"""v6 hand layout (tile coordinates, traced from the z18 satellite mosaic + OSM + the official
campus map). Used by build_map.py. Everything here is plain data + small raster helpers.

fields  : sports surfaces drawn from ONE proportional template per sport (scaled uniformly)
fences  : chain-link fences with gates (gaps) around 大操场 / 怡丁苑 / 东区 football pitches
porches : entrance vestibules for buildings whose real door is not on the south face
passages: underpasses below the railway (四道门, 兰伙路) - walk in one portal, come out the other
crossings: level crossings over the railway (二道门)
"""

# OSM pitch ways replaced by the traced fields below
FIELD_OSM = {'535201867', '543810950', '543816915', '543817500', '543871743', '543871744'}

GREEN, RED, BLUE, PURPLE, GREY = '#3f7a52', '#a8574a', '#3f6aa0', '#5a5a9a', '#8d9196'

def _row(kind, xs, ys, w, h, col, rot=0):
    return [dict(k=kind, x=round(x - w / 2, 2), y=round(y - h / 2, 2), w=w, h=h, rot=rot, col=col) for y in ys for x in xs]

def fields():
    F = []
    pad = lambda x0, y0, x1, y1, col: F.append(dict(k='pad', x=x0, y=y0, w=round(x1 - x0, 2), h=round(y1 - y0, 2), col=col))
    # --- 大操场 (OSM 535201867): 400 m track with a football pitch inside, stands on the east side
    F.append(dict(k='track', x=377, y=247.5, w=39.5, h=67.5, lanes=8, col='#b0503e'))
    F.append(dict(k='football', x=381.75, y=258.75, w=30, h=45, rot=0, col='#4f9a3e'))
    F.append(dict(k='stand', x=417.2, y=265.5, w=3.8, h=11, col='#d9b640'))
    F.append(dict(k='stand', x=417.6, y=286.75, w=3.4, h=14.25, col='#d9b640'))
    # --- 体育馆 south: 10 basketball courts on a red pad (two concrete columns, three green)
    pad(421.6, 263, 461, 292.3, RED)
    for i, x in enumerate([425.75, 433.25, 441, 448.75, 456.25]):
        F += _row('basketball', [x], [271.5, 285], 6, 11.2, GREY if i < 2 else GREEN)
    # --- SE tennis: two blocks of 4 + sand pit
    pad(436.9, 293.6, 462.5, 309.25, GREEN); pad(436.9, 309.9, 462.5, 323, GREEN)
    F += _row('tennis', [440.6, 446.5, 452.5, 458.5], [302.1], 5.2, 11, PURPLE)
    F += _row('tennis', [440.6, 446.5, 452.5, 458.5], [316.6], 5.2, 11, BLUE)
    F.append(dict(k='sand', x=429, y=295.5, w=8, h=25))
    # --- south tennis (OSM 543816915)
    pad(394.4, 316.5, 423.75, 331.75, RED)
    F += _row('tennis', [397.25, 403.1, 409, 414.6, 420.25], [324.1], 5.2, 11, GREEN)
    # --- 怡丁苑 football (OSM 543810950), east-west
    F.append(dict(k='football', x=292, y=391.5, w=43, h=29, rot=1, col='#4f9a3e', inset=1.5))
    # --- 北区 sports block
    pad(213.5, 116.5, 265.5, 137, RED)
    F += _row('basketball', [217.5], [126.25], 6, 11.2, BLUE)
    F += _row('volleyball', [226.85], [126.7], 3.6, 7.2, GREEN) + _row('volleyball', [252.1], [124.5], 3.6, 7.2, GREEN)
    F.append(dict(k='football', x=229, y=119.5, w=20.8, h=12.5, rot=1, col='#4f9a3e', inset=0.6))
    F += _row('basketball', [261.55], [122.5], 6, 11.2, BLUE)
    pad(245, 135.5, 266, 155, RED)
    F.append(dict(k='multi', x=247, y=138.5, w=18, h=15.5, rot=1, col=BLUE))
    # --- 东区: football, 6 tennis, 20 basketball
    F.append(dict(k='football', x=565, y=105.4, w=36, h=44.6, rot=0, col='#4f9a3e', inset=1.5))
    pad(566, 158.5, 604, 171, GREEN)
    F += _row('tennis', [569.5, 575.7, 581.9, 588.1, 594.3, 600.5], [164.75], 5.2, 11, BLUE)
    pad(568, 172, 606, 222.5, RED)
    F += _row('basketball', [573, 580, 587, 594, 601], [178.25, 190.75, 203.25, 215.75], 6, 11.2, GREEN)
    # --- 东区 badminton (OSM 543872025)
    pad(549, 236, 564, 257, GREEN)
    F += _row('badminton', [553, 560], [241.5, 251], 3.4, 6.8, GREEN)
    return F

# fences: closed polylines (tile coords) + gates as (segment index, t0, t1) along that segment in tiles
FENCES = [
    dict(name='大操场', pts=[(375.6, 246.3), (416.1, 246.3), (416.1, 263.6), (421.4, 263.6), (421.4, 316.0), (381.2, 316.0), (381.2, 305.0), (375.6, 305.0)],
         gates=[('h', 246.3, 404.0, 406.5), ('v', 375.6, 281.0, 283.5), ('h', 316.0, 386.0, 388.5), ('v', 421.4, 277.5, 280.5)]),
    dict(name='怡丁苑足球场', pts=[(291.2, 390.6), (336.0, 390.6), (336.0, 421.4), (291.2, 421.4)],
         gates=[('v', 336.0, 404.0, 406.5), ('v', 291.2, 416.0, 418.5), ('h', 390.6, 312.0, 314.5)]),
    dict(name='东区足球场', pts=[(563.8, 99.6), (598.6, 99.6), (598.6, 104.6), (602.4, 104.6), (602.4, 151.4), (563.8, 151.4)],
         gates=[('v', 563.8, 124.0, 126.5), ('h', 151.4, 582.0, 584.5)]),
]

def fence_segments(f):
    """split a closed fence polyline into drawn segments, leaving gaps at the gates; returns
    (segments, gates) with segments [[x0,y0,x1,y1],...] and gates [[x0,y0,x1,y1],...]."""
    pts = f['pts']; segs = []; gates = []
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        horiz = abs(a[1] - b[1]) < 1e-6
        cuts = []
        for g in f['gates']:
            if g[0] == 'h' and horiz and abs(g[1] - a[1]) < 1e-6 and min(a[0], b[0]) <= g[2] <= max(a[0], b[0]): cuts.append((g[2], g[3]))
            if g[0] == 'v' and not horiz and abs(g[1] - a[0]) < 1e-6 and min(a[1], b[1]) <= g[2] <= max(a[1], b[1]): cuts.append((g[2], g[3]))
        lo, hi = (min(a[0], b[0]), max(a[0], b[0])) if horiz else (min(a[1], b[1]), max(a[1], b[1]))
        cur = lo
        for c0, c1 in sorted(cuts):
            if c0 > cur: segs.append((cur, c0))
            gates.append((c0, c1)); cur = c1
        if cur < hi: segs.append((cur, hi))
        def mk(u0, u1): return [u0, a[1], u1, a[1]] if horiz else [a[0], u0, a[0], u1]
        segs[:] = [s if isinstance(s, list) else mk(*s) for s in segs]
        gates[:] = [g if isinstance(g, list) else mk(*g) for g in gates]
    return [[round(v, 2) for v in s] for s in segs], [[round(v, 2) for v in g] for g in gates]

# porches: parent building id -> porch rect (tile coords); the porch's door is on its south face
PORCHES = {
    'w1069157046': dict(r=[313.4, 277.6, 317.6, 282.6], why='一食堂: entrance faces the plaza on the west side'),
    # v7.6.2: no 食味坊 (二食堂) porch - it sat on the N-S road; the real road runs on between the dorm and the canteen
    'w543867978': dict(r=[719.6, 290.6, 723.4, 295.6], why='田园餐厅: entrance faces 兰伙路 on the west side; the south side backs onto the railway'),
}

PASSAGES = [
    dict(id='sidaomen', name='四道门地下通道', a=dict(x=487.6, y=318.6, out=[487.6, 316.8], side='北 · 行知广场'),
         b=dict(x=487.0, y=357.2, out=[487.0, 359.0], side='南 · 铁路南侧'), osm='W542204790'),
    dict(id='lanhuo', name='兰伙路下穿通道', a=dict(x=716.0, y=298.6, out=[716.4, 296.6], side='北 · 东区'),
         b=dict(x=706.0, y=317.6, out=[705.6, 319.6], side='南 · 铁路南侧'), osm='W543868342'),
]

CROSSINGS = [dict(name='二道门 平交道口', pts=[(277.0, 361.0), (278.2, 376.5)], w=7.0)]

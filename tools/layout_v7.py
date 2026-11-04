"""v7 hand layout (tile units, same projection as build_map.py). Sources: docs/V7_SOURCES.md.
Everything here is approximate and traced on the OSM / imagery grid."""
import math

# ---- campus perimeter (item 10). Open polylines; the map edge, the river and the fenced railway close the rest.
# Only the real gates (一道门, 1.5道门, 七道门 and the 新北区 东大门 = 北门) leave openings (item 14).
# gates: (name, x, y, half-width in tiles)
PERIMETER = [
    dict(name='东墙 · 兰伙路', pts=[(707.5, 0.2), (707.5, 59.0), (711.5, 59.0), (711.5, 170.0), (713.3, 170.0), (713.3, 306.4)],
         gates=[('北门', 707.5, 52.4, 3.1), ('七道门', 713.3, 280.4, 2.3)]),
    # south of the railway: the 怡丁苑 strip, traced on the OSM amenity=university outline (w 535204583 relation part)
    dict(name='南墙 · 怡丁苑', pts=[(604.5, 311.2), (604.5, 340.0), (607.7, 340.0), (609.8, 417.7), (598.3, 440.6), (522.8, 446.8),
                                (486.0, 394.3), (416.2, 398.8), (417.2, 420.9), (354.8, 423.3), (354.8, 446.0), (361.4, 471.3), (277.2, 478.0), (281.6, 513.9)],
         gates=[('1.5道门', 284.6, 477.4, 4.2)]),
    dict(name='西南墙 · 新兰路', pts=[(249.5, 513.9), (249.5, 491.5), (244.8, 491.0), (217.1, 484.7), (198.0, 470.9), (173.0, 449.3),
                                 (168.4, 445.3), (150.0, 445.3), (150.0, 471.0), (144.5, 471.0)],
         gates=[('一道门', 241.6, 490.3, 5.2)]),
]
REAL_GATES = {'一道门': dict(x=241.6, y=490.3, kind='gate1', txt='一道门：中北大学正门（学院路 / 新兰路），门内是德怀广场和彭德怀雕像。'),
              '1.5道门': dict(x=284.6, y=477.4, kind='gate15', txt='1.5道门：一道门和二道门之间的小侧门（同学们的叫法），通往南侧村路。位置为近似。'),
              '七道门': dict(x=713.3, y=280.4, kind='gate7', txt='七道门：东区东门，正对兰伙路对面的兰村和田园餐厅（2024 年“七道门恢复”工程）。'),
              '北门': dict(x=707.5, y=52.4, kind='gate_n', txt='北门（新北区东大门）：入口广场、升旗平台和喷泉，旁边是兵器教学陈列馆。')}
GATE_ROADS = [(707.0, 278.7, 714.0, 282.3)]   # pave the short link from the 七道门 road onto 兰伙路

def wall_pieces(w, step=1.0):
    """sample an open polyline into ~1-tile pieces, dropping the ones inside a gate gap."""
    out = []
    P = w['pts']
    for (ax, ay), (bx, by) in zip(P, P[1:]):
        L = math.hypot(bx - ax, by - ay); n = max(1, int(round(L / step)))
        for k in range(n):
            x0, y0 = ax + (bx - ax) * k / n, ay + (by - ay) * k / n
            x1, y1 = ax + (bx - ax) * (k + 1) / n, ay + (by - ay) * (k + 1) / n
            mx, my = (x0 + x1) / 2, (y0 + y1) / 2
            if any(math.hypot(mx - gx, my - gy) < r for _, gx, gy, r in w['gates']): continue
            out.append([round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)])
    return out

# ---- court fences (item 7): every court pad gets a chain-link fence with two gates (north + south middle)
def _box(name, x0, y0, x1, y1, gates=('s', 'n'), gw=2.4):
    m = 0.5; x0 -= m; y0 -= m; x1 += m; y1 += m
    cx = round((x0 + x1) / 2, 2); G = []
    for s in gates:
        c_ = None
        if isinstance(s, tuple): s, c_ = s
        if s == 's': G.append(('h', round(y1, 2), cx - gw / 2, cx + gw / 2))
        if s == 'n': G.append(('h', round(y0, 2), cx - gw / 2, cx + gw / 2))
        if s == 'w': cy = c_ or (y0 + y1) / 2; G.append(('v', round(x0, 2), cy - gw / 2, cy + gw / 2))
        if s == 'e': cy = (y0 + y1) / 2; G.append(('v', round(x1, 2), cy - gw / 2, cy + gw / 2))
    return dict(name=name, pts=[(round(x0, 2), round(y0, 2)), (round(x1, 2), round(y0, 2)), (round(x1, 2), round(y1, 2)), (round(x0, 2), round(y1, 2))], gates=G)
COURT_FENCES = [
    _box('北区篮球场', 213.5, 116.5, 265.5, 137.0, ('s', 'n')),
    _box('北区排球场', 245.0, 137.6, 266.0, 155.0, ('s', 'w')),
    _box('体育馆南篮球场', 421.6, 263.8, 461.0, 292.3, ('e', ('w', 279.0)), gw=3.0),
    _box('东南网球场', 436.9, 293.6, 462.5, 323.0, ('s', 'w')),
    _box('南网球场', 394.4, 316.5, 423.75, 331.75, ('s', 'w')),
    _box('东区网球场', 566.0, 158.5, 604.0, 171.0, ('n', 'w')),
    _box('东区篮球场', 568.0, 172.4, 606.0, 222.5, ('s', 'w', 'e')),
    _box('东区羽毛球场', 550.5, 236.0, 564.0, 257.0, ('n', 's')),
]

# ---- statics / set dressing (items 2, 3, 8, 12)
FLAGS = [dict(name='北门升旗台', x=655.0, y=51.0, txt='北门（新北区东大门）入口广场的升旗平台。'),
         dict(name='行知广场升旗台', x=484.05, y=300.0, txt='行知广场升旗台：主楼正门、台阶和行知广场共同的中轴线上，周一升旗仪式在这里举行。')]
FOUNTAINS = [dict(name='北门喷泉', x=633.0, y=51.5, txt='北门入口广场的喷泉。')]
WILLOW = dict(name='二道门大柳树', x=282.0, y=357.6, txt='二道门：这里并没有门，同学们说的“二道门”是铁路道口边的一棵大柳树。')
# 铁路主题广场 (item 12): between the railway and the 怡丁苑 football field (CCTV / 山西日报 2018 reports)
RAIL_PLAZA = dict(rect=(292.0, 377.2, 336.0, 389.4), name='铁路主题广场',
                  txt='铁路主题广场：2018 年利用废弃铁路边角地建成，有站台、站牌、信号灯、轮对和老车厢（近似复原）。')
RAIL_PROPS = [dict(k='platform', x=294.0, y=383.4, w=40.0, h=3.2), dict(k='sign', x=302.0, y=382.6, name='上兰村站'),
              dict(k='signal', x=297.0, y=381.0), dict(k='signal', x=331.0, y=381.0), dict(k='wheelset', x=322.5, y=387.6),
              dict(k='coach', x=304.0, y=386.4, w=11.0, col='green'), dict(k='coach2', x=315.5, y=380.8, w=12.0, col='red')]
# 行知广场 paving (item 3): grey granite with a red-brick axis instead of the generic beige plaza tint
PAVE = [dict(rect=(462.6, 263.0, 505.5, 318.0), style='granite', axis=484.05)]

# ---- item 18: building connectors (sky bridges). x-range, y-range in tiles; clear = floors under the bridge
LINKS = [dict(a='s20', b='s21', x0=630.0, x1=636.0, y0=108.6, y1=114.7, clear=2, name='17#—18# 连廊',
              txt='17#、18# 教学楼之间的二层连廊（室内连通，可在走廊尽头穿过去）。')]
# ---- item 19: ground-level pass-through under the east wing of 兵器馆 (the 门-shaped building west of 北门)
ARCADES = [dict(id='s15', y0=52.0, y1=61.0, name='兵器馆门洞',
                txt='兵器馆东侧上部相连、底层架空，形成“门”字形的过街门洞，可以从内院穿到北门广场。')]

# ---- names (item 1, docs/NAMES.md). approx = matched by position from the 2024 北区 reports, not the official plan.
NAMES7 = {
    's20': dict(name='教学楼17#', enter='classroom'), 's21': dict(name='教学楼18#', enter='classroom'),
    's14': dict(name='兵器馆 A 座'), 's16': dict(name='兵器教学陈列馆'), 's15': dict(name='兵器馆门洞'),
    'w1069155876': dict(name='龙山餐厅', k='canteen', enter='canteen'),
    'w543807070': dict(name='生活服务中心'),   # v7.6.2: 文瀛食堂 is the 学生第一食堂 building (w1069157046)
}
INTROS = {   # proximity intro cards (item 1)
    '主楼': '中北大学主楼，9 层，校园中轴线的起点，正南是行知广场和升旗台。',
    '德怀楼': '德怀楼：以彭德怀命名，正对一道门和德怀广场。',
    '图书馆': '图书馆：6 层，自习和借阅；按 E 进入。',
    '羽毛球馆': '羽毛球馆：室内羽毛球场，南面隔一条小路是 10 片露天篮球场。',   # v7.6.2: was 体育馆
    '龙山餐厅': '龙山餐厅：东区食堂，按 E 进去打饭。',
    '生活服务中心': '生活服务中心：西区，文瀛食堂北侧。',
    '文瀛食堂': '文瀛食堂（学生第一食堂）：西区，一楼有「山西刀削面」窗口，按 E 进去打饭。', '食味坊': '食味坊（学生第二食堂）：西区文瀛苑旁，门在南面。', '田园餐厅': '田园餐厅：七道门外、兰伙路东侧。',
    '教学楼17#': '17# 教学楼：北区，和 18# 由连廊相连。', '教学楼18#': '18# 教学楼：北区，和 17# 由连廊相连。',
    '兵器教学陈列馆': '兵器教学陈列馆：与北侧 A 座在东侧上部相连，形成“门”字形，底层有门洞通向北门广场。',
    '兵器馆 A 座': '兵器馆 A 座：与陈列馆在东侧相连（门洞可穿行）。',
    '12号楼 · 鸿学楼': '12 号楼 · 鸿学楼：教学楼，按 E 进入教室。',
}

# ---- sub-area labels (item 1 wayfinding): shown at mid zoom and used for the HUD "you are here" line
SUBAREAS = [('北门广场', 642.0, 47.0), ('兵器馆', 588.0, 56.0), ('17# · 18# 教学楼', 633.0, 111.0), ('仪器科学大楼', 403.0, 54.0),
            ('工程训练中心', 430.0, 104.0), ('北区学生公寓', 312.0, 142.0), ('科学楼', 526.0, 158.0), ('龙山餐厅', 686.0, 164.0),
            ('北区篮球场', 240.0, 127.0), ('行知广场', 483.6, 292.0), ('主楼', 484.05, 210.0), ('大操场', 398.0, 280.0),
            ('文瀛食堂', 327.0, 274.0), ('二道门 · 大柳树', 282.0, 363.0), ('铁路主题广场', 314.0, 375.0), ('七道门', 705.0, 280.0),
            ('一道门', 241.6, 486.0), ('1.5道门', 290.0, 473.0), ('二龙山长廊', 125.0, 186.0)]

# v7: flights cut through terrace walls where a walkway plateau on 二龙山 had no stair down (found by tests/v7 stairs check)
STAIR_FIX = [(7.0, 137.5, 10.0, 140.25)]

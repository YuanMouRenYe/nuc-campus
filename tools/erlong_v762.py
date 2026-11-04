"""v7.6.2 二龙山, simplified (user, 2:13 AM: 「可以不按照真实的上山路线 … 这个山就是上去看看而已 我只需要知道山上有什么东西就行了」).

The v6 terraces stay, but the old OSM hill trails (broken into islands where they met terrace walls, then patched
with zig-zag crossings) are wiped. In their place two clean, axis-aligned stone stairways - named after the real
「两条益足道」- climb straight through the terraces from the 公园大门 at the campus-side foot to the summit 长廊:

  益足道 · 南线  foot plaza → west along the south slope (爱心台) → north straight up (怡人台, 世纪碑) → 长廊
  益足道 · 东线  foot plaza → north along the east foot → west straight up through the terraces → joins 南线 below 世纪碑
  (the real 登山打卡 route: 「二龙山公园大门 → 爱心台 → 沿山的南侧走怡人台至山顶 → 龙山长廊打卡 → 从山的北侧下山」)

Wherever a stairway crosses a terrace wall the wall becomes STEPS (full width, full wall depth), elsewhere the way is
PATH; a promenade runs round the 长廊 on the ridge. The features ON the mountain (all researched, see SRC) are
placed on the stairways / summit with props, labels and intro cards; positions on the hill are schematic.
"""
import numpy as np

SRC = ['https://dwxcb.nuc.edu.cn/info/1169/13577.htm (二龙山长廊：两座四角亭 + 27 间子廊，全长 95 米，2000 年建校 60 周年时由学生处和重庆校友会出资建造)',
       'https://www.nuc.edu.cn/info/1014/32562.htm (登山打卡路线：公园大门 → 爱心台 → 南侧怡人台 → 山顶 → 龙山长廊打卡 → 北侧下山)',
       'https://cn.wtcf.org.cn/csfc/yl/csyl/jd/20160818265250.html (益足道、爱心林、怡人台、龙山飞瀑、爱心台、长廊、大型草画；山脚石碑“龙园”)',
       'http://glc.nuc.edu.cn/info/1007/3140.htm (世纪碑：1999 年老同志寻石太行所立，2019 年 9 月 30 日修缮揭幕；《世纪碑赋》“继往开来铸辉煌”)',
       'http://hqfw.nuc.edu.cn/info/1015/1476.htm (二龙山示意图：登山线路、凉亭、长廊、水渠，民国时期碉堡、暗道、暗洞)',
       'https://dwxcb.nuc.edu.cn/hszl/dbdh/els.htm (原名裂石山；石阶和长廊的石块都是勤工助学的学生抬上山的)',
       'https://baike.baidu.com/item/二龙山/3348491 (三条登山步道；爱心台、怡人台、桃园、世纪碑；解放战争时期碉堡、地下暗道)']

HALF = 1.25          # stairway half width (tiles) -> 2.5 tiles wide
FOOT = (193.5, 248.6, 204.6, 256.4)   # 公园大门 plaza at the campus-side foot (band 0), touching the 二龙山 entrance road
ROUTES = {
    '益足道 · 南线': [(199.0, 255.5), (146.0, 255.5), (146.0, 185.0), (138.0, 185.0)],
    '益足道 · 东线': [(207.0, 250.0), (207.0, 206.0), (146.0, 206.0)],
    '飞瀑小径': [(146.0, 255.5), (138.5, 255.5), (138.5, 268.0)],   # short spur from 南线 to the foot of 龙山飞瀑
    '下山步道 · 北线': [(105.6, 168.0), (105.6, 163.0), (65.5, 163.0)],   # 「从山的北侧下山」: short way down the back to the riverside road
}
CORRIDOR_BUF = 3.3   # promenade round the 长廊 centre line
PLATFORMS = [   # name, x, y, r (round stone platform)
    ('爱心台', 166.0, 255.5, 3.2), ('怡人台', 146.0, 221.0, 3.4), ('世纪碑', 149.6, 194.4, 2.6), ('东线观景台', 178.5, 206.0, 2.8)]
FALL = dict(x=134.0, y0=243.0, y1=264.5, w=1.4, pool=(134.0, 267.0, 3.2, 2.0))   # 龙山飞瀑 + 水潭 (OSM 瀑布 node at 134.1, 268.2)

FEATURES = [  # kind: gate / stele / pavilion / bunker / sign ; x, y = foot point of the prop (tiles)
    dict(id='erl_gate', kind='gate', name='二龙山公园大门', title='二龙山', x=199.0, y=250.2,
         txt='二龙山公园大门：登二龙山的起点，就在校园西侧（文瀛苑西边）的山脚。校工会的登山打卡路线从这里出发：经爱心台、沿山的南侧走怡人台到山顶，过山顶到龙山长廊打卡，再从山的北侧下山。'),
    dict(id='erl_longyuan', kind='stele', name='“龙园”石碑', title='龙园', x=195.0, y=249.9, big=True,
         txt='“龙园”石碑：二龙山脚下的大石碑，上书“龙园”二字。平日里中北学子会在龙园读书、晨练。'),
    dict(id='erl_sign_s', kind='sign', name='益足道 · 南线', title='南线', x=194.6, y=252.8,
         txt='益足道 · 南线：沿山的南坡往西，过爱心台后笔直向北上山，经怡人台、世纪碑到山顶长廊。二龙山的石阶和长廊用的石块，全是勤工助学的学生一块一块抬上山的。'),
    dict(id='erl_sign_e', kind='sign', name='益足道 · 东线', title='东线', x=209.6, y=247.2,
         txt='益足道 · 东线：沿山的东麓往北，再向西一级一级爬过山腰的台地，在世纪碑下和南线会合（游戏里简化成直线台阶，真实的山路是弯的）。'),
    dict(id='erl_sign_n', kind='sign', name='下山步道 · 北线', title='北线', x=70.0, y=160.6,
         txt='下山步道 · 北线：登山打卡路线“从山的北侧下山”。从长廊西头一路向西下到汾河边的公路（游戏里同样简化成一条直线）。'),
    dict(id='erl_aixin', kind='stele', name='爱心台', title='爱心台', x=166.0, y=252.6,
         txt='爱心台：南坡上的一处石砌平台，登山的第一个歇脚处，可以回望校园。和山上的爱心林一样，是勤工助学的学生参与修建的。'),
    dict(id='erl_yiren_ting', kind='pavilion', name='怡人台 · 凉亭', x=149.4, y=221.8, w=3.6, h=3.0,
         txt='怡人台：半山腰的观景平台，在山的南侧，登山打卡路线的必经之地，台边有座歇脚的凉亭（凉亭位置为近似）。'),
    dict(id='erl_shiji', kind='stele', name='世纪碑', title='世纪碑', x=150.6, y=194.6, big=True,
         txt='世纪碑：1999 年（国际老年人年）由退休老同志倡议，他们“寻石太行”，从山上搬来一块块石头筑起了世纪碑。2019 年 9 月 30 日修缮后重新揭幕。《世纪碑赋》：“龙山毓秀，汾水流长……继往开来铸辉煌，奋力双一流，实现百年百强！”'),
    dict(id='erl_bunker', kind='bunker', name='民国碉堡（遗迹）', x=100.0, y=160.4,
         txt='碉堡遗迹：二龙山地势险要，是太原北部的门户。山上还留着民国 / 解放战争时期修的碉堡和地下暗道，和学校“人民兵工第一校”的军工背景相映衬（游戏里的位置为示意）。'),
    dict(id='erl_fall_sign', kind='stele', name='龙山飞瀑', title='飞瀑', x=140.5, y=267.8,
         txt='龙山飞瀑：中北人当年“引瀑布”上山修成的人工瀑布，水顺着山坡的石渠一级级跌下，落进山脚的水潭。'),
]
AREAS = [  # intro-card areas (rect) for things that are a grove / slope rather than a prop
    dict(id='erl_aixinlin', name='爱心林', rect=(176.0, 236.0, 204.0, 253.0), kz='林地 · 位置为近似',
         txt='爱心林：南坡上的一片树林，由勤工助学的学生和师生一起种下（二龙山“背土、植树、修台阶”的一部分）。'),
    dict(id='erl_taoyuan', name='桃园', rect=(176.0, 184.0, 204.0, 204.0), kz='桃树林 · 位置为近似',
         txt='桃园：东坡上的一片桃树。春天“桃花遍山，塔松成排”，下山途中会经过这里。'),
    dict(id='erl_caohua', name='大型草画', rect=(148.5, 226.0, 172.0, 240.0), kz='山坡草画 · 位置为近似',
         txt='大型草画：用草和花在山坡上拼出的大幅图案，是二龙山的景点之一（具体图案没有查到）。'),
]
CORRIDOR_TXT = ('二龙山长廊：山脊上的长廊，由两座四角亭和 27 间子廊组成，依山起伏，全长 95 米。2000 年为纪念建校 60 周年，由学生处和'
                '重庆校友会联合出资建造。教工登山活动在这里“打卡”。站在长廊上，整个校园和汾河尽收眼底。')
HILL_TXT = ('二龙山：原名裂石山，高百余米，西临汾河，是太原北部的门户。1949 年学校迁到上兰村后，一届届中北人背土、植树、修台阶、'
            '建凉亭、筑长廊、引瀑布，把荒山修成了今天的龙园。山上有两条益足道、爱心台、怡人台、爱心林、龙山飞瀑、世纪碑、长廊、凉亭、'
            '碉堡遗迹和大型草画；山脚有“龙园”石碑。')


def _natural(C):
    return [C[k] for k in ('WOOD', 'DEEPWOOD', 'GRASS', 'HILL', 'BARE', 'FLOWERS', 'TERRACE', 'PATH', 'STEPS', 'OUT')]


def wall_mask(E, face_depth=6):
    """where the v6 terrace code would put a wall: below each step up (face) and along every band change (edge)."""
    face = np.zeros(E.shape, bool); edge = np.zeros(E.shape, bool)
    for k in range(1, face_depth + 1): face[k:, :] |= E[:-k, :] > E[k:, :]
    edge[:, 1:] |= E[:, :-1] != E[:, 1:]; edge[:, :-1] |= E[:, 1:] != E[:, :-1]; edge[:-1, :] |= E[1:, :] > E[:-1, :]
    return face | edge


def apply(a, C, SUB, E, corridor_line, trees):
    H, W = a.shape; st = {}
    yy, xx = np.mgrid[0:H, 0:W]; X = (xx + 0.5) / SUB; Y = (yy + 0.5) / SUB
    win = (X >= 20) & (X < 200.5) & (Y >= 56) & (Y < 300)
    road = a == C['ROAD']; near_road = road.copy()
    for _ in range(3 * SUB):   # keep the stair cuts where the (off-campus) road crosses the terraces
        near_road[1:] |= near_road[:-1].copy(); near_road[:-1] |= near_road[1:].copy(); near_road[:, 1:] |= near_road[:, :-1].copy(); near_road[:, :-1] |= near_road[:, 1:].copy()
    old = win & np.isin(a, [C['PATH'], C['STEPS']]) & ~near_road
    wm = wall_mask(E)
    st['old_trail_cells_wiped'] = int(old.sum())
    a[old & wm & (E >= 0)] = C['TERRACE']; a[old & ~wm] = C['WOOD']
    nat = np.isin(a, _natural(C)); walk = np.zeros(a.shape, bool)
    def put(m):
        m = m & nat; a[m & (a == C['TERRACE'])] = C['STEPS']; a[m & (a != C['STEPS'])] = C['PATH']; walk[m] = True; return int(m.sum())
    # foot plaza (公园大门)
    fx0, fy0, fx1, fy1 = FOOT; m = (X >= fx0) & (X < fx1) & (Y >= fy0) & (Y < fy1) & nat
    a[m & (a == C['TERRACE'])] = C['STEPS']; a[m & (a != C['STEPS'])] = C['PLAZA']; walk |= m
    st['routes'] = {}
    for name, P in ROUTES.items():
        n = 0
        for (ax, ay), (bx, by) in zip(P, P[1:]):
            x0, x1 = sorted((ax, bx)); y0, y1 = sorted((ay, by))
            n += put((X >= x0 - HALF) & (X < x1 + HALF) & (Y >= y0 - HALF) & (Y < y1 + HALF))
        st['routes'][name] = dict(pts=P, cells=n, len_tiles=round(sum(abs(bx - ax) + abs(by - ay) for (ax, ay), (bx, by) in zip(P, P[1:])), 1))
    # promenade round the 长廊 on the ridge
    L = np.array(corridor_line, float); d = np.full(a.shape, 1e9)
    for (ax, ay), (bx, by) in zip(L, L[1:]):
        dx, dy = bx - ax, by - ay; t = np.clip(((X - ax) * dx + (Y - ay) * dy) / (dx * dx + dy * dy), 0, 1)
        d = np.minimum(d, np.hypot(X - ax - t * dx, Y - ay - t * dy))
    st['promenade_cells'] = put((d <= CORRIDOR_BUF) & (a != C['BUILDING']))
    plat = {}
    for name, px, py, r in PLATFORMS:
        m = ((X - px) ** 2 + (Y - py) ** 2 <= r * r) & nat
        a[m & (a == C['TERRACE'])] = C['STEPS']; a[m & ~np.isin(a, [C['STEPS']])] = C['PLAZA']; walk |= m; plat[name] = int(m.sum())
    st['platforms'] = plat
    # 龙山飞瀑: a stone channel down the slope (water, blocks) ending in a pool, west of 南线
    f = FALL; nat2 = np.isin(a, _natural(C))
    ch = (np.abs(X - f['x']) <= f['w'] / 2) & (Y >= f['y0']) & (Y < f['y1']) & nat2
    rim = (np.abs(X - f['x']) <= f['w'] / 2 + 0.5) & (Y >= f['y0'] - 0.5) & (Y < f['y1']) & nat2 & ~ch
    px, py, rx, ry = f['pool']; e = ((X - px) / rx) ** 2 + ((Y - py) / ry) ** 2
    a[rim] = C['BARE']; a[(e <= 1.0) & (e > 0.6) & nat2] = C['PLAZA']; a[ch | ((e <= 0.6) & nat2)] = C['WATER']   # rocky channel banks, paved pool rim
    st['waterfall_cells'] = int((ch | (e <= 0.6)).sum())
    # trees off every walkway / platform / water cell, and off the props' footprints
    def cell(t): return a[min(H - 1, int(t[1] * SUB)), min(W - 1, int(t[0] * SUB))]
    clear = [(q['x'] - 2.6, q['y'] - 3.2, q['x'] + 2.6, q['y'] + 1.2) for q in FEATURES] + [(px - r - 1.2, py - r - 1.2, px + r + 1.2, py + r + 1.2) for _, px, py, r in PLATFORMS]
    n0 = len(trees)
    trees[:] = [t for t in trees if not (t[0] < 210 and 56 < t[1] < 300 and (cell(t) in (C['PATH'], C['STEPS'], C['PLAZA'], C['WATER'])
                                                                         or any(r[0] < t[0] < r[2] and r[1] < t[1] < r[3] for r in clear)))]
    st['trees_removed'] = n0 - len(trees)
    return st


def props():
    return dict(name='二龙山', txt=HILL_TXT, items=FEATURES, routes={k: v for k, v in ROUTES.items()}, src=SRC)


def spots():
    out = [dict(id=q['id'], name=q['name'], kz='二龙山 · ' + {'gate': '公园大门', 'stele': '石碑 / 景点', 'pavilion': '平台 · 凉亭', 'bunker': '战争遗迹', 'sign': '登山步道'}[q['kind']],
                x=q['x'], y=q['y'] + 0.8, r=3.2, intro=q['txt']) for q in FEATURES]
    for name, px, py, r in PLATFORMS:
        if name == '东线观景台':
            out.append(dict(id='erl_east_view', name='东线观景台', kz='二龙山 · 观景平台（游戏里加的歇脚处）', x=px, y=py, r=r + 0.5,
                            intro='东线半山腰的歇脚平台：往东能看到附属学校、文瀛苑和整个西区。'))
    for q in AREAS:
        x0, y0, x1, y1 = q['rect']
        out.append(dict(id=q['id'], name=q['name'], kz=q['kz'], poly=[[x0, y0], [x1, y0], [x1, y1], [x0, y1]], intro=q['txt']))
    return out


def labels():
    """map labels for the hill features (drawn like memorial POIs)."""
    out = [dict(id=q['id'], name=q['name'], x=q['x'], y=q['y'], k='hill') for q in FEATURES if q['kind'] != 'sign']
    out += [dict(id=q['id'] + '_l', name=q['name'], x=(q['rect'][0] + q['rect'][2]) / 2, y=(q['rect'][1] + q['rect'][3]) / 2, k='hill') for q in AREAS]
    return out

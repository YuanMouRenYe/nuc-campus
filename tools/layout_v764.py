"""v7.6.4 layout: user feedback batch of 2026-11-02 (see README "## v7.6.4 changes").
All coordinates in tiles (1 tile = 2.5 m). Satellite = reference only (never shipped).
Sources per item are in SRC / the README; unverified items are flagged in the info texts."""
import math
import numpy as np
from PIL import Image, ImageDraw

STATS = {}

# ---------------------------------------------------------------- 1) 北门: no fountain, no 宣传栏 / 展板
BEIMEN_TXT = '北门（新北区东大门）：入口广场和升旗平台，西侧是兵器教学陈列馆（航空宇航学院、机械工程学院）。广场是一片铺装地面，没有喷泉，也没有宣传栏。'

# ---------------------------------------------------------------- 2) 北区 buildings with their own facades
FACADES = {
    's12': dict(special='v764_soft', f=5, intro='软件实验大楼：计算机科学与技术学院、软件学院的教学实验楼，约 2.2 万平方米，地上五层、地下一层。外立面是玻璃幕墙 + 干挂石材 + 铝板，白色墙面上有深深的横向凹槽，低层有红棕色木纹竖向格栅（据校报航拍和基建处介绍）。'),
    's2': dict(special='v764_inst', f=5, intro='仪器科学大楼：全长 216.55 米，是学校最长的一栋楼，地上五层、高 28.7 米；石材幕墙 + 玻璃幕墙，长条形的白色楼身上是连续的深色横向窗带，一端是更高的方窗格子楼，屋面有花架（据基建处介绍和校报航拍）。'),
    's13': dict(special='v764_weapon', f=4, intro='兵器教学陈列馆（C 座）：地上四层，武器弹药陈列展示和校史馆，一层火炮厅陈列大小火炮约四十门。外观按校报航拍画成浅灰石材 + 少窗的展陈墙面和柱廊入口。'),
    's14': dict(special='v764_aero', f=5), 's15': dict(special='v764_aero', f=5), 's16': dict(special='v764_aero', f=5),
    's7': dict(special='v764_semi', name='半导体与能源宇航学院楼'), 's8': dict(special='v764_semi', name='半导体与能源宇航学院楼'),
    's9': dict(special='v764_semi', name='半导体与能源宇航学院楼'),
}
SEMI_TXT = ('半导体与能源宇航学院楼：半导体学院及研究院楼（17080 ㎡）+ 能源宇航学院楼（15890 ㎡），共约 3.3 万平方米，'
            '中铁十七局承建，2025 年 7 月 31 日竣工（ALC 墙板、隔震支座）。外观按效果图画成白色楼体 + 屋顶光伏板；哪一栋是哪个学院没有查到。')

# ---------------------------------------------------------------- 3) aircraft model on the 航空宇航学院 front lawn
PLANE = dict(x=577.6, y=52.9, name='飞机模型', col=[575.2, 52.25, 580.0, 52.95],
             txt='飞机模型 · 航空宇航学院门前草坪：放在底座上的展示飞机。型号和尺寸都没有查到（学院 2025 年宣传里提到的军工元素是“坦克模型、直升飞机”），这里画成通用的小型飞机造型。')

# ---------------------------------------------------------------- 4) 东北区: west column teaching (17#/18#), east column dorms
NE = {'s22': dict(name='文韬苑6号公寓', k='dorm', f=6), 's23': dict(name=None, k='dorm', f=6, lookId='s22')}
NE_NEW = dict(id='s764_d7', name='文韬苑7号公寓', k='dorm', f=6, r=(667.4, 116.6, 708.2, 125.6))
NE_TXT = '文韬苑6号 / 7号公寓：17#、18#教学楼东边的学生公寓（基建处：17#、18#教学楼“东邻文韬苑6#7#学生公寓”）。哪栋是 6 号、哪栋是 7 号没有查到，这里北楼记 6 号、南楼记 7 号。'

# ---------------------------------------------------------------- 5) 龙山餐厅: shifted east, long west stair, west entrance
CANTEEN = dict(id='w1069155876', r=(674.5, 131.0, 708.5, 159.8), f=5, porch=(670.6, 141.0, 674.5, 145.6),
               stairs=(662.0, 145.6, 669.2, 149.4), landing=(669.2, 145.6, 674.5, 149.4),
               txt='龙山餐厅（后勤物流配送中心，五层）：入口在西面——从西边的南北路沿一段很长的室外台阶往东走上去，到西侧门厅进门。')

# ---------------------------------------------------------------- 6) 广顺超市 (东区 grove strip)
SHOP = dict(id='s764_shop', name='广顺超市', k='low', f=1, r=(619.6, 229.6, 626.4, 233.8), link=(616.0, 233.8, 623.6, 235.0),
            sign=(621.0, 234.6),
            txt='广顺超市：东区的小超市（卫星图上这里有一座蓝顶小平房）。2019 年学校把“东区超市（原顺达超市）”租给玉田县广顺商贸有限公司，'
                '但招租公告写的位置是“东区澡堂楼一层”，和这里不一致；2021 年学校新闻里也提到“东区广顺超市”。位置以卫星图上的小房子为准，名字待核实。')

# ---------------------------------------------------------------- 7) 印刷厂 (south across the road from 训练馆)
PRINT = dict(id='s764_print', name='中北大学印刷厂', k='shed', f=2, r=(667.0, 288.8, 705.0, 302.0), sign=(680.0, 302.7), spot=(686.0, 287.5),
             txt='中北大学印刷厂：学校的校办产业之一（信息公开目录里有“印刷厂”这个部门，学生公众号招聘通知里写“东区训练馆（印刷厂斜对面）”）。'
                 '卫星图上训练馆南边隔一条路有一座没在 OSM 里标出来的大厂房（灰顶、东头红色、旁边蓝色披屋），这里把它当作印刷厂——这个对应关系是推定的。')

# ---------------------------------------------------------------- 8-12) 大操场 east side
STAND_E = (417.0, 268.8, 420.8, 302.0)
FIELD_GATE_NEW = ('v', 421.4, 264.0, 268.4)
FIELD_GATE_OLD = (421.4, 302.4)
PASSAGE = (416.5, 263.8, 424.0, 268.4)        # 羽毛球馆 path -> gate -> track
FOOTPATH = (421.5, 263.0, 423.6, 302.8)       # between the stand / fence and the courts
PAD_X0, PAD_X1 = 424.0, 459.73
VOLLEY = dict(name='沙滩排球场', courts=[(433.0, 301.5), (433.0, 313.5)], w=3.2, h=6.4,
              txt='沙滩排球场：大操场东南边的沙地（卫星图上是一块约 7.5×21.5 格的黄褐色长方形），画成两片南北向的沙排场地，中间拉网。')
XIAOLOU = dict(id='s764_xl', name='小楼', k='low', f=2, r=(424.0, 303.4, 428.6, 313.8),
               txt='小楼：大操场东南角、东看台南边的一座小楼（卫星图上能看到），名字和用途没有查到。')

# ---------------------------------------------------------------- 13) 西区 terrace ledges -> stairs
STAIR_REGIONS = [(345.0, 295.0, 357.5, 334.0), (340.5, 308.5, 350.0, 317.0)]

# ---------------------------------------------------------------- 16) winged wheel sculpture
WHEEL = dict(x=492.5, y=321.8, name='翅膀雕塑（飞轮）', col=[491.6, 321.3, 493.4, 321.95],
             txt='翅膀雕塑 · 铁路主题公园入口：一只带翅膀的车轮（“翅膀雕塑别具一格，与火车主题完美结合”——中北大学共青团公众号）。具体造型和尺寸没有查到，这里按“飞轮”画。')

# ---------------------------------------------------------------- 19) 七道门 underpass (兰伙路, OSM W543868342 tunnel)
UNDERPASS = dict(name='七道门下穿通道', road=(714.0, 717.0), top=283.4, deck=(712.6, 718.4), south_end=316.6,
                 connector=(706.0, 316.4, 717.0, 319.6), wall_w=0.5,
                 txt='七道门下穿通道：兰伙路从七道门路口往南下坡，两侧是挡土墙，从铁路下面的箱形通道穿过去，出来接铁路南侧的路（OSM 把这段兰伙路标为隧道）。'
                     '学校 2011 年建成的“东区地下人行通道”净宽 5 米、净高 2.87 米、长 11 米，出口有玻璃雨棚、通道内有照明——是不是同一处没有核实，这里按车行下穿通道画。')

# ---------------------------------------------------------------- 21) 北区 parking lot (OSM W543815611)
LOT = dict(r=(450.0, 144.0, 470.0, 160.0), entry=(458.0, 160.0, 462.0, 164.4),
           rows=[(144.3, 146.5, 'n'), (149.6, 151.8, 's'), (151.8, 154.0, 'n'), (157.2, 159.7, 's')], gap=(457.6, 462.4),
           name='北区停车场', txt='北区停车场：游泳馆东边的露天停车场（OSM amenity=parking），从南边的北环路进出。')

# ---------------------------------------------------------------- 23) un-trimmable footprints -> tidy axis-aligned shapes
SHAPES = {
    'w1069155869': [(173.4, 417.9), (199.4, 417.9), (199.4, 425.2), (184.5, 425.2), (184.5, 439.0), (199.4, 439.0), (199.4, 447.2),
                    (173.4, 447.2), (173.4, 439.0), (178.5, 439.0), (178.5, 425.2), (173.4, 425.2)],      # 工字楼 (satellite)
    'w544015350': [(214.6, 447.0), (262.6, 447.0), (262.6, 462.6), (252.2, 462.6), (252.2, 456.2), (228.6, 456.2), (228.6, 466.6), (214.6, 466.6)],  # 德怀楼
    'w1069157044': [(745.6, 280.4), (810.0, 280.4), (810.0, 314.4), (802.9, 314.4), (802.9, 289.6), (745.6, 289.6)],   # 文澜苑1号
    'w1069157045': [(746.4, 304.6), (811.2, 304.6), (811.2, 318.0), (746.4, 318.0)],                                   # 文澜苑2号
    's71': [(395.0, 433.9), (417.8, 433.9), (417.8, 441.1), (395.0, 441.1)],
    's73': [(339.9, 406.6), (348.3, 406.6), (348.3, 423.2), (339.9, 423.2)],
    'w1069155872': [(611.5, 163.4), (651.0, 163.4), (651.0, 194.0), (641.0, 194.0), (641.0, 174.2), (622.0, 174.2), (622.0, 194.0), (611.5, 194.0)],  # 文韬苑1号: 凹 (satellite courtyard)
}

# ---------------------------------------------------------------- 24) 地下停车场: ramp west -> east
GARAGE_H = dict(ramp=[249.0, 405.6, 254.6, 408.8], ramp_out=[258.4, 405.6, 264.0, 408.8], mouth=[247.2, 405.6, 249.0, 408.8],
                link=[264.0, 405.6, 278.6, 408.8], canopy=[248.8, 405.2, 254.8, 409.3],
                walls=[[249.0, 405.25, 254.6, 405.6], [249.0, 408.8, 254.6, 409.15], [254.4, 405.6, 254.8, 408.8],
                       [258.4, 405.25, 264.0, 405.6], [258.4, 408.8, 264.0, 409.15], [258.2, 405.6, 258.6, 408.8]],
                sign_xy=[248.0, 410.2], vents=[[256.4, 412.0], [260.8, 412.0], [256.2, 416.6], [261.0, 416.8]], dir='e')
GARAGE_TXT = ('地下停车场：15号楼（逸夫楼）南面草坪下面是地下车库（后勤公告里的“南区地下车库”应即此处，月租 150 元）。'
              '车从西边的南北路开进来，沿带雨棚的坡道往东下到车库，出口坡道在东头，往东接一小段路到东边的路上；草坪上能看到几个通风口。坡道的准确位置按卫星图近似。')

# ---------------------------------------------------------------- 26) 行知广场: teacher parking + fewer lamps
XZ = dict(rect=(462.6, 262.0, 507.0, 308.0), axis=484.05, walk=(479.6, 488.5),
          lots=[dict(r=(464.2, 266.0, 478.8, 289.0)), dict(r=(489.6, 266.0, 505.2, 289.0))],
          rows=[(266.3, 268.5, 'n'), (271.6, 273.8, 's'), (273.8, 276.0, 'n'), (279.1, 281.3, 's'), (281.3, 283.5, 'n'), (286.6, 288.8, 's')],
          txt='行知广场：主楼正南的铺装广场，中轴线上是升旗台。广场两侧划了停车位，平时是在主楼上班的老师停车的地方；中间的中轴步道通往主楼正门。')

# ---------------------------------------------------------------- 27) morning events (game side; positions here)
DRILL = dict(x0=470.0, x1=478.5, y0=292.5, y1=305.5, name='教官大队',
             txt='教官大队：学校的学生教官队伍，每天早上 6:00–7:00 在行知广场升旗台旁出操——齐步走、转体、立正（时间和地点为游戏设定）。')
GUARD = dict(start=(484.05, 263.6), pole=(484.05, 300.0), name='国旗仪仗队',
             txt='国旗仪仗队：每天 7:00 从主楼前列队正步走到升旗台，7:05 国旗升到旗杆顶，随后列队离开（时间为游戏设定；周一的升旗仪式是真实的）。')

SRC = [
    'admin.qy-office.com/shtml/zbdx/20240906/283.shtml (中北大学报 2024-09-06「遇见新北区 畅享新中北」：北区建筑、东大门广场航拍)',
    'jbjsc.nuc.edu.cn/info/1664/2151.htm (软件实验大楼：玻璃幕墙、干挂石材、铝板幕墙)',
    'jbjsc.nuc.edu.cn/info/1663/1686.htm, /info/1664/2152.htm (仪器科学大楼 216.55 m、五层、28.7 m、石材+玻璃幕墙、屋面花架)',
    'jbjsc.nuc.edu.cn/info/1677/1782.htm; 山西日报 2025-08-01 (半导体学院及研究院楼 + 能源宇航学院楼，2025-07-31 竣工)',
    'nuc.edu.cn/info/1013/40093.htm (兵器教学陈列馆 C 座 火炮厅)',
    'hkyh.nuc.edu.cn/info/1048/5012.htm (航空宇航学院：坦克模型、直升飞机)',
    'jbjsc.nuc.edu.cn/info/1663/1595.htm (17#、18#教学楼东邻文韬苑6#7#学生公寓)',
    'jbjsc.nuc.edu.cn/info/1663/1200.htm (后勤物流配送中心五层)',
    'nuc.edu.cn/info/1578/10690.htm, yqsb.nuc.edu.cn/info/1011/3135.htm, dwxcb.nuc.edu.cn/info/1056/9064.htm (广顺超市)',
    'zbxxgk.nuc.edu.cn/bmxygk/ysc.htm; weixin.sogou.com 中北就创 招聘通知「东区训练馆(印刷厂斜对面)」(印刷厂)',
    'weixin.sogou.com 中北大学共青团「和你||在中北的铁路上走一走」(翅膀雕塑); cnr.cn/sx/pic/20180821/t20180821_524337745.shtml',
    'jbjsc.nuc.edu.cn/info/1675/1115.htm (东区地下人行通道 2011：净宽5 m、净高2.87 m、长11 m、玻璃雨棚); OSM W543868342 兰伙路 tunnel',
    'OSM W543815611 amenity=parking (北区停车场)',
]


def _rect(x0, y0, x1, y1): return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
def _bbox(P): xs = [p[0] for p in P]; ys = [p[1] for p in P]; return [round(min(xs), 2), round(min(ys), 2), round(max(xs), 2), round(max(ys), 2)]


def early(L7, L72, L761, L762, L71=None):
    """module-level data patches (call right after the layout imports)"""
    if L71 is not None: swap_sidaomen(L71)
    L7.FOUNTAINS = [f for f in L7.FOUNTAINS if f['name'] != '北门喷泉']
    L72.BOARDS[:] = []
    L72.GATE_TXT['北门'] = BEIMEN_TXT; L7.REAL_GATES['北门']['txt'] = BEIMEN_TXT
    for s in L762.STANDS:
        if s['id'] == 'stand_e': s['r'] = STAND_E
    g = L761.GARAGE; g.update({k: v for k, v in GARAGE_H.items()}); g['txt'] = GARAGE_TXT
    L72.OPEN_PLAZAS.append(list(XZ['rect']))
    STATS['early'] = dict(boards=0, fountains_beimen=0)


def fields(FIELDS, L6, L7):
    """after A762.fields: courts east (footpath), no fence round them, 大操场 gate moved north"""
    st = {}
    sx = (PAD_X1 - PAD_X0) / (PAD_X1 - 421.6)
    for f in FIELDS:
        if f['k'] == 'pad' and 420 < f['x'] < 423 and 264 < f['y'] < 268:
            f['w'] = round(PAD_X1 - PAD_X0, 2); f['x'] = PAD_X0; st['pad'] = [f['x'], f['y'], f['w'], f['h']]
        elif f['k'] == 'basketball' and 421 < f['x'] < 460 and 262 < f['y'] < 292:
            f['x'] = round(PAD_X0 + (f['x'] - 421.6) * sx, 2); f['w'] = round(f['w'] * sx, 2)
    n0 = len(L7.COURT_FENCES); L7.COURT_FENCES[:] = [c for c in L7.COURT_FENCES if c['name'] != '羽毛球馆南篮球场']
    st['court_fence_removed'] = n0 - len(L7.COURT_FENCES)
    for fz in L6.FENCES:
        if fz['name'] != '大操场': continue
        g = [k for k in fz['gates'] if not (k[0] == 'v' and abs(k[1] - FIELD_GATE_OLD[0]) < 1e-6 and abs(k[2] - FIELD_GATE_OLD[1]) < 1e-6)]
        g.append(FIELD_GATE_NEW); fz['gates'] = g; st['field_gates'] = g
    st['pads_aligned'] = align_pads(FIELDS, L7)
    for cx, cy in VOLLEY['courts']:
        FIELDS.append(dict(k='volleyball', x=round(cx - VOLLEY['w'] / 2, 2), y=round(cy - VOLLEY['h'] / 2, 2), w=VOLLEY['w'], h=VOLLEY['h'], rot=0, col=None, sand=True))
    STATS['fields'] = st


def swap_sidaomen(L71):
    """四道门 north entrances: the west and east canopy + ramp + pit swap places, each moved as a whole (translation)"""
    W_ = next(p for p in L71.PASSAGES if p['id'] == 'sidaomen_w'); E_ = next(p for p in L71.PASSAGES if p['id'] == 'sidaomen_e')
    if W_.get('swapped764'): return
    w, e = W_['a'], E_['a']; dxw = e['canopy'][0] - w['canopy'][0]; dxe = w['canopy'][0] - e['canopy'][0]
    def mv(end, dx):
        end['x'] = round(end['x'] + dx, 2); end['out'] = [round(end['out'][0] + dx, 2), end['out'][1]]
        end['canopy'] = [round(end['canopy'][0] + dx, 2), end['canopy'][1], round(end['canopy'][2] + dx, 2), end['canopy'][3]]
        end['ramp'] = [round(end['ramp'][0] + dx, 2), end['ramp'][1], round(end['ramp'][2] + dx, 2), end['ramp'][3]]
    mv(w, dxw); mv(e, dxe)
    # names follow the position: the structure now on the east is the 东口
    W_['a'], E_['a'] = e, w
    W_['a']['side'] = '北 · 行知广场 西口'; E_['a']['side'] = '北 · 行知广场 东口'; W_['swapped764'] = E_['swapped764'] = True
    STATS['sidaomen_swap'] = dict(west=W_['a'], east=E_['a'])


def sidaomen_links(L71):
    """short paved links from the swapped pit mouths ('out' points) to the nearest road / footway"""
    out = []
    for p in L71.PASSAGES:
        if p['group'] != 'sidaomen': continue
        ox, oy = p['a']['out']; out.append((round(ox - 1.3, 2), 310.4, round(ox + 1.3, 2), round(oy + 1.2, 2)))
    return out


def align_pads(FIELDS, L7):
    """every court fence box: the coloured pad inside it becomes exactly the fence rectangle (no offset strip)"""
    n = 0
    for cf in L7.COURT_FENCES:
        xs = [p[0] for p in cf['pts']]; ys = [p[1] for p in cf['pts']]; r = (min(xs), min(ys), max(xs), max(ys))
        for f in FIELDS:
            if f['k'] != 'pad': continue
            ix = min(r[2], f['x'] + f['w']) - max(r[0], f['x']); iy = min(r[3], f['y'] + f['h']) - max(r[1], f['y'])
            if ix > 0 and iy > 0 and ix * iy > 0.5 * f['w'] * f['h']:
                nr = (round(r[0], 2), round(r[1], 2), round(r[2] - r[0], 2), round(r[3] - r[1], 2))
                if (f['x'], f['y'], f['w'], f['h']) != nr: f['x'], f['y'], f['w'], f['h'] = nr; n += 1
    return n


def paths(trect, C):
    """after the fields are stamped (and A762.gym_path)"""
    trect(*PASSAGE, C['PATH']); trect(*FOOTPATH, C['PATH'])


def _poly_mask(P, SUB, shape, dx=0.0, dy=0.0, s=1.0, c=(0, 0)):
    Q = [((c[0] + (x - c[0]) * s + dx) * SUB, (c[1] + (y - c[1]) * s + dy) * SUB) for x, y in P]
    xs = [q[0] for q in Q]; ys = [q[1] for q in Q]
    x0, y0 = max(0, int(min(xs)) - 1), max(0, int(min(ys)) - 1); x1, y1 = min(shape[1], int(max(xs)) + 2), min(shape[0], int(max(ys)) + 2)
    if x1 <= x0 or y1 <= y0: return None, (0, 0, 0, 0)
    im = Image.new('1', (x1 - x0, y1 - y0), 0); ImageDraw.Draw(im).polygon([(qx - x0, qy - y0) for qx, qy in Q], fill=1)
    return np.array(im, bool), (x0, y0, x1, y1)


def fit_shape(P, mask, SUB):
    """axis-aligned polygon -> smallest shift / scale (never a cut) so it clears the road mask; returns (P', info)"""
    c = (sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P)); best = None
    steps = [i * 0.25 for i in range(0, 25)]
    for s in [1.0, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.8]:
        for r in steps:
            cand = [(0.0, 0.0)] if r == 0 else [(dx, dy) for dx in (-r, 0, r) for dy in (-r, 0, r) if max(abs(dx), abs(dy)) == r]
            for dx, dy in cand:
                m, (x0, y0, x1, y1) = _poly_mask(P, SUB, mask.shape, dx, dy, s, c)
                if m is None: continue
                if not (mask[y0:y1, x0:x1] & m).any():
                    cost = (1 - s) * 30 + abs(dx) + abs(dy)
                    if best is None or cost < best[0]: best = (cost, s, dx, dy)
            if best and best[0] <= r: break
        if best: break
    if best is None: return P, dict(ok=False)
    _, s, dx, dy = best
    Q = [[round(c[0] + (x - c[0]) * s + dx, 2), round(c[1] + (y - c[1]) * s + dy, 2)] for x, y in P]
    return Q, dict(ok=True, scale=s, dx=dx, dy=dy)


def buildings(B, mask, SUB, INTROS):
    """after A762.buildings, before road_trim / LINKS / the footprint raster"""
    st = dict(shapes={}, added=[], renamed=[])
    byid = {b['id']: b for b in B}
    for bid, o in list(FACADES.items()) + list(NE.items()):
        b = byid.get(bid)
        if not b: continue
        for k, v in o.items():
            if k == 'intro': b['intro'] = v
            elif k == 'name' and v is None: b['name'] = None
            else: b[k] = v
        if o.get('special') == 'v764_semi': b['intro'] = SEMI_TXT
        if bid == 's22': b['intro'] = NE_TXT
        st['renamed'].append(bid)
    # 龙山餐厅: east, west porch, no south door
    cb = byid[CANTEEN['id']]; cb['poly'] = _rect(*CANTEEN['r']); cb['bbox'] = list(CANTEEN['r']); cb['f'] = CANTEEN['f']; cb['intro'] = CANTEEN['txt']
    cb['nodoor'] = True; cb.pop('stairs', None)
    x0, y0, x1, y1 = CANTEEN['porch']
    po = dict(id=cb['id'] + '_porch', name=cb.get('name'), k='canteen', f=1, porch=cb['id'], poly=_rect(x0, y0, x1, y1), bbox=[x0, y0, x1, y1], roof='dark',
              intro=CANTEEN['txt'], westEntry=True)
    if cb.get('enter'): po['enter'] = cb.pop('enter')
    cb['entry'] = po['id']; B.append(po)
    for d in (NE_NEW, SHOP, PRINT, XIAOLOU):
        nb = dict(id=d['id'], name=d['name'], k=d['k'], f=d['f'], poly=_rect(*d['r']), bbox=list(d['r']), approx=True)
        if 'txt' in d: nb['intro'] = d['txt']
        if d is NE_NEW: nb['intro'] = NE_TXT; nb['lookId'] = 's22'
        B.append(nb); st['added'].append(d['id'])
    for bid, P in SHAPES.items():
        b = byid.get(bid)
        if not b: continue
        Q, info = fit_shape(P, mask, SUB); b['poly'] = Q; b['bbox'] = _bbox(Q); b['tidy764'] = True; st['shapes'][bid] = info
    STATS['buildings'] = st


def _comp_boxes(m):
    """8-connected components of a bool array -> list of (y0, x0, y1, x1, n)"""
    from collections import deque
    seen = np.zeros(m.shape, bool); out = []; H, W = m.shape
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        if seen[y, x]: continue
        q = deque([(y, x)]); seen[y, x] = True; y0 = y1 = y; x0 = x1 = x; n = 0; cells = []
        while q:
            cy, cx = q.popleft(); n += 1; cells.append((cy, cx)); y0 = min(y0, cy); y1 = max(y1, cy); x0 = min(x0, cx); x1 = max(x1, cx)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; q.append((ny, nx))
        out.append((y0, x0, y1, x1, n, cells))
    return out


def _put(a, r, cls, SUB, only=None, keep=None):
    x0, y0, x1, y1 = r; sl = a[int(round(y0 * SUB)):int(round(y1 * SUB)), int(round(x0 * SUB)):int(round(x1 * SUB))]
    m = np.ones(sl.shape, bool)
    if only is not None: m &= np.isin(sl, only)
    if keep is not None: m &= ~np.isin(sl, keep)
    sl[m] = cls; return int(m.sum())


def flatten_small(a, pre, C, SUB, excl_tiles, protect, min_len=6.0, min_area=6.0):
    """TERRACE fragments that are short (bbox long side < min_len tiles) or tiny (area < min_area tiles) and not on
    二龙山 / named slopes / next to stairs -> back to the pre-terrain class (merged into the neighbouring level)"""
    t = a == C['TERRACE']; flat = 0; kept = 0; nfrag = 0
    st_near = a == C['STEPS']
    k = 3
    pad = np.zeros_like(st_near)
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1): pad |= np.roll(np.roll(st_near, dy, 0), dx, 1)
    for (y0, x0, y1, x1, n, cells) in _comp_boxes(t):
        L = max(y1 - y0 + 1, x1 - x0 + 1) / SUB; A = n / (SUB * SUB)
        tx, ty = (x0 + x1) // 2 // SUB, (y0 + y1) // 2 // SUB
        if excl_tiles[min(excl_tiles.shape[0] - 1, ty), min(excl_tiles.shape[1] - 1, tx)]: continue
        if any(r[0] <= tx <= r[2] and r[1] <= ty <= r[3] for r in protect): continue
        if L >= min_len and A >= min_area: kept += 1; continue
        cy = np.array([c[0] for c in cells]); cx = np.array([c[1] for c in cells])
        if pad[cy, cx].any() and L >= 3: continue        # cheek walls of an intentional flight
        a[cy, cx] = np.where(pre[cy, cx] == C['TERRACE'], C['GRASS'], pre[cy, cx]); flat += n; nfrag += 1
    return dict(fragments_flattened=nfrag, cells=flat, kept=kept)


def tiny_terrace_count(a, C, SUB, excl_tiles, protect, min_len=6.0, min_area=6.0):
    t = a == C['TERRACE']; n_ = 0
    st_near = a == C['STEPS']; pad = np.zeros_like(st_near)
    for dy in range(-3, 4):
        for dx in range(-3, 4): pad |= np.roll(np.roll(st_near, dy, 0), dx, 1)
    for (y0, x0, y1, x1, n, cells) in _comp_boxes(t):
        L = max(y1 - y0 + 1, x1 - x0 + 1) / SUB; A = n / (SUB * SUB); tx, ty = (x0 + x1) // 2 // SUB, (y0 + y1) // 2 // SUB
        if excl_tiles[min(excl_tiles.shape[0] - 1, ty), min(excl_tiles.shape[1] - 1, tx)]: continue
        if any(r[0] <= tx <= r[2] and r[1] <= ty <= r[3] for r in protect): continue
        if L >= min_len and A >= min_area: continue
        cy = np.array([c[0] for c in cells]); cx = np.array([c[1] for c in cells])
        if pad[cy, cx].any() and L >= 3: continue
        n_ += 1
    return n_


PAVED = ('ROAD', 'PATH', 'PLAZA', 'APRON', 'PARKING', 'STEPS')


def label_runs(m):
    """4-connected components of a bool array via row runs + union-find; returns list of (y0, y1, x0, x1, n, runs)"""
    runs = []; rows = []
    for y in range(m.shape[0]):
        r = m[y]; d = np.diff(np.concatenate(([0], r.view(np.int8), [0])))
        st_ = np.nonzero(d == 1)[0]; en = np.nonzero(d == -1)[0]
        rows.append((len(runs), len(runs) + len(st_))); runs.extend((y, int(a_), int(b_)) for a_, b_ in zip(st_, en))
    par = list(range(len(runs)))
    def find(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for y in range(1, m.shape[0]):
        i, ie = rows[y - 1]; j, je = rows[y]
        while i < ie and j < je:
            _, a0, a1 = runs[i]; _, b0, b1 = runs[j]
            if a0 < b1 and b0 < a1:
                ri, rj = find(i), find(j)
                if ri != rj: par[ri] = rj
            if a1 < b1: i += 1
            else: j += 1
    comps = {}
    for k, (y, a0, a1) in enumerate(runs): comps.setdefault(find(k), []).append((y, a0, a1))
    out = []
    for rs in comps.values():
        ys = [r[0] for r in rs]; out.append((min(ys), max(ys) + 1, min(r[1] for r in rs), max(r[2] for r in rs), sum(r[2] - r[1] for r in rs), rs))
    return out


def road_patches(a, C, SUB, max_tiles=4.0):
    """isolated small patches of another paved surface fully enclosed by ROAD (-> ROAD), and tiny ROAD specks
    enclosed by one other paved surface (-> that surface). Returns [(from, to, (ys, xs, comp))]"""
    out = []; road = a == C['ROAD']; H, W = a.shape
    def ring_of(y0, y1, x0, x1, rs):
        ys = slice(max(0, y0 - 1), min(H, y1 + 1)); xs = slice(max(0, x0 - 1), min(W, x1 + 1))
        comp = np.zeros((ys.stop - ys.start, xs.stop - xs.start), bool)
        for (y, a0, a1) in rs: comp[y - ys.start, a0 - xs.start:a1 - xs.start] = True
        d = comp.copy(); d[1:] |= comp[:-1]; d[:-1] |= comp[1:]; d[:, 1:] |= comp[:, :-1]; d[:, :-1] |= comp[:, 1:]
        return ys, xs, comp, d & ~comp
    for name in ('PATH', 'PLAZA', 'APRON', 'PARKING', 'STEPS'):
        for (y0, y1, x0, x1, n, rs) in label_runs(a == C[name]):
            if n > max_tiles * SUB * SUB: continue
            ys, xs, comp, ring = ring_of(y0, y1, x0, x1, rs)
            if ring.sum() and road[ys, xs][ring].mean() >= 0.95: out.append((name, 'ROAD', (ys, xs, comp)))
    for (y0, y1, x0, x1, n, rs) in label_runs(road):
        if n > 1.0 * SUB * SUB: continue
        ys, xs, comp, ring = ring_of(y0, y1, x0, x1, rs); blk = a[ys, xs][ring]
        if not blk.size: continue
        vals, cnt = np.unique(blk, return_counts=True); k = int(np.argmax(cnt))
        if cnt[k] / blk.size >= 0.95 and int(vals[k]) in [C[p] for p in ('PATH', 'PLAZA', 'PARKING', 'APRON')]:
            out.append(('ROAD', [p for p in ('PATH', 'PLAZA', 'PARKING', 'APRON') if C[p] == int(vals[k])][0], (ys, xs, comp)))
    return out


def fix_road_patches(a, C, SUB):
    P = road_patches(a, C, SUB); by = {}
    for src, dst, (ys, xs, comp) in P:
        blk = a[ys, xs]; blk[comp] = C[dst]; by[src + '->' + dst] = by.get(src + '->' + dst, 0) + 1
    return len(P), by


def rail_y(rails, x, near):
    best = None
    for ln in rails:
        for (x0, y0), (x1, y1) in zip(ln, ln[1:]):
            if abs(x1 - x0) < 1e-6: continue
            t = (x - x0) / (x1 - x0)
            if -0.6 <= t <= 1.6:
                y = y0 + t * (y1 - y0)
                if abs(y - near) < 8 and (best is None or abs(t - 0.5) < best[1]): best = (round(y, 2), abs(t - 0.5))
    return best[0] if best else near


DEHUAI = dict(rect=(228.0, 465.0, 257.0, 479.0), axis=242.5)


def _dehuai_square(a, C, SUB):
    """inside the 德怀楼 loop road only: PLAZA cells west / east of the rect (but inside the road) -> GRASS"""
    x0, y0, x1, y1 = DEHUAI['rect']; n = 0
    for yy in range(int(y0 * SUB), int(y1 * SUB)):
        row = a[yy]
        # west wedge: scan east from the loop road to the rect edge
        xs = [x for x in range(int((x0 - 12) * SUB), int(x0 * SUB)) if row[x] == C['ROAD']]
        if xs:
            for x in range(max(xs) + 1, int(x0 * SUB)):
                if row[x] == C['PLAZA']: row[x] = C['GRASS']; n += 1
        xs = [x for x in range(int(x1 * SUB), int((x1 + 12) * SUB)) if row[x] == C['ROAD']]
        if xs:
            for x in range(int(x1 * SUB), min(xs)):
                if row[x] == C['PLAZA']: row[x] = C['GRASS']; n += 1
    return n


def stamp(a, C, SUB, pre, excl_tiles, slopes, rails):
    """after the terrain / slopes / 二龙山 / A762.stamp: stairs, paths, lots, underpass, flatten, road audit"""
    st = {}
    BLD = [C['BUILDING']]
    OPEN = [C['OUT'], C['GRASS'], C['WOOD'], C['DEEPWOOD'], C['APRON'], C['TERRACE'], C['HILL'], C['FLOWERS'], C['BARE']]
    # 13) 西区 ledges -> stairs (component bounding boxes, half a tile wider)
    n13 = 0
    for (rx0, ry0, rx1, ry1) in STAIR_REGIONS:
        sl = a[int(ry0 * SUB):int(ry1 * SUB), int(rx0 * SUB):int(rx1 * SUB)]
        for (y0, x0, y1, x1, n, cells) in _comp_boxes(sl == C['TERRACE']):
            b = sl[max(0, y0 - 2):y1 + 3, max(0, x0 - 2):x1 + 3]; m = np.isin(b, [C['TERRACE'], C['GRASS'], C['APRON'], C['WOOD']]); b[m] = C['STEPS']; n13 += 1
    st['west_ledges_to_stairs'] = n13
    # 5) 龙山餐厅 west stair + landing
    st['canteen_stairs'] = _put(a, CANTEEN['stairs'], C['STEPS'], SUB, keep=BLD + [C['ROAD']])
    st['canteen_landing'] = _put(a, CANTEEN['landing'], C['PLAZA'], SUB, keep=BLD)
    # 6) shop link, 7) print shop surroundings (OUT -> GRASS)
    _put(a, SHOP['link'], C['PATH'], SUB, keep=BLD + [C['ROAD']])
    x0, y0, x1, y1 = PRINT['r']; _put(a, (x0 - 1.5, y0 - 0.6, x1 + 1.5, y1 + 1.5), C['GRASS'], SUB, only=[C['OUT']])
    # G) 德怀广场: paved area squared to an axis-aligned rect centred on the statue axis (x 242.5); the leftover
    #    wedges between the rect and the (real, diagonal) loop road become lawn. Road cells are never touched.
    st['dehuai_lawn'] = _dehuai_square(a, C, SUB)
    # 21) 北区 parking lot: one clean rectangle, flat surroundings, entrance to the road
    x0, y0, x1, y1 = LOT['r']
    _put(a, (x0 - 2.0, y0 - 2.0, x1 + 2.0, y1 + 2.4), C['GRASS'], SUB, only=[C['PARKING'], C['TERRACE'], C['APRON']])
    _put(a, LOT['r'], C['PARKING'], SUB, keep=BLD + [C['ROAD']])
    _put(a, LOT['entry'], C['PARKING'], SUB, keep=BLD + [C['ROAD']])
    # 24) garage: exit ramp + link road east
    from layout_v761 import GARAGE as G
    _put(a, G['ramp_out'], C['ROAD'], SUB, keep=BLD); _put(a, G['link'], C['ROAD'], SUB, keep=BLD + [C['ROAD']])
    # 19) 七道门 underpass: road on through the rail corridor, connector onto the south road
    U = UNDERPASS; r0, r1 = U['road']
    _put(a, (r0, U['top'], r1, U['south_end']), C['ROAD'], SUB, keep=BLD)
    _put(a, U['connector'], C['ROAD'], SUB, keep=BLD)
    U['rail'] = [rail_y(rails, U['deck'][0], 308), rail_y(rails, U['deck'][1], 308)]
    yc = (U['rail'][0] + U['rail'][1]) / 2
    U['slope_n'] = (U['top'], round(yc - 1.6, 2)); U['slope_s'] = (round(yc + 1.6, 2), U['south_end'] - 0.2)
    ww = U['wall_w']
    U['walls'] = [[r0 - ww, U['top'] + 0.6, r0, round(yc - 1.3, 2)], [r1, U['top'] + 0.6, r1 + ww, round(yc - 1.3, 2)],
                  [r0 - ww, round(yc + 1.3, 2), r0, U['south_end'] - 0.6], [r1, round(yc + 1.3, 2), r1 + ww, U['south_end'] - 0.6]]
    for w in U['walls']: _put(a, w, C['GRASS'], SUB, only=[C['OUT'], C['RAIL'], C['TERRACE']])
    _put(a, (r0 - 1.5, U['top'], r1 + 1.5, U['south_end']), C['GRASS'], SUB, only=[C['OUT'], C['TERRACE']])
    # 22) tiny terrace islands / stubs -> flattened (二龙山 + the four named slopes + stairs kept)
    protect = [(s[0], s[1], s[2], s[3]) for s in slopes]
    st['tiny_terrace_before'] = tiny_terrace_count(a, C, SUB, excl_tiles, protect)
    st['flatten'] = flatten_small(a, pre, C, SUB, excl_tiles, protect)
    st['tiny_terrace_after'] = tiny_terrace_count(a, C, SUB, excl_tiles, protect)
    # 18) road colour audit: small foreign patches inside roads
    n0 = len(road_patches(a, C, SUB)); n_fix, by = fix_road_patches(a, C, SUB); n1 = len(road_patches(a, C, SUB))
    st['road_patches'] = dict(before=n0, fixed=n_fix, by=by, after=n1)
    STATS['stamp'] = st
    return st


# ---------------------------------------------------------------- 25) trees: forest on hills, tidy rows on campus
# places earlier versions deliberately keep free of trees (tank lawns, library forecourt, plazas, lots, canopies)
NO_TREES = [(297, 425, 331, 436.5), (292, 377.2, 336, 389.4), (418, 225.5, 436, 235.5), (463, 262, 507, 308), (450, 144, 470, 164.4),
            (467.6, 310.3, 507.9, 315.8), (244, 403, 282, 412), (429, 295.5, 437, 320.5), (417, 263.8, 424, 302.8), (712, 283, 719, 320)]


def tidy_trees(trees, a, C, SUB, hill_tiles, parks, rails, crossings, buildings, W, H):
    """keep trees on 二龙山 / hills / real parks; replace the rest by street-tree rows, rows in front of buildings and a
    railway green belt (hedge shrubs + a tree line both sides of the track, crossings / roads kept clear)"""
    def cls(x, y):
        xi, yi = int(x * SUB), int(y * SUB)
        return a[yi, xi] if 0 <= yi < a.shape[0] and 0 <= xi < a.shape[1] else C['OUT']
    def inpoly(x, y, P):
        ins = False
        for i in range(len(P)):
            x1, y1 = P[i]; x2, y2 = P[i - 1]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1: ins = not ins
        return ins
    def area(x, y):
        if hill_tiles[min(H - 1, int(y)), min(W - 1, int(x))]: return '二龙山 / 山地'
        if y < 135: return '北区'
        if y > 340: return '南区'
        return '东区' if x >= 470 else '西区'
    def keep(t):
        x, y = t[0], t[1]
        if hill_tiles[min(H - 1, int(y)), min(W - 1, int(x))]: return True
        if cls(x, y) in (C['HILL'], C['DEEPWOOD'], C['WOOD']): return True
        return any(inpoly(x, y, P) for P in parks)
    before = {}
    for t in trees: k = area(t[0], t[1]); before[k] = before.get(k, 0) + 1
    kept = [t for t in trees if keep(t)]
    occ = set((int(t[0] * 2), int(t[1] * 2)) for t in kept)
    OK1 = (C['GRASS'],); OK2 = (C['GRASS'], C['APRON'], C['FLOWERS'])
    def free(x, y, r=1.6):
        if cls(x, y) not in OK1: return False
        for dx, dy in ((0, 0), (-0.9, 0), (0.9, 0), (0, -0.9), (0, 0.9)):
            if cls(x + dx, y + dy) not in OK2: return False
        k = (int(x * 2), int(y * 2))
        for i in range(-int(r * 2), int(r * 2) + 1):
            for j in range(-int(r * 2), int(r * 2) + 1):
                if (k[0] + i, k[1] + j) in occ: return False
        return True
    old = set((int(t[0]), int(t[1])) for t in trees)
    NOGO = [tuple(z) for z in NO_TREES]
    MODE = ['campus']
    def add(x, y, kind, r=1.6):
        if any(z[0] - 1 < x < z[2] + 1 and z[1] - 1 < y < z[3] + 1.5 for z in NOGO): return False
        if MODE[0] == 'campus' and not any((int(x) + i, int(y) + j) in old for i in (-1, 0, 1) for j in (-1, 0, 1)): return False
        if 1 < x < W - 1 and 1 < y < H - 1 and free(x, y, r): kept.append([round(x, 1), round(y, 1), kind]); occ.add((int(x * 2), int(y * 2))); return True
        return False
    rnd = np.random.RandomState(764)
    # street trees: grass cell 1.5 tiles off a road / footway edge, on a 4-tile rhythm aligned to the grid
    R = (a == C['ROAD']) | (a == C['PATH'])
    Rt = R[SUB // 2::SUB, SUB // 2::SUB][:H, :W]
    n_st = 0
    for ty in range(2, H - 2):
        for tx in range(2, W - 2):
            if not Rt[ty, tx]: continue
            horiz = Rt[ty, tx - 1] and Rt[ty, tx + 1]; vert = Rt[ty - 1, tx] and Rt[ty + 1, tx]
            if horiz and not vert and tx % 4 == 0:
                for d in (-1, 1):
                    if not Rt[ty + d, tx] and not Rt[ty + 2 * d, tx]:
                        n_st += add(tx + 0.5, ty + 0.5 + d * 1.6, 0 if (tx // 4) % 3 else 1)
            if vert and not horiz and ty % 4 == 0:
                for d in (-1, 1):
                    if not Rt[ty, tx + d] and not Rt[ty, tx + 2 * d]:
                        n_st += add(tx + 0.5 + d * 1.6, ty + 0.8, 0 if (ty // 4) % 3 else 1)
    # rows in front of buildings (south face, 3 tiles out, every 5 tiles)
    n_bd = 0
    for b in buildings:
        if b.get('bridge') or not b.get('name') or b.get('porch'): continue
        x0, y0, x1, y1 = b['bbox']
        if x1 - x0 < 8: continue
        x = x0 + 2.0
        while x < x1 - 1.5: n_bd += add(x, y1 + 3.2, 5 if b.get('k') == 'dorm' else 2, 2.0); x += 5.0
    # railway green belt: shrub hedge 2.6 tiles off the track, tree line 4.2 tiles off, both sides; not on crossings / roads
    n_hd = n_rt = 0
    OK1 = OK2 = (C['GRASS'], C['OUT'], C['BARE'], C['APRON'])   # the rail corridor is mostly unclassified ground
    MODE[0] = 'rail'
    def near_cross(x, y): return any(min(math.hypot(x - p[0], y - p[1]) for p in c['pts']) < 6 for c in crossings)
    for ln in rails:
        for (x0, y0), (x1, y1) in zip(ln, ln[1:]):
            L = math.hypot(x1 - x0, y1 - y0)
            if L < 1: continue
            ux, uy = (x1 - x0) / L, (y1 - y0) / L; nx, ny = -uy, ux
            s = 0.0
            while s < L:
                px, py = x0 + ux * s, y0 + uy * s
                if not near_cross(px, py):
                    for d in (-1, 1):
                        if int(s) % 2 == 0: n_hd += add(px + nx * 2.6 * d, py + ny * 2.6 * d, 3, 0.45)
                        if int(s) % 5 == 0: n_rt += add(px + nx * 4.4 * d, py + ny * 4.4 * d, 4 if d < 0 else 0, 1.8)
                s += 1.0
    after = {}
    for t in kept: k = area(t[0], t[1]); after[k] = after.get(k, 0) + 1
    STATS['trees'] = dict(before=before, after=after, total_before=len(trees), total_after=len(kept), street=n_st, building_rows=n_bd, rail_hedge=n_hd, rail_trees=n_rt)
    return kept


def props(buildings):
    return dict(plane=PLANE, wheel=WHEEL, volley=VOLLEY, shop=dict(name=SHOP['name'], x=SHOP['sign'][0], y=SHOP['sign'][1], txt=SHOP['txt']),
                printing=dict(name=PRINT['name'], x=PRINT['sign'][0], y=PRINT['sign'][1], txt=PRINT['txt']),
                underpass={k: v for k, v in UNDERPASS.items()}, lot=LOT, xz=XZ, drill=DRILL, guard=GUARD, src=SRC,
                ew_stairs=[list(CANTEEN['stairs'])], lots=[list(LOT['r']), list(LOT['entry'])] + [list(q['r']) for q in XZ['lots']], dehuai=DEHUAI)


def spots():
    return [dict(id='yinshuachang', name=PRINT['name'], kz='校办产业 · 名称对应为推定', x=PRINT['spot'][0], y=PRINT['spot'][1], r=4.0, intro=PRINT['txt']),
            dict(id='guangshun', name=SHOP['name'], kz='小超市 · 名称待核实', x=SHOP['sign'][0], y=SHOP['sign'][1] + 0.6, r=3.0, intro=SHOP['txt']),
            dict(id='qidaomen_up', name=UNDERPASS['name'], kz='兰伙路下穿铁路', x=715.5, y=300.0, r=5.0, intro=UNDERPASS['txt']),
            dict(id='xingzhi', name='行知广场', kz='广场 · 教师停车', x=484.0, y=280.0, r=9.0, intro=XZ['txt']),
            dict(id='beilot', name=LOT['name'], kz='停车场', x=460.0, y=152.0, r=6.0, intro=LOT['txt']),
            dict(id='volley', name=VOLLEY['name'], kz='沙排场', x=433.0, y=307.5, r=4.0, intro=VOLLEY['txt']),
            dict(id='xiaolou', name=XIAOLOU['name'], kz='名称未查到', x=426.3, y=314.6, r=2.5, intro=XIAOLOU['txt'])]

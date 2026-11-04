"""v7.6 additions (approximate, traced on the OSM / imagery grid; tile units, 1 tile = 2.5 m).

1) [superseded in v7.6.1 -> layout_v761.RAIL_BRIDGE] 南区铁路地下通道: a pedestrian underpass under the 上兰村线 where the N-S campus road (OSM way 542204812, level
   crossing node 8712372628 at 241.8, 375.3) crosses the railway, between 文瀛苑 / 柏林园 (north) and the teaching
   area (15号楼 · 逸夫楼 just south-east of the crossing, the road continues south past it to 4号楼 · 酬学楼 behind
   德怀楼). No public drawing of this underpass was found: both mouths, the stairs-plus-slope layout and the glass
   canopies copy the documented 东区 / 四道门 underpass (jbjsc.nuc.edu.cn/info/1675/1115.htm). In the game the road is
   cut by the fenced railway at this point (unchanged since v7.5.1), so the underpass is how you cross here.
2) 15号楼 · 逸夫楼 (U-shaped, opens west, completed 2013) and 4号楼 · 酬学楼 (directly behind / north of 德怀楼):
   footprints traced from the satellite mosaic, they are missing from OSM.
3) 柏林园: OSM park 1069158508 north of the railway (west of the N-S road, east of 二龙山 — 百度百科 “西倚二龙山”).
   侧柏 forest, 青石 / 鹅卵石 paths, the entrance pond + fountain, the 77 m 文化长廊, a 凉亭 and the 刘鼎塑像.
"""
# ---- 1) (v7.6.1) the v7.6 pedestrian underpass was wrong: it is a plain road under a rail bridge -> layout_v761.RAIL_BRIDGE

# ---- 2) missing teaching buildings (tile polygons)
BUILDINGS = [
    dict(id='v76_15', name='15号楼 · 逸夫楼', k='teach', f=5,
         poly=[(246.2, 377.0), (261.5, 377.0), (261.5, 375.9), (274.5, 375.9), (274.5, 404.5), (249.0, 404.5),
               (249.0, 397.0), (261.5, 397.0), (261.5, 386.2), (246.2, 386.2)],
         intro='15号楼 · 逸夫楼：二道门旁的 U 形教学楼（2013 年竣工），北侧是人文与社会科学学院，南侧是经济与管理学院，'
               '中间是普通教室和语音教室。北面就是南北大路从铁路桥下穿过的地方，南面草坪下是地下停车场。'),
    dict(id='v76_4', name='4号楼 · 酬学楼', k='teach', f=4,
         poly=[(229.5, 429.5), (246.4, 429.5), (246.4, 439.2), (229.5, 439.2)],
         intro='4号楼 · 酬学楼：在 7号楼（德怀楼）正后方，和 2号楼（工字楼）相对。从铁路桥下顺着南北大路往南走就到。'),
]

# ---- 3) 柏林园
BAILIN_POLY = [(222.5, 259.1), (221.0, 312.2), (190.9, 321.2), (175.1, 379.5), (241.0, 369.9), (232.3, 256.6)]
BAILIN = dict(
    name='柏林园',
    plaza=(225.0, 329.0, 236.6, 338.6),                 # east entrance square (paved patch on the imagery)
    entry=(236.6, 332.4, 238.6, 334.6),                 # join to the N-S road
    # v7.6.2 (user): no big round fountain pond in the middle of the forest - a small pond right beside the 文化长廊
    pond=dict(c=(205.0, 336.4), r=(4.4, 2.0), lobe=dict(c=(200.4, 337.0), r=(2.4, 1.4)),
              name='柏林园小池塘', x=203.4, y=336.6, txt='柏林园小池塘：文化长廊北边的一汪小池塘，池边几块山石，夏天有荷叶。'),
    gallery=dict(name='柏林园文化长廊', x0=194.2, x1=225.0, y0=339.4, y1=341.6,
                 txt='柏林园文化长廊：入口处的 77 米长廊，2020 年由艺术学院学生重新彩绘，枋梁上画着山水、花鸟、风景。'),
    pavilion=dict(name='柏林园凉亭', x=191.6, y=341.8, w=4.4, h=3.6, txt='柏林园里的凉亭（位置近似）。'),
    wall=dict(name='柏林园文化墙', x=230.8, y=329.6, w=9.0, txt='柏林园入口的文化墙（位置近似）。'),
    paths=[   # 青石小路 / 鹅卵幽径 (tile polylines)
        [(230.5, 338.6), (227.0, 347.0), (219.5, 356.0), (209.5, 363.5), (198.0, 369.5), (186.0, 375.5)],
        [(210.0, 341.6), (211.5, 351.0), (219.5, 356.0)],
        [(192.0, 343.6), (190.0, 352.0), (195.5, 362.0), (198.0, 369.5)],
        [(219.5, 356.0), (231.0, 363.5), (239.6, 368.6)],
        [(226.5, 329.0), (231.4, 323.4), (231.0, 314.0), (228.5, 304.0), (229.0, 290.0), (227.0, 262.0)],
        [(225.0, 334.0), (219.5, 330.0), (215.0, 334.5), (213.0, 339.4)],
    ],
    path_w=1.3,
    tree_step=1.75,
    txt='柏林园：校园西南角、二龙山东麓的柏树林，约 3 万平方米，太原市四星级公园。园里是成片的侧柏，青石小路、鹅卵石幽径'
        '穿林而过，入口处有 77 米文化长廊，长廊边有一汪小池塘，还有凉亭，刘鼎塑像立在园中。“龙山飞瀑，柏林冬色”。')

LIUDING = dict(name='刘鼎塑像', x=229.0, y=336.2,
               txt='刘鼎塑像：中北大学第一任校长刘鼎（1902—1986，四川南溪人）的半身像，2002 年立于柏林园，像高 0.6 米。'
                   '基座东面是聂荣臻题词“奉献毕生，鞠躬尽瘁”，西面是习仲勋题词“统战功臣，兵工泰斗”，背面刻着刘鼎生平。')

SUBAREAS_ADD = [('柏林园', 206.0, 330.0)]

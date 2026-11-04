# v7.1 layout corrections (user feedback [pt14u]) — positions read off data/sat_z18.jpg (tile coords, 2.5 m/tile)
# 1) 四道门地下通道: two glass-canopied entrance pits, west + east of the 行知广场 crossing, on the north side of the
#    railway; both run down into ONE tunnel that comes up at a single exit south of the railway.
SIDAOMEN_SOUTH = dict(x=487.0, y=357.2, out=[487.0, 359.0], side='南 · 铁路南侧')
PASSAGES = [
    dict(id='sidaomen_w', name='四道门地下通道（西口）', title='四道门地下通道', group='sidaomen', osm='W542204790',
         a=dict(x=481.0, y=313.8, out=[483.8, 313.8], side='北 · 行知广场 西口',
                canopy=[467.6, 311.8, 482.9, 315.8], ramp=[467.9, 312.4, 479.6, 315.2]),
         b=SIDAOMEN_SOUTH),
    dict(id='sidaomen_e', name='四道门地下通道（东口）', title='四道门地下通道', group='sidaomen', osm='W542204790',
         a=dict(x=494.2, y=312.4, out=[491.4, 312.4], side='北 · 行知广场 东口',
                canopy=[492.6, 310.3, 505.3, 314.5], ramp=[495.6, 310.9, 505.0, 313.9]),
         b=SIDAOMEN_SOUTH),
]
# 2) 二道门: the big willow stands IN the road where it meets the railway (a tree island); the junction is widened
#    into a round paved crossing so you can walk all the way around it.
WILLOW = dict(name='二道门大柳树', x=277.1, y=365.4,
              txt='二道门：这里并没有门，同学们说的“二道门”是铁路道口路中间的一棵大柳树，车和人都绕着它走。')
JUNCTION = dict(c=(277.2, 364.4), r=5.2)            # round asphalt island crossing (rail / buildings untouched)
# 3) 铁路主题公园: opposite 行知广场, across the road — a line of green 25-type coaches with a yellow band on the
#    northern track, led by a diesel locomotive (satellite: grey-roofed cars x 430..537 on the north track).
RAIL_TRACK = [(432.43, 339.05), (549.98, 319.28)]   # OSM rail centre line the train stands on
RAIL_PARK = dict(name='铁路主题公园', x0=452.0, cars=[('coach', 10.0)] * 6 + [('loco', 8.4)], gap=0.5,
                 platform=dict(x0=468.0, x1=508.0, n0=-2.55, n1=-1.0),
                 sign=(486.0, 328.7, '上兰村站'), signals=[(470.0, -1.3), (506.0, -1.3)],
                 txt='铁路主题公园：行知广场对面、铁路北侧的一溜绿皮火车（25 型客车，车头为内燃机车），配站台和站牌（近似复原）。')
# 4) the 怡丁苑 football field's tank display. v7.1 put it on the old “rail plaza” lawn NORTH of the field (under
#    怡丁苑1号公寓); v7.5.1 moves it to the SOUTH side, across the road below the field, on a lawn cleared out of
#    the wood there, joined to the road by a short path. The old north spot stays a plain lawn (no plinth, no lamps).
TANK = dict(name='坦克展台', x=314.0, y=430.0, lawn=(297.0, 425.0, 331.0, 436.5), plinth=(306.5, 426.0, 321.5, 431.6),
            link=(312.5, 424.0, 315.5, 426.0), north_lawn=(292.0, 377.2, 336.0, 389.4),
            txt='坦克展台：怡丁苑足球场南侧、路南草坪上陈列的一辆退役坦克（兵器类院校特色，外形近似）。')
SUBAREAS = {'二道门 · 大柳树': ('二道门 · 大柳树', 282.0, 361.0), '铁路主题广场': ('坦克展台', 314.0, 434.5)}
SUBAREAS_ADD = [('铁路主题公园', 488.0, 322.4)]

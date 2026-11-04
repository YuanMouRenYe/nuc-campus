"""v7.6.1 (tile units, 1 tile = 2.5 m; traced on the OSM / imagery grid, approximate).

1) 南区铁路桥下道路: the N-S campus road (OSM way 542204812) simply runs straight on UNDER the 上兰村线 here
   (OSM node 8712372628 at 241.8, 375.3 is where the two ways meet). The v7.6 glass-canopy pedestrian underpass is
   gone: the road dips a little (gentle slope on each side, low retaining walls), the railway crosses over on a short
   concrete deck with two abutments beside the road. No teleport.
2) 地下停车场 under the lawn just south of 15号楼 · 逸夫楼 (hqfw.nuc.edu.cn/info/1084/10756.htm lists a 南区地下车库).
   OSM has no parking tag here; the ramp is placed on the faint light N-S strip seen on the imagery just south of the
   south-west corner of 15号楼 (east of the road, positioned relative to the building) — position approximate.
3) 小树林 (the east lobe of OSM park 1069158507, south of the garage): round fountain visible on the imagery at about
   (255, 432.5), a diagonal path to the east road, a 凉亭 (not identifiable on the imagery: placed by the path) —
   nuc.edu.cn/info/1353/37503.htm (2025): “集中修葺了休闲凉亭，增设了花园小喷泉”.
"""
RAIL_BRIDGE = dict(
    name='南区铁路桥（道路下穿）', osm='W542204812 × W940740149 · N8712372628',
    road=(239.8, 244.4),                 # road edges under the deck (x)
    deck=(238.4, 245.8),                 # deck span incl. abutments (x)
    repave=(239.8, 373.0, 244.4, 377.6), # RAIL -> ROAD under the deck
    abut=[(238.5, 373.6, 239.8, 377.4), (244.4, 373.0, 245.7, 376.9)],
    walls=[(239.25, 371.0, 239.8, 373.6), (244.4, 371.0, 244.95, 373.0), (239.25, 377.4, 239.8, 380.0), (244.4, 376.9, 244.95, 379.8)],
    slope_n=(370.6, 373.3), slope_s=(377.3, 380.2),
    txt='南区铁路桥：校内南北大路在这里直接从上兰村线铁路下面穿过去——路面稍微下沉，两头是缓坡，'
        '铁路架在一小段混凝土桥面上，两侧是桥台和矮挡墙。北边是文瀛苑 / 柏林园，往南就是 15号楼（逸夫楼）、地下停车场和 4号楼。')

GARAGE = dict(
    name='地下停车场', sign='P 地下停车场',
    roof=(248.4, 405.2, 264.0, 419.5),   # lawn on top of the garage box
    ramp=(248.9, 405.4, 252.2, 413.6),   # vehicle ramp: flat apron off the road at the north end, door at the south end
    mouth=(247.2, 405.4, 249.0, 407.6),  # short paved link from the road to the ramp mouth
    canopy=(248.5, 409.4, 252.6, 414.1),
    walls=[(248.85, 407.6, 249.3, 413.8), (251.8, 407.6, 252.25, 413.8), (248.85, 413.6, 252.25, 414.1)],
    sign_xy=(253.0, 406.3),
    vents=[(256.0, 409.0), (260.5, 409.2), (256.2, 416.6), (261.0, 416.8)],
    txt='地下停车场：15号楼（逸夫楼）南面草坪下面是地下车库（后勤公告里的“南区地下车库”应即此处，月租 150 元），'
        '车道从路边往下开，坡道上有雨棚和“P”标志，草坪上能看到几个通风口。坡道的准确位置按卫星图近似。')

GROVE = dict(
    name='小树林', poly=[(248.8, 420.4), (281.0, 420.4), (281.0, 446.0), (262.0, 446.0), (249.6, 440.0)],
    fountain=dict(name='小树林喷泉', x=255.0, y=432.5, txt='小树林里的圆形小喷泉（卫星图上能看到圆形水池），周围一圈铺装小广场。'),
    plaza_c=(255.0, 432.5), plaza_r=2.6,
    paths=[[(248.6, 432.4), (252.4, 432.5)], [(257.4, 431.8), (262.0, 430.2), (270.0, 425.8), (281.2, 424.2)],
           [(255.0, 435.0), (257.0, 440.5), (262.5, 444.5)], [(255.0, 430.0), (256.0, 424.0), (253.0, 420.6)]],
    path_w=1.2,
    pavilion=dict(name='小树林凉亭', x=266.4, y=430.8, w=3.6, h=3.2,
                  txt='小树林里的休闲凉亭（2025 年学校“集中修葺了休闲凉亭，增设了花园小喷泉”）。卫星图上被树冠挡住，位置为近似。'),
    txt='逸夫楼南面的小树林（OSM 公园 1069158507 东半部）：树荫里有一条斜穿的小路、一座凉亭和一个圆形喷泉。')

SUBAREAS_ADD = [('南区铁路桥', 236.2, 371.0), ('地下停车场', 255.0, 413.0), ('小树林', 270.0, 438.0)]

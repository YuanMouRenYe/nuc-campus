"""v7.6.2 hand layout (tile coordinates). Plain data; build_map.py applies it.

MAIN_SPLIT : 主楼 (front block with the 「中北大学」 characters) vs 11号楼 (rear U-shaped block), as (u, v) fractions of the
             squared 主楼 OSM outline (u west->east, v north->south), read off the z18 imagery (reference only).
SCIENCE    : the 现代分析测试中心 outline split into 科学楼 A/B/C bars + spine and the 瑾瑜国际会议中心 (low podium + fan hall).
STANDS     : 大操场 grandstands: west 主席台 + 看台 over the 体育器材室, east 看台 / 体育器材室 between the track and the courts.
LIBRARY    : the two fountains in front of the 图书馆 (OSM amenity=fountain W543817505 / W543817507) and the arched stair.
PASSAGE17  : the ground-floor walk-through (穿堂) of 文瀛苑17号公寓.
NW         : 西北 relabels (附属学校, 家属楼, 校医院, 新能源化工研究院 ...).
"""
MAIN_ID = 'w535204584'
MAIN_V = 0.455            # 主楼 = v 0.455 .. 1 ; 11号楼 = v 0 .. 0.425 (courtyard u 0.235 .. 0.72, v 0.19 .. 0.425)
REAR = dict(id='b11', name='11号楼', k='teach', f=6,
            intro='11号楼：主楼正后方（北面）的口字形教学楼，和主楼围出一个内院。'
                  '（学校资料里“11号楼”也常指整个教学主楼建筑群，2004 年竣工、49958 ㎡；这里按同学的叫法把后楼单独标为 11 号楼）')
MAIN_INTRO = '主楼：正面挂着「中北大学」四个大字，9 层，正南是行知广场和升旗台；身后（北面）是 11 号楼。'

SCI_ID = 'w1069155871'
SCIENCE = [   # (id, name, floors, (u0, v0, u1, v1)) in the squared outline
    ('sciC', '科学楼 C 座', 9, (0.06, 0.0, 1.0, 0.16)),
    ('sciB', '科学楼 B 座', 8, (0.56, 0.35, 1.0, 0.53)),
    ('sciA', '科学楼 A 座', 8, (0.56, 0.78, 1.0, 1.0)),
    ('sciS', None, 8, (0.56, 0.16, 0.68, 0.78)),     # spine / 连廊 joining the three bars
]
SCI_INTRO = '科学楼（现代分析测试中心）：A 座 8 层（机电工程学院）、B 座 8 层（信息与通信工程学院）、C 座 9 层（化学与化工学院），与瑾瑜国际会议中心由地下通道和空中连廊连成一组。（A/B/C 对应哪一栋为推定）'
JINYU = dict(id='jinyu_hall', name='瑾瑜国际会议中心', k='hall', special='jinyu', f=2,
             podium=(0.0, 0.21, 0.56, 0.62),   # u/v box of the low podium
             fan_r=0.42,                       # fan radius as a fraction of the outline width
             intro='瑾瑜国际会议中心：现代分析测试中心的一部分，4428.67 ㎡，地上一层、局部二层，用于会议、会展和科研院办公；'
                   '西南角是扇形的学术报告厅，屋面像台阶一样一圈圈落下。（外形按卫星图推定）')

# 大操场 grandstands
TRACK_W = 377.0           # track west edge; east edge 416.5
STANDS = [
    dict(id='stand_wn', name='西看台', k='stand', special='stand', face='e', f=1, r=(374.6, 263.6, 376.8, 274.4),
         intro='西看台：主席台北侧的看台，台下是体育器材室。'),
    dict(id='tribune', name='主席台', k='stand', special='tribune', face='e', f=2, r=(374.6, 274.6, 377.0, 293.0),
         intro='主席台：大操场西侧正中，带遮阳顶棚的检阅台，运动会开幕、颁奖和各种活动报告都在这里；台下是体育器材室。'),
    dict(id='stand_ws', name='西看台', k='stand', special='stand', face='e', f=1, r=(374.6, 293.2, 376.8, 301.4),
         intro='西看台：主席台南侧的看台，台下是体育器材室。'),
    dict(id='stand_e', name='体育器材室 · 东看台', k='stand', special='stand', face='w', f=1, r=(417.0, 265.8, 420.8, 301.0),
         intro='体育器材室：操场和篮球场之间的一长溜矮房子，存放体育器材；屋顶就是面向跑道的东看台。'),
]
STAND_STEPS = [   # little flights from the track up onto the stands (tile rects)
    (376.8, 268.4, 377.3, 269.9), (376.8, 296.6, 377.3, 298.1),
    (416.5, 271.6, 417.0, 273.1), (416.5, 283.0, 417.0, 284.5), (416.5, 294.4, 417.0, 295.9),
]
FIELD_FENCE_WEST = 374.3   # 大操场 fence west side moves behind the west stands
FIELD_GATE_W = (300.6, 303.0)   # west gate (south of the stands)

# 羽毛球馆 (ex 体育馆) footpath between the hall and the basketball-court fence
GYM_ID = 'w543817501'
GYM = dict(name='羽毛球馆', intro='羽毛球馆：室内羽毛球场，南面隔一条小路是 10 片露天篮球场。')
COURT_Y0 = 265.4           # basketball pad north edge (was 263.0); the fence box moves with it
GYM_PATH = (416.6, 263.2, 461.0, 264.85)

# 图书馆: fountains either side of an arched stair (OSM W543817505 / W543817507 centres 421.0 / 433.0, y 227)
LIB_ID = 'w543817503'
LIB_AXIS = 427.0
LIBRARY = dict(stair_w=3.6, stair_len=6.2, fountain_dx=6.2, fountain_r=(3.6, 2.1),
               names=('图书馆西喷泉', '图书馆东喷泉'),
               txt='图书馆门前左右各一个椭圆形喷泉水池（OSM 也标了这两个 amenity=fountain），中间一段拱桥似的台阶通到图书馆大门。',
               stair_txt='图书馆门前的拱形台阶：从两个喷泉之间拱起，像一座小拱桥，一直通到图书馆大门。')

# 文瀛苑17号公寓 ground-floor passage
PASSAGE17 = dict(id='w543815145', y0=319.3, y1=321.8, name='17号楼穿堂',
                 txt='17号楼穿堂：一楼东西贯通的过道，从西边的南北路可以直接横穿到楼东侧。')

# 西北 relabels (see README v7.6.2 for the evidence)
NW = {
    's53': dict(name='中北大学附属学校 · 中学部', k='school', f=5),
    's54': dict(name='中北大学附属学校 · 小学部', k='school', f=4),
    's0': dict(name='新能源化工研究院', k='teach'), 's1': dict(name='新能源化工研究院', k='teach'),
    's5': dict(name='工程训练中心', k='teach', f=4), 's6': dict(name='工程训练中心 · 实践车间', k='low', f=2),
    's7': dict(name='半导体和能源学院楼（在建）', k='teach'), 's8': dict(name='半导体和能源学院楼（在建）', k='teach'),
    's9': dict(name='半导体和能源学院楼（在建）', k='teach'),
    's40': dict(name='中北大学医院（校医院）', k='low', f=4),
}
NW_HOUSING = ['s29', 's30', 's31', 's32', 's33', 's34', 's35', 's36', 's37', 's38', 's39']   # 北区公寓 -> 家属楼
NW_INTRO = {
    '中北大学附属学校 · 中学部': '中北大学附属学校（中学部）：大学主办的九年一贯制公办学校（含幼儿园、小学部、中学部），就在校园西北角，楼前是学校自己的操场。',
    '中北大学附属学校 · 小学部': '中北大学附属学校（小学部 / 幼儿园）：附属学校的低年级部分，位置为推定。',
    '家属楼': '家属楼（教工住宅）：中北大学教职工和家属住的居民楼，不是学生公寓。',
    '新能源化工研究院': '新能源化工研究院：新北区西头、地势最高的一栋（±0 标高 856.56 米），地上五层、地下一层，环境与安全工程学院。（位置为推定）',
    '工程训练中心': '工程训练中心：46# 教工住宅楼北侧，南楼、北楼、基础制造实践区和连廊围成“C”字形，2019 年竣工。（位置为推定）',
    '半导体和能源学院楼（在建）': '半导体和能源学院楼：仪器科学大楼南侧的在建项目（半导体学院及研究院楼 + 能源学院楼）。',
    '中北大学医院（校医院）': '中北大学医院（校医院）：OSM 标注 amenity=hospital 的院区。',
}
NW_LABELS = {'北区学生公寓': ('家属区（教工住宅）', 312.0, 142.0), '北区篮球场': ('附属学校操场', 240.0, 127.0),
             '工程训练中心': ('工程训练中心', 313.0, 104.0)}
NW_SRC = ['https://fsxx.nuc.edu.cn/xxgk.htm (中北大学附属学校：位于中北大学校内，幼儿园 + 九年一贯制)',
          'https://dag.nuc.edu.cn/wsxs/sgll/zyjz.htm (档案馆：子校教学楼、幼儿园、教职工住宅楼列表)',
          'https://admin.qy-office.com/shtml/zbdx/20240906/283.shtml (中北大学报：新北区建筑，工程训练中心位于46#教工住宅楼北侧)',
          'OSM W1069150668 amenity=hospital 中北大学医院; W1069155864 家属区']

PLAZA_RENAME = {'学生一食堂': '文瀛食堂', '学生二食堂': '食味坊'}

# v7.2 layout: 北区 names west of 北门广场 corrected by the user (a NUC student), open 北门广场, 展板 row, HUD area fix.
# Sources: user feedback 2026-11-01; 校报 1016 期「遇见新北区 畅享新中北」(2024-09-06): 兵器教学陈列馆 A、B 座相对而建、
# 东侧上部相连成“门”字; A 座 = 机械工程学院, B 座 = 航空宇航学院 (+智能武器研究院), C 座 = 地上四层, 武器弹药陈列展示及校史馆.
NAMES = {
    's14': dict(name='航空宇航学院', kz='学院楼'),               # top-right (user: 航天宇航学院; official: 航空宇航学院 = 兵器教学陈列馆 B 座)
    's15': dict(name=None, lookId='s14', fadeGroup='beimen'),                        # east wing over the 门洞: no label, same look as its north block
    's16': dict(name='机械工程学院', kz='学院楼', fadeGroup='beimen'),               # bottom-right (user: 机械学院; = 兵器教学陈列馆 A 座)
    's13': dict(name='兵器教学陈列馆', kz='展馆 / 陈列馆'),      # bottom-left, across from 软件实验大楼 (C 座, 4F)
}
INTROS = {
    '航空宇航学院': '航空宇航学院：兵器教学陈列馆 B 座，教学、实验和办公；与南面的机械工程学院在东侧上部相连，底层可穿行到北门广场。',
    '机械工程学院': '机械工程学院：兵器教学陈列馆 A 座，学院楼（教学、实验、办公）；东侧上部与航空宇航学院相连。',
    '兵器教学陈列馆': '兵器教学陈列馆（C 座）：展馆，陈列武器、弹药，也有校史展陈；在软件实验大楼对面。',
    '软件实验大楼': '软件实验大楼：计算机科学与技术学院、软件学院的教学、实验和办公楼。',
}
FUND_URL = 'https://fund.nuc.edu.cn/info/1021/1518.htm'
BOARD_TXT = ('宣传展板：北门广场西侧、学院楼前的一排展板。具体内容没有查到（可能是学院介绍或宣传栏）；'
             '学校规划里提到广场两侧要建“文化浮雕墙”。这里画成通用展板。')
BOARDS = [dict(x=613.6, y=y, title=t) for y, t in [(35.0, '航空宇航'), (42.0, '校园文化'), (48.6, '宣传栏'),
                                                    (66.5, '机械工程'), (73.0, '校园文化'), (79.5, '宣传栏')]]
OPEN_PLAZAS = [[619.0, 28.0, 671.0, 91.0]]      # 北门广场: open in the middle, no inner lamp grid, sparse rim lamps
AREA_RECTS = [dict(t='北区', r=[610.0, 86.0, 656.0, 132.0])]   # 17# / 18# are 北区 (HUD said 东区)
SUBAREAS_DROP = {'兵器馆'}                                      # no special label at the 门洞
GATE_TXT = {'北门': '北门（新北区东大门）：入口广场、升旗平台和喷泉，西侧是兵器教学陈列馆（航空宇航学院、机械工程学院）。'}
RC_FROM = {'s15': 's14', 's16': 's14'}   # one roof colour for the 门-shaped complex (B 座 + east wing + A 座)
REVEAL_RECTS = [[594.0, 49.0, 605.0, 65.0]]   # the 门洞 floor is paved (PLAZA): it fades with the road strip under the roofs
# 展示直升机 on the lawn east of the 门洞 wing (user: a small display helicopter stands there). Model not found online;
# 航空宇航学院 develops the JZ-120 unmanned helicopter (nuc.edu.cn/info/1353/62253.htm), not confirmed as this exhibit -> generic.
HELI = dict(x=608.8, y=43.2, name='展示直升机', col=[607.0, 42.2, 610.8, 43.5],
            txt='展示直升机 · 航空宇航学院旁：草坪上的小型展示直升机，放在底座上。具体型号没有查到，这里画成通用造型（学院研制过 JZ-120 无人直升机，不确定是不是它）。',
            clear=[605.5, 39.0, 612.2, 45.5])

"""v7.3 layout data: 龙山餐厅 (后勤物流配送中心, OSM w1069155876) outdoor entrance staircase.

Sources (see docs/NAMES.md, section v7.3):
- jbjsc.nuc.edu.cn/info/1663/1200.htm : the 后勤物流配送中心 has 5 floors; 1F = equipment rooms + distribution
  centre, 2F-4F = kitchens / dining halls, 5F = offices -> the dining entrance sits above the ground floor.
- nuc.edu.cn/info/1576/11430.htm : 龙山餐厅 is described on 3F (zbxxgk.nuc.edu.cn/info/1043/1025.htm: 4F).
- satellite z18 crop: a banded (stepped) light paved strip along the whole south front at y~160-162.6 and a
  dark service lane between the canteen and 文韬苑4号公寓 (y~161-165).
- user: 「前面有一道楼梯」.
All coordinates in tiles (1 tile = 2.5 m)."""

LONGSHAN_ID = 'w1069155876'
# the wide flight: top edge on the south facade line (the door), bottom 3.25 tiles (~8 m, 8 treads) further south
STAIRS = dict(bid=LONGSHAN_ID, name='龙山餐厅室外大台阶', x0=679.5, x1=693.0, y0=160.0, y1=163.25,
              treads=8, cheek=0.55,
              txt='龙山餐厅（后勤物流配送中心）的室外大台阶：餐厅在二层以上，从南侧服务道路拾级而上进入正门。')
# the paved service lane in front of the flight, linking the west road (x~661) and the east road (x~714)
LANE = (662.0, 163.25, 714.0, 165.0)

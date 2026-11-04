"""Fit an affine transform from the official campus map image (zbzs.nuc.edu.cn/info/1002/3696.htm,
downsampled 1/4 -> ref/names/cm2_q.jpg) to game tile coordinates using named control points."""
import numpy as np, json, sys
CP = [  # name, official(q) x,y, game tile x,y
 ('彭德怀雕像', 788, 2441, 242.5, 469.3), ('11号楼教学主楼', 2142, 1272, 480.6, 239.2), ('图书馆', 1804, 1169, 425.7, 214.2),
 ('田园食堂', 3537, 1584, 733.1, 293.7), ('德怀楼', 778, 2389, 239.6, 456.5), ('文瀛苑2号公寓', 850, 1466, 251.7, 272.7),
 ('文瀛苑13号公寓', 1080, 1707, 292.3, 321.6), ('生活服务中心', 1270, 1400, 327.5, 259.2), ('敏学楼', 3290, 1128, 689.5, 205.3),
 ('教学楼14#', 2799, 1287, 593.7, 242.7), ('笃学楼', 2717, 1528, 586.9, 283.8)]
A = np.array([[c[1], c[2], 1] for c in CP]); B = np.array([[c[3], c[4]] for c in CP])
X, *_ = np.linalg.lstsq(A, B, rcond=None)
res = A @ X - B
for c, r in zip(CP, res): print('%-12s residual %.1f tiles' % (c[0], np.hypot(*r)))
json.dump(X.tolist(), open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__))), 'ref', 'names', 'affine.json'), 'w'))

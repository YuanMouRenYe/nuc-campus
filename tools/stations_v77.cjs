// v7.7: place shared e-bike stations next to real anchors (gates, dorms, teaching buildings, canteens).
// For each anchor: nearest 3x2-tile patch of paved, non-step, unblocked ground within 14 tiles that touches a ROAD/PATH within 3 tiles.
const path = require('path'); const G = path.join(__dirname, '..', 'game');
const Core = require(path.join(G, 'js/core.js')); const { loadMap } = require(path.join(G, 'tests/helpers.cjs'));
const { M, cls } = loadMap(); const C = Core.C, sub = M.meta.sub, gw = M.meta.w * sub;
const OK = new Set([C.PLAZA, C.APRON, C.PARKING, C.PATH, C.ROAD]);
const at = (x, y) => cls[Math.floor(y * sub) * gw + Math.floor(x * sub)];
const patchOK = (x, y) => { for (let yy = y - 1; yy <= y + 0.75; yy += 0.25) for (let xx = x - 1.5; xx <= x + 1.5; xx += 0.25) if (!OK.has(at(xx, yy))) return false;
  return !M.buildings.some(b => b.door && Math.hypot(b.door[0] - x, b.door[1] - y) < 3); };
const nearRoad = (x, y) => { for (let r = 1; r <= 4; r += 0.5) for (let a = 0; a < 6.28; a += 0.4) { const c = at(x + Math.cos(a) * r, y + Math.sin(a) * r); if (c === C.ROAD) return true; } return false; };
const A = [['一道门', 'gate', 242, 490], ['二道门', 'gate', 277, 362], ['三道门', 'gate', 354, 349], ['四道门', 'gate', 489, 320], ['六道门', 'gate', 616, 292], ['北门', 'gate', 708, 52],
  ['主楼', 'teach', 484, 262], ['图书馆', 'teach', 426, 225], ['12号楼 · 鸿学楼', 'teach', 388, 232], ['14号教学楼', 'teach', 594, 242], ['德怀楼', 'teach', 243, 457], ['北区教学楼', 'teach', 532, 139],
  ['文瀛食堂', 'canteen', 316, 283], ['食味坊', 'canteen', 319, 306], ['龙山餐厅', 'canteen', 673, 146], ['田园餐厅', 'canteen', 722, 296],
  ['文瀛苑宿舍', 'dorm', 272, 300], ['文瀛苑 17-19 号', 'dorm', 366, 303], ['文韬苑宿舍', 'dorm', 660, 200]];
const out = [];
for (const [name, k, ax, ay] of A) { let best = null, bd = 1e9;
  for (let y = ay - 14; y <= ay + 14; y += 0.5) for (let x = ax - 14; x <= ax + 14; x += 0.5) { const d = Math.hypot(x - ax, y - ay); if (d >= bd || !patchOK(x, y) || !nearRoad(x, y)) continue; bd = d; best = [x, y]; }
  if (best) out.push({ id: 's' + out.length, name: name + '停车点', k, x: best[0], y: best[1], v: false }); else console.error('no spot', name); }
console.log(JSON.stringify(out));

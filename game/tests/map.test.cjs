const test = require('node:test'), assert = require('node:assert');
const Core = require('../js/core.js'); const { loadMap, flood } = require('./helpers.cjs');
const { M, g, cls } = loadMap();

test('ground raster matches map meta and uses known classes', () => {
  assert.strictEqual(g.w, M.meta.w * M.meta.sub); assert.strictEqual(g.h, M.meta.h * M.meta.sub);
  let max = 0; for (const v of cls) if (v > max) max = v;
  assert.ok(max < Core.CLASS_NAMES.length, 'class index ' + max);
  assert.deepStrictEqual(M.meta.classes, Core.CLASS_NAMES);
});
test('map covers 西区, 东区, 北区, 二龙山 and keeps 主楼/图书馆/食堂', () => {
  const areas = M.labels.filter(l => l.k === 'area').map(l => l.t).join('|');
  for (const a of ['西区', '东区', '北区', '二龙山']) assert.ok(areas.includes(a), a);
  const names = M.buildings.map(b => b.name);
  for (const n of ['主楼', '图书馆', '德怀楼', '羽毛球馆'])   // v7.6.2: 体育馆 is the 羽毛球馆 assert.ok(names.includes(n), n);
  assert.ok(names.includes('文瀛食堂') && names.includes('食味坊') && M.buildings.filter(b => b.k === 'canteen').length >= 2, '食堂');   // v7.6.2 canteen names
  assert.ok(M.buildings.length > 120, 'buildings ' + M.buildings.length);
});
test('projection puts the OSM 彭德怀 statue node on its POI', () => {
  const [x, y] = Core.project(38.0092017, 112.4359128, M.meta);
  const p = M.pois.find(p => p.name === '彭德怀雕像');
  assert.ok(Math.hypot(p.x - x, p.y - y) < 0.5, `${x},${y} vs ${p.x},${p.y}`);
});
test('spawn is walkable and every enterable door is reachable on foot', () => {
  const cg = Core.buildCollision(cls, M.meta, M.trees, []);
  assert.ok(!Core.rectBlocked(cg, M.spawn[0] - 0.3, M.spawn[1] - 0.35, M.spawn[0] + 0.3, M.spawn[1]), 'spawn blocked');
  const seen = flood(cg, M.spawn[0], M.spawn[1]);
  const enter = M.buildings.filter(b => b.enter);
  assert.ok(enter.length >= 3);
  for (const k of ['classroom', 'dorm', 'gym', 'main', 'canteen', 'library']) assert.ok(enter.some(b => b.enter === k), 'no building enters ' + k);
  for (const b of enter) {
    let ok = false; // any free sub-cell within 1.5 tiles south of the door
    for (let dy = 0; dy <= 6 && !ok; dy++) for (let dx = -4; dx <= 4 && !ok; dx++) { const i = (Math.floor(b.door[1] * 4) + dy) * cg.gw + Math.floor(b.door[0] * 4) + dx; if (seen[i]) ok = true; }
    assert.ok(ok, 'door unreachable: ' + b.name);
  }
  const st = M.pois.find(p => p.name === '彭德怀雕像'); let ok = false;
  for (let d = 0; d < 40 && !ok; d++) for (let dx = -8; dx <= 8; dx++) { const i = (Math.floor(st.y * 4) + 6 + d) * cg.gw + Math.floor(st.x * 4) + dx; if (seen[i]) ok = true; }
  assert.ok(ok, 'statue area unreachable');
});
test('collision blocks buildings and water but not roads', () => {
  const cg = Core.buildCollision(cls, M.meta, [], []);
  const main = M.buildings.find(b => b.name === '主楼'); const cx = (main.bbox[0] + main.bbox[2]) / 2, cy = (main.bbox[1] + main.bbox[3]) / 2;
  assert.ok(Core.blockedAt(cg, cx, cy));
  let road = 0, blockedRoad = 0; for (let i = 0; i < cls.length; i += 97) if (cls[i] === Core.C.ROAD) { road++; if (cg.col[i]) blockedRoad++; }
  assert.ok(road > 100 && blockedRoad === 0);
  const moved = Core.moveBox(cg, { x: cx, y: main.bbox[3] + 3 }, 0, -6, 0.3, 0.35); // walking north into the façade stops at the wall
  assert.ok(moved.y > main.door[1] - 0.6, 'walked through 主楼: ' + moved.y);
});

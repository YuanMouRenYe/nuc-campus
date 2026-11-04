// v7.6: (南区 underpass — replaced in v7.6.1 by a road under a rail bridge, see v761.test.cjs), the two missing teaching buildings,
//       柏林园 (侧柏 forest, paths, pond + fountain, 长廊, 凉亭, 文化墙) and the 刘鼎塑像 with both inscriptions.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S;
const GAME = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), P7 = fs.readFileSync(path.join(__dirname, '../js/props_v7.js'), 'utf8'), PR = fs.readFileSync(path.join(__dirname, '../js/props.js'), 'utf8');
const at = (x, y) => cls[Math.floor(y * S) * GW + Math.floor(x * S)];
const shadow = Core.roofShadow(cls, M.meta, M.buildings, Core.shadowKeep(M));
const pits = [], ramps = []; for (const p of M.passages) for (const e of [p.a, p.b]) { pits.push([e.x - 1.1, e.y - 1.35, e.x + 1.1, e.y + 1.35]); if (e.ramp) ramps.push(e.ramp); }
const ld = M.props.liuding, bl = M.props.bailin;
const statics = [[ld.x - 0.7, ld.y - 0.6, ld.x + 0.7, ld.y + 0.15], [bl.wall.x - bl.wall.w / 2, bl.wall.y - 0.9, bl.wall.x + bl.wall.w / 2, bl.wall.y + 0.1]];
const props = () => Core.fenceRects(M.fences).concat(Core.wallRects(M.walls), pits, ramps, statics);
const cg = Core.buildCollision(cls, M.meta, [], props(), shadow);
function reach(fromX, fromY, usePassages) {
  const seen = new Uint8Array(GW * GH), q = new Int32Array(GW * GH); let h = 0, t = 0;
  const seed = (x, y) => { const i = Math.floor(y * S) * GW + Math.floor(x * S); if (!cg.col[i] && !seen[i]) { seen[i] = 1; q[t++] = i; } };
  const near = o => { for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (seen[(Math.floor(o[1] * S) + dy) * GW + Math.floor(o[0] * S) + dx]) return true; return false; };
  seed(fromX, fromY); const used = new Set();
  for (;;) { while (h < t) { const i = q[h++], x = i % GW; for (const j of [i - 1, i + 1, i - GW, i + GW]) { if (j < 0 || j >= GW * GH || (j === i - 1 && x === 0) || (j === i + 1 && x === GW - 1)) continue; if (!seen[j] && !cg.col[j]) { seen[j] = 1; q[t++] = j; } } }
    let more = false; if (usePassages) for (const p of M.passages) for (const [a, b] of [[p.a, p.b], [p.b, p.a]]) if (!used.has(p.id + a.side) && near(a.out)) { used.add(p.id + a.side); seed(b.out[0], b.out[1]); more = true; }
    if (!more) return seen; }
}
const seen = reach(M.spawn[0], M.spawn[1], true);
const hit = (x, y, r = 3, sn = seen) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (sn[(Math.floor(y * S) + dy) * GW + Math.floor(x * S) + dx]) return true; return false; };
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[i], [bx, by] = P[j]; if ((ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay)) c = !c; } return c; };
const up = M.passages.find(p => p.id === 'nanqu_rail');
const bySub = (r, fn) => { for (let j = Math.ceil(r[1] * S); j < Math.floor(r[3] * S); j++) for (let i = Math.ceil(r[0] * S); i < Math.floor(r[2] * S); i++) fn(cls[j * GW + i], i / S, j / S); };

test('v7.6 南区 underpass superseded in v7.6.1: no 南区 passage / teleport / canopy, the road goes straight on under the rail', () => {
  assert.equal(up, undefined, 'no nanqu_rail passage'); assert.ok(!M.labels.some(l => /南区铁路地下通道/.test(l.name || l.t || '')), 'old label gone');
  for (let y = 370; y <= 384; y += 0.5) assert.equal(at(241.0 + (y - 369.9) * 0.155 + 0.4, y), C.ROAD, 'continuous road at y ' + y);
  assert.ok(hit(241.5, 369) && hit(243.4, 384), 'both sides reachable');
});
test('v7.6 15号楼 · 逸夫楼 (U, opens west) right south of the rail, 4号楼 · 酬学楼 behind 德怀楼; both off the road', () => {
  const b15 = M.buildings.find(b => b.id === 'v76_15'), b4 = M.buildings.find(b => b.id === 'v76_4'), dh = M.buildings.find(b => b.name && /德怀楼/.test(b.name));
  assert.ok(b15 && b4 && dh); assert.match(b15.name, /15号楼/); assert.match(b4.name, /4号楼/); assert.ok(b15.intro && b4.intro && b15.approx && b4.approx);
  assert.ok(b15.bbox[1] > 372 && b15.bbox[1] < 380, '15号楼 starts right south of the rail bridge');
  assert.equal(at(255, 391), C.GRASS, 'U courtyard open'); assert.equal(at(268, 391), C.BUILDING);
  assert.ok(b4.bbox[3] < dh.bbox[1] + 0.5 && b4.bbox[0] < dh.bbox[2] && b4.bbox[2] > dh.bbox[0], '4号楼 directly north of (behind) 德怀楼');
  for (const b of [b15, b4]) { let road = 0; bySub(b.bbox, (c, x, y) => { if (c === C.ROAD && inPoly(x, y, b.poly)) road++; }); assert.equal(road, 0, b.name + ' not on a road');
    assert.ok(M.labels.some(l => l.id === b.id), 'label'); }
  assert.ok(hit(244, 395, 4) && hit(248, 427, 4), 'road from the south mouth to 4号楼 reachable');
});
test('v7.6 柏林园: area label + intro spot, cypress (type 6) forest inside the park, paths and plaza walkable', () => {
  const sp = (M.spots || []).find(s => s.id === 'bailinyuan'); assert.ok(sp && sp.poly.length >= 5 && /侧柏/.test(sp.intro) && /3 万平方米/.test(sp.intro));
  assert.ok(M.labels.some(l => l.t === '柏林园' && inPoly(l.x, l.y, sp.poly)), 'label inside the park');
  const inside = M.trees.filter(t => inPoly(t[0], t[1], sp.poly)); assert.ok(inside.length > 600, 'dense stand ' + inside.length);
  assert.ok(inside.filter(t => t[2] === 6).length / inside.length > 0.8, 'mostly 侧柏'); assert.equal(M.trees.filter(t => t[2] === 6 && !inPoly(t[0], t[1], sp.poly)).length, 0, 'cypress only here');
  for (const t of inside) assert.ok([C.GRASS, C.WOOD, C.DEEPWOOD, C.APRON].includes(at(t[0], t[1])), 'tree on open ground at ' + t);
  let plaza = 0; bySub([225.5, 329.5, 236, 338], c => { if (c === C.PLAZA) plaza++; }); assert.ok(plaza > 1300, 'entrance square paved');
  assert.equal(at(237.4, 333), C.ROAD, 'square meets the road');
  assert.equal(at(205.0, 336.4), C.WATER, 'pond beside the 长廊'); assert.notEqual(at(225.6, 318.6), C.WATER, 'no forest fountain pond'); assert.ok(!M.props.fountains.some(f => f.name === '柏林园喷泉'));
  for (const [x, y] of [[230, 336.8], [210, 340.5], [192, 340.5], [219.5, 356], [198, 369.5], [229, 300], [186, 375.2]]) assert.ok(hit(x, y, 3), 'reachable ' + x + ',' + y);
  assert.match(PR, /type === 6/); assert.match(PR, /侧柏/);
});
test('v7.6 柏林园 structures: 77 m 文化长廊 (walk under, roof fades), 凉亭, 文化墙', () => {
  const g = bl.gallery; assert.ok(Math.abs((g.x1 - g.x0) * M.meta.mpt - 77) < 2, '77 m long'); assert.match(g.txt, /77 米/);
  for (let x = g.x0 + 0.5; x < g.x1; x += 1) assert.equal(at(x, (g.y0 + g.y1) / 2), C.PATH, 'corridor floor at ' + x);
  assert.equal(M.trees.filter(t => t[0] > g.x0 - 0.5 && t[0] < g.x1 + 0.5 && t[1] > g.y0 - 0.3 && t[1] < g.y1 + 0.3).length, 0);
  assert.match(GAME, /P7\.gallerySprite\([^\n]*nocol: true, fade: true/); assert.match(GAME, /P7\.pavilionSprite\([^\n]*nocol: true, fade: true/); assert.match(GAME, /P7\.cultureWall\(/);
  for (const f of ['gallerySprite', 'pavilionSprite', 'cultureWall', 'bustSprite']) assert.match(P7, new RegExp('function ' + f + '\\('));
});
test('v7.6 刘鼎塑像: in 柏林园 by the entrance, solid plinth, inscriptions + biography, statue label + intro', () => {
  const sp = M.spots.find(s => s.id === 'bailinyuan'); assert.ok(inPoly(ld.x, ld.y, sp.poly), 'inside 柏林园');
  for (const s of ['1902', '1986', '四川南溪', '第一任校长', '2002', '0.6 米', '聂荣臻', '奉献毕生，鞠躬尽瘁', '习仲勋', '统战功臣，兵工泰斗']) assert.ok(ld.txt.includes(s), s);
  assert.ok(M.pois.some(p => p.name === '刘鼎塑像' && p.k === 'statue'));
  const z = M.spots.find(s => s.id === 'liuding'); assert.ok(z && z.r > 2 && z.intro === ld.txt && /近似/.test(z.kz));
  assert.equal(at(ld.x, ld.y), C.PLAZA); assert.equal(M.trees.filter(t => Math.hypot(t[0] - ld.x, t[1] - ld.y) < 3).length, 0);
  const blk = (x, y) => cg.col[Math.floor(y * S) * GW + Math.floor(x * S)]; assert.ok(blk(ld.x, ld.y - 0.3), 'bust blocks'); assert.ok(hit(ld.x, ld.y + 1, 3), 'stand in front of it');
  assert.match(GAME, /P7\.bustSprite\(\), x: ld\.x, y: ld\.y, name: ld\.name, info: ld\.txt, col:/);
  assert.match(GAME, /nearBig\(\) \|\| nearSpot\(\)/);
});
test('v7.6 rules kept: new paving never replaced road / rail; trees still have no collision', () => {
  assert.match(GAME, /Core\.buildCollision\(ground8, M\.meta, \[\],/);
  const crossings = M.crossings.length; assert.ok(crossings >= 1);
  let roadLost = 0; bySub([236, 300, 240, 370], (c, x, y) => { if (c === C.PLAZA && x > 237.2) roadLost++; }); assert.equal(roadLost, 0);
});

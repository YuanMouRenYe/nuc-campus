// v7.2: 北区 names west of 北门广场 (user correction), 门洞 unlabeled but walkable, one fade group, open 北门广场, 展板, HUD 北区
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S;
const GAME = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), BLD = fs.readFileSync(path.join(__dirname, '../js/buildings.js'), 'utf8');
const B = id => M.buildings.find(b => b.id === id);

test('v7.2 names: 软件实验大楼 faces 兵器教学陈列馆, 航空宇航学院 east of 软件, 机械工程学院 east of the 陈列馆', () => {
  assert.equal(B('s12').name, '软件实验大楼'); assert.equal(B('s13').name, '兵器教学陈列馆'); assert.equal(B('s14').name, '航空宇航学院'); assert.equal(B('s16').name, '机械工程学院');
  assert.equal(B('s14').kz, '学院楼'); assert.equal(B('s16').kz, '学院楼'); assert.match(B('s13').kz, /陈列馆/);
  for (const id of ['s13', 's14', 's16']) assert.ok(B(id).intro && B(id).intro.startsWith(B(id).name), id + ' intro');
  assert.ok(B('s13').bbox[1] > B('s12').bbox[3] && B('s14').bbox[0] > B('s12').bbox[2] - 1 && B('s16').bbox[0] > B('s13').bbox[2]);
  assert.match(GAME, /b\.kz \|\| KIND_ZH/);
});
test('v7.2 no old names left in labels, buildings, gates or quests', () => {
  const all = JSON.stringify([M.labels, M.buildings.map(b => [b.name, b.intro, b.info]), M.wallGates, M.pois]) + fs.readFileSync(path.join(__dirname, '../js/core.js'), 'utf8');
  for (const old of ['兵器馆门洞', '兵器馆 A 座', '"兵器馆"']) assert.ok(!all.includes(old), old);
  // v7.6.2: 新能源化工研究院 is back, but only at its real place west of 仪器科学大楼 (never on the old s13 spot)
  for (const b of M.buildings.filter(b => b.name === '新能源化工研究院')) assert.ok(b.bbox[2] < 358.6 && b.id !== 's13', b.id);
});
test('v7.2 门洞: no name / label / card, still a walkable arcade, same look and fade group as its neighbours', () => {
  const g = B('s15'); assert.ok(!g.name && !g.linkname && g.bridge && g.bridge.arcade && !g.enter);
  assert.equal(g.lookId, 's14'); assert.equal(g.fadeGroup, B('s16').fadeGroup); assert.match(BLD, /b\.lookId \|\| b\.id/);
  assert.ok(!/if \(b\.bridge\) return;/.test(BLD.slice(BLD.indexOf('function revealRoads'), BLD.indexOf('function revealRoads') + 300)), 'bridges get a reveal strip');
  assert.match(GAME, /grp\.has\(b\.fadeGroup\)/);
  const y = g.bridge.y, cs = Core.buildCollision(cls, M.meta, [], [], null).col; let open = 0;
  for (let x = g.bbox[0]; x < g.bbox[2]; x += 0.25) if (!cs[Math.floor(y * S) * GW + Math.floor(x * S)]) open++;
  assert.ok(open > (g.bbox[2] - g.bbox[0]) * 4 * 0.8, 'arcade row walkable');
});
test('v7.2 北门广场 stays open: no lamps in the middle, only a few on its edges', () => {
  const L = Core.placeLamps(cls, M.meta, M.buildings), [x0, y0, x1, y1] = M.meta.openPlazas[0];
  const inner = L.filter(l => l.x > x0 + 3 && l.x < x1 - 3 && l.y > y0 + 3 && l.y < y1 - 3), rim = L.filter(l => l.x >= x0 && l.x <= x1 && l.y >= y0 && l.y <= y1);
  assert.equal(inner.filter(l => cls[Math.floor(l.y * S) * GW + Math.floor(l.x * S)] === C.PLAZA && (() => { for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (cls[Math.floor((l.y + dy) * S) * GW + Math.floor((l.x + dx) * S)] !== C.PLAZA) return false; return true; })()).length, 0);
  assert.ok(rim.length >= 3 && rim.length <= 16, 'rim lamps ' + rim.length); assert.ok(L.length > 600);
});
test('v7.2 宣传展板 row between the buildings and 北门广场, with intro, off the 门洞 path (v7.6.4: removed, the aerial photo shows an open paved plaza)', () => {
  const bd = M.props.boards; assert.equal(bd.items.length, 0); const g = B('s15');
  for (const q of bd.items) { assert.ok(q.x > B('s14').bbox[2] && q.x < M.meta.openPlazas[0][0]); assert.ok(Math.abs(q.y - g.bridge.y) > 4);
    const c = cls[Math.floor(q.y * S) * GW + Math.floor(q.x * S)]; assert.ok(c !== C.BUILDING && c !== C.ROAD); }
  assert.match(GAME, /P7\.boardSprite/);
});
test('v7.2 HUD: 17# / 18# read 北区, not 东区', () => {
  const z = M.meta.areaRects.find(a => a.t === '北区'); for (const id of ['s20', 's21']) { const b = B(id), cx = (b.bbox[0] + b.bbox[2]) / 2, cy = (b.bbox[1] + b.bbox[3]) / 2;
    assert.ok(cx >= z.r[0] && cx <= z.r[2] && cy >= z.r[1] && cy <= z.r[3], id); }
  assert.match(GAME, /M\.meta\.areaRects/);
});
test('v7.2 展示直升机 on the lawn east of the 门洞 wing: body-only collision, intro card, no tree on it', () => {
  const h = M.props.heli, g = B('s15'); assert.ok(h && /展示直升机/.test(h.name) && /航空宇航学院/.test(h.txt));
  assert.ok(h.x > g.bbox[2] && h.x < M.meta.openPlazas[0][0] - 3 && h.y < g.bridge.y - 4);
  assert.ok(h.col[2] - h.col[0] < 4.5 && h.col[3] - h.col[1] < 2, 'body-only rect');
  for (const t of M.trees) assert.ok(!(t[0] > h.col[0] - 0.5 && t[0] < h.col[2] + 0.5 && t[1] > h.col[1] - 0.5 && t[1] < h.col[3] + 1.5), 'tree on heli ' + t);
  for (const q of M.props.boards.items) assert.ok(q.x - 1.25 > h.col[2] || Math.abs(q.y - h.y) > 3, 'board clear of heli');
  assert.match(GAME, /P7\.heliSprite/); assert.match(GAME, /s\.col \|\|/);
});

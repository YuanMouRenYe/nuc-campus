// v7.7 回归测试：地图编辑器纯逻辑、共享电单车、二龙山成就、摇杆、离线约束。
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'), ME = require('../js/mapedit_core.js'), V = require('../js/v77core.js');
const { loadMap, readPNG, root } = require('./helpers.cjs');
const { M, cls } = loadMap(); const t = readPNG(path.join(root, 'data/terrain.png'));
const terr = new Uint8ClampedArray(t.w * t.h * 4); for (let i = 0; i < t.w * t.h; i++) { terr[i * 4] = t.data[i * t.ch]; terr[i * 4 + 1] = t.data[i * t.ch + 1]; terr[i * 4 + 2] = t.data[i * t.ch + 2]; terr[i * 4 + 3] = 255; }
const fresh = () => ME.makeState(JSON.parse(JSON.stringify(M)), new Uint8Array(cls), new Uint8ClampedArray(terr));
const C = Core.C, pal = id => ME.PALETTE.find(p => p.id === id);

test('editor: paint + undo/redo restores ground exactly', () => {
  const st = fresh(), i0 = 600 * st.gw + 1000, cells = ME.rectCells(1000, 600, 1010, 606, st.gw, st.gh), before = st.ground.slice(i0, i0 + 11);
  ME.begin(st, '画笔'); ME.paint(st, cells, pal('water')); assert.ok(ME.commit(st));
  assert.strictEqual(st.ground[i0], C.WATER); ME.undo(st); assert.deepStrictEqual(st.ground.slice(i0, i0 + 11), before);
  ME.redo(st); assert.strictEqual(st.ground[i0], C.WATER); assert.strictEqual(st.undo[st.undo.length - 1].label, '画笔');
});

test('editor: straightenStairs turns a crooked flight into one rectangle', () => {
  const st = fresh(), gw = st.gw; ME.begin(st, 't');
  for (let y = 100; y < 120; y++) for (let x = 100; x < 140; x++) ME.setG(st, y * gw + x, C.PATH);
  for (let y = 104; y < 114; y++) for (let x = 110; x < 126; x++) ME.setG(st, y * gw + x, C.STEPS);
  ME.setG(st, 108 * gw + 127, C.STEPS); ME.setG(st, 103 * gw + 115, C.STEPS); ME.commit(st);
  ME.begin(st, '拉直台阶'); const r = ME.straightenStairs(st, 100, 100, 139, 119); ME.commit(st);
  assert.deepStrictEqual(r.rect, [110, 104, 125, 113]); assert.strictEqual(st.ground[108 * gw + 127], C.PATH); assert.strictEqual(st.ground[103 * gw + 115], C.PATH);
  let n = 0; for (let y = 100; y < 120; y++) for (let x = 100; x < 140; x++) n += st.ground[y * gw + x] === C.STEPS; assert.strictEqual(n, 16 * 10);
  ME.undo(st); assert.strictEqual(st.ground[108 * gw + 127], C.STEPS);
});

test('editor: collision toggle, building move are undoable map edits', () => {
  const st = fresh(), bi = st.map.buildings.findIndex(b => b.name === '图书馆'), x0 = st.map.buildings[bi].poly[0][0];
  ME.begin(st, '移动'); ME.moveBuilding(st, st.map.buildings[bi], 2, 0); ME.commit(st); assert.strictEqual(st.map.buildings[bi].poly[0][0], x0 + 2);
  ME.undo(st); assert.strictEqual(st.map.buildings[bi].poly[0][0], x0);
  ME.begin(st, '碰撞'); ME.mapEdit(st, m => ME.toggleCollision(m, [300, 300, 302, 301], true)); ME.commit(st);
  const cg = ME.collisionOf(st.map, st.ground); assert.ok(cg.col[Math.floor(300.5 * 4) * cg.gw + Math.floor(301 * 4)]);
});

test('editor: validate pristine map has only baseline issues; encode/decode round-trips', async () => {
  const v = ME.validate(M, cls, terr); assert.ok(v.errors.length <= 1, JSON.stringify(v.errors.map(e => e.text)));
  const v2 = ME.validate(M, cls, terr, { baseline: v.keys }); assert.strictEqual(v2.errors.length + v2.warnings.length, 0);
  const st = fresh(); ME.begin(st, 'x'); ME.paint(st, [5000], pal('road')); ME.commit(st);
  const d = await ME.decode(JSON.stringify(await ME.encode(st.map, st.ground, st.terr))); assert.deepStrictEqual(Buffer.from(d.ground), Buffer.from(st.ground));
  for (let i = 0; i < 4000; i += 97) assert.strictEqual(d.terr[i], st.terr[i]);
  await assert.rejects(ME.decode('{"format":"x"}'));
  const mem = { s: {}, getItem(k) { return this.s[k] || null; }, setItem(k, v) { this.s[k] = v; }, removeItem(k) { delete this.s[k]; } };
  await ME.saveOverride(mem, st.map, st.ground, st.terr); assert.ok(await ME.loadOverride(mem, '')); assert.strictEqual(await ME.loadOverride(mem, '?pristine'), null);
  ME.resetOverride(mem); assert.strictEqual(await ME.loadOverride(mem, ''), null);
});

test('e-bikes: 16 stations, all marked unverified, all on rideable ground, none blocking roads', () => {
  assert.strictEqual(V.STATIONS.length, 16); for (const s of V.STATIONS) { assert.strictEqual(s.v, false, s.id); assert.ok(V.rideOK(cls, M.meta, s.x, s.y), s.id + ' rideable'); }
  assert.ok(V.nearStation(V.STATIONS[0].x + 1, V.STATIONS[0].y)); assert.strictEqual(V.nearStation(-50, -50), null);
  assert.ok(!V.RIDE.has(C.GRASS) && !V.RIDE.has(C.STEPS) && V.RIDE.has(C.ROAD));
});

test('achievements: 二龙山 checkpoints, summit, all-three, ride achievements', () => {
  const a = V.achNew(), cp = V.ERLONG_CP; let got = [];
  for (const c of cp) got = got.concat(V.achCheck(a, { mode: 'out', x: c.x, y: c.y, now: 1 }));
  got = got.concat(V.achCheck(a, { mode: 'out', x: Core.SUMMIT.x, y: Core.SUMMIT.y, now: 1 }));
  for (const id of ['cp_gate', 'cp_yiren', 'cp_stele', 'summit', 'erlong_all']) assert.ok(got.includes(id), id);
  assert.deepStrictEqual(V.achCheck(a, { mode: 'out', x: Core.SUMMIT.x, y: Core.SUMMIT.y }), []);
  assert.ok(V.achCheck(a, { riding: true }).includes('ride_first'));
  const back = V.achParse(JSON.stringify(a)); assert.deepStrictEqual(Object.keys(back.got).sort(), Object.keys(a.got).sort()); assert.ok(V.achParse('garbage').got);
});

test('joystick vector: dead zone + clamped to unit length', () => {
  assert.strictEqual(V.stickVector(3, 2), null); const v = V.stickVector(200, 0, 56); assert.ok(Math.abs(Math.hypot(v.x, v.y) - 1) < 1e-9);
});

test('offline: no CDN / http(s) URLs in shipped html/js/css', () => {
  const files = ['index.html', 'editor.html', 'style.css', 'editor.css', 'js/editor.js', 'js/v77.js', 'js/v77core.js', 'js/mapedit_core.js', 'js/game.js'];
  for (const f of files) { const s = fs.readFileSync(path.join(root, f), 'utf8'); assert.ok(!/(src|href)\s*=\s*["']https?:|fetch\(\s*["']https?:|@import\s+url\(["']?https?:/i.test(s), f); }
});

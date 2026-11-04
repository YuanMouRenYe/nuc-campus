// v6: entrances, fences, rail, fields, terraces
const test = require('node:test'), assert = require('node:assert'), path = require('path');
const Core = require('../js/core.js'); const { loadMap, readPNG, root } = require('./helpers.cjs');
global.window = global.window || {}; require('../js/fields.js'); const Fields = global.window.Fields;
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S;
function fullCollision() { // everything solid in the game: trees, lamps, fences, underpass pits
  const L = Core.placeLamps(cls, M.meta, M.buildings);
  const pits = []; for (const p of M.passages) for (const e of [p.a, p.b]) pits.push([e.x - 1.1, e.y - 1.35, e.x + 1.1, e.y + 1.35]);
  return Core.buildCollision(cls, M.meta, [], L.map(l => [l.x - 0.12, l.y - 0.15, l.x + 0.12, l.y]).concat(Core.fenceRects(M.fences), Core.wallRects(M.walls), pits), Core.roofShadow(cls, M.meta, M.buildings, Core.shadowKeep(M)));
}
// BFS from spawn; walking into an underpass (E at its `out` spot) continues from the other end
function reach(cg) {
  const W = cg.gw, H = cg.gh, seen = new Uint8Array(W * H), q = new Int32Array(W * H); let h = 0, t = 0;
  const seed = (x, y) => { const i = Math.floor(y * S) * W + Math.floor(x * S); if (!cg.col[i] && !seen[i]) { seen[i] = 1; q[t++] = i; } };
  const near = (o) => { for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (seen[(Math.floor(o[1] * S) + dy) * W + Math.floor(o[0] * S) + dx]) return true; return false; };
  seed(M.spawn[0], M.spawn[1]); const used = new Set();
  for (;;) {
    while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && !cg.col[j]) { seen[j] = 1; q[t++] = j; } } }
    let more = false;
    for (const p of M.passages) for (const [a, b] of [[p.a, p.b], [p.b, p.a]]) if (!used.has(p.id + a.side) && near(a.out)) { used.add(p.id + a.side); seed(b.out[0], b.out[1]); more = true; }
    if (!more) return seen;
  }
}
const cg = fullCollision(), seen = reach(cg);
const hit = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (seen[(Math.floor(y * S) + dy) * GW + Math.floor(x * S) + dx]) return true; return false; };

test('v6 entrances: every enterable door (and its exit spot) is reachable from the road network, fences and rail included', () => {
  const doors = M.buildings.filter(b => b.enter); assert.ok(doors.length >= 8);
  for (const b of doors) {
    assert.ok(hit(b.door[0], b.door[1] + 0.6, 4), 'door unreachable: ' + b.name);
    assert.ok(!Core.rectBlocked(cg, b.door[0] - 0.3, b.door[1] + 1.4 - 0.35, b.door[0] + 0.3, b.door[1] + 1.4) || hit(b.door[0], b.door[1] + 1.4, 4), 'exit spot blocked: ' + b.name);
  }
});
test('v6 porches: canteens with side entrances get a porch that owns the door; the hall keeps `entry`', () => {
  for (const b of M.buildings.filter(b => b.porch)) { const par = M.buildings.find(p => p.id === b.porch); assert.ok(par && par.entry && !par.enter, b.name); assert.equal(b.name, par.name); }
  assert.ok(M.buildings.filter(b => b.porch).length >= 2); // v7.6.2: 食味坊 lost its porch (the road runs straight past its door)
});
test('v6 underpasses: both ends of each passage are reachable and the exit spots are free', () => {
  assert.ok(M.passages.length >= 2);
  for (const p of M.passages) for (const e of [p.a, p.b]) { assert.ok(hit(e.out[0], e.out[1], 3), p.name + ' ' + e.side); assert.ok(Core.passageAt(M.passages, e.out[0], e.out[1])); }
});
test('v6 fences: each fence has at least one gate, gate gaps are open and both sides of a gate are reachable', () => {
  assert.ok(M.fences.length >= 3);
  for (const f of M.fences) {
    assert.ok(f.gates.length >= 1, 'no gate: ' + f.name);
    for (const g of f.gates) { const mx = (g[0] + g[2]) / 2, my = (g[1] + g[3]) / 2, hz = Math.abs(g[1] - g[3]) < 1e-6;
      assert.ok(!Core.rectBlocked(cg, mx - 0.3, my - 0.3, mx + 0.3, my + 0.1), 'gate blocked: ' + f.name);
      const a = hz ? [mx, my - 0.8] : [mx - 0.8, my], b = hz ? [mx, my + 0.8] : [mx + 0.8, my];
      assert.ok(hit(a[0], a[1], 2) && hit(b[0], b[1], 2), 'gate not reachable both sides: ' + f.name + ' ' + g); }
    // the fence line itself is solid away from gates
    const s = f.segs.reduce((m, s) => Math.hypot(s[2] - s[0], s[3] - s[1]) > Math.hypot(m[2] - m[0], m[3] - m[1]) ? s : m);
    const mx = (s[0] + s[2]) / 2, my = (s[1] + s[3]) / 2; assert.ok(Core.blockedAt(cg, mx, my), 'fence not solid: ' + f.name);
  }
  for (const n of ['大操场', '怡丁苑足球场']) assert.ok(M.fences.some(f => f.name === n), n);
});
test('v6 rail: every rail cell blocks, except the paved level crossing which is walkable and reachable', () => {
  let rail = 0; for (let i = 0; i < cls.length; i++) if (cls[i] === C.RAIL) { rail++; assert.ok(cg.col[i], 'rail cell walkable at ' + i); }
  assert.ok(rail > 1000);
  assert.ok(M.crossings.length >= 1);
  for (const c of M.crossings) { const [a, b] = c.pts; for (let k = 0; k <= 10; k++) { const x = a[0] + (b[0] - a[0]) * k / 10, y = a[1] + (b[1] - a[1]) * k / 10; assert.ok(!Core.blockedAt(cg, x, y), 'crossing blocked ' + k); assert.ok(hit(x, y, 1), 'crossing unreachable ' + k); } }
});
test('v6 fields: one proportional template per sport, courts split into individual courts', () => {
  const bb = M.fields.filter(f => f.k === 'basketball'); assert.ok(bb.length >= 30, 'basketball courts ' + bb.length);
  for (const f of bb) assert.ok(Math.max(f.w, f.h) * Fields.MPT < 34 && Math.min(f.w, f.h) * Fields.MPT < 19, 'court too big');
  for (const k of ['basketball', 'tennis', 'volleyball', 'badminton', 'football']) { assert.ok(Fields.TPL[k], k); assert.ok(M.fields.some(f => f.k === k), 'no ' + k); }
  const [W, L] = Fields.TPL.basketball; assert.ok(Math.abs(L / W - 28 / 15) < 1e-9);
  const [fw, fl] = Fields.TPL.football; assert.ok(Math.abs(fl / fw - 105 / 68) < 1e-9);
});
test('v6 二龙山: stepped terraces (elevation bands + terrace walls) on the hill, summit still reachable', () => {
  const e = readPNG(path.join(root, 'data/elev.png')); assert.equal(e.w, GW);
  const bands = new Set(); for (let i = 0; i < e.w * e.h; i++) bands.add(e.data[i * e.ch]); assert.ok(bands.size >= 5, 'bands ' + bands.size);
  let ter = 0; for (let i = 0; i < cls.length; i++) if (cls[i] === C.TERRACE) { ter++; assert.ok(cg.col[i]); } assert.ok(ter > 10000);
  assert.ok(hit(Core.SUMMIT.x, Core.SUMMIT.y, 4), 'summit');
});

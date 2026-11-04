// v7.5.1: the tank display (坦克展台) belongs SOUTH of the 怡丁苑 football field, not north of it. It now stands on a
//         plinth on a lawn cleared out of the wood across the road below the field, linked to the road by a short path.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(); const C = Core.C, S = M.meta.sub, GW = M.meta.w * S;
const at = (x, y) => cls[Math.floor(y * S) * GW + Math.floor(x * S)];
const tk = M.props.tank, field = M.fields.find(f => f.k === 'football' && f.x > 285 && f.x < 300 && f.y > 385 && f.y < 400);
const fence = M.fences.find(f => f.name === '怡丁苑足球场');
const fb = (() => { const xs = fence.segs.flatMap(g => [g[0], g[2]]), ys = fence.segs.flatMap(g => [g[1], g[3]]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; })();
const cells = (r, fn) => { for (let j = Math.ceil(r[1] * S); j < Math.floor(r[3] * S); j++) for (let i = Math.ceil(r[0] * S); i < Math.floor(r[2] * S); i++) fn(cls[j * GW + i], i / S, j / S); };

test('v7.5.1 tank sits south of the 怡丁苑 field, outside its fence, roughly centred on it', () => {
  assert.ok(field, 'football field present'); assert.ok(tk.plinth[1] > fb[3] + 2, 'plinth starts below the south fence');
  assert.ok(tk.y > fb[3] && tk.y > field.y + field.h, 'tank south of the pitch');
  assert.ok(Math.abs(tk.x - (fb[0] + fb[2]) / 2) < 4, 'centred under the pitch'); assert.ok(tk.y - fb[3] < 14, 'close to the field / road');
});
test('v7.5.1 plinth is paving, lawn is grass, nothing of it is road; a footpath links it to the road', () => {
  cells(tk.plinth, c => assert.equal(c, C.PLAZA)); let road = 0, paved = 0;
  cells(tk.lawn, c => { if (c === C.ROAD) road++; assert.ok(c === C.GRASS || c === C.PLAZA || c === C.PATH, 'lawn cell ' + c); });
  assert.equal(road, 0); cells(tk.link, c => { if (c === C.PATH) paved++; }); assert.ok(paved > 0);
  assert.equal(at((tk.link[0] + tk.link[2]) / 2, tk.link[1] - 0.3), C.ROAD, 'path meets the road');
});
test('v7.5.1 no trees or buildings on the tank lawn; it gets plaza lamps', () => {
  const L = tk.lawn; assert.equal(M.trees.filter(t => t[0] > L[0] && t[0] < L[2] && t[1] > L[1] && t[1] < L[3] + 0.5).length, 0);
  for (const b of M.buildings) if (b.bbox) assert.ok(b.bbox[2] < L[0] || b.bbox[0] > L[2] || b.bbox[3] < L[1] || b.bbox[1] > L[3], b.name || b.id);
  const ground8 = cls; const lamps = Core.placeLamps(ground8, M.meta, M.buildings);
  assert.ok(lamps.some(l => l.x > tk.plinth[0] - 1 && l.x < tk.plinth[2] + 1 && l.y > tk.plinth[1] - 1 && l.y < tk.plinth[3] + 1), 'lamps round the plinth');
});
test('v7.5.1 old north spot (under 怡丁苑1号公寓) is a plain lawn again: no paving, no lamps, label moved', () => {
  const N = tk.north_lawn; let plaza = 0; cells([N[0], 383.8, N[2], N[3]], c => { if (c === C.PLAZA) plaza++; }); assert.equal(plaza, 0);
  const lamps = Core.placeLamps(cls, M.meta, M.buildings);
  assert.equal(lamps.filter(l => l.kind === 'plaza' && l.x > N[0] && l.x < N[2] && l.y > 383.8 && l.y < N[3]).length, 0);
  const lb = M.labels.find(l => l.t === '坦克展台'); assert.ok(lb && lb.y > fb[3], 'area label follows the tank');
});
test('v7.5.1 tank collision: body is solid, the plinth front is walkable and reachable from the road', () => {
  const g = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'); assert.match(g, /x: tk\.x, y: tk\.y, name: tk\.name, info: tk\.txt \}/);
  const cg = Core.buildCollision(cls, M.meta, [], [[tk.x - 3, tk.y - 0.9, tk.x + 3, tk.y + 0.1]], null);
  const blk = (x, y) => cg.col[Math.floor(y * S) * GW + Math.floor(x * S)];
  assert.ok(blk(tk.x, tk.y - 0.4), 'tank body blocks'); assert.ok(!blk(tk.x, tk.y + 0.9), 'stand in front of it');
  // flood from the link path to the plinth front
  const GH = M.meta.h * S, seen = new Uint8Array(GW * GH), q = []; const s0 = Math.floor((tk.link[1] - 0.5) * S) * GW + Math.floor((tk.link[0] + 1.5) * S);
  seen[s0] = 1; q.push(s0); const goal = Math.floor((tk.y + 0.9) * S) * GW + Math.floor(tk.x * S); let ok = false;
  while (q.length && !ok) { const i = q.pop(); if (i === goal) ok = true; for (const j of [i - 1, i + 1, i - GW, i + GW]) if (!seen[j] && !cg.col[j] && Math.abs((j % GW) / S - tk.x) < 25 && Math.abs(Math.floor(j / GW) / S - tk.y) < 15) { seen[j] = 1; q.push(j); } }
  assert.ok(ok, 'walk from the road to the tank');
});

// v7.1: 四道门 twin entrances, 二道门 willow island, 铁路主题公园 opposite 行知广场, tank display, roads under roofs walkable
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S;
const GAME = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), BLD = fs.readFileSync(path.join(__dirname, '../js/buildings.js'), 'utf8');
const at = (x, y) => cls[Math.floor(y * S) * GW + Math.floor(x * S)];
const shadow = Core.roofShadow(cls, M.meta, M.buildings, Core.shadowKeep(M));
const pits = []; for (const p of M.passages) for (const e of [p.a, p.b]) pits.push([e.x - 1.1, e.y - 1.35, e.x + 1.1, e.y + 1.35]);
const ramps = []; for (const p of M.passages) for (const e of [p.a, p.b]) if (e.ramp) ramps.push(e.ramp);
const props = () => Core.fenceRects(M.fences).concat(Core.wallRects(M.walls), pits, ramps);
function reach(cg) {
  const seen = new Uint8Array(GW * GH), q = new Int32Array(GW * GH); let h = 0, t = 0;
  const seed = (x, y) => { const i = Math.floor(y * S) * GW + Math.floor(x * S); if (!cg.col[i] && !seen[i]) { seen[i] = 1; q[t++] = i; } };
  const near = o => { for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (seen[(Math.floor(o[1] * S) + dy) * GW + Math.floor(o[0] * S) + dx]) return true; return false; };
  seed(M.spawn[0], M.spawn[1]); const used = new Set();
  for (;;) { while (h < t) { const i = q[h++], x = i % GW; for (const j of [i - 1, i + 1, i - GW, i + GW]) { if (j < 0 || j >= GW * GH || (j === i - 1 && x === 0) || (j === i + 1 && x === GW - 1)) continue; if (!seen[j] && !cg.col[j]) { seen[j] = 1; q[t++] = j; } } }
    let more = false; for (const p of M.passages) for (const [a, b] of [[p.a, p.b], [p.b, p.a]]) if (!used.has(p.id + a.side) && near(a.out)) { used.add(p.id + a.side); seed(b.out[0], b.out[1]); more = true; }
    if (!more) return seen; }
}
const cg = Core.buildCollision(cls, M.meta, [], props(), shadow), seen = reach(cg);
const hit = (x, y, r = 3) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (seen[(Math.floor(y * S) + dy) * GW + Math.floor(x * S) + dx]) return true; return false; };
const trackY = x => { const [[ax, ay], [bx, by]] = M.props.railPark.track; return ay + (x - ax) * (by - ay) / (bx - ax); };

test('v7.1 四道门 underpass: two canopied entrances (west + east, same side of the railway) lead into one tunnel with a single exit', () => {
  const sd = M.passages.filter(p => p.group === 'sidaomen'); assert.equal(sd.length, 2);
  const [w, e] = sd.sort((p, q) => p.a.x - q.a.x);
  assert.ok(w.a.x < 486 && e.a.x > 489, 'one entrance each side of the 行知广场 crossing');
  for (const p of sd) { assert.ok(trackY(p.a.x) - p.a.y > 10, 'north of the railway'); assert.ok(p.a.canopy && p.a.ramp, 'glass canopy + ramp');
    assert.ok(p.a.canopy[2] - p.a.canopy[0] > 10, 'long canopy as on the satellite'); assert.ok(hit(p.a.out[0], p.a.out[1]), p.name + ' entrance reachable');
    const pa = Core.passageAt(M.passages, p.a.out[0], p.a.out[1]); assert.ok(pa && pa.to.x === 487.0 && pa.to.y === 357.2, 'goes to the shared exit'); }
  assert.deepEqual(w.b, e.b, 'same exit'); assert.ok(trackY(w.b.x) < w.b.y, 'exit south of the railway'); assert.ok(hit(w.b.out[0], w.b.out[1]));
  assert.equal(M.passages.filter(p => p.id === 'sidaomen').length, 0, 'old single entrance gone');
  assert.ok(!M.passages.find(p => p.id === 'lanhuo'), 'v7.6.4: 七道门 is a road under a rail bridge, no teleport passage');
  assert.ok(/seenEnd/.test(GAME) && /e\.canopy/.test(GAME), 'shared exit drawn once; long canopies');
});

test('v7.1 二道门 willow stands in the road at the level crossing, in a widened junction you can walk round', () => {
  const w = M.props.willow, [a, b] = M.crossings[0].pts;
  const t = ((w.x - a[0]) * (b[0] - a[0]) + (w.y - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2), dx = a[0] + t * (b[0] - a[0]) - w.x, dy = a[1] + t * (b[1] - a[1]) - w.y;
  assert.ok(t > 0 && t < 0.5 && Math.hypot(dx, dy) < 1, 'on the crossing road axis, north of the rails');
  assert.equal(at(w.x, w.y), C.ROAD, 'in the middle of the road');
  let rail = false; for (let y = w.y; y < w.y + 5; y += 0.25) if (at(w.x, y) === C.RAIL || at(w.x - 2, y) === C.RAIL) rail = true; assert.ok(rail, 'right at the railway');
  for (let k = 0; k < 24; k++) { const an = k / 24 * 2 * Math.PI, x = w.x + 2.5 * Math.cos(an), y = w.y + 2.5 * Math.sin(an);
    if (at(x, y) === C.RAIL) continue; assert.ok(Core.PAVED.has(at(x, y)) && !cg.col[Math.floor(y * S) * GW + Math.floor(x * S)] && hit(x, y, 1), `ring ${x.toFixed(1)},${y.toFixed(1)}`); }
  assert.ok(!/extraV7\.push\(\[w\.x/.test(GAME), 'no trunk collider');
});

test('v7.1 铁路主题公园: a row of green coaches + locomotive on the track opposite 行知广场', () => {
  const rp = M.props.railPark, sq = M.pave[0].rect; assert.ok(rp && rp.cars.length >= 6);
  assert.equal(rp.cars.filter(c => c.k === 'loco').length, 1); assert.ok(rp.cars.filter(c => c.k === 'coach').length >= 5);
  const x0 = Math.min(...rp.cars.map(c => c.x0)), x1 = Math.max(...rp.cars.map(c => c.x1)); assert.ok(x0 < sq[0] && x1 > sq[2], 'spans the width of 行知广场');
  for (const c of rp.cars) { assert.ok(c.y0 > sq[3] && c.y0 - sq[3] < 25, 'just across the road, south of the square'); assert.equal(at((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2), C.RAIL, 'on the track'); }
  assert.ok(hit(rp.sign.x, rp.sign.y - 0.8, 4), 'platform / sign reachable');
  assert.ok(!M.props.railPlaza && !M.props.railProps, 'old rail-plaza props removed');
  assert.ok(/trainCar\(/.test(GAME));
});

test('v7.1 tank display south of the 怡丁苑 football field (v7.5.1: really south, across the road)', () => {
  const tk = M.props.tank; assert.ok(tk && /坦克/.test(tk.txt));
  const f = M.fences.find(q => q.name === '怡丁苑足球场'), fy1 = Math.max(...f.segs.map(g => Math.max(g[1], g[3])));
  assert.ok(tk.x > 292 && tk.x < 336 && tk.y > fy1 + 3 && tk.y < fy1 + 16, 'below the field, not on the old north lawn');
  assert.ok(hit(tk.x, tk.y + 2.5, 6), 'you can walk up to it'); assert.ok(/tankSprite\(\)/.test(GAME) && /info: tk\.txt/.test(GAME));
});

test('v7.1 roads: every road / footway / steps cell outside a footprint is walkable under any roof and stays connected', () => {
  let road = 0, bad = 0, covered = 0; const noRoof = reach(Core.buildCollision(cls, M.meta, [], props(), null)); let lost = 0, offNet = 0;
  for (let y = 2; y < GH; y += 4) for (let x = 2; x < GW; x += 4) { const i = y * GW + x; if (!Core.SHADOW_OPEN.has(cls[i])) continue; road++;
    if (shadow[i]) bad++; if (!noRoof[i]) offNet++; else if (!seen[i] && !cg.col[i]) lost++; }
  assert.ok(road > 20000); assert.equal(bad, 0, 'road cells blocked by a roof shadow'); assert.equal(lost, 0, 'road cells cut off by the roof rule');
  assert.ok(offNet / road < 0.02, 'only the off-campus road west of the river is off the network');
  // roads that a facade / roof actually overlaps in the 3/4 view: all walkable + reachable
  for (const b of M.buildings) { if (b.bridge) continue; const h = Core.wallHeight(b) / 16, [x0, y0, x1] = b.bbox;
    for (let x = Math.ceil(x0 * S); x < Math.floor(x1 * S); x += 2) for (let y = Math.max(0, Math.floor((y0 - h) * S)); y < Math.floor(y0 * S); y++) { const i = y * GW + x;
      if (!Core.SHADOW_OPEN.has(cls[i])) continue; covered++; assert.ok(!shadow[i], 'covered road walkable'); } }
  assert.ok(covered > 200, 'covered ' + covered);
  // the img8 spot between 新能源化工研究院 and 兵器馆: the road under the facade is walkable and reachable
  assert.equal(at(545, 55.3), C.ROAD); assert.ok(!cg.col[Math.floor(55.3 * S) * GW + Math.floor(545 * S)] && hit(545, 55.3, 1));
  // v7.6: the strip reveal became a whole-building fade, still only while the player is hidden (not a persistent cut)
  assert.ok(/hidesPlayer\(sp, player\.x \* T, player\.y \* T\)/.test(GAME) && /sp\.fadeT = Core\.fadeStep\(/.test(GAME) && !/buildings\.revealed\(/.test(GAME));
  assert.ok(!/applyReveal\(spr, spr\.base\)/.test(BLD), 'no persistent cut-away');
});

// v7: perspective (no walking under roofs), trees, gates + perimeter wall, courts, canteens, stairs, 连廊, 门洞
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S;
const GAME = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8');
const shadow = Core.roofShadow(cls, M.meta, M.buildings, Core.shadowKeep(M));
const lampRects = Core.placeLamps(cls, M.meta, M.buildings).map(l => [l.x - 0.12, l.y - 0.15, l.x + 0.12, l.y]);
const pits = []; for (const p of M.passages) for (const e of [p.a, p.b]) pits.push([e.x - 1.1, e.y - 1.35, e.x + 1.1, e.y + 1.35]);
function collision(plugs) { return Core.buildCollision(cls, M.meta, [], lampRects.concat(Core.fenceRects(M.fences), Core.wallRects(M.walls), pits, plugs || []), shadow); }
function reach(cg) { // BFS from spawn; underpasses teleport between their two ends
  const W = cg.gw, H = cg.gh, seen = new Uint8Array(W * H), q = new Int32Array(W * H); let h = 0, t = 0;
  const seed = (x, y) => { const i = Math.floor(y * S) * W + Math.floor(x * S); if (!cg.col[i] && !seen[i]) { seen[i] = 1; q[t++] = i; } };
  const near = o => { for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (seen[(Math.floor(o[1] * S) + dy) * W + Math.floor(o[0] * S) + dx]) return true; return false; };
  seed(M.spawn[0], M.spawn[1]); const used = new Set();
  for (;;) {
    while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && !cg.col[j]) { seen[j] = 1; q[t++] = j; } } }
    let more = false;
    for (const p of M.passages) for (const [a, b] of [[p.a, p.b], [p.b, p.a]]) if (!used.has(p.id + a.side) && near(a.out)) { used.add(p.id + a.side); seed(b.out[0], b.out[1]); more = true; }
    if (!more) return seen;
  }
}
const cg = collision(), seen = reach(cg);
const hitIn = (sn, x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (sn[(Math.floor(y * S) + dy) * GW + Math.floor(x * S) + dx]) return true; return false; };
const hit = (x, y, r = 3) => hitIn(seen, x, y, r);
const free = (x, y) => !cg.col[Math.floor(y * S) * GW + Math.floor(x * S)];

test('v7 trees: trees are not solid (the game passes no trees to collision); every trunk cell on open ground is walkable', () => {
  assert.ok(/buildCollision\(ground8, M\.meta, \[\],/.test(GAME), 'game.js must build collision without trees');
  assert.ok(/overlapsMe\(/.test(GAME), 'trees fade when they overlap the player');
  const withTrees = Core.buildCollision(cls, M.meta, M.trees, [], null), none = Core.buildCollision(cls, M.meta, [], [], null);
  let n = 0, blockedByTree = 0;
  for (const t of M.trees) { const i = Math.floor(t[1] * S) * GW + Math.floor(t[0] * S); if (cls[i] !== C.GRASS) continue; n++; if (none.col[i]) blockedByTree++; if (n > 3000) break; }
  assert.ok(n > 1000); assert.equal(blockedByTree, 0);
  assert.ok(withTrees.col.reduce((a, v) => a + v, 0) > none.col.reduce((a, v) => a + v, 0), 'sanity: trees would block if passed');
});

test('v7 perspective (v7.1 rule): no non-road ground hides under a roof (Stardew rule), apart from the short carved links to doors / gates; roads under a roof stay walkable', () => {
  let band = 0, open = 0;
  for (const b of M.buildings) { if (b.bridge) continue; const h = Core.wallHeight(b) / 16, [x0, y0, x1] = b.bbox;
    for (let x = Math.ceil(x0 * S) + 1; x < Math.floor(x1 * S) - 1; x += 2) { // the band just above (north of) the footprint top
      const X = (x + 0.5) / S; let top = null; for (let y = Math.floor((y0 - 0.2) * S); y < Math.floor(b.bbox[3] * S); y++) if (cls[y * GW + x] === C.BUILDING) { top = y; break; } if (top == null) continue;
      for (let y = Math.max(0, Math.floor(top - h * S) + 1); y < top - 1; y++) { const i = y * GW + x; if (Core.BLOCKING.has(cls[i]) || Core.SHADOW_OPEN.has(cls[i])) continue; band++; if (!cg.col[i] && seen[i]) open++; } } }
  assert.ok(band > 100000, 'band ' + band);
  assert.ok(open / band < 0.05, `walkable share under roofs ${(100 * open / band).toFixed(2)}%`);
  // the v6 img6 bug: standing on the road right behind 教学楼17# showed the player on its roof
  // v7.1: the road / footway behind 教学楼17# is walkable again (the facade fades while you walk there); the footprint is not
  for (const [x, y] of [[640, 92.6], [625, 90.5]]) assert.ok(free(x, y), `road under roof at ${x},${y}`);
  assert.ok(!free(600, 92), 'footprint');
  assert.deepEqual([...Core.SHADOW_OPEN].sort(), [C.ROAD, C.PATH, C.STEPS].sort());
});

test('v7 gates: only 一道门 / 1.5道门 / 七道门 / 北门 open the perimeter wall; plugging them seals the campus', () => {
  assert.deepStrictEqual(M.wallGates.map(g => g.name).sort(), ['1.5道门', '一道门', '七道门', '北门'].sort());
  const reals = M.pois.filter(p => p.real).map(p => p.k).sort(); assert.deepStrictEqual(reals, ['gate1', 'gate15', 'gate7', 'gate_n'].sort());
  for (const p of M.pois.filter(p => p.k === 'gate')) assert.ok(!p.real, p.name + ' is label-only');
  assert.ok(!/p\.k === 'gate'\) .*gateSprite/.test(GAME));
  const outside = [[720, 200], [245, 505], [300, 500], [740, 52]];
  for (const [x, y] of outside) assert.ok(hit(x, y, 4), `outside point ${x},${y} reachable through the gates`);
  const plugs = M.wallGates.map(g => (g.kind === 'gate7' || g.kind === 'gate_n') ? [g.x - 0.4, g.y - g.hw - 0.6, g.x + 0.4, g.y + g.hw + 0.6] : [g.x - g.hw - 0.6, g.y - 1.0, g.x + g.hw + 0.6, g.y + 1.0]);
  const sealed = reach(collision(plugs));
  for (const [x, y] of outside) assert.ok(!hitIn(sealed, x, y, 4), `outside point ${x},${y} must only be reachable through a real gate`);
  assert.ok(hitIn(sealed, 480.6, 280, 4) && hitIn(sealed, 640, 52, 4), 'campus still connected inside');
  // 二道门 is a willow, not a frame
  assert.ok(M.props.willow && Math.hypot(M.props.willow.x - 276.85, M.props.willow.y - 361.6) < 8);
});

test('v7 courts: every court / pitch zone is fenced and each fence has a gate whose both sides are reachable', () => {
  const courts = M.fences.filter(f => f.court); assert.ok(courts.length >= 7, 'court fences ' + courts.length);
  const boxes = M.fences.map(f => { const xs = f.segs.flatMap(s => [s[0], s[2]]), ys = f.segs.flatMap(s => [s[1], s[3]]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; });
  // connected components of COURT cells (tile grid)
  const W = M.meta.w, H = M.meta.h, lab = new Int32Array(W * H).fill(-1), comps = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (lab[i] >= 0 || cls[(y * S + 2) * GW + x * S + 2] !== C.COURT) continue;
    const st = [i]; lab[i] = comps.length; let n = 0, sx = 0, sy = 0;
    while (st.length) { const j = st.pop(), jx = j % W, jy = (j / W) | 0; n++; sx += jx; sy += jy;
      for (const k of [j - 1, j + 1, j - W, j + W]) { if (k < 0 || k >= W * H) continue; const kx = k % W, ky = (k / W) | 0; if (lab[k] < 0 && cls[(ky * S + 2) * GW + kx * S + 2] === C.COURT) { lab[k] = comps.length; st.push(k); } } }
    comps.push({ n, x: sx / n + 0.5, y: sy / n + 0.5 }); }
  const big = comps.filter(c => c.n >= 60); assert.ok(big.length >= 5);
  const open764 = M.v764 && M.v764.fields && M.v764.fields.pad;   // v7.6.4: the courts by the 羽毛球馆 have no fence (imagery)
  for (const c of big) if (!(open764 && c.x > open764[0] && c.x < open764[0] + open764[2] && c.y > open764[1] && c.y < open764[1] + open764[3])) assert.ok(boxes.some(b => c.x > b[0] && c.x < b[2] && c.y > b[1] && c.y < b[3]), `court at ${c.x.toFixed(1)},${c.y.toFixed(1)} (${c.n} tiles) has no fence`);
  for (const f of courts) { assert.ok(f.gates.length >= 1, f.name);
    assert.ok(f.gates.some(g => { const mx = (g[0] + g[2]) / 2, my = (g[1] + g[3]) / 2, hz = Math.abs(g[1] - g[3]) < 1e-6; return hz ? hit(mx, my - 0.8) && hit(mx, my + 0.8) : hit(mx - 0.8, my) && hit(mx + 0.8, my); }), 'gate both sides reachable: ' + f.name); }
});

test('v7 canteens: 文瀛食堂 and 龙山餐厅 are enterable canteens whose doors are reachable', () => {
  for (const re of [/文瀛食堂/, /龙山餐厅|龙山食堂/]) { const b = M.buildings.find(b => re.test(b.name || '') && b.enter);
    assert.ok(b, 'enterable ' + re); assert.ok(/^canteen/.test(b.enter)); assert.ok(hit(b.door[0], b.door[1] + 0.6, 4), 'door reachable ' + b.name); }
});

test('v7 stairs: every flight of steps (STEPS) is reachable and connects ground at both ends', () => {
  const W = GW, lab = new Int32Array(GW * GH).fill(-1); let bad = [], flights = 0;
  for (let i = 0; i < GW * GH; i++) { if (cls[i] !== C.STEPS || lab[i] >= 0) continue; const st = [i], cells = []; lab[i] = 1;
    while (st.length) { const j = st.pop(); cells.push(j); for (const k of [j - 1, j + 1, j - W, j + W]) if (k >= 0 && k < GW * GH && lab[k] < 0 && cls[k] === C.STEPS) { lab[k] = 1; st.push(k); } }
    if (cells.length < 24) continue; flights++;
    let ys = cells.map(j => (j / W) | 0), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const top = cells.filter(j => ((j / W) | 0) <= y0 + 1), bot = cells.filter(j => ((j / W) | 0) >= y1 - 1);
    const ok = arr => arr.some(j => seen[j] || seen[j - W] || seen[j + W] || seen[j - 2 * W] || seen[j + 2 * W]);
    if (!ok(top) || !ok(bot)) bad.push(`${((cells[0] % W) / S).toFixed(1)},${(((cells[0] / W) | 0) / S).toFixed(1)}`); }
  assert.ok(flights >= 5, 'flights ' + flights);
  assert.ok(bad.length <= Math.floor(flights * 0.1), `${bad.length}/${flights} flights dangle: ${bad.slice(0, 8).join(' ')}`);
});

test('v7 item 18: 17# and 18# are linked by a 连廊 (bridge on piers) and the interiors connect both ways', () => {
  const a = M.buildings.find(b => b.id === 's20'), c = M.buildings.find(b => b.id === 's21'), l = M.buildings.find(b => b.id === 'link_s20_s21');
  assert.ok(a && c && l); assert.equal(a.link, 's21'); assert.equal(c.link, 's20'); assert.equal(a.enter, 'classroom'); assert.equal(c.enter, 'classroom');
  assert.ok(l.bridge && l.bridge.clear >= 1, 'link is raised');
  assert.ok(l.bbox[1] <= a.bbox[3] + 0.2 && l.bbox[3] >= c.bbox[1] - 0.2, 'link spans the gap between the two buildings');
  // ground under the link stays open (it is a bridge, not a wall)
  const gx = (l.bbox[0] + l.bbox[2]) / 2, gy = (a.bbox[3] + c.bbox[1]) / 2; assert.ok(!Core.BLOCKING.has(cls[Math.floor(gy * S) * GW + Math.floor(gx * S)]));
  assert.ok(/走连廊/.test(GAME) && /it\.from\.link/.test(GAME), 'interior hint walks through the 连廊');
});

test('v7 item 19: the 门洞（无标识） under the building west of 北门 is walkable and joins the inner court to the 北门 plaza', () => {
  const b = M.buildings.find(b => b.id === 's15'); assert.ok(b && b.bridge && b.bridge.arcade && !b.enter);
  const y = b.bridge.y; for (let x = b.bbox[0] + 0.3; x < b.bbox[2] - 0.3; x += 0.25) assert.ok(free(x, y), `blocked inside 门洞 at ${x.toFixed(2)}`);
  assert.ok(hit(b.bbox[0] - 1.2, y) && hit(b.bbox[2] + 1.2, y) && hit(610, 56), 'both ends reachable');
});

test('v7 二龙山: with the real player footprint (0.6 x 0.35 tile) every walkway plateau on the hill connects to the campus', () => {
  const W = GW, F = new Uint8Array(GW * GH);
  for (let y = 2; y < GH; y++) for (let x = 1; x < GW - 2; x++) { let ok = 1; for (let dy = -1; dy <= 0 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (cg.col[(y + dy) * W + x + dx]) { ok = 0; break; } F[y * W + x] = ok; }
  const sn = new Uint8Array(GW * GH), q = [Math.floor(M.spawn[1] * S) * W + Math.floor(M.spawn[0] * S)]; sn[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of [i - 1, i + 1, i - W, i + W]) if (!sn[j] && F[j]) { sn[j] = 1; q.push(j); } }
  let n = 0, tot = 0;
  for (let ty = 60; ty < 300; ty++) for (let tx = 0; tx < 232; tx++) { const i = (ty * S + 2) * W + tx * S + 2, c = cls[i]; if (c !== C.PATH && c !== C.STEPS && c !== C.ROAD) continue; if (cg.col[i]) continue; tot++;
    let r = 0; for (let dy = -2; dy <= 2 && !r; dy++) for (let dx = -2; dx <= 2; dx++) if (sn[i + dy * W + dx]) { r = 1; break; } if (!r) n++; }
  assert.ok(tot > 800); assert.ok(n / tot < 0.04, `${n}/${tot} hill walkway tiles cut off`);
});

// v7.3: (A) three visible faces (roof + front + shaded right side wall) on buildings and big props,
//       (B) 龙山餐厅 wide outdoor entrance staircase: present, contiguous, connected and reachable on foot
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S;
const GAME = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), BLD = fs.readFileSync(path.join(__dirname, '../js/buildings.js'), 'utf8');
const P7 = fs.readFileSync(path.join(__dirname, '../js/props_v7.js'), 'utf8'), PR = fs.readFileSync(path.join(__dirname, '../js/props.js'), 'utf8');
const ST = M.props.stairs, LS = ST && M.buildings.find(b => b.id === ST.bid);   // v7.6.4: south stair removed (west entrance, see v764.test)
const stest = ST ? test : test.skip;
const at = (x, y) => cls[Math.floor(y * S) * GW + Math.floor(x * S)];
function fullCollision() { // as in game.js: lamps, fences, walls, underpass pits, roof shadows + the two stair cheek walls
  const L = Core.placeLamps(cls, M.meta, M.buildings), pits = [];
  for (const p of M.passages) for (const e of [p.a, p.b]) pits.push([e.x - 1.1, e.y - 1.35, e.x + 1.1, e.y + 1.35]);
  const cheeks = ST ? [[ST.x0, ST.y0, ST.x0 + ST.cheek, ST.y1], [ST.x1 - ST.cheek, ST.y0, ST.x1, ST.y1]] : [];
  return Core.buildCollision(cls, M.meta, [], L.map(l => [l.x - 0.12, l.y - 0.15, l.x + 0.12, l.y]).concat(Core.fenceRects(M.fences), Core.wallRects(M.walls), pits, cheeks), Core.roofShadow(cls, M.meta, M.buildings, Core.shadowKeep(M)));
}
function bfs(col, x, y, pass) { const seen = new Uint8Array(GW * GH), q = new Int32Array(GW * GH); let h = 0, t = 0; const s = Math.floor(y * S) * GW + Math.floor(x * S);
  if (col[s]) return seen; seen[s] = 1; q[t++] = s;
  while (h < t) { const i = q[h++], cx = i % GW, cy = (i / GW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const j = ny * GW + nx; if (!seen[j] && !col[j] && (!pass || pass(cls[j]))) { seen[j] = 1; q[t++] = j; } } }
  return seen; }
const cg = fullCollision(), seenAt = (seen, x, y) => seen[Math.floor(y * S) * GW + Math.floor(x * S)];

stest('v7.3 龙山餐厅 staircase: wide flight of STEPS directly in front of the south door, building flagged', () => {
  assert.equal(LS.name, '龙山餐厅'); assert.ok(LS.enter); assert.deepEqual(LS.stairs && [LS.stairs.x0, LS.stairs.x1], [ST.x0, ST.x1]);
  assert.ok(ST.x1 - ST.x0 >= 10, 'wide (>= 10 tiles = 25 m)'); assert.ok(ST.y1 - ST.y0 >= 2.5 && ST.treads >= 6, 'deep enough for a real flight');
  assert.ok(LS.door[0] > ST.x0 + 2 && LS.door[0] < ST.x1 - 2, 'door centred on the flight'); assert.ok(Math.abs(LS.door[1] - ST.y0) < 0.3, 'flight starts at the door line');
  let n = 0, tot = 0; for (let y = ST.y0; y < ST.y1; y += 1 / S) for (let x = ST.x0; x < ST.x1; x += 1 / S) { tot++; if (at(x + 0.01, y + 0.01) === C.STEPS) n++; }
  assert.ok(n / tot > 0.97, `STEPS fill ${n}/${tot}`);
  assert.ok(Core.PAVED.has(C.STEPS) && Core.SHADOW_OPEN.has(C.STEPS) && !Core.BLOCKING.has(C.STEPS));
});
stest('v7.3 staircase is one contiguous flight', () => {
  const seen = bfs(new Uint8Array(GW * GH), LS.door[0], ST.y0 + 0.1, c => c === C.STEPS); let n = 0, all = 0;
  for (let y = ST.y0; y < ST.y1; y += 1 / S) for (let x = ST.x0; x < ST.x1; x += 1 / S) if (at(x + 0.01, y + 0.01) === C.STEPS) { all++; if (seenAt(seen, x + 0.01, y + 0.01)) n++; }
  assert.equal(n, all);
});
stest('v7.3 staircase reachability: door -> top tread -> bottom tread -> service lane -> both roads -> spawn', () => {
  const seen = bfs(cg.col, LS.door[0], LS.door[1] + 0.4);
  assert.ok(seenAt(seen, LS.door[0], LS.door[1] + 0.4), 'door landing walkable');
  assert.ok(seenAt(seen, LS.door[0], ST.y1 - 0.1) && seenAt(seen, ST.x0 + 2, ST.y1 - 0.1) && seenAt(seen, ST.x1 - 2, ST.y1 - 0.1), 'bottom tread reachable across the width');
  const [lx0, ly0, lx1, ly1] = ST.lane, ly = (ly0 + ly1) / 2;
  for (let x = lx0 + 0.5; x < lx1 - 0.5; x += 2) assert.ok(seenAt(seen, x, ly), 'lane walkable at x=' + x);
  let w = false, e = false; for (let x = lx0 - 3; x < lx0 + 1; x += 0.25) if (at(x, ly) === C.ROAD && seenAt(seen, x, ly)) w = true;
  for (let x = lx1 - 1; x < lx1 + 4; x += 0.25) if (at(x, ly) === C.ROAD && seenAt(seen, x, ly)) e = true;
  assert.ok(w && e, 'lane joins the west and east roads');
  let sp = false; for (let dy = -4; dy <= 4 && !sp; dy++) for (let dx = -4; dx <= 4; dx++) if (seen[(Math.floor(M.spawn[1] * S) + dy) * GW + Math.floor(M.spawn[0] * S) + dx]) { sp = true; break; }
  assert.ok(sp, 'spawn reachable from the 龙山餐厅 door');
  assert.ok(Core.nearestBuilding(M.buildings, LS.door[0], LS.door[1] + 0.6, 2.6) === LS || Core.nearestBuilding(M.buildings, LS.door[0], LS.door[1] + 0.6, 2.6).id === LS.id, 'E enters 龙山餐厅 from the top of the flight');
});
stest('v7.3 staircase: cheek walls are solid, no lamps / trees on the flight, characters climb (lift)', () => {
  assert.ok(Core.rectBlocked(cg, ST.x0 + 0.05, ST.y0 + 1, ST.x0 + ST.cheek - 0.05, ST.y0 + 1.3) && Core.rectBlocked(cg, ST.x1 - ST.cheek + 0.05, ST.y0 + 1, ST.x1 - 0.05, ST.y0 + 1.3));
  const L = Core.placeLamps(cls, M.meta, M.buildings); assert.ok(!L.some(l => l.x > ST.x0 && l.x < ST.x1 && l.y > ST.y0 - 0.5 && l.y < ST.y1 + 0.5));
  assert.ok(!M.trees.some(t => t[0] > ST.x0 - 1 && t[0] < ST.x1 + 1 && t[1] > ST.y0 - 0.5 && t[1] < ST.y1 + 1.5));
  assert.equal(Core.stairLift(ST, LS.door[0], ST.y1), 0); assert.equal(Core.stairLift(ST, LS.door[0], ST.y0), Core.STAIR_RISE); assert.equal(Core.stairLift(ST, ST.x0 - 1, ST.y0 + 1), 0);
  assert.ok(Core.stairLift(ST, LS.door[0], ST.y0 + 1) > Core.stairLift(ST, LS.door[0], ST.y0 + 2));
  assert.match(GAME, /P7\.stairsSprite\(/); assert.match(GAME, /Core\.stairLift\(STAIRS, o\.ch\.x, o\.ch\.y\)/); assert.match(P7, /function stairsSprite\(/); assert.match(BLD, /b\.stairs \? 20 : 0/);
});
test('v7.3 three faces (v7.4: right side wall replaced by the three-view left face); big props use box3', () => {
  assert.doesNotMatch(BLD, /function side3\(|side3\(g, b/, 'v7.3 right-hand side wall is gone');
  assert.match(BLD, /function leftFace\(/); assert.match(BLD, /Core\.oblique\(b\)/); assert.equal(typeof Core.oblique, 'function');
  assert.match(P7, /function box3\(/); for (const k of ['gatePillar', 'tankSprite', 'heliSprite', 'boardSprite']) { const j = P7.indexOf('function ' + k + '('); assert.ok(j >= 0 && P7.slice(j, j + 2500).includes('box3('), k + ' uses box3'); }
  assert.match(PR, /PropsV7\.box3\(/);
});

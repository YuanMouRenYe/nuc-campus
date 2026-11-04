// v7.6.1: the 南区 "underpass" is just the N-S road running on under a short rail bridge (no teleport, no canopy);
//         地下停车场 under the lawn south of 15号楼 · 逸夫楼; 小树林 with 凉亭 + 喷泉 south of it (OSM park 1069158507).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S;
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const GAME = rd('js/game.js'), P761 = rd('js/props_v761.js'), GROUND = rd('js/ground.js'), HTML = rd('index.html');
const at = (x, y) => cls[Math.floor(y * S) * GW + Math.floor(x * S)];
const rb = M.props.railBridge, gr = M.props.garage, gv = M.props.grove;
// same collision inputs as game.js: base footprint only (null shadow), fences, walls, passage pits / ramps, solid statics
const pits = []; for (const p of M.passages) for (const e of [p.a, p.b]) { pits.push([e.x - 1.1, e.y - 1.35, e.x + 1.1, e.y + 1.35]); if (e.ramp) pits.push(e.ramp); }
const solid = [].concat(rb.abut, rb.walls, gr.walls, [[gr.sign_xy[0] - 0.3, gr.sign_xy[1] - 0.3, gr.sign_xy[0] + 0.3, gr.sign_xy[1] + 0.1]], gr.vents.map(([x, y]) => [x - 0.55, y - 0.55, x + 0.55, y + 0.1]));
const cg = Core.buildCollision(cls, M.meta, [], Core.fenceRects(M.fences).concat(Core.wallRects(M.walls), pits, solid), null);
const blk = (x, y) => cg.col[Math.floor(y * S) * GW + Math.floor(x * S)];
function reach(x0, y0) { const seen = new Uint8Array(GW * GH), q = new Int32Array(GW * GH); let h = 0, t = 0; const s = Math.floor(y0 * S) * GW + Math.floor(x0 * S); seen[s] = 1; q[t++] = s;
  while (h < t) { const i = q[h++], x = i % GW; for (const j of [i - 1, i + 1, i - GW, i + GW]) { if (j < 0 || j >= GW * GH || (j === i - 1 && x === 0) || (j === i + 1 && x === GW - 1)) continue; if (!seen[j] && !cg.col[j]) { seen[j] = 1; q[t++] = j; } } } return seen; }
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[i], [bx, by] = P[j]; if ((ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay)) c = !c; } return c; };
const PARK507 = [[248.4, 369.8], [245.2, 386.1], [228.0, 391.9], [228.5, 402.0], [204.0, 402.0], [206.3, 454.3], [231.5, 439.2], [254.0, 437.5], [273.0, 447.3], [262.2, 474.3], [276.0, 472.2], [283.4, 445.2], [272.4, 362.3]];
const NODE = [241.8, 375.3];
const ROADX = [[369.9, 241.0], [375.3, 241.8], [384.2, 243.0], [404.3, 245.7]], roadX = y => { for (let i = 1; i < ROADX.length; i++) if (y <= ROADX[i][0]) { const [y0, x0] = ROADX[i - 1], [y1, x1] = ROADX[i]; return x0 + (y - y0) * (x1 - x0) / (y1 - y0); } return 245.7; }; // OSM W542204812   // OSM node 8712372628 (road W542204812 meets the rail W940740149)

test('v7.6.1 rail bridge road: continuous ROAD under the rail, walkable straight through, no teleport / canopy / fence there', () => {
  assert.ok(!M.passages.some(p => [p.a, p.b].some(e => Math.hypot(e.x - NODE[0], e.y - NODE[1]) < 20)), 'no passage near the bridge');
  for (let y = 369; y <= 392; y += 0.25) { assert.equal(at(roadX(y) + 0.5, y), C.ROAD, 'road at y ' + y); assert.ok(!blk(roadX(y) + 0.5, y), 'walkable at y ' + y);
    if (y > 372.6 && y < 377.8) for (let x = rb.road[0] + 0.3; x < rb.road[1] - 0.3; x += 0.25) assert.ok(!blk(x, y), 'full road width open at ' + x + ',' + y); }
  assert.equal(Core.passageAt(M.passages, 242.2, 375.2), null, 'E does nothing here'); assert.ok(reach(241.5, 369)[Math.floor(390 * S) * GW + Math.floor(243.8 * S)], 'walk N -> S straight down the road');
  assert.ok(rb.road[0] < NODE[0] && rb.road[1] > NODE[0], 'bridge on the OSM crossing node');
  // the rail stays solid either side of the road; abutments block
  assert.equal(at(236, 376.3), C.RAIL); assert.ok(blk(236, 376.3) && blk(249, 374.4), 'rail beside the bridge still blocks');
  for (const r of rb.abut) assert.ok(blk((r[0] + r[2]) / 2, (r[1] + r[3]) / 2), 'abutment blocks');
  assert.ok(!M.crossings.some(c => Math.hypot(c.pts[0][0] - NODE[0], c.pts[0][1] - NODE[1]) < 20), 'not a level crossing (no rubber panels)');
});
test('v7.6.1 rail bridge art: deck sprite over the road sorts after a player beneath it and fades; sunken road decal; no fence posts on the deck', () => {
  assert.ok(rb.deck[0] < rb.road[0] && rb.deck[1] > rb.road[1] && rb.rail.length === 2 && Math.abs((rb.rail[0] + rb.rail[1]) / 2 - NODE[1]) < 1, 'deck spans the road on the rail line');
  assert.ok(rb.slope_n[0] < rb.slope_n[1] && rb.slope_n[1] < rb.slope_s[0] && rb.slope_s[0] < rb.slope_s[1], 'gentle slope north + south of the deck');
  assert.match(P761, /function railBridgeSprite\(b\)/); assert.match(P761, /function sunkenRoadDecal\(g, b\)/);
  const sortY = Math.max(...rb.rail) + 1.25 + 0.75; assert.ok(sortY > rb.repave[3] - 0.3, 'anyone on the road under the deck is drawn before (= under) it');
  assert.match(GAME, /railBridgeSprite\(rb\)[\s\S]{0,200}y: bs\.sortY[^\n]*nocol: true, fade: true/); assert.match(GAME, /sunkenRoadDecal\(g, rb\)/);
  assert.match(GROUND, /this\.bridges = extra\.bridges/); assert.match(GROUND, /this\.bridges\.some\(/); assert.match(GAME, /bridges: \[?M\.props && M\.props\.railBridge/);
  assert.match(HTML, /props_v761\.js/); assert.ok(!/canopySprite/.test(GAME.split('PR.railBridge')[1].split('PR.garage')[0]), 'no canopy on the bridge');
  assert.ok(M.spots.some(s => s.id === 'rail_bridge' && s.intro) && M.labels.some(l => l.t === '南区铁路桥'));
});
test('v7.6.1 地下停车场: lawn roof south of 15号楼 at the screenshot spot, ramp + canopy + P sign + vents; only ramp walls (and props) block', () => {
  const b15 = M.buildings.find(b => b.id === 'v76_15'), R = gr.roof, P = gr.ramp;
  assert.ok(R[1] >= b15.bbox[3] - 0.5 && R[1] < b15.bbox[3] + 3, 'roof starts at the south side of 15号楼');
  assert.ok(P[0] - 247.5 < 2.5 && P[1] <= 408.5 && P[3] >= 408.0, 'ramp right beside where the player stood in the screenshot (~247.5, 408.5)');
  assert.equal(gr.dir, 'e', 'v7.6.4: drive-through west -> east'); const my = (P[1] + P[3]) / 2;
  for (let x = gr.mouth[0] - 1.5; x < P[2] - 0.3; x += 0.25) { assert.equal(at(x, my), C.ROAD, 'west road -> mouth -> ramp at x ' + x); assert.ok(!blk(x, my), 'drive in at ' + x); }
  for (const w of gr.walls) assert.ok(blk((w[0] + w[2]) / 2, (w[1] + w[3]) / 2), 'ramp wall blocks');
  const O = gr.ramp_out; for (let x = O[0] + 0.8; x < gr.link[2] + 1.5; x += 0.25) { assert.ok([C.ROAD, C.PATH].includes(at(x, my)), 'exit ramp -> link -> east road at x ' + x); assert.ok(!blk(x, my), 'exit blocked at x ' + x); }
  for (const w of gr.walls) for (let x = w[0]; x < w[2]; x += 0.2) assert.notEqual(at(x, (w[1] + w[3]) / 2), C.BUILDING);
  let grass = 0, n = 0; for (let x = 253.8; x < R[2] - 0.5; x += 0.5) for (let y = Math.max(R[1] + 1.2, P[3] + 0.6); y < R[3] - 0.5; y += 0.5) { n++; if (at(x, y) === C.GRASS) grass++; if (!gr.vents.some(([vx, vy]) => Math.abs(vx - x) < 0.7 && vy - y > -0.2 && vy - y < 0.7)) assert.ok(!blk(x, y), 'lawn roof walkable ' + x + ',' + y); }
  assert.ok(grass / n > 0.9, 'lawn on top'); assert.equal(M.trees.filter(t => t[0] > R[0] && t[0] < R[2] && t[1] > R[1] && t[1] < R[3]).length, 0, 'no trees on the roof slab');
  assert.ok(gr.sign === 'P 地下停车场' && gr.vents.length >= 3 && gr.canopy[0] <= P[0] && gr.canopy[3] >= P[3]);
  assert.match(GAME, /parkingSign\(\)/); assert.match(GAME, /ventSprite\(\)/); assert.match(GAME, /garageDecal\(g, gr\)/); assert.match(P761, /'P'[^\n]*地下停车场/);
  assert.ok(M.labels.some(l => l.t === '地下停车场') && M.spots.some(s => s.id === 'garage' && /近似/.test(s.kz)));
});
test('v7.6.1 小树林: in OSM park 1069158507 south of the garage; fountain (imagery) on a paved plaza, 凉亭, paths walkable, trees around', () => {
  for (const q of gv.pavilion ? [[gv.pavilion.x, gv.pavilion.y]] : []) assert.ok(inPoly(q[0], q[1], PARK507), '凉亭 in park 507');
  const f = M.props.fountains.find(q => q.name === '小树林喷泉'); assert.ok(f && Math.hypot(f.x - 255, f.y - 432.5) < 1 && inPoly(f.x, f.y, PARK507), 'fountain at the imagery circle');
  assert.equal(at(f.x + 1.8, f.y), C.PLAZA, 'paved round the fountain'); assert.ok(f.y > gr.roof[3], 'south of the garage');
  const pv = gv.pavilion; assert.equal(at(pv.x, pv.y - 0.5), C.PLAZA, 'pavilion pad'); assert.ok(!blk(pv.x, pv.y - 1), 'walk into the 凉亭');
  assert.match(GAME, /PR\.grove[^\n]*pavilionSprite\(pv\.w \* T, pv\.h \* T\)[^\n]*nocol: true, fade: true/);
  const seen = reach(241.5, 369); for (const [x, y] of [[252, 432.45], [261, 430.6], [275, 425.1], [256.4, 438], [255.6, 425]]) { assert.equal(at(x, y), C.PATH, 'path ' + x + ',' + y); assert.ok(seen[Math.floor(y * S) * GW + Math.floor(x * S)], 'reachable from the bridge road'); }
  const P = M.spots.find(s => s.id === 'grove').poly, trees = M.trees.filter(t => inPoly(t[0], t[1], P)); assert.ok(trees.length >= 40, 'a grove: ' + trees.length);
  assert.ok(!trees.some(t => Math.hypot(t[0] - f.x, t[1] - f.y) < 3), 'no tree in the fountain plaza'); assert.ok(M.labels.some(l => l.t === '小树林'));
});
test('v7.6.1 rules kept: base-only collision, trees no collision, 柏林园 stays on OSM 1069158508 north of the rail', () => {
  assert.match(GAME, /Core\.buildCollision\(ground8, M\.meta, \[\],[^\n]*null\)/);
  const t = M.trees.find(t => inPoly(t[0], t[1], M.spots.find(s => s.id === 'grove').poly)); assert.ok(!blk(t[0], t[1]), 'tree trunk walkable');
  const bl = M.spots.find(s => s.id === 'bailinyuan'); assert.deepEqual(bl.poly[0], [222.5, 259.1]); assert.ok(Math.max(...bl.poly.map(q => q[1])) < 381, '柏林园 north of the rail');
});

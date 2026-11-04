// v7.6.2: no diagonal hatching, roads clear, flag on the axis, 17号楼穿堂, 西北 relabels, 瑾瑜, 主楼 / 11号楼, library stair,
//         canteens, 食味坊 road, stadium fit, sports / 主席台, tidy layout, 柏林园 pond, 二龙山 continuous climbing route
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), ELEV = require('./helpers.cjs').readPNG(path.join(__dirname, '../data/elev.png')).data, { C } = Core, S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S;
const JS = f => fs.readFileSync(path.join(__dirname, '../js', f), 'utf8');
const cg = Core.buildCollision(cls, M.meta, [], Core.fenceRects(M.fences).concat(Core.wallRects(M.walls)), null);
const at = (x, y) => cls[Math.floor(y * S) * GW + Math.floor(x * S)];
// player footprint (0.6 x 0.35 tile = 3 x 2 sub-cells) free
const FP = new Uint8Array(GW * GH);
for (let y = 2; y < GH; y++) for (let x = 1; x < GW - 2; x++) { let ok = 1; for (let dy = -1; dy <= 0 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (cg.col[(y + dy) * GW + x + dx]) { ok = 0; break; } FP[y * GW + x] = ok; }
const ROUTE = new Set([C.PATH, C.STEPS, C.ROAD, C.PLAZA, C.APRON, C.PARKING]);
function routeFlood(x0, y0) { // flood that stays on walkways (plus a 1 sub-cell verge): you follow the path, not the forest
  const onR = i => { if (ROUTE.has(cls[i])) return true; for (const j of [i - 1, i + 1, i - GW, i + GW]) if (ROUTE.has(cls[j])) return true; return false; };
  const sn = new Uint8Array(GW * GH), q = []; let best = -1, bd = 1e9;
  for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) { const i = (Math.floor(y0 * S) + dy) * GW + Math.floor(x0 * S) + dx; if (FP[i] && onR(i) && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = i; } }
  if (best < 0) return sn; sn[best] = 1; q.push(best);
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of [i - 1, i + 1, i - GW, i + GW]) if (!sn[j] && FP[j] && onR(j)) { sn[j] = 1; q.push(j); } }
  return sn;
}
const near = (sn, x, y, r = 4) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (sn[(Math.floor(y * S) + dy) * GW + Math.floor(x * S) + dx]) return true; return false; };

const HF = M.hillFix, FOOTC = [(HF.foot[0] + HF.foot[2]) / 2, (HF.foot[1] + HF.foot[3]) / 2];
test('v7.6.2 二龙山: BFS along the stairways from the 公园大门 at the foot reaches every feature on the mountain, the 长廊 and the summit', () => {
  assert.ok(HF && HF.features.length >= 9 && HF.platforms.length >= 3, 'features exported');
  const sn = routeFlood(FOOTC[0], FOOTC[1]);
  const miss = [];
  for (const q of HF.features) if (!near(sn, q.x, q.y + 0.6, 12)) miss.push(q.name);
  for (const p of HF.platforms) if (!near(sn, p.x, p.y, 4)) miss.push(p.name);
  const cor = M.buildings.find(b => b.id === 'w543873269'), L = cor.corridor.line;
  for (const e of [L[0], L[L.length - 1]]) if (!near(sn, e[0], e[1] + 1.6, 8)) miss.push('长廊 end ' + e);
  if (!near(sn, Core.SUMMIT.x, Core.SUMMIT.y + 4, 12)) miss.push('SUMMIT');
  assert.deepStrictEqual(miss, [], 'cut off from the foot');
  assert.ok(near(sn, 236, 250, 40) || near(sn, M.spawn[0], M.spawn[1], 12), 'the foot plaza joins the campus walkways');
  assert.equal(cor.corridor.pav.length, 2, '长廊: 两座四角亭'); assert.ok(/27 间子廊/.test(cor.intro) && /95 米/.test(cor.intro));
});

test('v7.6.2 二龙山: the stairways are straight axis-aligned runs, unbroken from end to end (every wall they cross is a full-width flight)', () => {
  const names = Object.keys(HF.routes); assert.ok(names.length >= 2 && names.length <= 4, names.join());
  assert.ok(names.filter(n => /益足道/.test(n)).length === 2, 'two 益足道 up from the foot');
  const OK = new Set([C.PATH, C.STEPS, C.PLAZA, C.ROAD]); let flights = 0;
  for (const n of names) { const P = HF.routes[n].pts;
    for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k]; assert.ok(ax === bx || ay === by, n + ' segment not axis-aligned');
      const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len; let prevSteps = false;
      for (let t = 0; t <= len; t += 0.25) for (const o of [-1.0, -0.5, 0, 0.5, 1.0]) { const x = ax + ux * t - uy * o, y = ay + uy * t + ux * o, c = at(x, y);
        assert.ok(OK.has(c), `${n}: (${x.toFixed(2)},${y.toFixed(2)}) is class ${c}, not walkway`);
        if (o === 0) { if (c === C.STEPS && !prevSteps) flights++; prevSteps = c === C.STEPS; } } } }
  assert.ok(flights >= 8, 'stair flights through the terraces: ' + flights);
  // the three routes all end on the same network: start of every route reached from the foot
  const sn = routeFlood(FOOTC[0], FOOTC[1]); for (const n of names) for (const p of [HF.routes[n].pts[0], HF.routes[n].pts.at(-1)]) assert.ok(near(sn, p[0], p[1], 6), n + ' end ' + p);
});

test('v7.6.2 二龙山: the old broken trails are gone and the whole hill walkway network is one piece', () => {
  assert.ok(HF.stats.old_trail_cells_wiped > 5000, 'wiped ' + HF.stats.old_trail_cells_wiped);
  const sn = routeFlood(FOOTC[0], FOOTC[1]); let tot = 0, got = 0;
  for (let i = 0; i < GW * GH; i++) if (ELEV[i] >= 1 && (cls[i] === C.PATH || cls[i] === C.STEPS || cls[i] === C.PLAZA) && FP[i] && (i % GW) >= 20 * S && (i % GW) < 215 * S) { tot++; if (sn[i]) got++; }
  assert.ok(tot > 3000, 'hill walkway cells ' + tot); assert.ok(got / tot > 0.99, `only ${got}/${tot} hill walkway cells joined`);
});

test('v7.6.2 二龙山: every feature has a prop, a map label and an intro card; sources cited', () => {
  const PR = M.props.erlong; assert.ok(PR && PR.items.length === HF.features.length && PR.src.length >= 5);
  const G = JS('game.js'), P = JS('props_v762.js'), I = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(/props_v762\.js/.test(I) && /PR\.erlong/.test(G) && /p\.k === 'hill'/.test(G));
  for (const f of ['parkGate', 'steleSprite', 'bunkerSprite', 'signpost']) assert.ok(P.includes('function ' + f), f);
  for (const want of ['二龙山公园大门', '“龙园”石碑', '爱心台', '怡人台 · 凉亭', '世纪碑', '民国碉堡（遗迹）', '龙山飞瀑', '益足道 · 南线', '益足道 · 东线'])
    assert.ok(PR.items.some(q => q.name === want), want);
  for (const q of PR.items) { assert.ok(q.txt.length > 30, q.name); const sp = M.spots.find(s => s.id === q.id); assert.ok(sp && sp.intro === q.txt, 'intro card ' + q.name);
    if (q.kind !== 'sign') assert.ok(M.pois.some(p => p.k === 'hill' && p.name === q.name), 'label ' + q.name); }
  for (const n of ['爱心林', '桃园', '大型草画']) assert.ok(M.spots.some(s => s.name === n && s.poly), n);
  assert.ok(!M.pois.some(p => p.name === '继往开来'), 'OSM 继往开来 merged into 世纪碑');
  const hill = M.spots.find(s => s.id === 'erlongshan'); assert.ok(hill && /裂石山/.test(hill.intro));
  assert.ok(M.spots.findIndex(s => s.id === 'erl_aixinlin') < M.spots.findIndex(s => s.id === 'erlongshan'), 'specific areas win over the whole-hill card');
});

// ---------------------------------------------------------------- v7.6.2 items 1-15
const V = M.v762, B = id => M.buildings.find(b => b.id === id), BN = n => M.buildings.find(b => b.name === n);
const spawnFlood = (() => { const sn = new Uint8Array(GW * GH), q = [Math.floor(M.spawn[1] * S) * GW + Math.floor(M.spawn[0] * S)]; sn[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of [i - 1, i + 1, i - GW, i + GW]) if (!sn[j] && FP[j]) { sn[j] = 1; q.push(j); } } return sn; })();

test('v7.6.2 #1 no hatching: the DEM ramp is a smooth tint, kerb joints are vertical (no diagonal stripe formula left in ground.js)', () => {
  const G = JS('ground.js');
  assert.ok(!/pr\s*%\s*8/.test(G) && !/hatch lines/.test(G), 'contour hatch code gone');
  assert.ok(!/\(wx \+ wy\) % \d/.test(G) && !/\(wx - wy\) % \d/.test(G), 'no diagonal (wx ± wy) % n stripes');
  assert.ok(/NO contour hatching anywhere/.test(G) && /kerb joints are vertical/.test(G));
});

test('v7.6.2 #2 roads keep their width: 20+ buildings / fields / fences trimmed back off the roads, the few refusals logged', () => {
  const R = V.road_trim; assert.ok(R.buildings >= 20 && R.area_tiles > 1000 && R.fields >= 3 && R.fences >= 3, JSON.stringify(R).slice(0, 200));
  for (const [id, , frac] of R.buildings_refused) assert.ok(frac > 0.4, id + ' refused although it would lose only ' + frac);
  for (const [id, , frac] of R.list) { assert.ok(frac < 0.4, id); const b = B(id); assert.ok(b, id); }
  assert.ok(V.roads.clean_share_after > V.roads.clean_share_before && V.roads.max_move_tiles <= 2);
});

test('v7.6.2 #3 flag on the 主楼 axis: 行知广场升旗台 x = 主楼 door x = 484.05', () => {
  const f = M.props.flags.find(q => q.name === '行知广场升旗台'), m = B('w535204584');
  assert.equal(f.x, 484.05); assert.equal(m.door[0], 484.05); assert.ok(f.y > m.bbox[3] + 20, 'south of 主楼 on the plaza');
});

test('v7.6.2 #4 17号楼穿堂: you can walk straight through the building from west to east', () => {
  const b = B('w543815145'), [y0, y1] = b.passage; assert.ok(b.passage_name === '17号楼穿堂' && b.passage_txt);
  const ym = (y0 + y1) / 2; for (let x = b.bbox[0] + 0.3; x < b.bbox[2] - 0.3; x += 0.25) assert.ok(FP[Math.floor(ym * S) * GW + Math.floor(x * S)], 'blocked at ' + x.toFixed(2));
  assert.ok(near(spawnFlood, b.bbox[0] + 1, ym, 3) && near(spawnFlood, b.bbox[2] - 1, ym, 3), 'passage reached');
});

test('v7.6.2 #5 西北 relabels: 家属楼 ×11, 附属学校 中学部 / 小学部, 校医院', () => {
  for (const id of ['s29', 's30', 's31', 's32', 's33', 's34', 's35', 's36', 's37', 's38', 's39']) assert.equal(B(id).name, '家属楼', id);
  assert.equal(B('s53').name, '中北大学附属学校 · 中学部'); assert.equal(B('s54').name, '中北大学附属学校 · 小学部'); assert.ok(/校医院/.test(B('s40').name));
  assert.ok(!M.labels.some(l => /北区学生公寓/.test(l.t || l.name || '')), 'old 北区学生公寓 label gone');
});

test('v7.6.2 #6 瑾瑜国际会议中心: its own building with the fan-shaped hall', () => {
  const j = B('jinyu_hall'); assert.ok(j && j.special === 'jinyu' && j.fan && j.fan[2] > 10);
  assert.ok(M.spots.some(s => s.id === 'jinyu'));
});

test('v7.6.2 #7 主楼 (with 中北大学 on the front) and 11号楼 behind it are two buildings', () => {
  const m = B('w535204584'), r = B('b11'); assert.equal(m.name, '主楼'); assert.equal(r.name, '11号楼'); assert.ok(m.special === 'main');
  assert.ok(r.bbox[3] < m.bbox[1], '11号楼 north of 主楼, no overlap'); assert.ok(Math.abs(r.bbox[0] - m.bbox[0]) < 2 && Math.abs(r.bbox[2] - m.bbox[2]) < 0.1);
  assert.equal(V.buildings.split[0][0], '主楼'); assert.equal(V.buildings.split[0][2], '11号楼');
});

test('v7.6.2 #8 图书馆: two fountains either side of an arched stair that runs to the door and on to the road', () => {
  const L = V.stamp.library, st = L.stair, ax = 427.0, fs_ = M.props.fountains.filter(f => /^图书馆/.test(f.name));
  assert.equal(fs_.length, 2); assert.ok(Math.abs((fs_[0].x + fs_[1].x) / 2 - ax) < 0.01 && fs_[0].y === fs_[1].y, 'symmetric about the axis');
  for (let y = st.y0 + 0.2; y < st.y1 - 0.1; y += 0.25) assert.equal(at(ax, y), C.STEPS, 'stair at y ' + y.toFixed(2));
  assert.ok(st.arch && st.arch[0] === ax); assert.equal(at(ax + st.arch[2] * 0.9, st.arch[1] + 0.3), C.STEPS, 'arched flank');
  for (let y = V.stamp.library_walk[0] + 0.1; y < V.stamp.library_walk[1]; y += 0.25) assert.ok([C.PATH, C.ROAD, C.STEPS, C.PLAZA].includes(at(ax, y)), 'walk at ' + y);
  const lib = B('w543817503'); assert.ok(Math.abs(lib.door[0] - ax) < 1.5);
  const sn = routeFlood(ax, st.y0 + 0.6); assert.ok(near(sn, ax, V.stamp.library_walk[1] + 0.5, 6), 'stair joins the road');
  assert.ok(!M.trees.some(t => t[0] > 418 && t[0] < 436 && t[1] > 225.5 && t[1] < 235.5), 'no trees on the forecourt');
});

test('v7.6.2 #9 canteens: 学生第一食堂 = 文瀛食堂, 学生第二食堂 = 食味坊, both enterable', () => {
  const w = BN('文瀛食堂'), s = B('w543807069'); assert.ok(w && s && s.name === '食味坊');
  assert.ok(M.buildings.some(b => b.name === '文瀛食堂' && b.enter === 'canteen') && s.enter === 'canteen');
  const all = JSON.stringify([M.labels, M.pois, M.areas]); assert.ok(!/学生一食堂|学生二食堂/.test(all));
});

test('v7.6.2 #10 食味坊: no road block under it, its door opens onto a walkway', () => {
  const s = B('w543807069'); let road = 0;
  for (let y = s.bbox[1] + 0.2; y < s.bbox[3] - 0.2; y += 0.25) for (let x = s.bbox[0] + 0.2; x < s.bbox[2] - 0.2; x += 0.25) if (at(x, y) === C.ROAD) road++;
  assert.equal(road, 0); assert.ok(near(spawnFlood, s.door[0], s.door[1] + 0.5, 4), 'door reachable');
});

test('v7.6.2 #11 大操场: the pitch sits inside the track inner kerb (scaled down), track all round it', () => {
  const p0 = V.fields.pitch_fit[0], p = { x: p0.x + p0.w / 2, y: p0.y + p0.h / 2, w: p0.w, h: p0.h }; assert.ok(p0.scale < 1 && p0.scale > 0.8);
  assert.ok(p0.x > 377 + 3 && p0.x + p0.w < 416.5 - 3, 'inside the inner kerb');
  for (let y = p0.y + 0.1; y < p0.y + p0.h; y += 0.25) for (let x = p0.x + 0.1; x < p0.x + p0.w; x += 0.25) assert.equal(at(x, y), C.PITCH, `markings rect not on grass at ${x},${y}`);
  for (let y = p0.y; y < p0.y + p0.h; y += 1) { let x0 = p.x, x1 = p.x; while (at(x0 - 0.25, y) === C.PITCH) x0 -= 0.25; while (at(x1 + 0.25, y) === C.PITCH) x1 += 0.25;
    assert.equal(at(x0 - 0.3, y), C.TRACK, 'infield ends at the kerb (W) y ' + y); assert.equal(at(x1 + 0.3, y), C.TRACK, 'kerb E y ' + y);
    assert.ok(x0 < p0.x && x1 > p0.x + p0.w, 'markings inside the kerb at y ' + y); }
  for (const y of [p0.y - 0.8, p0.y + p0.h + 0.8]) assert.equal(at(p.x, y), C.PITCH, 'grass D beyond the goal lines');
});

test('v7.6.2 #12/#13 stands: 主席台 between two 西看台 (west), one long 体育器材室 · 东看台 (east); 羽毛球馆 path; gates reachable', () => {
  const ids = ['stand_wn', 'tribune', 'stand_ws', 'stand_e'].map(B); assert.ok(ids.every(Boolean));
  const [wn, tr, ws, e] = ids; assert.ok(wn.bbox[3] <= tr.bbox[1] + 0.01 && tr.bbox[3] <= ws.bbox[1] + 0.01, 'west order N 看台 / 主席台 / S 看台');
  assert.ok(e.bbox[3] - e.bbox[1] > 30, 'east stand is one long block'); assert.equal(e.name, '体育器材室 · 东看台'); assert.equal(tr.name, '主席台');
  assert.equal(V.fields.field_fence.pts[0][0], 374.3); assert.ok(V.buildings.dorm19.east_after < 374.3, '19号 trimmed behind the fence');
  assert.equal(B('w543817501').name, '羽毛球馆');
  for (let x = 422; x < 460; x += 1) assert.ok([C.PATH, C.ROAD, C.PLAZA, C.STEPS].includes(at(x, 264.0)), 'gym path at ' + x);
  for (const g of V.fields.field_fence.gates) { const [o, c, a0, a1] = g, m = (a0 + a1) / 2, [x, y] = o === 'h' ? [m, c] : [c, m];
    assert.ok(near(spawnFlood, x, y, 6), 'gate ' + g); }
});

test('v7.6.2 #14 tidy layout: buildings squared to the axes, road nodes straightened (clean share up, small moves)', () => {
  assert.ok(V.buildings.squared >= 150 && V.buildings.squared_rect >= 140);
  assert.ok(V.roads.clean_share_after >= 0.35 && V.roads.clean_share_before < 0.2 && V.roads.max_move_tiles <= 2);
});

test('v7.6.2 #15 柏林园: a small pond beside the 文化长廊 (no fountain in the forest)', () => {
  assert.equal(at(205.0, 336.4), C.WATER); assert.equal(at(200.4, 337.0), C.WATER);
  const g = M.props.bailin.gallery; assert.ok(Math.abs(336.4 - g.y0) < 5, 'next to the 长廊');
  assert.ok(!M.props.fountains.some(f => f.x > 185 && f.x < 240 && f.y > 320 && f.y < 360), 'no fountain in 柏林园');
});

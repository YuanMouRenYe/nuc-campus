// v7.6.1c: the four slopes the user named (tools/slopes_v761.py) — continuous road ramps, low side walls, exposed
// foundations on sloping sites, faint minimap contours, and the 瑾瑜国际会议中心 label.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap, readPNG, flood, root } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S;
const T = readPNG(path.join(root, 'data/terrain.png'));
const T4 = new Uint8Array(GW * GH * 4); for (let i = 0; i < GW * GH; i++) for (let k = 0; k < 3; k++) T4[i * 4 + k] = T.data[i * T.ch + k];
const ramp = i => T.data[i * T.ch + 1], B = i => T.data[i * T.ch + 2];
const box = (x0, y0, x1, y1, f) => { let n = 0; for (let y = Math.floor(y0 * S); y < y1 * S; y++) for (let x = Math.floor(x0 * S); x < x1 * S; x++) if (f(y * GW + x)) n++; return n; };
const longRamp = i => ramp(i) && (B(i) & 16) && (B(i) & 15) >= 1 && (B(i) & 15) <= 8;

test('v7.6.1 slopes: all four named slopes are in map.json with DEM heights and real rise', () => {
  assert.equal(M.slopes.length, 4); for (const s of M.slopes) { assert.ok(s.rise >= 4 && s.top > s.bottom, s.name + ' rise ' + s.rise); assert.ok(s.ramp > 1000 && s.side > 100, s.name); }
  const by = Object.fromEntries(M.slopes.map(s => [s.id, s])); assert.ok(by.slope2.rise > 9, '1.5道门 → 二道门 ≈ 11 m'); assert.ok(by.slope4.rise > 7, '瑾瑜 → 兵器 ≈ 9 m');
  for (const s of M.slopes) assert.ok(M.spots.some(z => z.id === s.id && /DEM/.test(z.intro)), 'spot for ' + s.id);
});

test('v7.6.1 slopes: rail-bridge road ramps down from the north into the cut and up again to the south (both sides)', () => {
  const d = (x0, y0, x1, y1) => { const c = {}; box(x0, y0, x1, y1, i => { if (longRamp(i) && cls[i] === C.ROAD) c[B(i) & 15] = (c[B(i) & 15] || 0) + 1; }); return c; };
  const n = d(238, 363, 246, 371), s = d(239, 380, 248, 389);
  assert.ok((n[3] || 0) + (n[2] || 0) + (n[4] || 0) > 100, 'north approach slopes down to the south ' + JSON.stringify(n));
  assert.ok((s[7] || 0) + (s[6] || 0) + (s[8] || 0) > 100, 'south approach slopes down to the north (toward the bridge) ' + JSON.stringify(s));
  assert.equal(box(240, 373.5, 245, 377, i => longRamp(i)), 0, 'flat under the deck');
});

test('v7.6.1 slopes: 1.5道门 → 二道门 road is one continuous climb (downhill = south) with shading top light → bottom dark', () => {
  const cells = []; for (let y = 368; y < 470; y += 4) { let best = null; for (let x = 270; x < 290; x++) { const i = Math.floor(y * S) * GW + x * S; if (cls[i] === C.ROAD && longRamp(i)) best = i; } assert.ok(best != null, 'ramp on the gate road at y ' + y); cells.push(best); }
  for (const i of cells) assert.ok([2, 3, 4].includes(B(i) & 15), 'downhill points south');
  assert.ok(ramp(cells[0]) < ramp(cells[cells.length - 1]), 'top (二道门) lighter than bottom (1.5道门)');
});

test('v7.6.1 slopes: side walls are drawn only — they never block, and every road stays reachable', () => {
  let side = 0; for (let i = 0; i < GW * GH; i++) if (B(i) === 32) { side++; assert.ok(!Core.BLOCKING.has(cls[i]) || cls[i] === C.TERRACE, 'side wall on blocking class'); }
  assert.ok(side > 2000, 'side wall cells ' + side);
  const cg = Core.buildCollision(cls, M.meta, [], [], null), seen = flood(cg, M.spawn[0], M.spawn[1]);
  let r = 0, ok = 0; for (let i = 0; i < cls.length; i++) if (cls[i] === C.ROAD && longRamp(i)) { r++; if (seen[i]) ok++; }
  assert.ok(ok / r > 0.97, 'named-slope road cells reachable ' + ok + '/' + r);
  // long slopes slow you a little less than the short terrace ramps
  let k = -1; for (let i = 0; i < cls.length; i++) if (cls[i] === C.ROAD && longRamp(i) && ramp(i) > 40) { k = i; break; }
  const x = (k % GW + 0.5) / S, y = (Math.floor(k / GW) + 0.5) / S, dd = Core.RAMP_DIRS[(B(k) & 15) - 1];
  const up = Core.slopeFactor(T4, GW, S, x, y, -dd[0], -dd[1]); assert.ok(Math.abs(up - Core.UPHILL_SLOW_LONG) < 1e-9, 'long uphill ' + up);
  assert.equal(Core.slopeFactor(T4, GW, S, x, y, dd[0], dd[1]), 1);
});

test('v7.6.1 slopes: buildings on a slope get an exposed foundation; the renderer and minimap contours use it', () => {
  const f = M.buildings.filter(b => b.found); assert.ok(f.length > 30, 'buildings with foundation ' + f.length);
  for (const b of f) { assert.equal(b.found.length, 5); assert.ok(b.found[0] <= 10 && b.found[1] <= 10 && b.found[4] >= 1); }
  const BJ = fs.readFileSync(path.join(root, 'js/buildings.js'), 'utf8'), GJ = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8'), GR = fs.readFileSync(path.join(root, 'js/ground.js'), 'utf8');
  assert.match(BJ, /function foundation\(/); assert.match(BJ, /if \(b\.found\) foundation\(/); assert.match(GJ, /faint contours/); assert.match(GR, /B === 32/);
});

test('v7.6.1 slopes: 瑾瑜国际会议中心 (景峪) is labelled next to the 科学楼 group', () => {
  const l = M.labels.find(l => l.t === '瑾瑜国际会议中心'); assert.ok(l); assert.ok(l.x > 500 && l.x < 530 && l.y > 100 && l.y < 140);   // v7.6.2: labelled on its own footprint
  assert.ok(M.spots.some(z => z.id === 'jinyu')); assert.ok(M.slopeSrc.some(s => /qy-office|nuc\.edu\.cn/.test(s)));
});

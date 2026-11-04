// v7.6 (steering): collision = the building BASE footprint only; the whole building fades while it hides the player.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S;
const GAME = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), BLD = fs.readFileSync(path.join(__dirname, '../js/buildings.js'), 'utf8');
const cg = Core.buildCollision(cls, M.meta, [], [], null); // exactly what game.js now does (plus prop rects)
const lifted = Core.roofShadow(cls, M.meta, M.buildings, []); // = ground under the lifted roof / left face, outside the base

test('v7.6 collision: game builds collision without the roof shadow (base footprint only)', () => {
  assert.doesNotMatch(GAME, /shadow = Core\.roofShadow\(/);
  assert.match(GAME, /Core\.buildCollision\(ground8, M\.meta, \[\], extra\.concat\([^;]*Core\.fenceRects\(M\.fences\)\), null\)/);
});
test('v7.6 collision: ground under the lifted roof but outside the base is walkable; base (non-road) cells block', () => {
  let under = 0, base = 0, perB = 0;
  for (let i = 0; i < GW * GH; i++) {
    if (lifted[i]) { under++; assert.equal(cg.col[i], 0, 'under-roof cell blocked at ' + (i % GW) / S + ',' + Math.floor(i / GW) / S); assert.notEqual(cls[i], C.BUILDING); }
    if (cls[i] === C.BUILDING) { base++; assert.equal(cg.col[i], 1); }
  }
  assert.ok(under > 20000, 'under-roof cells ' + under); assert.ok(base > 50000, 'base cells ' + base);
  // per building: the strip just north of each base (within the wall height) is open where the ground is open
  for (const b of M.buildings) { if (b.bridge || !b.poly) continue; const [x0, y0, x1] = b.bbox, cx = (x0 + x1) / 2;
    let top = null; for (let y = y0 - 0.5; y < b.bbox[3]; y += 1 / S) if (cls[Math.floor(y * S) * GW + Math.floor(cx * S)] === C.BUILDING) { top = y; break; }
    if (top == null) continue; const y = top - 0.6, i = Math.floor(y * S) * GW + Math.floor(cx * S); if (Core.BLOCKING.has(cls[i])) continue;
    assert.equal(cg.col[i], 0, b.id + ' north of base'); perB++; }
  assert.ok(perB > 100, 'buildings checked ' + perB);
});
test('v7.6 collision: roads covered by a building drawing stay walkable', () => {
  let n = 0; for (const b of M.buildings) { if (b.bridge) continue; const [x0, y0, x1, y1] = b.bbox;
    for (let sy = Math.floor((y0 - 4) * S); sy < Math.ceil(y1 * S); sy++) for (let sx = Math.floor(x0 * S); sx < Math.ceil(x1 * S); sx++) { if (sy < 0) continue; const i = sy * GW + sx; if (Core.SHADOW_OPEN.has(cls[i])) { n++; assert.equal(cg.col[i], 0); } } }
  assert.ok(n > 1000, 'covered road cells ' + n);
});
// pull hidesPlayer out of game.js and run it on a synthetic building sprite
const src = GAME.slice(GAME.indexOf('function hidesPlayer('), GAME.indexOf('window.__hidesPlayer'));
const hidesPlayer = new Function('Core', src + '; return hidesPlayer;')(Core);
test('v7.6 fade: hidesPlayer = player behind the drawn roof/facade (piece sorts after them), not in front', () => {
  const W = 64, H = 80, amask = new Uint8Array(W * H).fill(1); // fully opaque 64x80 sprite at (100,100); base bottom at y=180
  const sp = { ox: 100, oy: 100, cv: { width: W, height: H }, amask, pieces: [{ sx: 0, w: W, y0: 0, y1: H, sortY: 172 }] };
  assert.equal(hidesPlayer(sp, 130, 150), true, 'behind / under the lifted roof');
  assert.equal(hidesPlayer(sp, 130, 176), false, 'in front of the facade (drawn after the building)');
  assert.equal(hidesPlayer(sp, 30, 150), false, 'far west'); assert.equal(hidesPlayer(sp, 130, 300), false, 'far south');
  sp.amask = new Uint8Array(W * H); assert.equal(hidesPlayer(sp, 130, 150), false, 'transparent pixels do not count');
});
test('v7.6 fade: whole building eases to FADE_ALPHA ~0.45 and back; oval / strip cutouts removed', () => {
  assert.ok(Math.abs(Core.FADE_ALPHA - 0.45) < 1e-9); assert.equal(Core.fadeAlpha(0), 1); assert.ok(Math.abs(Core.fadeAlpha(1) - 0.45) < 1e-9);
  let t = 0, n = 0; while (t < 1) { const p = t; t = Core.fadeStep(t, 1); assert.ok(t > p); n++; assert.ok(n < 40); } assert.ok(n > 5, 'smooth (' + n + ' frames)');
  let m = 0; while (t > 0) { t = Core.fadeStep(t, 0); m++; assert.ok(m < 40); } assert.equal(t, 0);
  assert.match(GAME, /sp\.fadeT = Core\.fadeStep\(sp\.fadeT \|\| 0, tgt\)/); assert.match(GAME, /a = Core\.fadeAlpha\(b\.fadeT \|\| 0\)/);
  assert.match(GAME, /grp\.has\(b\.fadeGroup\)/, 'fade groups still fade together');
  assert.doesNotMatch(GAME, /\.ellipse\(h\.x/); assert.doesNotMatch(GAME, /clip\('evenodd'\)/); assert.doesNotMatch(GAME, /covers\(o\)/); assert.doesNotMatch(GAME, /buildings\.revealed\(/);
  assert.doesNotMatch(BLD, /revealRoads\(s, b/); assert.match(BLD, /s\.amask = null/);
});

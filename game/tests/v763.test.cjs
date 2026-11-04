// v7.6.3: paths / roads / footways / stairs have ONE colour on every terrace level (user: 「尽量颜色统一」); grass is unchanged vs v7.6.2
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const Core = require('../js/core.js'); const { loadMap, readPNG } = require('./helpers.cjs'), root = path.join(__dirname, '..');
const { M, cls } = loadMap(), S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S, { C } = Core;
const e = readPNG(path.join(root, 'data/elev.png')), t = readPNG(path.join(root, 'data/terrain.png'));
const elev = new Uint8Array(GW * GH); for (let i = 0; i < elev.length; i++) elev[i] = e.data[i * e.ch];
const terr = new Uint8Array(GW * GH * 4); for (let i = 0; i < GW * GH; i++) for (let k = 0; k < 4; k++) terr[i * 4 + k] = k < t.ch ? t.data[i * t.ch + k] : 255;
const SRC = fs.readFileSync(path.join(root, 'js/ground.js'), 'utf8'), ctx = { window: {}, Core, Math, Set, Map }; vm.createContext(ctx); vm.runInContext(SRC, ctx);
const G = new ctx.window.Ground(cls, M.meta, M.rails, { terrain: terr, elev, fields: M.fields, fences: M.fences, pave: M.pave });
const PV = new Set([C.ROAD, C.PATH, C.STEPS, C.PLAZA, C.APRON, C.PARKING]), NAT = new Set([C.GRASS, C.WOOD, C.DEEPWOOD, C.HILL, C.OUT]);

test('v7.6.3 paved surfaces: no per-level / ramp tint - every path, road, footway and stair pixel is the plain pattern colour on every level', () => {
  assert.ok(/LEVEL_TINT_PAVED = false/.test(SRC) && /PAVED_SURF\.has\(c\)\) return col/.test(SRC));
  for (const se of [undefined, 'summer', 'autumn']) { G.season = se; let n = 0, bad = 0; const levels = new Set();
    for (let wy = 0; wy < GH * 4; wy += 3) for (let wx = 0; wx < GW * 4; wx += 5) { const i = (wy >> 2) * GW + (wx >> 2); if (!PV.has(cls[i]) || terr[i * 4 + 2] === 32) continue;
      n++; levels.add(terr[i * 4]); if (String(G.terrain(G.color0(wx, wy), wx, wy)) !== String(G.color0(wx, wy))) bad++; }
    assert.ok(n > 500000 && levels.size >= 10, 'sampled ' + n + ' px on ' + levels.size + ' levels'); assert.equal(bad, 0, 'tinted paved pixels (' + se + ')'); }
  G.season = undefined;
});

test('v7.6.3 a path tile has the same colours on every level (path palette for stairs too, no gradient along a flight)', () => {
  const byLev = new Map(); // level -> colour histogram of PATH treads keyed by pattern position
  for (let sy = 0; sy < GH; sy++) for (let sx = 0; sx < GW; sx++) { const i = sy * GW + sx; if (cls[i] !== C.PATH || terr[i * 4 + 2] === 32) continue;
    const L = terr[i * 4]; if (!byLev.has(L)) byLev.set(L, new Set()); for (let k = 0; k < 4; k++) byLev.get(L).add(String(G.color(sx * 4 + k, sy * 4 + 1))); }
  const all = new Set(); for (const s of byLev.values()) for (const c of s) all.add(c);
  const PAL = ['#d8c39a', '#ccb58a', '#e2cfa8', '#bfa77d'].map(h => [1, 3, 5].map(j => parseInt(h.slice(j, j + 2), 16)));
  const ok = c => PAL.some(p => String(p) === c) || PAL.some(p => String(p.map(v => Math.min(255, v * 0.92) | 0)) === c);
  for (const c of all) assert.ok(ok(c), 'off-palette path colour ' + c);
  // stairs: sample every flight, colours depend only on the tread phase, never on the level or position in the flight
  const ph = new Map(); for (let sy = 0; sy < GH; sy++) for (let sx = 1; sx < GW - 1; sx++) { const i = sy * GW + sx; if (cls[i] !== C.STEPS || cls[i - 1] !== C.STEPS || cls[i + 1] !== C.STEPS) continue;
    for (let k = 0; k < 4; k++) { const wy = sy * 4 + k, key = wy % 6, c = String(G.color(sx * 4 + 1, wy)); if (!ph.has(key)) ph.set(key, new Set()); ph.get(key).add(c); } }
  assert.ok(ph.size === 6); for (const [k, s] of ph) assert.equal(s.size, 1, 'stair phase ' + k + ' has ' + s.size + ' colours');
});

test('v7.6.3 grass is unchanged vs v7.6.2 (per-level grass tint kept exactly; v7.6.4 map re-baselined)', () => {
  const want = { undefined: 'fc5f5aaa3bf00edd9d36bb20c6d755b0', autumn: 'ec2ead6cbbc73e720bca8bb5c2ecc59d' };
  for (const se of [undefined, 'autumn']) { G.season = se; const h = crypto.createHash('md5');
    for (let wy = 0; wy < GH * 4; wy += 7) for (let wx = 0; wx < GW * 4; wx += 13) if (NAT.has(cls[(wy >> 2) * GW + (wx >> 2)])) h.update(Buffer.from(G.color(wx, wy)));
    assert.equal(h.digest('hex'), want[se], 'grass colours changed (' + se + ')'); }
  G.season = undefined;
});

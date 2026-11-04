const test = require('node:test'), assert = require('node:assert');
const Core = require('../js/core.js'); require('../js/interiors.js'); require('../js/legacy_art.js');
const { flood, loadMap } = require('./helpers.cjs');

test('interiors are rectangular, have an exit and the exit is reachable from the entry point', () => {
  for (const [key, def] of Object.entries(globalThis.Interiors.DEFS)) {
    const w = def.map[0].length; def.map.forEach((r, i) => assert.strictEqual(r.length, w, `${key} row ${i}`));
    const doors = Core.findChar(def, 'D'); assert.ok(doors.length > 0 || def.down, key + ' has no exit (door or stairs down)');
    const cg = Core.interiorGrid(def);
    const start = doors.length ? { x: doors.reduce((a, d) => a + d[0], 0) / doors.length + 0.5, y: doors[0][1] - 0.6 } : Core.stairArrival(def, 'V');
    assert.ok(!Core.rectBlocked(cg, start.x - 0.3, start.y - 0.35, start.x + 0.3, start.y), key + ' start blocked');
    const seen = flood(cg, start.x, start.y - 0.5); let floor = 0, reach = 0;
    for (let i = 0; i < seen.length; i++) if (!cg.col[i]) { floor++; if (seen[i]) reach++; }
    assert.ok(reach / floor > 0.9, `${key}: only ${reach}/${floor} floor reachable`);
  }
});
test('enterable interior keys used by the map exist', () => {
  const M = require('../data/map.json');
  for (const b of M.buildings.filter(b => b.enter)) assert.ok(globalThis.Interiors.DEFS[b.enter], b.enter);
});
test('clock and day/night helpers', () => {
  assert.strictEqual(Core.clockText(8 * 60), '第 1 天 08:00');
  assert.strictEqual(Core.clockText(1440 + 61), '第 2 天 01:01');
  assert.strictEqual(Core.nightness(12 * 60), 0); assert.ok(Core.nightness(23 * 60) > 0.8);
});
test('wall heights: 18 px per floor, taller blocks stay distinct, 主楼 is the tallest', () => {
  assert.strictEqual(Core.wallHeight({ f: 1, k: 'res' }), 32);
  assert.strictEqual(Core.wallHeight({ f: 5, k: 'teach' }), 104);
  assert.strictEqual(Core.wallHeight({ f: 6, k: 'dorm' }), 122);
  assert.strictEqual(Core.wallHeight({ f: 8, k: 'teach' }), 158);
  assert.ok(Core.wallHeight({ f: 8 }) > Core.wallHeight({ f: 6 }), 'no cap flattening up to 8 floors');
  assert.ok(Core.wallHeight({ f: 30, k: 'res' }) <= 230);
  assert.strictEqual(Core.wallHeight({ f: 9, special: 'main' }), 260);
  assert.strictEqual(Core.wallHeight({ f: 5, special: 'dehuai' }), 140);
  assert.ok(Core.wallHeight({ f: 9, special: 'main' }) > Core.wallHeight({ f: 30 }));
  assert.ok(Core.wallHeight({ f: 5, special: 'dehuai' }) > Core.wallHeight({ f: 5, k: 'teach' }));
  assert.strictEqual(Core.wallHeight({ f: 1, k: 'pavilion' }), 32);
});
test('every building on the map: 主楼 tallest, heights grow with floors', () => {
  const { M } = loadMap(); const main = M.buildings.find(b => b.special === 'main');
  for (const b of M.buildings) if (b !== main) assert.ok(Core.wallHeight(b) < Core.wallHeight(main), b.id);
  for (const a of M.buildings) for (const b of M.buildings) if (!a.special && !b.special && a.k !== 'pavilion' && b.k !== 'pavilion' && a.f < b.f) assert.ok(Core.wallHeight(a) < Core.wallHeight(b));
});
test('legacy art from campus-walk v0.3.28 is ported', () => {
  for (const k of ['statue', 'dehuaiGate', 'mainBuilding']) assert.strictEqual(typeof globalThis.LegacyArt[k], 'function');
});

test('new phase-2 interiors exist with their furniture', () => {
  const D = globalThis.Interiors.DEFS, has = (k, c, n) => assert.ok(Core.findChar(D[k], c).length >= n, `${k} needs ${n}x ${c}`);
  has('classroom', 'G', 8); has('classroom', 'd', 16); has('classroom', 'h', 16); has('classroom', 'Q', 2);
  has('dorm', 'Y', 6); has('dorm', 'k', 2); has('dorm', 'n', 2);
  has('gym', 'H', 2); has('gym', 'A', 20); assert.ok(D.gym.court);
  for (const k of ['classroom', 'dorm', 'gym']) assert.strictEqual(Core.findChar(D[k], 'D').length > 0, true, k);
});
test('主楼 stairs link 1F and 2F both ways and the arrival spots are walkable', () => {
  const D = globalThis.Interiors.DEFS;
  assert.strictEqual(D.main.up, 'main2'); assert.strictEqual(D.main2.down, 'main');
  for (const [k, ch] of [['main', 'U'], ['main2', 'V']]) {
    const a = Core.stairArrival(D[k], ch), cg = Core.interiorGrid(D[k]); assert.ok(a, k);
    assert.ok(!Core.rectBlocked(cg, a.x - 0.3, a.y - 0.35, a.x + 0.3, a.y), k + ' arrival blocked');
    const seen = flood(cg, a.x, a.y - 0.2), t = Core.findChar(D[k], ch)[0];
    assert.ok(seen[Math.floor((t[1] + 0.5) * cg.sub) * cg.gw + Math.floor((t[0] + 0.5) * cg.sub)], k + ' stairs unreachable');
  }
});
test('every interior char is either floor or known furniture', () => {
  const floorish = new Set(['.', 'D', 'h', 'U', 'V']);
  for (const [k, def] of Object.entries(globalThis.Interiors.DEFS)) for (const r of def.map) for (const c of r) assert.ok(floorish.has(c) || Core.SOLID_INTERIOR.has(c), `${k}: unknown char ${c}`);
});

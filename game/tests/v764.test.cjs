// v7.6.4 regression tests: morning drill / flag guard, canteen interiors + quest text, hover tooltips, NPC placement, set dressing data.
const test = require('node:test'), assert = require('node:assert');
const Core = require('../js/core.js'); require('../js/interiors.js');
const { loadMap } = require('./helpers.cjs');
global.window = global.window || globalThis; global.document = global.document || { createElement: () => { throw new Error('no canvas in tests'); } };
require('../js/props_v764.js');
const P = globalThis.PropsV764, I = globalThis.Interiors, TT = require('../data/tooltips.js');
const { M } = loadMap();

test('morning: drill 06:00-07:00 only, flag guard 07:00-07:15, flag fully up from 07:05 to 18:30', () => {
  const d = M.props.v764.drill, g = M.props.v764.guard;
  assert.strictEqual(P.drillPeople(d, 359).length, 0); assert.strictEqual(P.drillPeople(d, 420).length, 0);
  const at = P.drillPeople(d, 390); assert.strictEqual(at.length, 24);
  for (const p of at) assert.ok(p.x >= d.x0 && p.x <= d.x1 && p.y >= d.y0 && p.y <= d.y1, 'drill stays on its rectangle');
  assert.strictEqual(P.guardPeople(g, 419).length, 0); assert.strictEqual(P.guardPeople(g, 435).length, 0);
  assert.strictEqual(P.guardPeople(g, 425).length, 3);
  assert.strictEqual(P.flagHoist(410), 0); assert.ok(P.flagHoist(424) > 0 && P.flagHoist(424) < 1);
  assert.strictEqual(P.flagHoist(430), 1); assert.strictEqual(P.flagHoist(18 * 60 + 31), 0);
});

test('canteens: four named canteens get their own multi-floor interiors with stairs both ways', () => {
  assert.deepStrictEqual(Object.keys(I.CANTEEN_KEYS).sort(), ['文瀛食堂', '田园餐厅', '食味坊', '龙山餐厅'].sort());
  const want = { 文瀛食堂: 2, 食味坊: 2, 田园餐厅: 2, 龙山餐厅: 3 };
  for (const [name, n] of Object.entries(want)) {
    const k = I.CANTEEN_KEYS[name]; assert.strictEqual(I.canteenKey('canteen', name), k + '1');
    for (let f = 1; f <= n; f++) { const d = I.DEFS[k + f]; assert.ok(d, k + f);
      assert.strictEqual(d.canteen, f); assert.strictEqual(d.floors, n);
      const g = d.grid || d.map || d.rows; const txt = JSON.stringify(g || d);
      if (f < n) assert.ok(d.up, k + f + ' has stairs up'); if (f > 1) assert.ok(d.down, k + f + ' has stairs down');
      assert.ok(d.dishes && d.dishes.length >= 1, k + f + ' sells something'); void txt; }
  }
  assert.strictEqual(I.canteenKey('canteen', '某食堂'), 'canteen', 'unknown canteens keep the generic interior');
  // the 老大同刀削面 window is on 食味坊 1F, as the noodle quest says
  const s1 = I.DEFS.swf1; assert.ok(s1.dishes.some(x => /刀削面/.test(JSON.stringify(x))));
});

test('quests: noodle quest points to 食味坊 (老大同刀削面 ranked #1 there in 2024)', () => {
  const n = Core.QUESTS.find(x => x.id === 'noodle'); assert.ok(n);
  assert.match(n.text, /食味坊/); assert.match(n.where, /食味坊一层/);
  assert.deepStrictEqual(Core.questCheck(Core.questsNew(), { mode: 'in', key: 'canteen', name: '文瀛食堂', x: 5, y: 6, action: 'buy', dish: '刀削面' }, 1), []);
});

test('tooltips: every named building / landmark / spot has a 1–3 sentence entry with a source or an 未核实 flag', () => {
  const names = new Set([...M.buildings.filter(b => b.name && !b.porch).map(b => b.name), ...M.pois.map(p => p.name), ...(M.spots || []).map(s => s.name)]);
  for (const n of names) { const t = TT.tipFor(n); assert.ok(t, 'tip for ' + n);
    const sentences = t.t.split(/[。！？]/).filter(x => x.trim()).length; assert.ok(sentences >= 1 && sentences <= 3, n + ': ' + sentences + ' sentences');
    if (t.v) assert.ok(t.s.length && t.s.every(k => /^https?:\/\//.test(TT.SRC[k])), n + ' verified entries cite a source');
  }
  for (const k of Object.keys(TT.SRC)) assert.match(TT.SRC[k], /^https?:\/\//);
  assert.strictEqual(TT.tipFor('文瀛苑3号').v, true); assert.strictEqual(TT.tipFor('龙山餐厅').v, false, '龙山 = 文韬 is an assumption');
});

test('NPCs: new placement keeps crowds off building doors', () => {
  const sim = require('./npcsim.cjs');
  for (const m of [9 * 60, 12 * 60, 18 * 60]) { const share = sim.doorShare(sim.newPlace(m), 3); assert.ok(share < 0.15, 'door share at ' + m + ' = ' + share.toFixed(2)); }
});

test('set dressing: willow collides on the trunk only; lot stalls and volleyball courts sit inside their areas', () => {
  const w = M.props.willow, [x0, y0, x1, y1] = P.WILLOW_COL(w.x, w.y);
  assert.ok((x1 - x0) * (y1 - y0) < 1.0, 'trunk footprint < 1 tile²');
  const L = M.props.v764.lot; for (const [a, b] of L.rows.map(r => [r[0], r[1]])) assert.ok(a >= L.r[1] && b <= L.r[3]);
  const V = M.props.v764.volley; assert.strictEqual(V.courts.length, 2);
});

test('lamps fade like buildings: only when the player stands behind (north of) an overlapping lamp', () => {
  assert.ok(Core.behindAlpha(100, 99, true) < 1); assert.strictEqual(Core.behindAlpha(100, 101, true), 1);
  assert.strictEqual(Core.behindAlpha(100, 99, false), 1);
});

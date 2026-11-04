const test = require('node:test'), assert = require('node:assert');
const Core = require('../js/core.js'); require('../js/interiors.js'); require('../js/legacy_art.js');
const { loadMap, flood } = require('./helpers.cjs');
const H = h => h * 60;

test('schedule: bells fire once inside (a,b], across midnight, never for huge jumps', () => {
  assert.deepStrictEqual(Core.bellsBetween(H(7.9), H(8)).map(b => b.kind), ['上课']);
  assert.strictEqual(Core.bellsBetween(H(8), H(8)).length, 0);
  assert.strictEqual(Core.bellsBetween(H(8), H(8) + 1).length, 0, 'an already-rung bell is not repeated');
  const wrap = Core.bellsBetween(H(21), 1440 + H(8.5)); assert.deepStrictEqual(wrap.map(b => b.kind), ['下课', '上课']);
  assert.strictEqual(wrap[1].at, 1440 + H(8));
  assert.strictEqual(Core.bellsBetween(0, 1440 * 5).length, 0); assert.strictEqual(Core.bellsBetween(100, 50).length, 0);
  for (const [t, k] of Core.BELLS) assert.ok(t >= 0 && t < 1440 && typeof k === 'string');
});
test('schedule: canteens fill at lunch and dinner; students drift to class by day and dorms at night', () => {
  for (const t of [H(11.5), H(12), H(12.99), H(17.5), H(18.5)]) assert.strictEqual(Core.mealCrowd(t), 1, 'crowd at ' + t);
  for (const t of [H(10), H(15), H(20), H(2)]) assert.ok(Core.mealCrowd(t) < 0.3, 'quiet at ' + t);
  assert.strictEqual(Core.mealCrowd(1440 + H(12)), 1, 'day 2 lunch');
  assert.strictEqual(Core.npcGoal(H(9)), 'teach'); assert.strictEqual(Core.npcGoal(H(15)), 'teach');
  assert.strictEqual(Core.npcGoal(H(12)), 'canteen'); assert.strictEqual(Core.npcGoal(H(18)), 'canteen');
  assert.strictEqual(Core.npcGoal(H(23)), 'dorm'); assert.strictEqual(Core.npcGoal(H(3)), 'dorm');
  assert.ok(Core.outdoorShare(H(1)) < 0.2 && Core.outdoorShare(H(10)) === 1);
  assert.ok(Core.litFraction('dorm', H(21)) > Core.litFraction('dorm', H(10)) + 0.4, 'dorm windows light up in the evening');
  assert.ok(Core.litFraction('teach', H(3)) < 0.1);
});
test('quests: each completes only in the right place / action, once', () => {
  const q = Core.questsNew();
  assert.deepStrictEqual(Core.questCheck(q, { mode: 'in', key: 'classroom', name: '9号楼', x: 20, y: 6 }, 1), []);
  assert.deepStrictEqual(Core.questCheck(q, { mode: 'in', key: 'classroom', name: '12号楼 · 鸿学楼', x: 20, y: 6, action: 'quiz' }, 500), ['class']);
  assert.deepStrictEqual(Core.questCheck(q, { mode: 'in', key: 'classroom', name: '12号楼 · 鸿学楼', x: 20, y: 6, action: 'quiz' }, 501), [], 'only once');
  assert.deepStrictEqual(Core.questCheck(q, { mode: 'in', key: 'canteen', name: '文瀛食堂', action: 'eat', dish: '刀削面' }, 2), []);
  assert.deepStrictEqual(Core.questCheck(q, { mode: 'in', key: 'canteen', name: '食味坊', action: 'eat', dish: '麻辣烫' }, 2), []);
  assert.deepStrictEqual(Core.questCheck(q, { mode: 'in', key: 'canteen', name: '食味坊', action: 'eat', dish: '刀削面' }, 720), ['noodle']);
  assert.deepStrictEqual(Core.questCheck(q, { mode: 'out', x: Core.SUMMIT.x + 30, y: Core.SUMMIT.y }, 3), []);
  assert.deepStrictEqual(Core.questCheck(q, { mode: 'out', x: Core.SUMMIT.x + 1, y: Core.SUMMIT.y }, 800), ['hill']);
  assert.deepStrictEqual(Core.questCheck(q, { mode: 'in', key: 'library2', action: 'borrow' }, 900), ['stacks']);
  assert.strictEqual(Object.keys(q.done).length, Core.QUESTS.length); assert.strictEqual(q.done.class, 500);
});
test('quests: the 二龙山 summit is on the hill and reachable from spawn; the 12号楼 room and 刀削面 counter exist', () => {
  const { M, cls } = loadMap(), cg = Core.buildCollision(cls, M.meta, M.trees, M.buildings.map(b => b.poly));
  const seen = flood(cg, M.spawn[0], M.spawn[1]); let hit = 0;
  for (let y = Core.SUMMIT.y - 4; y <= Core.SUMMIT.y + 4; y += 0.5) for (let x = Core.SUMMIT.x - 4; x <= Core.SUMMIT.x + 4; x += 0.5) if (seen[Math.floor(y * cg.sub) * cg.gw + Math.floor(x * cg.sub)]) hit++;
  assert.ok(hit > 10, 'summit reachable cells: ' + hit);
  assert.ok(M.buildings.some(b => /12号楼/.test(b.name) && b.enter === 'classroom'));
  assert.ok(M.buildings.some(b => /文瀛食堂/.test(b.name) && b.enter === 'canteen'));
  const can = globalThis.Interiors.DEFS.canteen; assert.strictEqual(can.map[5][26], 'C'); assert.strictEqual(can.map[6][26], '.');
});
test('save: round-trips and rejects garbage', () => {
  const st = { x: 480.5, y: 270.25, minutes: 1440 + 600, zoom: 0.5, muted: true, quests: { done: { hill: 30, bogus: 1 } }, inside: { key: 'library2', from: 'w543817503', x: 12, y: 9 }, savedAt: 1 };
  const meta = { w: 755, h: 514 }, back = Core.saveParse(Core.saveSerialize(st), meta);
  assert.strictEqual(back.x, 480.5); assert.strictEqual(back.minutes, 2040); assert.strictEqual(back.zoom, 0.5); assert.strictEqual(back.muted, true);
  assert.deepStrictEqual(back.quests.done, { hill: 30 }); assert.deepStrictEqual(back.inside, { key: 'library2', from: 'w543817503', x: 12, y: 9 });
  for (const bad of [null, '', '{', '[]', '{"v":2,"x":1,"y":1,"minutes":0}', JSON.stringify({ v: Core.SAVE_VERSION, x: 'a', y: 1, minutes: 0 }), JSON.stringify({ v: Core.SAVE_VERSION, x: 9999, y: 1, minutes: 0 }), JSON.stringify({ v: Core.SAVE_VERSION, x: 1, y: 1, minutes: -5 })])
    assert.strictEqual(Core.saveParse(bad, meta), null, String(bad));
  assert.strictEqual(Core.saveParse(JSON.stringify({ v: Core.SAVE_VERSION, x: 1, y: 1, minutes: 0, zoom: 7 }), meta).zoom, 2);
});
test('zoom steps through 0.25× … 4×', () => {
  assert.strictEqual(Core.zoomStep(1, -1), 0.5); assert.strictEqual(Core.zoomStep(0.5, -1), 0.25); assert.strictEqual(Core.zoomStep(0.25, -1), 0.25);
  assert.strictEqual(Core.zoomStep(2, 1), 3); assert.strictEqual(Core.zoomStep(4, 1), 4);
});
test('图书馆 stairs link 1F and the 2F stacks both ways', () => {
  const D = globalThis.Interiors.DEFS;
  assert.strictEqual(D.library.up, 'library2'); assert.strictEqual(D.library2.down, 'library');
  for (const [k, ch] of [['library', 'U'], ['library2', 'V']]) {
    const a = Core.stairArrival(D[k], ch), cg = Core.interiorGrid(D[k]); assert.ok(a, k);
    assert.ok(!Core.rectBlocked(cg, a.x - 0.3, a.y - 0.35, a.x + 0.3, a.y), k + ' arrival blocked');
    const seen = flood(cg, a.x, a.y - 0.2), t = Core.findChar(D[k], ch)[0];
    assert.ok(seen[Math.floor((t[1] + 0.5) * cg.sub) * cg.gw + Math.floor((t[0] + 0.5) * cg.sub)], k + ' stairs unreachable');
  }
  const d2 = D.library2, cg = Core.interiorGrid(d2), a = Core.stairArrival(d2, 'V'), seen = flood(cg, a.x, a.y - 0.2);
  assert.ok(seen[Math.floor(9.5 * cg.sub) * cg.gw + Math.floor(23.5 * cg.sub)] || seen[Math.floor(11.5 * cg.sub) * cg.gw + Math.floor(23.5 * cg.sub)], 'borrow desk reachable');
});
test('lamps: more of them, the 主楼 plaza is lit, none block a door', () => {
  const { M, cls } = loadMap(), L = Core.placeLamps(cls, M.meta, M.buildings);
  assert.ok(L.length > 600, 'lamps ' + L.length);
  const main = M.buildings.find(b => b.special === 'main'), [dx, dy] = main.door;
  assert.ok(L.filter(l => Math.abs(l.x - dx) < 30 && l.y > dy && l.y < dy + 45).length >= 10, '主楼 plaza lamps');
  for (const b of M.buildings) if (b.enter) for (const l of L) assert.ok(Math.hypot(l.x - b.door[0], l.y - b.door[1]) >= 3.4, b.name + ' door blocked by a lamp');
});
test('lamps (which are solid) never cut off an enterable door from spawn', () => {
  const { M, cls } = loadMap(), L = Core.placeLamps(cls, M.meta, M.buildings);
  const cg = Core.buildCollision(cls, M.meta, M.trees, L.map(l => [l.x - 0.12, l.y - 0.15, l.x + 0.12, l.y])), seen = flood(cg, M.spawn[0], M.spawn[1]);
  for (const b of M.buildings.filter(b => b.enter)) {
    let ok = false;
    for (let dy = 0; dy <= 6 && !ok; dy++) for (let dx = -4; dx <= 4 && !ok; dx++) if (seen[(Math.floor(b.door[1] * 4) + dy) * cg.gw + Math.floor(b.door[0] * 4) + dx]) ok = true;
    assert.ok(ok, 'door unreachable with lamps: ' + b.name);
  }
});

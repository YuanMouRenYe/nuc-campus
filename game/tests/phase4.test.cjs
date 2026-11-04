const test = require('node:test'), assert = require('node:assert');
const Core = require('../js/core.js'); require('../js/interiors.js'); require('../js/legacy_art.js');
const { loadMap, flood } = require('./helpers.cjs');
const H = h => h * 60;

test('far zoom: people north of a building draw before it (hidden by its roof), people south after', () => {
  const b = { y: 100, sp: {} }, north = { y: 96, ch: {} }, south = { y: 101, ch: {} }, edge = { y: 100, ch: {} };
  const o = Core.farSort([south, b, north, edge]);
  assert.deepStrictEqual(o, [north, b, edge, south]);
});
test('seasons: by real month (Nov = autumn), weather is deterministic per day and plausible', () => {
  assert.strictEqual(Core.seasonOf(10), 'autumn', 'November'); assert.strictEqual(Core.seasonOf(0), 'winter'); assert.strictEqual(Core.seasonOf(11), 'winter');
  assert.strictEqual(Core.seasonOf(3), 'spring'); assert.strictEqual(Core.seasonOf(6), 'summer'); assert.strictEqual(Core.seasonOf(8), 'autumn');
  for (const s of Core.SEASONS) { const w = []; for (let d = 1; d <= 200; d++) { const a = Core.weatherFor(s, d); assert.strictEqual(a, Core.weatherFor(s, d)); w.push(a); }
    const wet = w.filter(x => x !== 'clear').length / w.length; assert.ok(wet > 0.08 && wet < 0.5, s + ' wet share ' + wet);
    assert.ok(s === 'winter' ? !w.includes('rain') : !w.includes('snow'), s); }
  assert.strictEqual(Core.cycle(Core.SEASONS, 'winter'), 'spring'); assert.strictEqual(Core.cycle(Core.WEATHERS, 'clear'), 'rain');
});
test('save keeps season / weather overrides and drops bad ones', () => {
  const st = { x: 10, y: 10, minutes: 500, zoom: 2, season: 'winter', weather: 'snow', quests: { done: {} } };
  const back = Core.saveParse(Core.saveSerialize(st)); assert.strictEqual(back.season, 'winter'); assert.strictEqual(back.weather, 'snow');
  const bad = JSON.parse(Core.saveSerialize(st)); bad.season = 'monsoon'; bad.weather = 42;
  const b2 = Core.saveParse(JSON.stringify(bad)); assert.strictEqual(b2.season, null); assert.strictEqual(b2.weather, null);
});

test('pinchStep: spread ratio to zoom step', () => {
  const Core = require('../js/core.js');
  assert.equal(Core.pinchStep(100, 140), 1);
  assert.equal(Core.pinchStep(100, 70), -1);
  assert.equal(Core.pinchStep(100, 110), 0);
  assert.equal(Core.pinchStep(0, 50), 0);
});

test('食堂 stairs link 1F and the 2F 小炒 floor; arrivals walkable and not on the exit', () => {
  const D = globalThis.Interiors.DEFS;
  assert.equal(D.canteen.up, 'canteen2'); assert.equal(D.canteen2.down, 'canteen');
  for (const [k, ch] of [['canteen', 'U'], ['canteen2', 'V']]) {
    const a = Core.stairArrival(D[k], ch), cg = Core.interiorGrid(D[k]);
    assert.ok(!Core.rectBlocked(cg, a.x - 0.3, a.y - 0.35, a.x + 0.3, a.y), k + ' arrival blocked');
    const doors = Core.findChar(D[k], 'D'); if (doors.length) assert.ok(a.y < doors[0][1] - 0.45, k + ' arrival would trigger the exit');
    const seen = flood(cg, a.x, a.y - 0.2), t = Core.findChar(D[k], ch)[0];
    assert.ok(seen[Math.floor((t[1] + 0.5) * cg.sub) * cg.gw + Math.floor((t[0] + 0.5) * cg.sub)], k + ' stairs unreachable');
    assert.ok(seen[Math.floor(6.5 * cg.sub) * cg.gw + Math.floor(3.5 * cg.sub)] && seen[Math.floor(6.5 * cg.sub) * cg.gw + Math.floor(26.5 * cg.sub)], k + ' counters reachable');
  }
  assert.equal(D.canteen.map[5][26], 'C'); assert.equal(D.canteen2.map[5][3], 'C');
});
test('宿舍熄灯 at 23:00, lights back at 06:30', () => {
  assert.equal(Core.dormDark(H(22)), 0); assert.ok(Core.dormDark(H(23) - 2) > 0 && Core.dormDark(H(23) - 2) < 1);
  assert.equal(Core.dormDark(H(23)), 1); assert.equal(Core.dormDark(1440 + H(3)), 1); assert.equal(Core.dormDark(H(6.5)), 0);
  assert.ok(Core.litFraction('dorm', H(23) + 10) < Core.litFraction('dorm', H(22)));
});

test('day-varying quests: day 1 classic four, later days class + 3 distinct; roll logs 第 N 天', () => {
  assert.deepEqual(Core.questsForDay(0).map(q => q.id), Core.QUESTS.map(q => q.id));
  const seen = new Set();
  for (let d = 1; d < 30; d++) { const l = Core.questsForDay(d); assert.equal(l.length, 4); assert.equal(l[0].id, 'class'); assert.equal(new Set(l.map(q => q.id)).size, 4); seen.add(l.map(q => q.id).join()); }
  assert.ok(seen.size > 5, 'days vary');
  const q = Core.questsNew(); assert.equal(Core.questsRoll(q, 0), null); assert.equal(q.day, 0);
  Core.questCheck(q, { mode: 'out', x: Core.SUMMIT.x, y: Core.SUMMIT.y }, 600, Core.questsForDay(0));
  const e = Core.questsRoll(q, 1); assert.deepEqual(e, { d: 1, n: 1, t: 4, ids: ['hill'] }); assert.deepEqual(q.done, {}); assert.equal(Core.questsRoll(q, 1), null);
  // a quest not on today's list does not tick
  const today = Core.questsForDay(1), off = Core.QUEST_POOL.find(t => !today.some(x => x.id === t.id));
  const ctxFor = { hill: { mode: 'out', x: Core.SUMMIT.x, y: Core.SUMMIT.y }, statue: { mode: 'out', x: Core.STATUE.x, y: Core.STATUE.y }, gym: { mode: 'in', key: 'gym' }, history: { mode: 'in', key: 'main2' } };
  if (ctxFor[off.id]) assert.deepEqual(Core.questCheck(q, ctxFor[off.id], 1500, today), []);
  // curfew only 21:00–23:00
  const c = Core.questsNew(); assert.deepEqual(Core.questCheck(c, { mode: 'in', key: 'dorm' }, H(20)), []); assert.deepEqual(Core.questCheck(c, { mode: 'in', key: 'dorm' }, 1440 + H(22)), ['curfew']);
  // save round-trip keeps day + log
  const p = Core.saveParse(Core.saveSerialize({ x: 1, y: 1, minutes: 2000, zoom: 2, quests: q }));
  assert.equal(p.quests.day, 1); assert.deepEqual(p.quests.log, [e]);
});
test('302 高数 quiz: 3 valid questions per day, class only completes via quiz', () => {
  for (let d = 0; d < 10; d++) { const z = Core.quizForDay(d); assert.equal(z.length, 3); assert.equal(new Set(z).size, 3); for (const x of z) { assert.equal(x.o.length, 4); assert.ok(x.a >= 0 && x.a < 4); } }
  const q = Core.questsNew(), ctx = { mode: 'in', key: 'classroom', name: '12号楼 · 鸿学楼', x: 20, y: 6 };
  assert.ok(Core.inClassSeat(ctx)); assert.ok(!Core.inClassSeat({ ...ctx, name: '9号楼' }));
  assert.deepEqual(Core.questCheck(q, ctx, 500), []); assert.deepEqual(Core.questCheck(q, { ...ctx, action: 'quiz' }, 500), ['class']);
});

test('作息: 冬令时 afternoon 14:00, 夏令时 14:30 (5月6日–10月8日)', () => {
  assert.equal(Core.bellSchedule(11, 1), 'winter'); assert.equal(Core.bellSchedule(10, 8), 'summer'); assert.equal(Core.bellSchedule(10, 9), 'winter');
  assert.equal(Core.bellSchedule(5, 5), 'winter'); assert.equal(Core.bellSchedule(5, 6), 'summer');
  assert.deepEqual(Core.bellsBetween(H(13.9), H(14)).map(b => b.kind), ['上课']); assert.equal(Core.bellsBetween(H(13.9), H(14), 'summer').length, 0);
  assert.deepEqual(Core.bellsBetween(H(14.4), H(14.5), 'summer').map(b => b.kind), ['上课']);
  assert.deepEqual(Core.bellsBetween(H(7.9), H(8), 'summer').map(b => b.kind), ['上课'], 'mornings unchanged');
});

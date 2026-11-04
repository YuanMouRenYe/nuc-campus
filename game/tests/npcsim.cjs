// v7.6.4: headless replica of the outdoor NPC placement (old v7.6.3 rule vs the new Core.npcPlan) for tests + heatmaps
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), C = Core.C, gw = M.meta.w * 4;
const col = Core.buildCollision(cls, M.meta, [], Core.fenceRects(M.fences).concat(Core.wallRects(M.walls)), null);
const at = (x, y) => cls[Math.floor(y * 4) * gw + Math.floor(x * 4)];
function spotNear(x, y, r0, r1, rnd) {
  for (let k = 0; k < 60; k++) { const a = rnd() * 6.283, r = r0 + rnd() * (r1 - r0), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    const c = at(px, py); if (Core.PAVED.has(c) && c !== C.ROAD && !Core.rectBlocked(col, px - 0.3, py - 0.35, px + 0.3, py)) return [px, py]; }
  return null;
}
let pool = null;
function wanderSpot(rnd) {
  if (!pool) { pool = []; const r = Core.mulberry(31), ok = new Set([C.ROAD, C.PLAZA, C.PATH, C.APRON]);
    for (let k = 0; k < 40000 && pool.length < 900; k++) { const x = 4 + r() * (M.meta.w - 8), y = 4 + r() * (M.meta.h - 8), c = at(x, y);
      if (ok.has(c) && !Core.rectBlocked(col, x - 0.3, y - 0.35, x + 0.3, y) && !M.buildings.some(b => b.door && Math.hypot(b.door[0] - x, b.door[1] - y) < 6)) pool.push([x, y]); } }
  return pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
}
function makeNPCs() { const rnd = Core.mulberry(7), out = []; let tries = 0;
  while (out.length < 90 && tries++ < 20000) { const x = 120 + rnd() * 620, y = 150 + rnd() * 340, c = at(x, y);
    if (!(c === C.PATH || c === C.PLAZA || c === C.APRON || c === C.TRACK || c === C.COURT)) continue; if (Core.rectBlocked(col, x - 0.3, y - 0.3, x + 0.3, y)) continue;
    out.push({ x, y, r0: rnd(), r1: rnd(), r2: rnd(), rnd: Core.mulberry(out.length + 99) }); }
  return out; }
function oldPlace(minutes) { // the v7.6.3 rule: nearest 3 doors of the goal kind, respawn 2..14 tiles from that door
  const npcs = makeNPCs(), goal = Core.npcGoal(minutes), share = Core.outdoorShare(minutes);
  const hideP = goal === 'dorm' ? 1 - share : goal === 'teach' ? 0.3 : goal === 'canteen' ? 0.25 : 0.3;
  for (const n of npcs) { const kind = goal === 'library' ? (n.r0 < 0.45 ? 'library' : 'teach') : goal;
    const list = M.buildings.filter(b => b.door && Core.npcKind(b) === kind).map(b => [b, Math.hypot(b.door[0] - n.x, b.door[1] - n.y)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    if (!list.length) continue; const b = list[Math.floor(n.r1 * list.length)][0]; n.b = b; n.willHide = n.r2 < hideP;
    const sp = spotNear(b.door[0], b.door[1] + 1.2, 2, 14, n.rnd); if (sp) { n.x = sp[0]; n.y = sp[1]; } n.hidden = n.willHide && n.rnd() < 0.75; }
  return npcs.map(n => ({ x: n.x, y: n.y, hidden: n.hidden, b: n.b }));
}
function newPlace(minutes) {
  const rnd = Core.mulberry(Math.floor(minutes / 30) + 17), goal = Core.npcGoal(minutes), share = Core.outdoorShare(minutes);
  return Core.npcPlan({ n: 90, goal, share, buildings: M.buildings, rnd, spotNear: (x, y, a, b) => spotNear(x, y, a, b, rnd), wanderSpot: () => wanderSpot(rnd) })
    .map(e => ({ x: e.pos[0], y: e.pos[1], hidden: e.hidden, b: e.tgt.b, wander: !!e.wander }));
}
const doors = M.buildings.filter(b => b.door).map(b => b.door);
function doorShare(list, r) { const vis = list.filter(p => !p.hidden); return vis.filter(p => doors.some(d => Math.hypot(d[0] - p.x, d[1] + 1.2 - p.y) < r)).length / Math.max(1, vis.length); }
module.exports = { M, Core, oldPlace, newPlace, doorShare };

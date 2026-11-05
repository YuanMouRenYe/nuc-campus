// v7.7 纯逻辑：成就、共享电动车（停车点 / 骑行规则）、虚拟摇杆。无 DOM，node 测试可直接 require。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.V77Core = factory(root.Core);
})(typeof self !== 'undefined' ? self : this, function (Core) {
  'use strict';
  const C = Core.C;
  // ---------- 共享电动车 ----------
  // 中北大学 2024-08 校园共享电动自行车服务商成交公告（kjy.nuc.edu.cn/info/1029/2781.htm）：杭州小潮出行科技有限公司。
  // 公告只说“按学校统一规划划设停放车位”，没有公开停车点清单 —— 下面的停车点是按真实地标（校门 / 宿舍 / 教学楼 / 食堂）
  // 旁边的铺装空地自动选的（tools/stations_v77.cjs），全部标“未核实”（v: false）。校规：校内电动自行车限速 20 km/h。
  const STATIONS = [{"id":"s0","name":"一道门停车点","k":"gate","x":243,"y":490,"v":false},{"id":"s1","name":"二道门停车点","k":"gate","x":277,"y":362,"v":false},{"id":"s2","name":"三道门停车点","k":"gate","x":354,"y":347.5,"v":false},{"id":"s3","name":"四道门停车点","k":"gate","x":487.5,"y":320,"v":false},{"id":"s4","name":"六道门停车点","k":"gate","x":616,"y":292,"v":false},{"id":"s5","name":"北门停车点","k":"gate","x":708,"y":52,"v":false},{"id":"s6","name":"图书馆停车点","k":"teach","x":427.5,"y":236,"v":false},{"id":"s7","name":"12号楼 · 鸿学楼停车点","k":"teach","x":388,"y":239,"v":false},{"id":"s8","name":"14号教学楼停车点","k":"teach","x":594,"y":229.5,"v":false},{"id":"s9","name":"德怀楼停车点","k":"teach","x":257,"y":443,"v":false},{"id":"s10","name":"文瀛食堂停车点","k":"canteen","x":307.5,"y":283,"v":false},{"id":"s11","name":"食味坊停车点","k":"canteen","x":308.5,"y":306,"v":false},{"id":"s12","name":"龙山餐厅停车点","k":"canteen","x":660,"y":146,"v":false},{"id":"s13","name":"田园餐厅停车点","k":"canteen","x":715.5,"y":296,"v":false},{"id":"s14","name":"文瀛苑宿舍停车点","k":"dorm","x":271,"y":300,"v":false},{"id":"s15","name":"文韬苑宿舍停车点","k":"dorm","x":659.5,"y":200,"v":false}];
  const RIDE = new Set([C.ROAD, C.PATH, C.PLAZA, C.APRON, C.PARKING]); // 只能在路上骑：不含台阶 STEPS、草地、室内
  const BIKE_SPEED = 10, STATION_R = 2.6;
  function rideOK(ground, meta, x, y) { const s = meta.sub, gw = meta.w * s; for (const [dx, dy] of [[0, 0], [-0.3, 0], [0.3, 0], [0, -0.3]]) {
    const X = Math.floor((x + dx) * s), Y = Math.floor((y + dy) * s); if (X < 0 || Y < 0 || X >= gw || Y >= meta.h * s || !RIDE.has(ground[Y * gw + X])) return false; } return true; }
  function nearStation(x, y, r) { let best = null, bd = r || STATION_R; for (const s of STATIONS) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } } return best; }
  // 骑车移动：先按普通碰撞滑动，再拒绝驶出道路的那一轴（像撞到路缘一样停住）
  function rideMove(cg, ground, meta, pos, dx, dy) { let { x, y } = pos;
    const okAt = (nx, ny) => !Core.rectBlocked(cg, nx - 0.3, ny - 0.35, nx + 0.3, ny) && rideOK(ground, meta, nx, ny);
    if (dx && okAt(x + dx, y)) x += dx; if (dy && okAt(x, y + dy)) y += dy; return { x, y }; }
  // ---------- 成就 ----------
  const ERLONG_CP = [ { id: 'cp_gate', name: '二龙山 · 公园大门', x: 199, y: 250.2, r: 5 }, { id: 'cp_yiren', name: '怡人台 · 凉亭', x: 149.4, y: 221.8, r: 5 }, { id: 'cp_stele', name: '世纪碑', x: 150.6, y: 194.6, r: 5 } ];
  const ACH = [
    { id: 'cp_gate', icon: '⛰', name: '山门打卡', desc: '走到二龙山公园大门', cp: true },
    { id: 'cp_yiren', icon: '⛩', name: '怡人台小憩', desc: '爬到半山腰的怡人台凉亭', cp: true },
    { id: 'cp_stele', icon: '🗿', name: '世纪碑前', desc: '经过山上的世纪碑', cp: true },
    { id: 'summit', icon: '🏔', name: '登顶二龙山', desc: '爬上二龙山山顶长廊' },
    { id: 'erlong_all', icon: '🎖', name: '二龙山全程', desc: '三个打卡点 + 山顶全部到过' },
    { id: 'ride_first', icon: '🛵', name: '第一次扫码', desc: '骑上一辆共享电动车' },
    { id: 'ride_park', icon: '🅿', name: '规范停车', desc: '把电动车还到停车点的划线里' },
    { id: 'ride_tour', icon: '🗺', name: '校园骑行家', desc: '骑车到过 5 个不同的停车点' },
  ];
  const ACH_KEY = 'nuc-campus-ach-v1';
  function achNew() { return { got: {}, stations: [] }; }
  function achParse(s) { try { const o = JSON.parse(s); if (o && typeof o.got === 'object') return { got: o.got, stations: Array.isArray(o.stations) ? o.stations : [] }; } catch (e) { } return achNew(); }
  // ctx = { mode, x, y, riding, parkedAt?: stationId, rodeAt?: stationId, now }；返回新解锁的成就 id 列表（按顺序）
  function achCheck(a, ctx) { const out = [], give = id => { if (!a.got[id]) { a.got[id] = ctx.now || Date.now(); out.push(id); } };
    if (ctx.mode === 'out') { for (const c of ERLONG_CP) if (Math.hypot(ctx.x - c.x, ctx.y - c.y) < c.r) give(c.id);
      if (Math.hypot(ctx.x - Core.SUMMIT.x, ctx.y - Core.SUMMIT.y) < Core.SUMMIT.r) give('summit'); }
    if (ERLONG_CP.every(c => a.got[c.id]) && a.got.summit) give('erlong_all');
    if (ctx.riding) give('ride_first');
    if (ctx.parkedAt) give('ride_park');
    for (const sid of [ctx.parkedAt, ctx.rodeAt]) if (sid && !a.stations.includes(sid)) a.stations.push(sid);
    if (a.stations.length >= 5) give('ride_tour');
    return out; }
  // ---------- 虚拟摇杆 ----------
  function stickVector(dx, dy, radius, dead) { const L = Math.hypot(dx, dy), R = radius || 56; if (L < (dead == null ? 8 : dead)) return null; const k = Math.min(1, L / R); return { x: dx / L * k, y: dy / L * k, mag: k }; }
  return { STATIONS, RIDE, BIKE_SPEED, STATION_R, rideOK, nearStation, rideMove, ERLONG_CP, ACH, ACH_KEY, achNew, achParse, achCheck, stickVector };
});

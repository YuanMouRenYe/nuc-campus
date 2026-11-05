// v7.7 地图编辑器：纯逻辑（无 DOM），浏览器与 node 测试共用。
// 数据模型：ground = Uint8Array（每 ¼ 格一个地类编号，与 data/ground.png 的 R 通道一致），
// terr = RGBA 字节（与 data/terrain.png 一致：R = 层级 + 1，G = 坡道位置，B = 下坡方向 1..8），map = data/map.json 对象。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.MapEdit = factory(root.Core);
})(typeof self !== 'undefined' ? self : this, function (Core) {
  'use strict';
  const C = Core.C;
  const KEY = 'nuc-campus-mapedit-v1', FORMAT = 'nuc-campus-map-edit', VERSION = 1;
  // 方向编号（Core.RAMP_DIRS 下标 + 1，表示“下坡方向”）：1 东 3 南 5 西 7 北
  const DIR = { E: 1, S: 3, W: 5, N: 7 };
  // 参考地块（调色板）：cls = 地类；stair = 台阶朝向（'ns' 南北走向 / 'ew' 东西走向）+ 下坡方向；ramp = 坡道下坡方向；level = 同时设定层级
  const PALETTE = [
    { id: 'road', label: '道路（统一路色）', cls: C.ROAD, group: '路' },
    { id: 'path', label: '小径（统一路色）', cls: C.PATH, group: '路' },
    { id: 'plaza', label: '广场铺装', cls: C.PLAZA, group: '路' },
    { id: 'parking', label: '停车场', cls: C.PARKING, group: '路' },
    { id: 'door', label: '门前地砖（门口）', cls: C.APRON, group: '门' },
    { id: 'stairN', label: '台阶 ↑ 向北上行', cls: C.STEPS, stair: 'ns', dir: DIR.S, group: '台阶' },
    { id: 'stairS', label: '台阶 ↓ 向南上行', cls: C.STEPS, stair: 'ns', dir: DIR.N, group: '台阶' },
    { id: 'stairE', label: '台阶 → 向东上行', cls: C.STEPS, stair: 'ew', dir: DIR.W, group: '台阶' },
    { id: 'stairW', label: '台阶 ← 向西上行', cls: C.STEPS, stair: 'ew', dir: DIR.E, group: '台阶' },
    { id: 'rampN', label: '坡道 ↑ 向北上坡', cls: null, ramp: DIR.S, group: '坡道' },
    { id: 'rampS', label: '坡道 ↓ 向南上坡', cls: null, ramp: DIR.N, group: '坡道' },
    { id: 'rampE', label: '坡道 → 向东上坡', cls: null, ramp: DIR.W, group: '坡道' },
    { id: 'rampW', label: '坡道 ← 向西上坡', cls: null, ramp: DIR.E, group: '坡道' },
    { id: 'rampX', label: '清除坡道', cls: null, ramp: 0, group: '坡道' },
    { id: 'grass', label: '草地（当前层级）', cls: C.GRASS, level: true, group: '草地' },
    { id: 'hill', label: '山地草坡（当前层级）', cls: C.HILL, level: true, group: '草地' },
    { id: 'flowers', label: '花坛 / 路缘绿带', cls: C.FLOWERS, group: '边沿' },
    { id: 'terrace', label: '台地挡墙（不可通行）', cls: C.TERRACE, group: '边沿' },
    { id: 'cliff', label: '陡坎 / 路缘高差（不可通行）', cls: C.CLIFF, group: '边沿' },
    { id: 'water', label: '水面', cls: C.WATER, group: '其他' },
    { id: 'wood', label: '树林地面', cls: C.WOOD, group: '其他' },
    { id: 'bare', label: '裸地', cls: C.BARE, group: '其他' },
    { id: 'building', label: '建筑基底（碰撞）', cls: C.BUILDING, group: '其他' },
  ];
  const CLASS_ZH = { OUT: '校外', GRASS: '草地', WOOD: '树林', HILL: '山坡', ROAD: '道路', PATH: '小径', PLAZA: '广场', WATER: '水面', PITCH: '球场', TRACK: '跑道', COURT: '球场（硬地）', PARKING: '停车场', RAIL: '铁路',
    BARE: '裸地', VILLAGE: '村庄', APRON: '门前地砖', FLOWERS: '花坛', CLIFF: '陡坎', BUILDING: '建筑基底', STEPS: '台阶', SAND: '沙地', DEEPWOOD: '密林', TERRACE: '台地挡墙' };

  // ---------- 几何：画笔 / 直线 / 矩形覆盖的 ¼ 格 ----------
  function brushCells(sx, sy, size, gw, gh) { // size = 边长（¼ 格），以 (sx,sy) 为中心的方块
    const out = [], h = Math.floor(size / 2);
    for (let y = sy - h; y < sy - h + size; y++) for (let x = sx - h; x < sx - h + size; x++) if (x >= 0 && y >= 0 && x < gw && y < gh) out.push(y * gw + x);
    return out;
  }
  function lineCells(x0, y0, x1, y1, size, gw, gh) { // Bresenham + 方形笔刷（直路用）
    const set = new Set(); let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, x = x0, y = y0;
    for (let n = 0; n < 100000; n++) { for (const i of brushCells(x, y, size, gw, gh)) set.add(i); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x += sx; } if (e2 <= dx) { err += dx; y += sy; } }
    return [...set];
  }
  // 直线工具：按住 Shift 时吸附到水平 / 竖直 / 45°
  function snapLine(x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, a = Math.atan2(dy, dx), k = Math.round(a / (Math.PI / 4)) * (Math.PI / 4), L = Math.max(Math.abs(dx), Math.abs(dy));
    const ux = Math.round(Math.cos(k)), uy = Math.round(Math.sin(k)); return [x0 + ux * L, y0 + uy * L]; }
  function rectCells(x0, y0, x1, y1, gw, gh) { const out = [], ax = Math.max(0, Math.min(x0, x1)), bx = Math.min(gw - 1, Math.max(x0, x1)), ay = Math.max(0, Math.min(y0, y1)), by = Math.min(gh - 1, Math.max(y0, y1));
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) out.push(y * gw + x); return out; }

  // ---------- 编辑状态 + 撤销 / 重做 ----------
  // st = { ground, terr, map, gw, gh, sub, undo: [], redo: [] }；每一步 = { g: [i, old, new...], t: [i*4+ch, old, new...], m: [beforeJSON, afterJSON] | null, label }
  function makeState(map, ground, terr) { const sub = map.meta.sub; return { map, ground, terr, sub, gw: map.meta.w * sub, gh: map.meta.h * sub, undo: [], redo: [], dirty: null, cur: null }; }
  function begin(st, label) { st.cur = { label, g: [], t: [], gs: new Set(), ts: new Set(), m: null }; }
  function touch(st, i) { const s = st.sub, x = i % st.gw, y = (i / st.gw) | 0; const d = st.dirty || (st.dirty = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 });
    if (x < d.x0) d.x0 = x; if (y < d.y0) d.y0 = y; if (x > d.x1) d.x1 = x; if (y > d.y1) d.y1 = y; void s; }
  function setG(st, i, v) { const o = st.ground[i]; if (o === v) return; if (!st.cur.gs.has(i)) { st.cur.gs.add(i); st.cur.g.push(i, o, v); } else { const g = st.cur.g; for (let k = g.length - 3; k >= 0; k -= 3) if (g[k] === i) { g[k + 2] = v; break; } } st.ground[i] = v; touch(st, i); }
  function setT(st, i, ch, v) { if (!st.terr) return; const j = i * 4 + ch, o = st.terr[j]; v = Math.max(0, Math.min(255, v | 0)); if (o === v) return;
    if (!st.cur.ts.has(j)) { st.cur.ts.add(j); st.cur.t.push(j, o, v); } else { const t = st.cur.t; for (let k = t.length - 3; k >= 0; k -= 3) if (t[k] === j) { t[k + 2] = v; break; } } st.terr[j] = v; touch(st, i); }
  function mapEdit(st, fn) { const before = JSON.stringify(objPart(st.map)); fn(st.map); const after = JSON.stringify(objPart(st.map)); if (before !== after) st.cur.m = [before, after]; }
  function objPart(m) { return { buildings: m.buildings, trees: m.trees, ew: m.props && m.props.v764 && m.props.v764.ew_stairs, col: m.v77col || null }; }
  function setObjPart(m, j) { const o = JSON.parse(j); m.buildings = o.buildings; m.trees = o.trees; if (m.props && m.props.v764) m.props.v764.ew_stairs = o.ew; if (o.col) m.v77col = o.col; else delete m.v77col; }
  function commit(st) { const c = st.cur; st.cur = null; if (!c || (!c.g.length && !c.t.length && !c.m)) return false; delete c.gs; delete c.ts; st.undo.push(c); if (st.undo.length > 200) st.undo.shift(); st.redo.length = 0; return true; }
  function applyStep(st, s, dir) { // dir = -1 撤销 / +1 重做
    for (let k = 0; k < s.g.length; k += 3) { st.ground[s.g[k]] = dir < 0 ? s.g[k + 1] : s.g[k + 2]; touch(st, s.g[k]); }
    for (let k = 0; k < s.t.length; k += 3) { st.terr[s.t[k]] = dir < 0 ? s.t[k + 1] : s.t[k + 2]; touch(st, (s.t[k] / 4) | 0); }
    if (s.m) setObjPart(st.map, s.m[dir < 0 ? 0 : 1]);
  }
  function undo(st) { const s = st.undo.pop(); if (!s) return null; applyStep(st, s, -1); st.redo.push(s); return s; }
  function redo(st) { const s = st.redo.pop(); if (!s) return null; applyStep(st, s, 1); st.undo.push(s); return s; }

  // ---------- 绘制 ----------
  function ewList(map) { map.props = map.props || {}; map.props.v764 = map.props.v764 || {}; return (map.props.v764.ew_stairs = map.props.v764.ew_stairs || []); }
  // 东西走向台阶：game 端按 ew_stairs 矩形（格）判断；把画到的格子并入一个矩形列表（每次涂抹合并为外包矩形）
  function addEW(map, cells, gw, sub) { if (!cells.length) return; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const i of cells) { const x = i % gw, y = (i / gw) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    ewList(map).push([x0 / sub, y0 / sub, (x1 + 1) / sub, (y1 + 1) / sub].map(v => Math.round(v * 100) / 100)); }
  function removeEW(map, cells, gw, sub) { const L = ewList(map); if (!L.length || !cells.length) return; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (const i of cells) { const x = i % gw, y = (i / gw) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const r = [x0 / sub, y0 / sub, (x1 + 1) / sub, (y1 + 1) / sub]; map.props.v764.ew_stairs = L.filter(q => !(q[0] >= r[0] - 0.01 && q[1] >= r[1] - 0.01 && q[2] <= r[2] + 0.01 && q[3] <= r[3] + 0.01)); }
  // 用一个调色板地块涂抹一组格子。opt.level = 当前层级（草地按层级时写入 R = level + 1）
  // 坡道：G = 沿下坡方向从 1 到 255 的渐变（矩形 / 直线时按覆盖范围归一），B = 方向
  function paint(st, cells, pal, opt) {
    opt = opt || {}; if (!cells.length) return;
    if (pal.ramp != null) { const d = pal.ramp ? Core.RAMP_DIRS[pal.ramp - 1] : [0, 0]; let lo = 1e9, hi = -1e9; const proj = i => (i % st.gw) * d[0] + ((i / st.gw) | 0) * d[1];
      for (const i of cells) { const p = proj(i); lo = Math.min(lo, p); hi = Math.max(hi, p); }
      for (const i of cells) { if (!pal.ramp) { setT(st, i, 1, 0); setT(st, i, 2, st.terr ? st.terr[i * 4 + 2] & ~15 : 0); continue; }
        setT(st, i, 1, 1 + Math.round((proj(i) - lo) / Math.max(1, hi - lo) * 254)); setT(st, i, 2, ((st.terr ? st.terr[i * 4 + 2] : 0) & ~15) | pal.ramp); }
      return; }
    for (const i of cells) setG(st, i, pal.cls);
    if (pal.level && opt.level != null) for (const i of cells) setT(st, i, 0, opt.level + 1);
    if (pal.cls === C.STEPS) { for (const i of cells) setT(st, i, 2, ((st.terr ? st.terr[i * 4 + 2] : 0) & ~15) | pal.dir);
      mapEdit(st, m => { removeEW(m, cells, st.gw, st.sub); if (pal.stair === 'ew') addEW(m, cells, st.gw, st.sub); }); }
  }
  function raiseLevel(st, cells, delta) { for (const i of cells) setT(st, i, 0, Math.max(1, (st.terr[i * 4] || 1) + delta)); }
  function setLevel(st, cells, level) { for (const i of cells) setT(st, i, 0, level + 1); }
  function pick(st, i) { return { cls: st.ground[i], level: st.terr ? st.terr[i * 4] - 1 : 0, ramp: st.terr ? st.terr[i * 4 + 1] : 0, dir: st.terr ? st.terr[i * 4 + 2] & 15 : 0 }; }
  function erase(st, cells, base) { for (const i of cells) setG(st, i, base == null ? C.GRASS : base); for (const i of cells) { setT(st, i, 1, 0); } }
  // 台阶拉直：选区内的台阶格 → 取“主体”行列（覆盖率 ≥ 40%）组成一个规整矩形；矩形外多出的台阶改回 fill（默认小径）
  function straightenStairs(st, x0, y0, x1, y1, fill) {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1), gw = st.gw; const cols = {}, rows = {}; let n = 0, dirs = {};
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) { const i = y * gw + x; if (st.ground[i] !== C.STEPS) continue; n++; cols[x] = (cols[x] || 0) + 1; rows[y] = (rows[y] || 0) + 1; const d = st.terr ? st.terr[i * 4 + 2] & 15 : 0; dirs[d] = (dirs[d] || 0) + 1; }
    if (!n) return null; const cm = Math.max(...Object.values(cols)), rm = Math.max(...Object.values(rows));
    const cx = Object.keys(cols).map(Number).filter(x => cols[x] >= cm * 0.4), ry = Object.keys(rows).map(Number).filter(y => rows[y] >= rm * 0.4);
    const r = [Math.min(...cx), Math.min(...ry), Math.max(...cx), Math.max(...ry)], dir = +Object.keys(dirs).sort((a, b) => dirs[b] - dirs[a])[0] || 0;
    for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) { const i = y * gw + x, inside = x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
      if (inside) { setG(st, i, C.STEPS); if (dir) setT(st, i, 2, ((st.terr ? st.terr[i * 4 + 2] : 0) & ~15) | dir); } else if (st.ground[i] === C.STEPS) setG(st, i, fill == null ? C.PATH : fill); }
    return { rect: r, dir, cells: n };
  }

  // ---------- 碰撞开关（M.v77col = { block: [[x0,y0,x1,y1]...], open: [...] }，单位：格） ----------
  function toggleCollision(map, rect, block) { const c = map.v77col || (map.v77col = { block: [], open: [] }); const r = rect.map(v => Math.round(v * 100) / 100);
    const list = block ? c.block : c.open, other = block ? c.open : c.block; const same = q => Math.abs(q[0] - r[0]) < 0.01 && Math.abs(q[1] - r[1]) < 0.01 && Math.abs(q[2] - r[2]) < 0.01 && Math.abs(q[3] - r[3]) < 0.01;
    const k = list.findIndex(same); if (k >= 0) list.splice(k, 1); else list.push(r); const j = other.findIndex(same); if (j >= 0) other.splice(j, 1);
    if (!c.block.length && !c.open.length) delete map.v77col; }
  function applyCol(cg, map) { const c = map && map.v77col; if (!c) return cg; const s = cg.sub;
    const each = (r, v) => { for (let y = Math.max(0, Math.floor(r[1] * s)); y < Math.min(cg.gh, Math.ceil(r[3] * s)); y++) for (let x = Math.max(0, Math.floor(r[0] * s)); x < Math.min(cg.gw, Math.ceil(r[2] * s)); x++) cg.col[y * cg.gw + x] = v; };
    for (const r of c.open || []) each(r, 0); for (const r of c.block || []) each(r, 1); return cg; }

  // ---------- 建筑 / 门 ----------
  function bboxOf(poly) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1].map(v => Math.round(v * 100) / 100); }
  function polyCells(poly, gw, gh, sub) { const [x0, y0, x1, y1] = bboxOf(poly), out = [];
    for (let y = Math.max(0, Math.floor(y0 * sub)); y < Math.min(gh, Math.ceil(y1 * sub)); y++) for (let x = Math.max(0, Math.floor(x0 * sub)); x < Math.min(gw, Math.ceil(x1 * sub)); x++)
      if (Core.inPoly(poly, (x + 0.5) / sub, (y + 0.5) / sub)) out.push(y * gw + x); return out; }
  // 建筑基底 = 碰撞：移动 / 缩放时把旧基底改成 fill，再按新多边形盖章 BUILDING
  function restamp(st, oldPoly, newPoly, fill) { for (const i of polyCells(oldPoly, st.gw, st.gh, st.sub)) if (st.ground[i] === C.BUILDING) setG(st, i, fill == null ? C.PLAZA : fill);
    if (newPoly) for (const i of polyCells(newPoly, st.gw, st.gh, st.sub)) setG(st, i, C.BUILDING); }
  function moveBuilding(st, b, dx, dy, fill) { const old = b.poly.map(p => p.slice()); const r2 = v => Math.round(v * 100) / 100;
    mapEdit(st, () => { b.poly = b.poly.map(([x, y]) => [r2(x + dx), r2(y + dy)]); b.bbox = bboxOf(b.poly); if (b.door) b.door = [r2(b.door[0] + dx), r2(b.door[1] + dy)];
      if (b.axis != null) b.axis = r2(b.axis + dx); if (Array.isArray(b.found) && b.found.length >= 4) { b.found[2] = r2(b.found[2] + dx); b.found[3] = r2(b.found[3] + dx); } b.edited = 1; });
    restamp(st, old, b.poly, fill); }
  function resizeBuilding(st, b, nb, fill) { // nb = 新外包矩形 [x0,y0,x1,y1]：多边形按比例缩放，门保持在南边（相对位置不变）
    const ob = bboxOf(b.poly), old = b.poly.map(p => p.slice()), sx = (nb[2] - nb[0]) / Math.max(0.01, ob[2] - ob[0]), sy = (nb[3] - nb[1]) / Math.max(0.01, ob[3] - ob[1]), r2 = v => Math.round(v * 100) / 100;
    const f = ([x, y]) => [r2(nb[0] + (x - ob[0]) * sx), r2(nb[1] + (y - ob[1]) * sy)];
    mapEdit(st, () => { b.poly = b.poly.map(f); b.bbox = bboxOf(b.poly); if (b.door) b.door = f(b.door); if (b.axis != null) b.axis = r2(nb[0] + (b.axis - ob[0]) * sx);
      if (Array.isArray(b.found) && b.found.length >= 4) { b.found[2] = b.bbox[0]; b.found[3] = b.bbox[2]; } b.edited = 1; });
    restamp(st, old, b.poly, fill); }
  function deleteBuilding(st, b, fill) { const old = b.poly.map(p => p.slice()); mapEdit(st, m => { m.buildings = m.buildings.filter(q => q !== b); }); restamp(st, old, null, fill); }
  function moveDoor(st, b, x, y) { mapEdit(st, () => { b.door = [Math.round(x * 100) / 100, Math.round(y * 100) / 100]; b.edited = 1; }); }
  // ---------- 树（装饰层） ----------
  function addTree(st, x, y, kind) { mapEdit(st, m => { m.trees.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10, kind | 0]); }); }
  function removeTrees(st, x0, y0, x1, y1) { let n = 0; mapEdit(st, m => { const k = m.trees.length; m.trees = m.trees.filter(t => !(t[0] >= x0 && t[0] <= x1 && t[1] >= y0 && t[1] <= y1)); n = k - m.trees.length; }); return n; }

  // ---------- 导出前校验 ----------
  function distToPoly(poly, x, y) { let d = 1e9; for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length], vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L)); d = Math.min(d, Math.hypot(ax + vx * t - x, ay + vy * t - y)); } return d; }
  function collisionOf(map, ground) { const cg = Core.buildCollision(ground, map.meta, [], Core.fenceRects(map.fences).concat(Core.wallRects(map.walls)), null); return applyCol(cg, map); }
  function flood(cg, sx, sy) { const W = cg.gw, H = cg.gh, seen = new Uint8Array(W * H), q = new Int32Array(W * H); let h = 0, t = 0; const st = Math.floor(sy * cg.sub) * W + Math.floor(sx * cg.sub);
    if (st < 0 || st >= W * H || cg.col[st]) return seen; seen[st] = 1; q[t++] = st;
    while (h < t) { const i = q[h++], x = i % W; if (x > 0 && !seen[i - 1] && !cg.col[i - 1]) { seen[i - 1] = 1; q[t++] = i - 1; } if (x < W - 1 && !seen[i + 1] && !cg.col[i + 1]) { seen[i + 1] = 1; q[t++] = i + 1; }
      if (i >= W && !seen[i - W] && !cg.col[i - W]) { seen[i - W] = 1; q[t++] = i - W; } if (i + W < W * H && !seen[i + W] && !cg.col[i + W]) { seen[i + W] = 1; q[t++] = i + W; } }
    return seen; }
  // 返回 { errors, warnings, info, keys }；keys 用来和原始地图比对（只报“新增”的问题，原始数据已有的标注出来）
  function validate(map, ground, terr, opts) {
    opts = opts || {}; const sub = map.meta.sub, gw = map.meta.w * sub, gh = map.meta.h * sub, out = { errors: [], warnings: [], info: [] }, base = opts.baseline || null, keys = new Set();
    const add = (kind, key, text, at) => { keys.add(key); const old = base && base.has(key); (old ? out.info : out[kind]).push({ key, text: text + (old ? '（原始数据已有）' : ''), at }); };
    // 1) 台阶是否连接了不同层级：每段台阶（4 邻接连通块）及其一圈邻格应至少包含两个层级；否则只是平地上的装饰台阶
    if (terr) { const seen = new Uint8Array(gw * gh), q = [];
      for (let s = 0; s < gw * gh; s++) { if (ground[s] !== C.STEPS || seen[s]) continue; q.length = 0; q.push(s); seen[s] = 1; const lv = new Set(); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (let k = 0; k < q.length; k++) { const i = q[k], x = i % gw, y = (i / gw) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          for (const j of [i - 1, i + 1, i - gw, i + gw]) { if (j < 0 || j >= gw * gh) continue; if (terr[j * 4]) lv.add(terr[j * 4]); if (ground[j] === C.STEPS && !seen[j]) { seen[j] = 1; q.push(j); } } if (terr[i * 4]) lv.add(terr[i * 4]); }
        if (q.length >= 8 && lv.size < 2) add('warnings', `stair:${(x0 / sub) | 0},${(y0 / sub) | 0}`, `台阶 (${(x0 / sub).toFixed(0)},${(y0 / sub).toFixed(0)}) 两端在同一层级 —— 没有连接不同高度的台地`, [x0 / sub, y0 / sub]); } }
    // 2) 门是否贴着建筑
    for (const b of map.buildings || []) { if (!b.door || !b.poly || b.nodoor) continue; const d = distToPoly(b.poly, b.door[0], b.door[1]);
      if (d > 1.6) add('errors', `door:${b.id}`, `「${b.name}」的门离建筑 ${d.toFixed(1)} 格 —— 门应紧贴建筑外墙`, b.door); }
    // 3) 可达性：从出生点在碰撞网格上泛洪；能进入的门要走得到，另外统计大片走不到的空地
    if (map.spawn) { const cg = collisionOf(map, ground), seen = flood(cg, map.spawn[0], map.spawn[1]);
      const reach = (x, y) => { for (let r = 0; r <= 1.5; r += 0.25) for (const [ax, ay] of [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1]]) { const X = Math.floor((x + ax * r) * sub), Y = Math.floor((y + ay * r) * sub); if (X >= 0 && Y >= 0 && X < gw && Y < gh && seen[Y * gw + X]) return true; } return false; };
      for (const b of map.buildings || []) if (b.enter && b.door && !reach(b.door[0], b.door[1] + 0.3)) add('warnings', `reach:${b.id}`, `「${b.name}」的门从出生点走不到`, b.door);
      // 走不到的大片空地：只看铺装（路 / 广场 / 门前），≥ 64 个 ¼ 格（约 4 格²）
      const lab = new Uint8Array(gw * gh), q = new Int32Array(gw * gh); let regions = 0;
      for (let s = 0; s < gw * gh; s++) { if (seen[s] || lab[s] || cg.col[s] || !Core.PAVED.has(ground[s])) continue; let h = 0, t = 0; q[t++] = s; lab[s] = 1; let x0 = 1e9, y0 = 1e9;
        while (h < t) { const i = q[h++], x = i % gw; x0 = Math.min(x0, x); y0 = Math.min(y0, (i / gw) | 0); for (const j of [x > 0 ? i - 1 : -1, x < gw - 1 ? i + 1 : -1, i - gw, i + gw]) if (j >= 0 && j < gw * gh && !lab[j] && !seen[j] && !cg.col[j] && Core.PAVED.has(ground[j])) { lab[j] = 1; q[t++] = j; } }
        if (t >= 64) { regions++; add('warnings', `island:${(x0 / sub / 8) | 0},${(y0 / sub / 8) | 0}`, `一片约 ${(t / sub / sub).toFixed(0)} 格² 的铺装 (${(x0 / sub).toFixed(0)},${(y0 / sub).toFixed(0)}) 从出生点走不到`, [x0 / sub, y0 / sub]); } }
      out.info.push({ key: 'reach', text: `可达 ¼ 格：${seen.reduce((a, v) => a + v, 0)}` }); }
    out.keys = keys; return out;
  }

  // ---------- 存档格式（localStorage 覆盖 + 导出 JSON）----------
  // 体积：地类 / 地形各自 deflate 后 base64（≈ 0.3–0.6 MB），远小于 localStorage 约 5 MB 上限；map 直接内嵌。
  function b64(u8) { if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64'); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64')); const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  async function deflate(u8) { if (typeof CompressionStream === 'undefined') return require('zlib').deflateSync(u8); const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate')); return new Uint8Array(await new Response(s).arrayBuffer()); }
  async function inflate(u8) { if (typeof DecompressionStream === 'undefined') return new Uint8Array(require('zlib').inflateSync(u8)); const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate')); return new Uint8Array(await new Response(s).arrayBuffer()); }
  function rgbOf(terr) { const n = terr.length / 4, o = new Uint8Array(n * 3); for (let i = 0; i < n; i++) { o[i * 3] = terr[i * 4]; o[i * 3 + 1] = terr[i * 4 + 1]; o[i * 3 + 2] = terr[i * 4 + 2]; } return o; }
  function rgbaOf(rgb) { const n = rgb.length / 3, o = new Uint8ClampedArray(n * 4); for (let i = 0; i < n; i++) { o[i * 4] = rgb[i * 3]; o[i * 4 + 1] = rgb[i * 3 + 1]; o[i * 4 + 2] = rgb[i * 3 + 2]; o[i * 4 + 3] = 255; } return o; }
  async function encode(map, ground, terr) { return { format: FORMAT, version: VERSION, savedAt: new Date().toISOString(), w: map.meta.w * map.meta.sub, h: map.meta.h * map.meta.sub,
    map, ground: b64(await deflate(ground)), terrain: terr ? b64(await deflate(rgbOf(terr))) : null }; }
  async function decode(obj) { if (typeof obj === 'string') obj = JSON.parse(obj); if (!obj || obj.format !== FORMAT || !obj.map || !obj.ground) throw new Error('不是地图编辑器导出的文件');
    const ground = await inflate(unb64(obj.ground)), n = obj.map.meta.w * obj.map.meta.sub * obj.map.meta.h * obj.map.meta.sub; if (ground.length !== n) throw new Error('地类数据尺寸不对');
    const terr = obj.terrain ? rgbaOf(await inflate(unb64(obj.terrain))) : null; if (terr && terr.length !== n * 4) throw new Error('地形数据尺寸不对');
    return { map: obj.map, ground, terr, savedAt: obj.savedAt }; }
  // 游戏启动时调用：有覆盖（且 URL 没有 ?pristine）就返回 { map, ground, terr }，否则 null
  async function loadOverride(storage, search) { try { if (search && /[?&]pristine\b/.test(search)) return null; const s = storage && storage.getItem(KEY); if (!s) return null; return await decode(s); } catch (e) { if (typeof console !== 'undefined') console.warn('地图覆盖无效，已忽略：', e); return null; } }
  async function saveOverride(storage, map, ground, terr) { const s = JSON.stringify(await encode(map, ground, terr)); storage.setItem(KEY, s); return s.length; }
  function resetOverride(storage) { storage.removeItem(KEY); }
  return { KEY, FORMAT, VERSION, DIR, PALETTE, CLASS_ZH, brushCells, lineCells, snapLine, rectCells, makeState, begin, commit, undo, redo, setG, setT, paint, raiseLevel, setLevel, pick, erase, straightenStairs,
    toggleCollision, applyCol, bboxOf, polyCells, moveBuilding, resizeBuilding, deleteBuilding, moveDoor, addTree, removeTrees, distToPoly, collisionOf, flood, validate, encode, decode, loadOverride, saveOverride, resetOverride, b64, unb64, deflate, inflate, mapEdit };
});

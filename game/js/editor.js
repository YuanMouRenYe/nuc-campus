// v7.7 地图编辑器（纯本地、离线）。数据与撤销逻辑在 mapedit_core.js；这里只负责界面、绘制和鼠标 / 键盘。
(function () {
  'use strict';
  const E = window.MapEdit, C = Core.C, T = 16, $ = id => document.getElementById(id), Q = new URLSearchParams(location.search);
  const cv = $('cv'), g = cv.getContext('2d');
  let M, ground8, terr8, elev8, st, ground, baseKeys = null, flat = null, flatG = null, colCv = null, lvCv = null, colGrid = null, colStale = true, lvStale = true, lamps = null;
  const view = { x: 0, y: 0, z: 1 }; // 视图中心（世界像素）、缩放（屏幕像素 / 世界像素）
  let tool = 'brush', palId = 'road', size = 4, level = 0, sel = -1, drag = null, hover = null, spaceDown = false, need = true, lastVal = null, saved = true;
  const LAYERS = [ ['ground', '地面（地类）', 1], ['level', '台地层级着色', 0], ['stairs', '台阶 / 坡道方向', 1], ['col', '碰撞（红=不可走）', 0], ['bld', '建筑轮廓', 1], ['door', '门', 1], ['tree', '树木', 1], ['lamp', '路灯', 0], ['station', '共享电动车停车点', 1], ['grid', '网格', 0] ];
  const on = {}; for (const [k, , d] of LAYERS) on[k] = !!d;
  const TOOLS = [ ['brush', '🖌 画笔', 'B'], ['line', '📏 直线', 'L'], ['rect', '▭ 矩形', 'R'], ['erase', '🧽 橡皮', 'E'], ['pick', '💧 吸管', 'I'], ['col', '⛔ 碰撞', 'C'], ['raise', '⛰ 抬降', 'H'], ['setlv', '⇲ 设层级', 'K'], ['straight', '📐 拉直台阶', 'S'], ['select', '🖐 选择', 'V'], ['tree', '🌳 树', 'T'] ];
  // 地类颜色（与游戏底色接近；仅编辑器里缩小时用）
  const CC = {}; const cc = (k, h) => { CC[C[k]] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; };
  [['OUT', '#8fa86a'], ['GRASS', '#78b351'], ['WOOD', '#4c7d3a'], ['HILL', '#a3a957'], ['ROAD', '#76767f'], ['PATH', '#d8c39a'], ['PLAZA', '#e2d6bd'], ['WATER', '#4a91d0'], ['PITCH', '#4f9e47'], ['TRACK', '#b5523f'], ['COURT', '#3f8a63'], ['PARKING', '#8a8a90'], ['RAIL', '#8b7f72'], ['BARE', '#c9a874'], ['VILLAGE', '#a99f94'], ['APRON', '#d2c9b3'], ['FLOWERS', '#d66a8a'], ['CLIFF', '#77716a'], ['BUILDING', '#a35b3c'], ['STEPS', '#f2ecdc'], ['SAND', '#e3d1a0'], ['DEEPWOOD', '#3f6b33'], ['TERRACE', '#5f5a54']].forEach(([k, h]) => cc(k, h));
  const LVC = ['#3b6fd8', '#3ab8b0', '#5fc04a', '#e8c03a', '#e8803a', '#d84a3a', '#b04ad0', '#ffffff'];

  // ---------- 读取 ----------
  const img = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const pix = (im, ch) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; if (ch === 4) return d; const o = new Uint8Array(c.width * c.height); for (let i = 0; i < o.length; i++) o[i] = d[i * 4]; return o; };
  async function load() {
    const [mj, gi, ti, ei] = await Promise.all([fetch('data/map.json').then(r => r.json()), img('data/ground.png'), img('data/terrain.png'), img('data/elev.png').catch(() => null)]);
    const pg = pix(gi, 1), pt = pix(ti, 4); elev8 = ei ? pix(ei, 1) : null;
    baseKeys = E.validate(mj, pg, pt).keys; // 原始数据本身就有的问题记为“原有”，不当成你的错误
    const ov = Q.has('pristine') ? null : await E.loadOverride(localStorage, '');
    if (ov) { M = ov.map; ground8 = ov.ground; terr8 = ov.terr || pt; note('已载入浏览器里保存的修改（' + (ov.savedAt ? new Date(ov.savedAt).toLocaleString('zh-CN') : '') + '）'); } else { M = mj; ground8 = pg; terr8 = pt; }
    setup(); $('loading').remove();
  }
  function setup() {
    st = E.makeState(M, ground8, terr8);
    ground = new Ground(ground8, M.meta, M.rails, { terrain: terr8, elev: elev8, fields: M.fields, fences: M.fences, crossings: M.crossings, bridges: [M.props && M.props.railBridge, M.props && M.props.v764 && M.props.v764.underpass].filter(Boolean), pave: M.pave, lots: (M.props && M.props.v764 && M.props.v764.lots) || [], ewStairs: ewList() });
    flat = document.createElement('canvas'); flat.width = st.gw; flat.height = st.gh; flatG = flat.getContext('2d'); redrawFlat(0, 0, st.gw - 1, st.gh - 1);
    colCv = document.createElement('canvas'); colCv.width = st.gw; colCv.height = st.gh; lvCv = document.createElement('canvas'); lvCv.width = st.gw; lvCv.height = st.gh;
    const c = Q.get('at'); if (c) { const [x, y, z] = c.split(',').map(Number); view.x = x * T; view.y = y * T; if (z) view.z = z; } else { view.x = M.spawn[0] * T; view.y = M.spawn[1] * T; }
    buildUI(); resize(); need = true; requestAnimationFrame(loop);
    window.__ed = { st, view, M: () => M, ground8: () => ground8, terr8: () => terr8, setTool, setPal, setSize: v => { size = v; ui(); }, setLevel: v => { level = v; ui(); }, select: i => { sel = i; ui(); need = true; }, runValidate, save, exportJSON, doc: () => encodeNow(), screenToWorld, worldToScreen, apply: applyDirty, ready: true, toggleLayer: (k, v) => { on[k] = v; need = true; ui(); } };
  }
  const ewList = () => (M.props && M.props.v764 && M.props.v764.ew_stairs) || [];
  function note(t, ms) { $('status').dataset.note = t; $('status').dataset.until = performance.now() + (ms || 4000); status(); }

  // ---------- 重绘 ----------
  function redrawFlat(x0, y0, x1, y1) { const w = x1 - x0 + 1, h = y1 - y0 + 1; if (w <= 0 || h <= 0) return; const id = flatG.createImageData(w, h), d = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y0 + y) * st.gw + x0 + x, c = CC[ground8[i]] || [255, 0, 255], k = (y * w + x) * 4, lv = terr8 ? terr8[i * 4] - 1 : 0, sh = Math.max(-30, Math.min(40, lv * 8));
      d[k] = Math.min(255, c[0] + sh); d[k + 1] = Math.min(255, c[1] + sh); d[k + 2] = Math.min(255, c[2] + sh); d[k + 3] = 255; }
    flatG.putImageData(id, x0, y0); }
  function applyDirty() { const d = st.dirty; if (!d) return; st.dirty = null; const p = 3; const x0 = Math.max(0, d.x0 - p), y0 = Math.max(0, d.y0 - p), x1 = Math.min(st.gw - 1, d.x1 + p), y1 = Math.min(st.gh - 1, d.y1 + p);
    redrawFlat(x0, y0, x1, y1); const S = 512, s = st.sub; // 世界像素 = 子格 × 4
    for (let cy = Math.floor(y0 * 4 / S); cy <= Math.floor(y1 * 4 / S); cy++) for (let cx = Math.floor(x0 * 4 / S); cx <= Math.floor(x1 * 4 / S); cx++) ground.cache.delete(cx + ',' + cy);
    if (ground.far) ground.far.clear(); ground.ewStairs = ewList(); colStale = true; lvStale = true; lamps = null; saved = false; void s; need = true; }
  function rebuildCol() { colGrid = E.collisionOf(M, ground8); const id = new ImageData(st.gw, st.gh), d = id.data; for (let i = 0; i < colGrid.col.length; i++) if (colGrid.col[i]) { d[i * 4] = 230; d[i * 4 + 1] = 40; d[i * 4 + 2] = 40; d[i * 4 + 3] = 120; }
    colCv.getContext('2d').putImageData(id, 0, 0); colStale = false; }
  function rebuildLv() { const id = new ImageData(st.gw, st.gh), d = id.data; for (let i = 0; i < st.gw * st.gh; i++) { const lv = terr8[i * 4] - 1, h = LVC[Math.max(0, Math.min(7, lv))]; d[i * 4] = parseInt(h.slice(1, 3), 16); d[i * 4 + 1] = parseInt(h.slice(3, 5), 16); d[i * 4 + 2] = parseInt(h.slice(5, 7), 16); d[i * 4 + 3] = terr8[i * 4 + 1] ? 150 : 90; }
    lvCv.getContext('2d').putImageData(id, 0, 0); lvStale = false; }
  function resize() { const r = cv.parentElement.getBoundingClientRect(), dpr = devicePixelRatio || 1; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); need = true; }
  const dpr = () => devicePixelRatio || 1;
  function screenToWorld(sx, sy) { const k = view.z * dpr(); return [(sx * dpr() - cv.width / 2) / k + view.x, (sy * dpr() - cv.height / 2) / k + view.y]; } // 世界像素
  function worldToScreen(wx, wy) { const k = view.z * dpr(); return [(wx - view.x) * k + cv.width / 2, (wy - view.y) * k + cv.height / 2]; } // 画布像素
  function loop() { if (st.dirty) applyDirty(); if (need) { need = false; draw(); } status(); requestAnimationFrame(loop); }
  function draw() {
    const k = view.z * dpr(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#20140c'; g.fillRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
    g.setTransform(k, 0, 0, k, cv.width / 2 - view.x * k, cv.height / 2 - view.y * k);
    const x0 = view.x - cv.width / 2 / k, y0 = view.y - cv.height / 2 / k, x1 = view.x + cv.width / 2 / k, y1 = view.y + cv.height / 2 / k;
    if (on.ground) { if (view.z >= 0.75) { let made = 0; for (let cy = Math.max(0, Math.floor(y0 / 512)); cy <= Math.floor(y1 / 512); cy++) for (let cx = Math.max(0, Math.floor(x0 / 512)); cx <= Math.floor(x1 / 512); cx++) {
        if (cx * 512 >= st.gw * 4 || cy * 512 >= st.gh * 4) continue; const key = cx + ',' + cy; let ch = ground.cache.get(key); if (!ch && made < 4) { ch = ground.chunk(cx, cy); made++; } if (ch) g.drawImage(ch, cx * 512, cy * 512); else { g.drawImage(flat, cx * 128, cy * 128, 128, 128, cx * 512, cy * 512, 512, 512); need = true; } } }
      else g.drawImage(flat, 0, 0, st.gw * 4, st.gh * 4); }
    if (on.level) { if (lvStale) rebuildLv(); g.globalAlpha = 0.55; g.drawImage(lvCv, 0, 0, st.gw * 4, st.gh * 4); g.globalAlpha = 1; }
    if (on.col) { if (colStale) rebuildCol(); g.drawImage(colCv, 0, 0, st.gw * 4, st.gh * 4); }
    const px = 1 / k; // 一个屏幕像素
    if (on.grid && view.z >= 1) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = px; g.beginPath(); for (let x = Math.floor(x0 / T) * T; x < x1; x += T) { g.moveTo(x, y0); g.lineTo(x, y1); } for (let y = Math.floor(y0 / T) * T; y < y1; y += T) { g.moveTo(x0, y); g.lineTo(x1, y); } g.stroke(); }
    if (on.stairs && view.z >= 0.75) drawArrows(x0, y0, x1, y1, px);
    if (on.tree) { g.fillStyle = 'rgba(20,80,20,.85)'; g.strokeStyle = '#d8f0a0'; g.lineWidth = px; for (const t of M.trees) { const X = t[0] * T, Y = t[1] * T; if (X < x0 - 8 || X > x1 + 8 || Y < y0 - 8 || Y > y1 + 8) continue; g.beginPath(); g.arc(X, Y, Math.max(3, 3 * px), 0, 7); g.fill(); g.stroke(); } }
    if (on.lamp) { if (!lamps) try { lamps = Core.placeLamps(ground8, M.meta, M.buildings) || []; } catch (e) { lamps = []; } g.fillStyle = '#ffe58a'; for (const l of lamps) g.fillRect(l.x * T - 2 * px, l.y * T - 2 * px, 5 * px, 5 * px); }
    if (on.bld) M.buildings.forEach((b, i) => { const [bx0, by0, bx1, by1] = E.bboxOf(b.poly); if (bx1 * T < x0 || bx0 * T > x1 || by1 * T < y0 || by0 * T > y1) return;
      g.beginPath(); b.poly.forEach(([x, y], j) => j ? g.lineTo(x * T, y * T) : g.moveTo(x * T, y * T)); g.closePath();
      if (i === sel) { g.fillStyle = 'rgba(255,207,90,.35)'; g.fill(); } g.strokeStyle = i === sel ? '#ffcf5a' : 'rgba(60,20,10,.85)'; g.lineWidth = (i === sel ? 3 : 1.5) * px; g.stroke();
      if (view.z >= 0.5 && b.name) { g.font = `${12 * px}px ArkPixel, sans-serif`; g.fillStyle = '#fff'; g.strokeStyle = '#3b1f10'; g.lineWidth = 3 * px; g.textAlign = 'center'; const cx = (bx0 + bx1) / 2 * T, cy = (by0 + by1) / 2 * T; g.strokeText(b.name, cx, cy); g.fillText(b.name, cx, cy); }
      if (i === sel) for (const [hx, hy] of corners(b)) { g.fillStyle = '#fff'; g.fillRect(hx * T - 4 * px, hy * T - 4 * px, 8 * px, 8 * px); g.strokeStyle = '#3b1f10'; g.strokeRect(hx * T - 4 * px, hy * T - 4 * px, 8 * px, 8 * px); } });
    if (on.door) M.buildings.forEach((b, i) => { if (!b.door) return; const X = b.door[0] * T, Y = b.door[1] * T; if (X < x0 || X > x1 || Y < y0 || Y > y1) return; g.fillStyle = i === sel ? '#ff3b30' : '#d0302a'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * px; g.beginPath(); g.arc(X, Y, (i === sel ? 6 : 4) * px, 0, 7); g.fill(); g.stroke(); });
    if (on.station) for (const s of V77Core.STATIONS) { const X = s.x * T, Y = s.y * T; g.fillStyle = '#1f55b8'; g.fillRect(X - 6 * px, Y - 6 * px, 12 * px, 12 * px); g.fillStyle = '#fff'; g.font = `${10 * px}px ArkPixel, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', X, Y); g.textBaseline = 'alphabetic'; }
    if (lastVal && view.z >= 0.25) for (const it of lastVal.errors.concat(lastVal.warnings)) if (it.at) { const X = it.at[0] * T, Y = it.at[1] * T; g.strokeStyle = lastVal.errors.includes(it) ? '#ff2a2a' : '#ffb020'; g.lineWidth = 3 * px; g.beginPath(); g.arc(X, Y, 14 * px, 0, 7); g.stroke(); }
    drawPreview(px);
  }
  function drawArrows(x0, y0, x1, y1, px) { const s = st.sub; g.fillStyle = 'rgba(40,20,10,.75)'; g.strokeStyle = 'rgba(40,20,10,.8)'; g.lineWidth = 1.5 * px;
    for (let ty = Math.max(0, Math.floor(y0 / T)); ty <= Math.min(M.meta.h - 1, Math.floor(y1 / T)); ty++) for (let tx = Math.max(0, Math.floor(x0 / T)); tx <= Math.min(M.meta.w - 1, Math.floor(x1 / T)); tx++) {
      const i = (ty * s + 2) * st.gw + tx * s + 2, c = ground8[i], ramp = terr8[i * 4 + 1], d = terr8[i * 4 + 2] & 15; if (!(c === C.STEPS || ramp) || !d) continue;
      const v = Core.RAMP_DIRS[d - 1], cx = tx * T + 8, cy = ty * T + 8, ux = -v[0], uy = -v[1]; // 箭头指向上坡
      g.beginPath(); g.moveTo(cx - ux * 5, cy - uy * 5); g.lineTo(cx + ux * 5, cy + uy * 5); g.lineTo(cx + ux * 2 - uy * 3, cy + uy * 2 + ux * 3); g.moveTo(cx + ux * 5, cy + uy * 5); g.lineTo(cx + ux * 2 + uy * 3, cy + uy * 2 - ux * 3); if (c !== C.STEPS) g.setLineDash([2 * px, 2 * px]); g.stroke(); g.setLineDash([]); } }
  function drawPreview(px) { if (!hover) return; const [wx, wy] = hover, s4 = 4; // 子格 = 4 世界像素
    g.strokeStyle = '#fff'; g.lineWidth = 1.5 * px;
    if (drag && drag.rect) { const [a, b] = [drag.start, hover]; const X0 = Math.min(a[0], b[0]), Y0 = Math.min(a[1], b[1]); g.setLineDash([4 * px, 3 * px]); g.strokeRect(Math.floor(X0 / s4) * s4, Math.floor(Y0 / s4) * s4, Math.abs(b[0] - a[0]) + s4, Math.abs(b[1] - a[1]) + s4); g.setLineDash([]); return; }
    if (drag && drag.line) { const e = drag.snap ? snapEnd(drag.start, hover) : hover; g.lineWidth = Math.max(1.5 * px, size * s4); g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(drag.start[0], drag.start[1]); g.lineTo(e[0], e[1]); g.stroke(); return; }
    if (['brush', 'erase', 'line', 'rect'].includes(tool)) { const h = size * s4 / 2; g.strokeRect(Math.floor(wx / s4) * s4 - Math.floor(size / 2) * s4, Math.floor(wy / s4) * s4 - Math.floor(size / 2) * s4, size * s4, size * s4); void h; }
    if (drag && drag.move != null) { const b = M.buildings[drag.move]; g.strokeStyle = '#ffcf5a'; g.setLineDash([4 * px, 3 * px]); g.beginPath(); b.poly.forEach(([x, y], j) => { const X = x * T + drag.dx, Y = y * T + drag.dy; j ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.stroke(); g.setLineDash([]); } }
  function corners(b) { const [a, c, d, e] = E.bboxOf(b.poly); return [[a, c], [d, c], [d, e], [a, e]]; }
  function snapEnd(a, b) { const s = E.snapLine(a[0], a[1], b[0], b[1]); return [s[2], s[3]]; }

  // ---------- 编辑动作 ----------
  const sc = w => Math.floor(w / 4); // 世界像素 → 子格
  const pal = () => E.PALETTE.find(p => p.id === palId);
  function act(label, fn) { E.begin(st, label); fn(); if (E.commit(st)) { saved = false; note('✔ ' + label); } st.dirty = st.dirty || { x0: 0, y0: 0, x1: 0, y1: 0 }; colStale = true; need = true; ui(); }
  function paintCells(cells) { const p = pal(); E.paint(st, cells, p, { level }); }
  function down(e) { const r = cv.getBoundingClientRect(), w = screenToWorld(e.clientX - r.left, e.clientY - r.top); hover = w;
    if (e.button === 1 || e.button === 2 || spaceDown) { drag = { pan: true, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; return; }
    if (e.altKey || tool === 'pick') { doPick(w); return; }
    const sx = sc(w[0]), sy = sc(w[1]);
    if (tool === 'brush' || tool === 'erase') { E.begin(st, tool === 'brush' ? '画笔：' + pal().label : '橡皮'); drag = { stroke: true, last: [sx, sy] }; strokeTo(sx, sy); return; }
    if (tool === 'line') { drag = { line: true, start: w, snap: e.shiftKey }; return; }
    if (['rect', 'col', 'raise', 'setlv', 'straight'].includes(tool) || (tool === 'tree' && e.shiftKey)) { drag = { rect: true, start: w, shift: e.shiftKey }; return; }
    if (tool === 'tree') { act('种一棵树', () => E.addTree(st, w[0] / T, w[1] / T, 0)); return; }
    if (tool === 'select') { const tx = w[0] / T, ty = w[1] / T, tol = 8 / view.z / T;
      if (sel >= 0 && M.buildings[sel]) { const b = M.buildings[sel];
        if (b.door && Math.hypot(b.door[0] - tx, b.door[1] - ty) < tol * 1.2) { drag = { door: sel }; return; }
        const k = corners(b).findIndex(([x, y]) => Math.abs(x - tx) < tol && Math.abs(y - ty) < tol); if (k >= 0) { drag = { resize: sel, corner: k, bb: E.bboxOf(b.poly) }; return; } }
      const i = M.buildings.findIndex(b => Core.inPoly ? Core.inPoly(b.poly, tx, ty) : false); const j = i >= 0 ? i : M.buildings.findIndex(b => b.door && Math.hypot(b.door[0] - tx, b.door[1] - ty) < tol * 1.2);
      sel = j; ui(); need = true; if (j >= 0) drag = (i < 0) ? { door: j } : { move: j, start: w, dx: 0, dy: 0 }; } }
  function strokeTo(sx, sy) { const cells = E.lineCells(drag.last[0], drag.last[1], sx, sy, size, st.gw, st.gh); drag.last = [sx, sy];
    if (tool === 'erase') E.erase(st, cells); else paintCells(cells); need = true; }
  function move(e) { const r = cv.getBoundingClientRect(), w = screenToWorld(e.clientX - r.left, e.clientY - r.top); hover = w; need = true;
    if (!drag) return; if (drag.pan) { view.x = drag.vx - (e.clientX - drag.sx) / view.z; view.y = drag.vy - (e.clientY - drag.sy) / view.z; return; }
    if (drag.stroke) strokeTo(sc(w[0]), sc(w[1])); if (drag.line) drag.snap = e.shiftKey;
    if (drag.move != null) { drag.dx = w[0] - drag.start[0]; drag.dy = w[1] - drag.start[1]; }
    if (drag.door != null) drag.at = w; if (drag.resize != null) drag.at = w; }
  function up(e) { if (!drag) return; const d = drag; drag = null; const w = hover;
    if (d.stroke) { if (E.commit(st)) { saved = false; note('✔ ' + (tool === 'erase' ? '橡皮' : '画笔')); } colStale = true; ui(); return; }
    if (d.line) { const en = d.snap ? snapEnd(d.start, w) : w; act('直线：' + pal().label, () => paintCells(E.lineCells(sc(d.start[0]), sc(d.start[1]), sc(en[0]), sc(en[1]), size, st.gw, st.gh))); return; }
    if (d.rect) { const ax = sc(Math.min(d.start[0], w[0])), ay = sc(Math.min(d.start[1], w[1])), bx = sc(Math.max(d.start[0], w[0])), by = sc(Math.max(d.start[1], w[1])), cells = () => E.rectCells(ax, ay, bx, by, st.gw, st.gh);
      if (tool === 'rect') act('矩形：' + pal().label, () => paintCells(cells()));
      else if (tool === 'col') act(d.shift ? '碰撞：设为可走' : '碰撞：设为不可走', () => E.mapEdit(st, m => E.toggleCollision(m, [ax / 4, ay / 4, (bx + 1) / 4, (by + 1) / 4], !d.shift)));
      else if (tool === 'raise') act(d.shift ? '层级 −1' : '层级 +1', () => E.raiseLevel(st, cells(), d.shift ? -1 : 1));
      else if (tool === 'setlv') act('设为层级 ' + level, () => E.setLevel(st, cells(), level));
      else if (tool === 'straight') { let r = null; act('拉直台阶', () => { r = E.straightenStairs(st, ax, ay, bx, by); }); if (!r) note('框里没有台阶'); }
      else if (tool === 'tree') { let n = 0; act('删除树', () => { n = E.removeTrees(st, ax / 4, ay / 4, (bx + 1) / 4, (by + 1) / 4); }); note('删除了 ' + n + ' 棵树'); }
      return; }
    if (d.move != null) { const b = M.buildings[d.move], dx = Math.round(d.dx / T * 4) / 4, dy = Math.round(d.dy / T * 4) / 4; if (dx || dy) act('移动「' + b.name + '」', () => E.moveBuilding(st, b, dx, dy)); return; }
    if (d.door != null && d.at) { const b = M.buildings[d.door]; act('移动「' + b.name + '」的门', () => E.moveDoor(st, b, d.at[0] / T, d.at[1] / T)); return; }
    if (d.resize != null && d.at) { const b = M.buildings[d.resize], bb = d.bb.slice(), tx = Math.round(d.at[0] / T * 4) / 4, ty = Math.round(d.at[1] / T * 4) / 4, k = d.corner;
      if (k === 0 || k === 3) bb[0] = tx; else bb[2] = tx; if (k === 0 || k === 1) bb[1] = ty; else bb[3] = ty; const nb = [Math.min(bb[0], bb[2]), Math.min(bb[1], bb[3]), Math.max(bb[0], bb[2]), Math.max(bb[1], bb[3])];
      if (nb[2] - nb[0] >= 1 && nb[3] - nb[1] >= 1) act('缩放「' + b.name + '」', () => E.resizeBuilding(st, b, nb)); } }
  function doPick(w) { const i = sc(w[1]) * st.gw + sc(w[0]), p = E.pick(st, i), name = Core.CLASS_NAMES[p.cls];
    const m = E.PALETTE.find(q => q.cls === p.cls && (!q.stair || (q.dir === p.dir))) || null; if (m) palId = m.id; if (p.level >= 0) level = p.level; note(`吸取：${E.CLASS_ZH[name] || name} · 层级 ${p.level}${p.ramp ? ' · 坡道' : ''}`); if (tool === 'pick') setTool('brush'); ui(); }
  function deleteSel() { if (sel < 0) return; const b = M.buildings[sel]; act('删除「' + b.name + '」', () => E.deleteBuilding(st, b)); sel = -1; ui(); }
  function undo() { const s = E.undo(st); if (s) { note('↶ 撤销：' + s.label); sel = Math.min(sel, M.buildings.length - 1); colStale = true; ui(); } }
  function redo() { const s = E.redo(st); if (s) { note('↷ 重做：' + s.label); colStale = true; ui(); } }

  // ---------- 检查 / 保存 / 导出 / 导入 ----------
  function runValidate() { const v = E.validate(M, ground8, terr8, { baseline: baseKeys }); lastVal = v; need = true; const el = $('val'), esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    el.innerHTML = (v.errors.length || v.warnings.length ? '' : '<div class="ok">✔ 没有发现新问题</div>') + [['e', v.errors, '错误'], ['w', v.warnings, '提醒']].map(([c, L, n]) => L.length ? `<b>${n} ${L.length}</b>` + L.map((it, k) => `<div class="${c}" data-c="${c}" data-k="${k}">${esc(it.text)}</div>`).join('') : '').join('')
      + (v.info.length ? `<details><summary class="small">原始数据里已有的 ${v.info.length} 条（不影响导出）</summary>${v.info.slice(0, 80).map(it => `<div class="i">${esc(it.text)}</div>`).join('')}</details>` : '');
    for (const d of el.querySelectorAll('[data-c]')) d.onclick = () => { const it = (d.dataset.c === 'e' ? v.errors : v.warnings)[+d.dataset.k]; if (it.at) { view.x = it.at[0] * T; view.y = it.at[1] * T; view.z = Math.max(view.z, 2); need = true; } };
    return v; }
  async function encodeNow() { return E.encode(M, ground8, terr8); }
  async function save() { try { const n = await E.saveOverride(localStorage, M, ground8, terr8); saved = true; note(`💾 已保存到游戏（${(n / 1024).toFixed(0)} KB，存在本浏览器）。打开游戏即可看到修改。`, 6000); } catch (e) { note('保存失败：' + e.message + '（浏览器存储空间不足？可以改用导出）', 8000); } }
  async function exportJSON() { const v = runValidate(); if (v.errors.length && !confirm(`检查发现 ${v.errors.length} 个错误（见右侧）。仍然导出吗？`)) return null;
    const doc = await encodeNow(), s = JSON.stringify(doc), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'application/json' })); a.download = 'nuc-map-edit-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    note(`⬇ 已导出 ${(s.length / 1024).toFixed(0)} KB · 错误 ${v.errors.length} · 提醒 ${v.warnings.length}`, 6000); return s.length; }
  async function importFile(f) { try { const o = await E.decode(await f.text()); M = o.map; ground8 = o.ground; terr8 = o.terr || terr8; sel = -1; lastVal = null; setupAgain(); note('⬆ 已导入 ' + f.name + '（记得「保存到游戏」）', 6000); saved = false; } catch (e) { note('导入失败：' + e.message, 8000); } }
  function setupAgain() { st = E.makeState(M, ground8, terr8); window.__ed.st = st; ground = new Ground(ground8, M.meta, M.rails, { terrain: terr8, elev: elev8, fields: M.fields, fences: M.fences, crossings: M.crossings, bridges: [M.props && M.props.railBridge, M.props && M.props.v764 && M.props.v764.underpass].filter(Boolean), pave: M.pave, lots: (M.props && M.props.v764 && M.props.v764.lots) || [], ewStairs: ewList() });
    redrawFlat(0, 0, st.gw - 1, st.gh - 1); colStale = lvStale = true; lamps = null; need = true; ui(); }
  function reset() { if (!confirm('删除浏览器里保存的地图修改，游戏恢复原始地图？（当前编辑器里的内容也会重新读取原图）')) return; E.resetOverride(localStorage); note('⟲ 已重置：游戏将使用原始地图', 5000); location.href = 'editor.html?pristine'; }

  // ---------- 界面 ----------
  function setTool(t) { tool = t; drag = null; ui(); need = true; }
  function setPal(id) { palId = id; if (['erase', 'pick', 'select', 'col', 'raise', 'straight', 'tree', 'setlv'].includes(tool)) tool = 'brush'; ui(); }
  function swatch(p) { if (p.ramp != null) return `background:linear-gradient(${({ 7: 'to bottom', 3: 'to top', 1: 'to left', 5: 'to right' })[p.ramp] || 'to right'},#9a9a6a,#e8e0b0)`; const c = CC[p.cls] || [200, 200, 200];
    return p.cls === C.STEPS ? `background:repeating-linear-gradient(${p.stair === 'ew' ? '90deg' : '0deg'},#f2ecdc 0 3px,#a8a090 3px 5px)` : `background:rgb(${c})`; }
  function buildUI() {
    $('tools').innerHTML = TOOLS.map(([id, n, k]) => `<button data-t="${id}" title="${n}（${k}）">${n}</button>`).join(''); for (const b of $('tools').children) b.onclick = () => setTool(b.dataset.t);
    let h = '', grp = ''; for (const p of E.PALETTE) { if (p.group !== grp) { grp = p.group; h += `<h4>${grp}</h4>`; } h += `<button class="sw" data-p="${p.id}"><i style="${swatch(p)}"></i>${p.label}</button>`; }
    $('pal').innerHTML = h; for (const b of $('pal').querySelectorAll('.sw')) b.onclick = () => setPal(b.dataset.p);
    $('layers').innerHTML = LAYERS.map(([k, n], i) => `<label><input type="checkbox" data-l="${k}" ${on[k] ? 'checked' : ''}> ${n} <kbd>${i < 9 ? i + 1 : ''}</kbd></label>`).join('');
    for (const c of $('layers').querySelectorAll('input')) c.onchange = () => { on[c.dataset.l] = c.checked; need = true; };
    $('size').oninput = e => { size = +e.target.value; ui(); }; $('lvup').onclick = () => { level = Math.min(7, level + 1); ui(); }; $('lvdn').onclick = () => { level = Math.max(0, level - 1); ui(); };
    $('undo').onclick = undo; $('redo').onclick = redo; $('save').onclick = save; $('export').onclick = exportJSON; $('reset').onclick = reset; $('validate').onclick = runValidate;
    adminInit();
    $('import').onchange = e => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; };
    $('helpbtn').onclick = () => $('help').classList.add('on'); $('helpclose').onclick = () => $('help').classList.remove('on');
    $('play').onclick = e => { if (!saved && !confirm('还有没保存到游戏的修改。直接回到游戏吗？（游戏会用上一次保存的版本）')) e.preventDefault(); };
    cv.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up); cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), b = screenToWorld(e.clientX - r.left, e.clientY - r.top); view.z = Math.max(0.0625, Math.min(8, view.z * (e.deltaY < 0 ? 1.25 : 0.8))); const a = screenToWorld(e.clientX - r.left, e.clientY - r.top); view.x += b[0] - a[0]; view.y += b[1] - a[1]; need = true; }, { passive: false });
    addEventListener('resize', resize); addEventListener('keydown', key); addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
    addEventListener('beforeunload', e => { if (!saved) { e.preventDefault(); e.returnValue = ''; } });
    ui(); }
  function key(e) { if (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'range') return; const k = e.key.toLowerCase(), ctl = e.ctrlKey || e.metaKey;
    if (ctl && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; } if (ctl && k === 'y') { e.preventDefault(); redo(); return; }
    if (ctl && k === 's') { e.preventDefault(); save(); return; } if (ctl && k === 'e') { e.preventDefault(); exportJSON(); return; } if (ctl) return;
    if (e.code === 'Space') { spaceDown = true; e.preventDefault(); return; }
    if (k === 'escape') { $('help').classList.remove('on'); closeAdmin && closeAdmin(); drag = null; sel = -1; ui(); need = true; return; } if (k === '?' || k === '/') { $('help').classList.toggle('on'); return; }
    const t = TOOLS.find(x => x[2].toLowerCase() === k); if (t) { setTool(t[0]); return; }
    if (k === '[') { size = Math.max(1, size - 1); ui(); } else if (k === ']') { size = Math.min(40, size + 1); ui(); } else if (k === ',') { level = Math.max(0, level - 1); ui(); } else if (k === '.') { level = Math.min(7, level + 1); ui(); }
    else if (k === 'delete' || k === 'backspace') deleteSel(); else if (k === 'f') { view.x = M.spawn[0] * T; view.y = M.spawn[1] * T; view.z = 1; need = true; } else if (k === '0') { view.x = st.gw * 2; view.y = st.gh * 2; view.z = Math.min(cv.width / (st.gw * 4), cv.height / (st.gh * 4)) / dpr(); need = true; }
    else if (k === 'g') { on.grid = !on.grid; ui(); need = true; } else if (/^[1-9]$/.test(e.key) || /^Digit[1-9]$/.test(e.code)) { const L = LAYERS[+e.code.slice(5) - 1]; if (L) { on[L[0]] = !on[L[0]]; ui(); need = true; } }
    else if (k.startsWith('arrow')) { const s = 64 / view.z; view.x += k === 'arrowleft' ? -s : k === 'arrowright' ? s : 0; view.y += k === 'arrowup' ? -s : k === 'arrowdown' ? s : 0; need = true; } }
  function ui() { for (const b of $('tools').children) b.classList.toggle('on', b.dataset.t === tool); for (const b of $('pal').querySelectorAll('.sw')) b.classList.toggle('on', b.dataset.p === palId && !['erase', 'pick', 'select', 'col', 'raise', 'straight', 'tree'].includes(tool));
    $('size').value = size; $('sizev').textContent = size; $('lv').textContent = level; $('undo').disabled = !st.undo.length; $('redo').disabled = !st.redo.length;
    for (const c of $('layers').querySelectorAll('input')) c.checked = on[c.dataset.l];
    const b = M.buildings[sel]; $('sel').innerHTML = b ? `<b>${b.name}</b><br>外框 ${E.bboxOf(b.poly).map(v => v.toFixed(1)).join(', ')}<br>门 ${b.door ? b.door.map(v => v.toFixed(1)).join(', ') : '无'}${b.enter ? ' · 可进入' : ''}<br><button id="delb">🗑 删除建筑（Delete）</button>` : '（用「🖐 选择」工具点建筑；拖动=移动，拖白色角点=缩放，拖红点=移动门）';
    if (b) $('delb').onclick = deleteSel; }
  function status() { const el = $('status'); if (!st) return; const n = el.dataset.note && performance.now() < +el.dataset.until ? el.dataset.note : '';
    let s = `缩放 ${view.z.toFixed(2)}× · 工具 ${TOOLS.find(t => t[0] === tool)[1]} · 笔刷 ${size} · 层级 ${level} · 撤销 ${st.undo.length}`;
    if (hover) { const tx = hover[0] / T, ty = hover[1] / T, i = sc(hover[1]) * st.gw + sc(hover[0]); if (i >= 0 && i < ground8.length && tx >= 0 && tx < M.meta.w) { const nm = Core.CLASS_NAMES[ground8[i]]; s += ` · (${tx.toFixed(1)}, ${ty.toFixed(1)}) ${E.CLASS_ZH[nm] || nm} 层级 ${terr8[i * 4] - 1}${terr8[i * 4 + 1] ? ' 坡道' : ''}`; } }
    s += saved ? ' · 已保存' : ' · ●未保存'; if (n) s = n + '　|　' + s; if (el.textContent !== s) el.textContent = s; }

  // ---------- v7.9 管理员发布（本地 admin 服务 / GitHub） ----------
  const ADM_LS = 'nuc-campus-admin-local-v1';
  function admLog(t) { const el = $('admLog'); if (!el) return; el.textContent = (el.textContent ? el.textContent + '\n' : '') + t; el.scrollTop = el.scrollHeight; }
  function loadLocalAdm() {
    try { return JSON.parse(localStorage.getItem(ADM_LS) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveLocalAdm(o) { localStorage.setItem(ADM_LS, JSON.stringify(o || {})); }
  function adminBase() {
    const o = loadLocalAdm();
    if (o.base) return o.base.replace(/\/$/, '');
    // 默认：若当前就是 admin 服务则用 location.origin，否则 127.0.0.1:8790
    if (location.port === '8790' || /admin-ping/.test(location.search)) return location.origin;
    return 'http://127.0.0.1:8790';
  }
  function refreshAdminButtons() {
    const loc = !!loadLocalAdm().token;
    const gh = !!(window.AdminGitHub && AdminGitHub.loadConfig());
    const show = loc || gh || location.port === '8790';
    for (const id of ['pubLocal', 'pubGh']) { const b = $(id); if (!b) continue; b.hidden = !show; }
    if ($('pubLocal')) $('pubLocal').hidden = !loc && location.port !== '8790';
    if ($('pubGh')) $('pubGh').hidden = !gh;
  }
  async function pingAdmin() {
    const base = ($('admBase') && $('admBase').value.trim()) || adminBase();
    const rEl = $('admPingR'); if (rEl) rEl.textContent = '检测中…';
    try {
      const r = await fetch(base + '/api/admin-ping', { cache: 'no-store' });
      const j = await r.json();
      if (rEl) rEl.textContent = j.ok ? '✔ 已连通 ' + (j.bind || base) : '未识别的响应';
      return j.ok;
    } catch (e) {
      if (rEl) rEl.textContent = '✘ 连不上（请先在本机运行 npm run admin）';
      return false;
    }
  }
  function openAdmin() {
    const box = $('admin'); if (!box) return;
    const loc = loadLocalAdm(), gh = window.AdminGitHub && AdminGitHub.loadConfig();
    if ($('admToken')) $('admToken').value = loc.token || '';
    if ($('admBase')) $('admBase').value = loc.base || '';
    if ($('ghRepo')) $('ghRepo').value = gh ? (gh.owner + '/' + gh.repo) : '';
    if ($('ghBranch')) $('ghBranch').value = gh ? gh.branch : 'main';
    if ($('ghPrefix')) $('ghPrefix').value = gh ? (gh.pathPrefix || '') : '';
    if ($('ghToken')) $('ghToken').value = gh ? gh.token : '';
    if ($('admLog')) $('admLog').textContent = '';
    box.hidden = false; box.classList.add('on');
  }
  function closeAdmin() { const box = $('admin'); if (box) { box.hidden = true; box.classList.remove('on'); } }
  function saveAdminCfg() {
    const token = ($('admToken').value || '').trim();
    const base = ($('admBase').value || '').trim();
    saveLocalAdm({ token: token || undefined, base: base || undefined });
    const repo = ($('ghRepo').value || '').trim();
    const branch = ($('ghBranch').value || 'main').trim() || 'main';
    const prefix = ($('ghPrefix').value || '').trim();
    const ght = ($('ghToken').value || '').trim();
    if (repo && ght && window.AdminGitHub) {
      const parts = repo.split('/');
      if (parts.length !== 2) { note('仓库格式应为 owner/name', 4000); return; }
      AdminGitHub.saveConfig(localStorage, { owner: parts[0], repo: parts[1], branch, token: ght, pathPrefix: prefix });
      admLog('已保存 GitHub 设置（令牌仅存本机浏览器）');
    } else if (window.AdminGitHub && !ght && !repo) {
      /* keep existing or none */
    } else if (repo && !ght) {
      admLog('已填仓库但未填 PAT：未改写 GitHub 设置');
    }
    refreshAdminButtons();
    note('✔ 管理员设置已保存', 2500);
  }
  function clearAdminCfg() {
    if (!confirm('清除本浏览器中的本地令牌与 GitHub PAT，并隐藏发布按钮？')) return;
    saveLocalAdm({});
    if (window.AdminGitHub) AdminGitHub.clearConfig(localStorage);
    if ($('admToken')) $('admToken').value = '';
    if ($('ghToken')) $('ghToken').value = '';
    refreshAdminButtons();
    admLog('已退出管理员');
    note('已清除管理员凭据', 2500);
  }
  async function encodeNowFiles() {
    if (!window.AdminFiles) throw new Error('缺少 admin_files.js');
    return AdminFiles.buildPublishFiles(M, ground8, terr8);
  }
  async function publishLocal() {
    const loc = loadLocalAdm();
    const token = loc.token || '';
    if (!token && location.port !== '8790') { openAdmin(); note('请先在管理员设置里粘贴本地令牌', 4000); return; }
    const v = runValidate();
    if (v.errors.length && !confirm(`检查有 ${v.errors.length} 个错误。仍要发布到本机项目吗？`)) return;
    note('☁ 正在发布到本机 game/data…', 6000);
    try {
      const exp = await encodeNow();
      const base = adminBase();
      const r = await fetch(base + '/api/publish-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token || loc.token || '' },
        body: JSON.stringify({ export: typeof exp === 'string' ? JSON.parse(exp) : exp, allowErrors: true }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error((j && j.error) || ('HTTP ' + r.status));
      note(`✔ 已发布到本机（备份 ${j.stamp}）· ${j.written.map(w => w.name).join(', ')}`, 8000);
      saved = true;
    } catch (e) {
      note('发布失败：' + e.message + '（确认 npm run admin 在跑，且令牌正确）', 9000);
    }
  }
  async function publishGitHub() {
    const cfg = window.AdminGitHub && AdminGitHub.loadConfig();
    if (!cfg) { openAdmin(); note('请先配置 GitHub 仓库与 PAT', 4000); return; }
    const v = runValidate();
    if (v.errors.length && !confirm(`检查有 ${v.errors.length} 个错误。仍要提交到 GitHub 吗？`)) return;
    note('🐙 正在编码并提交到 GitHub…', 8000);
    try {
      const files = await encodeNowFiles();
      const res = await AdminGitHub.publishFiles(cfg, files, {
        message: 'chore(map): 编辑器发布 ' + new Date().toISOString(),
        onProgress: t => note('🐙 ' + t, 8000),
      });
      note('✔ 已提交 ' + res.sha.slice(0, 7) + ' · ' + res.url, 12000);
      saved = true;
      if (confirm('提交成功。是否打开 commit 页面？\n' + res.url)) location.href = res.url;
    } catch (e) {
      note('GitHub 发布失败：' + e.message, 10000);
    }
  }
  function adminInit() {
    if ($('adminCfg')) $('adminCfg').onclick = openAdmin;
    if ($('admClose')) $('admClose').onclick = closeAdmin;
    if ($('admSave')) $('admSave').onclick = saveAdminCfg;
    if ($('admClear')) $('admClear').onclick = clearAdminCfg;
    if ($('admPing')) $('admPing').onclick = () => pingAdmin();
    if ($('pubLocal')) $('pubLocal').onclick = publishLocal;
    if ($('pubGh')) $('pubGh').onclick = publishGitHub;
    // 自动探测本地 admin
    const tryBase = location.port === '8790' ? location.origin : 'http://127.0.0.1:8790';
    fetch(tryBase + '/api/admin-ping', { cache: 'no-store' }).then(r => r.json()).then(j => {
      if (j && j.ok) {
        const loc = loadLocalAdm();
        if (!loc.base) saveLocalAdm(Object.assign({}, loc, { base: tryBase }));
        // 若在 admin 服务上打开且无令牌，提示去设置
        refreshAdminButtons();
        if (location.port === '8790' && !loadLocalAdm().token) note('检测到本地管理员服务：请点「⚙ 管理员」粘贴终端里的令牌', 7000);
      } else refreshAdminButtons();
    }).catch(() => refreshAdminButtons());
    refreshAdminButtons();
    // 暴露给测试
    window.__edAdmin = { pingAdmin, publishLocal, publishGitHub, refreshAdminButtons, adminBase, loadLocalAdm, saveLocalAdm };
  }


  load().catch(e => { $('loading').textContent = '读取地图失败：' + e.message + '（请用本地服务器打开，见 README）'; console.error(e); });
})();

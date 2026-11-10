// 中北大学 · 像素校园漫步 — main loop, camera, player/NPCs, HUD, interiors.
(function () {
  'use strict';
  const { C } = Core; const T = 16, IT = 32;
  const Q = new URLSearchParams(location.search);
  const cv = document.getElementById('view'), ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'nuc-campus-save-v1';
  if (window.InputMode) try { InputMode.init({ search: location.search }); } catch (e) { }
  // v7.9.2 手机自适应缩放：手机（含横屏）默认 1×（390 宽 2× 只看得到 12 格，人物被放大到占屏宽 16%），
  // 桌面和平板仍是 2×。玩家自己捏合/按键调过之后，用 localStorage 记下的值。
  const ZOOM_KEY = 'nuc-campus-zoom-pref';
  const isPhoneNow = () => {
    try { if (window.InputMode) return String(InputMode.snapshot().kind).indexOf('phone') === 0; } catch (e) { }
    return matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) <= 520;
  };
  const autoZoom = () => isPhoneNow() ? 1 : 2;
  function initialZoom() {
    if (Q.has('zoom')) { const q = +Q.get('zoom'); if (Core.ZOOMS.includes(q)) return q; }
    const z = +(localStorage.getItem(ZOOM_KEY) || 0); if (Core.ZOOMS.includes(z)) return z;
    return autoZoom();
  }
  const S = { quests: Core.questsNew(), toast: null, showQuests: true, muted: false, action: null, dish: null, goalKey: '', lastBell: 0, zoom: initialZoom(), minutes: +(Q.get('t') || 8 * 60), keys: new Set(), fade: 0, fadeDir: 0, fadeCb: null, mode: 'out', interior: null, hint: null, dialog: null, showMap: false, frame: 0 };
  const DEHUAI_LAMPS = { rect: [218, 449, 268, 480], at: [[5, 460.8], [12.5, 466.3], [12.5, 475.3], [7.5, 475.3]] }; // [|dx| from statue axis, y]; mirrored pairs
  let STAIRS = null, terr8 = null, M, ground, ground8, wallPcs = [], shadow = null, elev8 = null, fencePcs = [], portals = [], col, buildings, sheet, sheetMeta, treeGrid, lamps = [], doorList = [], npcs = [], statics = [], minimap, mapBig;
  const player = { x: 0, y: 0, dir: 0, frame: 0, anim: 0, moving: false, variant: 0 };
  const cam = { x: 0, y: 0 };

  async function load() {
    // v7.7: 地图编辑器的本地修改（localStorage 覆盖）优先；?pristine 跳过
    const OV = window.MapEdit ? await MapEdit.loadOverride(window.localStorage, location.search) : null; S.mapOverride = !!OV;
    const [mj, gimg, eimg, simg, sm, , timg] = await Promise.all([
      OV ? OV.map : fetch('data/map.json').then(r => r.json()), OV ? null : img('data/ground.png'), img('data/elev.png').catch(() => null), img('assets/chars/students.png'), fetch('assets/chars/students.json').then(r => r.json()),
      document.fonts ? document.fonts.load('12px ArkPixel', '中北大学') : 0, img('data/terrain.png').catch(() => null)]);
    M = mj; sheet = simg; sheetMeta = sm;
    if (OV) ground8 = OV.ground; else { const c = document.createElement('canvas'); c.width = gimg.width; c.height = gimg.height; const g = c.getContext('2d'); g.drawImage(gimg, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; ground8 = new Uint8Array(c.width * c.height); for (let i = 0; i < ground8.length; i++) ground8[i] = d[i * 4]; }
    if (eimg) { const e = document.createElement('canvas'); e.width = eimg.width; e.height = eimg.height; const eg = e.getContext('2d'); eg.drawImage(eimg, 0, 0); const ed = eg.getImageData(0, 0, e.width, e.height).data; elev8 = new Uint8Array(e.width * e.height); for (let i = 0; i < elev8.length; i++) elev8[i] = ed[i * 4]; }
    if (OV && OV.terr) terr8 = OV.terr; else if (timg) { const e = document.createElement('canvas'); e.width = timg.width; e.height = timg.height; const eg = e.getContext('2d'); eg.drawImage(timg, 0, 0); terr8 = eg.getImageData(0, 0, e.width, e.height).data; }
    ground = new Ground(ground8, M.meta, M.rails, { terrain: terr8, elev: elev8, fields: M.fields, fences: M.fences, crossings: M.crossings, bridges: [M.props && M.props.railBridge, M.props && M.props.v764 && M.props.v764.underpass].filter(Boolean), pave: M.pave, lots: (M.props && M.props.v764 && M.props.v764.lots) || [], ewStairs: (M.props && M.props.v764 && M.props.v764.ew_stairs) || [] });
    buildings = new Buildings(M.buildings); buildings.ground = ground8; buildings.meta = M.meta; // v7.1 road reveal
    // statics: ported statue + gate stone
    const st = M.pois.find(p => p.k === 'statue' && p.name.includes('彭德怀'));
    if (st) statics.push({ spr: Props.legacySprite('statue'), x: st.x, y: st.y + 0.5, name: '彭德怀雕像', info: '彭德怀元帅骑马铜像，立于德怀楼前广场。' });
    if (st) statics.push({ spr: PropsV764.plaqueSprite(), x: st.x, y: st.y + 9.0, name: '中北大学 校名石', info: '德怀广场南沿的「中北大学」校名石（v7.6.4：改为正南北向、居中于彭德怀雕像中轴线）。', plaque: true });
    if (st) { // planters framing the statue (decor, not from OSM)
      for (const dx of [-7, -5.5, 5.5, 7]) for (const dy of [-1.2, 2.2]) M.trees.push([st.x + dx, st.y + dy, 4]);
      for (const dx of [-12, 12]) M.trees.push([st.x + dx, st.y + 1, 5]);
    }
    // v7 gates (item 14): only 一道门 / 1.5道门 / 七道门 / 北门 cross the perimeter wall and get a built gate. The other
    // "N道门" are student nicknames for road crossings: they keep their ground label (drawLabels) but no frame.
    const P7 = window.PropsV7, extraV7 = [];
    for (const g of M.wallGates || []) {
      if (g.kind === 'gate7' || g.kind === 'gate_n') { // gap in a N-S wall: two pillars north and south of the opening
        for (const [dy, plate] of [[-g.hw - 0.2, true], [g.hw + 0.3, true]]) { statics.push({ spr: P7.gatePillar(g.name, plate), x: g.x, y: g.y + dy, name: g.name, info: g.txt, nocol: true }); extraV7.push([g.x - 0.5, g.y + dy - 0.5, g.x + 0.5, g.y + dy + 0.1]); }
      } else statics.push({ spr: Props.gateSprite(g.name === '一道门' ? '中北大学 · 一道门' : g.name, Math.round(g.hw * T) - 4), x: g.x, y: g.y, name: g.name, info: g.txt, pillars: Math.round(g.hw * T) - 4 });
    }
    const PR = M.props || {};
    // v7.1: the willow stands in the middle of the widened 二道门 crossing (no collider: walk all the way round it)
    if (PR.willow) { const w = PR.willow, V = window.PropsV764; statics.push(V ? { willow: true, frames: [0, 1, 2, 3].map(k => V.willowSprite('summer', k)), spr: V.willowSprite('summer', 0), x: w.x, y: w.y, name: '二道门 · 大柳树', info: w.txt, col: V.WILLOW_COL(w.x, w.y), fade: true } : { spr: P7.willowSprite(), x: w.x, y: w.y, name: '二道门 · 大柳树', info: w.txt, nocol: true, fade: true }); } // v7.6.4: bespoke seasonal willow, trunk-only collider
    for (const f of PR.flags || []) statics.push({ frames: [0, 1, 2, 3].map(k => P7.flagSprite(k)), spr: P7.flagSprite(0), x: f.x, y: f.y, name: f.name, info: f.txt, hoist: /行知/.test(f.name || '') });
    for (const f of PR.fountains || []) statics.push({ frames: [0, 1, 2, 3].map(k => P7.fountainSprite(k)), spr: P7.fountainSprite(0), x: f.x, y: f.y, name: f.name, info: f.txt });
    const decals = window.__decals = [];
    if (PR.railPark) { const rp = PR.railPark, pf = rp.platform; // v7.1 铁路主题公园: a line of green coaches opposite 行知广场
      decals.push(g => P7.platformQuad(g, pf.x0 * T, pf.x1 * T, pf.y0a * T, pf.y1a * T, pf.h * T));
      for (const c of rp.cars) statics.push({ spr: P7.trainCar(c.k, c.x1 - c.x0, c.y1 - c.y0), x: c.x0, y: c.y0 + 0.3, name: c.k === 'loco' ? '内燃机车（车头）' : '25 型绿皮客车', info: rp.txt, nocol: true, fade: true, car: c });
      statics.push({ spr: P7.stationSign(rp.sign.name), x: rp.sign.x, y: rp.sign.y, name: rp.name, info: rp.txt });
      for (const q of rp.signals) statics.push({ spr: P7.signalSprite(), x: q.x, y: q.y, name: '信号机', info: rp.txt, nocol: true });
    }
    if (PR.heli) { const h = PR.heli; statics.push({ spr: P7.heliSprite(), x: h.x, y: h.y, name: h.name, info: h.txt, col: h.col, fade: true }); } // v7.2
    if (PR.boards) for (const q of PR.boards.items) statics.push({ spr: P7.boardSprite(q.title), x: q.x, y: q.y, name: '宣传展板 · ' + q.title, info: PR.boards.txt, board: true }); // v7.2
    if (PR.stairs) { const st = PR.stairs, sp = P7.stairsSprite((st.x1 - st.x0) * T, (st.y1 - st.y0) * T, st.treads, Core.STAIR_RISE, ((M.buildings.find(b => b.id === st.bid) || {}).door || [(st.x0 + st.x1) / 2])[0] * T - st.x0 * T); // v7.3 龙山餐厅
      STAIRS = st; statics.push({ spr: sp, x: st.x0, y: st.y0 + 0.02, name: st.name, nocol: true, stairs: true });
      extraV7.push([st.x0, st.y0, st.x0 + st.cheek, st.y1], [st.x1 - st.cheek, st.y0, st.x1, st.y1]); } // cheek walls
    if (PR.tank) { const tk = PR.tank; statics.push({ spr: P7.tankSprite(), x: tk.x, y: tk.y, name: tk.name, info: tk.txt }); }
    if (PR.bailin) { const bl = PR.bailin, gl = bl.gallery, pv = bl.pavilion, wl = bl.wall; // v7.6 柏林园: walk-through 长廊 + 凉亭 (roofs fade), 文化墙
      statics.push({ spr: P7.gallerySprite((gl.x1 - gl.x0) * T, (gl.y1 - gl.y0) * T), x: (gl.x0 + gl.x1) / 2, y: gl.y1, name: gl.name, info: gl.txt, nocol: true, fade: true, canopy: true });
      statics.push({ spr: P7.pavilionSprite(pv.w * T, pv.h * T), x: pv.x, y: pv.y, name: pv.name, info: pv.txt, nocol: true, fade: true, canopy: true });
      statics.push({ spr: P7.cultureWall(wl.w * T, '柏林园'), x: wl.x, y: wl.y, name: wl.name, info: wl.txt }); }
    if (PR.erlong) { const P9 = window.PropsV762; // v7.6.2 二龙山: the features on the mountain (gate, steles, 怡人台 凉亭, 碉堡, trail signs)
      for (const q of PR.erlong.items) { const base = { x: q.x, y: q.y, name: q.name, info: q.txt };
        if (q.kind === 'gate') statics.push(Object.assign(base, { spr: P9.parkGate(q.title), nocol: true, fade: true }));
        else if (q.kind === 'stele') statics.push(Object.assign(base, { spr: P9.steleSprite(q.title, q.big), col: [q.x - (q.big ? 0.7 : 0.45), q.y - 0.35, q.x + (q.big ? 0.7 : 0.45), q.y + 0.1] }));
        else if (q.kind === 'bunker') statics.push(Object.assign(base, { spr: P9.bunkerSprite(), col: [q.x - 1.0, q.y - 0.5, q.x + 1.0, q.y + 0.2] }));
        else if (q.kind === 'sign') statics.push(Object.assign(base, { spr: P9.signpost(q.title), nocol: true }));
        else if (q.kind === 'pavilion') statics.push(Object.assign(base, { spr: P7.pavilionSprite(q.w * T, q.h * T), nocol: true, fade: true, canopy: true })); } }
    if (PR.liuding) { const ld = PR.liuding; statics.push({ spr: P7.bustSprite(), x: ld.x, y: ld.y, name: ld.name, info: ld.txt, col: [ld.x - 0.7, ld.y - 0.6, ld.x + 0.7, ld.y + 0.15] }); }
    // v7.6.1: the N-S road runs on under a short rail bridge (deck sprite sorts after anyone on the road beneath it and
    // fades; only the abutments + low retaining walls block), the 地下停车场 south of 15号楼 and the 小树林 凉亭
    const P761 = window.PropsV761;
    if (PR.railBridge && P761) { const rb = PR.railBridge, bs = P761.railBridgeSprite(rb);
      statics.push({ spr: bs, x: rb.deck[0], y: bs.sortY, name: '南区铁路桥', info: rb.txt, nocol: true, fade: true, canopy: true, bridge: true });
      decals.push(g => P761.sunkenRoadDecal(g, rb)); for (const r of rb.abut.concat(rb.walls)) extraV7.push(r.slice()); }
    if (PR.garage && P761) { const gr = PR.garage, cp = gr.canopy;
      decals.push(g => P761.garageDecal(g, gr)); for (const r of gr.walls) extraV7.push(r.slice());
      statics.push({ spr: P7.canopySprite((cp[2] - cp[0]) * T, (cp[3] - cp[1]) * T), x: (cp[0] + cp[2]) / 2, y: cp[3], name: gr.name, info: gr.txt, nocol: true, fade: true, canopy: true });
      statics.push({ spr: P761.parkingSign(), x: gr.sign_xy[0], y: gr.sign_xy[1], name: gr.sign, info: gr.txt, col: [gr.sign_xy[0] - 0.3, gr.sign_xy[1] - 0.3, gr.sign_xy[0] + 0.3, gr.sign_xy[1] + 0.1] });
      for (const [vx, vy] of gr.vents) statics.push({ spr: P761.ventSprite(), x: vx, y: vy, name: '地下车库通风口', info: gr.txt, col: [vx - 0.55, vy - 0.55, vx + 0.55, vy + 0.1] }); }
    // v7.6.4: court nets (posts + mesh, y-sorted, block like a low wall), aircraft model, wheel sculpture, shop / works signs,
    // parked cars on the striped lots, the 七道门 underpass and the 行知广场 morning events
    const P764 = window.PropsV764, V4 = PR.v764 || {};
    if (P764) {
      const NETK = { tennis: [10.97, 23.77, 0.9, '网球场球网', 9], volleyball: [9, 18, 0.8, '排球网', 14], badminton: [6.1, 13.4, 0.5, '羽毛球网', 11] };
      for (const f of M.fields || []) { const nk = NETK[f.k]; if (!nk) continue;
        const vert = f.h >= f.w, m = Math.min(f.w, f.h) * 0.06, Wt = (vert ? f.w : f.h) - 2 * m, Lt = (vert ? f.h : f.w) - 2 * m, s = Math.min(Lt / nk[1], Wt / nk[0]);
        const half = (nk[0] / 2 + nk[2]) * s, cx = f.x + f.w / 2, cy = f.y + f.h / 2, info = f.sand ? (V4.volley || {}).txt : nk[3] + '：球网两头是钢立柱，人过不去，要绕着走。';
        if (vert) statics.push({ spr: P764.netSprite(2 * half * T, false, nk[4]), x: cx, y: cy + 0.06, name: f.sand ? '沙排球网' : nk[3], info, net: true, col: [cx - half - 0.1, cy - 0.12, cx + half + 0.1, cy + 0.12] });
        else statics.push({ spr: P764.netSprite(2 * half * T, true, nk[4]), x: cx, y: cy + half, name: nk[3], info, net: true, col: [cx - 0.12, cy - half - 0.1, cx + 0.12, cy + half + 0.1] }); }
      if (V4.plane) { const q = V4.plane; statics.push({ spr: P764.planeSprite(), x: q.x, y: q.y, name: q.name, info: q.txt, col: q.col }); }
      if (V4.wheel) { const q = V4.wheel; statics.push({ spr: P764.wheelSprite(), x: q.x, y: q.y, name: q.name, info: q.txt, col: q.col }); }
      if (V4.shop) { const q = V4.shop; statics.push({ spr: P764.signBoard(q.name, 'shop'), x: q.x, y: q.y, name: q.name, info: q.txt, nocol: true }); }
      if (V4.printing) { const q = V4.printing; statics.push({ spr: P764.signBoard(q.name, 'works'), x: q.x, y: q.y, name: q.name, info: q.txt, nocol: true }); }
      const lotSt = [];
      if (V4.lot) lotSt.push(...P764.stalls(V4.lot.r, V4.lot.rows, V4.lot.gap).map(s => Object.assign(s, { lot: V4.lot })));
      if (V4.xz) for (const L of V4.xz.lots) lotSt.push(...P764.stalls(L.r, V4.xz.rows).map(s => Object.assign(s, { lot: V4.xz })));
      if (lotSt.length) decals.push(g => P764.lotDecal(g, lotSt));
      for (const s of lotSt) if (s.car >= 0) { const cx = (s.x0 + s.x1) / 2, nose = s.side === 'n' ? 's' : 'n', y1 = s.y1 - 0.1;
        statics.push({ spr: P764.carSprite(s.car, nose), x: cx, y: y1, name: '停着的车', info: s.lot.txt || s.lot.name, car: true, col: [cx - 0.4, s.y0 + 0.15, cx + 0.4, y1] }); }
      window.__lotStalls = lotSt;
      if (V4.underpass && P761) { const u = Object.assign({ abut: [] }, V4.underpass), bs = P761.railBridgeSprite(u);
        statics.push({ spr: bs, x: u.deck[0], y: bs.sortY, name: u.name, info: u.txt, nocol: true, fade: true, canopy: true, bridge: true });
        decals.push(g => { P761.sunkenRoadDecal(g, u); P764.underpassDecal(g, u); }); for (const r of u.walls) extraV7.push(r.slice()); }
    }
    if (PR.grove) { const pv = PR.grove.pavilion; statics.push({ spr: P7.pavilionSprite(pv.w * T, pv.h * T), x: pv.x, y: pv.y, name: pv.name, info: pv.txt, nocol: true, fade: true, canopy: true }); }
    // v6 underpass portals (E to walk through). v7.1: an end shared by several passages (四道门's single south exit)
    // gets one pit; ends with a `canopy` rect get a long glass canopy over a stair ramp (ramp blocks, pit mouth stays open)
    const seenEnd = new Set();
    for (const ps of M.passages || []) for (const [end, other] of [['a', 'b'], ['b', 'a']]) {
      const e = ps[end], d = [e.x - e.out[0], e.y - e.out[1]], n = Math.hypot(d[0], d[1]) || 1, key = e.x + ',' + e.y, title = seenEnd.has(key) || end === 'b' ? (ps.title || ps.name) : ps.name;
      const spr = Props.portalSprite(title, [d[0] / n, d[1] / n]);
      if (seenEnd.has(key)) { portals.push({ p: ps, from: e, to: ps[other], spr, dup: true }); continue; } seenEnd.add(key);
      portals.push({ p: ps, from: e, to: ps[other], spr }); statics.push({ spr, x: e.x, y: e.y + spr.h / 2 + 0.2, name: title, portal: true });
      if (e.canopy) { const [cx0, cy0, cx1, cy1] = e.canopy, r = e.ramp;
        if (r) { decals.push(g => P7.rampDecal(g, r[0] * T, r[1] * T, r[2] * T, r[3] * T, Math.sign(r[0] + r[2] - 2 * e.x), e.split)); extraV7.push([r[0], r[1], r[2], r[3]]); }
        statics.push({ spr: P7.canopySprite((cx1 - cx0) * T, (cy1 - cy0) * T), x: (cx0 + cx1) / 2, y: cy1, name: title, nocol: true, fade: true, canopy: true });
      } else // v7 item 13: a big canopy over each underpass entrance
        statics.push({ spr: window.PropsV7.canopySprite(spr.w * T + 14, spr.h * T + 10), x: e.x, y: e.y + spr.h / 2 + 0.55, name: title, nocol: true, fade: true, canopy: true });
    }
    fencePcs = Props.fencePieces(M.fences); wallPcs = window.PropsV7.wallPieces(M.walls);
    const extra = extraV7.concat(Core.wallRects(M.walls)), extraS = statics.filter(s => !s.pillars && !s.portal && !s.nocol).map(s => s.col || [s.x - s.spr.ax / T + 0.3, s.y - 0.9, s.x + (s.spr.cv.width - s.spr.ax) / T - 0.3, s.y + 0.1]); // v7.2: col = body-only rect extra.push(...extraS);
    // trees: spatial buckets of 16x16 tiles
    treeGrid = new Map(); for (const t of M.trees) { const k = (t[0] >> 4) + ',' + (t[1] >> 4); (treeGrid.get(k) || treeGrid.set(k, []).get(k)).push(t); }
    lamps = Core.placeLamps(ground8, M.meta, M.buildings);
    { const r = M.props && M.props.railPlaza && M.props.railPlaza.rect; if (r) lamps = lamps.filter(l => !(l.x > r[0] && l.x < r[2] && l.y > r[1] && l.y < r[3] + 0.5)); }
    { const st = M.pois.find(p => p.k === 'statue' && p.name.includes('彭德怀')); // v7.6.4: 德怀广场 lamps on a grid mirrored about the statue's N-S axis
      if (st) { const sub = M.meta.sub, gw = M.meta.w * sub, cl = (x, y) => ground8[(Math.floor(y * sub) + 2) * gw + Math.floor(x * sub) + 2], R = DEHUAI_LAMPS.rect;
        const inR = l => l.x > R[0] && l.x < R[2] && l.y > R[1] && l.y < R[3];
        lamps = lamps.filter(l => !(l.kind === 'plaza' && inR(l) && cl(l.x - 0.5, l.y - 0.8) === Core.C.PLAZA));
        const ok = (x, y) => [-1, 0, 1].every(d => cl(x + d, y) === Core.C.PLAZA);
        for (const [dx, y] of DEHUAI_LAMPS.at) if (ok(st.x - dx, y) && ok(st.x + dx, y)) for (const x of [st.x - dx, st.x + dx]) lamps.push({ x, y, kind: 'plaza', grid: 'dehuai' }); } }
    doorList = M.buildings.filter(b => b.enter && b.door).map(b => ({ x: b.door[0], y: b.door[1], id: b.id }));
    for (const s of statics) if (s.pillars) { const hw = s.pillars / T; for (const dx of [-hw, hw]) extra.push([s.x + dx - 0.32, s.y - 0.4, s.x + dx + 0.32, s.y + 0.1]); }
    for (const pt of portals) { const w = pt.spr.w / 2 + 0.15, h = pt.spr.h / 2 + 0.15; extra.push([pt.from.x - w, pt.from.y - h, pt.from.x + w, pt.from.y + h]); }
    // v7.6: collision = the building BASE only (BUILDING cells of the ground raster = the real footprint at ground level).
    // The roof drawn lifted above it no longer blocks the ground north of the building (no roofShadow in collision).
    shadow = null;
    col = Core.buildCollision(ground8, M.meta, [], extra.concat(lamps.map(l => [l.x - 0.12, l.y - 0.15, l.x + 0.12, l.y]), Core.fenceRects(M.fences)), null);
    if (window.MapEdit) MapEdit.applyCol(col, M); // v7.7: 编辑器里的碰撞开关
    makeNPCs();
    minimap = makeMinimap(1); mapBig = minimap;
    $('minimap').width = 504; $('minimap').height = 360;
    // saved game (skipped when the URL pins a spot/time, ?nosave, or wiped with ?reset)
    if (Q.has('reset')) try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    let saved = null; if (!['x', 'y', 't', 'interior', 'nosave'].some(k => Q.has(k))) try { saved = Core.saveParse(localStorage.getItem(SAVE_KEY), M.meta); } catch (e) { }
    player.x = +(Q.get('x') || M.spawn[0]); player.y = +(Q.get('y') || M.spawn[1]); player.dir = 1;
    if (saved) { player.x = saved.x; player.y = saved.y; S.minutes = saved.minutes; if (!Q.has('zoom') && localStorage.getItem(ZOOM_KEY)) S.zoom = saved.zoom; S.quests = saved.quests; S.muted = saved.muted; S.loadedSave = true; } // v7.9.2: 存档里的缩放只在玩家自己捏合/按键设过之后才恢复
    if (Q.has('mute')) S.muted = true;
    // season: ?season= > saved choice (J) > real date (11月 = 秋, ginkgo gold); weather: ?weather= > saved choice (T) > daily roll
    S.seasonSet = Core.SEASONS.includes(Q.get('season')) ? Q.get('season') : saved && saved.season || null;
    S.weatherSet = Core.WEATHERS.includes(Q.get('weather')) ? Q.get('weather') : saved && saved.weather || null;
    applyWeather(true);
    Sound.setMuted(S.muted); S.lastBell = S.minutes;
    { const sp = freeSpot(player.x, player.y); if (sp) { player.x = sp[0]; player.y = sp[1]; } }
    if (Q.get('dir')) player.dir = +Q.get('dir');
    cam.x = player.x * T; cam.y = player.y * T;
    if (saved && saved.inside) { const b = M.buildings.find(b => b.id === saved.inside.from); if (b && Interiors.DEFS[saved.inside.key]) { enterInterior(saved.inside.key, b, true); if (saved.inside.x != null && !Core.rectBlocked(S.interior.col, saved.inside.x - 0.3, saved.inside.y - 0.35, saved.inside.x + 0.3, saved.inside.y) && (!S.interior.exit || saved.inside.y < S.interior.exit.y - 1)) { player.x = saved.inside.x; player.y = saved.inside.y; cam.x = player.x * IT; cam.y = player.y * IT; S.interior.stairLock = true; } } }
    if (Q.get('interior')) enterInterior(Q.get('interior'), M.buildings.find(b => b.enter === ({ main2: 'main', library2: 'library', canteen2: 'canteen' }[Q.get('interior')] || (Interiors.DEFS[Q.get('interior')] && Interiors.DEFS[Q.get('interior')].canteen ? 'canteen' : Q.get('interior'))) && (!Q.get('b') || b.name.includes(Q.get('b')))), true);
    if (Q.get('map') === '1') S.showMap = true;
    resize(); addEventListener('resize', resize);
    // warm the chunks around the start so the first frame is complete
    prewarm();
    $('loading').style.display = 'none';
    retargetNPCs(true);
    // idle-time prewarm of every building sprite, nearest first
    buildings.prewarmIdle(M.buildings.slice().sort((a, b) => Math.hypot(a.door[0] - player.x, a.door[1] - player.y) - Math.hypot(b.door[0] - player.x, b.door[1] - player.y)));
    renderQuests();
    if (!Q.has('nosave')) { setInterval(save, 5000); addEventListener('beforeunload', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); }); }
    if (S.loadedSave) toast('已读取存档：' + Core.clockText(Math.floor(S.minutes)), 2500);
    window.__game = { col: () => col, ground8: () => ground8, pinch: () => pinch, S, player, cam, M, npcs, lamps, buildings, ready: true, prewarm, teleport, enterInterior, exitInterior, save, toast, setZoom, interact, drawFrame: () => frame(performance.now(), true), step: dt => { update(dt); } };
    if (window.V77) V77.init({ M, S, player, npcs, ground8: () => ground8, col: () => col, toast, interact, save, setZoom, toggleQuests, toggleMute, cycleSeason, cycleWeather, statics, scale, cam, cv, freeSpot });
    if (window.V78) V78.init({ M, S, player, npcs, ground8: () => ground8, col: () => col, toast, interact, save, setZoom, toggleQuests, toggleMute, cycleSeason, cycleWeather, statics, scale, cam, cv, freeSpot, teleport, drawFrame: () => frame(performance.now(), true) });
    if (window.V79) V79.init({ M, S, player, npcs, ground8: () => ground8, col: () => col, toast, interact, save, setZoom, toggleQuests, toggleMute, cycleSeason, cycleWeather, statics, scale, cam, cv, freeSpot, teleport, drawFrame: () => frame(performance.now(), true) });
    if (S.mapOverride) toast('🗺 已载入地图编辑器的本地修改（编辑器里可「重置」；URL 加 ?pristine 临时查看原图）', 4000);
    requestAnimationFrame(loop);
  }
  function applyWeather(quiet) {
    const season = S.seasonSet || Core.seasonOf(new Date().getMonth()), weather = S.weatherSet || Core.weatherFor(season, Math.floor(S.minutes / 1440));
    if (season !== S.season) { S.season = season; Props.setSeason(season); ground.setSeason(season); buildings.setSeason(season); }
    if (weather !== S.weather) { S.weather = weather; if (!quiet) toast({ rain: '🌧 下雨了 —— 同学们撑起了伞', snow: '❄ 下雪了 —— 太原的冬天', clear: '☀ 雨停了，天晴' }[weather], 2500); }
  }
  function cycleSeason() { S.seasonSet = Core.cycle(Core.SEASONS, S.season); applyWeather(true); toast(`季节：${Core.SEASON_ZH[S.season]}${{ spring: '（嫩绿、桃花）', summer: '（浓荫）', autumn: '（银杏金黄、落叶）', winter: '（屋顶和草坪积雪）' }[S.season]}　J 切换`, 2200); save(); }
  function cycleWeather() { const L = ['auto', ...Core.WEATHERS], nx = L[(L.indexOf(S.weatherSet || 'auto') + 1) % L.length]; S.weatherSet = nx === 'auto' ? null : nx; applyWeather(true);
    toast(`天气：${Core.WEATHER_ZH[S.weather]}${S.weatherSet ? '' : '（自动，每天随机）'}　T 切换`, 2200); save(); }
  function img(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

  function makeNPCs() {
    const rnd = Core.mulberry(7); const want = 90; let tries = 0;
    while (npcs.length < want && tries++ < 20000) {
      const x = 120 + rnd() * 620, y = 150 + rnd() * 340;
      const c = ground8[(Math.floor(y * 4)) * M.meta.w * 4 + Math.floor(x * 4)];
      if (!(c === C.PATH || c === C.PLAZA || c === C.APRON || c === C.TRACK || c === C.COURT)) continue;
      if (Core.rectBlocked(col, x - 0.3, y - 0.3, x + 0.3, y)) continue;
      npcs.push({ x, y, r0: rnd(), r1: rnd(), r2: rnd(), dir: (rnd() * 4) | 0, frame: 0, anim: rnd() * 4, variant: Core.npcVariant(rnd(), sheetMeta.variants.length), t: rnd() * 3, moving: false, rnd: Core.mulberry(npcs.length + 99) });
    }
  }
  // ---------- daily schedule: where students head (Core.npcGoal) ----------
  function goalDoors(kind) {
    if (!goalDoors.c) { const c = goalDoors.c = { dorm: [], teach: [], canteen: [], library: [] };
      for (const b of M.buildings) { const k = b.special === 'main' || b.special === 'dehuai' || b.enter === 'classroom' ? 'teach' : b.k; if (c[k] && b.door) c[k].push(b); } }
    return goalDoors.c[kind] || [];
  }
  function spotNear(x, y, r0, r1, rnd) {
    for (let k = 0; k < 60; k++) { const a = rnd() * 6.283, r = r0 + rnd() * (r1 - r0), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      const c = ground8[Math.floor(py * 4) * M.meta.w * 4 + Math.floor(px * 4)];
      if (Core.PAVED.has(c) && c !== C.ROAD && !Core.rectBlocked(col, px - 0.3, py - 0.35, px + 0.3, py)) return [px, py]; }
    return null;
  }
  function onScreen(n, pad) { const [x0, y0, x1, y1] = viewRect(); const wx = n.x * T, wy = n.y * T; return wx > x0 - pad && wx < x1 + pad && wy > y0 - pad && wy < y1 + pad; }
  // v7.6.4: wander pool = road / plaza / path spots spread over the whole campus (built once)
  function wanderSpot(rnd) {
    if (!wanderSpot.pool) { const pool = wanderSpot.pool = [], r = Core.mulberry(31), gw = M.meta.w * 4, ok = new Set([C.ROAD, C.PLAZA, C.PATH, C.APRON]);
      for (let k = 0; k < 40000 && pool.length < 900; k++) { const x = 4 + r() * (M.meta.w - 8), y = 4 + r() * (M.meta.h - 8), c = ground8[Math.floor(y * 4) * gw + Math.floor(x * 4)];
        if (ok.has(c) && !Core.rectBlocked(col, x - 0.3, y - 0.35, x + 0.3, y) && !M.buildings.some(b => b.door && Math.hypot(b.door[0] - x, b.door[1] - y) < 6)) pool.push([x, y]); } }
    const p = wanderSpot.pool; return p.length ? p[Math.floor(rnd() * p.length)] : null;
  }
  function retargetNPCs(initial) {
    const goal = Core.npcGoal(S.minutes), share = Core.outdoorShare(S.minutes), key = goal + '|' + share;
    if (key === S.goalKey) return; S.goalKey = key; S.goal = goal;
    const rnd = Core.mulberry(Math.floor(S.minutes / 30) + 17);
    const plan = Core.npcPlan({ n: npcs.length, goal, share, buildings: M.buildings, rnd, spotNear: (x, y, a, b) => spotNear(x, y, a, b, rnd), wanderSpot: () => wanderSpot(rnd) });
    npcs.forEach((n, i) => { const e = plan[i]; if (!e) return;
      n.tgt = e.tgt; n.willHide = e.willHide; n.wander = !!e.wander; n.linger = !!e.linger;
      if (!initial && onScreen(n, 64)) { if (n.hidden && !n.willHide) n.hidden = false; return; } // on-screen people walk there for real
      n.x = e.pos[0]; n.y = e.pos[1]; n.hidden = e.hidden; });
    window.__npcPlan = plan;
  }
  // v7.6.4 trickle: now and then someone steps back out of an enterable door and wanders off
  function npcTrickle(dt) {
    S.trickleT = (S.trickleT || 0) - dt; if (S.trickleT > 0 || S.mode !== 'out') return; S.trickleT = 2.5;
    const hid = npcs.filter(n => n.hidden && n.tgt && n.tgt.b && Math.abs(n.tgt.x - player.x) < 40 && Math.abs(n.tgt.y - player.y) < 28);
    if (!hid.length || Math.random() < 0.4) return; const n = hid[Math.floor(Math.random() * hid.length)], d = n.tgt;
    n.x = d.x; n.y = d.y; n.hidden = false; n.willHide = false; n.wander = true;
    const t = spotNear(d.x, d.y, 10, 30, Math.random) || wanderSpot(Math.random); if (t) n.tgt = { x: t[0], y: t[1], b: null };
  }
  const MINI = { 0: '#9fb276', 1: '#7cb352', 2: '#4f8a3c', 3: '#a9ad5c', 4: '#7c7c84', 5: '#d8c39a', 6: '#e6dcc6', 7: '#5598d0', 8: '#55a64c', 9: '#bd5a45', 10: '#3f8a63', 11: '#909096', 12: '#8b7f72', 13: '#cdac78', 14: '#aaa096', 15: '#d0c8b2', 16: '#d98ab0', 17: '#837c72', 18: '#bdb7aa', 19: '#d9d2c2', 20: '#e3d1a0', 21: '#3f6b33', 22: '#8b7a5c' };
  function makeMinimap(scale) {
    const w = M.meta.w * scale, h = M.meta.h * scale, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const id = g.createImageData(M.meta.w, M.meta.h); const gw = M.meta.w * 4;
    for (let y = 0; y < M.meta.h; y++) for (let x = 0; x < M.meta.w; x++) { const k = ground8[(y * 4 + 2) * gw + x * 4 + 2], hx = MINI[k] || '#000', i = (y * M.meta.w + x) * 4; id.data[i] = parseInt(hx.slice(1, 3), 16); id.data[i + 1] = parseInt(hx.slice(3, 5), 16); id.data[i + 2] = parseInt(hx.slice(5, 7), 16); id.data[i + 3] = 255; }
    const tmp = document.createElement('canvas'); tmp.width = M.meta.w; tmp.height = M.meta.h; tmp.getContext('2d').putImageData(id, 0, 0);
    g.imageSmoothingEnabled = false; g.drawImage(tmp, 0, 0, w, h);
    if (terr8) { // v7.6.1 faint contours: one pixel wherever the DEM level changes (every 3 m)
      const gwS = M.meta.w * 4, ct = g.createImageData(M.meta.w, M.meta.h), lv = (x, y) => terr8[((y * 4 + 2) * gwS + x * 4 + 2) * 4];
      for (let y = 0; y < M.meta.h - 1; y++) for (let x = 0; x < M.meta.w - 1; x++) { const l = lv(x, y); if (!l) continue; const r = lv(x + 1, y), d = lv(x, y + 1);
        if ((r && r !== l) || (d && d !== l)) { const i = (y * M.meta.w + x) * 4, major = Math.max(l, r || l, d || l) % 5 === 0; ct.data[i] = 70; ct.data[i + 1] = 52; ct.data[i + 2] = 30; ct.data[i + 3] = major ? 120 : 70; } }
      const t2 = document.createElement('canvas'); t2.width = M.meta.w; t2.height = M.meta.h; t2.getContext('2d').putImageData(ct, 0, 0); g.drawImage(t2, 0, 0, w, h);
    }
    g.strokeStyle = '#5a2a1c'; g.lineWidth = Math.max(1, scale * 0.8); g.beginPath(); for (const w of M.walls || []) { g.moveTo(w[0] * scale, w[1] * scale); g.lineTo(w[2] * scale, w[3] * scale); } g.stroke();
    for (const b of M.buildings) { g.fillStyle = b.enter || b.entry ? '#d9733f' : b.roof === 'red' ? '#b24a34' : '#8d8f96'; g.beginPath(); b.poly.forEach(([x, y], i) => i ? g.lineTo(x * scale, y * scale) : g.moveTo(x * scale, y * scale)); g.closePath(); g.fill(); }
    return c;
  }
  addEventListener('orientationchange', () => setTimeout(resize, 120)); if (window.visualViewport) visualViewport.addEventListener('resize', () => resize());
  function resize() {
    const vv = window.visualViewport; const cssW = vv ? vv.width : innerWidth, cssH = vv ? vv.height : innerHeight;
    const coarse = window.InputMode ? InputMode.effectiveTouch() : !!(matchMedia('(pointer: coarse)').matches || /touch=1/.test(location.search) || document.body.classList.contains('touch'));
    const dpr = (window.V79Core ? V79Core.capDpr(window.devicePixelRatio || 1, coarse) : Math.min(window.devicePixelRatio || 1, coarse ? 2 : 4));
    cv.width = Math.max(1, Math.floor(cssW * dpr)); cv.height = Math.max(1, Math.floor(cssH * dpr));
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px'; S.dpr = dpr;
  }
  function scale() { return (S.mode === 'in' ? Math.max(1, S.zoom - 1) : S.zoom) * S.dpr; }
  function viewRect() { const s = scale(), w = cv.width / s, h = cv.height / s; return [cam.x - w / 2, cam.y - h / 2, cam.x + w / 2, cam.y + h / 2]; }
  function prewarm() { if (S.mode !== 'out') return; clampCam(); const [x0, y0, x1, y1] = viewRect(), s = scale();
    if (s < 1) { const ox = Math.round(cv.width / 2 - cam.x * s), oy = Math.round(cv.height / 2 - cam.y * s), fv = farView(s, ox, oy);
      for (let cy = fv.cy0; cy <= fv.cy1; cy++) for (let cx = fv.cx0; cx <= fv.cx1; cx++) ground.farChunk(s, cx, cy, bakeTrees);
      for (const [, sp] of buildings.visible(x0, y0, x1, y1 + 120, 1e9)) buildings.lod(sp, s); return; } for (let cy = Math.floor(y0 / 512); cy <= Math.floor(y1 / 512); cy++) for (let cx = Math.floor(x0 / 512); cx <= Math.floor(x1 / 512); cx++) ground.chunk(cx, cy); buildings.visible(x0, y0, x1, y1 + 120, 1e9); }
  function teleport(x, y) { player.x = x; player.y = y; cam.x = x * T; cam.y = y * T; prewarm(); }
  function clampCam() {
    const s = scale(), hw = cv.width / s / 2, hh = cv.height / s / 2;
    const W = S.mode === 'out' ? M.meta.w * T : S.interior.W * IT, H = S.mode === 'out' ? M.meta.h * T : S.interior.H * IT;
    cam.x = W < hw * 2 ? W / 2 : Math.max(hw, Math.min(W - hw, cam.x)); cam.y = H < hh * 2 ? H / 2 : Math.max(hh, Math.min(H - hh, cam.y));
  }

  // ---------- input ----------
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); S.keys.add(k); Sound.unlock();
    if (S.quiz) { if (k >= '1' && k <= '4') answerQuiz(+k - 1); if (k === 'escape') { S.quiz = null; renderQuiz(); } if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); return; }
    if (k === 'e' || k === ' ' || k === 'enter') interact();
    if (k === 'm') S.showMap = !S.showMap;
    if (k === '+' || k === '=') setZoom(Core.zoomStep(S.zoom, 1));
    if (k === '-' || k === '_') setZoom(Core.zoomStep(S.zoom, -1));
    if (k === 'q') toggleQuests();
    if (k === 'v') toggleMute();
    if (k === 'n') S.minutes += 60;
    if (k === 'j') cycleSeason();
    if (k === 't') cycleWeather();
    if (window.V78 && V78.key(k, e)) { e.preventDefault(); return; } // v7.8: Z 沉浸 · P 拍照 · Y 地标
    if (window.V77 && V77.key(k, e)) { e.preventDefault(); return; } // v7.7: B 骑车 / 还车 · K 成就 · Tab 菜单
    if (k === 'escape') { S.showMap = false; S.dialog = null; }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  });
  addEventListener('keyup', e => S.keys.delete(e.key.toLowerCase()));
  addEventListener('pointerdown', () => Sound.unlock());
  addEventListener('wheel', e => { if (S.showMap) return; setZoom(Core.zoomStep(S.zoom, e.deltaY < 0 ? 1 : -1)); }, { passive: true });
  function setZoom(z) { if (z === S.zoom) return; S.zoom = z; try { localStorage.setItem(ZOOM_KEY, String(z)); } catch (e) {} if (z < 1 && S.mode === 'out') toast(z === 0.25 ? '鸟瞰 0.25× —— 整个校园' : '缩小 0.5×', 1200); }
  function toggleMute() { S.muted = !S.muted; Sound.setMuted(S.muted); $('mute').textContent = S.muted ? '🔇' : '🔊'; toast(S.muted ? '声音已关闭（V 打开）' : '声音已打开', 1200); save(); }
  $('mute').addEventListener('click', e => { e.stopPropagation(); Sound.unlock(); toggleMute(); });
  $('quests').addEventListener('click', toggleQuests);
  // indoors the panel folds to its title (rooms are wide) unless opened there with Q
  function questsOpen() { return S.mode === 'in' ? S.qInside : S.showQuests; }
  function toggleQuests() { if (S.mode === 'in') S.qInside = !S.qInside; else S.showQuests = !S.showQuests; renderQuests(); }
  function today() { return Core.questsForDay(S.quests.day != null ? S.quests.day : Math.floor(S.minutes / 1440)); }
  // ---------- 302 高数小测 ----------
  function startQuiz() {
    S.quiz = { qs: Core.quizForDay(S.quests.day || 0), i: 0, right: 0, fb: null }; S.quizArmed = false; Sound.chime && Sound.chime(); renderQuiz();
  }
  function answerQuiz(k) {
    const z = S.quiz; if (!z || z.fb) return; const q = z.qs[z.i], ok = k === q.a; if (ok) z.right++;
    z.fb = { k, ok }; renderQuiz();
    setTimeout(() => { if (S.quiz !== z) return; z.fb = null; z.i++;
      if (z.i < z.qs.length) { renderQuiz(); return; }
      S.quiz = null; renderQuiz();
      if (z.right >= Core.QUIZ_PASS) { S.action = 'quiz'; S.dialog = `🔔 下课！小测答对 ${z.right}/${z.qs.length}，老师点头：「这节课的内容大家掌握得不错。」`; }
      else { S.dialog = `小测只答对 ${z.right}/${z.qs.length} …… 老师：「课后再看看课本。」（离开座位再坐回来可以重做）`; }
    }, ok ? 700 : 1500);
  }
  function renderQuiz() {
    const el = $('quiz'); if (!el) return; const z = S.quiz; el.style.display = z ? 'block' : 'none'; if (!z) return;
    const q = z.qs[z.i];
    el.innerHTML = `<div class="title">📐 高数小测 · 第 ${z.i + 1}/${z.qs.length} 题 <span class="small">（按 1–4 或点击 · Esc 放弃）</span></div><div class="qq">${q.q}</div>`
      + q.o.map((o, k) => `<button class="opt${z.fb && k === q.a ? ' right' : ''}${z.fb && k === z.fb.k && !z.fb.ok ? ' wrong' : ''}" data-k="${k}">${'ABCD'[k]}. ${o}</button>`).join('')
      + `<div class="fb">${z.fb ? (z.fb.ok ? '✔ 正确！' : `✘ 正确答案是 ${'ABCD'[q.a]}`) : `已答对 ${z.right} 题`}</div>`;
    for (const b of el.querySelectorAll('button')) { const go = e => { e.preventDefault(); e.stopPropagation(); answerQuiz(+b.dataset.k); }; b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('mousedown', go); }
  }
  function toast(text, ms) { S.toast = { text, until: performance.now() + (ms || 3000) }; }
  function renderQuests() {
    const el = $('qlist'); if (!el) return; const open = questsOpen(); renderQuests.mode = S.mode; $('quests').classList.toggle('min', !open);
    const list = today(), n = list.filter(q => S.quests.done[q.id] != null).length, dayN = (S.quests.day != null ? S.quests.day : Math.floor(S.minutes / 1440)) + 1;
    $('quests').querySelector('.qt').innerHTML = `第 ${dayN} 天 · 今日任务 ${n}/${list.length} <span class="small">（Q ${open ? '收起' : '展开'}）</span>`;
    const log = (S.quests.log || []).slice(-4);
    el.innerHTML = list.map(q => { const d = S.quests.done[q.id] != null; return `<div class="q${d ? ' done' : ''}">${d ? '[√]' : '[ ]'} ${q.text}<span class="w">${q.where}</span></div>`; }).join('')
      + (log.length ? `<div class="qlog">📅 进度：${log.map(e => `第${e.d}天 ${e.n}/${e.t}${e.n === e.t ? '★' : ''}`).join(' · ')}</div>` : '');
  }
  function save() {
    if (Q.has('nosave') || !M) return;
    const fromB = S.mode === 'in' && S.interior.from;
    const out = fromB ? { x: fromB.door[0], y: fromB.door[1] + 1.4 } : { x: player.x, y: player.y };
    try { localStorage.setItem(SAVE_KEY, Core.saveSerialize({ ...out, minutes: S.minutes, zoom: S.zoom, muted: S.muted, quests: S.quests, season: S.seasonSet, weather: S.weatherSet, savedAt: Date.now(),
      inside: fromB ? { key: S.interior.key, from: fromB.id, x: player.x, y: player.y } : null })); } catch (e) { }
  }
  addEventListener('blur', () => S.keys.clear());
  $('bigmap').addEventListener('click', e => { // click on full map to fast-travel
    if (S.mode !== 'out') return; const r = $('bigmap').getBoundingClientRect();
    const tx = (e.clientX - r.left) / r.width * M.meta.w, ty = (e.clientY - r.top) / r.height * M.meta.h;
    const spot = freeSpot(tx, ty); if (spot) { teleport(spot[0], spot[1]); S.showMap = false; }
  });
  // v7.6.4 C: mouse hover tooltip — short sourced description per building / landmark (data/tooltips.js; 未核实 when unsourced)
  const hoverAt = (tx, ty) => { // tx,ty in tiles; the drawn sprite covers footprint + the wall rising north of it
    let best = null, bd = 1.5;
    for (const b of M.buildings) { if (!b.name || b.porch || !b.poly) continue; const [x0, y0, x1, y1] = b.bbox, h = Core.wallHeight(b) / T;
      if (tx < x0 - 0.2 || tx > x1 + 0.2 || ty < y0 - h - 0.2 || ty > y1 + 0.2) continue;
      for (let k = 0; k <= h + 0.01; k += 0.5) if (Core.inPoly(b.poly, tx, ty + k)) return b; }
    for (const p of [...(M.pois || []), ...(M.spots || [])]) { if (!p.name) continue; const d = Math.hypot((p.x ?? p.at?.[0]) - tx, (p.y ?? p.at?.[1]) - ty); if (d < bd) { bd = d; best = p; } }
    return best;
  };
  window.__hoverAt = hoverAt;
  cv.addEventListener('mousemove', e => {
    const el = $('tip'); if (!el) return; const TT = window.NUC_TIPS;
    // 触屏壳下仅混合模式（外接鼠标）或强制电脑模式显示悬停介绍
    if (window.InputMode && InputMode.effectiveTouch() && !InputMode.hybrid()) { el.classList.remove('on'); return; }
    if (S.mode !== 'out' || S.showMap || !TT) { el.classList.remove('on'); return; }
    const r = cv.getBoundingClientRect(), s = scale(), px = (e.clientX - r.left) * cv.width / r.width, py = (e.clientY - r.top) * cv.height / r.height;
    const ox = Math.round(cv.width / 2 - cam.x * s), oy = Math.round(cv.height / 2 - cam.y * s);
    const b = hoverAt((px - ox) / s / T, (py - oy) / s / T), tip = b && TT.tipFor(b.name);
    if (!tip) { el.classList.remove('on'); return; }
    if (el.dataset.n !== b.name) { el.dataset.n = b.name;
      const src = (tip.s || []).map(k => TT.SRC[k]).filter(Boolean).map(u => u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]);
      el.innerHTML = '<b></b><div class="tt"></div><div class="ts"></div>';
      el.children[0].textContent = b.name; el.children[1].textContent = tip.t;
      el.children[2].textContent = (tip.v ? '' : '（未核实）') + (src.length ? '来源：' + [...new Set(src)].join('、') : ''); }
    const W = window.innerWidth, x = e.clientX + 16, y = e.clientY + 18;
    el.style.left = Math.min(x, W - 300) + 'px'; el.style.top = Math.min(y, window.innerHeight - 120) + 'px'; el.classList.add('on');
  });
  cv.addEventListener('mouseleave', () => { const el = $('tip'); if (el) el.classList.remove('on'); });
  cv.addEventListener('touchstart', () => { const el = $('tip'); if (el) el.classList.remove('on'); }, { passive: true });
  function freeSpot(tx, ty) { for (let r = 0; r < 30; r += 0.5) for (let a = 0; a < 6.28; a += 0.5) { const x = tx + Math.cos(a) * r, y = ty + Math.sin(a) * r; if (!Core.rectBlocked(col, x - 0.35, y - 0.4, x + 0.35, y)) return [x, y]; } return null; }
  // touch: virtual stick (drag anywhere), tap = E, two-finger pinch = zoom (Core.pinchStep, re-based after each step)
  let touch = null, pinch = null;
  const spread = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  cv.addEventListener('touchstart', e => { Sound.unlock();
    if (e.touches.length >= 2) { touch = null; pinch = { d: spread(e), used: false }; }
    else if (!pinch) { const t = e.touches[0]; touch = { x0: t.clientX, y0: t.clientY, dx: 0, dy: 0 }; }
    e.preventDefault(); }, { passive: false });
  cv.addEventListener('touchmove', e => {
    if (pinch && e.touches.length >= 2) { const d = spread(e), st = Core.pinchStep(pinch.d, d); if (st && !S.showMap) { const z = Core.zoomStep(S.zoom, st); if (z !== S.zoom) setZoom(z); pinch.d = d; pinch.used = true; } }
    else if (touch) { const t = e.touches[0]; touch.dx = t.clientX - touch.x0; touch.dy = t.clientY - touch.y0; }
    e.preventDefault(); }, { passive: false });
  cv.addEventListener('touchend', e => { if (pinch) { if (e.touches.length === 0) pinch = null; return; } if (touch && Math.hypot(touch.dx, touch.dy) < 8) { // v7.7: 轻点 = 查看（代替鼠标悬停提示），没东西可看才互动
      const t = e.changedTouches && e.changedTouches[0]; if (!(window.V77 && t && V77.tapInspect(t.clientX, t.clientY))) interact(); } touch = null; });
  cv.addEventListener('touchcancel', () => { touch = null; pinch = null; });

  { // on-screen E button for touch screens (also forced with ?touch=1)
    const eb = $('ebtn'); if (eb) { if (window.InputMode ? InputMode.effectiveTouch() : (Q.get('touch') || matchMedia('(pointer: coarse)').matches)) eb.style.display = 'flex';
      const go = e => { e.preventDefault(); e.stopPropagation(); interact(); }; eb.addEventListener('touchstart', go, { passive: false }); eb.addEventListener('mousedown', go); }
  }
  function interact() {
    if (S.dialog) { S.dialog = null; return; }
    if (S.fadeDir) return;
    const h = S.hint; if (!h) return;
    if (window.V77 && V77.interact(h)) return;
    if (h.kind === 'door') fadeTo(() => enterInterior(h.b.enter, h.b));
    else if (h.kind === 'info') S.dialog = h.info;
    else if (h.kind === 'pass') fadeTo(() => { const sp = freeSpot(h.pa.to.out[0], h.pa.to.out[1]) || h.pa.to.out; teleport(sp[0], sp[1]); Sound.step && Sound.step(); });
    else if (h.kind === 'talk') talkTo(h.n);
    else if (h.kind === 'stairs') fadeTo(h.go);
    else if (h.kind === 'buy') {
      S.action = 'eat'; S.dish = h.dish; const one = /文瀛食堂|一食堂/.test(S.interior.from ? S.interior.from.name : '');
      const nm = S.interior.from ? S.interior.from.name : '';
      S.dialog = DISH2[h.dish] ? DISH2[h.dish] : h.dish === '刀削面' && nm === '食味坊' ? '「师傅，来一碗老大同刀削面！」—— 2024 年「我最喜爱的菜品」评选第一名，面片薄、筋道，再淋一勺老陈醋。' : h.dish === '刀削面' ? (one ? '「师傅，来一碗刀削面！」—— 面片薄、筋道，再淋一勺老陈醋。' : '「刀削面今天卖完啦，去食味坊吃老大同刀削面吧！」') : `你买了一份${h.dish}，刷卡「嘀」的一声。`;
    } else if (h.kind === 'borrow') { S.action = 'borrow'; S.dialog = '借还处的老师扫了一下校园卡：「借期 30 天，记得按时还哦。」'; }
  }
  const DISH2 = { // 二楼小炒 / 特色窗口: 太原 local dishes
    '过油肉': '「一份过油肉！」—— 太原名菜，肉片滑嫩，蒜苗木耳，出锅前一勺老陈醋。',
    '小炒盖饭': '小炒窗口现点现炒，师傅颠勺，火苗窜起老高。「番茄炒蛋盖饭，好嘞！」',
    '莜面栲栳栳': '特色窗口的莜面栲栳栳 —— 蒸笼里一卷卷像蜂窝，蘸羊肉汤吃。',
    '羊杂割': '一碗热乎乎的羊杂割，撒上香菜和辣椒，冬天喝一口浑身都暖了。',
    // v7.6.4 D: 文瀛 二层 风味餐厅 dishes as listed by 后勤管理部 (hqfw.nuc.edu.cn/info/1015/7601.htm, 2024-10-30)
    '翘脚牛肉面': '风味餐厅的翘脚牛肉面 —— 香辣浓郁，牛肉片铺满一碗。',
    '非遗砂锅': '油泼砂锅豆腐咕嘟咕嘟冒泡，冬天来一口砂锅，暖和整个冬天。',
    '烤鸭拌饭': '金黄的烤鸭配白米饭，再浇一勺酱汁。',
    '酸菜鱼': '酸菜鱼酸辣鲜嫩，汤都想喝完。',
    '煮馍': '骨汤菌菇煮馍，汤鲜味浓，馍筋肉香。',
    '百特西餐': '百特中西餐厅：来一份简餐，换换口味。',
    '韩式快餐': '三层特色餐厅的韩式快餐窗口，石锅拌饭滋滋作响。',
    '自选快餐': '自选窗口按菜计价，荤素搭配自己挑。',
    '大众套餐': '一荤两素一份米饭，刷卡「嘀」的一声，实惠。',
  };
  // short campus-life lines (no real named people); picked by where you are, cycling per NPC
  const LINES = {
    out: ['今天的晚霞真好看，待会儿去二龙山走走吧。', '图书馆占座要趁早哦。', '文瀛食堂和食味坊，你更喜欢哪个？', '下午有体育课，记得去体育馆。', '彭德怀雕像那边很适合拍照。', '期末周快到了，复习得怎么样？', '听说主楼二层有校史展廊。', '早上路上人多，骑车慢一点。', '快递到了，我去生活服务中心取。'],
    canteen: ['刀削面要加醋才地道！', '这个点人少，不用排队。', '麻辣烫我要微辣。', '饭卡余额不多了，得去充值。', '吃完记得把餐盘送回去。'],
    classroom: ['这道题没听懂，下课去问问老师。', '帮我占个前排的座位！', '高数作业明天就要交了。', '实验报告写完了吗？', '上课别玩手机哦。'],
    dorm: ['熄灯前记得把阳台的衣服收了。', '室友打呼噜，我只好戴耳塞。', '周末一起去打球吗？', '热水壶借我用一下？', '宿舍楼下新开了一家奶茶店。'],
    gym: ['来一局三对三？', '投篮要靠手腕发力。', '体测跑一千米好累……', '换上球鞋再上场，别踩脏地板。', '晚上馆里有院系篮球赛。'],
    library: ['嘘——这里要安静。', '这本书借期快到了，得续借。', '楼上自习区还有空位。', '查论文可以用电子数据库。'],
    main: ['主楼是学校的地标。', '二层正在展出校史。', '这里的地板擦得好亮。', '从太行山走来的学校，历史可真长。'],
  };
  function talkTo(n) {
    const ctxKey = S.mode === 'out' ? 'out' : S.interior.def.canteen ? 'canteen' : ({ main2: 'main', canteen2: 'canteen', library2: 'library' }[S.interior.key] || S.interior.key), pool = LINES[ctxKey] || LINES.out;
    if (n.line == null) n.line = Math.floor(Core.hash2(Math.round(n.x * 7), Math.round(n.y * 13)) * pool.length); else n.line++;
    S.dialog = `同学：「${pool[n.line % pool.length]}」`;
    if (!n.seated) { const dx = player.x - n.x, dy = player.y - n.y; n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); n.moving = false; n.t = 4; }
  }
  function fadeTo(cb) { S.fadeDir = 1; S.fadeCb = cb; }
  function enterInterior(key, b, instant, arriveOn) {
    key = Interiors.canteenKey ? Interiors.canteenKey(key, b && b.name) : key; // v7.6.4 D: each canteen has its own floors
    if (S.quiz) { S.quiz = null; renderQuiz(); }
    const it = Interiors.render(key, b ? b.name : null); it.key = key; it.from = b; it.col = Core.interiorGrid(it.def);
    const doors = Core.findChar(it.def, 'D');
    it.exit = doors.length ? { x: doors.reduce((a, d) => a + d[0], 0) / doors.length + 0.5, y: doors[0][1] } : null;
    const at = arriveOn ? Core.stairArrival(it.def, arriveOn) : it.exit ? { x: it.exit.x, y: it.exit.y - 0.6 } : Core.stairArrival(it.def, 'V');
    S.interior = it; S.mode = 'in'; player.x = at.x; player.y = at.y; player.dir = arriveOn ? 0 : 1; it.stairLock = !!arriveOn;
    it.people = makeInteriorPeople(it);
    cam.x = player.x * IT; cam.y = player.y * IT; if (instant) S.fade = 0;
  }
  function exitInterior() {
    if (S.quiz) { S.quiz = null; renderQuiz(); }
    const b = S.interior.from; S.mode = 'out'; S.interior = null;
    if (b) { const sp = freeSpot(b.door[0], b.door[1] + 1.4) || [b.door[0], b.door[1] + 1.4]; teleport(sp[0], sp[1]); }
    player.dir = 0;
  }
  function makeInteriorPeople(it) {
    const out = [], rnd = Core.mulberry(it.def.map.length * 31 + it.W + Math.floor(S.minutes / 30));
    const crowd = it.def.canteen ? Core.mealCrowd(S.minutes) * [1, 0.7, 0.5][Math.min(2, it.def.canteen - 1)] : null, seatRate = crowd != null ? 0.1 + 0.78 * crowd : 0.35, walkers = crowd != null ? 2 + Math.round(8 * crowd) : 5;
    if (crowd != null && crowd >= 0.5) for (const [x, y] of Core.findChar(it.def, 'C')) if (it.def.map[y + 1][x] === '.' && rnd() < crowd * 0.75) out.push({ x: x + 0.5, y: y + 1.75, dir: 1, variant: Core.npcVariant(rnd(), sheetMeta.variants.length), frame: 0, queue: true });
    it.crowd = crowd;
    for (const [x, y] of Core.findChar(it.def, 'h')) if (rnd() < seatRate) out.push({ x: x + 0.5, y: y + 0.75, dir: (() => { const m = it.def.map, isT = (xx, yy) => m[yy] && 'TL'.includes(m[yy][xx]); return isT(x + 1, y) ? 3 : isT(x - 1, y) ? 2 : isT(x, y + 1) ? 0 : 1; })(), variant: Core.npcVariant(rnd(), sheetMeta.variants.length), frame: 0, seated: true });
    for (let i = 0; i < walkers; i++) { for (let k = 0; k < 50; k++) { const x = 1 + rnd() * (it.W - 2), y = 3 + rnd() * (it.H - 4); if (!Core.rectBlocked(it.col, x - 0.4, y - 0.4, x + 0.4, y)) { out.push({ x, y, dir: (rnd() * 4) | 0, variant: Core.npcVariant(rnd(), sheetMeta.variants.length), frame: 0, anim: 0, t: rnd() * 2, rnd: Core.mulberry(i + 5) }); break; } } }
    return out;
  }

  // ---------- update ----------
  const FLAGC = [];
  function update(dt) {
    if (window.V79 && V79.paused && V79.paused()) return;
    S.minutes += dt / 0.7; // one game minute every 0.7 s
    { // class bells
      const bells = Core.bellsBetween(S.lastBell, S.minutes, ({ summer: 'summer', winter: 'winter' })[Q.get('bells')] || Core.bellSchedule(new Date().getMonth() + 1, new Date().getDate())); S.lastBell = S.minutes;
      if (bells.length && bells.length < 4) { const b = bells[bells.length - 1]; toast(`🔔 ${Core.clockText(b.at).split(' ').pop()} ${b.kind === '晚自习' ? '晚自习铃' : b.kind + '铃'}${b.kind === '下课' ? ' —— 同学们涌出教学楼' : ''}`, 3500); Sound.bell(b.kind); }
    }
    if (S.mode === 'out') retargetNPCs(false);
    npcTrickle(dt);
    { const V764U = M.props && M.props.v764; if (window.PropsV764 && V764U) { // v7.6.4: 06:00-07:00 教官大队 drill, 07:00 flag guard, flag hoist level
      const P = window.PropsV764, m = ((S.minutes % 1440) + 1440) % 1440;
      window.__morning = V764U.drill ? P.drillPeople(V764U.drill, m).concat(V764U.guard ? P.guardPeople(V764U.guard, m) : []) : [];
      const lv = Math.round(P.flagHoist(m) * 12);
      for (const st of statics) if (st.hoist && st.hoistLv !== lv) { st.hoistLv = lv; st.frames = (FLAGC[lv] = FLAGC[lv] || [0, 1, 2, 3].map(k => window.PropsV7.flagSprite(k, lv / 12))); st.spr = st.frames[0]; } } }
    if (window.PropsV764) for (const st of statics) if (st.willow && st.season !== S.season) { st.season = S.season; st.frames = [0, 1, 2, 3].map(k => window.PropsV764.willowSprite(S.season, k)); st.spr = st.frames[0]; } // v7.6.4 seasonal willow
    { const dk = Core.dormDark(S.minutes) >= 1; if (dk && !S.wasDark && S.mode === 'in' && S.interior.key === 'dorm' && Core.dormDark(S.minutes - 2) < 1) toast('🌙 23:00 熄灯了 —— 宿舍一下子暗下来，只剩台灯和手机的光', 4000); S.wasDark = dk; }
    if (S.fadeDir) { S.fade += S.fadeDir * dt * 3.2; if (S.fade >= 1) { S.fade = 1; S.fadeDir = -1; const cb = S.fadeCb; S.fadeCb = null; if (cb) cb(); } else if (S.fade <= 0) { S.fade = 0; S.fadeDir = 0; } }
    let ix = 0, iy = 0; const K = S.keys;
    if (K.has('a') || K.has('arrowleft')) ix -= 1; if (K.has('d') || K.has('arrowright')) ix += 1;
    if (K.has('w') || K.has('arrowup')) iy -= 1; if (K.has('s') || K.has('arrowdown')) iy += 1;
    if (touch && Math.hypot(touch.dx, touch.dy) > 12 && !(window.V78 && V78.frozen && V78.frozen())) { ix = touch.dx; iy = touch.dy; }
    { const js = window.V77 && V77.stick(); if (js && !(window.V78 && V78.frozen && V78.frozen())) { ix = js.x; iy = js.y; } } // v7.7 虚拟摇杆；拍照时不走摇杆
    const L = Math.hypot(ix, iy); const grid = S.mode === 'out' ? col : S.interior.col;
    player.wantMove = L > 0;
    player.moving = L > 0 && !S.dialog && !S.quiz && S.fadeDir === 0 && !S.showMap && !(window.V78 && V78.frozen());
    if (player.moving) {
      ix /= L; iy /= L;
      const sp = (window.V77 && V77.riding() ? V77.BIKE_SPEED * (K.has('shift') ? 1.2 : 1) : K.has('shift') ? 9 : 5) * (S.mode === 'in' ? 0.8 : Core.slopeFactor(terr8, M.meta.w * M.meta.sub, M.meta.sub, player.x, player.y, ix, iy)) * dt; // v7.6.1: slower uphill on ramps
      player.dir = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 2 : 3) : (iy < 0 ? 1 : 0);
      const p = window.V77 && V77.riding() && S.mode === 'out' ? V77.rideMove(grid, player, ix * sp, iy * sp) : Core.moveBox(grid, player, ix * sp, iy * sp, 0.3, 0.35); player.x = p.x; player.y = p.y;
      player.anim += dt * (K.has('shift') ? 12 : 8);
    } else player.anim = 0;
    { const f = player.moving ? (Math.floor(player.anim) % 4) : 0;
      if (player.moving && f !== player.frame && (f === 1 || f === 3)) Sound.step(surfaceAt(), K.has('shift'));
      player.frame = f; }
    // NPCs
    const list = S.mode === 'out' ? npcs : S.interior.people;
    for (const n of list) {
      if (n.seated || n.queue || n.hidden) continue;
      if (S.mode === 'out' && (Math.abs(n.x - player.x) > 60 || Math.abs(n.y - player.y) > 40)) continue;
      n.t -= dt; if (n.t <= 0) {
        const g = S.mode === 'out' && n.tgt, dx = g ? n.tgt.x - n.x : 0, dy = g ? n.tgt.y - n.y : 0, far = Math.hypot(dx, dy);
        if (g && far < 2.5 && n.willHide) { n.hidden = true; continue; } // went inside
        if (g && far < 3 && n.wander && wanderSpot.pool) { const t = wanderSpot(n.rnd); if (t) n.tgt = { x: t[0], y: t[1], b: null }; } // v7.6.4 wanderers pick a new spot
        if (g && far > 3 && n.rnd() < 0.72) { // stroll toward the goal building
          const horiz = n.rnd() < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy)); n.dir = horiz ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); n.moving = true; n.t = 0.8 + n.rnd() * 1.6;
        } else { n.moving = n.rnd() < 0.65; n.dir = (n.rnd() * 4) | 0; n.t = 1 + n.rnd() * 3; }
      }
      if (n.moving) {
        const v = [[0, 1], [0, -1], [-1, 0], [1, 0]][n.dir], sp = (n.bike ? 4.6 : 2.2) * dt; // v7.7: 骑共享电动车的同学更快，只走道路
        const nx = n.x + v[0] * sp, ny = n.y + v[1] * sp, cNext = ground8[Math.floor(ny * 4) * M.meta.w * 4 + Math.floor(nx * 4)];
        const okClass = S.mode === 'in' || (n.bike ? window.V77Core.RIDE.has(cNext) : Core.PAVED.has(cNext));
        if (okClass && !Core.rectBlocked(grid, nx - 0.3, ny - 0.35, nx + 0.3, ny) && Math.hypot(nx - player.x, ny - player.y) > 0.8) { n.x = nx; n.y = ny; n.anim += dt * 7; }
        else { n.moving = false; n.t = 0.3; }
      }
      n.frame = n.moving ? Math.floor(n.anim) % 4 : 0;
    }
    // interaction hints
    S.hint = null;
    if (S.mode === 'out') {
      const b = Core.nearestBuilding(M.buildings, player.x, player.y, 2.6);
      if (b) S.hint = { kind: 'door', b, text: `按 E 进入「${b.name}」` };
      else { const pa = Core.passageAt(M.passages, player.x, player.y);
        if (pa) S.hint = { kind: 'pass', pa, text: `按 E 走「${pa.p.name}」→ ${pa.to.side}` };
        else for (const s of statics) if (s.info && Math.hypot(s.x - player.x, s.y - player.y) < 4.5) S.hint = { kind: 'info', text: `按 E 查看「${s.name}」`, info: s.info }; }
    } else {
      const it = S.interior, d = it.def, row = d.map[Math.floor(player.y - 0.2)], here = row && row[Math.floor(player.x)];
      if (it.stairLock && here !== 'U' && here !== 'V' && !player.wantMove && S.fadeDir === 0) it.stairLock = false; // re-arm stairs once you stop off them
      if (it.exit && player.y > it.exit.y - 0.45 && !S.fadeDir) fadeTo(exitInterior);
      else if (it.exit && player.y > it.exit.y - 1.6) S.hint = { kind: 'none', text: '向下走出门' };
      else if (!S.fadeDir && !it.stairLock && ((here === 'U' && d.up) || (here === 'V' && d.down))) { const to = here === 'U' ? d.up : d.down, from = it.from; fadeTo(() => enterInterior(to, from, false, here === 'U' ? 'V' : 'U')); }
      else if (d.canteen && d.map[Math.floor(player.y - 0.2) - 1] && d.map[Math.floor(player.y - 0.2) - 1][Math.floor(player.x)] === 'C' && Math.floor(player.y - 0.2) === 6) {
        const x = Math.floor(player.x), dish = Interiors.dishAt(d, x) || '米饭套餐';
        S.hint = { kind: 'buy', dish, text: `按 E 买饭：${dish === '刀削面' ? '山西刀削面' : dish}` };
      }
      else if (it.from && it.from.link && !S.fadeDir && player.x > it.W - 3.2 && player.y < it.H - 3) { const lb = M.buildings.find(q => q.id === it.from.link);
        if (lb && lb.enter) S.hint = { kind: 'stairs', text: `按 E 走连廊 → ${lb.name}`, go: () => { enterInterior(lb.enter, lb); toast(`连廊 → ${lb.name}`, 2000); } }; }
      else if (it.key === 'library2' && [9, 11].includes(Math.floor(player.y - 0.2)) && 'R' === ((d.map[10] || '')[Math.floor(player.x)])) S.hint = { kind: 'borrow', text: '按 E 借书' };
      else { const u = Core.stairArrival(d, 'U'), v = Core.stairArrival(d, 'V'), FL = '一二三四五', fn = d.canteen || 1, near = [u && d.up && [u, `走上楼梯 ↑ 去${FL[fn] || '二'}层`], v && d.down && [v, `走下楼梯 ↓ 回${FL[fn - 2] || '一'}层`]].find(q => q && Math.hypot(q[0].x - player.x, q[0].y - 1.4 - player.y) < 2.2); if (near) S.hint = { kind: 'none', text: near[1] }; }
    }
    { // nearby people to chat with (beats doors only when really close)
      let best = null, bd = 1.5; for (const n of list) { if (n.hidden) continue; const dd = Math.hypot(n.x - player.x, n.y - player.y); if (dd < bd) { bd = dd; best = n; } }
      if (best && (!S.hint || S.hint.kind === 'info' || (bd < 1.0 && S.hint.kind !== 'buy' && S.hint.kind !== 'borrow'))) S.hint = { kind: 'talk', n: best, text: '按 E 交谈' };
    }
    if (window.V77) V77.tick(dt); // v7.7: 成就 / 停车点提示
    // quests
    { const it = S.interior, qc = S.mode === 'in' ? { mode: 'in', key: it.def.canteen ? (it.def.canteen === 1 ? 'canteen' : 'canteen2') : it.key, name: it.from && it.from.name, x: player.x, y: player.y, action: S.action, dish: S.dish } : { mode: 'out', x: player.x, y: player.y };
      { const e = Core.questsRoll(S.quests, Math.floor(S.minutes / 1440)); if (e) { toast(`📅 第 ${e.d} 天结束：完成 ${e.n}/${e.t} 个任务 —— 第 ${Math.floor(S.minutes / 1440) + 1} 天的新任务来了！`, 5000); renderQuests(); save(); } }
      if (S.mode === 'in' && S.fadeDir === 0 && !S.dialog) { const seat = Core.inClassSeat(qc);
        if (!seat) S.quizArmed = true; else if (S.quizArmed !== false && !S.quiz && S.quests.done.class == null && today().some(t => t.id === 'class')) startQuiz(); }
      if (S.fadeDir === 0 || S.action) { const list = today(), got = Core.questCheck(S.quests, qc, S.minutes, list); S.action = null;
        for (const id of got) { const q = Core.QUEST_POOL.find(q => q.id === id), n = list.filter(t => S.quests.done[t.id] != null).length; toast(`✔ 任务完成：${q.text} —— ${q.done}${n === list.length ? '　🎉 今日任务全部完成！' : ''}`, 5000); Sound.chime(); renderQuests(); save(); } } }
    if (S.frame % 30 === 0) applyWeather(false); // new day -> new weather roll
    Sound.ambience(Core.nightness(S.minutes), S.mode === 'in', S.weather, S.season);
    // camera（v7.8 拍照模式：相机自由平移，不跟玩家）
    if (window.V78 && V78.frozen()) { const c = V78.photoCam(dt, S.keys, cam); if (c) { cam.x = c.x; cam.y = c.y; } clampCam(); }
    else { const U = S.mode === 'out' ? T : IT, tx = player.x * U;
      // v7.9.3 视线前置：户外把人物放到屏幕偏下（约 60%），上方多留出看路的空间（室内不动）
      const look = S.mode === 'out' ? Math.min(90, cv.height / scale() * 0.11) : 0, ty = player.y * U - 10 - look, k = 1 - Math.exp(-dt * 9);
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; clampCam(); }
    if (window.V78) V78.tick();
    if (window.V79) V79.tick();
  }

  function surfaceAt() {
    if (S.mode === 'in') return S.interior.def.floor === 'wood' || S.interior.def.floor === 'court' ? 'wood' : 'concrete';
    const c = ground8[Math.floor(player.y * 4) * M.meta.w * 4 + Math.floor(player.x * 4)];
    return [C.GRASS, C.HILL, C.WOOD, C.DEEPWOOD, C.OUT, C.BARE, C.PITCH, C.SAND].includes(c) ? 'grass' : 'concrete';
  }
  // ---------- draw ----------
  function drawChar(g, c, wx, wy, alpha) {
    const fw = sheetMeta.fw, fh = sheetMeta.fh, nv = sheetMeta.variants.length, row = (Math.min(nv - 1, Math.max(0, c.variant | 0))) * 4 + c.dir; // v7.6.4: never index past the sheet
    const x = Math.round(wx - sheetMeta.footX), y = Math.round(wy - sheetMeta.footY);
    if (alpha == null) { g.fillStyle = 'rgba(30,40,20,0.28)'; g.fillRect(Math.round(wx) - 6, Math.round(wy) - 2, 12, 3); g.fillRect(Math.round(wx) - 4, Math.round(wy) - 3, 8, 5); }
    if (c.seated) { g.drawImage(sheet, 0, row * fh, fw, fh - 13, x, y + 6, fw, fh - 13); return; }
    if (window.V77 && (c.bike || (c === player && V77.riding()))) { V77.drawRider(g, c, wx, wy, sheet, sheetMeta, row); return; } // v7.7 骑车的人
    g.drawImage(sheet, c.frame * fw, row * fh, fw, fh, x, y, fw, fh);
    if (alpha == null && S.weather === 'rain' && S.mode === 'out') umbrella(g, Math.round(wx), y + 2, c.variant);
  }
  const UMB = ['#d8433a', '#3a6fd8', '#e8b83a', '#3aa060', '#9a4ad0', '#e0703a', '#2fa6b8', '#555c70'];
  function umbrella(g, x, y, v) { // pixel umbrella over the head (rain)
    const c = UMB[v % UMB.length]; y += 3; g.fillStyle = '#2a2a30'; g.fillRect(x + 1, y - 9, 1, 2); g.fillRect(x + 1, y, 1, 16);
    for (let r = 0; r < 8; r++) { const w = [4, 9, 12, 14, 15, 16, 16, 16][r]; g.fillStyle = r === 7 ? 'rgba(0,0,0,0.3)' : c; g.fillRect(x - w + 1, y - 7 + r, w * 2, 1); }
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x - 7, y - 5, 5, 1); g.fillRect(x - 9, y - 4, 3, 1);
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (const i of [-5, 7]) g.fillRect(x + i, y - 5, 1, 6);
    g.fillStyle = c; for (let i = -15; i <= 15; i += 6) g.fillRect(x + i, y + 1, 3, 1);
  }
  // screen-space weather: slanted rain streaks + a grey wash, or drifting snowflakes (outdoors only)
  function drawWeather() {
    const w = S.weather; if (w !== 'rain' && w !== 'snow') return; const W = cv.width, H = cv.height, t = performance.now() / 1000, k = Math.max(1, Math.round(S.dpr)), farK = S.mode === 'out' && S.zoom < 1 ? 0.6 : 1;
    if (S.mode !== 'out') return;
    if (w === 'rain') { ctx.fillStyle = 'rgba(40,52,72,0.22)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(214,226,244,0.7)'; const n = Math.round(W * H / 4200 * farK);
      for (let i = 0; i < n; i++) { const a = Core.hash2(i, 1), b = Core.hash2(i, 2), sp = 900 + 500 * Core.hash2(i, 3), L = (14 + 10 * b) * k;
        const y = ((b * H + t * sp * k) % (H + 40)) - 20, x = ((a * W + t * sp * 0.25 * k) % (W + 40)) - 20;
        for (let j = 0; j < L; j += k) ctx.fillRect(Math.round(x - j * 0.25), Math.round(y - j), k, k); }
      ctx.fillStyle = 'rgba(220,232,250,0.5)'; for (let i = 0; i < n / 6; i++) { const ph = (t * 3 + Core.hash2(i, 9)) % 1, x = Core.hash2(i, 7 + Math.floor(t * 3 + Core.hash2(i, 9))) * W, y = Core.hash2(i, 8 + Math.floor(t * 3 + Core.hash2(i, 9))) * H; if (ph < 0.25) { ctx.fillRect(x - 2 * k, y, k, k); ctx.fillRect(x + 2 * k, y, k, k); ctx.fillRect(x, y - k, k, k); } } // splashes
    } else { ctx.fillStyle = 'rgba(210,220,236,0.12)'; ctx.fillRect(0, 0, W, H); const n = Math.round(W * H / 3800 * farK);
      for (let i = 0; i < n; i++) { const a = Core.hash2(i, 4), b = Core.hash2(i, 5), d = Core.hash2(i, 6), sp = (25 + 45 * d) * k, sz = (d > 0.75 ? 3 : 2) * k;
        const y = (b * H + t * sp) % H, x = (a * W + Math.sin(t * (0.8 + d) + i) * 10 * k + t * 8 * k) % W;
        const X = Math.round(x), Y = Math.round(y); ctx.fillStyle = 'rgba(120,140,170,0.35)'; ctx.fillRect(X + k, Y + k, sz, sz); ctx.fillStyle = d > 0.5 ? '#ffffff' : 'rgba(244,248,255,0.9)'; ctx.fillRect(X, Y, sz, sz); } }
  }
  function loop(now) { frame(now, false); requestAnimationFrame(loop); }
  let last = performance.now(), fpsAcc = 0, fpsN = 0;
  function frame(now, forced) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!forced) update(dt);
    S.frame++;
    const s = scale(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#20140c'; ctx.fillRect(0, 0, cv.width, cv.height);
    const ox = Math.round(cv.width / 2 - cam.x * s), oy = Math.round(cv.height / 2 - cam.y * s);
    ctx.setTransform(s, 0, 0, s, ox, oy);
    if (S.mode === 'out') drawOutside(s, ox, oy); else drawInside();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawWeather();
    if (S.mode === 'out') drawLabels(s, ox, oy);
    if (S.fade > 0) { ctx.fillStyle = `rgba(20,12,6,${S.fade})`; ctx.fillRect(0, 0, cv.width, cv.height); }
    hud();
  }
  function litOverlay(sp, memo) {
    let ov = memo.get(sp); if (ov !== undefined) return ov;
    ov = buildings.overlay(sp, Core.litFraction(sp.kind, S.minutes), Math.floor(S.minutes / 1440)); memo.set(sp, ov); return ov;
  }
  function lightLayer() { const c = lightLayer.cv || (lightLayer.cv = document.createElement('canvas')); if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; } return c; }
  // v7.6: does this building sprite cover the player? Test a few points of the player's body (feet, waist, head) against the
  // sprite's opaque pixels, and only count a point if the piece drawn there sorts AFTER the player (i.e. is drawn over them).
  function hidesPlayer(sp, wx, wy) {
    if (!sp || !sp.cv || !sp.pieces) return false; const W = sp.cv.width, H = sp.cv.height;
    if (wx < sp.ox - 8 || wx > sp.ox + W + 8 || wy - 30 > sp.oy + H || wy < sp.oy) return false;
    const m = sp.amask || (sp.amask = Core.alphaMask(sp.cv));
    for (const [dx, dy] of [[0, -3], [0, -12], [0, -22], [-5, -12], [5, -12]]) {
      const X = Math.floor(wx + dx - sp.ox), Y = Math.floor(wy + dy - sp.oy); if (X < 0 || Y < 0 || X >= W || Y >= H || !m[Y * W + X]) continue;
      for (const p of sp.pieces) if (X >= p.sx && X < p.sx + p.w && Y >= p.y0 && Y < p.y1) { if (p.sortY > wy) return true; break; } }
    return false;
  }
  window.__hidesPlayer = hidesPlayer;
  function drawOutside(s, ox, oy) {
    if (s < 1) return drawFar(s, ox, oy);
    const [x0, y0, x1, y1] = viewRect(); let made = 0;
    for (let cy = Math.floor(y0 / 512); cy <= Math.floor(y1 / 512); cy++) for (let cx = Math.floor(x0 / 512); cx <= Math.floor(x1 / 512); cx++) {
      const key = cx + ',' + cy; let ch = ground.cache.get(key);
      if (!ch && made < 2) { ch = ground.chunk(cx, cy); made++; }
      if (ch) { ground.cache.delete(key); ground.cache.set(key, ch); ctx.drawImage(ch, cx * 512, cy * 512); } else { ctx.fillStyle = '#78b351'; ctx.fillRect(cx * 512, cy * 512, 512, 512); }
    }
    while (ground.cache.size > 70) ground.cache.delete(ground.cache.keys().next().value);
    for (const d of window.__decals || []) d(ctx); // v7 ground decals (platform, display track)
    // sortable sprites
    const spr = [], gwS = M.meta.w * M.meta.sub, pcell = (x, y) => Math.floor(y * M.meta.sub) * gwS + Math.floor(x * M.meta.sub);
    const pcs = [pcell(player.x, player.y), pcell(player.x, player.y - 0.4), pcell(player.x - 0.3, player.y), pcell(player.x + 0.3, player.y)];
    { // v7.6: WHOLE-building fade. When the player is hidden by a building (behind it, under its lifted roof / facade, or on a
      // road it covers) the entire building goes semi-transparent (FADE_ALPHA), easing in and out; no more oval / strip cutouts.
      // Buildings in one fadeGroup (航空宇航学院 / 门洞 wing / 机械工程学院) still fade together.
      const vis = buildings.visible(x0, y0, x1, y1 + 100, 3), grp = new Set(), hid = new Set();
      for (const [b, sp] of vis) if (hidesPlayer(sp, player.x * T, player.y * T)) { hid.add(sp); if (b.fadeGroup) grp.add(b.fadeGroup); }
      for (const [b, sp] of vis) { const tgt = hid.has(sp) || (b.fadeGroup && grp.has(b.fadeGroup)) ? 1 : 0; sp.fadeT = Core.fadeStep(sp.fadeT || 0, tgt); }
      window.__fade = vis.filter(([, sp]) => sp.fadeT > 0).map(([b, sp]) => [b.id, +sp.fadeT.toFixed(2)]); }
    for (const [b, sp] of buildings.visible(x0, y0, x1, y1 + 100, 3)) for (const p of sp.pieces) {
      const dx = sp.ox + p.sx; if (dx + p.w < x0 || dx > x1 || sp.oy + p.y1 < y0 || sp.oy + p.y0 > y1) continue;
      spr.push({ y: p.sortY, b: sp, p });
    }
    for (let gy = Math.floor((y0 / T) / 16) - 1; gy <= Math.floor((y1 / T) / 16) + 1; gy++) for (let gx = Math.floor((x0 / T) / 16) - 1; gx <= Math.floor((x1 / T) / 16) + 1; gx++) {
      const L = treeGrid.get(gx + ',' + gy); if (!L) continue;
      for (const t of L) { const wx = t[0] * T, wy = t[1] * T; if (wx < x0 - 30 || wx > x1 + 30 || wy < y0 - 4 || wy > y1 + 64) continue; spr.push({ y: wy, tree: t }); }
    }
    for (const l of lamps) { const wx = l.x * T, wy = l.y * T; if (wx > x0 - 10 && wx < x1 + 10 && wy > y0 && wy < y1 + 40) spr.push({ y: wy, lamp: l }); }
    for (const st of statics) spr.push({ y: st.y * T, st });
    for (const f of fencePcs) { const fx = f.post ? f.post[0] : f.x0 != null ? f.x0 : f.x, fx1 = f.x1 != null ? f.x1 : fx; if (fx1 > x0 - 20 && fx < x1 + 20 && f.sy > y0 && f.sy < y1 + 40) spr.push({ y: f.sy, fence: f }); }
    for (const w of wallPcs) { const wx0 = Math.min(w.x0, w.x1), wx1 = Math.max(w.x0, w.x1); if (wx1 > x0 - 20 && wx0 < x1 + 20 && w.sy > y0 && w.sy < y1 + 40) spr.push({ y: w.sy, wall: w }); }
    for (const n of npcs) { if (n.hidden) continue; const wx = n.x * T, wy = n.y * T; if (wx > x0 - 20 && wx < x1 + 20 && wy > y0 && wy < y1 + 40) spr.push({ y: wy, ch: n }); }
    for (const u of window.__morning || []) { const wx = u.x * T, wy = u.y * T; if (wx > x0 - 20 && wx < x1 + 20 && wy > y0 && wy < y1 + 40) spr.push({ y: wy, uni: u }); }
    if (window.V77) V77.sprites(spr, x0, y0, x1, y1);
    if (window.V78) V78.sprites(spr, x0, y0, x1, y1);
    spr.push({ y: player.y * T, ch: player, me: true });
    spr.sort((a, b) => a.y - b.y);
    const px = player.x * T, py = player.y * T, ls = Props.lampSprite.cached || (Props.lampSprite.cached = Props.lampSprite());
    const overlapsMe = (x, y, w, h) => px + 7 > x && px - 7 < x + w && py > y && py - 26 < y + h;
    // v7.6: a building piece is drawn whole, at the building's current fade alpha (1 = opaque, Core.FADE_ALPHA = fully faded)
    const pieceImg = (g, img, o) => { const { b, p } = o, h = p.y1 - p.y0, X = b.ox + p.sx, Y = b.oy + p.y0, a = Core.fadeAlpha(b.fadeT || 0);
      if (a < 1) { const ga = g.globalAlpha; g.globalAlpha = ga * a; g.drawImage(img, p.sx, p.y0, p.w, h, X, Y, p.w, h); g.globalAlpha = ga; } else g.drawImage(img, p.sx, p.y0, p.w, h, X, Y, p.w, h); };
    const paint = (g, o, cut) => { // cut: draw silhouette only (for the night light layer)
      if (o.p) pieceImg(g, o.b.cv, o);
      else if (o.fence) { if (!cut) Props.drawFence(g, o.fence); }
      else if (o.wall) { if (!cut) window.PropsV7.drawWall(g, o.wall); }
      else if (o.tree) {
        const t = o.tree, ts = Props.treeSprite(t[2], ((t[0] * 7 + t[1] * 13) | 0) & 3), wx = Math.round(t[0] * T), wy = Math.round(t[1] * T);
        // v7 item 16: trees no longer block; a tree drawn over the player turns see-through while they overlap
        const fa = cut ? 1 : Core.behindAlpha(o.y, py, overlapsMe(wx - ts.ax + 8, wy - ts.ay + 4, ts.cv.width - 16, ts.cv.height - 4));
        if (fa < 1) g.globalAlpha = fa; g.drawImage(ts.cv, wx - ts.ax, wy - ts.ay); g.globalAlpha = 1;
      }
      else if (o.lamp) { // v7.6.4: lamps behave like trees - y-sorted, and the whole post + head turns see-through while the player is behind it
        const X = Math.round(o.lamp.x * T) - ls.ax, Y = Math.round(o.lamp.y * T) - ls.ay, a = cut ? 1 : Core.behindAlpha(o.y, py, overlapsMe(X + 2, Y, ls.cv.width - 4, ls.cv.height - 2));
        if (!cut) o.lamp.alpha = a; if (a < 1) g.globalAlpha = a; g.drawImage(ls.cv, X, Y); g.globalAlpha = 1; }
      else if (o.st) { const sp = o.st.frames ? o.st.frames[(S.frame >> 3) % o.st.frames.length] : o.st.spr, X = Math.round(o.st.x * T - sp.ax), Y = Math.round(o.st.y * T - sp.ay);
        if (o.st.fade && !cut && o.y > py && overlapsMe(X + 4, Y, sp.cv.width - 8, sp.cv.height - 4)) g.globalAlpha = 0.4; g.drawImage(sp.cv, X, Y); g.globalAlpha = 1; }
      else if (o.v77) { if (!cut) V77.paint(g, o); }
      else if (o.v78) { if (!cut) V78.paint(g, o); }
      else if (o.uni) { const u = o.uni, sp = window.PropsV764.uniformSprite(u.dir, u.frame, u.guard); g.drawImage(sp.cv, Math.round(u.x * T - sp.ax), Math.round(u.y * T - sp.ay)); }
      else if (o.ch) drawChar(g, o.ch, o.ch.x * T, o.ch.y * T - Core.stairLift(STAIRS, o.ch.x, o.ch.y), cut ? 1 : undefined);
    };
    for (const o of spr) paint(ctx, o, false);
    // ghost of the player when hidden behind roofs
    ctx.globalAlpha = 0.35; drawChar(ctx, player, px, py - Core.stairLift(STAIRS, player.x, player.y), 1); ctx.globalAlpha = 1;
    // day / night
    const n = Core.nightness(S.minutes);
    if (n > 0) {
      ctx.fillStyle = `rgba(18,24,62,${n * 0.62})`; ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
      if (n > 0.04) { // lit windows: painted in draw order on a light layer, cut by whatever stands in front
        const memo = new Map(), LC = lightLayer(), lg = LC.getContext('2d'); let any = false;
        lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, LC.width, LC.height); lg.setTransform(s, 0, 0, s, ox, oy); lg.imageSmoothingEnabled = false;
        for (const o of spr) {
          if (o.p) { const ov = litOverlay(o.b, memo);
            if (any) { lg.globalCompositeOperation = 'destination-out'; paint(lg, o, true); }
            if (ov) { lg.globalCompositeOperation = 'source-over'; pieceImg(lg, ov, o); any = true; }
          } else if (any) { lg.globalCompositeOperation = 'destination-out'; paint(lg, o, true); }
        }
        lg.globalCompositeOperation = 'source-over';
        if (any) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(1, n / 0.55); ctx.drawImage(LC, 0, 0); ctx.globalAlpha = 1; ctx.setTransform(s, 0, 0, s, ox, oy); }
      }
      ctx.globalCompositeOperation = 'lighter';
      const gs = glowSprite(); ctx.globalAlpha = n;
      for (const l of lamps) { const wx = Math.round(l.x * T), wy = Math.round(l.y * T); if (wx < x0 - 60 || wx > x1 + 60 || wy < y0 - 80 || wy > y1 + 40) continue;
        const X = wx - gs.width / 2, Y = wy - gs.height + 26, a = l.alpha == null ? 1 : l.alpha, cutY = GLOW_SPLIT; // v7.6.4: head halo fades with the post; ground pool stays
        if (a < 1) { ctx.globalAlpha = n * a; ctx.drawImage(gs, 0, 0, gs.width, cutY, X, Y, gs.width, cutY); ctx.globalAlpha = n; ctx.drawImage(gs, 0, cutY, gs.width, gs.height - cutY, X, Y + cutY, gs.width, gs.height - cutY); }
        else ctx.drawImage(gs, X, Y); }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  // ---------- far zoom (0.5× / 0.25×): prebaked downscaled ground+trees, LOD building sprites ----------
  function bakeTrees(g, ox, oy, span, s) {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const list = [];
    for (let gy = Math.floor(oy / T / 16) - 1; gy <= Math.floor((oy + span) / T / 16) + 1; gy++) for (let gx = Math.floor(ox / T / 16) - 1; gx <= Math.floor((ox + span) / T / 16) + 1; gx++) for (const t of treeGrid.get(gx + ',' + gy) || []) list.push(t);
    list.sort((a, b) => a[1] - b[1]);
    for (const t of list) { const ts = Props.treeSprite(t[2], ((t[0] * 7 + t[1] * 13) | 0) & 3), wx = t[0] * T - ts.ax - ox, wy = t[1] * T - ts.ay - oy;
      if (wx > span + 4 || wy > span + 4 || wx + ts.cv.width < -4 || wy + ts.cv.height < -4) continue;
      g.drawImage(ts.cv, Math.round(wx * s), Math.round(wy * s), Math.max(1, Math.round(ts.cv.width * s)), Math.max(1, Math.round(ts.cv.height * s))); }
    g.save(); g.scale(s, s); g.translate(-ox, -oy); for (const f of fencePcs) { const fx = f.post ? f.post[0] : f.x0 != null ? f.x0 : f.x, fy = f.sy; if (fx > ox - 70 && fx < ox + span + 70 && fy > oy - 20 && fy < oy + span + 20) Props.drawFence(g, f); }
    for (const d of window.__decals || []) d(g);
    for (const w of wallPcs) if (w.x0 > ox - 40 && w.x0 < ox + span + 40 && w.sy > oy - 20 && w.sy < oy + span + 30) window.PropsV7.drawWall(g, w); g.restore();
    for (const st of statics) { const sp = st.spr, wx = st.x * T - sp.ax - ox, wy = st.y * T - sp.ay - oy; if (wx > span || wy > span || wx + sp.cv.width < 0 || wy + sp.cv.height < 0) continue; g.drawImage(sp.cv, Math.round(wx * s), Math.round(wy * s), Math.round(sp.cv.width * s), Math.round(sp.cv.height * s)); }
  }
  function farView(s, ox, oy) { const span = 512 / s, W = cv.width, H = cv.height; return { span, cx0: Math.floor(-ox / 512), cy0: Math.floor(-oy / 512), cx1: Math.floor((W - ox) / 512), cy1: Math.floor((H - oy) / 512) }; }
  function drawFar(s, ox, oy) {
    const [x0, y0, x1, y1] = viewRect(), fv = farView(s, ox, oy); let made = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    for (let cy = fv.cy0; cy <= fv.cy1; cy++) for (let cx = fv.cx0; cx <= fv.cx1; cx++) {
      const key = s + ':' + cx + ',' + cy; let ch = ground.far.get(key);
      if (!ch && made < 1) { ch = ground.farChunk(s, cx, cy, bakeTrees); made++; }
      const sx = cx * 512 + ox, sy = cy * 512 + oy;
      if (ch) ctx.drawImage(ch, sx, sy);
      else ctx.drawImage(minimap, cx * fv.span / T, cy * fv.span / T, fv.span / T, fv.span / T, sx, sy, 512, 512); // placeholder: the 1px/tile map
    }
    const n = Core.nightness(S.minutes), memo = new Map();
    const vis = buildings.visible(x0, y0, x1, y1 + 100, 6).sort((a, b) => a[0].bbox[3] - b[0].bbox[3]);
    // buildings and people in one y-sorted pass, so a student north of a building hides behind its roof
    // (people: tiny sprites at 0.5×, 2px dots at 0.25×)
    const dots = ['#e8504a', '#4a7fe8', '#f2c14e', '#5bb36a', '#c86bd6', '#f08a3c', '#3fb6c2'];
    const items = vis.map(v => ({ y: v[0].bbox[3], sp: v[1] }));
    for (const c of npcs) if (!c.hidden && c.x * T > x0 - 8 && c.x * T < x1 + 8 && c.y * T > y0 && c.y * T < y1 + 30) items.push({ y: c.y, ch: c });
    if (s >= 0.5) items.push({ y: player.y, ch: player });
    S.farOrder = Core.farSort(items);
    for (const it of S.farOrder) {
      if (it.sp) ctx.drawImage(buildings.lod(it.sp, s), Math.round(it.sp.ox * s + ox), Math.round(it.sp.oy * s + oy));
      else if (s >= 0.5) { ctx.setTransform(s, 0, 0, s, ox, oy); drawChar(ctx, it.ch, it.ch.x * T, it.ch.y * T); ctx.setTransform(1, 0, 0, 1, 0, 0); }
      else { const c = it.ch, X = Math.round(c.x * T * s + ox), Y = Math.round(c.y * T * s + oy); ctx.fillStyle = '#2b2016'; ctx.fillRect(X - 1, Y - 3, 3, 4); ctx.fillStyle = dots[c.variant % dots.length]; ctx.fillRect(X - 1, Y - 3, 2, 2); }
    }
    if (n > 0) {
      ctx.fillStyle = `rgba(18,24,62,${n * 0.62})`; ctx.fillRect(0, 0, cv.width, cv.height);
      if (n > 0.04) { ctx.globalAlpha = Math.min(1, n / 0.55);
        for (const [, sp] of vis) { const ov = litOverlay(sp, memo); if (!ov) continue; const L = sp.ov.lod[s] || (sp.ov.lod[s] = buildings.lod(sp, s, ov)); ctx.drawImage(L, Math.round(sp.ox * s + ox), Math.round(sp.oy * s + oy)); }
        ctx.globalAlpha = 1; }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = n; const gs = glowSprite(), gw = Math.round(gs.width * s), gh = Math.round(gs.height * s); ctx.imageSmoothingEnabled = true;
      for (const l of lamps) { const X = Math.round(l.x * T * s + ox), Y = Math.round(l.y * T * s + oy); if (X < -gw || Y < -gh || X > cv.width + gw || Y > cv.height + gh) continue; ctx.drawImage(gs, X - gw / 2, Y - gh + Math.round(26 * s), gw, gh); ctx.fillStyle = '#ffe9a8'; ctx.fillRect(X, Y - Math.round(34 * s) - 1, 1, 1); }
      ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // where am I: blinking red/white marker over the player
    const X = Math.round(player.x * T * s + ox), Y = Math.round(player.y * T * s + oy), on = (S.frame >> 4) & 1, k = Math.max(1, Math.round(S.dpr));
    ctx.fillStyle = '#3b1f10'; ctx.fillRect(X - 4 * k, Y - 16 * k, 9 * k, 8 * k); ctx.fillStyle = on ? '#ffffff' : '#e83a2a'; ctx.fillRect(X - 3 * k, Y - 15 * k, 7 * k, 6 * k);
    ctx.fillStyle = '#3b1f10'; ctx.fillRect(X - 1 * k, Y - 8 * k, 3 * k, 3 * k); ctx.fillStyle = on ? '#e83a2a' : '#ffffff'; ctx.fillRect(X - 1 * k, Y - 13 * k, 3 * k, 2 * k);
    ctx.setTransform(s, 0, 0, s, ox, oy);
  }
  // crisp pixel-art lamp light: stepped (banded) ground pool + halo, built once with integer pixels
  const GLOW_SPLIT = 50; // glow sprite rows above = lamp-head halo, below = ground pool
  function glowSprite() {
    if (glowSprite.cv) return glowSprite.cv; const W = 96, H = 96, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H);
    const gx = W / 2, gy = H - 26, hx = W / 2, hy = H - 26 - 34; // ground pool centre / lamp head
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = (x >> 1) * 2 + 1, py = (y >> 1) * 2 + 1; // 2x2 pixel blocks
      const dg = Math.hypot((px - gx) / 44, (py - gy) / 22), dh = Math.hypot(px - hx, py - hy) / 12;
      let a = dg < 0.45 ? 0.30 : dg < 0.72 ? 0.20 : dg < 1 ? 0.10 : 0; if (dh < 0.5) a = Math.max(a, 0.75); else if (dh < 1) a = Math.max(a, 0.32);
      const i = (y * W + x) * 4; img.data[i] = 255; img.data[i + 1] = dh < 0.5 ? 236 : 190; img.data[i + 2] = dh < 0.5 ? 170 : 110; img.data[i + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0); return (glowSprite.cv = c);
  }
  function drawInside() {
    // interiors use 2x chunky furniture pixels (32px tiles) so the 32x36 student sprites match the furniture scale
    const it = S.interior; ctx.drawImage(it.bg, 0, 0, it.W * IT, it.H * IT);
    const spr = it.items.map(i => ({ y: i.sortY * 2, item: i }));
    for (const p of it.people) spr.push({ y: (p.seated ? p.y + 0.3 : p.y) * IT, ch: p });
    spr.push({ y: player.y * IT, ch: player });
    spr.sort((a, b) => a.y - b.y);
    for (const o of spr) { if (o.item) { ctx.save(); ctx.scale(2, 2); Interiors.drawItem(ctx, o.item); ctx.restore(); } else drawChar(ctx, o.ch, o.ch.x * IT, o.ch.y * IT); }
    ctx.globalAlpha = 0.35; drawChar(ctx, player, player.x * IT, player.y * IT, 1); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,200,120,0.06)'; ctx.fillRect(0, 0, it.W * IT, it.H * IT);
    if (it.key === 'dorm') { const dk = Core.dormDark(S.minutes); if (dk > 0) { // 熄灯: room goes dark; desk lamps / phone screens glow
      ctx.fillStyle = `rgba(10,14,40,${0.68 * dk})`; ctx.fillRect(0, 0, it.W * IT, it.H * IT);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = dk;
      const T2 = Core.findChar(it.def, 'T'); if (T2.length) { const cx = (T2.reduce((a, p) => a + p[0], 0) / T2.length + 0.5) * IT, cy = (T2.reduce((a, p) => a + p[1], 0) / T2.length + 0.3) * IT; // one 台灯 on the shared desk
        for (const [r, a] of [[56, 0.07], [40, 0.08], [24, 0.12], [10, 0.25]]) { ctx.fillStyle = `rgba(255,200,120,${a})`; for (let dy = -r; dy <= r; dy += 4) { const w = Math.round(Math.sqrt(r * r - dy * dy) / 4) * 4; ctx.fillRect(cx - w, cy + dy * 0.7, w * 2, 3); } }
        ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.fillRect(cx - 3, cy - 14, 6, 4); }
      for (const p of it.people) if (p.seated) { ctx.fillStyle = 'rgba(120,170,255,0.5)'; ctx.fillRect(Math.round(p.x * IT) - 3, Math.round(p.y * IT) - 22, 6, 4); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } }
  }
  function txt(text, x, y, size, fill, stroke, align) {
    ctx.font = `${size}px ArkPixel, "Microsoft YaHei", sans-serif`; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 4); ctx.strokeStyle = stroke; ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
  }
  function drawLabels(s, ox, oy) {
    const sx = x => Math.round(x * T * s + ox), sy = y => Math.round(y * T * s + oy);
    const fs = 12 * Math.max(1, Math.round(S.dpr)), W = cv.width, H = cv.height;
    const byId = drawLabels.byId || (drawLabels.byId = new Map(M.buildings.map(b => [b.id, b])));
    const placed = [];
    const free = (x, y, w, h) => { for (const r of placed) if (x < r[2] && x + w > r[0] && y < r[3] && y + h > r[1]) return false; placed.push([x, y, x + w, y + h]); return true; };
    if (S.zoom <= 2) for (const l of M.labels) if (l.k === 'sub') { const x = sx(l.x), y = sy(l.y); if (x > -200 && x < W + 200 && y > -50 && y < H + 50) { ctx.font = `${Math.round(fs * 1.25)}px ArkPixel`; const w = ctx.measureText(l.t).width + 8; if (free(x - w / 2, y - fs, w, fs * 2)) txt(l.t, x, y, Math.round(fs * 1.25), '#fff2b8', '#4a2a14'); } }
    if (S.zoom <= 1) for (const l of M.labels) if (l.k === 'area') { const x = sx(l.x), y = sy(l.y); if (x > -200 && x < W + 200 && y > -50 && y < H + 50) txt(l.t, x, y, fs * (isPhoneNow() ? 1.35 : 2), '#fff6dc', '#3b1f10'); } // v7.9.2：手机默认 1× 后区域名会一直出现，缩小一点免得压住摇杆
    for (const l of M.labels) {
      if (l.k === 'area' || l.k === 'sub') continue;
      if (l.k === 'road' && S.zoom < 2) continue;
      let x = sx(l.x), y;
      if (l.k === 'b') { const b = byId.get(l.id); if (!b) continue; if (S.zoom < 2 && !b.enter && !b.special && !(b.bbox[1] < 175 && !b.generic)) continue; const cy = b.special === 'main' ? b.bbox[1] + 2.2 : (b.bbox[1] + b.bbox[3]) / 2; y = Math.round((cy * T - Core.wallHeight(b)) * s + oy); x = sx((b.bbox[0] + b.bbox[2]) / 2); }
      else y = sy(l.y);
      if (x < -100 || x > W + 100 || y < -30 || y > H + 30) continue;
      ctx.font = `${fs}px ArkPixel`; const w = ctx.measureText(l.t).width + 8;
      if (!free(x - w / 2, y - fs / 2 - 2, w, fs + 4)) continue;
      if (l.k === 'road') txt(l.t, x, y, fs, '#fdf3d6', '#4a4a52');
      else { const b = l.k === 'b' && byId.get(l.id); txt(l.t, x, y, fs, b && b.generic ? '#e8e2d2' : b && b.enter ? '#ffe2a0' : '#fff8e6', '#3b1f10'); }
    }
    for (const p of M.pois) { if (p.k === 'statue' || /^gate/.test(p.k) || p.k === 'station' || p.k === 'memorial' || p.k === 'hill') { const x = sx(p.x), y = sy(p.y) + (p.k === 'statue' ? 22 : 10) * s; if (x < 0 || x > W || y < 0 || y > H) continue; ctx.font = `${fs}px ArkPixel`; const w = ctx.measureText(p.name).width + 8; if (free(x - w / 2, y - fs / 2, w, fs)) txt(p.name, x, y, fs, '#ffe9a8', '#3b1f10'); } }
  }
  // v7 item 1: the big building you are standing next to (for the HUD line and the intro card)
  function nearBig() {
    if (S.mode !== 'out') return null; const key = Math.floor(player.x * 2) + ',' + Math.floor(player.y * 2); if (nearBig.key === key) return nearBig.b;
    let best = null, bd = 3.2;
    for (const b of M.buildings) { if (!(b.name || b.linkname) || b.porch) continue; const [x0, y0, x1, y1] = b.bbox, big = (x1 - x0) * (y1 - y0) >= 120 || b.intro || b.enter || b.special; if (!big) continue;
      const dx = Math.max(x0 - player.x, 0, player.x - x1), dy = Math.max(y0 - player.y, 0, player.y - y1), d = Math.hypot(dx, dy) + (b.generic ? 0.8 : 0) + (b.bridge ? 1.5 : 0); if (d < bd) { bd = d; best = b; } }
    nearBig.key = key; nearBig.b = best; return best;
  }
  // v7.6: places that are not buildings (柏林园, 刘鼎塑像) also get the intro card: point spots win over area spots
  function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[i], [bx, by] = P[j]; if ((ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay)) c = !c; } return c; }
  function nearSpot() {
    if (S.mode !== 'out') return null; let area = null;
    for (const z of M.spots || []) { if (z.r && Math.hypot(z.x - player.x, z.y - player.y) < z.r) return z; if (z.poly && !area && inPoly(player.x, player.y, z.poly)) area = z; }
    return area;
  }
  window.__nearSpot = () => nearSpot();
  const KIND_ZH = { teach: '教学 / 科研楼', res: '公寓', dorm: '学生宿舍', canteen: '食堂', gym: '体育场馆', library: '图书馆', main: '主楼', low: '附属建筑', shed: '附属建筑', pavilion: '亭 / 廊', admin: '办公楼', school: '中小学', hall: '会议中心', stand: '看台 / 器材室' };   // v7.6.2: school / hall / stand
  function introCard() {
    const el = $('intro'); if (!el) return; const b = nearBig() || nearSpot(), id = b ? b.id : '';
    if (id !== introCard.id) { introCard.id = id;
      if (b) { el.querySelector('.it').textContent = b.linkname || b.name;
        el.querySelector('.is').textContent = [b.kz || KIND_ZH[b.k] || '建筑', b.f ? b.f + ' 层' : '', b.enter ? '可进入（按 E）' : '', b.generic || b.approx ? '名称 / 位置为近似' : ''].filter(Boolean).join(' · ');
        el.querySelector('.ib').textContent = b.intro || b.info || ({ teach: '教学科研楼，上课、做实验的地方。', res: '公寓楼。', dorm: '学生宿舍楼。', canteen: '食堂：按 E 进去打饭。', gym: '运动场馆。', low: '附属用房。' })[b.k] || '';
        el.classList.add('on'); } else el.classList.remove('on'); }
  }
  function areaName() {
    if (S.mode === 'in') return S.interior.title;
    let best = null, bd = 1e9, sub = null, sd = 1e9; for (const l of M.labels) { const d = Math.hypot(l.x - player.x, (l.y - player.y) * 1.3); if (l.k === 'area' && d < bd) { bd = d; best = l; } if (l.k === 'sub' && d < sd) { sd = d; sub = l; } }
    for (const z of M.meta.areaRects || []) if (player.x >= z.r[0] && player.x <= z.r[2] && player.y >= z.r[1] && player.y <= z.r[3]) best = { t: z.t }; // v7.2: 17#/18# are 北区
    const near = nearBig(); const a = best ? best.t.replace('汾河', '汾河畔') : '中北大学';
    return near ? `${a} · ${near.name}` : sub && sd < 22 ? `${a} · ${sub.t}` : a;
  }
  let hudCache = {};
  function setText(id, t) { if (hudCache[id] !== t) { hudCache[id] = t; $(id).textContent = t; } }
  function hud() {
    setText('clock', Core.clockText(Math.floor(S.minutes)) + ' ' + Core.SEASON_ZH[S.season] + ({ clear: '☀', rain: '🌧', snow: '❄' })[S.weather]);
    setText('area', areaName());
    const h = S.dialog ? S.dialog : (S.hint ? S.hint.text : '');
    setText('hint', h); $('hint').style.display = h ? 'block' : 'none';
    { const eb = $('ebtn'); if (eb) { const lab = S.dialog ? '关闭' : !S.hint ? '' : ({ door: '进入', talk: '交谈', info: '查看', stairs: '楼梯', ride: '骑车', park: '还车' })[S.hint.kind] || ''; setText('ebtnlab', lab); eb.classList.toggle('on', !!lab); } }
    if (S.dialog) $('hint').classList.add('dialog'); else $('hint').classList.remove('dialog');
    $('bigwrap').style.display = S.showMap ? 'flex' : 'none';
    $('mmwrap').style.display = S.mode === 'in' ? 'none' : '';
    // minimap: player-centred window of the 1px/tile map
    const mm = $('minimap'), g = mm.getContext('2d');
    if (renderQuests.mode !== S.mode) renderQuests();
    // toast
    { const t = S.toast && performance.now() < S.toast.until ? S.toast.text : ''; if (t !== hud.toast) { hud.toast = t; const el = $('toast'); el.textContent = t; el.style.display = t ? 'block' : 'none'; el.classList.remove('pop'); void el.offsetWidth; if (t) el.classList.add('pop'); } }
    { const mb = $('mute'), lab = S.muted ? '🔇' : '🔊'; if (mb.textContent !== lab) mb.textContent = lab; }
    // minimap only redraws when the player tile / view changes (it used to repaint the whole map every 3 frames)
    const vr = viewRect(), mkey = S.mode + '|' + Math.floor(player.x) + ',' + Math.floor(player.y) + '|' + Math.round(vr[0] / T) + ',' + Math.round(vr[1] / T) + ',' + Math.round(vr[2] / T);
    if (mkey !== hud.mkey || S.frame % 4 === 0) { hud.mkey = mkey;
      g.imageSmoothingEnabled = false; g.fillStyle = '#2a1a0e'; g.fillRect(0, 0, mm.width, mm.height);
      const Z = 3, vw = mm.width / Z, vh = mm.height / Z, mx = Math.max(0, Math.min(M.meta.w - vw, player.x - vw / 2)), my = Math.max(0, Math.min(M.meta.h - vh, player.y - vh / 2));
      g.drawImage(minimap, mx, my, vw, vh, 0, 0, mm.width, mm.height);
      if (S.mode === 'out') { const [x0, y0, x1, y1] = viewRect(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2; g.strokeRect((x0 / T - mx) * Z, (y0 / T - my) * Z, (x1 - x0) / T * Z, (y1 - y0) / T * Z);
        meMarker(g, (player.x - mx) * Z, (player.y - my) * Z, 2.2); }
      g.fillStyle = 'rgba(40,24,12,0.75)'; g.fillRect(mm.width - 30, 4, 26, 26); g.font = '18px ArkPixel'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff2b8'; g.fillText('北', mm.width - 17, 17);
    }
    if (S.showMap && (S.frame % 3 === 0 || !hud.big)) { hud.big = 1; drawBigMap(); }
    introCard();
  }
  function drawBigMap() {
    const bm = $('bigmap'); if (bm.width !== M.meta.w * 2) { bm.width = M.meta.w * 2; bm.height = M.meta.h * 2; }
    const g = bm.getContext('2d'); g.imageSmoothingEnabled = false;
    if (!drawBigMap.base) { const c = drawBigMap.base = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; bigMapBase(c.getContext('2d'), c); }
    g.drawImage(drawBigMap.base, 0, 0);
    if (S.mode === 'out') meMarker(g, player.x * 2, player.y * 2, 1.6, true);
  }
  // v7 item 17: big, bright, blinking "you are here" marker with a direction arrow
  function meMarker(g, x, y, k, label) {
    const t = performance.now() / 1000, pulse = (t * 1.6) % 1, on = Math.floor(t * 3) % 2 === 0;
    g.save(); g.lineWidth = 3 * k;
    g.strokeStyle = `rgba(255,236,60,${1 - pulse})`; g.beginPath(); g.arc(x, y, (9 + 16 * pulse) * k, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = `rgba(255,60,40,${0.8 * (1 - pulse)})`; g.beginPath(); g.arc(x, y, (5 + 10 * pulse) * k, 0, Math.PI * 2); g.stroke();
    const a = [Math.PI / 2, -Math.PI / 2, Math.PI, 0][player.dir] || 0; g.translate(x, y); g.rotate(a);
    g.fillStyle = '#111'; g.beginPath(); g.moveTo(15 * k, 0); g.lineTo(-7 * k, -9 * k); g.lineTo(-3 * k, 0); g.lineTo(-7 * k, 9 * k); g.closePath(); g.fill();
    g.fillStyle = on ? '#ff2a1a' : '#ffe23a'; g.beginPath(); g.moveTo(12 * k, 0); g.lineTo(-5 * k, -6.5 * k); g.lineTo(-1.5 * k, 0); g.lineTo(-5 * k, 6.5 * k); g.closePath(); g.fill();
    g.rotate(-a); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 3 * k, 0, Math.PI * 2); g.fill();
    if (label) { g.font = `${Math.round(12 * k)}px ArkPixel`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#3b1f10'; g.strokeText('你在这里', 0, -22 * k); g.fillStyle = '#ffe23a'; g.fillText('你在这里', 0, -22 * k); }
    g.restore();
  }
  function bigMapBase(g, bm) {
    g.imageSmoothingEnabled = false; g.drawImage(minimap, 0, 0, bm.width, bm.height);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const put = (t, x, y, sz, f, st) => { g.font = `${sz}px ArkPixel`; g.lineWidth = 4; g.strokeStyle = st; g.strokeText(t, x, y); g.fillStyle = f; g.fillText(t, x, y); };
    for (const b of M.buildings) if ((b.enter && !b.porch) || b.entry || b.special) put(b.name, (b.bbox[0] + b.bbox[2]), (b.bbox[1] + b.bbox[3]), 12, '#fff8e6', '#3b1f10');
    for (const l of M.labels) if (l.k === 'area') put(l.t, l.x * 2, l.y * 2, 24, '#fff6dc', '#3b1f10');
    for (const p of M.pois) if (p.k === 'statue' || p.k === 'gate1') put(p.name, p.x * 2, p.y * 2 + 14, 12, '#ffe9a8', '#3b1f10');
    put('▲ 二龙山长廊（任务）', Core.SUMMIT.x * 2, Core.SUMMIT.y * 2 - 18, 12, '#ffe9a8', '#3b1f10');
  }
  load().catch(err => { $('loading').textContent = '加载失败：' + err; console.error(err); });
})();

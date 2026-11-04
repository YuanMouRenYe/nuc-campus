// Buildings: footprint polygon -> prerendered 3/4 sprite (south walls extruded up, roof shifted up by wall height).
// Sprites are split into 8px vertical strips per footprint run so each piece y-sorts correctly against the player.
(function () {
  'use strict';
  const T = 16, STRIP = 8;
  const FACADE = { // wall base, wall dark, window, frame
    teach: ['#e8dfc8', '#c9bfa6', '#5f7f8f', '#f4eedc'], dorm: ['#eac9a0', '#cfa97f', '#55707e', '#f6e6cc'],
    res: ['#dcd2c0', '#bdb29e', '#58707a', '#ece4d4'], low: ['#d6c3a0', '#b7a27f', '#5b6e70', '#e6d7b8'],
    canteen: ['#f0d9b0', '#d4b98c', '#6a8a8a', '#fff0d0'], gym: ['#dfe4e6', '#b9c2c6', '#4f7590', '#f2f5f6'],
    library: ['#e9e2d0', '#cbc3ae', '#4d7088', '#f7f2e4'], shed: ['#b9b3a6', '#9a9486', '#6d6a62', '#cfcabe'],
    pavilion: ['#b2412e', '#8e3122', '#b2412e', '#d9b25a'], main: ['#ddd9c4', '#b0b4a4', '#546d69', '#eeead4'],
    dehuai: ['#dad9c6', '#b6baa2', '#728885', '#efead5'],
    // v7.6.2: 附属学校 (warm school brick + white bands), 瑾瑜 (pale stone + dark glass), grandstands (concrete)
    school: ['#e9b98f', '#c98f66', '#4f7a92', '#fbe9d2'], hall: ['#ece6d8', '#c8c0ac', '#3e6377', '#f8f4ea'],
    stand: ['#c9c4b8', '#a39d90', '#5a5f66', '#e2ded4'], jinyu: ['#ece6d8', '#c8c0ac', '#3e6377', '#f8f4ea'],
    tribune: ['#d8d2c4', '#aea796', '#5a5f66', '#efe9dc'],
  };
  const hexToRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgb = (c, k = 1) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
  function roofColor(b) {
    if (b.roof === 'red') return [178, 74, 52]; if (b.roof === 'blue') return [74, 118, 160]; if (b.roof === 'dark') return [86, 92, 98];
    if (b.roof === 'pavilion') return [64, 110, 92]; if (b.roof === 'dome') return [196, 200, 204];
    let c = b.rc || [150, 150, 150]; // sampled satellite colour, desaturated and lifted to the pixel palette
    const g = (c[0] + c[1] + c[2]) / 3; c = c.map(v => v * 0.55 + g * 0.45);
    const L = Math.max(150, Math.min(205, g * 1.25)), k = L / Math.max(1, g);
    return c.map(v => Math.max(40, Math.min(230, v * k)));
  }
  // v7.6.1: exposed foundation on the low side of a building standing on a slope (b.found = [px west, px east, x west, x east, metres]):
  // a coursed-stone base band whose height follows the ground falling away under the south facade
  function foundation(g, b, e, ox, light) {
    const [pw, pe, xw, xe] = b.found, hx = sx => { const u = Math.min(1, Math.max(0, ((sx + ox) / T - xw) / Math.max(0.5, xe - xw))); return pw + (pe - pw) * u; };
    const ha = hx(e.a[0]), hc = hx(e.c[0]); if (Math.max(ha, hc) < 2) return;
    g.save(); g.beginPath(); g.moveTo(e.a[0], e.a[1] + 0.5); g.lineTo(e.c[0], e.c[1] + 0.5); g.lineTo(e.c[0], e.c[1] - hc); g.lineTo(e.a[0], e.a[1] - ha); g.closePath();
    g.fillStyle = `rgb(${120 * light | 0},${110 * light | 0},${96 * light | 0})`; g.fill(); g.clip();
    const x0 = Math.min(e.a[0], e.c[0]), x1 = Math.max(e.a[0], e.c[0]), y0 = Math.min(e.a[1] - ha, e.c[1] - hc) - 1, y1 = Math.max(e.a[1], e.c[1]) + 1;
    g.fillStyle = 'rgba(60,50,40,0.45)'; for (let y = Math.floor(y1) - 3, r = 0; y > y0; y -= 3, r++) { g.fillRect(x0, y, x1 - x0, 1); for (let x = x0 + (r & 1) * 3; x < x1; x += 7) g.fillRect(Math.round(x), y - 2, 1, 2); }
    g.restore();
    g.strokeStyle = 'rgba(235,225,200,0.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(e.a[0], e.a[1] - ha - 0.5); g.lineTo(e.c[0], e.c[1] - hc - 0.5); g.stroke(); // lit cap (ground-floor line)
    g.fillStyle = 'rgba(30,25,20,0.35)'; g.beginPath(); g.moveTo(e.a[0], e.a[1]); g.lineTo(e.c[0], e.c[1]); g.lineTo(e.c[0], e.c[1] - 1.5); g.lineTo(e.a[0], e.a[1] - 1.5); g.fill(); // dark foot where it meets the low ground
  }
  function path(g, pts, dx = 0, dy = 0) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)); g.closePath(); }
  function area(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; a += x0 * y1 - x1 * y0; } return a / 2; }

  // flat-roof furniture: tonal membrane patches, skylight strips, solar arrays, water tanks, vents, AC units
  function roofDetails(g, b, kind, rb, rc, pts, wh, rnd) {
    const inside = (x, y) => { path(g, pts, 0, -wh); return g.isPointInPath(x, y); };
    const fits = (x, y, w, h) => inside(x - 2, y - 2) && inside(x + w + 2, y - 2) && inside(x - 2, y + h + 2) && inside(x + w + 2, y + h + 2);
    const used = []; const free = (x, y, w, h) => { for (const r of used) if (x < r[2] + 3 && x + w + 3 > r[0] && y < r[3] + 3 && y + h + 3 > r[1]) return false; return true; };
    const take = (w, h, tries) => { for (let k = 0; k < (tries || 24); k++) { const x = Math.round(rb[0] + 6 + rnd() * Math.max(1, rb[2] - rb[0] - w - 12)), y = Math.round(rb[1] + 6 + rnd() * Math.max(1, rb[3] - rb[1] - h - 12)); if (fits(x, y, w, h) && free(x, y, w, h)) { used.push([x, y, x + w, y + h]); return [x, y]; } } return null; };
    const A = (rb[2] - rb[0]) * (rb[3] - rb[1]);
    if (kind === 'main') used.push([rb[0], rb[1], rb[2], rb[3] - 40]);
    else if (!b.roof && A > 9000) { const cx = (rb[0] + rb[2]) / 2, cy = (rb[1] + rb[3]) / 2, w = Math.max(24, (rb[2] - rb[0]) * 0.22), d = Math.max(18, (rb[3] - rb[1]) * 0.18); used.push([cx - w / 2, cy - d / 2 - 12, cx + w / 2, cy + d / 2 + 6]); }
    // tonal patches (re-laid membrane) — clipped by the roof path already
    for (let i = 0; i < Math.min(5, A / 5000 | 0); i++) { const w = 16 + rnd() * 40 | 0, h = 10 + rnd() * 24 | 0, x = rb[0] + rnd() * (rb[2] - rb[0] - w) | 0, y = rb[1] + rnd() * (rb[3] - rb[1] - h) | 0; g.fillStyle = rgb(rc, rnd() < 0.5 ? 0.94 : 1.05); g.fillRect(x, y, w, h); g.fillStyle = rgb(rc, 0.88); g.fillRect(x, y + h, w, 1); }
    // skylight strip on teaching / library / gym roofs
    if ((kind === 'teach' || kind === 'library' || kind === 'gym') && A > 4000) {
      const horiz = rb[2] - rb[0] > rb[3] - rb[1], n = 2 + (rnd() * 3 | 0);
      const sw = horiz ? 10 : 14, sh = horiz ? 14 : 8;
      const at = take(horiz ? n * (sw + 4) : sw, horiz ? sh : n * (sh + 4), 30);
      if (at) for (let i = 0; i < n; i++) { const x = at[0] + (horiz ? i * (sw + 4) : 0), y = at[1] + (horiz ? 0 : i * (sh + 4));
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + 2, y + 2, sw, sh); g.fillStyle = rgb(rc, 1.15); g.fillRect(x - 1, y - 1, sw + 2, sh + 2);
        g.fillStyle = '#6f9cbc'; g.fillRect(x, y, sw, sh); g.fillStyle = '#a9d2ea'; g.fillRect(x + 1, y + 1, 3, sh - 2); g.fillStyle = '#4f7690'; g.fillRect(x, y + (sh >> 1), sw, 1); }
    }
    // solar array: rows of tilted panels (dorms, teaching blocks)
    if ((kind === 'dorm' || kind === 'res' || kind === 'teach') && rnd() < 0.55 && A > 3000) {
      const cols = 2 + (rnd() * 4 | 0), rows = 1 + (rnd() * 2 | 0), pw = 9, ph = 6;
      const at = take(cols * (pw + 1), rows * (ph + 4), 30);
      if (at) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = at[0] + c * (pw + 1), y = at[1] + r * (ph + 4);
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 1, y + ph, pw, 3); g.fillStyle = '#2f4a6e'; g.fillRect(x, y, pw, ph); g.fillStyle = '#4f74a3'; g.fillRect(x, y, pw, 1); g.fillRect(x + 4, y, 1, ph); g.fillStyle = '#8fb0d6'; g.fillRect(x + 1, y + 1, 2, 1); }
    }
    // water tanks on housing roofs
    if ((kind === 'dorm' || kind === 'res' || kind === 'canteen') && A > 2000) {
      for (let i = 0, n = 1 + (rnd() * 2 | 0); i < n; i++) { const at = take(12, 14); if (!at) break; const [x, y] = at;
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 3, y + 10, 12, 4); g.fillStyle = '#7d8a90'; g.fillRect(x + 1, y + 11, 2, 3); g.fillRect(x + 9, y + 11, 2, 3);
        g.fillStyle = '#c9d0d2'; g.fillRect(x, y + 3, 12, 8); g.fillStyle = '#aab3b6'; g.fillRect(x + 8, y + 3, 4, 8); g.fillStyle = '#e8eced'; g.fillRect(x + 1, y + 1, 10, 3); g.fillRect(x + 2, y, 8, 1); g.fillStyle = '#9aa4a8'; g.fillRect(x, y + 6, 12, 1); }
    }
    // AC condensers + vent stacks, density by area
    for (let i = 0, n = Math.min(14, A / 2600 | 0); i < n; i++) {
      if (rnd() < 0.7) { const at = take(10, 7, 6); if (!at) continue; const [x, y] = at; g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 2, y + 2, 10, 7); g.fillStyle = '#c9cdd0'; g.fillRect(x, y, 10, 7); g.fillStyle = '#8d9599'; g.fillRect(x + 2, y + 2, 6, 3); g.fillStyle = '#e4e7e8'; g.fillRect(x, y, 10, 1); }
      else { const at = take(4, 6, 6); if (!at) continue; const [x, y] = at; g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + 1, y + 4, 5, 3); g.fillStyle = '#7f878b'; g.fillRect(x, y, 4, 6); g.fillStyle = '#b2babd'; g.fillRect(x, y, 4, 2); }
    }
  }

  // v6: per-building facade looks (docs/BUILDING_LOOKS.md). Type groupings follow the sources listed there;
  // colours are pixel-art guesses unless the doc marks a photo. pal = [wall, plinth/band, glass, frame]
  const LOOK_PAL = {
    cream: ['#eedcb8', '#c9a97f', '#55707e', '#fbf1dc'], peach: ['#eac9a0', '#cfa97f', '#55707e', '#f6e6cc'],
    pink: ['#e7c3b4', '#b98b7c', '#56707e', '#f7e4da'], white: ['#e9e8e2', '#a9aaa4', '#4f7088', '#ffffff'],
    grey: ['#cfd2d0', '#8e9592', '#47667c', '#eef0ee'], brick: ['#a8604a', '#7c4232', '#4f626a', '#e9dccb'],
    yellow: ['#ecd99a', '#c4a86a', '#56707e', '#fbf0cc'], tan: ['#dcc49c', '#ad9168', '#58707a', '#efe2c6'],
    bluegrey: ['#d5dbdc', '#8c9ba3', '#3f6a8a', '#f2f5f6'], sand: ['#e3d3b0', '#b6a27a', '#5f7f8f', '#f4eedc'],
    // v7.6.4 北区 (jbjsc / 校报 photos): stone + glass curtain wall, long white body with dark ribbon glazing, pale display stone
    curtain: ['#e6e5df', '#9fa09a', '#3d6684', '#f7f7f4'], ribbon: ['#efeee8', '#a3a49e', '#2c4558', '#ffffff'], stone: ['#d9d6cc', '#9b978c', '#4a5f6e', '#efede6'],
  };
  // v7.6.4: 北区 buildings with their own documented facades (tools/layout_v764.py FACADES; sources in shots/v764_north_bldgs_notes.md)
  const SPECIAL_LOOK = {
    v764_soft: { pal: 'curtain', style: 'strip', stair: true }, v764_inst: { pal: 'ribbon', style: 'strip' },
    v764_weapon: { pal: 'stone', style: 'band', band: '#a8a49a' }, v764_aero: { pal: 'grey', style: 'strip' },
    v764_semi: { pal: 'white', style: 'band', band: '#4d6f8c', pv: true },
  };
  // style: plain | brick (old low blocks) | balcony (newer 6F dorms) | band (coloured spandrels) | strip (ribbon glazing)
  // stair: glazed stair-core column(s); pair: windows grouped in pairs
  const LOOKS = [
    [/^文瀛苑(6|9|13)号/, { pal: 'brick', style: 'brick', pair: true }],           // older 3F type (gaein 2021)
    [/^文瀛苑(5|10)号/, { pal: 'cream', style: 'balcony', stair: true }],            // newer 6F balcony type (gaein 2021)
    [/^文瀛苑(7|8)号/, { pal: 'white', style: 'band', band: '#b24a3a', stair: true }], // 6F 国防生 block, balconies (aiyangedu)
    [/^文瀛苑17号/, { pal: 'grey', style: 'band', band: '#8f5a48', stair: true, court: 0.42 }],    // 6F 回字楼 (gaein 2021)
    [/^文瀛苑(1|2|3|4)号/, { pal: 'peach', style: 'plain', pair: true }],
    [/^文瀛苑(11|12|14|15)号/, { pal: 'pink', style: 'balcony' }],
    [/^文瀛苑(16|18|19)号/, { pal: 'yellow', style: 'band', band: '#c98b52', stair: true }],
    [/^文韬苑(6|7)号/, { pal: 'bluegrey', style: 'strip', stair: true }],           // 2017 精品工程 (jbjsc)
    [/^文韬苑/, { pal: 'white', style: 'band', band: '#5b7fa6', stair: true }],
    [/^文澜苑/, { pal: 'sand', style: 'balcony', stair: true }],
    [/^怡丁苑/, { pal: 'tan', style: 'band', band: '#a85a40' }],
    [/^科学楼/, { pal: 'bluegrey', style: 'strip' }],                               // 2017 精品工程 (jbjsc)
    [/软件学院|新北区|教学楼18/, { pal: 'white', style: 'strip' }],
    [/^(旧1号楼|工字楼|炮库)/, { pal: 'brick', style: 'brick' }],
    [/图书馆/, { pal: null, style: 'strip' }],
  ];
  const FALLBACK = { // hash-picked variants for buildings without a named look
    res: [{ pal: 'peach', style: 'balcony' }, { pal: 'pink', style: 'plain', pair: true }, { pal: 'grey', style: 'band', band: '#9a6b55' }, { pal: 'yellow', style: 'plain' }, { pal: 'brick', style: 'brick' }],
    dorm: [{ pal: 'cream', style: 'balcony' }, { pal: 'white', style: 'band', band: '#5b7fa6' }, { pal: 'peach', style: 'plain', pair: true }],
    teach: [{ pal: null, style: 'plain' }, { pal: 'sand', style: 'band', band: '#a9a08a' }, { pal: 'bluegrey', style: 'strip' }, { pal: 'white', style: 'plain', pair: true }],
  };
  function look(b, kind) {
    if (kind === 'main' || kind === 'dehuai' || kind === 'pavilion' || kind === 'stand' || kind === 'tribune' || kind === 'jinyu' || /_porch$/.test(b.id)) return { pal: null, style: 'plain' };
    if (b.special && SPECIAL_LOOK[b.special]) return SPECIAL_LOOK[b.special];
    if (b.name) for (const [re, L] of LOOKS) if (re.test(b.name)) return L;
    const F = FALLBACK[b.k]; if (F) return F[hashStr((b.lookId || b.id) + 'look') % F.length]; // v7.2: lookId = wear a neighbour's look (门洞 wing)
    return { pal: null, style: 'plain' };
  }
  // v7 item 5: 二龙山长廊 as a real covered walk: stepped bays on red columns under a green glazed-tile roof,
  // with a square pavilion (攒尖亭) at each end and a double-eaved one at the bend. Original pixel art, drawn procedurally.
  function renderCorridor(b) {
    const wh = Core.wallHeight(b), [bx0, by0, bx1, by1] = b.bbox, C0 = b.corridor;
    const ox = Math.floor(bx0 * T) - 30, oy = Math.floor(by0 * T) - wh - 40;
    const W = Math.ceil(bx1 * T) - ox + 34, H = Math.ceil(by1 * T) - oy + 14;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const P = ([x, y]) => [x * T - ox, y * T - oy];
    const RED = '#a8321f', RED_D = '#6e1f14', ROOF = [64, 110, 92], EAVE = '#d8b45a', FLOOR = '#b9b2a2';
    const items = [];
    // bays along the centre line; floor height steps up 3 px every 3 bays toward the middle pavilion and back down (it climbs the ridge)
    const L = C0.line.map(P); let tot = 0; const seg = []; for (let i = 0; i + 1 < L.length; i++) { const d = Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]); seg.push(d); tot += d; }
    const at = t => { let k = 0; while (k < seg.length - 1 && t > seg[k]) { t -= seg[k]; k++; } const u = Math.min(1, t / seg[k]); return [L[k][0] + (L[k + 1][0] - L[k][0]) * u, L[k][1] + (L[k + 1][1] - L[k][1]) * u, (L[k + 1][0] - L[k][0]) / seg[k], (L[k + 1][1] - L[k][1]) / seg[k]]; };
    const BAY = 18, hw = 9, nb = Math.floor(tot / BAY), mid = C0.peak != null ? C0.peak : 0.5;
    for (let i = 0; i < nb; i++) {
      const t0 = i * BAY, t1 = t0 + BAY, [x0, y0, dx, dy] = at(t0), [x1, y1] = at(t1), nx = -dy, ny = dx;
      const f = (i + 0.5) / nb, rise = Math.round((1 - Math.abs(f - mid) / Math.max(mid, 1 - mid)) * 3) * 3; // stepped rise
      items.push({ y: Math.max(y0, y1) + hw, draw: () => {
        const q = [[x0 + nx * hw, y0 + ny * hw], [x1 + nx * hw, y1 + ny * hw], [x1 - nx * hw, y1 - ny * hw], [x0 - nx * hw, y0 - ny * hw]].map(([x, y]) => [x, y - rise]);
        g.fillStyle = 'rgba(30,40,20,0.30)'; path(g, q.map(([x, y]) => [x + 4, y + rise + 3])); g.fill();
        // stone base + the step riser when the next bay is higher
        g.fillStyle = '#8f8878'; path(g, q.map(([x, y]) => [x, y + 3])); g.fill();
        g.fillStyle = FLOOR; path(g, q); g.fill(); g.fillStyle = 'rgba(0,0,0,0.10)'; for (let k = 1; k < 3; k++) { const u = k / 3; g.fillRect(Math.round(x0 + (x1 - x0) * u) - 1, Math.round(y0 + (y1 - y0) * u - rise - hw), 1, hw * 2); }
        // railing seat (美人靠) on the south side
        const s0 = q[0][1] > q[3][1] ? [q[0], q[1]] : [q[3], q[2]];
        g.strokeStyle = RED_D; g.lineWidth = 2; g.beginPath(); g.moveTo(s0[0][0], s0[0][1] - 5); g.lineTo(s0[1][0], s0[1][1] - 5); g.stroke();
        // columns at the four corners
        for (const [cx, cy] of q) { g.fillStyle = RED; g.fillRect(Math.round(cx) - 1, Math.round(cy) - 20, 3, 20); g.fillStyle = RED_D; g.fillRect(Math.round(cx) + 1, Math.round(cy) - 20, 1, 20); }
        // roof: overhanging eaves, tile rows across, ridge along the centre
        const R = q.map(([x, y], k) => { const ex = (k === 0 || k === 3 ? -1 : 1) * dx * 2, ey = (k === 0 || k === 3 ? -1 : 1) * dy * 2, sx = (k < 2 ? 1 : -1) * nx * 3, sy = (k < 2 ? 1 : -1) * ny * 3; return [x + ex + sx, y + ey + sy - 22]; });
        g.fillStyle = rgb(ROOF, 0.78); path(g, R.map(([x, y]) => [x, y + 3])); g.fill();
        g.fillStyle = rgb(ROOF); path(g, R); g.fill();
        g.save(); path(g, R); g.clip(); for (let k = 0; k <= 6; k++) { const u = k / 6; g.strokeStyle = rgb(ROOF, 0.7); g.lineWidth = 1; g.beginPath(); g.moveTo(R[0][0] + (R[1][0] - R[0][0]) * u, R[0][1] + (R[1][1] - R[0][1]) * u); g.lineTo(R[3][0] + (R[2][0] - R[3][0]) * u, R[3][1] + (R[2][1] - R[3][1]) * u); g.stroke(); }
        g.strokeStyle = rgb(ROOF, 1.25); g.lineWidth = 1; g.beginPath(); g.moveTo((R[0][0] + R[3][0]) / 2 - 2, (R[0][1] + R[3][1]) / 2 + 1); g.lineTo((R[1][0] + R[2][0]) / 2 + 2, (R[1][1] + R[2][1]) / 2 + 1); g.stroke(); g.restore();
        g.strokeStyle = rgb(ROOF, 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo((R[0][0] + R[3][0]) / 2, (R[0][1] + R[3][1]) / 2); g.lineTo((R[1][0] + R[2][0]) / 2, (R[1][1] + R[2][1]) / 2); g.stroke();
        g.strokeStyle = EAVE; g.lineWidth = 1; const e = R[0][1] > R[3][1] ? [R[0], R[1]] : [R[3], R[2]]; g.beginPath(); g.moveTo(e[0][0], e[0][1] + 3); g.lineTo(e[1][0], e[1][1] + 3); g.stroke();
      } });
    }
    for (const pv of C0.pav) { const [cx, cy] = P([pv[0], pv[1]]), r = (pv[2] || 1.4) * T, dbl = !!pv[3];
      items.push({ y: cy + r, draw: () => {
        g.fillStyle = 'rgba(30,40,20,0.32)'; g.beginPath(); g.ellipse(cx + 5, cy + 4, r + 4, r * 0.75, 0, 0, 7); g.fill();
        g.fillStyle = '#8f8878'; g.fillRect(cx - r - 2, cy - r * 0.7 + 2, 2 * r + 4, r * 1.4 + 3); g.fillStyle = '#c9c2b2'; g.fillRect(cx - r - 2, cy - r * 0.7, 2 * r + 4, r * 1.4);
        g.fillStyle = '#a49c8a'; g.fillRect(cx - r - 2, cy + r * 0.7 - 2, 2 * r + 4, 3); // stone platform with a step
        const ch = dbl ? 26 : 22, cols = [[-r + 3, -r * 0.7 + 3], [r - 4, -r * 0.7 + 3], [-r + 3, r * 0.7 - 2], [r - 4, r * 0.7 - 2]];
        g.fillStyle = 'rgba(20,10,6,0.35)'; g.fillRect(cx - r + 3, cy - r * 0.7 + 3 - ch, 2 * r - 6, 6);
        for (const [dx, dy] of cols) { g.fillStyle = RED; g.fillRect(Math.round(cx + dx), Math.round(cy + dy) - ch, 3, ch); g.fillStyle = RED_D; g.fillRect(Math.round(cx + dx) + 2, Math.round(cy + dy) - ch, 1, ch); }
        g.fillStyle = RED_D; g.fillRect(cx - r + 3, cy + r * 0.7 - 2 - ch, 2 * r - 6, 3); // lintel
        g.fillStyle = '#e0c060'; for (let x = cx - r + 6; x < cx + r - 6; x += 6) g.fillRect(Math.round(x), Math.round(cy + r * 0.7 - 1 - ch), 3, 1);
        // pyramidal (攒尖) roof with upturned corners; a second, smaller tier on the middle pavilion
        const tier = (rr, base, hgt) => { const by = cy + r * 0.7 - 2 - base, ty = by - hgt;
          g.fillStyle = rgb(ROOF, 0.72); g.beginPath(); g.moveTo(cx - rr - 4, by - 2); g.lineTo(cx, ty); g.lineTo(cx + rr + 4, by - 2); g.lineTo(cx + rr, by + 2); g.lineTo(cx - rr, by + 2); g.closePath(); g.fill();
          g.fillStyle = rgb(ROOF); g.beginPath(); g.moveTo(cx - rr, by); g.lineTo(cx, ty); g.lineTo(cx + rr, by); g.closePath(); g.fill();
          g.save(); g.beginPath(); g.moveTo(cx - rr, by); g.lineTo(cx, ty); g.lineTo(cx + rr, by); g.closePath(); g.clip();
          for (let x = cx - rr; x < cx + rr; x += 3) { g.fillStyle = rgb(ROOF, ((x - cx) / 3 & 1) ? 0.82 : 1.08); g.fillRect(Math.round(x), ty, 1, by - ty); } g.restore();
          g.fillStyle = rgb(ROOF, 1.3); g.fillRect(Math.round(cx) - 1, ty, 2, by - ty); // hip ridge
          g.fillStyle = EAVE; g.fillRect(Math.round(cx - rr), Math.round(by), Math.round(2 * rr), 2);
          for (const sx of [-1, 1]) { g.fillStyle = rgb(ROOF, 0.6); g.fillRect(Math.round(cx + sx * (rr + 4)) - (sx < 0 ? 0 : 2), Math.round(by) - 5, 2, 4); } // flying eaves
          return ty; };
        let top = tier(r + 3, ch, Math.round(r * 0.9));
        if (dbl) top = tier(r * 0.6, ch + Math.round(r * 0.5), Math.round(r * 0.75));
        g.fillStyle = '#d8b45a'; g.fillRect(Math.round(cx) - 1, top - 5, 3, 6); g.fillRect(Math.round(cx) - 2, top - 7, 5, 3); // 宝顶 finial
      } });
    }
    items.sort((p, q) => p.y - q.y); for (const it of items) it.draw();
    const pts = b.poly.map(([x, y]) => [x * T - ox, y * T - oy]);
    return { cv, base: cv, roof: pts, roofKind: 'red', seed: hashStr(b.id), ox, oy, W, H, wh, kind: 'pavilion', wins: [] };
  }
  // v7.4: one 左视图 face. Local frame: u along the wall from its south corner (0) to its north end (D px), v up from the
  // ground (0..wh). Window columns sit at fixed depth steps, floors / spandrel bands / brick courses follow the front.
  function leftFace(g, b, lk, kind, f, ox, oy, wh, floors, fh, pal, band, rnd, wins) {
    const Sx = f.S[0] * T - ox, Sy = f.S[1] * T - oy, L = Core.OBL.SHADE.left;
    let D = f.D * T; const ux = (f.Np[0] * T - ox - Sx) / D;
    g.save();
    if (f.rect) { D = f.w * T; g.transform(-1, 0, 0, -1, Sx, Sy); } // v7.5 mock-up: axis-aligned side rectangle, u = px leftwards
    else g.transform(ux, -1, 0, -1, Sx, Sy);
    g.fillStyle = rgb(pal[0], L); g.fillRect(0, 0, D, wh);
    g.fillStyle = rgb(pal[1], L * 0.85); g.fillRect(0, 0, D, 4);                                   // plinth
    if (lk.style === 'brick') { g.fillStyle = rgb(pal[1], L * 1.02); for (let v = 4; v < wh; v += 3) g.fillRect(0, v, D, 1);
      g.fillStyle = rgb([226, 214, 196], L); for (let k = 1; k <= floors; k++) g.fillRect(0, 6 + k * fh - 2, D, 2); }
    if (band && kind !== 'pavilion') { g.fillStyle = rgb(band, L); for (let k = 0; k < floors; k++) g.fillRect(0, 6 + k * fh, D, Math.max(2, Math.round(fh * 0.28))); }
    const step = f.rect ? (kind === 'gym' ? 12 : 8) : kind === 'gym' ? 14 : 10, ww = f.rect ? (kind === 'gym' ? 9 : 4) : kind === 'gym' ? 9 : 5, whh = Math.max(3, Math.round(fh * (kind === 'gym' ? 0.75 : 0.55)));
    if (D >= (f.rect ? 10 : 14)) for (let u = f.rect ? 3 : 4; u + ww <= D - 3; u += step) for (let k = 0; k < floors; k++) {
      const v0 = 6 + (k + 1) * fh - 2 - whh;
      g.fillStyle = rgb(pal[3], L); g.fillRect(u - 1, v0 - 1, ww + 2, whh + 2);
      const lit = rnd() < 0.06; g.fillStyle = lit ? '#d9c27e' : rgb(pal[2], L * 1.02); g.fillRect(u, v0, ww, whh);
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(u, v0 + whh - 1, ww, 1);
    }
    g.fillStyle = rgb(pal[1], L * 0.95); for (let k = 1; k < floors; k++) g.fillRect(0, 6 + k * fh, D, 1);   // floor lines
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(D - 1, 0, 1, wh);                                      // back arris
    g.restore();
    if (Core.OBL.MODE !== 'A') { g.fillStyle = Core.OBL.MODE === 'shear' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)'; g.fillRect(Math.round(Sx), Math.round(Sy - wh), 1, Math.round(wh)); } // front-left corner, lit edge
  }
  // v7.5 taper mock-up: every non-south wall as a quad from its ground edge up to the inset roof edge (drawn before the
  // fronts and the roof, which cover what is hidden). West walls 0.72, east 0.8, back 0.66. Windows on the side walls are
  // laid out bilinearly between the ground edge and the roof edge, so they follow the lean.
  function taperWalls(g, pts, RT, ccw, wh, kind, lk, pal, band, floors, fh, rnd) {
    const E = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length], ex = c[0] - a[0], ey = c[1] - a[1], L = Math.hypot(ex, ey); if (L < 0.5) continue;
      let nx = ey, ny = -ex; if (!ccw) { nx = -nx; ny = -ny; } nx /= L; ny /= L;
      if (ny > 0.02) continue; E.push({ a, c, nx, ny, ord: ny < -0.5 ? 0 : 1 });
    }
    E.sort((p, q) => p.ord - q.ord);
    const up = p => { const r = RT(p); return [r[0], r[1] - wh]; }, lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    for (const e of E) {
      const light = e.nx < -0.5 ? Core.OBL.SHADE.left : e.nx > 0.5 ? 0.8 : 0.66, A = e.a, C = e.c, Au = up(A), Cu = up(C);
      const at = (s, v) => lerp(lerp(A, C, s), lerp(Au, Cu, s), v);          // s along the wall, v up the wall (0 ground .. 1 roof)
      const quad = (s0, s1, v0, v1) => { const p = [at(s0, v0), at(s1, v0), at(s1, v1), at(s0, v1)]; g.beginPath(); p.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
      g.fillStyle = rgb(pal[0], light); quad(0, 1, 0, 1);
      g.fillStyle = rgb(pal[1], light * 0.85); quad(0, 1, 0, 4 / wh);
      if (band && kind !== 'pavilion') { g.fillStyle = rgb(band, light); for (let k = 0; k < floors; k++) quad(0, 1, (6 + k * fh) / wh, (6 + k * fh + Math.max(2, Math.round(fh * 0.28))) / wh); }
      if (Math.abs(e.nx) > 0.5) {
        const len = Math.hypot(C[0] - A[0], C[1] - A[1]), step = kind === 'gym' ? 14 : 10, n = Math.floor((len - 6) / step), whh = Math.max(3, Math.round(fh * (kind === 'gym' ? 0.75 : 0.55)));
        for (let j = 0; j < n; j++) { const s0 = (4 + j * step) / len, s1 = s0 + (kind === 'gym' ? 8 : 5) / len;
          for (let k = 0; k < floors; k++) { const v1 = (6 + (k + 1) * fh - 2) / wh, v0 = v1 - whh / wh;
            g.fillStyle = rgb(pal[3], light); quad(s0 - 1 / len, s1 + 1 / len, v0 - 1 / wh, v1 + 1 / wh);
            g.fillStyle = rnd() < 0.06 ? '#d9c27e' : rgb(pal[2], light * 1.02); quad(s0, s1, v0, v1); } }
      }
      g.fillStyle = rgb(pal[1], light * 0.95); for (let k = 1; k < floors; k++) quad(0, 1, (6 + k * fh) / wh, (7 + k * fh) / wh);
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(A[0] + 0.5, A[1]); g.lineTo(Au[0] + 0.5, Au[1]); g.stroke(); // hip edge
    }
  }
  // v7.6.2 grandstand seating, 主席台 canopy and the 瑾瑜国际会议中心 fan-shaped hall: all drawn with axis-aligned
  // bands / concentric arcs only (no diagonal hatching anywhere)
  function specialRoof(g, b, kind, rb, rc, pts2, wh, rnd) {
    const [x0, y0, x1, y1] = rb, W = x1 - x0, H = y1 - y0;
    if (kind === 'v764_semi') { // 屋顶光伏板 (效果图): rows of tilted dark-blue panels with light frames, kept inside the roof
      for (let y = y0 + 6; y + 7 < y1 - 4; y += 10) for (let x = x0 + 6; x + 14 < x1 - 4; x += 16) {
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 1, y + 6, 14, 2); g.fillStyle = '#2c4a78'; g.fillRect(x, y, 14, 6);
        g.fillStyle = '#5d7fb0'; g.fillRect(x, y, 14, 1); g.fillStyle = 'rgba(200,215,235,0.35)'; for (let k = 3; k < 14; k += 4) g.fillRect(x + k, y + 1, 1, 5); }
      return; }
    if (kind === 'stand') { // stepped bleacher rows parallel to the track; the low front row faces the track
      const face = b.face || 'e', n = Math.max(3, Math.floor(W / 5)), rw = W / n;
      for (let i = 0; i < n; i++) { const k = face === 'e' ? n - 1 - i : i, X = Math.round(x0 + i * rw);       // k = row height (0 = front)
        g.fillStyle = 'rgb(' + (150 + k * 9) + ',' + (148 + k * 9) + ',' + (140 + k * 8) + ')'; g.fillRect(X, y0, Math.ceil(rw), H); // concrete tread
        const seat = (k & 1) ? [214, 70, 56] : [236, 196, 70]; g.fillStyle = `rgb(${seat})`;                      // seat row (red / yellow)
        for (let y = y0 + 2; y < y1 - 2; y += 4) g.fillRect(X + 1, Math.round(y), Math.max(2, Math.round(rw) - 3), 2);
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(face === 'e' ? X + Math.ceil(rw) - 1 : X, y0, 1, H); }       // riser shadow
      for (let y = y0 + 40; y < y1 - 20; y += 72) { g.fillStyle = '#b7b1a4'; g.fillRect(x0, Math.round(y), W, 6); g.fillStyle = '#8f897c'; for (let x = x0; x < x1; x += 3) g.fillRect(Math.round(x), Math.round(y) + 5, 2, 1); } // aisle stairs
      g.strokeStyle = '#e8e4da'; g.lineWidth = 2; path(g, pts2, 0, -wh); g.stroke();
      g.fillStyle = '#6b6f76'; for (let y = y0; y <= y1; y += 8) g.fillRect(face === 'e' ? x0 : x1 - 2, Math.round(y), 2, 2); // rear railing posts
      return; }
    if (kind === 'tribune') { // 主席台: tiers + podium under a white canopy on columns, flags on the roof edge
      const cx = (x0 + x1) / 2, face = b.face || 'e';
      g.fillStyle = '#b8b2a5'; g.fillRect(x0, y0, W, H);
      for (let i = 0; i < 3; i++) { g.fillStyle = `rgb(${190 - i * 14},${60 + i * 6},${50 + i * 4})`; const X = face === 'e' ? x1 - (i + 1) * W / 4 : x0 + i * W / 4; g.fillRect(Math.round(X), y0 + 6, Math.ceil(W / 4) - 1, H - 12); }
      const cy0 = y0 - 10, ch = H + 4; g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0 + 4, cy0 + 12, W - 2, ch);            // canopy shadow
      g.fillStyle = '#f1f3f4'; g.fillRect(x0 - 2, cy0, W + 4, ch); g.fillStyle = '#d6dadd'; for (let y = cy0 + 6; y < cy0 + ch; y += 8) g.fillRect(x0 - 2, y, W + 4, 1); // canopy ribs
      g.fillStyle = '#9aa3aa'; g.fillRect(x0 - 2, cy0 + ch - 2, W + 4, 2);
      const fx = face === 'e' ? x1 - 3 : x0 + 1; for (const [dy, c] of [[-12, '#d0342c'], [0, '#d0342c'], [12, '#d0342c']]) { const Y = Math.round((y0 + y1) / 2 + dy * 2);
        g.fillStyle = '#5b5b5b'; g.fillRect(fx, Y - 18, 1, 18); g.fillStyle = c; g.fillRect(fx + 1, Y - 18, 6, 4); }
      g.fillStyle = '#e2c25c'; g.fillRect(Math.round(cx) - 6, Math.round((y0 + y1) / 2) - 3, 12, 6); void rnd; return; }
    // 瑾瑜国际会议中心: pale stone podium roof with a glazed strip, the fan-shaped 报告厅 stepping down in concentric bands
    g.fillStyle = rgb(rc, 1.02); g.fillRect(x0, y0, W, H);
    for (let y = y0; y < y1; y += 12) { g.fillStyle = rgb(rc, 0.95); g.fillRect(x0, Math.round(y), W, 1); }
    const fan = b.fan; if (fan) { const T = 16, ox = rb.ox || 0; void ox;
      const c = b._fanPx, r = b._fanR; if (c) {
        for (let i = 0; i < 7; i++) { g.fillStyle = i & 1 ? '#c9b8a2' : '#ddd0bc'; g.beginPath(); g.moveTo(c[0], c[1]); g.arc(c[0], c[1], r * (1 - i * 0.12), Math.PI / 2, Math.PI); g.closePath(); g.fill(); }
        g.fillStyle = '#3e6377'; g.beginPath(); g.moveTo(c[0], c[1]); g.arc(c[0], c[1], r * 0.18, Math.PI / 2, Math.PI); g.closePath(); g.fill(); // glass lantern at the apex
        g.strokeStyle = '#f8f4ea'; g.lineWidth = 2; g.beginPath(); g.arc(c[0], c[1], r - 1, Math.PI / 2, Math.PI); g.stroke(); } void T; }
    const gx0 = x0 + W * 0.08, gw = W * 0.5; g.fillStyle = '#6f93a6'; g.fillRect(Math.round(gx0), Math.round(y0 + H * 0.1), Math.round(gw), 8); // skylight strip
    g.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = gx0; x < gx0 + gw; x += 6) g.fillRect(Math.round(x), Math.round(y0 + H * 0.1), 1, 8);
    g.strokeStyle = rgb(rc, 1.2); g.lineWidth = 4; path(g, pts2, 0, -wh); g.stroke();
  }
  function render(b) {
    if (b.corridor) return renderCorridor(b);
    const wh = Core.wallHeight(b);
    const kind = b.special || (b.k === 'pavilion' ? 'pavilion' : b.k);
    const lk = look(b, kind), pal = ((lk.pal && LOOK_PAL[lk.pal]) || FACADE[kind] || FACADE.res).map(hexToRgb), band = lk.band ? hexToRgb(lk.band) : null;
    const [, by0, bx1, by1] = b.bbox, ob = Core.oblique(b), bx0 = ob.x0;
    const ox = Math.floor(bx0 * T) - 6, oy = Math.floor(by0 * T) - wh - 6;
    const W = Math.ceil(bx1 * T) - ox + 10, H = Math.ceil(by1 * T) - oy + 8;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const pts = b.poly.map(([x, y]) => [x * T - ox, y * T - oy]);
    const tp = Core.taper ? Core.taper(b) : null; // v7.5 mock-up (?obl=D|E): roof inset into the base, walls lean in
    const TX0 = Math.min(...pts.map(p => p[0])), TX1 = Math.max(...pts.map(p => p[0])), TY0 = Math.min(...pts.map(p => p[1])), TY1 = Math.max(...pts.map(p => p[1]));
    const RT = tp ? ([x, y]) => [TX0 + tp.iL + (x - TX0) * (TX1 - TX0 - tp.iL - tp.iR) / Math.max(1, TX1 - TX0), TY0 + tp.t + (y - TY0) * (TY1 - TY0 - tp.t) / Math.max(1, TY1 - TY0)] : p => p;
    const pts2 = tp ? pts.map(RT) : ob.poly.map(([x, y]) => [x * T - ox, y * T - oy]); // v7.4: footprint + left-face wedges (roof outline / pieces)
    const ccw = area(pts) > 0; // in screen coords (y down): >0 means clockwise visually
    const rnd = Core.mulberry(hashStr(b.id));
    // 1. soft ground shadow + plinth (drawn on ground side)
    if (Core.OBL.MODE === 'flat') { g.fillStyle = 'rgba(40,50,30,0.22)'; path(g, pts, 7, 5); g.fill(); g.fillStyle = 'rgba(40,50,30,0.14)'; path(g, pts, 3, 2); g.fill(); } // v7.5 soft drop shadow, lower right
    else { g.fillStyle = 'rgba(40,50,30,0.28)'; path(g, tp ? pts : pts2, 5, 3); g.fill(); }
    // 2. extruded walls: south-facing edges
    const edges = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], c = pts[(i + 1) % pts.length];
      const ex = c[0] - a[0], ey = c[1] - a[1];
      let nx = ey, ny = -ex; if (!ccw) { nx = -nx; ny = -ny; } // outward normal
      const L = Math.hypot(ex, ey); if (L < 0.5) continue;
      if (ny / L > (Core.OBL.MODE === 'flat' ? Core.OBL.FRONT_MIN : 0.02)) edges.push({ a, c, nx: nx / L, ny: ny / L, my: (a[1] + c[1]) / 2 });
    }
    edges.sort((p, q) => p.my - q.my);
    const floors = Math.max(1, b.f || 1), fh = (wh - 6) / floors, wins = [];
    // v7.4 左视图: each west wall as a side elevation (u = depth from the south corner, v = height), sheared onto the
    // screen by the cabinet transform u -> ((N'x - Sx) / D, -1), v -> (0, -1). Same material as the front, darker.
    for (const f of ob.faces) leftFace(g, b, lk, kind, f, ox, oy, wh, floors, fh, pal, band, rnd, wins);
    if (tp) taperWalls(g, pts, RT, ccw, wh, kind, lk, pal, band, floors, fh, rnd);
    const topOf = tp && tp.front === 'trap' ? p => { const r = RT(p); return [r[0], r[1] - wh]; } : p => [p[0], p[1] - wh];
    for (const e of edges) {
      const light = Core.OBL.SHADE.front + 0.1 * e.ny - 0.08 * e.nx; // v7.4: front mid, (sun upper right) east-turned walls a touch darker
      g.fillStyle = rgb(pal[0], light);
      const ta = topOf(e.a), tc = topOf(e.c), trap = ta[0] !== e.a[0] || tc[0] !== e.c[0];
      g.beginPath(); g.moveTo(e.a[0], e.a[1]); g.lineTo(e.c[0], e.c[1]); g.lineTo(tc[0], tc[1]); g.lineTo(ta[0], ta[1]); g.closePath(); g.fill();
      if (trap) { g.save(); g.clip(); } // v7.5 E: everything on this front stays inside the trapezoid
      const xv = (x, v) => trap ? x + v * (RT([x, 0])[0] - x) : x; // window x at height fraction v follows the lean
      // plinth
      g.fillStyle = rgb(pal[1], light * 0.85);
      g.beginPath(); g.moveTo(e.a[0], e.a[1]); g.lineTo(e.c[0], e.c[1]); g.lineTo(e.c[0], e.c[1] - 4); g.lineTo(e.a[0], e.a[1] - 4); g.closePath(); g.fill();
      if (lk.style === 'brick') { // brick courses with staggered joints
        g.save(); g.beginPath(); g.moveTo(e.a[0], e.a[1] - 4); g.lineTo(e.c[0], e.c[1] - 4); g.lineTo(e.c[0], e.c[1] - wh); g.lineTo(e.a[0], e.a[1] - wh); g.closePath(); g.clip();
        const bx0 = Math.min(e.a[0], e.c[0]), bx1 = Math.max(e.a[0], e.c[0]), by0 = Math.min(e.a[1], e.c[1]) - wh, by1 = Math.max(e.a[1], e.c[1]);
        g.fillStyle = rgb(pal[1], light * 1.05);
        for (let y = by0, r = 0; y < by1; y += 3, r++) { g.fillRect(bx0, y, bx1 - bx0, 1); for (let x = bx0 + (r & 1) * 3; x < bx1; x += 6) g.fillRect(x, y, 1, 3); }
        g.fillStyle = rgb([226, 214, 196], light); // concrete floor slabs show as light bands
        for (let f = 1; f <= floors; f++) { const dy = 6 + f * fh - 1; for (let x = bx0; x < bx1; x++) { const t = (x - e.a[0]) / ((e.c[0] - e.a[0]) || 1), y = e.a[1] + t * (e.c[1] - e.a[1]); g.fillRect(x, Math.round(y - dy), 1, 2); } }
        g.restore();
      }
      if (band && kind !== 'pavilion') { // coloured spandrel band under each floor's windows
        g.fillStyle = rgb(band, light);
        for (let f = 0; f < floors; f++) { const dy0 = 6 + f * fh, hh = Math.max(2, Math.round(fh * 0.28));
          g.beginPath(); g.moveTo(e.a[0], e.a[1] - dy0); g.lineTo(e.c[0], e.c[1] - dy0); g.lineTo(e.c[0], e.c[1] - dy0 - hh); g.lineTo(e.a[0], e.a[1] - dy0 - hh); g.closePath(); g.fill(); }
      }
      if (kind === 'pavilion') { if (trap) g.restore(); continue; }
      // windows: walk along the edge in 8px steps
      const len = Math.abs(e.c[0] - e.a[0]); if (len < 6) { if (trap) g.restore(); continue; }
      const strip = lk.style === 'strip' && kind !== 'gym';
      const step = kind === 'gym' ? 12 : strip ? 6 : 8, ww = kind === 'gym' ? 9 : strip ? 5 : 4;
      const x0 = Math.min(e.a[0], e.c[0]), x1 = Math.max(e.a[0], e.c[0]);
      const stairs = lk.stair && len > 90 ? (len > 220 ? [x0 + len / 3, x0 + 2 * len / 3] : [x0 + len / 2]).map(Math.round) : [];
      const yAt = x => { const t = (x - e.a[0]) / ((e.c[0] - e.a[0]) || 1); return e.a[1] + t * (e.c[1] - e.a[1]); };
      let col = 0;
      for (let x0w = x0 + 3; x0w + ww <= x1 - 2; x0w += step, col++) {
        if (stairs.some(sx => Math.abs(x0w + ww / 2 - sx) < 7)) continue;            // stair core goes here
        if (lk.pair && col % 3 === 2) continue;                                      // pairs: skip every third slot
        const t = (x0w + ww / 2 - e.a[0]) / (e.c[0] - e.a[0]); const baseY = e.a[1] + t * (e.c[1] - e.a[1]);
        for (let f = 0; f < floors; f++) {
          const wy = Math.round(baseY - 6 - (f + 1) * fh + 2), whh = Math.max(3, Math.round(fh * (kind === 'gym' ? 0.75 : 0.55)));
          const x = xv(x0w, (6 + (f + 1) * fh - 2 - whh / 2) / wh);
          g.fillStyle = rgb(pal[3], light); g.fillRect(Math.round(x) - 1, wy - 1, ww + 2, whh + 2);
          const lit = rnd() < 0.08, wk = 0.95 + rnd() * 0.12;
          g.fillStyle = lit ? '#f3d98a' : rgb(pal[2], wk); g.fillRect(Math.round(x), wy, ww, whh);
          wins.push({ x: Math.round(x), y: wy, w: ww, h: whh, f, exp: lit ? [243, 217, 138] : pal[2].map(v => Math.min(255, v * wk) | 0) });
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(Math.round(x), wy, 1, Math.max(1, whh - 1));
          if (strip) { g.fillStyle = rgb(pal[2], 0.9); g.fillRect(Math.round(x) + ww, wy, step - ww, whh); }  // ribbon glazing between mullions
          if (lk.style === 'balcony' && (col & 1) === 0 && fh >= 7) { // balcony slab + rail in front of every other bay
            const by = wy + whh + 1, bw = step + ww; g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(Math.round(x) - 2, by + 2, bw, 1);
            g.fillStyle = rgb(pal[3], light * 0.98); g.fillRect(Math.round(x) - 2, by - 2, bw, 3); g.fillStyle = rgb(pal[1], light); g.fillRect(Math.round(x) - 2, by + 1, bw, 1);
          }
        }
      }
      for (const sx0 of stairs) { // stair core: lighter pier with tall narrow glazing offset half a floor
        const by = yAt(sx0), sx = Math.round(xv(sx0, 0.5)); g.fillStyle = rgb(pal[3], light * 0.97); g.fillRect(sx - 6, Math.round(by - wh), 12, wh - 4);
        g.fillStyle = rgb(pal[1], light); g.fillRect(sx - 6, Math.round(by - wh), 1, wh - 4); g.fillRect(sx + 5, Math.round(by - wh), 1, wh - 4);
        for (let f = 0; f < floors; f++) { const wy = Math.round(by - 6 - (f + 0.5) * fh - fh * 0.35); if (wy < by - wh + 3) continue; g.fillStyle = rgb(pal[2], 1.05); g.fillRect(sx - 2, wy, 4, Math.max(3, Math.round(fh * 0.7))); }
      }
      // floor band lines
      g.strokeStyle = rgb(pal[1], light); g.lineWidth = 1;
      for (let f = 1; f < floors; f++) { const dy = 6 + f * fh; g.beginPath(); g.moveTo(e.a[0], e.a[1] - dy + 0.5); g.lineTo(e.c[0], e.c[1] - dy + 0.5); g.stroke(); }
      if (trap) g.restore();
      if (trap) { g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.moveTo(e.a[0], e.a[1]); g.lineTo(ta[0], ta[1]); g.lineTo(ta[0] + 1, ta[1]); g.lineTo(e.a[0] + 1, e.a[1]); g.fill(); }
      if (b.found) foundation(g, b, e, ox, light);
    }
    // 3. roof
    const rc = roofColor(b);
    g.save(); path(g, pts2, 0, -wh); g.clip();
    g.fillStyle = rgb(rc); g.fillRect(0, 0, W, H);
    const rb = tp ? [Math.min(...pts2.map(p => p[0])), Math.min(...pts2.map(p => p[1])) - wh, Math.max(...pts2.map(p => p[0])), Math.max(...pts2.map(p => p[1])) - wh] : [Math.min(...pts2.map(p => p[0])), Math.min(...pts.map(p => p[1])) - wh, Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1])) - wh];
    if (b.roof === 'red' || kind === 'pavilion') { // clay tiles, ridge, lit north slope
      const cy = (rb[1] + rb[3]) / 2;
      g.fillStyle = rgb(rc, 1.12); g.fillRect(0, 0, W, cy);
      for (let y = rb[1]; y < rb[3]; y += 3) { g.fillStyle = rgb(rc, y < cy ? 0.97 : 0.8); g.fillRect(0, Math.round(y), W, 1); }
      for (let y = rb[1]; y < rb[3]; y += 3) for (let x = rb[0] + ((y / 3) & 1) * 3; x < rb[2]; x += 6) { g.fillStyle = rgb(rc, 0.85); g.fillRect(Math.round(x), Math.round(y), 1, 2); }
      g.fillStyle = rgb(rc, 0.6); g.fillRect(0, Math.round(cy) - 1, W, 2);
    } else if (b.roof === 'blue') {
      for (let x = rb[0]; x < rb[2]; x += 4) { g.fillStyle = rgb(rc, 1.15); g.fillRect(Math.round(x), 0, 1, H); g.fillStyle = rgb(rc, 0.85); g.fillRect(Math.round(x) + 2, 0, 1, H); }
    } else if (b.roof === 'dome') {
      const cx = (rb[0] + rb[2]) / 2, cy = (rb[1] + rb[3]) / 2, r = Math.min(rb[2] - rb[0], rb[3] - rb[1]) / 2;
      for (let i = 6; i >= 0; i--) { g.fillStyle = rgb(rc, 0.75 + i * 0.05); g.beginPath(); g.arc(cx - i * 0.6, cy - i, r * (0.4 + i * 0.09), 0, 7); g.fill(); }
    } else if (kind === 'stand' || kind === 'tribune' || kind === 'jinyu' || kind === 'v764_semi') { // v7.6.2 dedicated roofs (no diagonal hatching)
      b._fanPx = b.fan ? [b.fan[0] * T - ox, b.fan[1] * T - oy - wh] : null; b._fanR = b.fan ? b.fan[2] * T : 0;
      specialRoof(g, b, kind, rb, rc, pts2, wh, rnd);
    } else { // flat concrete roof: paver grid, noise, parapet, rooftop units
      const rx0 = Math.floor(rb[0]), ry0 = Math.floor(rb[1]);
      for (let y = ry0; y < rb[3]; y += 8) { g.fillStyle = rgb(rc, 0.93); g.fillRect(0, y, W, 1); }
      for (let y = ry0; y < rb[3]; y += 8) for (let x = rx0 + ((((y - ry0) >> 3) & 1) ? 4 : 0); x < rb[2]; x += 8) { g.fillStyle = rgb(rc, 0.95); g.fillRect(x, y, 1, 8); if (rnd() < 0.18) { g.fillStyle = rgb(rc, rnd() < 0.5 ? 0.97 : 1.04); g.fillRect(x + 1, y + 1, 7, 7); } }
      for (let i = 0; i < (rb[2] - rb[0]) * (rb[3] - rb[1]) / 40; i++) { g.fillStyle = rnd() < 0.5 ? rgb(rc, 0.9) : rgb(rc, 1.07); g.fillRect(rb[0] + rnd() * (rb[2] - rb[0]) | 0, rb[1] + rnd() * (rb[3] - rb[1]) | 0, 1, 1); }
      // parapet: light rim + inner shadow on the north/west inside
      g.strokeStyle = rgb(rc, 1.2); g.lineWidth = 6; path(g, pts2, 0, -wh); g.stroke();
      g.strokeStyle = rgb(rc, 0.72); g.lineWidth = 2; path(g, pts2, 3, -wh + 3); g.stroke();
      g.strokeStyle = rgb(rc, 1.2); g.lineWidth = 6; path(g, pts2, 0, -wh); g.stroke();
      roofDetails(g, b, kind, rb, rc, tp ? pts2 : pts, wh, rnd);
    }
    g.restore();
    const inside = (x, y) => { path(g, tp ? pts2 : pts, 0, -wh); return g.isPointInPath(x, y); };
    const box = (x0, y0, w, d, h, top, wall, win) => { // small extruded box sitting on the roof (front face south)
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x0 + 4, y0 + 3, w, d);
      g.fillStyle = wall; g.fillRect(x0, y0 + d - h, w, h);
      if (win) for (let x = x0 + 4; x + 5 < x0 + w - 2; x += 9) for (let y = y0 + d - h + 5; y + 6 < y0 + d - 2; y += 11) { g.fillStyle = win; g.fillRect(x, y, 5, 6); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x, y, 1, 5); }
      g.fillStyle = top; g.fillRect(x0, y0 - h, w, d); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x0, y0 - h, w, 2); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x0, y0 - h + d - 2, w, 2);
    };
    if (kind === 'main') {
      const dx0 = b.door[0] * T - ox, south = b.door[1] * T - oy - wh;
      box(Math.round(dx0 - 80), Math.round(south - 150), 160, 120, 42, rgb(rc, 1.06), rgb(pal[0], 0.96), rgb(pal[2]));
      box(Math.round(dx0 - 30), Math.round(south - 190), 60, 40, 22, rgb(rc, 1.0), rgb(pal[0], 0.9), rgb(pal[2]));
    } else if (!b.roof && (rb[2] - rb[0]) * (rb[3] - rb[1]) > 9000) {
      const cx = (rb[0] + rb[2]) / 2, cy = (rb[1] + rb[3]) / 2, w = Math.max(24, (rb[2] - rb[0]) * 0.22) | 0, d = Math.max(18, (rb[3] - rb[1]) * 0.18) | 0;
      if (inside(cx - w / 2, cy - d / 2) && inside(cx + w / 2, cy + d / 2) && inside(cx - w / 2, cy + d / 2) && inside(cx + w / 2, cy - d / 2))
        box(Math.round(cx - w / 2), Math.round(cy - d / 2 + 6), w, d, 12, rgb(rc, 1.05), rgb(pal[0], 0.92), null);
    }
    if (lk.court) { // 回字楼: open courtyard in the middle of the roof; its north inner wall faces the viewer
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const ip = pts.map(([x, y]) => [cx + (x - cx) * lk.court, cy + (y - cy) * lk.court]);
      g.save(); path(g, ip, 0, -wh); g.clip();
      g.fillStyle = rgb(pal[0], 0.86); g.fillRect(0, 0, W, H);                       // inner wall
      const iy0 = Math.min(...ip.map(p => p[1])) - wh, ix0 = Math.min(...ip.map(p => p[0])), ix1 = Math.max(...ip.map(p => p[0]));
      for (let f = 0; f < floors; f++) { const wy = Math.round(iy0 + 4 + f * fh); g.fillStyle = band ? rgb(band, 0.86) : rgb(pal[1], 0.9); g.fillRect(ix0, wy + Math.round(fh * 0.62), ix1 - ix0, 2);
        for (let x = ix0 + 3; x + 4 < ix1 - 2; x += 8) { g.fillStyle = rgb(pal[3], 0.9); g.fillRect(x - 1, wy + 1, 6, Math.round(fh * 0.55) + 2); g.fillStyle = rgb(pal[2], 0.9); g.fillRect(x, wy + 2, 4, Math.round(fh * 0.55)); } }
      path(g, ip, 0, 0); g.fillStyle = '#cbc2a8'; g.fill();                             // courtyard paving at ground level
      g.fillStyle = '#7fae55'; const iw = ix1 - ix0, iyb = Math.min(...ip.map(p => p[1]));
      g.fillRect(Math.round(ix0 + iw * 0.25), Math.round(iyb + 8), Math.round(iw * 0.5), 10);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, Math.round(iyb), W, 4);
      g.restore();
      g.strokeStyle = rgb(rc, 1.2); g.lineWidth = 3; path(g, ip, 0, -wh); g.stroke();
    }
    // parapet / eaves outline
    g.lineJoin = 'miter';
    if (b.roof === 'red' || kind === 'pavilion') { g.strokeStyle = rgb(rc, 0.55); g.lineWidth = 2; path(g, pts2, 0, -wh); g.stroke(); }
    else { g.strokeStyle = rgb(rc, 0.62); g.lineWidth = 1; path(g, pts2, 0, -wh); g.stroke(); }
    if (Core.OBL.MODE === 'flat' && wh >= 14 && !b.corridor && !b.bridge) { // v7.5 Stardew eaves: roof overhangs the facade by ~2 px
      for (const e of edges) { const ax = Math.min(e.a[0], e.c[0]) - 2, bx = Math.max(e.a[0], e.c[0]) + 2, ya = e.a[0] < e.c[0] ? e.a[1] : e.c[1], yb = e.a[0] < e.c[0] ? e.c[1] : e.a[1];
        g.fillStyle = 'rgba(0,0,0,0.20)'; g.beginPath(); g.moveTo(ax, ya - wh + 1); g.lineTo(bx, yb - wh + 1); g.lineTo(bx, yb - wh + 4); g.lineTo(ax, ya - wh + 4); g.fill(); // shadow under the eave
        g.fillStyle = rgb(rc, 0.7); g.beginPath(); g.moveTo(ax, ya - wh - 1); g.lineTo(bx, yb - wh - 1); g.lineTo(bx, yb - wh + 2); g.lineTo(ax, ya - wh + 2); g.fill();   // fascia board
        g.fillStyle = rgb(rc, 1.15); g.beginPath(); g.moveTo(ax, ya - wh - 2); g.lineTo(bx, yb - wh - 2); g.lineTo(bx, yb - wh - 1); g.lineTo(ax, ya - wh - 1); g.fill(); } // lit drip edge
    }
    for (const f of ob.faces) { // lit roof edge along the top of each left face
      const S = [f.S[0] * T - ox, f.S[1] * T - oy - wh], Np = f.rect ? [f.Sp[0] * T - ox, f.Sp[1] * T - oy - wh] : [f.Np[0] * T - ox, f.Np[1] * T - oy - wh];
      g.strokeStyle = rgb(rc, 1.22); g.lineWidth = 1.5; g.beginPath(); g.moveTo(S[0], S[1]); g.lineTo(Np[0], Np[1]); g.stroke(); }
    // 4. special facades / doors
    const SIGN_TOP = 54; // v7.6.4: door-sign top edge, px above the door sill (bottom edge 39 px up > 34 px player sprite)
    const dx = b.door[0] * T - ox, dy = b.door[1] * T - oy - (b.stairs ? 20 : 0); // v7.3: entrance raised onto the stair landing
    if (kind === 'main' && window.LegacyArt) {
      // the user's original 主楼 facade (campus-walk v0.3.28) scaled onto the central south front
      const s = wh / 206; g.save(); g.translate(dx - 150 * s, dy - 220 * s); g.scale(s, s);
      LegacyArt.mainBuilding(g, { x: 0, y: 0, w: 300, h: 220 }); g.restore();
    } else if (kind === 'dehuai' && window.LegacyArt) {
      // the user's original 德怀楼 facade (campus-walk v0.3.28): central glazed tower + inner wings,
      // clipped to the real building's central V front so it follows the OSM footprint
      const s = wh / 190, front = pts.filter(p => Math.abs(p[0] - dx) <= 4.6 * T && p[1] >= dy - 4 * T).sort((p, q) => p[0] - q[0]);
      g.save(); g.beginPath(); front.forEach(([x, y], i) => i ? g.lineTo(x, y + 1) : g.moveTo(x, y + 1));
      for (let i = front.length - 1; i >= 0; i--) g.lineTo(front[i][0], front[i][1] - wh - 12); g.closePath(); g.clip();
      g.translate(dx - 230 * s, dy + 1 - 190 * s); g.scale(s, s);
      LegacyArt.dehuaiBuilding(g, { x: 0, y: 0, w: 460, h: 190 }); g.restore();
    } else if (kind === 'pavilion') {
      g.fillStyle = '#7a2418'; for (const p of pts) { g.fillRect(p[0] - 1, p[1] - wh, 3, wh); }
    } else if (b.nodoor) { // v7.6.4: no door on this front (龙山餐厅 is entered from the west porch / long stair)
    } else {
      // door
      g.fillStyle = rgb(pal[1], 0.7); g.fillRect(Math.round(dx) - 7, Math.round(dy) - 15, 14, 15);
      g.fillStyle = b.enter ? '#7b4a2a' : '#4d5a60'; g.fillRect(Math.round(dx) - 6, Math.round(dy) - 14, 12, 14);
      g.fillStyle = b.enter ? '#e8c172' : '#7f949c'; g.fillRect(Math.round(dx) - 5, Math.round(dy) - 12, 4, 8); g.fillRect(Math.round(dx) + 1, Math.round(dy) - 12, 4, 8);
      g.fillStyle = rgb(pal[3]); g.fillRect(Math.round(dx) - 9, Math.round(dy) - 18, 18, 3);
      if (b.enter) { // wooden sign board with name
        // v7.6.4: the board hangs on the facade ABOVE the player's head (sprite 34 px tall) so it never overlaps someone at the door
        const tw = Math.max(30, b.name.length * 12 + 8), st = Math.round(dy) - Math.min(Math.max(36, wh - 4), SIGN_TOP);
        g.fillStyle = '#3b1f10'; g.fillRect(Math.round(dx - tw / 2) - 1, st, tw + 2, 15);
        g.fillStyle = '#d79b4a'; g.fillRect(Math.round(dx - tw / 2), st + 1, tw, 13);
        g.font = '12px ArkPixel'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3b1f10'; g.fillText(b.name, Math.round(dx), st + 8);
      }
    }
    if (b.bridge) { // v7 items 18 / 19: open ground storeys. 连廊 = raised link on piers; 门洞 = ground-floor arcade you walk through
      const ch = Math.min(wh - 12, Math.round(b.bridge.clear * fh + 6)), arc = b.bridge.arcade;
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath();
      for (const e of edges) { g.moveTo(e.a[0], e.a[1] + 6); g.lineTo(e.c[0], e.c[1] + 6); g.lineTo(e.c[0], e.c[1] - ch); g.lineTo(e.a[0], e.a[1] - ch); g.closePath(); }
      g.fill(); g.globalCompositeOperation = 'source-over';
      for (const e of edges) { const x0 = Math.min(e.a[0], e.c[0]), x1 = Math.max(e.a[0], e.c[0]), y = Math.max(e.a[1], e.c[1]);
        // shade of the soffit on the ground behind the opening
        const gr = g.createLinearGradient(0, y - ch, 0, y); gr.addColorStop(0, arc ? 'rgba(20,14,10,0.62)' : 'rgba(20,14,10,0.30)'); gr.addColorStop(1, 'rgba(20,14,10,0.05)');
        g.fillStyle = gr; g.fillRect(x0, y - ch, x1 - x0, ch);
        g.fillStyle = rgb(pal[3], 0.8); g.fillRect(x0 - 1, y - ch - 3, x1 - x0 + 2, 4); // beam / slab edge
        const step = arc ? 22 : Math.max(24, (x1 - x0) / 2);
        for (let x = x0; x <= x1 + 0.5; x += step) { const X = Math.min(Math.round(x), Math.round(x1) - 4); // piers / columns
          g.fillStyle = rgb(pal[0], 0.92); g.fillRect(X, y - ch, 4, ch); g.fillStyle = rgb(pal[0], 0.7); g.fillRect(X + 3, y - ch, 1, ch); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(X - 1, y - 1, 6, 2); }
        if (arc) { for (let x = x0 + 4; x + 18 <= x1; x += 22) { g.fillStyle = rgb(pal[0], 0.92); g.beginPath(); g.moveTo(x, y - ch); g.lineTo(x + 18, y - ch); g.lineTo(x + 18, y - ch + 6); g.quadraticCurveTo(x + 9, y - ch - 2, x, y - ch + 6); g.closePath(); g.fill(); } }
      }
      g.restore();
    }
    if (b.passage) { // 穿堂: E-W ground-floor walk-through. v7.6.4: a clean opening with the building's normal shading -
      // no dark border lines on the roof and no black frame at the mouths, just a soft shadow fading into the opening
      const [py0, py1] = b.passage, Y0 = Math.round(py0 * T - oy), Y1 = Math.round(py1 * T - oy), xs = pts2.map(p => p[0]), X0 = Math.min(...xs), X1 = Math.max(...xs);
      for (const [X, dir] of [[X0, 1], [X1, -1]]) {
        const gr = g.createLinearGradient(X, 0, X + dir * 8, 0); gr.addColorStop(0, 'rgba(40,30,24,0.32)'); gr.addColorStop(1, 'rgba(40,30,24,0)');
        g.fillStyle = gr; g.fillRect(Math.min(X, X + dir * 8), Y0 - wh, 8, Y1 - Y0 + wh); }
    }
    // keep only windows still visible after later walls / roofs / facades were painted over them
    let vis = [];
    if (wins.length) { let ya = H, yb = 0, xa = W, xb = 0; for (const w of wins) { const px = Math.min(W - 1, w.x + w.w - 1), py = Math.min(H - 1, w.y + (w.h >> 1)); w.px = px; w.py = py; ya = Math.min(ya, py); yb = Math.max(yb, py); xa = Math.min(xa, px); xb = Math.max(xb, px); }
      const RW = xb - xa + 1, d = g.getImageData(xa, ya, RW, yb - ya + 1).data, seed = hashStr(b.id) % 9973;
      for (const w of wins) { const i = ((w.py - ya) * RW + (w.px - xa)) * 4;
        if (Math.abs(d[i] - w.exp[0]) <= 2 && Math.abs(d[i + 1] - w.exp[1]) <= 2 && Math.abs(d[i + 2] - w.exp[2]) <= 2) vis.push({ x: w.x, y: w.y, w: w.w, h: w.h, f: w.f, r: Core.hash2(w.x * 3 + seed, w.y * 5 + w.f) }); } }
    return { cv, base: cv, roof: pts2, roofKind: b.roof || (kind === 'pavilion' ? 'red' : 'flat'), seed: hashStr(b.id), ox, oy, W, H, wh, kind, wins: vis, faces: ob.faces.length };
  }
  // winter: copy of the sprite with snow lying on the roof (clipped to the lifted footprint), drifts against the
  // north parapet and a bright rim; pitched roofs keep a hint of their tile rows, flat roofs their rooftop units
  function snowy(spr) {
    if (spr.snow) return spr.snow;
    const cv = document.createElement('canvas'); cv.width = spr.W; cv.height = spr.H; const g = cv.getContext('2d'), rnd = Core.mulberry(spr.seed ^ 0x5eed);
    g.drawImage(spr.base, 0, 0); const P = spr.roof, wh = spr.wh;
    g.save(); path(g, P, 0, -wh); g.clip();
    const pitched = spr.roofKind === 'red' || spr.roofKind === 'blue';
    g.globalAlpha = pitched ? 0.78 : 0.7; g.fillStyle = '#eef3f9'; g.fillRect(0, 0, spr.W, spr.H); g.globalAlpha = 1;
    for (let i = 0, n = spr.W * spr.H / 26; i < n; i++) { g.fillStyle = rnd() < 0.6 ? '#f8fbff' : '#d6e0ee'; g.fillRect(rnd() * spr.W | 0, rnd() * spr.H | 0, 1 + (rnd() * 2 | 0), 1); }
    g.strokeStyle = 'rgba(170,188,214,0.7)'; g.lineWidth = 2; path(g, P, 2, -wh + 3); g.stroke(); // soft shadow inside the parapet
    g.restore();
    g.strokeStyle = '#f8fbff'; g.lineWidth = 1; path(g, P, 0, -wh - 1); g.stroke();
    // icicles / snow lip hanging over south eaves
    for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length]; if (Math.abs(c[0] - a[0]) < 6) continue;
      const x0 = Math.min(a[0], c[0]), x1 = Math.max(a[0], c[0]);
      for (let x = x0 + 2; x < x1 - 2; x += 3) { const t = (x - a[0]) / (c[0] - a[0]), y = Math.round(a[1] + t * (c[1] - a[1]) - wh);
        if (rnd() < 0.5) { g.fillStyle = '#f4f8fd'; g.fillRect(Math.round(x), y, 2, 1 + (rnd() * 2 | 0)); } } }
    return (spr.snow = cv);
  }
  // night: lit-window overlay for a sprite (same geometry as the sprite so pieces can reuse it)
  const LIT = { dorm: ['#ffd27a', '#ffe3a2', '#ffbf68'], res: ['#ffc977', '#ffdc9a', '#ffd0a0'], teach: ['#f1f4dc', '#fff4c4', '#e6efe8'], main: ['#f6f2d2', '#fff0bc'], dehuai: ['#f6f2d2', '#fff0bc'],
    library: ['#fff0c4', '#ffe6aa'], canteen: ['#ffe2a0', '#ffd27e'], gym: ['#eaf2ff', '#f4f6e8'], low: ['#ffd890', '#ffe7b0'] };
  function overlay(spr, frac, day) {
    const q = Math.round(frac * 20) / 20, key = q + ':' + (day | 0);
    if (spr.ov && spr.ov.key === key) return spr.ov.cv;
    if (!spr.wins.length || q <= 0) { spr.ov = { key, cv: null }; return null; }
    const cv = (spr.ov && spr.ov.cv) || document.createElement('canvas'); cv.width = spr.W; cv.height = spr.H; const g = cv.getContext('2d');
    const cols = LIT[spr.kind] || LIT.low; let n = 0;
    for (const w of spr.wins) {
      const r = (w.r + (day | 0) * 0.618) % 1; if (r >= q) continue; n++;
      const c = cols[Math.floor(Core.hash2(w.x, w.y + day) * cols.length)];
      g.globalAlpha = 0.28; g.fillStyle = c; g.fillRect(w.x - 1, w.y - 1, w.w + 2, w.h + 2);
      g.globalAlpha = 1; g.fillRect(w.x, w.y, w.w, w.h);
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(w.x, w.y, w.w, 1);
      if (Core.hash2(w.y, w.x + 17) < 0.25) { g.fillStyle = 'rgba(120,80,40,0.35)'; g.fillRect(w.x + (w.w >> 1), w.y + 1, Math.max(1, w.w >> 1), w.h - 1); } // curtain
    }
    spr.ov = { key, cv: n ? cv : null, lod: {} }; return spr.ov.cv;
  }
  // v7.6: no longer called; the whole building fades instead (game.js hidesPlayer / Core.fadeAlpha). Kept for reference.
  // v7.1: the cells of a sprite where its facade / roof is drawn over a road, footway or steps cell (outside the
  // footprint). The sprite renders normally; only while the player walks inside one of these cells does the game fade
  // that whole overlapping strip to ~22% alpha (see revealed(), game.js), so the covered road and the player show.
  // v7.2: the covered road strip as ONE clean shape: road / footway / steps cells under the sprite, gaps up to 2 tiles closed
  // along rows and columns (no ragged leftovers), drawn with a soft 3 px edge. Bridges (门洞 wing, 连廊) get a strip too.
  function revealRoads(spr, b, ground, meta, open) {
    if (!ground) return; const sub = meta.sub, gw = meta.w * sub, gh = meta.h * sub, cs = T / sub, rset = new Set();
    const sx0 = Math.max(0, Math.floor(spr.ox / cs)), sy0 = Math.max(0, Math.floor(spr.oy / cs)), sx1 = Math.min(gw, Math.ceil((spr.ox + spr.W) / cs)), sy1 = Math.min(gh, Math.ceil((spr.oy + spr.H) / cs));
    const w = sx1 - sx0, h = sy1 - sy0; if (w <= 0 || h <= 0) return; const m = new Uint8Array(w * h); let any = 0;
    const RR = meta.revealRects || [], PLZ = meta.classes ? meta.classes.indexOf('PLAZA') : -1, inRR = (x, y) => RR.some(r => x >= r[0] * sub && x < r[2] * sub && y >= r[1] * sub && y < r[3] * sub);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (sy0 + y) * gw + sx0 + x; if (open.has(ground[i]) || (ground[i] === PLZ && RR.length && inRR(sx0 + x, sy0 + y))) { m[y * w + x] = 1; rset.add(i); any = 1; } }
    if (!any) return; const GAP = 2 * sub;
    for (let y = 0; y < h; y++) { let last = -1; for (let x = 0; x < w; x++) if (m[y * w + x] & 1) { if (last >= 0 && x - last > 1 && x - last <= GAP + 1) for (let k = last + 1; k < x; k++) m[y * w + k] |= 2; last = x; } }
    for (let x = 0; x < w; x++) { let last = -1; for (let y = 0; y < h; y++) if (m[y * w + x]) { if (last >= 0 && y - last > 1 && y - last <= GAP + 1) for (let k = last + 1; k < y; k++) m[k * w + x] |= 2; last = y; } }
    const hard = document.createElement('canvas'); hard.width = spr.W; hard.height = spr.H; const hg = hard.getContext('2d'); hg.fillStyle = '#000';
    for (let y = 0; y < h; y++) { let x = 0; while (x < w) { if (!m[y * w + x]) { x++; continue; } let e = x; while (e < w && m[y * w + e]) e++;
      const X0 = Math.round((sx0 + x) * cs - spr.ox), X1 = Math.round((sx0 + e) * cs - spr.ox), Y0 = Math.round((sy0 + y) * cs - spr.oy), Y1 = Math.round((sy0 + y + 1) * cs - spr.oy); hg.fillRect(X0, Y0, X1 - X0, Y1 - Y0); x = e; } }
    const mask = document.createElement('canvas'); mask.width = spr.W; mask.height = spr.H; const mg = mask.getContext('2d');
    if ('filter' in mg) { mg.filter = 'blur(1.5px)'; mg.drawImage(hard, 0, 0); mg.filter = 'none'; mg.drawImage(hard, 0, 0); } else mg.drawImage(hard, 0, 0);
    spr.revealMask = mask; spr.revealSet = rset; spr.revA = 0;
  }
  // the sprite image (or its night-window overlay) with the road strip faded by a (0..1); cached per 1/16 step
  function revealed(spr, src, a, tag) {
    const q = Math.round(a * 16), c = spr.revCache || (spr.revCache = {}), k = (tag || 'b');
    if (!q || !spr.revealMask) return src; const e = c[k];
    if (e && e.src === src && e.q === q) return e.cv;
    const cv = (e && e.cv) || document.createElement('canvas'); cv.width = spr.W; cv.height = spr.H; const g = cv.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.78 * q / 16; g.drawImage(spr.revealMask, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; c[k] = { src, q, cv }; return cv;
  }
  // far zoom: smooth-downscaled copy of a sprite (drawn 1:1 so pixels stay crisp on screen)
  function lod(spr, s, src, tag) {
    const k = (tag || 'b') + s, c = spr.lods || (spr.lods = {}); if (c[k]) return c[k];
    const im = src || spr.cv, w = Math.max(1, Math.ceil(spr.W * s)), h = Math.max(1, Math.ceil(spr.H * s));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (s <= 0.25) { const m = document.createElement('canvas'); m.width = Math.ceil(spr.W / 2); m.height = Math.ceil(spr.H / 2); const mg = m.getContext('2d'); mg.imageSmoothingQuality = 'high'; mg.drawImage(im, 0, 0, m.width, m.height); g.drawImage(m, 0, 0, w, h); }
    else g.drawImage(im, 0, 0, w, h);
    if (!src) c[k] = cv; return cv;
  }
  function hashStr(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  // Footprint runs per strip column → sortable pieces.
  function pieces(b, spr) {
    // analytic scanline (no canvas readback): crossings of the footprint polygon with the column's centre line
    const P = Core.oblique(b).poly.map(([x, y]) => [x * T - spr.ox, y * T - spr.oy]), out = [];
    for (let sx = 0; sx < spr.W; sx += STRIP) {
      const w = Math.min(STRIP, spr.W - sx), X = sx + (w >> 1) + 0.5, ys = [];
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [x1, y1] = P[j], [x2, y2] = P[i]; if ((x1 <= X) !== (x2 <= X)) ys.push(y1 + (X - x1) * (y2 - y1) / (x2 - x1)); }
      ys.sort((a, b) => a - b); const runs = [];
      for (let k = 0; k + 1 < ys.length; k += 2) { const a = Math.max(0, Math.ceil(ys[k] - 0.5)), e = Math.min(spr.H, Math.ceil(ys[k + 1] - 0.5)); if (e <= a) continue; if (runs.length && runs[runs.length - 1][1] >= a) runs[runs.length - 1][1] = e; else runs.push([a, e]); }
      if (!runs.length) { out.push({ sx, w, y0: 0, y1: spr.H, sortY: spr.oy + spr.H - 8 }); continue; }
      let top = 0;
      runs.forEach((r, i) => { const y1 = i === runs.length - 1 ? spr.H : r[1]; out.push({ sx, w, y0: top, y1, sortY: spr.oy + r[1] }); top = y1; });
    }
    return out;
  }
  class Buildings {
    constructor(list) { this.list = list; this.sprites = new Map(); this.overlay = overlay; this.lod = lod; this.revealed = revealed; this.season = 'spring'; }
    setSeason(se) { if (se === this.season) return; this.season = se; for (const s of this.sprites.values()) this.dress(s); }
    dress(s) { const cv = this.season === 'winter' ? snowy(s) : s.base; if (s.cv !== cv) { s.cv = cv; s.lods = {}; s.amask = null; } }
    // render sprites in idle time so walking / zooming out later never has to wait
    prewarmIdle(order) {
      const todo = (order || this.list).filter(b => !this.sprites.has(b.id)), ric = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 30));
      const step = dl => { while (todo.length && dl.timeRemaining() > 4) { const b = todo.shift(); if (!this.sprites.has(b.id)) this.get(b); } if (todo.length) ric(step); else this.allReady = true; };
      ric(step);
    }
    get(b) { let s = this.sprites.get(b.id); if (!s) { s = render(b); s.pieces = pieces(b, s); this.dress(s); this.sprites.set(b.id, s); } return s; }
    visible(vx0, vy0, vx1, vy1, budget) { // world px view; returns sprite list, renders lazily
      const out = []; let made = 0;
      for (const b of this.list) {
        const wh = Core.wallHeight(b);
        if (b.bbox[2] * T < vx0 - 16 || Core.oblique(b).x0 * T > vx1 + 16 || b.bbox[3] * T + 8 < vy0 || b.bbox[1] * T - wh - 8 > vy1) continue;
        if (!this.sprites.has(b.id)) { if (made >= budget) continue; made++; }
        out.push([b, this.get(b)]);
      }
      return out;
    }
  }
  window.Buildings = Buildings;
})();

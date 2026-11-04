// v7.6.4 set dressing (procedural, original art). Sprites return { cv, ax, ay } (ax, ay = foot point in px).
(function () {
  'use strict';
  const mk = (W, H) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d')]; };
  function txt(g, s, x, y, col, size) { g.font = (size || 8) + 'px ArkPixel, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); }

  // 德怀广场「中北大学」校名石: axis-aligned granite slab on a two-step plinth, foot point = exact centre (ax = W/2)
  function plaqueSprite() {
    const W = 144, H = 44, [cv, g] = mk(W, H), cx = W / 2, fy = H - 2;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(4, fy - 1, W - 8, 3);
    g.fillStyle = '#bdbba8'; g.fillRect(4, fy - 5, W - 8, 5); g.fillStyle = '#d8d6c4'; g.fillRect(4, fy - 5, W - 8, 1);      // lower step
    g.fillStyle = '#cfcdb9'; g.fillRect(10, fy - 9, W - 20, 4); g.fillStyle = '#e6e3d0'; g.fillRect(10, fy - 9, W - 20, 1);   // upper step
    const x0 = 16, x1 = W - 16, top = 4, bot = fy - 9;
    g.fillStyle = '#8f9488'; g.fillRect(x0, top, x1 - x0, bot - top);                                                             // slab body
    g.fillStyle = '#a9ae9f'; g.fillRect(x0 + 1, top + 1, x1 - x0 - 2, bot - top - 2);
    g.fillStyle = '#c3c6b6'; g.fillRect(x0, top, x1 - x0, 3); g.fillStyle = '#d9dbcc'; g.fillRect(x0, top, x1 - x0, 1);       // polished cap
    g.fillStyle = '#9ba091'; for (let y = top + 8; y < bot - 2; y += 6) g.fillRect(x0 + 2, y, x1 - x0 - 4, 1);                 // horizontal grain only
    g.fillStyle = '#7b8075'; g.fillRect(x0, bot - 2, x1 - x0, 2);
    const chars = ['中', '北', '大', '学'], gap = 22, y = top + 13;
    chars.forEach((c, k) => { const x = cx + (k - 1.5) * gap; txt(g, c, x + 1, y + 1, '#5a2a22', 16); txt(g, c, x, y, '#b8402f', 16); });
    g.font = '5px monospace'; txt(g, 'NORTH UNIVERSITY OF CHINA', cx, bot - 6, '#f1eedf', 5);
    return { cv, ax: cx, ay: fy };
  }

  const T = 16;
  const hsh = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // 飞机模型 on a low plinth: generic light aircraft seen from the south (3/4 top view), nose to the west
  function planeSprite() {
    const W = 88, H = 56, [cv, g] = mk(W, H), cx = W / 2, fy = H - 3;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(8, fy - 2, W - 16, 4);
    g.fillStyle = '#a7a597'; g.fillRect(cx - 14, fy - 7, 28, 7); g.fillStyle = '#c9c7b8'; g.fillRect(cx - 14, fy - 7, 28, 2);      // plinth
    g.fillStyle = '#6d7076'; g.fillRect(cx - 2, fy - 20, 4, 13);                                                                    // mast
    const by = fy - 26;                                                                                                             // fuselage centre line
    g.fillStyle = '#8e969e'; g.fillRect(cx - 12, by - 14, 30, 9);                                                                   // far wing (north)
    g.fillStyle = '#c4cacf'; g.fillRect(cx - 12, by - 14, 30, 2);
    g.fillStyle = '#b9c0c6'; g.fillRect(cx - 34, by - 4, 66, 9); g.fillStyle = '#dfe4e8'; g.fillRect(cx - 34, by - 4, 66, 3);      // fuselage
    g.fillStyle = '#9aa2a9'; g.fillRect(cx - 38, by - 2, 4, 6); g.fillStyle = '#4b5258'; g.fillRect(cx - 40, by - 6, 2, 14);       // nose + prop
    g.fillStyle = '#3b6f9e'; g.fillRect(cx - 24, by - 8, 12, 5); g.fillStyle = '#8fc3e8'; g.fillRect(cx - 23, by - 8, 5, 2);       // canopy
    g.fillStyle = '#a9b0b6'; g.fillRect(cx + 26, by - 14, 6, 11); g.fillStyle = '#cfd5da'; g.fillRect(cx + 26, by - 14, 6, 2);     // tail fin
    g.fillStyle = '#c4cacf'; g.fillRect(cx - 12, by + 5, 30, 8); g.fillStyle = '#9da5ac'; g.fillRect(cx - 12, by + 11, 30, 2);     // near wing (south)
    g.fillStyle = '#b8322a'; g.fillRect(cx - 4, by - 1, 8, 2); g.fillRect(cx + 27, by - 12, 4, 2);                                  // red trim (no insignia)
    return { cv, ax: cx, ay: fy };
  }
  // 翅膀雕塑（飞轮）: an upright spoked wheel with a wing on each side, on a square base
  function wheelSprite() {
    const W = 64, H = 56, [cv, g] = mk(W, H), cx = W / 2, fy = H - 2, cy = fy - 26, R = 13;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(cx - 16, fy - 1, 32, 3);
    g.fillStyle = '#8c8a80'; g.fillRect(cx - 10, fy - 8, 20, 8); g.fillStyle = '#b3b1a6'; g.fillRect(cx - 10, fy - 8, 20, 2);
    for (const e of [-1, 1]) for (let k = 0; k < 5; k++) { const len = 16 - k * 2, y = cy - 10 + k * 4; g.fillStyle = k % 2 ? '#d9dde2' : '#eef1f4'; g.fillRect(e < 0 ? cx - R - len : cx + R, y, len, 3); }
    g.strokeStyle = '#5a6068'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    g.strokeStyle = '#9aa1a8'; g.lineWidth = 1; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
    g.fillStyle = '#3e434a'; g.fillRect(cx - 2, cy - 2, 4, 4); g.fillStyle = '#5a6068'; g.fillRect(cx - 2, cy + R, 4, fy - 8 - cy - R);
    return { cv, ax: cx, ay: fy };
  }
  // court net seen from the south: posts + mesh band + white top tape. horiz: spans x (len px); vertical nets span y.
  function netSprite(len, vert, hpx) {
    const NH = hpx || 9;
    if (!vert) { const W = Math.ceil(len) + 4, H = NH + 5, [cv, g] = mk(W, H), fy = H - 2;
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(2, fy, W - 4, 2);
      g.fillStyle = 'rgba(30,32,36,0.55)'; for (let x = 3; x < W - 3; x += 2) g.fillRect(x, fy - NH + 2, 1, NH - 2); for (let y = fy - NH + 2; y < fy; y += 2) g.fillRect(3, y, W - 6, 1);
      g.fillStyle = '#f4f4f0'; g.fillRect(2, fy - NH, W - 4, 2);
      g.fillStyle = '#4a4f57'; g.fillRect(0, fy - NH - 2, 2, NH + 2); g.fillRect(W - 2, fy - NH - 2, 2, NH + 2);
      return { cv, ax: W / 2, ay: fy }; }
    const W = 8, H = Math.ceil(len) + NH + 4, [cv, g] = mk(W, H), fy = H - 2, top = fy - Math.ceil(len);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(4, top, 2, fy - top);
    g.fillStyle = 'rgba(30,32,36,0.5)'; for (let y = top - NH + 2; y < fy - 1; y += 2) g.fillRect(3, y, 2, 1);
    g.fillStyle = '#f4f4f0'; g.fillRect(3, top - NH, 2, fy - top);
    g.fillStyle = '#4a4f57'; g.fillRect(3, top - NH - 1, 2, NH + 1); g.fillRect(3, fy - NH - 1, 2, NH + 1);
    return { cv, ax: 4, ay: fy };
  }
  // storefront / works sign boards on two posts
  function signBoard(title, style) {
    const red = style !== 'works', w = Math.max(40, [...title].length * 9 + 12), W = w + 4, H = 34, [cv, g] = mk(W, H), cx = W / 2, fy = H - 2;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(cx - w / 2, fy - 1, w, 2);
    g.fillStyle = '#4a4f57'; g.fillRect(cx - w / 2 + 4, fy - 16, 2, 16); g.fillRect(cx + w / 2 - 6, fy - 16, 2, 16);
    g.fillStyle = red ? '#b3261e' : '#f2f1ea'; g.fillRect(cx - w / 2, fy - 30, w, 15);
    g.fillStyle = red ? '#d84a3a' : '#1f4f9a'; g.fillRect(cx - w / 2, fy - 30, w, 2); if (!red) g.fillRect(cx - w / 2, fy - 17, w, 2);
    txt(g, title, cx, fy - 22, red ? '#ffe27a' : '#1f3f7a', 8);
    return { cv, ax: cx, ay: fy };
  }
  // parked car (3/4 top view), nose north (n) or south (s); 1 x 1.9 tiles
  const CAR_COL = ['#e8e8e6', '#2b2f36', '#9aa0a8', '#b3261e', '#2f5f9e', '#e6e1d3', '#5a6a5a', '#c9b48a'];
  const carCache = new Map();
  function carSprite(c, nose) {
    const key = c + nose; if (carCache.has(key)) return carCache.get(key);
    const W = 16, H = 34, [cv, g] = mk(W, H), fy = H - 2, col = CAR_COL[c % CAR_COL.length], x0 = 2, w = 12, top = 3;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0 - 1, top + 3, w + 2, fy - top - 2);
    g.fillStyle = col; g.fillRect(x0, top, w, fy - top - 2);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x0, top, w, 1);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0 + w - 1, top, 1, fy - top - 2);
    const ws = nose === 'n' ? top + 5 : fy - 14;
    g.fillStyle = '#29343f'; g.fillRect(x0 + 1, ws, w - 2, 4); g.fillRect(x0 + 1, nose === 'n' ? ws + 13 : ws - 11, w - 2, 3);   // wind / rear screens
    g.fillStyle = col; g.fillRect(x0 + 1, nose === 'n' ? ws + 4 : ws - 8, w - 2, 9); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x0 + 1, nose === 'n' ? ws + 4 : ws - 8, w - 2, 1);  // roof
    g.fillStyle = '#1b1d21'; g.fillRect(x0, fy - 4, w, 2);
    g.fillStyle = nose === 'n' ? '#f5e7a0' : '#c8312a'; g.fillRect(x0 + 1, top, 2, 1); g.fillRect(x0 + w - 3, top, 2, 1);
    const r = { cv, ax: W / 2, ay: fy }; carCache.set(key, r); return r;
  }
  // stall rows: [y0, y1, back side 'n'|'s'] across [x0,x1] (minus aisle gap); returns occupied stalls
  function stalls(r, rows, gap) {
    const out = []; for (const [y0, y1, side] of rows) for (let x = Math.ceil(r[0] + 0.2); x + 1 <= r[2] - 0.2; x++) {
      if (gap && x + 1 > gap[0] && x < gap[1]) continue; out.push({ x0: x, x1: x + 1, y0, y1, side, car: hsh(x * 7 + 3, Math.round(y0 * 10)) < 0.58 ? (hsh(x, Math.round(y1 * 10)) * 8) | 0 : -1 }); }
    return out;
  }
  function lotDecal(g, list) { // world px
    g.fillStyle = 'rgba(242,242,236,0.9)';
    for (const s of list) { const X = s.x0 * T, Y0 = s.y0 * T, Y1 = s.y1 * T; g.fillRect(X, Y0, 1, Y1 - Y0); g.fillRect(s.x1 * T - 1, Y0, 1, Y1 - Y0); g.fillRect(X, s.side === 'n' ? Y0 : Y1 - 1, T, 1); }
  }
  function underpassDecal(g, u) { // retaining-wall tops on both sides of the sunken road
    for (const w of u.walls) { g.fillStyle = '#9b9a94'; g.fillRect(w[0] * T, w[1] * T, (w[2] - w[0]) * T, (w[3] - w[1]) * T); g.fillStyle = '#c8c6bd'; g.fillRect(w[0] * T, w[1] * T, (w[2] - w[0]) * T, 1); }
  }
  // morning drill / flag guard: a plain olive uniform figure, 4 walk frames x 4 dirs (0 down, 1 left, 2 right, 3 up)
  const UNI = new Map();
  function uniformSprite(dir, frame, guard) {
    const key = dir * 8 + frame + (guard ? 100 : 0); if (UNI.has(key)) return UNI.get(key);
    const W = 16, H = 28, [cv, g] = mk(W, H), fy = H - 2, cx = 8, step = frame % 2 ? 1 : 0, coat = guard ? '#2f5a3a' : '#5d6b3c', cap = guard ? '#2f5a3a' : '#55633a';
    g.fillStyle = 'rgba(30,40,20,0.28)'; g.fillRect(cx - 5, fy - 1, 10, 3);
    g.fillStyle = '#20232a'; g.fillRect(cx - 3, fy - 8, 2, 7 - step); g.fillRect(cx + 1, fy - 8, 2, 7 - (1 - step));                 // legs
    g.fillStyle = coat; g.fillRect(cx - 4, fy - 17, 8, 10); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(cx + 3, fy - 17, 1, 10);
    if (guard) { g.fillStyle = '#d8b04a'; g.fillRect(cx - 4, fy - 16, 8, 1); }
    g.fillStyle = coat; g.fillRect(cx - 6, fy - 16 + step, 2, 7); g.fillRect(cx + 4, fy - 16 + (1 - step), 2, 7);                   // arms
    g.fillStyle = '#e8c39e'; g.fillRect(cx - 3, fy - 23, 6, 6);                                                                           // face
    g.fillStyle = cap; g.fillRect(cx - 4, fy - 25, 8, 3); if (dir === 0) { g.fillStyle = '#c8312a'; g.fillRect(cx - 1, fy - 25, 2, 1); }
    if (dir === 3) { g.fillStyle = '#3a2a20'; g.fillRect(cx - 3, fy - 22, 6, 4); }
    const r = { cv, ax: cx, ay: fy }; UNI.set(key, r); return r;
  }
  // morning schedule (game minutes of the day). Pure, so it can be unit-tested.
  const DRILL_T = [360, 420], GUARD_T = { start: 420, arrive: 423, up: 425, leave: 428, gone: 435 };
  function drillPeople(d, m) {
    if (m < DRILL_T[0] || m >= DRILL_T[1]) return [];
    const cols = 6, rows = 4, w = d.x1 - d.x0, h = d.y1 - d.y0, t = m - DRILL_T[0], out = [];
    // 4-minute cycle: march south (2 min), about-turn, march north (2 min); every 10 min a 1-min halt (立正)
    const halt = (t % 10) >= 9, cyc = (t % 4) / 4, k = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2, dir = halt ? 0 : cyc < 0.5 ? 0 : 3;
    const span = h - rows * 1.4 - 0.6;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: d.x0 + 0.8 + c * (w - 1.6) / (cols - 1), y: d.y0 + 1.0 + r * 1.4 + span * k, dir, frame: halt ? 0 : ((t * 40) | 0) % 4, variant: 0, uniform: true });
    return out;
  }
  function guardPeople(gd, m) {
    const G = GUARD_T; if (m < G.start || m >= G.gone) return [];
    const [sx, sy] = gd.start, [px, py] = gd.pole, stopY = py - 2.0;
    let y, dir, moving = true;
    if (m < G.arrive) { y = sy + (stopY - sy) * (m - G.start) / (G.arrive - G.start); dir = 0; }
    else if (m < G.leave) { y = stopY; dir = 3; moving = false; }
    else { y = stopY + (sy - stopY) * (m - G.leave) / (G.gone - G.leave); dir = 3; }
    const fr = moving ? ((m * 40) | 0) % 4 : 0;
    return [-1.2, 0, 1.2].map((dx, i) => ({ x: px + dx, y: y - (i === 1 ? 0.3 : 0), dir, frame: fr, variant: 0, uniform: true, guard: true }));
  }
  function flagHoist(m) { const G = GUARD_T; m = ((m % 1440) + 1440) % 1440; if (m < G.start || m >= 18 * 60 + 30) return 0; if (m < G.arrive) return 0; if (m < G.up) return (m - G.arrive) / (G.up - G.arrive); return 1; }

  // 二道门大柳树: bespoke weeping willow (original pixel art). Gnarled leaning trunk with root flare, three arching limbs,
  // a layered 4-tone crown and hanging strands whose tips sway (frame 0..3). season: spring | summer | autumn | winter.
  const WILLOW_PAL = {
    spring: { crown: ['#4f7a2c', '#6c9c3c', '#8fbf55', '#b9dc7a'], strand: ['#6f9f3e', '#8dbd55', '#a9d26c', '#c6e48c'], cat: '#e8e6a0' },
    summer: { crown: ['#2f5422', '#43712c', '#5d8f3a', '#80b04e'], strand: ['#3c6a28', '#4f7f31', '#679a3f', '#86b455'] },
    autumn: { crown: ['#6b5a22', '#93802f', '#bca33e', '#dcc35a'], strand: ['#8a7a2c', '#a8933a', '#c4ad48', '#7f8a36'] },
    winter: { crown: null, strand: ['#8b7a4e', '#a08d5c', '#7a6a44', '#b19e6a'], snow: '#f4f6fa' }
  };
  function willowSprite(season, frame) {
    const W = 168, H = 156, [cv, g] = mk(W, H), fx = 84, fy = H - 6, P = WILLOW_PAL[season] || WILLOW_PAL.summer;
    let sd = 7331; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const ph = (frame || 0) * Math.PI / 2, px = (x, y, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); };
    // ground shadow (two-tone ellipse)
    for (let y = -7; y <= 7; y++) for (let x = -52; x <= 52; x++) { const d = (x * x) / 2704 + (y * y) / 49; if (d <= 1) px(fx + 6 + x, fy + y, d < 0.55 ? 'rgba(20,35,15,0.30)' : 'rgba(20,35,15,0.16)'); }
    // trunk: tapered, leaning slightly east as it rises; dark outline, bark grooves, highlight ridge, knot
    const tH = 54, lean = y => Math.round(Math.sin(y / 18) * 3 + y * 0.06);
    for (let y = 0; y < tH; y++) {
      const w = Math.round(9 - y * 0.07 + (y < 8 ? (8 - y) * 0.9 : 0)), cx = fx + lean(y), yy = fy - y;
      g.fillStyle = '#2b1d12'; g.fillRect(cx - w - 1, yy, 2 * w + 2, 1);
      g.fillStyle = '#4b3322'; g.fillRect(cx - w, yy, 2 * w, 1);
      g.fillStyle = '#6a4a31'; g.fillRect(cx - w + 2, yy, Math.max(1, w - 3), 1);
      g.fillStyle = '#86603f'; g.fillRect(cx - w + 3, yy, 2, 1);
      if ((y + (y >> 3)) % 5 === 0) { g.fillStyle = '#3a2718'; g.fillRect(cx - 1 + ((y * 7) % 5) - 2, yy, 1, 1); g.fillRect(cx + w - 3, yy, 1, 1); }
      g.fillStyle = '#3a2718'; if (y % 3 !== 2) g.fillRect(cx + 2 + (y % 2), yy, 1, 1);
    }
    g.fillStyle = '#2b1d12'; g.fillRect(fx + lean(26) - 3, fy - 30, 5, 4); g.fillStyle = '#1c130b'; g.fillRect(fx + lean(26) - 2, fy - 29, 3, 2); // knot hole
    for (const [dx, len] of [[-14, 9], [-9, 5], [11, 8], [15, 5]]) { g.fillStyle = '#4b3322'; for (let i = 0; i < len; i++) g.fillRect(fx + dx + Math.sign(dx) * i * 0.6, fy - 2 + (i > len - 3 ? 1 : 0), 3, 2); } // root flare
    // limbs
    const top = [fx + lean(tH), fy - tH], limbs = [[-40, -30], [38, -26], [-6, -44], [20, -40], [-26, -40]];
    for (const [dx, dy] of limbs) for (let i = 0; i <= 24; i++) {
      const t = i / 24, x = top[0] + dx * t, y = top[1] + dy * t - Math.sin(t * Math.PI) * 8, r = 3 - t * 2;
      g.fillStyle = '#3a2718'; g.fillRect(x - r, y - r + 1, 2 * r + 1, 2 * r); g.fillStyle = '#5b3f2a'; g.fillRect(x - r + 1, y - r, Math.max(1, r), Math.max(1, r));
      if (P.snow && i % 2 === 0 && i > 4) { g.fillStyle = P.snow; g.fillRect(x - r, y - r - 1, 2 * r + 1, 1); }
    }
    const cy = fy - tH - 26;
    // crown: back mass -> mid clumps -> lit top clumps (light from upper-left), each clump outlined by its darker tone
    if (P.crown) {
      const clump = (x, y, r, c0, c1) => { for (let j = -r - 1; j <= r + 1; j++) for (let i = -r - 1; i <= r + 1; i++) { const d = (i * i + j * j * 1.5) / (r * r); if (d <= 1.15) px(x + i, y + j, d > 0.85 ? c0 : c1); } };
      const lay = [[0, 26, 0, 1], [1, 16, 1, 2], [2, 10, 2, 3]];
      for (const [k, n, a, b] of lay) for (let i = 0; i < n; i++) {
        const ang = rnd() * Math.PI * 2, rr = rnd() * (k === 0 ? 50 : k === 1 ? 40 : 28);
        const x = fx + 2 + Math.cos(ang) * rr - (k === 2 ? 8 : 0), y = cy + Math.sin(ang) * rr * 0.42 - (k === 2 ? 7 : k === 1 ? 3 : 0);
        clump(Math.round(x), Math.round(y), (k === 0 ? 12 : k === 1 ? 9 : 6) + (rnd() * 3 | 0), P.crown[a], P.crown[b]);
      }
      for (let i = 0; i < 40; i++) px(fx - 34 + rnd() * 56, cy - 16 + rnd() * 20, P.crown[3]); // sparkle highlights
    }
    // hanging strands: long curtains from the crown rim; sway grows towards the tip, phase per strand
    const nS = P.crown ? 120 : 46;
    for (let i = 0; i < nS; i++) {
      const u = rnd(), x0 = fx + 2 + (u * 2 - 1) * 60, rim = Math.abs(u * 2 - 1), t0 = cy - 8 + rim * 14 + rnd() * 10;
      const len = (P.crown ? 34 : 26) + rnd() * 34 - rim * 10, c = P.strand[i & 3], sp = rnd() * 6.28;
      for (let y = 0; y < len; y++) {
        const k = y / len, sw = Math.sin(ph + sp + y / 9) * (0.6 + k * 2.2) + (u - 0.5) * k * 6;
        px(x0 + sw, t0 + y, c);
        if (P.crown && y % 4 === 1) px(x0 + sw + 1, t0 + y, c);                               // leaf nodes
        if (P.cat && y % 9 === 4 && i % 3 === 0) px(x0 + sw - 1, t0 + y, P.cat);               // spring catkins
      }
    }
    if (P.snow) for (let i = 0; i < 16; i++) px(fx - 30 + rnd() * 60, fy - 1 - rnd() * 4, P.snow);
    return { cv, ax: fx, ay: fy };
  }
  const WILLOW_COL = (x, y) => [x - 0.45, y - 0.35, x + 0.6, y + 0.12]; // trunk footprint only (tiles)
  window.PropsV764 = { willowSprite, WILLOW_COL, plaqueSprite, planeSprite, wheelSprite, netSprite, signBoard, carSprite, stalls, lotDecal, underpassDecal, uniformSprite, drillPeople, guardPeople, flagHoist, DRILL_T, GUARD_T };
})();

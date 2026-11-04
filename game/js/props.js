// Procedural pixel props: trees (6 variants), street lamps, ported legacy statue + gate stone.
(function () {
  'use strict';
  const T = 16;
  const TREE = [ // [dark, mid, light, highlight]
    ['#3f7a3a', '#53913f', '#6aa848', '#8cc25a'],
    ['#4a7f33', '#5f9a3b', '#7bb446', '#a2cc62'],
    ['#2f5e3c', '#3b7046', '#4b8552', '#66a065'],
    ['#24493a', '#2f5a45', '#3b6c51', '#548a68'],
    ['#4c8a3e', '#5d9f48', '#76b656', '#97ca6c'],
    ['#b86a86', '#d4839f', '#eba4bb', '#f8cfdc'],
    ['#1f3f2c', '#2b5236', '#3a6741', '#58834f'], // v7.6 侧柏 (Platycladus): narrow, dark, evergreen
  ];
  // autumn: 银杏 (ginkgo) gold, maple / 栾树 orange-red, late olive; summer: deeper greens, blossoms over
  const AUTUMN = [
    ['#a77a16', '#c99a22', '#e6bd34', '#f6dc6a'], // ginkgo gold
    ['#9a4c22', '#bd632a', '#da8436', '#efb05a'], // orange
    ['#8a3a26', '#a84a2e', '#c4643a', '#e08f5a'], // red
    ['#6e6a2a', '#8a8232', '#a89c3e', '#c8b85a'], // olive turning
  ];
  const SUMMER = ['#356d30', '#478536', '#5c9c40', '#7cb452'];
  let season = 'spring';
  function blob(g, cx, cy, r, col) { g.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(cx - w, cy + y, w * 2, 1); } }
  function makeTree(type, seed) {
    const rnd = Core.mulberry(seed * 977 + type * 13);
    const cv = document.createElement('canvas'); const W = 48, H = 64; cv.width = W; cv.height = H; const g = cv.getContext('2d');
    let pal = TREE[type]; const fx = 24, fy = 60; // foot
    const leafy = type === 0 || type === 1 || type === 5;
    if (season === 'summer' && type !== 2 && type !== 3 && type !== 6) pal = type === 5 ? SUMMER : TREE[type].map((c, i) => i < 3 ? SUMMER[i] : c);
    if (season === 'autumn' && (leafy || type === 4)) pal = type === 4 ? AUTUMN[2] : AUTUMN[[0, 0, 1, 0, 2, 3, 0, 1][(seed + type) % 8]];
    if (season === 'winter' && leafy) return bareTree(g, cv, fx, fy, rnd);
    g.fillStyle = 'rgba(30,45,20,0.3)'; for (let y = -3; y <= 3; y++) { const w = Math.round(Math.sqrt(9 - y * y) * (type === 4 ? 5 : 4)); g.fillRect(fx - w + 3, fy + y - 1, w * 2, 1); }
    if (type === 2 || type === 3) { // pine: stacked triangles
      g.fillStyle = '#5a3d26'; g.fillRect(fx - 2, fy - 10, 4, 10);
      for (let l = 0; l < 4; l++) {
        const top = fy - 54 + l * 10, h = 18, w0 = 8 + l * 4;
        for (let y = 0; y < h; y++) { const w = Math.round(w0 * y / h) + 1; g.fillStyle = y > h - 4 ? pal[0] : (y < 4 ? pal[2] : pal[1]); g.fillRect(fx - w, top + y, w * 2, 1); g.fillStyle = pal[0]; g.fillRect(fx + Math.round(w * 0.3), top + y, Math.max(1, w - Math.round(w * 0.3)), 1); }
        g.fillStyle = pal[3]; g.fillRect(fx - 3, top + 5, 2, 2);
        if (season === 'winter') { for (let y = 1; y < 6; y++) { const w = Math.round(w0 * y / h) + 1; g.fillStyle = y < 3 ? '#f4f7fb' : '#dfe7f1'; g.fillRect(fx - w, top + y, Math.max(1, Math.round(w * 1.3)), 1); } g.fillStyle = '#eef3f9'; g.fillRect(fx - w0 + 1, top + h - 4, 3, 1); }
      }
    } else if (type === 6) { // v7.6 侧柏: tall columnar flame-shaped crown, scaly dark foliage, evergreen in every season
      g.fillStyle = '#5a3d26'; g.fillRect(fx - 2, fy - 8, 4, 8); g.fillStyle = '#4a3020'; g.fillRect(fx - 3, fy - 2, 6, 2);
      const top = fy - 50 - (rnd() * 5 | 0), bot = fy - 5, hh = bot - top;
      for (let y = 0; y <= hh; y++) { const t = y / hh, w = Math.max(1, Math.round(Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * 9.5));
        g.fillStyle = pal[1]; g.fillRect(fx - w, top + y, w * 2, 1); g.fillStyle = pal[0]; g.fillRect(fx + Math.round(w * 0.25), top + y, w - Math.round(w * 0.25), 1);
        g.fillStyle = pal[2]; if (w > 2) g.fillRect(fx - w + 1, top + y, Math.max(1, Math.round(w * 0.45)), 1); }
      for (let i = 0; i < 26; i++) { const yy = top + 3 + (rnd() * (hh - 4) | 0), t = (yy - top) / hh, w = Math.round(Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * 9);
        g.fillStyle = i % 3 ? pal[0] : pal[3]; g.fillRect(fx - w + (rnd() * w * 2 | 0), yy, 2, 1); }
      if (season === 'winter') { g.fillStyle = '#eef3f9'; g.fillRect(fx - 1, top, 2, 2); for (let i = 0; i < 6; i++) { const yy = top + 6 + i * 6; g.fillRect(fx - 5 + (rnd() * 4 | 0), yy, 3, 1); } }
    } else if (type === 4) { // shrub
      blob(g, fx, fy - 7, 9, pal[0]); blob(g, fx - 7, fy - 6, 6, pal[0]); blob(g, fx + 7, fy - 6, 6, pal[0]);
      blob(g, fx - 1, fy - 9, 7, pal[1]); blob(g, fx - 6, fy - 8, 4, pal[2]); g.fillStyle = pal[3]; g.fillRect(fx - 5, fy - 12, 2, 2); g.fillRect(fx + 2, fy - 13, 2, 1);
      if (season === 'winter') { blob(g, fx - 1, fy - 13, 5, '#eef3f9'); g.fillStyle = '#f8fbff'; g.fillRect(fx - 8, fy - 11, 5, 2); g.fillRect(fx + 4, fy - 11, 5, 2); }
    } else { // round deciduous / blossom
      g.fillStyle = '#5a3d26'; g.fillRect(fx - 3, fy - 18, 6, 18); g.fillStyle = '#7a5434'; g.fillRect(fx - 2, fy - 18, 2, 16);
      g.fillStyle = '#4a3020'; g.fillRect(fx - 5, fy - 2, 3, 2); g.fillRect(fx + 2, fy - 2, 3, 2);
      const cy = fy - 34, r = 15 + (rnd() * 3 | 0);
      blob(g, fx, cy + 2, r, pal[0]); blob(g, fx - 9, cy + 5, r - 6, pal[0]); blob(g, fx + 9, cy + 5, r - 6, pal[0]);
      blob(g, fx - 2, cy, r - 3, pal[1]); blob(g, fx + 6, cy + 3, r - 8, pal[1]);
      blob(g, fx - 5, cy - 4, r - 8, pal[2]);
      for (let i = 0; i < 9; i++) { g.fillStyle = pal[3]; g.fillRect(fx - 12 + (rnd() * 18 | 0), cy - 12 + (rnd() * 14 | 0), 2, 2); }
      for (let i = 0; i < 10; i++) { g.fillStyle = pal[0]; g.fillRect(fx - 10 + (rnd() * 22 | 0), cy + (rnd() * 12 | 0), 2, 1); }
      if (type === 5 && season === 'spring') for (let i = 0; i < 14; i++) { g.fillStyle = '#fff1f5'; g.fillRect(fx - 13 + (rnd() * 26 | 0), cy - 12 + (rnd() * 22 | 0), 1, 1); }
    }
    return { cv, ax: fx, ay: fy };
  }
  // winter: bare deciduous crown (trunk + forked branches) with snow on the forks
  function bareTree(g, cv, fx, fy, rnd) {
    g.fillStyle = 'rgba(30,45,60,0.25)'; for (let y = -3; y <= 3; y++) { const w = Math.round(Math.sqrt(9 - y * y) * 4); g.fillRect(fx - w + 3, fy + y - 1, w * 2, 1); }
    g.fillStyle = '#5a3d26'; g.fillRect(fx - 3, fy - 20, 6, 20); g.fillStyle = '#7a5434'; g.fillRect(fx - 2, fy - 20, 2, 18);
    const br = (x, y, dx, dy, n, w) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 3 ? '#6b4a30' : '#5a3d26'; g.fillRect(Math.round(x), Math.round(y), w, 2); x += dx; y += dy; } return [Math.round(x), Math.round(y)]; };
    const tips = [br(fx - 1, fy - 20, -0.9, -1, 14, 2), br(fx, fy - 20, 0.9, -1.05, 14, 2), br(fx - 1, fy - 22, -0.1, -1, 18, 2), br(fx - 2, fy - 28, -1, -0.5, 9, 1), br(fx + 1, fy - 30, 1, -0.6, 9, 1)];
    for (const [x, y] of tips) { br(x, y, -0.7, -0.8, 5, 1); br(x, y, 0.7, -0.8, 5, 1); }
    g.fillStyle = '#f4f7fb'; for (const [x, y] of tips) g.fillRect(x - 2, y - 1, 4, 2);
    for (let i = 0; i < 10; i++) { g.fillStyle = '#e8eef6'; g.fillRect(fx - 12 + (rnd() * 24 | 0), fy - 46 + (rnd() * 22 | 0), 2, 1); }
    return { cv, ax: fx, ay: fy };
  }
  let trees = []; // [type][variant] for the current season
  function setSeason(s) { if (s !== season) { season = s; trees = []; } }
  function treeSprite(type, v) { trees[type] = trees[type] || []; return trees[type][v] || (trees[type][v] = makeTree(type, v + 1)); }
  function lampSprite() {
    const cv = document.createElement('canvas'); cv.width = 12; cv.height = 40; const g = cv.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(3, 37, 8, 2);
    g.fillStyle = '#2f3a40'; g.fillRect(5, 6, 2, 32); g.fillRect(4, 35, 4, 3);
    g.fillStyle = '#3d4b52'; g.fillRect(2, 2, 8, 5); g.fillStyle = '#f6e7a8'; g.fillRect(3, 5, 6, 2);
    return { cv, ax: 6, ay: 38 };
  }
  // Ported legacy sprites (statue at 0.5 scale, gate stone at 0.6 scale).
  function legacySprite(kind) {
    const s = kind === 'statue' ? 0.75 : 0.6; const cv = document.createElement('canvas');
    if (kind === 'statue') { cv.width = 104; cv.height = 126; const g = cv.getContext('2d'); g.translate(50, 110); g.scale(s, s); LegacyArt.statue(g, { x: 0, y: 0 }); return { cv, ax: 50, ay: 110 + 10 * s }; }
    cv.width = 240; cv.height = 50; const g = cv.getContext('2d'); g.translate(120, 50); g.scale(s, s); g.translate(-720, -975); LegacyArt.dehuaiGate(g, { x: 720, y: 1000 }); return { cv, ax: 120, ay: 46 };
  }
  window.Props = { setSeason, get season() { return season; }, treeSprite, lampSprite, legacySprite };
})();
// ---- v6 fixtures: campus gate arches, underpass portals, chain-link fences (procedural, original art)
(function () {
  'use strict';
  const T = 16;
  function txt(g, s, x, y, col, size) { g.font = (size || 8) + 'px ArkPixel, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); }
  // gate arch: two brick pillars ±hw px with a beam carrying the gate's name (faces south)
  function gateSprite(name, hw) {
    hw = hw || 40; const W = hw * 2 + 20, H = 58, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), cx = W / 2, fy = H - 3;
    for (const sx of [cx - hw, cx + hw]) {
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(sx - 5, fy - 1, 12, 3);
      g.fillStyle = '#8c3b2e'; g.fillRect(sx - 5, fy - 40, 10, 40); g.fillStyle = '#a84a39'; g.fillRect(sx - 5, fy - 40, 6, 40);
      g.fillStyle = '#6e2c22'; for (let y = fy - 36; y < fy; y += 4) g.fillRect(sx - 5, y, 10, 1);
      window.PropsV7 && PropsV7.box3(g, sx - 5, sx + 5, fy - 40, fy, 8, '#5a231b', '#a84a39'); g.fillStyle = '#d8d2c4'; g.fillRect(sx - 6, fy - 43, 12, 4); window.PropsV7 && PropsV7.box3(g, sx - 6, sx + 6, fy - 43, fy - 39, 6, '#9c9686', '#ece6d8');
    }
    g.fillStyle = '#3a3f46'; g.fillRect(cx - hw - 4, fy - 52, hw * 2 + 8, 11); g.fillStyle = '#c9a54a'; g.fillRect(cx - hw - 4, fy - 52, hw * 2 + 8, 1); g.fillRect(cx - hw - 4, fy - 42, hw * 2 + 8, 1);
    txt(g, name, cx, fy - 46.5, '#f3e2a4', 8);
    return { cv, ax: cx, ay: fy };
  }
  // underpass portal: a stair pit going down toward the tunnel, parapets both sides, a blue sign
  function portalSprite(name, down) { // down: unit vector [dx,dy] from the open end toward the tunnel
    const W = 56, H = 70, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), cx = W / 2, cy = H - 22;
    const vert = Math.abs(down[1]) >= Math.abs(down[0]), pw = vert ? 30 : 38, ph = vert ? 38 : 30;
    const x0 = cx - pw / 2, y0 = cy - ph / 2;
    g.fillStyle = '#9a9a9e'; g.fillRect(x0 - 3, y0 - 3, pw + 6, ph + 6);
    const n = 9; for (let i = 0; i < n; i++) { const k = i / (n - 1), d = vert ? (down[1] > 0 ? k : 1 - k) : (down[0] > 0 ? k : 1 - k), c = Math.round(205 - 150 * d);
      g.fillStyle = `rgb(${c},${c},${c + 6})`; if (vert) g.fillRect(x0, y0 + i * ph / n, pw, ph / n + 0.5); else g.fillRect(x0 + i * pw / n, y0, pw / n + 0.5, ph); }
    g.fillStyle = '#1f2228'; if (vert) g.fillRect(x0 + 3, down[1] > 0 ? y0 + ph - 5 : y0, pw - 6, 5); else g.fillRect(down[0] > 0 ? x0 + pw - 5 : x0, y0 + 3, 5, ph - 6);
    g.fillStyle = '#c4c2bc'; if (vert) { g.fillRect(x0 - 3, y0 - 8, 3, ph + 8); g.fillRect(x0 + pw, y0 - 8, 3, ph + 8); } else { g.fillRect(x0 - 3, y0 - 6, pw + 6, 3); g.fillRect(x0 - 3, y0 + ph - 6, pw + 6, 3); }
    g.fillStyle = '#e8e6df'; if (vert) { g.fillRect(x0 - 3, y0 - 9, 3, 2); g.fillRect(x0 + pw, y0 - 9, 3, 2); }
    // sign post
    const sx = x0 + pw + 8; g.fillStyle = '#4b5258'; g.fillRect(sx, cy - 6, 2, 28); g.fillStyle = '#245ea8'; g.fillRect(sx - 9, cy - 22, 20, 16); g.fillStyle = '#fff'; g.fillRect(sx - 7, cy - 20, 16, 1);
    txt(g, '↓', sx + 1, cy - 13, '#ffffff', 10);
    return { cv, ax: cx, ay: cy + ph / 2 + 3, w: pw / T, h: ph / T, name };
  }
  // fences: pieces in world px. horizontal piece {x0,x1,y}, vertical piece {x,y0,y1}, gate post {post:[x,y]}
  const FH = 14;
  function drawFence(g, p) {
    g.save();
    if (p.post) { const [x, y] = p.post; g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 2, y - 1, 5, 2); g.fillStyle = '#2f5a3e'; g.fillRect(x - 1.5, y - 20, 3, 20); g.fillStyle = '#4d8a5f'; g.fillRect(x - 1.5, y - 20, 1, 20); g.fillStyle = '#e0c040'; g.fillRect(x - 2, y - 21, 4, 2); g.restore(); return; }
    if (p.x0 != null) {
      const { x0, x1, y } = p; g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x0, y, x1 - x0, 2);
      g.strokeStyle = 'rgba(120,150,130,0.55)'; g.lineWidth = 1; g.beginPath();
      for (let x = Math.ceil(x0 / 4) * 4 - FH; x < x1; x += 4) { g.moveTo(Math.max(x0, x), y - Math.max(0, x0 - x)); g.lineTo(Math.min(x1, x + FH), y - FH + Math.max(0, x + FH - x1)); }
      for (let x = Math.ceil(x0 / 4) * 4; x < x1 + FH; x += 4) { g.moveTo(Math.min(x1, x), y - Math.max(0, x - x1)); g.lineTo(Math.max(x0, x - FH), y - FH + Math.max(0, x0 - (x - FH))); }
      g.stroke();
      g.fillStyle = '#3e6b4f'; g.fillRect(x0, y - FH, x1 - x0, 1.5); g.fillRect(x0, y - 1.5, x1 - x0, 1);
      for (let x = Math.ceil(x0 / 16) * 16; x <= x1; x += 16) { g.fillStyle = '#2f5a3e'; g.fillRect(x - 1, y - FH - 1, 2, FH + 1); }
    } else {
      const { x, y0, y1 } = p; g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 1, y0, 2, y1 - y0);
      g.fillStyle = 'rgba(120,150,130,0.45)'; g.fillRect(x - 1, y0 - FH, 2, y1 - y0);
      g.fillStyle = '#3e6b4f'; g.fillRect(x - 1, y0 - FH, 2, 1.5);
      for (let y = Math.ceil(y0 / 16) * 16; y <= y1; y += 16) { g.fillStyle = '#2f5a3e'; g.fillRect(x - 1, y - FH - 1, 2, FH + 1); }
      g.fillStyle = '#3e6b4f'; g.fillRect(x - 0.5, y0 - FH, 1, y1 - y0);
    }
    g.restore();
  }
  function fencePieces(fences) {
    const out = [];
    for (const f of fences || []) {
      for (const s of f.segs) {
        const [ax, ay, bx, by] = s.map(v => v * T);
        if (Math.abs(ay - by) < 0.01) { for (let x = Math.min(ax, bx); x < Math.max(ax, bx) - 0.01; x += 64) out.push({ x0: x, x1: Math.min(Math.max(ax, bx), x + 64), y: ay, sy: ay }); }
        else { for (let y = Math.min(ay, by); y < Math.max(ay, by) - 0.01; y += 16) { const y1 = Math.min(Math.max(ay, by), y + 16); out.push({ x: ax, y0: y, y1, sy: y1 }); } }
      }
      for (const gt of f.gates) for (const k of [0, 2]) out.push({ post: [gt[k] * T, gt[k + 1] * T], sy: gt[k + 1] * T + 0.5 });
    }
    return out;
  }
  Object.assign(window.Props, { gateSprite, portalSprite, drawFence, fencePieces });
})();

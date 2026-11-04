// v7 set dressing (procedural, original art): perimeter wall, real-gate pillars, willow, flag platforms, fountain,
// railway-plaza props, underpass canopies. Every sprite returns { cv, ax, ay } with (ax, ay) = foot point.
(function () {
  'use strict';
  const T = 16;
  const mk = (W, H) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d')]; };
  function txt(g, s, x, y, col, size) { g.font = (size || 8) + 'px ArkPixel, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); }
  function blob(g, cx, cy, r, col) { g.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(cx - w, cy + y, w * 2, 1); } }
  function ell(g, cx, cy, rx, ry, col) { g.fillStyle = col; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry))); g.fillRect(cx - w, cy + y, w * 2, 1); } }

  // ---- perimeter wall: brick plinth + black iron railing, brick posts every few pieces. p = {x0,y0,x1,y1 (px), post}
  const RH = 16, PL = 5;
  function drawWall(g, p) {
    const { x0, y0, x1, y1 } = p;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1 + 2, y1 + 2); g.lineTo(x0 + 2, y0 + 2); g.fill();
    // plinth
    g.fillStyle = '#9a4636'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1, y1 - PL); g.lineTo(x0, y0 - PL); g.fill();
    g.fillStyle = '#d6cdbb'; g.beginPath(); g.moveTo(x0, y0 - PL); g.lineTo(x1, y1 - PL); g.lineTo(x1, y1 - PL - 1.5); g.lineTo(x0, y0 - PL - 1.5); g.fill();
    // railing bars
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 3));
    g.fillStyle = '#23262b';
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; g.fillRect(Math.round(x), Math.round(y - PL - RH), 1, RH); }
    g.strokeStyle = '#23262b'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y0 - PL - RH + 1); g.lineTo(x1, y1 - PL - RH + 1); g.moveTo(x0, y0 - PL - 4); g.lineTo(x1, y1 - PL - 4); g.stroke();
    if (Math.abs(y1 - y0) > Math.abs(x1 - x0)) { g.fillStyle = 'rgba(35,38,43,0.55)'; g.fillRect(Math.min(x0, x1) - 0.5, Math.min(y0, y1) - PL - RH, 1.5, Math.abs(y1 - y0)); }
    if (p.post) { const x = Math.round(x0), y = Math.round(y0);
      g.fillStyle = '#8a3b2e'; g.fillRect(x - 3, y - PL - RH - 4, 6, PL + RH + 4); g.fillStyle = '#ad5240'; g.fillRect(x - 3, y - PL - RH - 4, 2, PL + RH + 4);
      g.fillStyle = '#e2dccd'; g.fillRect(x - 4, y - PL - RH - 6, 8, 2); }
  }
  function wallPieces(walls) { return (walls || []).map((w, i) => ({ x0: w[0] * T, y0: w[1] * T, x1: w[2] * T, y1: w[3] * T, post: i % 3 === 0, sy: Math.max(w[1], w[3]) * T })); }

  // ---- real gates on a N-S wall: one tall pillar (with lamp + name plate); the gate is two of them
  // v7.3: cabinet-style third face for a box-like prop part: top face receding up-right + shaded east side.
  // Light from the upper left, so the side is the darkest of the three faces.
  // v7.4: same three-view cabinet as the buildings (Core.OBL): d = north-south depth in px. The top face (上视图) recedes
  // d px up and K*d px to the LEFT; the west face (左视图) is the darker parallelogram on the left; front = caller's rect.
  // v7.5: default is the flat Stardew look (Core.OBL.MODE 'flat'): the top face is an upright rectangle above the front,
  // same width, d/2 px tall, with a lit front edge; no side face. ?obl=shear keeps the v7.4 drawing below.
  function box3(g, x0, x1, yTop, yBot, d, side, top) {
    const CO = typeof window !== 'undefined' && window.Core, K = CO && CO.OBL ? CO.OBL.K : 0.35, s = Math.max(1, Math.round(K * d));
    if (!CO || !CO.OBL || CO.OBL.MODE !== 'shear') { const h = Math.max(1, Math.round(d / 2));
      g.fillStyle = top; g.fillRect(x0, yTop - h, x1 - x0, h); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x0, yTop - 1, x1 - x0, 1); g.fillStyle = side; g.fillRect(x0, yTop, x1 - x0, 1); return; }
    g.fillStyle = top; g.beginPath(); g.moveTo(x0, yTop); g.lineTo(x1, yTop); g.lineTo(x1 - s, yTop - d); g.lineTo(x0 - s, yTop - d); g.closePath(); g.fill();
    g.fillStyle = side; g.beginPath(); g.moveTo(x0, yTop); g.lineTo(x0 - s, yTop - d); g.lineTo(x0 - s, yBot - d); g.lineTo(x0, yBot); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x0, yTop, 1, yBot - yTop);
  }
  function gatePillar(name, plate) {
    const [cv, g] = mk(40, 74), cx = 20, fy = 70;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - 9, fy - 2, 20, 4);
    box3(g, cx - 8, cx + 8, fy - 6, fy, 8, '#8f897d', '#d0cabd'); g.fillStyle = '#b9b3a6'; g.fillRect(cx - 8, fy - 6, 16, 6);
    g.fillStyle = '#8c3b2e'; g.fillRect(cx - 6, fy - 52, 12, 46); g.fillStyle = '#a84a39'; g.fillRect(cx - 6, fy - 52, 5, 46);
    g.fillStyle = '#6e2c22'; for (let y = fy - 48; y < fy - 6; y += 4) g.fillRect(cx - 6, y, 12, 1);
    box3(g, cx + 6 - 12, cx + 6, fy - 52, fy - 6, 8, '#5a231b', '#a84a39'); g.fillStyle = '#ddd6c6'; g.fillRect(cx - 8, fy - 56, 16, 4); box3(g, cx - 8, cx + 8, fy - 56, fy - 52, 8, '#a39c8d', '#efe9db'); g.fillStyle = '#2f3a40'; g.fillRect(cx - 1, fy - 63, 2, 7);
    g.fillStyle = '#f6e7a8'; g.fillRect(cx - 3, fy - 68, 6, 5); g.fillStyle = '#3d4b52'; g.fillRect(cx - 4, fy - 69, 8, 1);
    if (plate) { g.fillStyle = '#2b2f36'; g.fillRect(cx - 18, fy - 40, 36, 13); g.fillStyle = '#c9a54a'; g.fillRect(cx - 18, fy - 40, 36, 1); g.fillRect(cx - 18, fy - 28, 36, 1); txt(g, name, cx, fy - 33.5, '#f3e2a4', 8); }
    return { cv, ax: cx, ay: fy };
  }
  // ---- 二道门: a big old weeping willow (no gate)
  function willowSprite() {
    const [cv, g] = mk(120, 120), fx = 60, fy = 114, rnd = Core.mulberry(4242);
    ell(g, fx + 4, fy - 1, 34, 6, 'rgba(30,45,20,0.28)');
    g.fillStyle = '#4a3322'; g.fillRect(fx - 6, fy - 46, 12, 46); g.fillStyle = '#634530'; g.fillRect(fx - 4, fy - 46, 4, 44);
    g.fillStyle = '#3b281a'; g.fillRect(fx - 10, fy - 3, 6, 3); g.fillRect(fx + 5, fy - 3, 6, 3);
    for (const [dx, dy] of [[-16, -12], [14, -10], [-4, -18]]) { g.fillStyle = '#4a3322'; for (let i = 0; i < 12; i++) g.fillRect(fx + Math.round(dx * i / 12), fy - 44 + Math.round(dy * i / 12), 3, 3); }
    const cy = fy - 70; blob(g, fx, cy, 30, '#5c8a3a'); blob(g, fx - 18, cy + 6, 20, '#557f35'); blob(g, fx + 18, cy + 6, 20, '#557f35'); blob(g, fx - 4, cy - 6, 22, '#6f9e46');
    for (let i = 0; i < 70; i++) { // drooping strands
      const x = fx - 46 + rnd() * 92, top = cy - 12 + rnd() * 20, len = 26 + rnd() * 34, c = ['#4f7d31', '#6a9b42', '#86b556', '#5c8a3a'][i & 3];
      g.fillStyle = c; for (let y = 0; y < len; y++) g.fillRect(Math.round(x + Math.sin((top + y) / 7) * 1.2), Math.round(top + y), 1, 1);
    }
    for (let i = 0; i < 26; i++) { g.fillStyle = '#a6cf6e'; g.fillRect(fx - 30 + (rnd() * 60 | 0), cy - 22 + (rnd() * 26 | 0), 2, 1); }
    return { cv, ax: fx, ay: fy };
  }
  // ---- 升旗台: granite platform with steps on the south, white pole, red flag
  function flagSprite(frame, hoist) { // v7.6.4: hoist 0..1 (1 = at the top, <= 0 = lowered / no flag)
    hoist = hoist == null ? 1 : hoist;
    const [cv, g] = mk(64, 112), cx = 32, fy = 106;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - 24, fy - 2, 50, 4);
    g.fillStyle = '#b8b6ae'; g.fillRect(cx - 24, fy - 20, 48, 20); g.fillStyle = '#d2d0c8'; g.fillRect(cx - 24, fy - 20, 48, 3);
    for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#c8c6be' : '#a9a79f'; g.fillRect(cx - 10, fy - 6 + i * 2, 20, 2); }
    g.fillStyle = '#8f8d86'; g.fillRect(cx - 24, fy - 8, 14, 8); g.fillRect(cx + 10, fy - 8, 14, 8);
    g.fillStyle = '#e8e8ec'; g.fillRect(cx - 1, fy - 98, 2, 84); g.fillStyle = '#9fa3aa'; g.fillRect(cx, fy - 98, 1, 84); g.fillStyle = '#d4b24a'; g.fillRect(cx - 2, fy - 100, 4, 3);
    const w = 22, h = 14, ph = (frame || 0) * 1.3, lo = Math.round((1 - hoist) * 66);
    if (hoist > 0) { for (let x = 0; x < w; x++) { const dy = Math.round(Math.sin(x / 4 + ph) * 1.5); g.fillStyle = x % 6 < 3 ? '#d42a1e' : '#c22418'; g.fillRect(cx + 1 + x, fy - 96 + lo + dy, 1, h); }
      g.fillStyle = '#ffd84a'; g.fillRect(cx + 4, fy - 93 + lo, 3, 3); for (const [a, b] of [[9, -95], [11, -92], [11, -88], [9, -86]]) g.fillRect(cx + a, fy + b + lo, 1, 1); }
    return { cv, ax: cx, ay: fy };
  }
  function fountainSprite(frame) {
    const [cv, g] = mk(72, 56), cx = 36, fy = 50;
    ell(g, cx, fy - 9, 32, 10, '#a3a19a'); ell(g, cx, fy - 10, 29, 8, '#4c86b8'); ell(g, cx - 4, fy - 12, 18, 4, '#6ea6d4');
    ell(g, cx, fy - 13, 8, 3, '#bcbab2'); g.fillStyle = '#bcbab2'; g.fillRect(cx - 2, fy - 22, 4, 10);
    const ph = (frame || 0) * 0.9; g.fillStyle = 'rgba(220,240,255,0.85)';
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; for (let t = 0; t < 1; t += 0.08) { const r = 18 * t, h = 22 * Math.sin(Math.PI * t) * (0.85 + 0.15 * Math.sin(ph + i)); g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(fy - 22 - h + Math.sin(a) * r * 0.35 + 10 * t), 1, 1); } }
    g.fillStyle = '#ffffff'; g.fillRect(cx - 1, fy - 34, 2, 12);
    return { cv, ax: cx, ay: fy };
  }
  // ---- railway plaza
  function coachSprite(wt, col) {
    const W = Math.round(wt * T) + 4, [cv, g] = mk(W, 46), fy = 42, body = col === 'red' ? ['#9e2a22', '#c23a2c', '#7a1f19'] : ['#2f6b46', '#3f8a5a', '#24543a'];
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(2, fy - 3, W - 2, 4);
    g.fillStyle = '#2a2a2e'; for (const x of [10, 18, W - 22, W - 14]) { blob(g, x, fy - 5, 4, '#2a2a2e'); g.fillStyle = '#777'; g.fillRect(x - 1, fy - 6, 2, 2); }
    g.fillStyle = body[0]; g.fillRect(2, fy - 32, W - 4, 24); g.fillStyle = body[1]; g.fillRect(2, fy - 32, W - 4, 4);
    g.fillStyle = '#f0e6c8'; g.fillRect(2, fy - 14, W - 4, 2);
    g.fillStyle = '#9fb9c8'; for (let x = 8; x < W - 10; x += 11) { g.fillRect(x, fy - 26, 7, 7); g.fillStyle = '#d8e8f0'; g.fillRect(x, fy - 26, 2, 7); g.fillStyle = '#9fb9c8'; }
    g.fillStyle = '#5b5e63'; g.fillRect(1, fy - 36, W - 2, 4); g.fillStyle = '#7d8086'; g.fillRect(1, fy - 36, W - 2, 1);
    g.fillStyle = body[2]; g.fillRect(2, fy - 8, W - 4, 2);
    return { cv, ax: 2, ay: fy };
  }
  function railDecal(g, x0, x1, y) { g.fillStyle = '#6d5a48'; for (let x = x0; x < x1; x += 6) g.fillRect(x, y - 5, 3, 10); g.fillStyle = '#9aa0a6'; g.fillRect(x0, y - 4, x1 - x0, 1.5); g.fillRect(x0, y + 3, x1 - x0, 1.5); }
  function platformDecal(g, x, y, w, h) { g.fillStyle = '#b4b0a6'; g.fillRect(x, y, w, h); g.fillStyle = '#e6c84a'; g.fillRect(x, y + h - 3, w, 2); g.fillStyle = '#9a968c'; for (let i = x; i < x + w; i += 16) g.fillRect(i, y, 1, h); g.fillStyle = '#86837a'; g.fillRect(x, y + h - 1, w, 1); }
  function stationSign(name) {
    const [cv, g] = mk(64, 40), cx = 32, fy = 37; g.fillStyle = '#3e4449'; g.fillRect(cx - 22, fy - 18, 2, 18); g.fillRect(cx + 20, fy - 18, 2, 18);
    g.fillStyle = '#f4f4f0'; g.fillRect(cx - 28, fy - 34, 56, 18); g.fillStyle = '#1d4f9a'; g.fillRect(cx - 28, fy - 20, 56, 4); g.fillStyle = '#20242a'; g.fillRect(cx - 28, fy - 34, 56, 1);
    txt(g, name, cx, fy - 27, '#1b1b1b', 8); g.font = '5px monospace'; txt(g, 'SHANGLANCUN', cx, fy - 18, '#ffffff', 5);
    return { cv, ax: cx, ay: fy };
  }
  function signalSprite() { const [cv, g] = mk(16, 52), cx = 8, fy = 49; g.fillStyle = '#2d3136'; g.fillRect(cx - 1, fy - 36, 2, 36); g.fillRect(cx - 4, fy - 2, 8, 2);
    g.fillStyle = '#1b1d20'; g.fillRect(cx - 4, fy - 48, 8, 16); blob(g, cx, fy - 44, 2, '#e23a2a'); blob(g, cx, fy - 37, 2, '#3a5a3a'); g.fillStyle = '#fff'; g.fillRect(cx - 4, fy - 30, 8, 2); g.fillStyle = '#e23a2a'; g.fillRect(cx - 2, fy - 30, 4, 2); return { cv, ax: cx, ay: fy }; }
  function wheelsetSprite() { const [cv, g] = mk(36, 26), cx = 18, fy = 22; g.fillStyle = '#9a968c'; g.fillRect(cx - 16, fy - 2, 32, 3);
    for (const dx of [-10, 10]) { blob(g, cx + dx, fy - 9, 8, '#3a3c40'); blob(g, cx + dx, fy - 9, 6, '#55585e'); blob(g, cx + dx, fy - 9, 2, '#2a2b2e'); }
    g.fillStyle = '#6a6d72'; g.fillRect(cx - 10, fy - 10, 20, 2); return { cv, ax: cx, ay: fy }; }
  // ---- underpass canopy: a light steel frame with a translucent blue polycarbonate barrel roof over the stair pit
  function canopySprite(wpx, hpx) {
    const W = Math.round(wpx) + 16, H = Math.round(hpx) + 56, [cv, g] = mk(W, H), lift = 40, x0 = 8, x1 = W - 8, yTop = 8, yBot = H - 8 - lift;
    const cols = [[x0, yTop + lift], [x1, yTop + lift], [x0, H - 6], [x1, H - 6]];
    for (const [x, y] of cols) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x - 2, y - 1, 5, 2); g.fillStyle = '#d7dade'; g.fillRect(x - 1.5, y - lift, 3, lift); g.fillStyle = '#9aa0a8'; g.fillRect(x + 0.5, y - lift, 1, lift); }
    // roof: barrel vault seen from above-south
    for (let y = yTop; y <= yBot; y++) { const k = (y - yTop) / Math.max(1, yBot - yTop), a = 0.55 + 0.15 * Math.sin(k * Math.PI); g.fillStyle = `rgba(${90 + 40 * k | 0},${150 + 30 * k | 0},${200 + 20 * k | 0},${a})`; g.fillRect(x0 - 3, y, x1 - x0 + 6, 1); }
    g.fillStyle = 'rgba(255,255,255,0.65)'; for (let x = x0; x <= x1; x += 8) g.fillRect(x, yTop, 1, yBot - yTop);
    g.fillStyle = '#e8ebef'; g.fillRect(x0 - 4, yTop - 2, x1 - x0 + 8, 3); g.fillRect(x0 - 4, yBot, x1 - x0 + 8, 3);
    g.fillStyle = '#b8bec6'; g.fillRect(x0 - 4, yBot + 3, x1 - x0 + 8, 2);
    return { cv, ax: W / 2, ay: H - 6 };
  }
  // ---- v7.1 rail park: a green 25-type coach (yellow band) or a diesel locomotive, sheared column by column so
  // the car follows the diagonal track (vertical lines stay vertical, as the 3/4 view needs)
  function trainCar(kind, lenT, dyT) {
    const L = Math.round(lenT * T), [src, g] = mk(L + 4, 48), fy = 44, x0 = 2, x1 = L + 2;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x0, fy - 3, L, 4);
    for (const bx of [x0 + 14, x1 - 14]) { g.fillStyle = '#26282c'; g.fillRect(bx - 11, fy - 8, 22, 5); for (const w of [-6, 6]) { blob(g, bx + w, fy - 4, 3.5, '#2b2c30'); g.fillStyle = '#80848a'; g.fillRect(bx + w - 1, fy - 5, 2, 2); } }
    if (kind === 'loco') {
      const nose = x1 - 16; g.fillStyle = '#1f5a38'; g.fillRect(x0, fy - 32, L, 24); g.fillStyle = '#2e7448'; g.fillRect(x0, fy - 32, L, 3);
      g.fillStyle = '#f1c232'; g.fillRect(x0, fy - 15, L, 3); g.fillRect(nose, fy - 26, 14, 2);
      g.fillStyle = '#d9dde0'; g.fillRect(x0 + 18, fy - 27, L - 52, 9); g.fillStyle = '#9aa2a8'; for (let x = x0 + 20; x < x1 - 36; x += 5) g.fillRect(x, fy - 27, 1, 9); // louvres
      g.fillStyle = '#123'; g.fillRect(x0 + 4, fy - 28, 9, 8); g.fillRect(nose + 2, fy - 30, 10, 7); g.fillStyle = '#8fb4c8'; g.fillRect(nose + 3, fy - 29, 3, 5); g.fillRect(x0 + 5, fy - 27, 3, 5);
      g.fillStyle = '#fff6c0'; g.fillRect(x1 - 3, fy - 21, 2, 3); g.fillStyle = '#c0392b'; g.fillRect(x1 - 3, fy - 12, 2, 2);
      g.fillStyle = '#5d6166'; g.fillRect(x0 - 1, fy - 36, L + 2, 4); g.fillStyle = '#7e8288'; g.fillRect(x0 + 20, fy - 39, 10, 3); g.fillRect(x0 + 40, fy - 38, 14, 2);
      txt(g, 'DF4', x0 + 30, fy - 11, '#f1c232', 5);
    } else {
      g.fillStyle = '#1e5a3a'; g.fillRect(x0, fy - 32, L, 24); g.fillStyle = '#2c7048'; g.fillRect(x0, fy - 32, L, 2);
      g.fillStyle = '#f1c232'; g.fillRect(x0, fy - 29, L, 2); g.fillRect(x0, fy - 15, L, 3); // the yellow bands of the 25-type
      g.fillStyle = '#9fc0d0'; for (let x = x0 + 8; x < x1 - 9; x += 9) { g.fillRect(x, fy - 25, 6, 7); g.fillStyle = '#e1eef4'; g.fillRect(x, fy - 25, 2, 7); g.fillStyle = '#9fc0d0'; }
      g.fillStyle = '#163f29'; g.fillRect(x0 + 2, fy - 26, 4, 16); g.fillRect(x1 - 6, fy - 26, 4, 16); // doors
      g.fillStyle = '#8a8e94'; g.fillRect(x0 - 1, fy - 36, L + 2, 4); g.fillStyle = '#a9adb2'; g.fillRect(x0 - 1, fy - 36, L + 2, 1);
      g.fillStyle = '#6f7378'; for (let x = x0 + 12; x < x1 - 8; x += 22) g.fillRect(x, fy - 38, 6, 2); // roof vents
      txt(g, 'YZ25', x0 + 22, fy - 11, '#f1c232', 5);
    }
    const tot = Math.round(dyT * T), sl = tot / (L + 4), up = Math.max(0, -tot), dn = Math.max(0, tot), [cv, h] = mk(L + 4, 48 + up + dn);
    for (let x = 0; x < L + 4; x++) h.drawImage(src, x, 0, 1, 48, x, up + Math.round(x * sl), 1, 48);
    return { cv, ax: 2, ay: fy + up };
  }
  function platformQuad(g, x0, x1, y0, y1, h) { // world px; y0/y1 = north edge at x0/x1, h = depth
    g.fillStyle = '#b8b3a8'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1, y1 + h); g.lineTo(x0, y0 + h); g.closePath(); g.fill();
    g.fillStyle = '#e6c84a'; g.beginPath(); g.moveTo(x0, y0 + h - 4); g.lineTo(x1, y1 + h - 4); g.lineTo(x1, y1 + h - 2); g.lineTo(x0, y0 + h - 2); g.closePath(); g.fill();
    g.fillStyle = '#9b978d'; for (let x = x0; x < x1; x += 16) { const y = y0 + (y1 - y0) * (x - x0) / (x1 - x0); g.fillRect(x, y, 1, h - 4); }
  }
  // ---- v7.1 display tank on its plinth (original pixel art, generic Type-59-like outline)
  function tankSprite() {
    const [cv, g] = mk(104, 64), fy = 60, cx = 52;
    box3(g, cx - 46, cx + 46, fy - 10, fy, 16, '#66635c', '#c2beb3'); g.fillStyle = '#8f8c84'; g.fillRect(cx - 46, fy - 10, 92, 10); g.fillStyle = '#b3afa5'; g.fillRect(cx - 46, fy - 10, 92, 2); g.fillStyle = '#6d6a63'; g.fillRect(cx - 46, fy - 1, 92, 1); // plinth
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx - 40, fy - 12, 80, 3);
    g.fillStyle = '#2f3027'; g.fillRect(cx - 40, fy - 22, 80, 11); g.fillStyle = '#3d3e33'; g.fillRect(cx - 40, fy - 22, 80, 2); // track
    for (let i = 0; i < 5; i++) { blob(g, cx - 30 + i * 15, fy - 16, 4.5, '#4a4b3e'); blob(g, cx - 30 + i * 15, fy - 16, 2, '#25261f'); }
    blob(g, cx - 37, fy - 18, 3, '#4a4b3e'); blob(g, cx + 37, fy - 18, 3, '#4a4b3e');
    g.fillStyle = '#556b2f'; g.fillRect(cx - 42, fy - 30, 84, 8); g.fillStyle = '#6b8540'; g.fillRect(cx - 42, fy - 30, 84, 2); g.fillStyle = '#44561f'; g.fillRect(cx - 42, fy - 23, 84, 1); // hull + fenders
    g.fillStyle = '#4b5f28'; g.fillRect(cx - 34, fy - 33, 64, 3);
    g.fillStyle = '#5e7736'; g.beginPath(); g.ellipse(cx - 4, fy - 37, 17, 8, 0, Math.PI, 0); g.fill(); g.fillRect(cx - 21, fy - 37, 34, 4); // turret dome
    g.fillStyle = '#7a9450'; g.fillRect(cx - 14, fy - 44, 14, 2); blob(g, cx + 4, fy - 44, 3, '#4b5f28'); // hatch
    g.fillStyle = '#4b5f28'; g.fillRect(cx + 12, fy - 39, 38, 3); g.fillStyle = '#3a4a1e'; g.fillRect(cx + 44, fy - 40, 6, 5); // gun + muzzle
    g.fillStyle = '#c0392b'; blob(g, cx - 8, fy - 34, 2, '#c0392b');
    return { cv, ax: cx, ay: fy };
  }
  function rampDecal(g, x0, y0, x1, y1, dir, split) { // stair ramp under an underpass canopy, descending toward dir (-1 west / +1 east)
    g.fillStyle = '#5c5f66'; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.fillStyle = '#8a8e95'; g.fillRect(x0, y0, x1 - x0, 2); g.fillRect(x0, y1 - 2, x1 - x0, 2);
    const n = Math.floor((x1 - x0) / 6), ym = split ? Math.round((y0 + y1) / 2) : y1 - 3;
    for (let i = 0; i < n; i++) { const k = dir > 0 ? i / n : 1 - i / n; g.fillStyle = `rgba(${150 - 90 * k | 0},${152 - 90 * k | 0},${158 - 90 * k | 0},1)`; g.fillRect(x0 + i * 6, y0 + 3, 5, ym - y0 - 3 - (split ? 1 : 0)); }
    if (split) { // v7.6: 台阶 (north half, treads) + 斜坡 (south half, one smooth gradient for bikes / wheelchairs), rail between
      const L = x1 - x0; for (let i = 0; i < L; i++) { const k = dir > 0 ? i / L : 1 - i / L; g.fillStyle = `rgb(${142 - 84 * k | 0},${140 - 84 * k | 0},${132 - 80 * k | 0})`; g.fillRect(x0 + i, ym + 1, 1, y1 - ym - 4); }
      g.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 3; i < L - 3; i += 9) g.fillRect(x0 + i, ym + 3, 4, 1);
      g.fillStyle = '#d9b23a'; g.fillRect(x0, ym - 1, L, 2); g.fillStyle = '#7d6a2a'; for (let i = 0; i < L; i += 8) g.fillRect(x0 + i, ym - 2, 1, 3);
    }
  }
  // v7.2: free-standing display board (宣传展板) on two posts: dark frame, red header, white panel with a few lines
  function boardSprite(title) {
    const [cv, g] = mk(48, 40), cx = 22, fy = 37;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - 18, fy - 1, 36, 3);
    g.fillStyle = '#3a3f45'; g.fillRect(cx - 16, fy - 14, 2, 14); g.fillRect(cx + 14, fy - 14, 2, 14);
    box3(g, cx - 20, cx + 20, fy - 36, fy - 12, 3, '#1c2024', '#4a5058'); g.fillStyle = '#2b3036'; g.fillRect(cx - 20, fy - 36, 40, 24); g.fillStyle = '#b3261e'; g.fillRect(cx - 19, fy - 35, 38, 7);
    g.fillStyle = '#f2efe6'; g.fillRect(cx - 19, fy - 28, 38, 15);
    g.fillStyle = '#7d8a96'; for (let k = 0; k < 3; k++) g.fillRect(cx - 16, fy - 25 + k * 4, 22 - k * 5, 2);
    g.fillStyle = '#5c7fa8'; g.fillRect(cx + 8, fy - 26, 9, 11);
    txt(g, title, cx, fy - 31.5, '#ffffff', 6);
    return { cv, ax: cx, ay: fy };
  }
  // v7.3: 龙山餐厅 wide outdoor staircase (drawn over the ground STEPS cells). wpx / dpx = flight width / depth in px,
  // n treads, rise H px from the service lane up to the entrance landing; dxDoor = door x from the left edge in px.
  // Each tread is lifted by its height (2 px per step), so the flight climbs visibly: bright nosing, dark riser,
  // stone cheek walls with a rail that climb with it, a landing slab and the raised glass entrance on top.
  function stairsSprite(wpx, dpx, n, H, dxDoor) {
    const cw = 9, ax = 2, pad = H + 10, W = Math.ceil(wpx) + 8, Hc = Math.ceil(pad + dpx + 4);
    const [cv, g] = mk(W, Hc), O0 = ax, O1 = ax + Math.round(wpx), X0 = O0 + cw, X1 = O1 - cw, G = y => pad + y; // G: ground row of depth y (0 = door line)
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(O0, G(dpx) - 1, O1 - O0 + 3, 3); // contact shadow on the lane
    const td = dpx / n, r = H / n;
    for (let i = 0; i < n; i++) { // i = 0 bottom tread
      const yb = dpx - i * td, yt = dpx - (i + 1) * td, lift = Math.round(r * (i + 1)), lift0 = Math.round(r * i);
      const ry0 = Math.round(G(yb) - lift), ry1 = Math.round(G(yb) - lift0), ty0 = Math.round(G(yt) - lift);
      const k = 0.9 + 0.1 * i / (n - 1), sh = c => `rgb(${c.map(v => Math.round(v * k)).join(',')})`;
      g.fillStyle = sh([212, 204, 188]); g.fillRect(X0, ty0, X1 - X0, ry0 - ty0);           // tread
      g.fillStyle = sh([128, 118, 102]); g.fillRect(X0, ry0, X1 - X0, Math.max(1, ry1 - ry0)); // riser (faces south)
      g.fillStyle = sh([246, 240, 226]); g.fillRect(X0, ry0 - 1, X1 - X0, 1);                // nosing
      g.fillStyle = 'rgba(80,70,60,0.12)'; for (let x = X0 + 8; x < X1; x += 16) g.fillRect(x, ty0, 1, ry0 - ty0); // slab joints
    }
    const top = Math.round(G(0) - H);
    g.fillStyle = '#e2dccd'; g.fillRect(O0, top - 4, O1 - O0, 4); g.fillStyle = '#f4efe4'; g.fillRect(O0, top - 4, O1 - O0, 1); // landing slab
    // cheek walls: top climbs from 5 px (foot) to H + 3 px (landing), inner / outer east faces shaded
    const hc = y => 5 + (H - 2) * (1 - y / dpx);
    for (const cx of [O0, X1]) {
      g.fillStyle = '#a89e8a'; g.beginPath(); g.moveTo(cx, G(0) - hc(0) - 2); g.lineTo(cx + cw, G(0) - hc(0) - 2); g.lineTo(cx + cw, G(dpx) - hc(dpx)); g.lineTo(cx, G(dpx) - hc(dpx)); g.closePath(); g.fill();
      g.fillStyle = '#d9d1c0'; g.fillRect(cx, Math.round(G(0) - hc(0) - 2), cw, 2); g.fillStyle = '#c9c0ad'; g.fillRect(cx + cw - 1, Math.round(G(0) - hc(0)), 1, Math.round(dpx)); // coping + lit east edge
      g.fillStyle = '#8e8574'; g.fillRect(cx, Math.round(G(dpx) - hc(dpx)), cw, Math.round(hc(dpx))); // front end (south face)
      if (cx === O0) { g.fillStyle = '#6a6252'; g.beginPath(); g.moveTo(cx, G(0) - hc(0) - 2); g.lineTo(cx - 2, G(0) - hc(0) - 4); g.lineTo(cx - 2, G(dpx) - 2); g.lineTo(cx, G(dpx)); g.closePath(); g.fill(); } // v7.4: west side (左视图) of the outer cheek
      g.strokeStyle = '#4a4f55'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + cw / 2, G(0) - hc(0) - 9); g.lineTo(cx + cw / 2, G(dpx) - hc(dpx) - 6); g.stroke(); // handrail
      g.fillStyle = '#4a4f55'; for (let y = 2; y < dpx; y += 12) g.fillRect(Math.round(cx + cw / 2), Math.round(G(y) - hc(y) - 8), 1, 6);
    }
    // central handrail down the middle of the wide flight
    const mx = Math.round((X0 + X1) / 2); g.strokeStyle = '#5a5f66'; g.beginPath(); g.moveTo(mx + .5, top - 6); g.lineTo(mx + .5, G(dpx) - 6); g.stroke();
    g.fillStyle = '#5a5f66'; for (let y = 4; y < dpx; y += 12) g.fillRect(mx, Math.round(G(y) - r * n * (1 - y / dpx) - 6), 1, 6);
    return { cv, ax, ay: pad, w: W };
  }
  // v7.2: small display helicopter on a low plinth (generic light helicopter, side view; v7.4: facing east)
  function heliSprite() {
    const [cv, g] = mk(80, 56), cx = 40, fy = 50, R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    R('rgba(0,0,0,0.22)', 6, fy - 1, 68, 4);
    box3(g, 8, 72, fy - 7, fy, 14, '#6f6e68', '#c6c5bb'); R('#9a9a92', 8, fy - 7, 64, 7); R('#b9b8ae', 8, fy - 7, 64, 2); R('#7c7b74', 8, fy - 1, 64, 1);           // plinth
    g.save(); g.translate(80, 0); g.scale(-1, 1); // v7.4: mirrored, nose now points EAST
    R('#3a3f45', 18, fy - 10, 30, 2); R('#3a3f45', 22, fy - 13, 2, 3); R('#3a3f45', 42, fy - 13, 2, 3);       // skids
    R('#4d6b3a', 14, fy - 27, 36, 14); R('#5d7e47', 16, fy - 27, 32, 4); R('#3d5530', 14, fy - 15, 36, 2);     // fuselage
    R('#4d6b3a', 10, fy - 24, 6, 9); R('#9fd0e8', 10, fy - 24, 7, 6); R('#d8f0fa', 11, fy - 23, 2, 3);         // nose + canopy
    R('#9fd0e8', 22, fy - 24, 8, 6); R('#9fd0e8', 32, fy - 24, 7, 6);                                          // cabin windows
    R('#4d6b3a', 50, fy - 24, 22, 4); R('#3d5530', 50, fy - 21, 22, 1);                                        // tail boom
    R('#4d6b3a', 69, fy - 32, 4, 10); R('#2b3036', 66, fy - 30, 10, 1); R('#2b3036', 70, fy - 34, 1, 10);      // fin + tail rotor
    R('#3d5530', 30, fy - 31, 8, 4); R('#2b3036', 33, fy - 34, 2, 3);                                          // engine + mast
    R('#2b3036', 2, fy - 35, 70, 2); R('#596068', 2, fy - 35, 70, 1);                                          // main rotor
    R('#e8e2c8', 20, fy - 19, 10, 2); R('#b3261e', 40, fy - 20, 3, 3);                                         // stripe, star
    g.restore();
    return { cv, ax: cx, ay: fy, facing: 'east' };
  }

  // ---- v7.6 柏林园: 文化长廊 (long open corridor: grey tile roof, painted beams, red columns; roof fades when you walk under)
  function gallerySprite(lpx, dpx) {
    const L = Math.round(lpx), D = Math.round(dpx), lift = 26, W = L + 12, H = D + lift + 14, [cv, g] = mk(W, H), x0 = 6, x1 = W - 6, yTop = 6, yBot = yTop + D, fy = H - 4;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x0, fy - 2, L, 4);
    for (let x = x0 + 2; x <= x1 - 2; x += 32) { g.fillStyle = '#8e2a22'; g.fillRect(x - 1.5, yBot, 3, fy - yBot); g.fillStyle = '#b8483a'; g.fillRect(x - 1.5, yBot, 1, fy - yBot); g.fillStyle = '#6b6258'; g.fillRect(x - 2.5, fy - 2, 5, 2); }
    for (let x = x0 + 2; x < x1 - 30; x += 32) { g.fillStyle = '#7a3a24'; g.fillRect(x + 3, fy - 9, 26, 2); g.fillStyle = '#5a2a1a'; g.fillRect(x + 3, fy - 7, 26, 1); } // 美人靠 benches
    for (let y = yTop; y <= yBot; y++) { const k = (y - yTop) / D; g.fillStyle = k < 0.45 ? `rgb(${92 + 50 * k | 0},${98 + 50 * k | 0},${104 + 46 * k | 0})` : `rgb(${132 - 40 * (k - .45) | 0},${138 - 40 * (k - .45) | 0},${142 - 36 * (k - .45) | 0})`; g.fillRect(x0 - 4, y, L + 8, 1); }
    g.fillStyle = 'rgba(40,44,48,0.35)'; for (let x = x0 - 2; x < x1 + 4; x += 4) g.fillRect(x, yTop + 2, 1, D - 2); // tile rows
    g.fillStyle = '#4e545a'; g.fillRect(x0 - 5, yTop + Math.round(D * 0.45) - 1, L + 10, 3); // ridge
    g.fillStyle = '#3c4146'; g.fillRect(x0 - 6, yBot, L + 12, 2); g.fillRect(x0 - 7, yBot - 2, 3, 3); g.fillRect(x1 + 4, yBot - 2, 3, 3);
    g.fillStyle = '#2f6f74'; g.fillRect(x0 - 3, yBot + 2, L + 6, 5); g.fillStyle = '#2a4f8a'; g.fillRect(x0 - 3, yBot + 7, L + 6, 2); // painted beams (枋)
    const pal = ['#e9c46a', '#e76f51', '#f4f1de', '#81b29a', '#c1121f'];
    for (let x = x0; x < x1 - 8; x += 16) { g.fillStyle = '#f4f1de'; g.fillRect(x + 2, yBot + 3, 11, 3); g.fillStyle = pal[(x >> 4) % 5]; g.fillRect(x + 4, yBot + 3, 7, 3); g.fillStyle = pal[((x >> 4) + 2) % 5]; g.fillRect(x + 6, yBot + 4, 3, 1); }
    return { cv, ax: W / 2, ay: fy };
  }
  // 凉亭: square pavilion, four red columns, grey roof with up-turned corners and a gold finial
  function pavilionSprite(wpx, hpx) {
    const w = Math.round(wpx), d = Math.round(hpx), lift = 26, W = w + 16, H = d + lift + 20, [cv, g] = mk(W, H), cx = W / 2, fy = H - 4, x0 = 8, x1 = W - 8;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x0, fy - 3, w, 5); g.fillStyle = '#b9b2a4'; g.fillRect(x0 + 2, fy - 4, w - 4, 3);
    for (const x of [x0 + 4, x1 - 4]) { g.fillStyle = '#8e2a22'; g.fillRect(x - 1.5, fy - lift, 3, lift - 3); g.fillStyle = '#b8483a'; g.fillRect(x - 1.5, fy - lift, 1, lift - 3); }
    const yT = 10, yB = fy - lift + 2;
    for (let y = yT; y <= yB; y++) { const k = (y - yT) / (yB - yT), hw = 6 + k * (w / 2 + 4); g.fillStyle = `rgb(${84 + 54 * k | 0},${90 + 52 * k | 0},${96 + 50 * k | 0})`; g.fillRect(cx - hw, y, hw * 2, 1); g.fillStyle = 'rgba(30,34,38,0.25)'; g.fillRect(cx + hw * 0.15, y, hw * 0.85, 1); }
    g.fillStyle = '#3c4146'; g.fillRect(cx - w / 2 - 6, yB, w + 12, 2); g.fillRect(cx - w / 2 - 8, yB - 3, 3, 3); g.fillRect(cx + w / 2 + 5, yB - 3, 3, 3);
    g.fillStyle = '#2f6f74'; g.fillRect(cx - w / 2 - 2, yB + 2, w + 4, 3); g.fillStyle = '#e9c46a'; for (let x = cx - w / 2; x < cx + w / 2 - 4; x += 10) g.fillRect(x + 2, yB + 3, 5, 1);
    g.fillStyle = '#c9a227'; g.fillRect(cx - 1, yT - 7, 2, 7); blob(g, cx, yT - 7, 2, '#e9c46a');
    return { cv, ax: cx, ay: fy };
  }
  // 文化墙: low stone feature wall with a red title band and relief panels
  function cultureWall(wpx, title) {
    const w = Math.round(wpx), W = w + 8, H = 34, [cv, g] = mk(W, H), x0 = 4, x1 = W - 4, fy = H - 3;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0, fy - 1, w, 3);
    box3(g, x0, x1, fy - 22, fy, 4, '#8f8a80', '#d7d1c4'); g.fillStyle = '#bdb6a8'; g.fillRect(x0, fy - 22, w, 22); g.fillStyle = '#e2dccf'; g.fillRect(x0, fy - 22, w, 2);
    g.fillStyle = '#9e2a22'; g.fillRect(x0 + 3, fy - 19, w - 6, 6); txt(g, title, (x0 + x1) / 2, fy - 16, '#ffe9a8', 6);
    g.fillStyle = '#a39c8e'; for (let x = x0 + 4; x < x1 - 14; x += 18) { g.fillRect(x, fy - 11, 14, 8); g.fillStyle = '#8a8376'; g.fillRect(x + 2, fy - 9, 4, 4); g.fillRect(x + 8, fy - 8, 4, 3); g.fillStyle = '#a39c8e'; }
    g.fillStyle = '#7a7468'; g.fillRect(x0, fy - 1, w, 1);
    return { cv, ax: W / 2, ay: fy };
  }
  // 刘鼎塑像: bronze bust on a tall granite plinth (inscriptions are in the info card)
  function bustSprite() {
    const [cv, g] = mk(30, 50), cx = 15, fy = 47;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(cx - 11, fy - 1, 22, 3);
    box3(g, cx - 11, cx + 11, fy - 4, fy, 3, '#6d6a63', '#b8b3a8'); g.fillStyle = '#9c978c'; g.fillRect(cx - 11, fy - 4, 22, 4);
    g.fillStyle = '#7f7b73'; g.fillRect(cx - 8, fy - 24, 16, 20); g.fillStyle = '#a19c91'; g.fillRect(cx - 8, fy - 24, 16, 2); g.fillStyle = '#6a665f'; g.fillRect(cx + 5, fy - 22, 3, 18);
    g.fillStyle = '#c9a227'; g.fillRect(cx - 5, fy - 17, 9, 7); txt(g, '刘鼎', cx - 0.5, fy - 13.5, '#3b2a10', 6);
    g.fillStyle = '#3e4a3c'; g.fillRect(cx - 7, fy - 31, 14, 7); g.fillStyle = '#566553'; g.fillRect(cx - 7, fy - 31, 5, 7); // shoulders
    g.fillStyle = '#3e4a3c'; g.fillRect(cx - 2, fy - 33, 4, 3); blob(g, cx, fy - 38, 5, '#4a5946'); blob(g, cx - 1.5, fy - 39, 2.5, '#6b7c66'); g.fillStyle = '#323d31'; g.fillRect(cx - 4, fy - 43, 8, 2);
    return { cv, ax: cx, ay: fy };
  }
  window.PropsV7 = { gallerySprite, pavilionSprite, cultureWall, bustSprite, box3, stairsSprite, heliSprite, boardSprite,  drawWall, wallPieces, gatePillar, willowSprite, flagSprite, fountainSprite, coachSprite, railDecal, platformDecal, stationSign, signalSprite, wheelsetSprite, canopySprite, trainCar, platformQuad, tankSprite, rampDecal };
})();

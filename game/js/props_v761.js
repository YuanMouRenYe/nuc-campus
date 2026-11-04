// v7.6.1 set dressing (procedural, original art): the 南区 rail bridge over the N-S road (deck + abutments, sunken road
// decal), the 地下停车场 (ramp decal, P sign, vents, lawn-roof edging). Sprites return { cv, ax, ay } (foot point).
(function () {
  'use strict';
  const T = 16;
  const mk = (W, H) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d')]; };
  function txt(g, s, x, y, col, size) { g.font = (size || 8) + 'px ArkPixel, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); }

  // ---- rail bridge deck: the 上兰村线 at ground level, carried over the sunken road on a short concrete slab.
  // b = M.props.railBridge: deck [x0,x1] tiles, road [r0,r1], rail [y at x0, y at x1]. Anchor = (x0, sortY).
  const HALF = 1.25 * T, FACE = 10;
  function bridgeGeom(b) { const [x0, x1] = b.deck, [ya, yb] = b.rail, yc = x => ya + (x - x0) * (yb - ya) / (x1 - x0);
    const top = Math.min(ya, yb) - 2.0, sortY = Math.max(ya, yb) + 1.25 + 0.75; return { x0, x1, yc, top, sortY }; }
  function railBridgeSprite(b) {
    const G = bridgeGeom(b), W = Math.ceil((G.x1 - G.x0) * T), H = Math.ceil((G.sortY - G.top) * T) + 4, [cv, g] = mk(W, H), oy = G.top * T;
    const [r0, r1] = b.road.map(x => (x - G.x0) * T), Y = px => G.yc(G.x0 + px / T) * T - oy;
    for (let x = 0; x < W; x++) { const c = Y(x + 0.5), over = x >= r0 - 2 && x < r1 + 2;
      // south face of the slab (only seen where the road dips beneath it) + its shadow line
      if (over) { g.fillStyle = '#8d9096'; g.fillRect(x, Math.round(c + HALF), 1, FACE); g.fillStyle = '#6c6f75'; g.fillRect(x, Math.round(c + HALF) + FACE - 3, 1, 3);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, Math.round(c + HALF) + FACE, 1, 2); }
      g.fillStyle = '#b9b7ae'; g.fillRect(x, Math.round(c - HALF), 1, Math.round(2 * HALF));         // slab top
      g.fillStyle = '#8a7f72'; g.fillRect(x, Math.round(c - 9), 1, 18);                              // ballast
      if (((x + 1) % 6) < 3) { g.fillStyle = '#6b4b33'; g.fillRect(x, Math.round(c - 7), 1, 14); }   // sleepers
      g.fillStyle = '#c7c9cc'; g.fillRect(x, Math.round(c - 4.75), 1, 1.5); g.fillRect(x, Math.round(c + 3.25), 1, 1.5);  // rails
      // parapets: concrete kerb + steel railing on both edges (railings only over the road span)
      g.fillStyle = '#d6d4cc'; g.fillRect(x, Math.round(c - HALF) - 1, 1, 3); g.fillRect(x, Math.round(c + HALF) - 2, 1, 3);
      if (over) { g.fillStyle = '#4f5660'; g.fillRect(x, Math.round(c - HALF) - 7, 1, 1); g.fillRect(x, Math.round(c + HALF) - 8, 1, 1);
        if (x % 5 === 0) { g.fillRect(x, Math.round(c - HALF) - 7, 1, 6); g.fillRect(x, Math.round(c + HALF) - 8, 1, 6); } } }
    // abutments: concrete piers at both road edges, below the slab
    for (const [px, d] of [[r0, -1], [r1, 1]]) { const c = Y(px), yT = Math.round(c + HALF), x = Math.round(px) + (d < 0 ? -6 : 0);
      g.fillStyle = '#a7a9ad'; g.fillRect(x, yT, 6, FACE + 3); g.fillStyle = d < 0 ? '#c3c5c9' : '#86898e'; g.fillRect(d < 0 ? x + 5 : x, yT, 1, FACE + 3); }
    return { cv, ax: 0, ay: Math.round(G.sortY * T - oy), sortY: G.sortY };
  }
  // ground decal: the road dips under the bridge (darker toward the deck, slope stripes, low retaining walls)
  function sunkenRoadDecal(g, b) {
    const [r0, r1] = b.road, [n0, n1] = b.slope_n, [s0, s1] = b.slope_s, X0 = r0 * T, X1 = r1 * T;
    for (let y = n0 * T; y < s1 * T; y++) { const ty = y / T, k = ty < n1 ? (ty - n0) / (n1 - n0) : ty > s0 ? (s1 - ty) / (s1 - s0) : 1;
      g.fillStyle = `rgba(18,22,32,${(0.32 * k).toFixed(3)})`; g.fillRect(X0, y, X1 - X0, 1);
      if ((ty < n1 || ty > s0) && (Math.floor(y) % 5 === 0)) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(X0 + 2, y, X1 - X0 - 4, 1); }
      // retaining walls (inner faces get taller as the road goes down)
      const wpx = 2 + Math.round(4 * k); g.fillStyle = '#9b9a94'; g.fillRect(X0 - 8, y, 8, 1); g.fillRect(X1, y, 8, 1);
      g.fillStyle = '#6f6e69'; g.fillRect(X0, y, wpx, 1); g.fillRect(X1 - wpx, y, wpx, 1);
      g.fillStyle = '#c8c6bd'; g.fillRect(X0 - 8, y, 1, 1); g.fillRect(X1 + 7, y, 1, 1); }
    g.fillStyle = 'rgba(0,0,0,0.30)'; const c = (b.rail[0] + b.rail[1]) / 2 * T; g.fillRect(X0, c - 1.4 * T, X1 - X0, 2.8 * T);   // under the deck
    g.fillStyle = '#e8e2c8'; for (let y = n0 * T + 4; y < s1 * T - 4; y += 12) g.fillRect((X0 + X1) / 2 - 0.5, y, 1.5, 6);  // centre line
  }
  // ---- 地下停车场
  function garageDecal(g, gr) {
    const [x0, y0, x1, y1] = gr.roof.map(v => v * T); g.strokeStyle = 'rgba(214,210,196,0.9)'; g.lineWidth = 2; g.strokeRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);   // kerb round the lawn roof
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
    const [a0, b0, a1, b1] = gr.ramp.map(v => v * T);
    if (gr.dir === 'e') { // v7.6.4: drive-through, both ramps run W -> E (in: down from the west mouth, out: up to the east link)
      const ramp = (r, down) => { const [p0, q0, p1, q1] = r.map(v => v * T);
        for (let x = p0; x < p1; x++) { const k = down ? (x - p0) / (p1 - p0) : (p1 - x) / (p1 - p0); g.fillStyle = `rgb(${150 - 70 * k | 0},${150 - 70 * k | 0},${156 - 66 * k | 0})`; g.fillRect(x, q0, 1, q1 - q0);
          if (Math.floor(x) % 6 === 0) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, q0 + 2, 1, q1 - q0 - 4); } }
        const hx = down ? p0 : p1 - 3; for (let y = q0; y < q1; y += 6) { g.fillStyle = ((y - q0) / 6 | 0) & 1 ? '#2b2b2b' : '#f0c419'; g.fillRect(hx, y, 3, Math.min(6, q1 - y)); }
        g.fillStyle = '#f2f2f2'; const my = (q0 + q1) / 2; for (let x = p0 + 10; x < p1 - 12; x += 16) { g.fillRect(x, my - 1, 6, 2); g.fillRect(x + 5, my - 3, 2, 6); g.fillRect(x + 7, my - 2, 1, 4); }  // -> arrows
        const sx = down ? p1 - 8 : p0; g.fillStyle = '#16181c'; g.fillRect(sx, q0 + 2, 8, q1 - q0 - 4); g.fillStyle = '#3a3f46'; for (let y = q0 + 4; y < q1 - 3; y += 4) g.fillRect(sx, y, 8, 1); };
      ramp(gr.ramp, true); if (gr.ramp_out) ramp(gr.ramp_out, false);
      for (const r of gr.walls) { g.fillStyle = '#a9a9a3'; g.fillRect(r[0] * T, r[1] * T, (r[2] - r[0]) * T, (r[3] - r[1]) * T); g.fillStyle = '#d4d2c9'; g.fillRect(r[0] * T, r[1] * T, (r[2] - r[0]) * T, 1.5); }
      return; }
    for (let y = b0; y < b1; y++) { const k = (y - b0) / (b1 - b0); g.fillStyle = `rgb(${150 - 70 * k | 0},${150 - 70 * k | 0},${156 - 66 * k | 0})`; g.fillRect(a0, y, a1 - a0, 1);
      if (Math.floor(y) % 6 === 0) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(a0 + 2, y, a1 - a0 - 4, 1); } }   // anti-skid grooves
    for (let x = a0; x < a1; x += 6) { g.fillStyle = ((x - a0) / 6 | 0) & 1 ? '#2b2b2b' : '#f0c419'; g.fillRect(x, b0, 6, 3); }  // hazard stripe at the mouth
    g.fillStyle = '#f2f2f2'; const mx = (a0 + a1) / 2; for (let y = b0 + 10; y < b1 - 14; y += 16) { g.fillRect(mx - 1, y, 2, 6); g.fillRect(mx - 3, y + 5, 6, 2); g.fillRect(mx - 2, y + 7, 4, 1); }  // ↓ arrows
    g.fillStyle = '#16181c'; g.fillRect(a0 + 2, b1 - 8, a1 - a0 - 4, 8); g.fillStyle = '#3a3f46'; for (let x = a0 + 4; x < a1 - 3; x += 4) g.fillRect(x, b1 - 8, 1, 8);  // door (roller shutter half open)
    for (const r of gr.walls) { g.fillStyle = '#a9a9a3'; g.fillRect(r[0] * T, r[1] * T, (r[2] - r[0]) * T, (r[3] - r[1]) * T); g.fillStyle = '#d4d2c9'; g.fillRect(r[0] * T, r[1] * T, (r[2] - r[0]) * T, 1.5); }
  }
  function parkingSign() {
    const [cv, g] = mk(30, 46), cx = 15, fy = 43;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx - 4, fy - 1, 9, 2); g.fillStyle = '#7d838b'; g.fillRect(cx - 1, fy - 26, 2, 26);
    g.fillStyle = '#1f5fb3'; g.fillRect(cx - 10, fy - 44, 20, 18); g.fillStyle = '#fff'; g.fillRect(cx - 9, fy - 43, 18, 1);
    txt(g, 'P', cx, fy - 37, '#ffffff', 12); txt(g, '地下停车场', cx, fy - 29, '#ffffff', 5);
    return { cv, ax: cx, ay: fy };
  }
  function ventSprite() {
    const [cv, g] = mk(22, 20), cx = 11, fy = 17;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(cx - 9, fy - 1, 19, 3); g.fillStyle = '#9ea3a8'; g.fillRect(cx - 8, fy - 9, 16, 9); g.fillStyle = '#c5c9cd'; g.fillRect(cx - 9, fy - 13, 18, 4);
    g.fillStyle = '#5b6168'; for (let y = fy - 8; y < fy - 1; y += 2) g.fillRect(cx - 6, y, 12, 1);
    return { cv, ax: cx, ay: fy };
  }
  window.PropsV761 = { bridgeGeom, railBridgeSprite, sunkenRoadDecal, garageDecal, parkingSign, ventSprite };
})();

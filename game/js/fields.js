// v6 sports fields: ONE proportional template per sport (real dimensions in metres), scaled uniformly
// to the traced size of each court, and drawn as vector lines on the ground chunks.
(function () {
  'use strict';
  const MPT = 2.5; // metres per tile
  const LINE = 'rgba(246,246,236,0.95)';
  // each template: [width, length] in metres (long axis = length), draw(g, W, L) in metres around the centre
  const TPL = {
    basketball: [15, 28, (g, W, L) => {
      const h = L / 2; box(g, -W / 2, -h, W, L); seg(g, -W / 2, 0, W / 2, 0); circ(g, 0, 0, 1.8);
      for (const e of [-1, 1]) {
        box(g, -2.45, e > 0 ? h - 5.8 : -h, 4.9, 5.8); circ(g, 0, e * (h - 5.8), 1.8, e > 0 ? Math.PI : 0, e > 0 ? 2 * Math.PI : Math.PI);
        const hy = e * (h - 1.575), cut = Math.sqrt(6.75 * 6.75 - 6.6 * 6.6);
        seg(g, -6.6, e * h, -6.6, hy - e * cut); seg(g, 6.6, e * h, 6.6, hy - e * cut);
        const al = Math.acos(6.6 / 6.75); g.beginPath(); if (e > 0) g.arc(0, hy, 6.75, -Math.PI + al, -al); else g.arc(0, hy, 6.75, al, Math.PI - al); g.stroke();
        g.save(); g.strokeStyle = '#e07a2e'; g.beginPath(); g.arc(0, e * (h - 1.6), 0.45, 0, 7); g.stroke(); g.restore();
        g.save(); g.strokeStyle = '#f4f4f4'; g.lineWidth *= 2; seg(g, -0.9, e * (h - 1.2), 0.9, e * (h - 1.2)); g.restore();
      } }],
    tennis: [10.97, 23.77, (g, W, L) => {
      const h = L / 2; box(g, -W / 2, -h, W, L); seg(g, -4.115, -h, -4.115, h); seg(g, 4.115, -h, 4.115, h);
      seg(g, -4.115, -6.4, 4.115, -6.4); seg(g, -4.115, 6.4, 4.115, 6.4); seg(g, 0, -6.4, 0, 6.4);
      seg(g, 0, -h, 0, -h + 0.4); seg(g, 0, h, 0, h - 0.4); net(g, W / 2 + 0.9); }],
    volleyball: [9, 18, (g, W, L) => { const h = L / 2; box(g, -W / 2, -h, W, L); seg(g, -W / 2, -3, W / 2, -3); seg(g, -W / 2, 3, W / 2, 3); net(g, W / 2 + 0.8); }],
    badminton: [6.1, 13.4, (g, W, L) => { const h = L / 2; box(g, -W / 2, -h, W, L); seg(g, -2.53, -h, -2.53, h); seg(g, 2.53, -h, 2.53, h);
      for (const e of [-1, 1]) { seg(g, -W / 2, e * 1.98, W / 2, e * 1.98); seg(g, -W / 2, e * (h - 0.76), W / 2, e * (h - 0.76)); seg(g, 0, e * 1.98, 0, e * h); } net(g, W / 2 + 0.5); }],
    multi: [18, 30, (g, W, L) => { const h = L / 2; box(g, -W / 2, -h, W, L); seg(g, -W / 2, 0, W / 2, 0); circ(g, 0, 0, 3);
      for (const e of [-1, 1]) box(g, -3, e > 0 ? h - 5 : -h, 6, 5); }],
    football: [68, 105, (g, W, L) => {
      const h = L / 2; box(g, -W / 2, -h, W, L); seg(g, -W / 2, 0, W / 2, 0); circ(g, 0, 0, 9.15); dot(g, 0, 0, 0.5);
      for (const e of [-1, 1]) {
        box(g, -20.16, e > 0 ? h - 16.5 : -h, 40.32, 16.5); box(g, -9.16, e > 0 ? h - 5.5 : -h, 18.32, 5.5); dot(g, 0, e * (h - 11), 0.5);
        const a = Math.acos(5.5 / 9.15); g.beginPath(); if (e > 0) g.arc(0, h - 11, 9.15, -Math.PI / 2 - a, -Math.PI / 2 + a); else g.arc(0, -h + 11, 9.15, Math.PI / 2 - a, Math.PI / 2 + a); g.stroke();
        g.save(); g.lineWidth *= 2; box(g, -3.66, e > 0 ? h : -h - 1.6, 7.32, 1.6); g.restore();
      } }],
  };
  function box(g, x, y, w, h) { g.strokeRect(x, y, w, h); }
  function seg(g, a, b, c, d) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
  function circ(g, x, y, r, a0, a1) { g.beginPath(); g.arc(x, y, r, a0 || 0, a1 == null ? Math.PI * 2 : a1); g.stroke(); }
  function dot(g, x, y, r) { g.save(); g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore(); }
  function net(g, half) { void g; void half; } // v7.6.4: nets are y-sorted statics with posts + collision (game.js), not ground lines
  const mix = (hx, k) => { const c = [1, 3, 5].map(i => parseInt(hx.slice(i, i + 2), 16)); return `rgb(${c.map((v, i) => Math.round(v + ([238, 242, 248][i] - v) * k)).join(',')})`; };
  // place one template inside rect (px) with uniform scale; long axis follows the longer side of the rect
  function template(g, kind, x, y, w, h, winter) {
    const t = TPL[kind]; if (!t) return; const [W0, L0, fn] = t, vert = h >= w, Lpx = vert ? h : w, Wpx = vert ? w : h;
    const s = Math.min(Lpx / L0, Wpx / W0); // px per metre, uniform
    g.save(); g.translate(x + w / 2, y + h / 2); if (!vert) g.rotate(Math.PI / 2); g.scale(s, s);
    g.strokeStyle = winter ? 'rgba(255,255,255,0.5)' : LINE; g.lineWidth = Math.max(0.12, (kind === 'football' ? 1.4 : 1) / s);
    fn(g, W0, L0); g.restore();
  }
  // draw every field overlapping the window [ox, oy, ox+span, oy+span] (world px); T = px per tile
  function draw(g, fields, ox, oy, span, T, season) {
    const winter = season === 'winter';
    for (const f of fields || []) {
      const x = f.x * T - ox, y = f.y * T - oy, w = f.w * T, h = f.h * T;
      if (x > span + 4 || y > span + 4 || x + w < -4 || y + h < -4) continue;
      const col = c => winter ? mix(c, 0.66) : c;
      if (f.k === 'sand') continue;
      if (f.k === 'pad') { g.fillStyle = col(f.col); g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); continue; }
      if (f.k === 'stand') { g.fillStyle = '#7d7f86'; g.fillRect(x, y, w, h); g.fillStyle = col(f.col); for (let i = 1; i < w - 1; i += 3) g.fillRect(x + i, y + 1, 2, h - 2);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + w - 2, y, 2, h); continue; }
      if (f.k === 'track') {
        const r = w / 2, lw = f.lanes * 0.49 * T; g.fillStyle = col(f.col); rr(g, x, y, w, h, Math.min(w, h) / 2); g.fill();
        g.strokeStyle = winter ? 'rgba(255,255,255,0.4)' : 'rgba(246,240,230,0.75)'; g.lineWidth = 1;
        for (let k = 1; k < f.lanes; k++) { const d = k * lw / f.lanes; rr(g, x + d, y + d, w - 2 * d, h - 2 * d, Math.min(w, h) / 2 - d); g.stroke(); }
        g.fillStyle = col('#5aa64c'); rr(g, x + lw, y + lw, w - 2 * lw, h - 2 * lw, Math.min(w, h) / 2 - lw); g.fill();
        // start / finish line across the home straight (west side)
        g.fillStyle = 'rgba(250,250,250,0.9)'; g.fillRect(x, y + h * 0.62, lw, 1.5); void r; continue;
      }
      if (f.k === 'football') {
        g.fillStyle = col(f.col); g.fillRect(x, y, w, h);
        if (!winter) { g.fillStyle = 'rgba(255,255,255,0.07)'; const vert = h >= w, n = Math.round((vert ? h : w) / (T * 2.4));
          for (let i = 0; i < n; i += 2) vert ? g.fillRect(x, y + i * h / n, w, h / n) : g.fillRect(x + i * w / n, y, w / n, h); }
        const ins = (f.inset || 0) * T; template(g, 'football', x + ins, y + ins, w - 2 * ins, h - 2 * ins, winter); continue;
      }
      if (!f.sand && f.col) { g.fillStyle = col(f.col); g.fillRect(x, y, w, h); } // v7.6.4: sand courts keep the sand ground
      const m = Math.min(w, h) * 0.06; template(g, f.k, x + m, y + m, w - 2 * m, h - 2 * m, winter);
    }
  }
  function rr(g, x, y, w, h, r) { r = Math.max(0, r); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  window.Fields = { TPL, template, draw, MPT };
})();

// Pure, DOM-free game logic shared by the browser and node tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CLASS_NAMES = ['OUT','GRASS','WOOD','HILL','ROAD','PATH','PLAZA','WATER','PITCH','TRACK','COURT','PARKING','RAIL','BARE','VILLAGE','APRON','FLOWERS','CLIFF','BUILDING','STEPS','SAND','DEEPWOOD','TERRACE'];
  const C = {}; CLASS_NAMES.forEach((n, i) => (C[n] = i));
  // v6: the railway is fenced (cross only at 二道门 or through the underpasses); 二龙山 terrace walls are solid
  const BLOCKING = new Set([C.BUILDING, C.WATER, C.CLIFF, C.RAIL, C.TERRACE]);
  const PAVED = new Set([C.ROAD, C.PATH, C.PLAZA, C.APRON, C.PARKING, C.STEPS, C.VILLAGE, C.COURT, C.TRACK]);

  function hash2(x, y) { // deterministic 0..1
    let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function project(lat, lon, meta) { // same equirectangular projection as tools/build_map.py
    const [LON0, LAT0, LON1, LAT1] = meta.bounds; const latc = (LAT0 + LAT1) / 2;
    const MX = Math.cos(latc * Math.PI / 180) * 111320, MY = 110574;
    return [(lon - LON0) * MX / meta.mpt, (LAT1 - lat) * MY / meta.mpt];
  }

  // Collision grid at ground sub-cell resolution (sub cells per tile). 1 = blocked.
  function buildCollision(ground, meta, trees, extraRects, shadow) {
    const sub = meta.sub, gw = meta.w * sub, gh = meta.h * sub;
    const col = new Uint8Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) col[i] = BLOCKING.has(ground[i]) || (shadow && shadow[i]) ? 1 : 0;
    const mark = (x0, y0, x1, y1) => { // rect in tile units
      for (let y = Math.floor(y0 * sub); y < Math.ceil(y1 * sub); y++)
        for (let x = Math.floor(x0 * sub); x < Math.ceil(x1 * sub); x++)
          if (x >= 0 && y >= 0 && x < gw && y < gh) col[y * gw + x] = 1;
    };
    for (const t of trees || []) { const r = t[2] === 4 ? 0.45 : 0.22; mark(t[0] - r, t[1] - 0.25, t[0] + r, t[1] + 0.1); }
    for (const r of extraRects || []) mark(r[0], r[1], r[2], r[3]);
    return { col, gw, gh, sub };
  }
  function blockedAt(cg, tx, ty) { // tile coords (float)
    const x = Math.floor(tx * cg.sub), y = Math.floor(ty * cg.sub);
    if (x < 0 || y < 0 || x >= cg.gw || y >= cg.gh) return true;
    return cg.col[y * cg.gw + x] === 1;
  }
  function rectBlocked(cg, x0, y0, x1, y1) { // tile coords
    const s = cg.sub;
    for (let y = Math.floor(y0 * s); y <= Math.floor((y1 - 1e-6) * s); y++)
      for (let x = Math.floor(x0 * s); x <= Math.floor((x1 - 1e-6) * s); x++) {
        if (x < 0 || y < 0 || x >= cg.gw || y >= cg.gh) return true;
        if (cg.col[y * cg.gw + x]) return true;
      }
    return false;
  }
  // v7.6.1 terrain: terr = RGBA bytes of data/terrain.png (R = DEM level + 1, G = ramp position 1..255 top->bottom, B = downhill dir 1..8)
  const RAMP_DIRS = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
  // B bit 16 = one of the four named long slopes (slopes_v761.py), B = 32 = low stone side wall beside such a ramp (drawn only)
  const UPHILL_SLOW = 0.75, UPHILL_SLOW_LONG = 0.85;
  function terrainAt(terr, gw, sx, sy) { const i = (sy * gw + sx) * 4; return terr ? { lev: terr[i], ramp: terr[i + 1], dir: terr[i + 2] & 15, long: !!(terr[i + 2] & 16), side: !!(terr[i + 2] & 32) } : { lev: 0, ramp: 0, dir: 0 }; }
  // walking speed factor on a ramp: slower going uphill (by how much of the move points uphill), normal across / down
  function slopeFactor(terr, gw, sub, x, y, ix, iy) {
    if (!terr) return 1; const t = terrainAt(terr, gw, Math.floor(x * sub), Math.floor(y * sub)); if (!t.ramp || !t.dir) return 1;
    const d = RAMP_DIRS[t.dir - 1], L = Math.hypot(ix, iy) || 1, up = -(ix * d[0] + iy * d[1]) / L;
    return up > 0 ? 1 - (1 - (t.long ? UPHILL_SLOW_LONG : UPHILL_SLOW)) * up : 1;
  }
  // Move a foot box (half width hw, height hh above foot) by dx,dy with axis-separated sliding.
  function moveBox(cg, pos, dx, dy, hw, hh) {
    const tryAt = (x, y) => !rectBlocked(cg, x - hw, y - hh, x + hw, y);
    let { x, y } = pos;
    if (dx && tryAt(x + dx, y)) x += dx;
    else if (dx) { // corner sliding
      for (const n of [0.25, -0.25]) if (tryAt(x + dx, y + n) && tryAt(x, y + n)) { y += n * 0.5; break; }
    }
    if (dy && tryAt(x, y + dy)) y += dy;
    else if (dy) {
      for (const n of [0.25, -0.25]) if (tryAt(x + n, y + dy) && tryAt(x + n, y)) { x += n * 0.5; break; }
    }
    return { x, y };
  }

  // Interiors: char grids. '#' wall top, 'w' wall face, '.' floor, 'D' exit door, others = furniture handled by renderer.
  const SOLID_INTERIOR = new Set(['#', 'w', 'C', 'S', 'T', 'K', 'P', 'B', 'X', 'L', 'E', 'M', 'R', 'O', 'G', 'Q', 'd', 'Y', 'k', 'A', 'H', 'Z', 'F', 'n']);
  function interiorGrid(def) {
    const rows = def.map; const h = rows.length, w = rows[0].length;
    const col = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) col[y * w + x] = SOLID_INTERIOR.has(rows[y][x]) ? 1 : 0;
    return { col, gw: w, gh: h, sub: 1, w, h };
  }
  function findChar(def, ch) { const out = []; def.map.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) out.push([x, y]); })); return out; }

  // v6 fences: axis-aligned segments [x0,y0,x1,y1] -> thin collision rects along their base line
  // v7.6.4: NPC sprite row. Rows 0/1 are the player and julia; NPCs pick from rows 2..n-1 of the sheet (n = students.json variants).
  // v7.6.2 used 2 + floor(r * 7) = 2..8 with only 8 rows, so variant 8 had no sprite and those NPCs showed only their shadow.
  // v7.6.4: one see-through rule for trees, lamps (and faded statics): drawn at BEHIND_ALPHA while the player stands behind (north of) it and overlaps it
  const BEHIND_ALPHA = 0.4;
  function behindAlpha(objY, playerY, overlaps) { return overlaps && objY > playerY ? BEHIND_ALPHA : 1; }
  function npcVariant(r, n) { n = n || 8; return 2 + Math.min(n - 3, Math.max(0, Math.floor(r * (n - 2)))); }
  // v7.6.4: an E-W fence keeps the player FENCE_BACK tiles north of its base line, so someone standing behind it is clearly behind
  // (the 14 px mesh no longer cuts through the legs of a player who looks as if standing on the line); N-S runs stay thin
  const FENCE_BACK = 0.5;
  function fenceRects(fences) { const out = []; for (const f of fences || []) for (const s of f.segs) { const ew = Math.abs(s[1] - s[3]) < 1e-6;
    out.push([Math.min(s[0], s[2]) - 0.12, Math.min(s[1], s[3]) - (ew ? FENCE_BACK : 0.14), Math.max(s[0], s[2]) + 0.12, Math.max(s[1], s[3]) + 0.1]); } return out; }
  // v6 passages (underpasses): the portal end the player stands at, and where they come out
  function passageAt(passages, x, y, r) { for (const p of passages || []) for (const [a, b] of [[p.a, p.b], [p.b, p.a]]) if (Math.hypot(a.out[0] - x, a.out[1] - y) < (r || 1.8)) return { p, from: a, to: b }; return null; }
  // v7 perimeter wall: ~1-tile pieces [x0,y0,x1,y1] (any direction) -> small collision boxes along the line
  function wallRects(walls) { const out = []; for (const w of walls || []) { const [x0, y0, x1, y1] = w, L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L / 0.2));
    for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; out.push([x - 0.16, y - 0.16, x + 0.16, y + 0.12]); } } return out; }
  // v7 (item 15) Stardew perspective: a building's roof and upper walls are drawn lifted by the wall height, so they
  // hide the ground for wallHeight/16 tiles north of the footprint. Like Stardew's "Buildings" back layer, that ground
  // is made solid (except roads / paths / steps, which stay open and are drawn under the x-ray cut), so the player can
  // never stand "on" a roof. Doors and underpass ends that end up inside such a shadow get a carved corridor out.
  // v7.1: roads, footways and steps are ALWAYS walkable, even where a facade / roof overlaps them in the 3/4 view
  // (the building sprite is cut translucent over them instead). Everything else behind / under a roof stays blocked.
  const SHADOW_OPEN = new Set([C.ROAD, C.PATH, C.STEPS]);

  // v7.4: three-view (上视图 / 正视图 / 左视图) cabinet projection. The viewer stands a little south-WEST, so besides the roof
  // (top view, still the true footprint lifted by the wall height) and the south facade (front view, unsheared) every
  // west-facing wall shows as a sheared parallelogram on the LEFT: its base recedes from the wall's south corner up-left,
  // OBL.K px to the left per px of north-south depth (receding depth capped at OBL.CAP px so 40-60 tile deep blocks don't
  // throw a 15-tile wedge over their neighbours). The roof gains the matching triangle over the face's top edge.
  // Collision is untouched (real footprint); roofShadow treats the ground under the new face like ground under a roof.
  const OBL = { K: 0.35, CAP: 160, MIN: 6, SHADE: { top: 1.0, front: 0.9, left: 0.72 } };
  // v7.5 mock-up toggle (?obl=A|B|C, default 'shear' = shipped v7.4). A/B/C keep the roof and every face axis-aligned:
  //   A: roof widened over a same-height side-wall rectangle, side = 0.5 x depth;  B: narrow side strip 0.3 x depth + lit corner;
  //   C: as B, roof widened with a small pixel-stepped bevel at its top-left corner.
  // v7.5: DEFAULT is 'flat' = original Stardew Valley look: the roof is the footprint lifted by the wall height (top view,
  // same width as the facade) and only the south facade shows below it. No side walls, no shear, no taper.
  // The rejected experiments stay reachable for comparison only: ?obl=shear (v7.4 left face), ?obl=A|B|C|D|E (mock-ups).
  OBL.MODE = (typeof location !== 'undefined' && (/[?&]obl=(shear|[ABCDE])\b/.exec(location.search) || [])[1]) || 'flat';
  OBL.FRONT_MIN = 0.5; // flat: an edge gets a facade only if it faces mostly south (|angle from south| < 60 deg)
  const RECT_K = { A: 0.5, B: 0.3, C: 0.3 };
  // v7.5 taper mock-ups (?obl=D|E): footprint, collision and front stay put; the roof is an axis-aligned rectangle inset
  // INTO the base, so the walls lean in towards it (frustum). Insets in px scale with wall height wh, clamped to the width.
  //   D: left inset 0.30 wh (6-20% of width), back 0.10 wh (<= 12% of depth); front stays a full rectangle.
  //   E: left and right 0.20 wh each (3-10% of width per side), back 0.10 wh; front is a trapezoid narrowing upwards.
  const TAPER = { D: { L: 0.30, R: 0, T: 0.10, minW: 0.06, maxW: 0.20 }, E: { L: 0.20, R: 0.20, T: 0.10, minW: 0.03, maxW: 0.10 } };
  function taper(b) {
    const P = TAPER[OBL.MODE]; if (!P || !b.poly || b.poly.length < 3 || b.corridor || b.bridge || b.k === 'pavilion') return null;
    const wh = wallHeight(b); if (wh < 14) return null;
    const W = (b.bbox[2] - b.bbox[0]) * 16, H = (b.bbox[3] - b.bbox[1]) * 16, cl = k => k ? Math.max(P.minW * W, Math.min(P.maxW * W, k * wh)) : 0;
    return { iL: cl(P.L), iR: cl(P.R), t: Math.min(0.12 * H, P.T * wh), front: OBL.MODE === 'E' ? 'trap' : 'rect' };
  }
  function inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [x1, y1] = P[j], [x2, y2] = P[i]; if ((y1 > y) !== (y2 > y) && x < x1 + (y - y1) * (x2 - x1) / (y2 - y1)) c = !c; } return c; }
  function oblique(b) {
    if (b._obl) return b._obl;
    const P = b.poly, T = 16, out = { faces: [], poly: P, x0: b.bbox ? b.bbox[0] : 0 };
    if (OBL.MODE === 'flat' || TAPER[OBL.MODE]) return (b._obl = out);
    if (!P || P.length < 3 || b.corridor || b.bridge || b.k === 'pavilion' || wallHeight(b) < 14) return (b._obl = out);
    let A = 0; for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; A += x0 * y1 - x1 * y0; }
    const ins = new Map();
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length], ex = c[0] - a[0], ey = c[1] - a[1], L = Math.hypot(ex, ey); if (L < 0.3) continue;
      let nx = ey, ny = -ex; if (!(A > 0)) { nx = -nx; ny = -ny; }
      if (nx / L > -0.5) continue;                                          // not west-facing
      const S = a[1] >= c[1] ? a : c, N = S === a ? c : a, D = (S[1] - N[1]) * T; if (D < OBL.MIN) continue;
      const rect = OBL.MODE !== 'shear', w = (rect ? RECT_K[OBL.MODE] : OBL.K) * Math.min(D, OBL.CAP) / T, Np = [N[0] - w, N[1]], Sp = [S[0] - w, S[1]];
      // skip faces that would fall over the building's own footprint (inner courtyard / notch walls are hidden anyway)
      const probe = rect ? [[(S[0] + Np[0]) / 2, (S[1] + Np[1]) / 2], [Sp[0] + 0.05, Sp[1] - 0.05], [Np[0] + 0.05, Np[1] + 0.05]] : [[(S[0] + N[0] + Np[0]) / 3, (S[1] + N[1] + Np[1]) / 3], [(N[0] * 3 + Np[0] + S[0] * 2) / 6, (N[1] * 3 + Np[1] + S[1] * 2) / 6], [Np[0] + 0.05, Np[1] + 0.05]];
      if (probe.some(([x, y]) => inPoly(P, x, y))) continue;
      if (!rect) { out.faces.push({ i, S, N, Np, w, D: D / T }); ins.set(i, [Np]); continue; }
      const bv = OBL.MODE === 'C' ? Math.min(w, 16 / T) : 0, st = [];   // C: stepped bevel, 4 px steps, top-left corner of the strip
      if (bv > 0) { const n = Math.max(1, Math.round(bv * T / 4)); for (let k = 0; k <= n; k++) { const x = N[0] - w + bv * k / n, y = N[1] + bv * (1 - k / n); st.push([x, y]); if (k < n) st.push([N[0] - w + bv * (k + 1) / n, y]); } }
      const top = bv > 0 ? st : [Np];
      out.faces.push({ i, S, N, Np, Sp, w, D: D / T, rect: true }); ins.set(i, P[i] === S ? [Sp, ...top] : [...top.slice().reverse(), Sp]);
    }
    if (out.faces.length) { const Q = []; for (let i = 0; i < P.length; i++) { Q.push(P[i]); if (ins.has(i)) Q.push(...ins.get(i)); } out.poly = Q; out.x0 = Math.min(out.x0, ...out.faces.map(f => f.Np[0])); }
    return (b._obl = out);
  }
  function roofShadow(ground, meta, buildings, keep) {
    const sub = meta.sub, gw = meta.w * sub, gh = meta.h * sub, T = meta.tile || 16, sh = new Uint8Array(gw * gh);
    for (const b of buildings || []) {
      if (b.bridge || !b.poly || b.poly.length < 3) continue;
      const h = wallHeight(b) / T, ob = oblique(b), P = ob.poly, [, , bx1] = b.bbox, bx0 = ob.x0;
      for (let sx = Math.floor(bx0 * sub); sx < Math.ceil(bx1 * sub); sx++) {
        if (sx < 0 || sx >= gw) continue; const X = (sx + 0.5) / sub, ys = [];
        for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [x1, y1] = P[j], [x2, y2] = P[i]; if ((x1 <= X) !== (x2 <= X)) ys.push(y1 + (X - x1) * (y2 - y1) / (x2 - x1)); }
        ys.sort((a, c) => a - c);
        for (let k = 0; k + 1 < ys.length; k += 2) { const top = ys[k];
          for (let sy = Math.max(0, Math.floor((top - h) * sub)); sy < Math.min(gh, Math.floor(top * sub)); sy++) { const i = sy * gw + sx; if (!SHADOW_OPEN.has(ground[i]) && !BLOCKING.has(ground[i])) sh[i] = 1; }
          // v7.4: ground inside the left-face wedge (between the real west wall and the face's receding base line)
          if (ob.faces.length && ob.faces.some(f => X >= f.Np[0] && X <= Math.max(f.S[0], f.N[0])))
            for (let sy = Math.max(0, Math.floor(top * sub)); sy < Math.min(gh, Math.ceil(ys[k + 1] * sub)); sy++) { const i = sy * gw + sx; if (!SHADOW_OPEN.has(ground[i]) && !BLOCKING.has(ground[i]) && !inPoly(b.poly, X, (sy + 0.5) / sub)) sh[i] = 1; } }
      }
    }
    for (const b of buildings || []) if (b.bridge) { const [x0, y0, x1, y1] = b.bbox; for (let sy = Math.max(0, Math.floor(y0 * sub)); sy < Math.min(gh, Math.ceil(y1 * sub)); sy++) for (let sx = Math.max(0, Math.floor(x0 * sub)); sx < Math.min(gw, Math.ceil(x1 * sub)); sx++) sh[sy * gw + sx] = 0; } // open ground storeys stay open
    // carve: everything that must stay usable (doors, passage ends, gates, spawn) has to connect to the spawn's
    // component; when a shadow cuts one off, open the shortest free path (0.75 tile wide) back to that component
    const free = i => !BLOCKING.has(ground[i]), N = gw * gh, reach = new Uint8Array(N), q = new Int32Array(N);
    const flood = (seeds) => { let h = 0, t = 0; for (const i of seeds) if (!reach[i] && free(i) && !sh[i]) { reach[i] = 1; q[t++] = i; }
      while (h < t) { const i = q[h++], x = i % gw; for (const j of [i - 1, i + 1, i - gw, i + gw]) { if (j < 0 || j >= N || (j === i - 1 && x === 0) || (j === i + 1 && x === gw - 1)) continue; if (!reach[j] && !sh[j] && free(j)) { reach[j] = 1; q[t++] = j; } } } };
    const sp = keep && keep.length ? keep[keep.length - 1] : null; if (sp) flood([Math.floor(sp[1] * sub) * gw + Math.floor(sp[0] * sub)]);
    for (const [kx, ky] of keep || []) {
      const s0x = Math.floor(kx * sub), s0y = Math.floor(ky * sub); if (s0x < 0 || s0y < 0 || s0x >= gw || s0y >= gh) continue;
      const st = s0y * gw + s0x; if (reach[st] || !free(st)) continue;
      const prev = new Map([[st, -1]]), qq = [st]; let end = -1;
      for (let qi = 0; qi < qq.length && qi < 200000; qi++) { const i = qq[qi], x = i % gw, y = (i / gw) | 0;
        if (reach[i]) { end = i; break; }
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const j = ny * gw + nx; if (prev.has(j) || !free(j)) continue; prev.set(j, i); qq.push(j); } }
      if (end < 0) continue; const opened = [];
      for (let i = end; i >= 0; i = prev.get(i)) { const x = i % gw, y = (i / gw) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) { const j = ny * gw + nx; if (sh[j]) { sh[j] = 0; opened.push(j); } } } }
      opened.push(st); flood(opened); for (const j of opened) if (!reach[j] && free(j)) { /* pocket cells join through their neighbours */ }
      flood(prev.size < 5e5 ? [...prev.keys()].filter(j => !sh[j]) : []);
    }
    return sh;
  }
  // v7.6 whole-building fade: eased 0..1 state -> draw alpha (1 opaque .. FADE_ALPHA), and the opaque-pixel mask of a sprite
  const FADE_ALPHA = 0.45, FADE_RATE = 0.2;
  function fadeStep(t, tgt) { t += (tgt - t) * FADE_RATE; return Math.abs(tgt - t) < 0.02 ? tgt : t; }
  function fadeAlpha(t) { return 1 - (1 - FADE_ALPHA) * Math.max(0, Math.min(1, t)); }
  function alphaMask(cv) { const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, m = new Uint8Array(cv.width * cv.height);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 40 ? 1 : 0; return m; }
  function shadowKeep(M) { const k = [];
    for (const b of M.buildings || []) if (b.door && !b.bridge) k.push([b.door[0], b.door[1] + 0.5], [b.door[0], b.door[1] + 1.4]);
    for (const p of M.passages || []) for (const e of [p.a, p.b]) if (e.out) k.push([e.out[0], e.out[1]]);
    for (const p of M.pois || []) k.push([p.x, p.y + 1]);
    for (const f of M.fences || []) for (const g of f.gates || []) { const mx = (g[0] + g[2]) / 2, my = (g[1] + g[3]) / 2, hz = Math.abs(g[1] - g[3]) < 1e-6; k.push([mx, my], hz ? [mx, my - 0.8] : [mx - 0.8, my], hz ? [mx, my + 0.8] : [mx + 0.8, my]); }
    for (const b of M.buildings || []) if (b.bridge && b.bridge.arcade) { const y = b.bridge.y != null ? b.bridge.y : (b.bbox[1] + b.bbox[3]) / 2; k.push([b.bbox[0] - 1.2, y], [(b.bbox[0] + b.bbox[2]) / 2, y], [b.bbox[2] + 1.2, y]); }
    for (const g of M.wallGates || []) { const v = g.kind === 'gate7' || g.kind === 'gate_n'; k.push(v ? [g.x - 1.4, g.y] : [g.x, g.y - 1.4], v ? [g.x + 1.4, g.y] : [g.x, g.y + 1.4]); }
    if (M.spawn) k.push([M.spawn[0], M.spawn[1]]); return k; }
  function nearestBuilding(buildings, x, y, maxD) {
    let best = null, bd = maxD;
    for (const b of buildings) { if (!b.enter) continue; const d = Math.hypot(b.door[0] - x, b.door[1] - y); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  // façade height in px (16 px tiles, 32 px tall characters). v5: 18 px per floor (was 10), so a 5-floor block is
  // ~3.3 character heights instead of 2; the cap only keeps hypothetical 12+ floor towers below 主楼.
  const WALL = { base: 14, floor: 18, max: 230, main: 260, dehuai: 140, pavilion: 32 };
  function wallHeight(b) { if (b.k === 'pavilion') return WALL.pavilion; if (b.special === 'main') return WALL.main; if (b.special === 'dehuai') return WALL.dehuai; return Math.max(22, Math.min(WALL.max, WALL.base + (b.f || 1) * WALL.floor)); }
  function clockText(minutes) { const day = 1 + Math.floor(minutes / 1440), m = minutes % 1440; return `第 ${day} 天 ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`; }
  function nightness(minutes) { const h = (minutes % 1440) / 60; // 0 day .. 1 night
    if (h >= 7 && h <= 17) return 0; if (h > 17 && h < 20) return (h - 17) / 3 * 0.85; if (h >= 20 || h < 5) return 0.85; return 0.85 * (7 - h) / 2; }
  // where the player stands after arriving on a floor via its stairs (just south of the stair tiles)
  // v7.3 龙山餐厅 outdoor staircase: characters on the flight are drawn lifted (0 at the foot -> rise px at the door
  // landing) so the treads read as climbing to a raised entrance. Collision / sorting still use the ground position.
  const STAIR_RISE = 16;
  function stairLift(st, x, y) { if (!st || x < st.x0 || x > st.x1 || y < st.y0 - 0.6 || y > st.y1) return 0;
    return Math.round(STAIR_RISE * Math.min(1, (st.y1 - y) / (st.y1 - st.y0))); }
  function stairArrival(def, ch) { const t = findChar(def, ch); if (!t.length) return null; return { x: t.reduce((a, p) => a + p[0], 0) / t.length + 0.5, y: Math.max(...t.map(p => p[1])) + 1.6 }; }

  // ---------- phase 3: daily schedule, quests, save ----------
  const hm = (h, m) => h * 60 + (m || 0);
  // 作息 (phase 4, checked against public NUC pages — see docs/bell_times.md):
  //  morning 8:00–8:45 / 8:55–9:40 · 10:10–10:55 / 11:05–11:50 all year;
  //  afternoon 冬令时 14:00–14:45 / 14:55–15:40 · 16:10–16:55 / 17:05–17:50, 夏令时 (≈5月6日–10月8日) everything +30 min;
  //  evening 晚课 19:00–21:30 is approximate (no public source). Bells ring at the start/end of each 大节.
  const BELLS_WINTER = [[hm(8), '上课'], [hm(9, 40), '下课'], [hm(10, 10), '上课'], [hm(11, 50), '下课'], [hm(14), '上课'], [hm(15, 40), '下课'], [hm(16, 10), '上课'], [hm(17, 50), '下课'], [hm(19), '晚自习'], [hm(21, 30), '下课']];
  const BELLS_SUMMER = BELLS_WINTER.map(([t, k]) => [t >= hm(14) && t < hm(19) ? t + 30 : t, k]);
  const BELLS = BELLS_WINTER;
  // 夏令时 from 5月6日 through 10月8日 (dates from the 校办 holiday notices); month 1-12
  function bellSchedule(month, day) { const md = month * 100 + day; return md >= 506 && md <= 1008 ? 'summer' : 'winter'; }
  // bells whose time lies in (a, b] (absolute game minutes, may span days)
  function bellsBetween(a, b, sched) {
    const out = []; if (!(b > a) || b - a > 1440 * 2) return out; const L = sched === 'summer' ? BELLS_SUMMER : BELLS_WINTER;
    for (let d = Math.floor(a / 1440); d <= Math.floor(b / 1440); d++) for (const [t, k] of L) { const at = d * 1440 + t; if (at > a && at <= b) out.push({ at, kind: k }); }
    return out;
  }
  const dayMin = m => ((m % 1440) + 1440) % 1440;
  // how busy canteens are: 1 at lunch/dinner, 0.5 at breakfast, low otherwise
  function mealCrowd(minutes) { const t = dayMin(minutes);
    if (t >= hm(11, 30) && t < hm(13)) return 1; if (t >= hm(17, 30) && t < hm(19)) return 1; if (t >= hm(6, 50) && t < hm(8)) return 0.5; return 0.15; }
  // where students tend to head right now
  function npcGoal(minutes) { const t = dayMin(minutes);
    if (t < hm(6, 30)) return 'dorm'; if (t < hm(7, 30)) return 'canteen'; if (t < hm(11, 30)) return 'teach'; if (t < hm(13)) return 'canteen';
    if (t < hm(14)) return 'dorm'; if (t < hm(17, 30)) return 'teach'; if (t < hm(19)) return 'canteen'; if (t < hm(21, 30)) return 'library'; return 'dorm'; }
  // share of students still outdoors (late night the campus empties out)
  function outdoorShare(minutes) { const t = dayMin(minutes); if (t >= hm(23, 30) || t < hm(5, 30)) return 0.12; if (t >= hm(22, 30)) return 0.4; if (t < hm(6, 30)) return 0.5; return 1; }
  // fraction of windows lit by building kind and time (evening dorms brightest, 23:00 熄灯)
  function litFraction(kind, minutes) { const t = dayMin(minutes), between = (a, b) => t >= a && t < b;
    switch (kind) {
      case 'dorm': if (between(hm(18), hm(23))) return 0.55 + 0.3 * Math.min(1, (t - hm(18)) / 120); if (between(hm(23), hm(23, 30))) return 0.25; if (between(hm(6), hm(7, 30))) return 0.35; return between(hm(7, 30), hm(18)) ? 0.06 : 0.07;
      case 'res': if (between(hm(17, 30), hm(23, 30))) return 0.6; if (between(hm(6), hm(7, 30))) return 0.3; return 0.06;
      case 'teach': case 'main': case 'dehuai': if (between(hm(7), hm(17))) return 0.3; if (between(hm(17), hm(21, 30))) return 0.55; if (between(hm(21, 30), hm(22, 30))) return 0.18; return 0.03;
      case 'library': if (between(hm(8), hm(22, 30))) return 0.8; return 0.05;
      case 'canteen': if (between(hm(6, 30), hm(20, 30))) return 0.85; return 0.06;
      case 'gym': if (between(hm(16), hm(21, 30))) return 0.7; return 0.03;
      default: if (between(hm(17), hm(21))) return 0.35; return 0.04;
    }
  }
  // quests (任务)
  const SUMMIT = { x: 126, y: 176, r: 9, name: '二龙山长廊' };
  const QUESTS = [
    { id: 'class', text: '去 12号楼 302 上高数课', where: '12号楼 · 鸿学楼 三层右边的 302 教室，坐下做 3 道高数小测', done: '坐进 302 —— 今天高数讲洛必达法则，笔记记满一页！' },
    { id: 'noodle', text: '去食味坊吃老大同刀削面', where: '食味坊一层左侧「老大同刀削面」窗口，按 E 买饭', done: '一碗老大同刀削面，多加醋——地道！' },
    { id: 'hill', text: '爬上二龙山看校园', where: '西北角二龙山顶的长廊', done: '站在二龙山长廊上，整个校园尽收眼底。' },
    { id: 'stacks', text: '去图书馆二层书库借一本书', where: '图书馆阅览室右上角楼梯上二层，按 E 借书', done: '借到一本《兵器发展史》，还书日期：30 天后。' },
  ];
  const STATUE = { x: 242.5, y: 469.5, r: 5 };
  // phase 4: the wider pool; day 1 is always the classic four (QUESTS), later days draw 12号楼 class + 3 others
  const QUEST_POOL = QUESTS.concat([
    { id: 'xiaochao', text: '去食堂二楼吃一份过油肉', where: '田园餐厅或龙山餐厅走楼梯上二楼，「过油肉」窗口按 E', done: '过油肉滑嫩，配一碗米饭，太原味儿！' },
    { id: 'statue', text: '去彭德怀雕像前打卡', where: '南门内德怀楼前广场', done: '在彭德怀元帅铜像前拍了张照，发了朋友圈。' },
    { id: 'gym', text: '去羽毛球馆打一会儿羽毛球', where: '羽毛球馆（主楼西侧，大操场东北角）', done: '杀球下网两次，最后一局赢了，出了一身汗。' },
    { id: 'history', text: '去主楼二层看校史展', where: '主楼大厅左上角楼梯上二层', done: '从太行山走来的兵工学校 —— 校史展廊看完了。' },
    { id: 'curfew', text: '熄灯前（23:00）回到宿舍', where: '21:00 以后进任一公寓楼', done: '赶在熄灯前回到宿舍，洗漱完毕，晚安。' },
  ]);
  function questsForDay(day) {
    day = Math.max(0, day | 0); if (day === 0) return QUESTS.slice();
    const rest = QUEST_POOL.filter(q => q.id !== 'class').map((q, i) => [hash2(day * 13 + 1, i * 7 + 3), q]).sort((a, b) => a[0] - b[0]).map(a => a[1]);
    return [QUEST_POOL[0]].concat(rest.slice(0, 3));
  }
  // 12号楼 302 高数小测：3 道选择题（a = 正确选项下标）
  const QUIZ_BANK = [
    { q: 'lim(x→0) sin x / x = ?', o: ['0', '1', '∞', '不存在'], a: 1 },
    { q: '(x²)′ = ?', o: ['x', '2x', 'x³/3', '2'], a: 1 },
    { q: '∫ 2x dx = ?', o: ['2 + C', 'x + C', 'x² + C', '2x² + C'], a: 2 },
    { q: 'lim(x→0) (1+x)^(1/x) = ?', o: ['1', '0', '∞', 'e'], a: 3 },
    { q: '(sin x)′ = ?', o: ['cos x', '−cos x', '−sin x', 'tan x'], a: 0 },
    { q: '(eˣ)′ = ?', o: ['x·eˣ⁻¹', 'eˣ', 'ln x', '1'], a: 1 },
    { q: '∫₀¹ x dx = ?', o: ['1', '0', '1/2', '2'], a: 2 },
    { q: '(ln x)′ = ?（x > 0）', o: ['1/x', 'x', 'eˣ', 'ln x / x'], a: 0 },
    { q: '洛必达法则直接适用于哪种极限？', o: ['1/0 型', '0/0 或 ∞/∞ 型', '0·1 型', '任何极限'], a: 1 },
    { q: 'f(x) = x³，f′(0) = ?', o: ['0', '1', '3', '不存在'], a: 0 },
  ];
  function quizForDay(day) { const idx = QUIZ_BANK.map((q, i) => [hash2((day | 0) * 5 + 2, i * 3 + 1), i]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(a => a[1]); return idx.map(i => QUIZ_BANK[i]); }
  const QUIZ_PASS = 2; // 答对 2/3 就算下课
  function inClassSeat(ctx) { return ctx.key === 'classroom' && /12号楼/.test(ctx.name || '') && ctx.x > 15 && ctx.y > 3 && ctx.y < 11.5; }
  function questsNew(day) { return { done: {}, day: day == null ? null : day, log: [] }; }
  // new day: log yesterday's result (第 N 天 x/y) and clear today's ticks; returns the log entry or null
  function questsRoll(q, day) {
    if (q.day == null) { q.day = day; return null; } if (day <= q.day) return null;
    const list = questsForDay(q.day), ids = list.filter(t => q.done[t.id] != null).map(t => t.id), e = { d: q.day + 1, n: ids.length, t: list.length, ids };
    q.log = (q.log || []).concat([e]).slice(-60); q.done = {}; q.day = day; return e;
  }
  // ctx: { mode:'out'|'in', key, name (building), x, y, action:'eat'|'borrow'|null }
  function questCheck(q, ctx, minutes, today) {
    const out = [], hit = id => { if (!q.done[id]) { q.done[id] = Math.floor(minutes || 0); out.push(id); } };
    if (ctx.mode === 'in') {
      if (ctx.key === 'classroom' && /12号楼/.test(ctx.name || '') && ctx.action === 'quiz') hit('class'); // 302 高数 quiz finished
      if (ctx.key === 'canteen' && ctx.action === 'eat' && /食味坊|二食堂/.test(ctx.name || '') && ctx.dish === '刀削面') hit('noodle'); // v7.6.4: 老大同刀削面 is a 食味坊 window (nuc.edu.cn/info/1014/32514.htm)
      if (ctx.key === 'library2' && ctx.action === 'borrow') hit('stacks');
      if (ctx.key === 'canteen2' && ctx.action === 'eat' && ctx.dish === '过油肉') hit('xiaochao');
      if (ctx.key === 'gym') hit('gym');
      if (ctx.key === 'main2') hit('history');
      if (ctx.key === 'dorm') { const t = dayMin(minutes || 0); if (t >= hm(21) && t < LIGHTS_OUT) hit('curfew'); }
    } else { if (Math.hypot(ctx.x - SUMMIT.x, ctx.y - SUMMIT.y) < SUMMIT.r) hit('hill'); if (Math.hypot(ctx.x - STATUE.x, ctx.y - STATUE.y) < STATUE.r) hit('statue'); }
    if (today) for (let i = out.length - 1; i >= 0; i--) if (!today.some(t => t.id === out[i])) { delete q.done[out[i]]; out.splice(i, 1); } // only today's quests count
    return out;
  }
  // save game (localStorage payload)
  const SAVE_VERSION = 3;
  function saveSerialize(st) {
    const r2 = v => Math.round(v * 100) / 100;
    return JSON.stringify({ v: SAVE_VERSION, x: r2(st.x), y: r2(st.y), minutes: Math.floor(st.minutes), zoom: st.zoom, muted: !!st.muted, inside: st.inside || null, season: st.season || null, weather: st.weather || null, quests: { done: { ...(st.quests && st.quests.done) }, day: st.quests && st.quests.day != null ? st.quests.day : null, log: (st.quests && st.quests.log || []).slice(-60) }, savedAt: st.savedAt || 0 });
  }
  function saveParse(str, meta) {
    let o; try { o = JSON.parse(str); } catch (e) { return null; }
    if (!o || o.v !== SAVE_VERSION) return null;
    const fin = v => typeof v === 'number' && isFinite(v);
    if (!fin(o.x) || !fin(o.y) || !fin(o.minutes) || o.minutes < 0) return null;
    if (meta && (o.x < 0 || o.y < 0 || o.x >= meta.w || o.y >= meta.h)) return null;
    const ids = new Set(QUEST_POOL.map(q => q.id)), done = {};
    for (const [k, v] of Object.entries((o.quests && o.quests.done) || {})) if (ids.has(k) && fin(v)) done[k] = v;
    const zoom = [0.25, 0.5, 1, 2, 3, 4].includes(o.zoom) ? o.zoom : 2;
    const inside = o.inside && typeof o.inside.key === 'string' && typeof o.inside.from === 'string' ? { key: o.inside.key, from: o.inside.from, x: fin(o.inside.x) ? o.inside.x : null, y: fin(o.inside.y) ? o.inside.y : null } : null;
    return { x: o.x, y: o.y, minutes: o.minutes, zoom, muted: !!o.muted, inside, season: SEASONS.includes(o.season) ? o.season : null, weather: WEATHERS.includes(o.weather) ? o.weather : null, quests: { done, day: o.quests && fin(o.quests.day) && o.quests.day >= 0 ? o.quests.day : null, log: (o.quests && Array.isArray(o.quests.log) ? o.quests.log : []).filter(e => e && fin(e.d) && fin(e.n) && fin(e.t)).slice(-60).map(e => ({ d: e.d, n: e.n, t: e.t, ids: Array.isArray(e.ids) ? e.ids.filter(i => ids.has(i)) : [] })) }, savedAt: o.savedAt || 0 };
  }
  const ZOOMS = [0.25, 0.5, 1, 2, 3, 4];
  function zoomStep(z, dir) { let i = ZOOMS.indexOf(z); if (i < 0) i = ZOOMS.findIndex(v => v >= z); if (i < 0) i = ZOOMS.length - 1; return ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + dir))]; }
  // street lamps: sparse lattice along road edges + rings on plazas; keep doors clear and lamps apart
  function placeLamps(ground, meta, buildings) {
    const sub = meta.sub, gw = meta.w * sub, out = [], grid = new Map();
    const cls = (tx, ty) => ground[(Math.floor(ty * sub) + 2) * gw + Math.floor(tx * sub) + 2];
    const doors = (buildings || []).map(b => b.door);
    const ok = (x, y, minD) => { for (const d of doors) if (Math.abs(d[0] - x) < 3.5 && Math.abs(d[1] - y) < 3.5) return false;
      const gx = Math.floor(x / 8), gy = Math.floor(y / 8);
      for (let j = gy - 1; j <= gy + 1; j++) for (let i = gx - 1; i <= gx + 1; i++) for (const l of grid.get(i + ',' + j) || []) if (Math.hypot(l.x - x, l.y - y) < minD) return false; return true; };
    const add = (x, y, kind) => { const l = { x, y, kind }; out.push(l); const k = Math.floor(x / 8) + ',' + Math.floor(y / 8); (grid.get(k) || grid.set(k, []).get(k)).push(l); };
    const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // v7.2: plazas listed in meta.openPlazas (北门广场) stay open: no inner grid, rim lamps ~16 tiles apart
    const inOpen = (x, y) => (meta.openPlazas || []).some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);
    // plaza rims first (主楼 / 行知广场 / 德怀广场 ...): every ~5 tiles
    for (let ty = 2; ty < meta.h - 2; ty++) for (let tx = 2; tx < meta.w - 2; tx++) {
      if (cls(tx, ty) !== C.PLAZA) continue; let rim = false;
      for (const [dx, dy] of N4) { const c = cls(tx + dx, ty + dy); if (c !== C.PLAZA && c !== C.BUILDING && c !== C.STEPS) rim = true; }
      if (rim && ok(tx + 0.5, ty + 0.8, inOpen(tx, ty) ? 16 : 5)) add(tx + 0.5, ty + 0.8, 'plaza');
    }
    // big open plazas (主楼前行知广场 etc.) also get an inner grid of lamps, every ~10 tiles
    for (let ty = 4; ty < meta.h - 4; ty += 9) for (let tx = 4; tx < meta.w - 4; tx += 10) {
      let all = true; for (let dy = -3; dy <= 3 && all; dy++) for (let dx = -3; dx <= 3; dx++) if (cls(tx + dx, ty + dy) !== C.PLAZA) { all = false; break; }
      if (all && !inOpen(tx, ty) && ok(tx + 0.5, ty + 0.8, 7)) add(tx + 0.5, ty + 0.8, 'plaza');
    }
    // road edges: path / apron / grass cells beside a road, every ~7 tiles
    for (let ty = 2; ty < meta.h - 2; ty++) for (let tx = 2; tx < meta.w - 2; tx++) {
      const c = cls(tx, ty); if (c !== C.PATH && c !== C.APRON && c !== C.GRASS) continue;
      let road = 0; for (const [dx, dy] of N4) if (cls(tx + dx, ty + dy) === C.ROAD) road++;
      if (road && ok(tx + 0.5, ty + 0.8, c === C.PATH ? 7 : 8)) add(tx + 0.5, ty + 0.8, 'road');
    }
    return out;
  }
  // ---------- phase 4: seasons & weather ----------
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'], SEASON_ZH = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
  const WEATHERS = ['clear', 'rain', 'snow'], WEATHER_ZH = { clear: '晴', rain: '雨', snow: '雪' };
  // by real calendar month (0-11): Mar–May spring, Jun–Aug summer, Sep–Nov autumn (银杏黄), Dec–Feb winter
  function seasonOf(month) { const m = ((month % 12) + 12) % 12; return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; }
  // deterministic weather per game day: Taiyuan is dry — rain is the exception, winter days sometimes snow
  function weatherFor(season, day) { const r = hash2((day | 0) * 7 + 3, SEASONS.indexOf(season) * 11 + 5);
    if (season === 'winter') return r < 0.35 ? 'snow' : 'clear'; return r < (season === 'summer' ? 0.3 : 0.2) ? 'rain' : 'clear'; }
  // pinch-to-zoom: ratio of finger spread since the last step -> zoom step (+1 in, -1 out, 0 none)
  // 宿舍熄灯: lights out at 23:00 (approximate, typical for 太原 campuses), back on at 06:30; 0..1 darkness, 5-min fade
  const LIGHTS_OUT = hm(23), LIGHTS_ON = hm(6, 30);
  function dormDark(minutes) { const t = dayMin(minutes); if (t >= LIGHTS_OUT || t < LIGHTS_ON) return 1; if (t >= LIGHTS_OUT - 5) return (t - (LIGHTS_OUT - 5)) / 5; return 0; }
  function pinchStep(d0, d1) { if (!(d0 > 0)) return 0; const r = d1 / d0; return r > 1.3 ? 1 : r < 0.77 ? -1 : 0; }
  // v7.6.4 NPC distribution. npcAlloc: split n people over weights (largest remainder), at least 1 each when n allows.
  function npcAlloc(n, weights, min1) {
    const k = weights.length; if (!k || n <= 0) return weights.map(() => 0);
    const base = min1 && n >= k ? 1 : 0, rest = n - base * k, W = weights.reduce((a, b) => a + b, 0) || 1;
    const raw = weights.map(w => rest * w / W), out = raw.map(r => base + Math.floor(r));
    let left = n - out.reduce((a, b) => a + b, 0); const ord = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
    for (let j = 0; left > 0; j = (j + 1) % k, left--) out[ord[j][1]]++;
    return out;
  }
  const polyArea = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  const npcKind = b => b.special === 'main' || b.special === 'dehuai' || b.enter === 'classroom' ? 'teach' : b.k;
  // npcPlan: one entry per NPC for the current goal. Destination people are spread over EVERY building of the goal
  // kind (teaching buildings weighted by footprint, every dorm >= 1); a share wanders between road / plaza spots.
  // Visible walkers start 5..24 tiles out on the approach (not bunched at the door); people only vanish into a door (despawn on arrival), never in the open.
  // opts: { n, goal, share, buildings, rnd, spotNear(x, y, r0, r1) -> [x, y] | null, wanderSpot() -> [x, y] | null }
  function npcPlan(o) {
    const goal = o.goal, rnd = o.rnd, share = o.share == null ? 1 : o.share;
    const hideP = goal === 'dorm' ? Math.max(0.3, 1 - share) : goal === 'teach' ? 0.3 : goal === 'canteen' ? 0.25 : 0.3;
    const wanderP = goal === 'dorm' ? (share < 0.5 ? 0.06 : 0.14) : 0.22, nW = Math.round(o.n * wanderP), nD = o.n - nW;
    const of = kind => o.buildings.filter(b => b.door && npcKind(b) === kind);
    let groups = goal === 'library' ? [[of('library'), Math.round(nD * 0.45)], [of('teach'), nD - Math.round(nD * 0.45)]] : [[of(goal), nD]];
    const plan = [];
    for (const [bl, cnt] of groups) {
      const w = bl.map(b => goal === 'teach' || goal === 'library' ? polyArea(b.poly) : Math.sqrt(polyArea(b.poly)) + 4);
      npcAlloc(cnt, w, true).forEach((c, i) => { for (let j = 0; j < c; j++) plan.push({ b: bl[i] }); });
    }
    for (const e of plan) {
      const b = e.b, d = [b.door[0], b.door[1] + 1.2], enter = !!b.door; // every building here has a drawn door; nobody vanishes in the open
      e.tgt = { x: d[0], y: d[1], b }; e.willHide = enter && rnd() < hideP;
      e.hidden = e.willHide && rnd() < 0.8;
      const sp = e.hidden ? null : o.spotNear(d[0], d[1], 5, 24); e.pos = e.hidden ? d : sp || o.spotNear(d[0], d[1], 3, 30) || d;
      if (!enter && !e.hidden && rnd() < 0.5) e.linger = true; // non-enterable buildings: people mill about nearby
    }
    for (let j = 0, nw = o.n - plan.length; j < nw; j++) { const a = o.wanderSpot(), t = o.wanderSpot(); if (!a) continue; plan.push({ wander: true, pos: a, tgt: { x: (t || a)[0], y: (t || a)[1], b: null }, willHide: false, hidden: false }); }
    // stable shuffle so the same NPC index does not always get the same role
    for (let i = plan.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [plan[i], plan[j]] = [plan[j], plan[i]]; }
    return plan;
  }
  const cycle = (list, v) => list[(list.indexOf(v) + 1) % list.length];
  // far-zoom draw order: by base y (tiles); a building wins ties so people at its very edge stay visible in front
  function farSort(items) { return items.slice().sort((a, b) => a.y - b.y || (a.sp ? 0 : 1) - (b.sp ? 0 : 1)); }
  return { npcAlloc, npcPlan, npcKind, polyArea, WALL, LIGHTS_OUT, LIGHTS_ON, dormDark, pinchStep, SEASONS, SEASON_ZH, WEATHERS, WEATHER_ZH, seasonOf, weatherFor, cycle, farSort, BELLS, BELLS_WINTER, BELLS_SUMMER, bellSchedule, bellsBetween, mealCrowd, npcGoal, outdoorShare, litFraction, QUIZ_BANK, quizForDay, QUIZ_PASS, inClassSeat, SUMMIT, STATUE, QUESTS, QUEST_POOL, questsForDay, questsRoll, questsNew, questCheck, SAVE_VERSION, saveSerialize, saveParse, ZOOMS, zoomStep, placeLamps, stairArrival, stairLift, STAIR_RISE, CLASS_NAMES, C, BLOCKING, PAVED, hash2, mulberry, project, buildCollision, blockedAt, rectBlocked, moveBox, RAMP_DIRS, UPHILL_SLOW, UPHILL_SLOW_LONG, terrainAt, slopeFactor, interiorGrid, findChar, nearestBuilding, npcVariant, behindAlpha, BEHIND_ALPHA, FENCE_BACK, fenceRects, wallRects, roofShadow, oblique, OBL, taper, inPoly, shadowKeep, SHADOW_OPEN, FADE_ALPHA, FADE_RATE, fadeStep, fadeAlpha, alphaMask, passageAt, wallHeight, clockText, nightness, SOLID_INTERIOR };
});

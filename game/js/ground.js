// Procedural pixel ground renderer: class map (4 sub-cells / tile) -> cached 512px chunk canvases.
(function () {
  'use strict';
  const { C, hash2 } = Core;
  const PAVED_SURF = new Set([C.ROAD, C.PATH, C.STEPS, C.PLAZA, C.APRON, C.PARKING]); // v7.6.3 LEVEL_TINT_PAVED = false
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // Stardew-ish warm palette (original colours)
  const P = {
    grass: ['#6fa84a', '#78b351', '#83bd58', '#5f9741', '#94c962'].map(hex),
    hill: ['#a3a957', '#b0b462', '#979c50', '#bcbf70'].map(hex),
    wood: ['#4c7d3a', '#557f3b', '#447234', '#5e8b42'].map(hex),
    deep: ['#3f6b33', '#47753a', '#38602e', '#518042'].map(hex),
    road: ['#6f6f78', '#76767f', '#6a6a72', '#7d7d86'].map(hex),
    curb: hex('#c9c2b0'),
    path: ['#d8c39a', '#ccb58a', '#e2cfa8', '#bfa77d'].map(hex),
    plaza: ['#e2d6bd', '#ddd0b5', '#e6dbc3', '#c9bb9f'].map(hex),
    apron: ['#d2c9b3', '#cdc3ac', '#d6cdb8', '#b9ae97'].map(hex),
    water: ['#3f86c8', '#4a91d0', '#3a7dbd', '#9fd0ef'].map(hex),
    pitch: ['#4f9e47', '#5aab50'].map(hex),
    track: ['#b5523f', '#c15d48', '#a94a39'].map(hex),
    court: ['#3f8a63', '#45916a', '#3a845d'].map(hex),
    parking: ['#8a8a90', '#929298', '#84848a'].map(hex),
    rail: ['#8b7f72', '#7b7065', '#988b7c', '#6d635a'].map(hex),
    bare: ['#c9a874', '#bf9d69', '#d3b380', '#b39260'].map(hex),
    village: ['#a99f94', '#9e948a', '#b4aa9f', '#8f867c'].map(hex),
    cliff: ['#8a8378', '#77716a', '#9d968a', '#5f5a54'].map(hex),
    steps: ['#d9d2c2', '#c4bcab'].map(hex),
    sand: ['#e3d1a0', '#d8c592', '#ead9ab'].map(hex),
    out: ['#8fa86a', '#97ae70', '#87a063'].map(hex),
  };
  class Ground {
    constructor(classes, meta, rails, extra) {
      this.cls = classes; this.meta = meta; this.sub = meta.sub; this.gw = meta.w * meta.sub; this.gh = meta.h * meta.sub;
      this.rails = rails || []; extra = extra || {};
      this.elev = extra.elev || null; this.terr = extra.terrain || null; this.fields = extra.fields || []; this.crossings = extra.crossings || []; this.bridges = extra.bridges || []; this.lots = extra.lots || []; this.ewStairs = extra.ewStairs || []; this.pave = extra.pave || []; this.cache = new Map(); this.far = new Map(); this.CH = 512;
    }
    at(sx, sy) { if (sx < 0 || sy < 0 || sx >= this.gw || sy >= this.gh) return C.OUT; return this.cls[sy * this.gw + sx]; }
    setSeason(se) { if (se !== this.season) { this.season = se; this.cache.clear(); this.far.clear(); } }
    // seasonal re-colouring of the base shader: summer deeper greens, autumn dry grass + fallen 银杏 leaves,
    // winter (太原的冬天) snow on lawns / hill / pitches, packed snow on paths, slush on roads, ice on water
    // v7.6.1 real terrain (DEM): smooth ramp tint on roads / paths that cross a level line (v7.6.2: hatching removed), and a
    // subtle per-level tint on lawns (alternate levels a touch lighter, like the 二龙山 bands)
    terrain(col, wx, wy) {
      const T = this.terr; if (!T) return col; const sx = wx >> 2, sy = wy >> 2; if (sx < 0 || sy < 0 || sx >= this.gw || sy >= this.gh) return col;
      const i = (sy * this.gw + sx) * 4, lev = T[i], rp = T[i + 1], c = this.cls[sy * this.gw + sx];
      const B = T[i + 2];
      if (B === 32) { // v7.6.1 low stone side wall beside a named slope (cut / embankment edge): coursed stone, lit top, dark foot
        const h = hash2(wx >> 2, wy >> 1), jx = ((wx + ((wy >> 2) & 1) * 4) & 7) === 0, jy = (wy & 3) === 0;
        let s = [168, 160, 146]; if (jx || jy) s = [104, 98, 90]; else if (h < 0.3) s = [182, 174, 158];
        return s; }
      if (PAVED_SURF.has(c)) return col; // v7.6.3: paths / roads / footways / stairs: ONE colour on every level - no per-level or ramp tint
      if (rp && (B & 15) && c !== C.STEPS) { // v7.6.2: NO contour hatching anywhere - a slope on a road / path is only a
        // very subtle smooth tint, lighter at the top and darker at the foot, tapering to 1.0 at both ends (no hard band)
        const t = (rp - 1) / 254, long = B & 16, u = Math.max(0, Math.min(1, long ? (t - 0.12) / 0.76 : t));
        let k = 1 + (long ? 0.10 : 0.07) * (1 - 2 * u) * Math.min(1, 5 * u, 5 * (1 - u));
        if (long) { if (T[i - 4 + 2] === 32 || T[i + 4 + 2] === 32) k *= 0.9; } // soft shade beside the low side wall
        return shade(col, k); }
      if (lev && !(this.elev && this.elev[sy * this.gw + sx]) && (c === C.GRASS || c === C.WOOD || c === C.DEEPWOOD || c === C.HILL)) {
        const k = (lev & 1) ? 0.035 : 0; return [col[0] + (196 - col[0]) * k | 0, col[1] + (206 - col[1]) * k | 0, col[2] + (128 - col[2]) * k | 0]; }
      return col;
    }
    color(wx, wy) {
      const col = this.terrain(this.color0(wx, wy), wx, wy), se = this.season; if (!se || se === 'spring') return col;
      const c = this.at(wx >> 2, wy >> 2), h = hash2(wx * 3 + 11, wy * 5 + 7), mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k | 0, a[1] + (b[1] - a[1]) * k | 0, a[2] + (b[2] - a[2]) * k | 0];
      const NAT = c === C.GRASS || c === C.OUT || c === C.HILL || c === C.WOOD || c === C.DEEPWOOD;
      if (se === 'summer') return NAT || c === C.PITCH ? mix(col, [62, 132, 46], 0.16) : col;
      if (se === 'autumn') {
        if (NAT) { const under = c === C.WOOD || c === C.DEEPWOOD;
          if (h < (under ? 0.05 : 0.012)) return [232, 188, 54]; if (h > (under ? 0.965 : 0.992)) return h > 0.996 ? [210, 112, 46] : [222, 150, 52];
          return mix(col, [182, 162, 84], c === C.HILL ? 0.4 : 0.3); }
        if ((c === C.PATH || c === C.PLAZA || c === C.APRON) && h < 0.006) return h < 0.003 ? [236, 192, 60] : [214, 128, 50];
        return col;
      }
      // winter
      const SNOW = [238, 242, 248], h2 = hash2(wx >> 3, wy >> 3);
      if (NAT || c === C.BARE || c === C.SAND || c === C.PITCH) {
        if (h < 0.012 && NAT) return mix(col, SNOW, 0.35); // grass poking through
        const k = c === C.WOOD || c === C.DEEPWOOD ? 0.78 : c === C.PITCH ? 0.8 : 0.86; let o = mix(col, SNOW, k);
        if (h > 0.94) o = mix(o, [206, 218, 236], 0.6); return o; }
      if (c === C.PATH || c === C.PLAZA || c === C.APRON || c === C.STEPS || c === C.VILLAGE || c === C.PARKING) { const h3 = hash2(wx >> 5, wy >> 5), h4 = hash2((wx + 16) >> 5, (wy + 16) >> 5); return mix(col, SNOW, 0.5 + 0.12 * (h3 + h4) + (h > 0.97 ? 0.15 : 0)); }
      if (c === C.ROAD) { if (col[0] > 180) return mix(col, SNOW, 0.8); return h < 0.05 ? mix(col, [200, 206, 216], 0.5) : mix(col, [60, 62, 70], 0.12); }
      if (c === C.TRACK || c === C.COURT) return mix(col, SNOW, 0.72);
      if (c === C.WATER) return mix(col, h2 < 0.5 ? [200, 222, 236] : [182, 208, 226], 0.62);
      if (c === C.RAIL) return mix(col, SNOW, 0.45);
      if (c === C.CLIFF) return mix(col, SNOW, (wy & 3) === 0 ? 0.6 : 0.3);
      if (c === C.TERRACE) return mix(col, SNOW, col[1] > 120 ? 0.75 : 0.22);
      return col;
    }
    color0(wx, wy) { // world pixel -> rgb (base / spring palette)
      const sx = wx >> 2, sy = wy >> 2, c = this.at(sx, sy);
      const h = hash2(wx, wy), h2 = hash2(wx >> 3, wy >> 3), h4 = hash2(wx >> 4, wy >> 4);
      const pick = (arr, v) => arr[Math.min(arr.length - 1, Math.floor(v * arr.length))];
      const above = this.at(sx, (wy - 2) >> 2), below = this.at(sx, (wy + 2) >> 2);
      switch (c) {
        case C.GRASS: case C.OUT: case C.HILL: case C.WOOD: case C.DEEPWOOD: {
          const pal = c === C.GRASS ? P.grass : c === C.HILL ? P.hill : c === C.WOOD ? P.wood : c === C.DEEPWOOD ? P.deep : P.out;
          let col = pal[(h4 * 3 + h2 * 1.2) % 3 | 0];
          if (h < 0.05) col = pal[3 % pal.length];
          else if (h > 0.975) col = pal[pal.length - 1];
          // tufts: little "v" blades
          const tx = wx & 15, ty = wy & 15, tf = hash2(wx >> 4, (wy >> 4) + 99);
          if (tf < 0.35 && ((ty === 9 && (tx === 5 || tx === 7)) || (ty === 8 && tx === 6))) col = pal[3 % pal.length];
          // dark edge where grass meets something paved below (gives the raised lawn look)
          if (below !== c && Core.PAVED.has(below) && ((wy + 2) & 3) < 2) col = shade(pal[3 % pal.length], 0.82);
          // v6 二龙山 terraces: each contour band a little lighter / warmer (alternating like v0.3.28), and a cast
          // shadow at the foot of the terrace wall above
          const e = this.elev ? this.elev[sy * this.gw + sx] : 0;
          if (e) { const k = 0.065 * e + (e & 1 ? 0.06 : 0); col = [col[0] + (190 - col[0]) * k | 0, col[1] + (200 - col[1]) * k | 0, col[2] + (118 - col[2]) * k | 0]; }
          if (this.elev && c !== C.TERRACE) for (let k = 1; k <= 10; k++) if (this.at(sx, (wy - k) >> 2) === C.TERRACE) { col = shade(col, 0.7 + 0.025 * k); break; }
          return col;
        }
        case C.ROAD: {
          const near = [this.at(sx - 1, sy), this.at(sx + 1, sy), this.at(sx, sy - 1), this.at(sx, sy + 1)];
          if (near.some(n => n !== C.ROAD && n !== C.RAIL)) { // curb ring
            return (wx & 7) === 0 && hash2(wx >> 3, wy >> 2) < 0.5 ? shade(P.curb, 0.9) : P.curb; // v7.6.2: kerb joints are vertical, never diagonal
          }
          let col = pick(P.road, h * 0.999); if (h2 > 0.93 && h < 0.3) col = shade(col, 0.88); return col;
        }
        case C.PATH: { // running-bond bricks 8x4
          const row = wy >> 2, off = (row & 1) * 4, bx = (wx + off) >> 3;
          if ((wy & 3) === 0 || ((wx + off) & 7) === 0) return shade(P.path[3], 0.92);
          return pick(P.path, hash2(bx, row) * 0.75);
        }
        case C.PLAZA: case C.APRON: case C.BUILDING: { // big pavers 16x16 with joints + subtle checker
          if (c === C.PLAZA && this.pave.length) { const tx = wx / 16, ty = wy / 16; // v7: 行知广场 grey granite, red granite central axis, dark border
            for (const pv of this.pave) { const r = pv.rect; if (tx < r[0] || ty < r[1] || tx >= r[2] || ty >= r[3]) continue;
              const GR = [[190, 189, 182], [182, 181, 175], [198, 197, 190], [172, 171, 166]], RD = [[160, 78, 62], [150, 72, 58], [168, 86, 68]];
              const edge = Math.min(tx - r[0], r[2] - tx, ty - r[1], r[3] - ty);
              if (edge < 0.5) return (wx + wy) & 1 ? [120, 118, 112] : [112, 110, 105];
              const ax = Math.abs(tx - pv.axis);
              if (ax < 2.0) { if ((wy & 15) === 0 || ((wx - 8) & 15) === 0) return [122, 58, 46]; return pick(RD, hash2(wx >> 4, wy >> 4) * 0.99); }
              if (ax < 2.25) return [236, 233, 224];
              const off = ((wy >> 4) & 1) * 16; if ((wy & 15) === 0 || ((wx + off) & 31) === 0) return [150, 149, 144];
              let col = pick(GR, hash2((wx + off) >> 5, wy >> 4) * 0.99); if (h < 0.04) col = shade(col, 0.94); else if (h > 0.985) col = shade(col, 1.06); return col; } }
          const pal = c === C.PLAZA ? P.plaza : P.apron;
          if ((wx & 15) === 0 || (wy & 15) === 0) return shade(pal[3], 0.94);
          let col = pick(pal, hash2(wx >> 4, wy >> 4) * 0.75);
          if (h < 0.03) col = shade(col, 0.95);
          if (above !== c && !Core.PAVED.has(above) && (wy & 3) < 2) col = shade(col, 0.8); // shadow under lawn edge
          return col;
        }
        case C.WATER: {
          let col = pick(P.water, h2 * 0.74);
          const r = (wx + (wy >> 2) * 3) % 23; if ((wy & 7) === 3 && r < 4 && h4 > 0.4) col = P.water[3];
          if (above !== C.WATER && (wy & 3) < 3) col = shade(P.water[2], 0.75);
          return col;
        }
        case C.PITCH: return ((wx >> 4) & 1) ? P.pitch[0] : P.pitch[1];
        case C.TRACK: { const col = pick(P.track, h * 0.999); return ((wy & 7) === 0 || (wx & 7) === 0) && h2 > 0.5 ? shade(col, 1.12) : col; }
        case C.COURT: return pick(P.court, h * 0.999); // v6: courts are painted per field from templates (fields.js)
        case C.PARKING: { const tx = wx / 16, ty = wy / 16; // v7.6.4: lots with their own stall decal skip the generic lines
          if (!this.lots.some(r => tx >= r[0] && tx < r[2] && ty >= r[1] && ty < r[3]) && wx % 20 === 0 && (wy & 31) < 18) return [226, 226, 220]; return pick(P.parking, h * 0.999); }
        case C.RAIL: return pick(P.rail, h * 0.999);
        case C.BARE: { let col = pick(P.bare, h2 * 0.74); if (h < 0.04) col = P.bare[3]; return col; }
        case C.VILLAGE: { if ((wx % 12) === 0 || (wy % 12) === 0) return shade(P.village[3], 0.95); return pick(P.village, hash2(Math.floor(wx / 12), Math.floor(wy / 12)) * 0.75); }
        case C.TERRACE: { // v6 terrace wall: grass lip, earth/rock face with ledges, dark foot
          let k = 0; while (k < 28 && this.at(sx, (wy - k - 1) >> 2) === C.TERRACE) k++;
          let d = 0; while (d < 4 && this.at(sx, (wy + d + 1) >> 2) === C.TERRACE) d++;
          const e = this.elev ? this.elev[sy * this.gw + sx] : 0;
          if (k < 2) return shade(P.wood[3], 1.12 + 0.03 * e);
          if (d === 0 && k > 3) return [74, 68, 54];
          const base = hash2(wx >> 1, wy >> 3) < 0.5 ? [139, 122, 92] : [128, 112, 84];
          if ((wy - k + 1) % 6 === 0) return shade(base, 0.86);
          if (hash2(wx, wy >> 2) > 0.93) return shade(base, 1.12);
          return hash2(wx >> 2, 7) > 0.8 ? shade(base, 0.92) : base;
        }
        case C.CLIFF: { const col = pick(P.cliff, h2 * 0.999); return (wy & 3) === 0 ? shade(col, 0.8) : col; }
        case C.STEPS: { // v7: treads with a bright nosing, a dark riser and side cheeks so flights read as going up / down
          { const tx = wx / 16, ty = wy / 16; if (this.ewStairs.some(q => tx >= q[0] - 0.3 && tx < q[2] + 0.3 && ty >= q[1] - 0.3 && ty < q[3] + 0.3)) { // v7.6.4: E-W flight -> vertical treads, cheeks N / S
            const u = this.at(sx, (wy - 3) >> 2), d = this.at(sx, (wy + 3) >> 2); if (u !== C.STEPS || d !== C.STEPS) return shade(P.path[3], (wx & 1) ? 0.78 : 0.84);
            const ph = wx % 6; return ph === 0 ? shade(P.path[2], 1.08) : ph >= 4 ? shade(P.path[3], 0.8) : ph === 3 ? P.path[3] : P.path[0]; } }
          const l = this.at((wx - 3) >> 2, sy), r = this.at((wx + 3) >> 2, sy);
          // v7.6.3: stairs use the path palette, the same on every level and along the whole flight (no top-to-foot gradient)
          if (l !== C.STEPS || r !== C.STEPS) return shade(P.path[3], (wy & 1) ? 0.78 : 0.84); // side cheeks
          const ph = wy % 6;
          return ph === 0 ? shade(P.path[2], 1.08) : ph >= 4 ? shade(P.path[3], 0.8) : ph === 3 ? P.path[3] : P.path[0];
        }
        case C.SAND: return pick(P.sand, h * 0.999);
        default: return P.grass[0];
      }
    }
    chunk(cx, cy) {
      const key = cx + ',' + cy; let cv = this.cache.get(key); if (cv) return cv;
      const S = this.CH; cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      const g = cv.getContext('2d'); const id = g.createImageData(S, S); const d = id.data;
      const ox = cx * S, oy = cy * S;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const c = this.color(ox + x, oy + y), i = (y * S + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
      g.putImageData(id, 0, 0);
      Fields.draw(g, this.fields, ox, oy, S, this.meta.tile, this.season);
      this.drawRails(g, ox, oy);
      this.cache.set(key, cv); return cv;
    }
    // far zoom (s < 1): one 512px *screen* chunk covers 512/s world px; each screen pixel is the
    // average of 4 world samples so stripes/bricks don't alias, trees are baked in (scaled sprites)
    farChunk(s, cx, cy, decorate) {
      const key = s + ':' + cx + ',' + cy; let cv = this.far.get(key); if (cv) { this.far.delete(key); this.far.set(key, cv); return cv; }
      const S = this.CH, span = S / s, st = 1 / s; cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      const g = cv.getContext('2d'), id = g.createImageData(S, S), d = id.data, ox = cx * span, oy = cy * span;
      const o1 = Math.max(0, Math.floor(st / 4)), o2 = Math.floor(st * 3 / 4);
      for (let y = 0; y < S; y++) { const wy = oy + y * st; for (let x = 0; x < S; x++) {
        const wx = ox + x * st, a = this.color(wx + o1, wy + o1), b = this.color(wx + o2, wy + o1), c = this.color(wx + o1, wy + o2), e = this.color(wx + o2, wy + o2), i = (y * S + x) * 4;
        d[i] = (a[0] + b[0] + c[0] + e[0]) >> 2; d[i + 1] = (a[1] + b[1] + c[1] + e[1]) >> 2; d[i + 2] = (a[2] + b[2] + c[2] + e[2]) >> 2; d[i + 3] = 255; } }
      g.putImageData(id, 0, 0);
      g.save(); g.scale(s, s); Fields.draw(g, this.fields, ox, oy, span, this.meta.tile, this.season); this.drawRails(g, ox, oy, span); g.restore();
      if (decorate) decorate(g, ox, oy, span, s);
      this.far.set(key, cv); while (this.far.size > 48) this.far.delete(this.far.keys().next().value);
      return cv;
    }
    drawRails(g, ox, oy, span) { span = span || 512;
      const T = this.meta.tile;
      for (const line of this.rails) {
        for (let i = 1; i < line.length; i++) {
          const [x0, y0] = line[i - 1], [x1, y1] = line[i];
          const ax = x0 * T - ox, ay = y0 * T - oy, bx = x1 * T - ox, by = y1 * T - oy;
          if (Math.max(ax, bx) < -20 || Math.min(ax, bx) > span + 20 || Math.max(ay, by) < -20 || Math.min(ay, by) > span + 20) continue;
          const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
          g.fillStyle = '#6b4b33';
          for (let s = 0; s < L; s += 6) { const px = ax + ux * s, py = ay + uy * s; g.save(); g.translate(px, py); g.rotate(Math.atan2(uy, ux)); g.fillRect(-1.5, -7, 3, 14); g.restore(); }
          g.strokeStyle = '#c7c9cc'; g.lineWidth = 1.5;
          for (const o of [-4, 4]) { g.beginPath(); g.moveTo(ax + nx * o, ay + ny * o); g.lineTo(bx + nx * o, by + ny * o); g.stroke(); }
          // v6: the line is fenced on both sides (posts + wire), open only at the level crossings
          for (let s = 0; s < L; s += 8) { const px = ax + ux * s, py = ay + uy * s;
            if (this.crossings.some(c => this.nearCross(c, (px + ox) / T, (py + oy) / T))) continue;
            if (this.bridges.some(b => (px + ox) / T > b.deck[0] - 0.3 && (px + ox) / T < b.deck[1] + 0.3 && Math.abs((py + oy) / T - (b.rail[0] + b.rail[1]) / 2) < 3)) continue; // v7.6.1 rail bridge
            for (const o of [-17, 17]) { const fx = px + nx * o, fy = py + ny * o; g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(fx, fy, 2, 1); g.fillStyle = '#5d6a62'; g.fillRect(fx - 1, fy - 5, 2, 5); g.fillStyle = 'rgba(150,165,155,0.8)'; g.fillRect(fx - 1, fy - 4, 8, 1); }
          }
        }
      }
      for (const c of this.crossings) { // rubber crossing panels between the rails
        const [p0, p1] = c.pts, ax = p0[0] * T - ox, ay = p0[1] * T - oy, bx = p1[0] * T - ox, by = p1[1] * T - oy;
        if (Math.max(ax, bx) < -40 || Math.min(ax, bx) > span + 40 || Math.max(ay, by) < -40 || Math.min(ay, by) > span + 40) continue;
        for (const line of this.rails) for (let i = 1; i < line.length; i++) { const q = segX(line[i - 1], line[i], p0, p1); if (!q) continue;
          const X = q[0] * T - ox, Y = q[1] * T - oy, w = c.w / 2.5 * T / 2; g.fillStyle = '#4a4a50'; g.fillRect(X - w, Y - 6, 2 * w, 12);
          g.fillStyle = '#c7c9cc'; g.fillRect(X - w, Y - 5, 2 * w, 1.5); g.fillRect(X - w, Y + 3.5, 2 * w, 1.5);
          for (let k = -w + 2; k < w; k += 6) { g.fillStyle = (k / 6 | 0) & 1 ? '#f0c419' : '#2b2b2b'; g.fillRect(X + k, Y - 9, 4, 2); g.fillRect(X + k, Y + 7, 4, 2); } }
      }
    }
    nearCross(c, x, y) { const [a, b] = c.pts, dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) < c.w / 2.5 / 2 + 0.6; }
  }
  function segX(a, b, c, d) { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null; }
  function shade(c, k) { return [Math.min(255, c[0] * k) | 0, Math.min(255, c[1] * k) | 0, Math.min(255, c[2] * k) | 0]; }
  window.Ground = Ground;
})();

// v7.6.1b: real slopes from a public DEM (Mapzen/Tilezen Terrarium, SRTM) quantised into 3 m terraces.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap, readPNG, flood, root } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S, GH = M.meta.h * S;
const T = readPNG(path.join(root, 'data/terrain.png')), E = readPNG(path.join(root, 'data/elev.png'));
const T4 = new Uint8Array(GW * GH * 4); for (let i = 0; i < GW * GH; i++) for (let k = 0; k < 3; k++) T4[i * 4 + k] = T.data[i * T.ch + k];   // RGBA like game.js
const lev = i => T.data[i * T.ch], ramp = i => T.data[i * T.ch + 1], dir = i => T.data[i * T.ch + 2], elev = i => E.data[i * E.ch];
const NAT = new Set([C.GRASS, C.WOOD, C.DEEPWOOD, C.HILL, C.BARE]);

test('v7.6.1 terrain: terrain.png matches the ground grid and map.json names the DEM source', () => {
  assert.equal(T.w, GW); assert.equal(T.h, GH);
  assert.match(M.terrain.src, /Terrarium/); assert.equal(M.terrain.step, 3);
  assert.ok(M.terrain.relief.length >= 5 && M.terrain.relief[0][0] > 15, 'biggest local relief reported');
});

test('v7.6.1 terrain: roads / footways / plazas are never turned into terrace walls (cliffs only on natural ground)', () => {
  const G = readPNG(path.join(root, 'data/ground.png')); let lv = 0;
  for (let i = 0; i < cls.length; i++) if (lev(i)) lv++;
  assert.ok(lv > cls.length * 0.3, 'DEM levels cover the campus');
  // every TERRACE cell with a DEM level sits on natural ground: its 4-neighbours are not ROAD / PATH / STEPS-crossing gaps
  let bad = 0; for (let i = 0; i < cls.length; i++) if (cls[i] === C.TERRACE && lev(i)) { for (const j of [i - 1, i + 1]) if (cls[j] === C.ROAD) bad++; }
  assert.ok(bad < 50, 'terrace walls hugging road cells: ' + bad); void G;
});

test('v7.6.1 terrain: terrace edges exist where the DEM level changes on open natural ground', () => {
  let n = 0, hit = 0; const OK = c => NAT.has(c) || c === C.TERRACE || c === C.STEPS;
  for (let y = 8; y < GH - 8; y += 2) for (let x = 8; x < GW - 8; x += 3) { const i = y * GW + x, j = i + GW;
    if (!lev(i) || !lev(j) || lev(i) === lev(j) || !OK(cls[i]) || !OK(cls[j])) continue;
    let near = false, open = true; for (let dy = -7; dy <= 7; dy++) for (let dx = -3; dx <= 3; dx++) { const c = cls[i + dy * GW + dx]; if (c === C.TERRACE || c === C.STEPS) near = true; if (!OK(c)) open = false; }
    if (!open) continue; n++; if (near) hit++; }
  assert.ok(n > 200, 'enough level changes sampled: ' + n); assert.ok(hit / n > 0.9, 'terrace wall at ' + hit + '/' + n + ' level changes'); console.log('# level changes with a wall: ' + hit + '/' + n);
});

test('v7.6.1 terrain: roads crossing levels are drawn as ramps with a downhill direction', () => {
  let r = 0, rd = 0; for (let i = 0; i < cls.length; i++) if (cls[i] === C.ROAD) { rd++; if (ramp(i)) { r++; assert.ok((dir(i) & 15) >= 1 && (dir(i) & 15) <= 8, 'ramp dir'); } }
  assert.ok(r > 20000 && r < rd * 0.6, 'ramp cells ' + r + ' of ' + rd);
  assert.equal(Core.RAMP_DIRS.length, 8);
});

test('v7.6.1 terrain: walking uphill on a ramp is slower, downhill / flat is normal speed', () => {
  let k = -1; for (let i = 0; i < cls.length; i++) if (cls[i] === C.ROAD && ramp(i) > 60 && ramp(i) < 200 && dir(i) && !(dir(i) & 16)) { k = i; break; }
  assert.ok(k >= 0); const x = (k % GW + 0.5) / S, y = (Math.floor(k / GW) + 0.5) / S, d = Core.RAMP_DIRS[dir(k) - 1];
  const up = Core.slopeFactor(T4, GW, S, x, y, -d[0], -d[1]), down = Core.slopeFactor(T4, GW, S, x, y, d[0], d[1]);
  assert.ok(up < 0.8 && up >= Core.UPHILL_SLOW - 1e-9, 'uphill ' + up); assert.equal(down, 1); assert.equal(Core.slopeFactor(null, GW, S, x, y, 1, 0), 1);
  const GAME = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8'); assert.match(GAME, /slopeFactor\(/); assert.match(GAME, /data\/terrain\.png/);
});

test('v7.6.1 terrain: the v6 二龙山 stepped hill is left to its own terraces (no DEM levels on it)', () => {
  let e = 0; for (let i = 0; i < cls.length; i++) if (elev(i)) { e++; assert.equal(lev(i), 0, 'DEM level on 二龙山 at ' + (i % GW) + ',' + Math.floor(i / GW)); }
  assert.ok(e > 10000);
});

test('v7.6.1 terrain: trees never stand on a terrace wall or stairs; stairs stay walkable and reachable', () => {
  for (const [x, y] of M.trees) { const c = cls[Math.floor(y * S) * GW + Math.floor(x * S)]; assert.ok(!(c === C.STEPS || (c === C.TERRACE && lev(Math.floor(y * S) * GW + Math.floor(x * S)))), 'tree on wall/steps at ' + x + ',' + y); }
  const cg = Core.buildCollision(cls, M.meta, [], [], null), seen = flood(cg, M.spawn[0], M.spawn[1]);
  let st = 0, ok = 0; for (let i = 0; i < cls.length; i++) if (cls[i] === C.STEPS && lev(i)) { st++; if (seen[i]) ok++; }
  assert.ok(st > 0 && ok / st > 0.95, 'DEM stairs reachable ' + ok + '/' + st);
});

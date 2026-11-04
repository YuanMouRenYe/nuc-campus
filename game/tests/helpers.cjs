// Minimal PNG decoder (8-bit greyscale / RGB / RGBA, non-interlaced) so tests need no dependencies.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
function readPNG(file) {
  const b = fs.readFileSync(file); let p = 8, w, h, ct, idat = [];
  while (p < b.length) { const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12]) throw new Error('unsupported png'); }
    if (type === 'IDAT') idat.push(d); p += 12 + len; }
  const ch = { 0: 1, 2: 3, 6: 4, 4: 2 }[ct], raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * ch), stride = w * ch;
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) { const a = x >= ch ? out[y * stride + x - ch] : 0, up = y ? out[(y - 1) * stride + x] : 0, c = (y && x >= ch) ? out[(y - 1) * stride + x - ch] : 0; let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : pb <= pc ? up : c; }
      out[y * stride + x] = v & 255; } }
  return { w, h, ch, data: out };
}
const root = path.join(__dirname, '..');
function loadMap() {
  const M = JSON.parse(fs.readFileSync(path.join(root, 'data/map.json'), 'utf8'));
  const g = readPNG(path.join(root, 'data/ground.png'));
  const cls = new Uint8Array(g.w * g.h); for (let i = 0; i < cls.length; i++) cls[i] = g.data[i * g.ch];
  return { M, g, cls };
}
// BFS over the collision grid (sub-cell resolution) from a tile position; returns a visited bitmap.
function flood(cg, sx, sy) {
  const s = cg.sub, W = cg.gw, H = cg.gh, seen = new Uint8Array(W * H), q = new Int32Array(W * H); let h = 0, t = 0;
  const st = Math.floor(sy * s) * W + Math.floor(sx * s); if (cg.col[st]) return seen; seen[st] = 1; q[t++] = st;
  while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && !cg.col[j]) { seen[j] = 1; q[t++] = j; } } }
  return seen;
}
module.exports = { readPNG, loadMap, flood, root };

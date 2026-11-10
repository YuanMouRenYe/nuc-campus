// 地图发布共用库：解码编辑器导出 → 校验 → PNG 编码 → 写盘（带备份）。无第三方依赖。
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ME = require(path.join(__dirname, '../game/js/mapedit_core.js'));

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, ch, px) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = ch === 1 ? 0 : 2;
  const stride = w * ch, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(px.buffer, px.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 从已 decode 的 {map,ground,terr} 生成要写的文件 Buffer 字典 */
function buildFiles(decoded) {
  const m = decoded.map.meta, W = m.w * m.sub, H = m.h * m.sub;
  const files = {
    'map.json': Buffer.from(JSON.stringify(decoded.map)),
    'ground.png': encodePNG(W, H, 1, Buffer.from(decoded.ground)),
  };
  if (decoded.terr) {
    const rgb = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      rgb[i * 3] = decoded.terr[i * 4];
      rgb[i * 3 + 1] = decoded.terr[i * 4 + 1];
      rgb[i * 3 + 2] = decoded.terr[i * 4 + 2];
    }
    files['terrain.png'] = encodePNG(W, H, 3, rgb);
  }
  return { files, W, H };
}

async function decodeExport(jsonTextOrObj) {
  return ME.decode(typeof jsonTextOrObj === 'string' ? jsonTextOrObj : JSON.stringify(jsonTextOrObj));
}

function validateDecoded(decoded) {
  return ME.validate(decoded.map, decoded.ground, decoded.terr);
}

/** 写入 game/data，返回 { stamp, written:[{name,bytes,bak?}], validation } */
async function publishToDataDir(decoded, dataDir, opts) {
  opts = opts || {};
  const dry = !!opts.dry;
  const v = validateDecoded(decoded);
  if (v.errors.length && !opts.allowErrors) {
    const err = new Error('地图检查未通过：' + v.errors.map(e => e.text).join('；'));
    err.validation = v; err.code = 'VALIDATE'; throw err;
  }
  const { files } = buildFiles(decoded);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const written = [];
  fs.mkdirSync(dataDir, { recursive: true });
  for (const [name, buf] of Object.entries(files)) {
    const f = path.join(dataDir, name);
    let bak = null;
    if (!dry && fs.existsSync(f)) {
      bak = f + '.bak-' + stamp;
      fs.copyFileSync(f, bak);
    }
    if (!dry) fs.writeFileSync(f, buf);
    written.push({ name, bytes: buf.length, path: f, bak });
  }
  return { stamp, written, validation: v, dry };
}

module.exports = { encodePNG, buildFiles, decodeExport, validateDecoded, publishToDataDir, ME };

#!/usr/bin/env node
// v7.7：把地图编辑器「导出」的 JSON 写回游戏数据（game/data/map.json、ground.png、terrain.png）。
// 用法：node tools/apply_map_export.cjs <导出的.json> [game 目录，默认 ../game] [--dry]
// 写之前会把旧文件备份为 *.bak-时间戳。纯 node，无依赖、无网络。
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ME = require(path.join(__dirname, '../game/js/mapedit_core.js'));
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function encodePNG(w, h, ch, px) { // ch = 1 灰度 / 3 RGB
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = ch === 1 ? 0 : 2;
  const stride = w * ch, raw = Buffer.alloc((stride + 1) * h); for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; Buffer.from(px.buffer, px.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]); }
async function main() {
  const args = process.argv.slice(2), dry = args.includes('--dry'), pos = args.filter(a => a !== '--dry');
  if (!pos[0]) { console.error('用法：node tools/apply_map_export.cjs <导出的.json> [game 目录] [--dry]'); process.exit(2); }
  const game = path.resolve(pos[1] || path.join(__dirname, '../game')), data = path.join(game, 'data');
  const d = await ME.decode(fs.readFileSync(pos[0], 'utf8')), m = d.map.meta, W = m.w * m.sub, H = m.h * m.sub;
  const v = ME.validate(d.map, d.ground, d.terr); console.log(`检查：${v.errors.length} 个错误，${v.warnings.length} 个提醒`); for (const e of v.errors) console.log('  ✖ ' + e.text);
  const files = { 'map.json': Buffer.from(JSON.stringify(d.map)), 'ground.png': encodePNG(W, H, 1, Buffer.from(d.ground)) };
  if (d.terr) { const rgb = Buffer.alloc(W * H * 3); for (let i = 0; i < W * H; i++) { rgb[i * 3] = d.terr[i * 4]; rgb[i * 3 + 1] = d.terr[i * 4 + 1]; rgb[i * 3 + 2] = d.terr[i * 4 + 2]; } files['terrain.png'] = encodePNG(W, H, 3, rgb); }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  for (const [n, buf] of Object.entries(files)) { const f = path.join(data, n); if (dry) { console.log(`（试运行）将写入 ${f}  ${(buf.length / 1024).toFixed(0)} KB`); continue; }
    if (fs.existsSync(f)) fs.copyFileSync(f, f + '.bak-' + stamp); fs.writeFileSync(f, buf); console.log(`已写入 ${f}  ${(buf.length / 1024).toFixed(0)} KB`); }
  if (!dry) console.log('完成。备份文件 *.bak-' + stamp + ' 确认无误后可删除；提交前别把 .bak 文件一起提交。');
}
if (require.main === module) main().catch(e => { console.error('失败：' + e.message); process.exit(1); });
module.exports = { encodePNG };

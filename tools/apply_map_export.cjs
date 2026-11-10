#!/usr/bin/env node
// 把地图编辑器「导出」的 JSON 写回 game/data（map.json / ground.png / terrain.png）。
const path = require('path'), fs = require('fs');
const lib = require('./map_publish_lib.cjs');
async function main() {
  const args = process.argv.slice(2), dry = args.includes('--dry'), pos = args.filter(a => a !== '--dry');
  if (!pos[0]) { console.error('用法：node tools/apply_map_export.cjs <导出的.json> [game 目录] [--dry]'); process.exit(2); }
  const game = path.resolve(pos[1] || path.join(__dirname, '../game')), data = path.join(game, 'data');
  const decoded = await lib.decodeExport(fs.readFileSync(pos[0], 'utf8'));
  const v = lib.validateDecoded(decoded);
  console.log(`检查：${v.errors.length} 个错误，${v.warnings.length} 个提醒`);
  for (const e of v.errors) console.log('  ✖ ' + e.text);
  const r = await lib.publishToDataDir(decoded, data, { dry, allowErrors: true });
  for (const w of r.written) console.log(`${dry ? '（试运行）将写入' : '已写入'} ${w.path}  ${(w.bytes / 1024).toFixed(0)} KB`);
  if (!dry) console.log('完成。备份 *.bak-' + r.stamp + ' 确认无误后可删除。');
}
if (require.main === module) main().catch(e => { console.error('失败：' + e.message); process.exit(1); });
module.exports = Object.assign({ encodePNG: lib.encodePNG }, lib);

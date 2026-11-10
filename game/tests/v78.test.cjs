// v7.8 回归：地标、备份格式、门口名牌、离线、水印文件名
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const VC = require('../js/v78core.js');
const { loadMap, root } = require('./helpers.cjs');
const { M } = loadMap();

test('landmarks: 12 named spots cover main campus areas', () => {
  assert.strictEqual(VC.LANDMARKS.length, 12);
  const ids = new Set(VC.LANDMARKS.map(l => l.id));
  for (const id of ['spawn', 'lib', 'statue', 'erlong', 'summit', 'gate_n', 'canteen']) assert.ok(ids.has(id), id);
  for (const l of VC.LANDMARKS) {
    assert.ok(l.x > 0 && l.y > 0 && l.x < M.meta.w && l.y < M.meta.h, l.id);
    assert.ok(l.name && l.icon);
  }
});

test('backup pack/unpack round-trip and rejects bad input', () => {
  const pack = VC.packBackup({ save: { v: 3, x: 1, y: 2 }, achievements: { got: { summit: 1 }, stations: [] }, mapedit: null, pref: { immersive: true } });
  assert.strictEqual(pack.format, VC.BACKUP_FORMAT); assert.strictEqual(pack.version, VC.BACKUP_VERSION);
  const u = VC.unpackBackup(JSON.stringify(pack));
  assert.deepStrictEqual(u.save, { v: 3, x: 1, y: 2 });
  assert.ok(u.achievements.got.summit); assert.strictEqual(u.pref.immersive, true);
  assert.throws(() => VC.unpackBackup('{"format":"x"}'));
  assert.throws(() => VC.unpackBackup('not-json'));
});

test('nearDoor picks the closest named door within radius', () => {
  const lib = M.buildings.find(b => b.name === '图书馆');
  assert.ok(lib && lib.door);
  const hit = VC.nearDoor(M.buildings, lib.door[0] + 1, lib.door[1] + 1, 4.5);
  assert.ok(hit && hit.name === '图书馆');
  assert.strictEqual(VC.nearDoor(M.buildings, 0, 0, 2), null);
});

test('photo filename and about metadata', () => {
  const n = VC.photoFilename(new Date('2026-11-06T12:34:56+08:00'));
  assert.match(n, /^nuc-campus-\d{8}-\d{6}\.png$/);
  assert.strictEqual(VC.ABOUT.version, '7.9.1');
  assert.strictEqual(VC.ABOUT.license, 'MIT');
  assert.ok(VC.WATERMARK.includes('中北大学'));
});

test('offline: v78 files have no CDN / absolute http(s) asset URLs', () => {
  for (const f of ['js/v78.js', 'js/v78core.js', 'index.html', 'style.css']) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/(src|href)\s*=\s*["']https?:|fetch\(\s*["']https?:/i.test(s), f);
  }
});

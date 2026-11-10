// v7.9 手机适配：机型判定、DPR 上限、触控目标、情境按钮、面板几何
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const C = require('../js/v79core.js');
const { root } = require('./helpers.cjs');

test('classify: phone / phone-land / tablet / desktop', () => {
  assert.strictEqual(C.classify(390, 844, true), 'phone');
  assert.strictEqual(C.classify(844, 390, true), 'phone-land');
  assert.strictEqual(C.classify(820, 1180, true), 'tablet');
  assert.strictEqual(C.classify(1280, 800, false), 'desktop');
});

test('capDpr: touch capped at 2, desktop uncapped', () => {
  assert.strictEqual(C.capDpr(3, true), 2);
  assert.strictEqual(C.capDpr(1.5, true), 1.5);
  assert.strictEqual(C.capDpr(3, false), 3);
});

test('actionLabel maps hint kinds for contextual FAB', () => {
  assert.deepStrictEqual(C.actionLabel({ kind: 'door' }, false).text, '进入');
  assert.deepStrictEqual(C.actionLabel({ kind: 'ride' }, false).text, '骑车');
  assert.deepStrictEqual(C.actionLabel({ kind: 'park' }, true).text, '还车');
  assert.strictEqual(C.actionLabel(null, false), null);
  assert.strictEqual(C.actionLabel(null, true).text, '还车');
});

test('geometry helpers: overlap / outside / tooSmall', () => {
  const a = { x: 0, y: 0, w: 50, h: 50, right: 50, bottom: 50 };
  const b = { x: 40, y: 40, w: 50, h: 50, right: 90, bottom: 90 };
  assert.ok(C.overlaps(a, b));
  assert.ok(!C.overlaps(a, { x: 60, y: 60, w: 10, h: 10, right: 70, bottom: 70 }));
  assert.ok(C.outside({ x: -5, y: 0, right: 10, bottom: 10 }, 100, 100));
  assert.ok(C.tooSmall({ w: 40, h: 40 }));
  assert.ok(!C.tooSmall({ w: 44, h: 44 }));
});

test('offline: v79 sources have no CDN urls', () => {
  for (const f of ['js/v79.js', 'js/v79core.js', 'style.css', 'index.html']) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/(src|href)\s*=\s*["']https?:/i.test(s), f);
  }
});

test('v79 assets exist and are wired in index.html', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('v79core.js') && html.includes('v79.js'));
  assert.ok(fs.existsSync(path.join(root, 'js/v79.js')));
});

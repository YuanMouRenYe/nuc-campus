// v7.9.1 操作模式统一模块
const test = require('node:test'), assert = require('node:assert');
const IM = require('../js/input_mode.js');

test('capabilityTouch respects ?touch=1 / ?touch=0', () => {
  assert.strictEqual(IM.capabilityTouch('?touch=1'), true);
  assert.strictEqual(IM.capabilityTouch('?foo=1&touch=1'), true);
  assert.strictEqual(IM.capabilityTouch('?touch=0'), false);
  assert.strictEqual(IM.capabilityTouch(''), false);
});

test('wantTouchShell: auto/desktop/touch overrides', () => {
  assert.strictEqual(IM.wantTouchShell({ mode: 'auto' }, true), true);
  assert.strictEqual(IM.wantTouchShell({ mode: 'auto' }, false), false);
  assert.strictEqual(IM.wantTouchShell({ mode: 'desktop' }, true), false);
  assert.strictEqual(IM.wantTouchShell({ mode: 'touch' }, false), true);
});

test('pref round-trip in memory storage', () => {
  const mem = { s: {}, getItem(k) { return this.s[k] || null; }, setItem(k, v) { this.s[k] = v; }, removeItem(k) { delete this.s[k]; } };
  IM.writePref(mem, 'touch');
  assert.strictEqual(IM.readPref(mem).mode, 'touch');
  IM.writePref(mem, 'desktop');
  assert.strictEqual(IM.readPref(mem).mode, 'desktop');
  IM.writePref(mem, 'nope');
  assert.strictEqual(IM.readPref(mem).mode, 'auto');
});

test('classifyLayout desktop vs phone', () => {
  assert.strictEqual(IM.classifyLayout(1280, 800, false), 'desktop');
  assert.strictEqual(IM.classifyLayout(390, 844, true), 'phone');
  assert.strictEqual(IM.classifyLayout(844, 390, true), 'phone-land');
});

test('MODE_ZH covers all modes', () => {
  for (const m of IM.MODES) assert.ok(IM.MODE_ZH[m]);
});

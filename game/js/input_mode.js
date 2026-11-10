// v7.9.1 统一「操作模式」：自动 / 电脑 / 触屏。v77 / v79 / game.js 共用，勿各自再写 isTouch。
// 能力探测：(pointer: coarse) / (hover: none) / ?touch=1；用户覆盖存 localStorage。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.InputMode = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const KEY = 'nuc-campus-input-mode-v1';
  const MODES = ['auto', 'desktop', 'touch'];
  const MODE_ZH = { auto: '自动', desktop: '电脑', touch: '触屏' };

  function readPref(storage) {
    try {
      const o = JSON.parse((storage || (typeof localStorage !== 'undefined' ? localStorage : null) || { getItem() { return null; } }).getItem(KEY) || 'null');
      if (o && MODES.includes(o.mode)) return { mode: o.mode };
    } catch (e) { }
    return { mode: 'auto' };
  }
  function writePref(storage, mode) {
    const s = storage || localStorage;
    if (!MODES.includes(mode)) mode = 'auto';
    s.setItem(KEY, JSON.stringify({ mode }));
  }

  function capabilityTouch(search) {
    const q = search != null ? String(search) : (typeof location !== 'undefined' ? location.search : '');
    if (/[?&]touch=0\b/.test(q)) return false;
    if (/[?&]touch=1\b/.test(q) || /[?&]touch\b/.test(q)) return true;
    if (typeof matchMedia === 'undefined') return false;
    try {
      if (matchMedia('(pointer: coarse)').matches) return true;
      if (matchMedia('(any-pointer: coarse)').matches) return true;
      if (matchMedia('(hover: none)').matches && !matchMedia('(pointer: fine)').matches) return true;
    } catch (e) { }
    return false;
  }

  /** 有效触屏壳：用户强制触屏，或自动且能力探测为触屏；强制电脑则 false */
  function wantTouchShell(pref, caps) {
    const mode = (pref && pref.mode) || 'auto';
    if (mode === 'touch') return true;
    if (mode === 'desktop') return false;
    return !!caps;
  }

  function classifyLayout(w, h, touchShell) {
    if (!touchShell && w >= 900) return 'desktop';
    const short = Math.min(w, h), long = Math.max(w, h);
    if (short >= 700) return 'tablet';
    return long > short * 1.2 && h < w ? 'phone-land' : 'phone';
  }

  // ---- runtime singleton (browser) ----
  let state = {
    pref: { mode: 'auto' },
    caps: false,
    hybridKeys: false,
    hybridPointer: false,
    listeners: [],
  };

  function effectiveTouch() { return wantTouchShell(state.pref, state.caps); }
  function hybrid() { return effectiveTouch() && (state.hybridKeys || state.hybridPointer); }

  function applyDom() {
    if (typeof document === 'undefined') return;
    const touch = effectiveTouch();
    const w = window.innerWidth, h = window.innerHeight;
    const kind = classifyLayout(w, h, touch);
    document.body.classList.toggle('touch', touch);
    document.body.classList.toggle('phone', kind === 'phone' || kind === 'phone-land');
    document.body.classList.toggle('land', kind === 'phone-land' || (kind === 'tablet' && w > h));
    document.body.classList.toggle('tablet', kind === 'tablet');
    document.body.classList.toggle('desktop', kind === 'desktop' || (!touch && kind !== 'tablet'));
    document.body.classList.toggle('hybrid', hybrid());
    document.body.dataset.inputMode = state.pref.mode;
  }

  function emit() {
    applyDom();
    for (const fn of state.listeners) try { fn(snapshot()); } catch (e) { }
  }

  function snapshot() {
    return {
      mode: state.pref.mode,
      caps: state.caps,
      touch: effectiveTouch(),
      hybrid: hybrid(),
      hybridKeys: state.hybridKeys,
      hybridPointer: state.hybridPointer,
      kind: typeof window !== 'undefined' ? classifyLayout(window.innerWidth, window.innerHeight, effectiveTouch()) : 'desktop',
    };
  }

  function setMode(mode, storage) {
    if (!MODES.includes(mode)) mode = 'auto';
    state.pref.mode = mode;
    try { writePref(storage || localStorage, mode); } catch (e) { }
    emit();
  }

  function init(opts) {
    opts = opts || {};
    const search = opts.search != null ? opts.search : (typeof location !== 'undefined' ? location.search : '');
    state.pref = readPref(opts.storage);
    // URL ?touch=1 forces capability; ?input=desktop|touch|auto overrides pref for this session only if provided
    state.caps = capabilityTouch(search);
    const m = /[?&]input=(auto|desktop|touch)\b/.exec(search);
    if (m) state.pref.mode = m[1];
    if (typeof document !== 'undefined') {
      // hybrid: first fine pointer move or keydown while in touch shell
      addEventListener('keydown', () => {
        if (!state.hybridKeys) { state.hybridKeys = true; if (effectiveTouch()) emit(); }
      }, { passive: true });
      addEventListener('pointermove', e => {
        if (e.pointerType === 'mouse' && e.isPrimary) {
          if (!state.hybridPointer) { state.hybridPointer = true; if (effectiveTouch()) emit(); }
        }
      }, { passive: true });
      addEventListener('resize', () => applyDom());
      addEventListener('orientationchange', () => setTimeout(applyDom, 120));
    }
    applyDom();
    return snapshot();
  }

  function onChange(fn) { state.listeners.push(fn); return () => { state.listeners = state.listeners.filter(f => f !== fn); }; }

  // test helpers
  function _resetForTest() {
    state = { pref: { mode: 'auto' }, caps: false, hybridKeys: false, hybridPointer: false, listeners: [] };
  }

  return {
    KEY, MODES, MODE_ZH, readPref, writePref, capabilityTouch, wantTouchShell, classifyLayout,
    init, setMode, onChange, snapshot, effectiveTouch, hybrid, applyDom, _resetForTest,
  };
});

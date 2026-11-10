// v7.9 手机适配：纯逻辑（机型判定、安全区、触控目标、面板布局、DPR 上限）。浏览器与 node 测试共用。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.V79Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const MIN_TARGET = 44, MIN_FONT = 14, DPR_CAP = 2;
  function classify(w, h, coarse) {
    if (!coarse && w >= 900) return 'desktop';
    const short = Math.min(w, h), long = Math.max(w, h);
    if (short >= 700) return 'tablet';
    return long > short * 1.2 && h < w ? 'phone-land' : 'phone';
  }
  function capDpr(dpr, coarse) { const d = dpr || 1; return coarse ? Math.min(d, DPR_CAP) : d; }
  function overlaps(a, b, pad) {
    pad = pad || 0;
    return !(a.right + pad <= b.x || b.right + pad <= a.x || a.bottom + pad <= b.y || b.bottom + pad <= a.y);
  }
  function outside(r, vw, vh, pad) {
    pad = pad || 0;
    return r.x < -pad || r.y < -pad || r.right > vw + pad || r.bottom > vh + pad;
  }
  function tooSmall(r) { return r.w < MIN_TARGET || r.h < MIN_TARGET; }
  // 情境动作：根据 hint.kind 决定主按钮文案
  function actionLabel(hint, riding) {
    if (!hint) return riding ? { kind: 'park', text: '还车', icon: '🅿' } : null;
    const map = {
      door: { kind: 'door', text: '进入', icon: '🚪' },
      talk: { kind: 'talk', text: '交谈', icon: '💬' },
      info: { kind: 'info', text: '查看', icon: '👁' },
      stairs: { kind: 'stairs', text: '楼梯', icon: '🪜' },
      ride: { kind: 'ride', text: '骑车', icon: '🛵' },
      park: { kind: 'park', text: '还车', icon: '🅿' },
    };
    return map[hint.kind] || { kind: hint.kind, text: '互动', icon: 'E' };
  }
  // 拍照：iOS 无法可靠使用 <a download>，优先 Web Share，其次新标签打开 blob
  function canShareFiles() {
    try { return !!(typeof navigator !== 'undefined' && navigator.share && navigator.canShare); } catch (e) { return false; }
  }
  return { MIN_TARGET, MIN_FONT, DPR_CAP, classify, capDpr, overlaps, outside, tooSmall, actionLabel, canShareFiles };
});

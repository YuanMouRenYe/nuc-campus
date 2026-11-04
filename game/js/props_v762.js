// v7.6.2 二龙山 set dressing (procedural, original art): park gate arch, carved stone steles (龙园 / 世纪碑 / 爱心台 /
// 飞瀑), the ruined 碉堡, and wooden trail signposts. Sprites return { cv, ax, ay } (ax, ay = foot point in px).
(function () {
  'use strict';
  const mk = (W, H) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; return [cv, cv.getContext('2d')]; };
  function txt(g, s, x, y, col, size) { g.font = (size || 8) + 'px ArkPixel, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); }
  function vtxt(g, s, x, y0, col, size) { const ch = [...s]; for (let k = 0; k < ch.length; k++) txt(g, ch[k], x, y0 + k * (size + 1), col, size); }

  // 公园大门: two square stone posts + a tiled lintel with the name board
  function parkGate(title) {
    const W = 72, H = 52, [cv, g] = mk(W, H), fy = H - 2;
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(4, fy - 2, W - 8, 4);
    for (const x of [8, W - 18]) { g.fillStyle = '#9a958a'; g.fillRect(x, 14, 10, fy - 14); g.fillStyle = '#b8b3a6'; g.fillRect(x, 14, 3, fy - 14);
      g.fillStyle = '#7a756a'; g.fillRect(x - 1, fy - 4, 12, 4); }
    g.fillStyle = '#5a3a2a'; g.fillRect(2, 8, W - 4, 8);                 // beam
    g.fillStyle = '#3f5a4a'; g.fillRect(0, 2, W, 7); g.fillStyle = '#577a64'; g.fillRect(0, 2, W, 2);   // green tiled roof
    g.fillStyle = '#2d2f33'; g.fillRect(W / 2 - 18, 9, 36, 12); g.fillStyle = '#c9a24a'; g.fillRect(W / 2 - 17, 10, 34, 1);
    txt(g, title, W / 2, 15.5, '#f3d27a', 8);
    return { cv, ax: W / 2, ay: fy };
  }
  // stone stele on a plinth; big = the 龙园 / 世纪碑 boulders, small = an engraved marker
  function steleSprite(title, big) {
    const W = big ? 30 : 22, H = big ? 40 : 28, [cv, g] = mk(W, H), fy = H - 2, sw = big ? 20 : 13, sh = big ? 28 : 17, x0 = (W - sw) / 2;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(W / 2, fy - 1, W / 2 - 1, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8b8678'; g.fillRect(x0 - 3, fy - 5, sw + 6, 5); g.fillStyle = '#a39e90'; g.fillRect(x0 - 3, fy - 5, sw + 6, 1);   // plinth
    g.fillStyle = big ? '#a8a294' : '#b3ad9e'; g.beginPath(); g.moveTo(x0, fy - 5); g.lineTo(x0, fy - 5 - sh + 3); g.quadraticCurveTo(W / 2, fy - 5 - sh - 3, x0 + sw, fy - 5 - sh + 3); g.lineTo(x0 + sw, fy - 5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x0 + 1, fy - 5 - sh + 4, 2, sh - 5);
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x0 + sw - 3, fy - 5 - sh + 4, 3, sh - 5);
    vtxt(g, title, W / 2, fy - 5 - sh + 7, big ? '#8b1f1a' : '#3a3a3a', big ? 8 : 6);
    return { cv, ax: W / 2, ay: fy };
  }
  // ruined round blockhouse: grey stone drum, firing slits, broken crown, a few fallen stones
  function bunkerSprite() {
    const W = 44, H = 36, [cv, g] = mk(W, H), fy = H - 3, cx = W / 2;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(cx, fy, 19, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7c776c'; g.fillRect(cx - 16, fy - 20, 32, 20); g.beginPath(); g.ellipse(cx, fy, 16, 3, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#958f82'; g.beginPath(); g.ellipse(cx, fy - 20, 16, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5e5a51'; g.beginPath(); g.ellipse(cx, fy - 20, 12, 2.6, 0, 0, Math.PI * 2); g.fill();   // open top
    g.fillStyle = '#6a655b'; for (let y = fy - 17; y < fy; y += 4) for (let x = cx - 16 + ((y / 4) % 2) * 3; x < cx + 16; x += 6) g.fillRect(x, y, 5, 1);   // masonry
    g.fillStyle = '#232220'; for (const x of [cx - 10, cx - 1, cx + 8]) g.fillRect(x, fy - 13, 4, 2);   // 射击孔
    g.fillStyle = '#958f82'; g.fillRect(cx - 16, fy - 24, 5, 4); g.fillRect(cx + 6, fy - 23, 6, 3);       // broken crown
    g.fillStyle = '#8a8478'; g.fillRect(cx + 17, fy - 3, 4, 3); g.fillRect(cx - 21, fy - 2, 3, 2);
    return { cv, ax: cx, ay: fy };
  }
  // wooden signpost with an arrow board
  function signpost(title) {
    const W = 30, H = 30, [cv, g] = mk(W, H), fy = H - 2;
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(11, fy - 1, 8, 2);
    g.fillStyle = '#6b4a2e'; g.fillRect(14, 6, 3, fy - 6);
    g.fillStyle = '#9a6b3e'; g.beginPath(); g.moveTo(2, 6); g.lineTo(24, 6); g.lineTo(28, 10.5); g.lineTo(24, 15); g.lineTo(2, 15); g.closePath(); g.fill();
    g.fillStyle = '#b8824c'; g.fillRect(2, 6, 22, 1);
    txt(g, title, 14, 11, '#fff3d6', 7);
    return { cv, ax: 15, ay: fy };
  }
  window.PropsV762 = { parkGate, steleSprite, bunkerSprite, signpost };
})();

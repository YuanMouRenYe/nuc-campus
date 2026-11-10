// v7.8 游戏内新功能：沉浸模式、拍照、存档备份、关于、地标传送、门口名牌、手机紧凑 HUD。
// UX 灵感见 docs/LEARNED_FROM_PIXELCAMPUS.md；本文件全部从零编写，未复制 PixelCampus 代码。
(function () {
  'use strict';
  const VC = window.V78Core, T = 16, $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  let A = null, photo = false, camX = 0, camY = 0, plaqueB = null;
  const pref = (() => { try { return VC.prefParse(localStorage.getItem(VC.PREF_KEY)); } catch (e) { return { immersive: false }; } })();
  function savePref() { try { localStorage.setItem(VC.PREF_KEY, JSON.stringify(pref)); } catch (e) { } }
  function el(tag, id, cls, html, parent) { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || document.body).appendChild(e); return e; }
  function tapBtn(b, fn) { const go = e => { e.preventDefault(); e.stopPropagation(); fn(); }; b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('mousedown', go); }

  function setImmersive(on) {
    pref.immersive = !!on; savePref();
    document.body.classList.toggle('immersive', pref.immersive);
    const b = $('immbtn'); if (b) b.textContent = pref.immersive ? '⤢' : '⛶';
    if (A) A.toast(pref.immersive ? '沉浸模式：界面已隐藏（Z 退出；键盘快捷键仍可用）' : '已退出沉浸模式', 2200);
  }

  function togglePhoto(force) {
    if (force === false || (photo && force !== true)) {
      photo = false; document.body.classList.remove('photo'); document.body.classList.toggle('immersive', pref.immersive);
      if (A) { A.cam.x = A.player.x * T; A.cam.y = A.player.y * T; A.toast('已退出拍照模式', 1500); }
      return;
    }
    if (A && A.S.mode !== 'out') { A.toast('室内暂不支持拍照模式', 1500); return; }
    photo = true; camX = A.cam.x; camY = A.cam.y;
    document.body.classList.add('photo'); document.body.classList.add('immersive');
    A.toast(document.body.classList.contains('touch') ? '📷 拍照：拖动画布平移，点快门保存，☰ 旁退出' : '📷 拍照模式：WASD / 拖动平移，滚轮缩放，Enter / 空格拍照保存，Esc 退出', 3500);
  }

  function snapPhoto() {
    if (!A || !photo) return;
    A.drawFrame(performance.now(), true);
    const src = A.cv, out = document.createElement('canvas'); out.width = src.width; out.height = src.height;
    const g = out.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0);
    // 水印：本游戏署名（不是 PixelCampus 的水印）
    const fs = Math.max(14, Math.round(out.width / 60));
    g.font = `${fs}px ArkPixel, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'bottom';
    const pad = Math.round(fs * 0.8), tx = out.width - pad, ty = out.height - pad, label = VC.WATERMARK + '  v' + VC.ABOUT.version;
    g.lineWidth = Math.max(3, fs / 5); g.strokeStyle = 'rgba(30,18,8,0.75)'; g.strokeText(label, tx, ty);
    g.fillStyle = 'rgba(255,242,200,0.92)'; g.fillText(label, tx, ty);
    out.toBlob(blob => {
      if (!blob) { A.toast('拍照失败', 1500); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = VC.photoFilename();
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      A.toast('✔ 已保存截图（带本游戏水印）', 2000);
    }, 'image/png');
  }

  function exportBackup() {
    let save = null, ach = null, mapedit = null, p = null;
    try { save = localStorage.getItem(VC.SAVE_KEY); } catch (e) { }
    try { ach = localStorage.getItem(VC.ACH_KEY); } catch (e) { }
    try { mapedit = localStorage.getItem(VC.MAPEDIT_KEY); } catch (e) { }
    try { p = localStorage.getItem(VC.PREF_KEY); } catch (e) { }
    const pack = VC.packBackup({
      save: save ? JSON.parse(save) : null,
      achievements: ach ? JSON.parse(ach) : null,
      mapedit: mapedit || null,
      pref: p ? JSON.parse(p) : null,
    });
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `nuc-campus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    if (A) A.toast('💾 存档备份已下载（含进度、成就、地图编辑、偏好）', 2500);
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const u = VC.unpackBackup(reader.result);
        if (u.save) localStorage.setItem(VC.SAVE_KEY, JSON.stringify(u.save));
        if (u.achievements) localStorage.setItem(VC.ACH_KEY, JSON.stringify(u.achievements));
        if (u.mapedit) localStorage.setItem(VC.MAPEDIT_KEY, typeof u.mapedit === 'string' ? u.mapedit : JSON.stringify(u.mapedit));
        if (u.pref) localStorage.setItem(VC.PREF_KEY, JSON.stringify(u.pref));
        if (A) A.toast('✔ 备份已恢复，即将刷新……', 1500);
        setTimeout(() => location.reload(), 800);
      } catch (e) { if (A) A.toast('恢复失败：' + e.message, 3000); }
    };
    reader.readAsText(file);
  }

  function showLandmarks() {
    const p = $('tp'); if (!p) return;
    p.innerHTML = '<div class="mt">地标传送 <span class="small">（Y / Esc 关闭 · 冷却 3 秒）</span></div>'
      + VC.LANDMARKS.map((l, i) => `<button data-i="${i}"><span>${l.icon}</span>${l.name}</button>`).join('')
      + '<button class="close">关闭</button>';
    for (const b of p.querySelectorAll('button[data-i]')) tapBtn(b, () => goLandmark(VC.LANDMARKS[+b.dataset.i]));
    tapBtn(p.querySelector('.close'), () => p.classList.remove('on'));
    p.classList.add('on');
  }
  let tpCool = 0;
  function goLandmark(l) {
    if (!A || A.S.mode !== 'out') { A.toast('请先到室外再传送', 1500); return; }
    if (photo) togglePhoto(false);
    if (performance.now() < tpCool) { A.toast('传送冷却中，稍等一下', 1200); return; }
    if (window.V77 && V77.riding && V77.riding()) { A.toast('请先还车再传送', 1800); return; }
    const spot = A.freeSpot(l.x, l.y) || [l.x, l.y];
    A.teleport(spot[0], spot[1]); tpCool = performance.now() + 3000;
    $('tp').classList.remove('on'); A.toast(`📍 已传送到「${l.name}」`, 1800);
  }

  function showAbout() {
    const a = VC.ABOUT, p = $('about');
    p.innerHTML = `<div class="mt">关于</div>
      <div class="ab-body"><b>${a.name}</b> · v${a.version}<br>许可：${a.license} · 作者：${a.author}<br><br>${a.repoNote}<br><br><span class="small">${a.learned}</span></div>
      <button class="close">关闭</button>`;
    tapBtn(p.querySelector('.close'), () => p.classList.remove('on'));
    p.classList.add('on');
  }

  function buildUI() {
    el('div', 'tp', 'panel v78p', '');
    el('div', 'about', 'panel v78p', '');
    el('div', 'photobar', 'panel', '📷 拍照 · WASD 平移 · Enter 保存 · Esc 退出');
    const ib = el('button', 'immbtn', 'panel', pref.immersive ? '⤢' : '⛶');
    ib.title = '沉浸模式 (Z)'; tapBtn(ib, () => setImmersive(!pref.immersive));
    // 备份文件输入（隐藏）
    const fi = el('input', 'bkfile', '', ''); fi.type = 'file'; fi.accept = 'application/json,.json'; fi.style.display = 'none';
    fi.addEventListener('change', () => { if (fi.files && fi.files[0]) importBackup(fi.files[0]); fi.value = ''; });
    // 扩展 v7.7 菜单
    const menu = $('menu');
    if (menu) {
      const extra = [
        ['⛶', '沉浸模式', 'Z', () => setImmersive(!pref.immersive)],
        ['📷', '拍照', 'P', () => togglePhoto(true)],
        ['📍', '地标传送', 'Y', () => showLandmarks()],
        ['💾', '导出存档备份', '', () => exportBackup()],
        ['📂', '导入存档备份', '', () => fi.click()],
        ['ℹ', '关于', '', () => showAbout()],
      ];
      for (const it of extra) {
        const b = document.createElement('button');
        b.innerHTML = `<span>${it[0]}</span>${it[1]}${it[2] ? `<i>${it[2]}</i>` : ''}`;
        tapBtn(b, () => { menu.classList.remove('on'); it[3](); });
        menu.appendChild(b);
      }
    }
    if (pref.immersive) document.body.classList.add('immersive');
    // 窄屏竖屏紧凑
    const applyCompact = () => {
      const c = matchMedia('(max-width: 480px) and (orientation: portrait)').matches;
      document.body.classList.toggle('compact', c);
    };
    applyCompact(); addEventListener('resize', applyCompact); addEventListener('orientationchange', applyCompact);
  }

  function drawPlaque(g, b) {
    const dx = b.door[0] * T, dy = b.door[1] * T - 28;
    const name = b.name.length > 10 ? b.name.slice(0, 9) + '…' : b.name;
    g.font = '11px ArkPixel'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = Math.max(48, g.measureText(name).width + 14), h = 16, x = Math.round(dx - w / 2), y = Math.round(dy - h / 2);
    g.fillStyle = '#c9965a'; g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle = '#f7e3b0'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#6b3a1e'; g.lineWidth = 2; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.fillStyle = '#6a1f12'; g.fillText(name, dx, dy);
    // 小三角指向门
    g.fillStyle = '#c9965a'; g.beginPath(); g.moveTo(dx - 4, y + h + 2); g.lineTo(dx + 4, y + h + 2); g.lineTo(dx, y + h + 8); g.fill();
  }

  window.V78 = {
    init(api) {
      A = api; buildUI();
      window.__v78 = { photo: () => photo, immersive: () => pref.immersive, landmarks: VC.LANDMARKS, exportBackup, pack: VC.packBackup, unpack: VC.unpackBackup, nearDoor: VC.nearDoor, togglePhoto, setImmersive, snapPhoto, _setCam: (x, y) => { camX = x; camY = y; } };
    },
    frozen: () => photo,
    photoCam(dt, keys, cam) {
      if (!photo) return null;
      let ix = 0, iy = 0;
      if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
      if (keys.has('d') || keys.has('arrowright')) ix += 1;
      if (keys.has('w') || keys.has('arrowup')) iy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) iy += 1;
      const L = Math.hypot(ix, iy), sp = (keys.has('shift') ? 520 : 280) * dt;
      if (L > 0) { camX += ix / L * sp; camY += iy / L * sp; }
      return { x: camX, y: camY };
    },
    key(k, e) {
      if (k === 'z') { if (photo) togglePhoto(false); else setImmersive(!pref.immersive); return true; }
      if (k === 'p') { togglePhoto(!photo); return true; }
      if (k === 'y') { showLandmarks(); return true; }
      if (photo && (k === 'enter' || k === ' ')) { e && e.preventDefault(); snapPhoto(); return true; }
      if (k === 'escape') {
        if (photo) { togglePhoto(false); return true; }
        $('tp') && $('tp').classList.remove('on');
        $('about') && $('about').classList.remove('on');
      }
      return false;
    },
    tick() {
      if (!A || A.S.mode !== 'out') { plaqueB = null; return; }
      plaqueB = VC.nearDoor(A.M.buildings, A.player.x, A.player.y);
    },
    sprites(spr, x0, y0, x1, y1) {
      if (plaqueB && plaqueB.door) {
        const wx = plaqueB.door[0] * T, wy = plaqueB.door[1] * T;
        if (wx > x0 - 40 && wx < x1 + 40 && wy > y0 - 40 && wy < y1 + 40) spr.push({ y: wy - 20, v78: 'plaque', b: plaqueB });
      }
    },
    paint(g, o) { if (o.v78 === 'plaque') drawPlaque(g, o.b); },
  };
})();

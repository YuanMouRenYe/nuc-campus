// v7.7 游戏内新功能：成就（二龙山登山打卡）、共享电动车、手机触屏操作（虚拟摇杆 / 按钮 / 轻点查看）。
// 由 game.js 通过 window.V77 的几个钩子调用；纯逻辑在 v77core.js。
(function () {
  'use strict';
  const VC = window.V77Core, T = 16, $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  let A = null, riding = false, stickV = null, achT = 0, lastStation = null, toastQ = [], toastBusy = false;
  const left = {}; // 每个停车点剩余的车（显示用），默认 3 辆
  const ach = (() => { try { return VC.achParse(localStorage.getItem(VC.ACH_KEY)); } catch (e) { return VC.achNew(); } })();
  if (Q.has('resetach')) { ach.got = {}; ach.stations = []; }
  function saveAch() { if (Q.has('nosave') && !Q.has('keepach')) return; try { localStorage.setItem(VC.ACH_KEY, JSON.stringify(ach)); } catch (e) { } }

  // ---------- 像素电动车精灵（程序绘制，非任何游戏素材） ----------
  const PAL = { frame: '#2f8f9d', frameD: '#1f6470', seat: '#3a2a22', tire: '#2a2a30', hub: '#c9c9cf', basket: '#d8c08a', light: '#ffe58a', plate: '#f4f0e6' };
  function cvs(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); f(g); return c; }
  const px = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w || 1, h || 1); };
  function wheel(g, cx, cy) { px(g, PAL.tire, cx - 3, cy - 1, 7, 3); px(g, PAL.tire, cx - 2, cy - 3, 5, 7); px(g, PAL.tire, cx - 3, cy - 2, 7, 5); px(g, PAL.hub, cx - 1, cy - 1, 3, 3); px(g, PAL.tire, cx, cy, 1, 1); }
  const SIDE = cvs(26, 17, g => { // 朝右；朝左时水平翻转
    wheel(g, 5, 13); wheel(g, 20, 13);
    px(g, PAL.frameD, 6, 9, 13, 2); px(g, PAL.frame, 7, 8, 12, 2); px(g, PAL.frame, 16, 3, 2, 7); px(g, PAL.frameD, 18, 9, 2, 3); // 踏板 + 前叉
    px(g, PAL.frame, 3, 6, 6, 3); px(g, PAL.frameD, 3, 8, 6, 1); px(g, PAL.seat, 3, 4, 7, 2); // 后座 + 电池盒
    px(g, PAL.tire, 15, 1, 5, 1); px(g, PAL.basket, 19, 3, 5, 4); px(g, '#a8905a', 19, 6, 5, 1); px(g, PAL.light, 24, 4, 1, 2);
    px(g, PAL.plate, 1, 7, 2, 2); px(g, '#d84a3a', 1, 9, 2, 1); });
  const FRONT = cvs(12, 18, g => { // 朝下（迎面）
    px(g, PAL.tire, 4, 10, 4, 8); px(g, PAL.hub, 5, 12, 2, 2); px(g, PAL.frame, 3, 6, 6, 4); px(g, PAL.basket, 2, 2, 8, 5); px(g, '#a8905a', 2, 6, 8, 1);
    px(g, PAL.tire, 0, 1, 12, 1); px(g, PAL.light, 5, 7, 2, 1); });
  const BACK = cvs(12, 18, g => { // 朝上（背影）
    px(g, PAL.tire, 4, 10, 4, 8); px(g, PAL.frame, 3, 5, 6, 6); px(g, PAL.seat, 3, 4, 6, 2); px(g, PAL.plate, 4, 10, 4, 2); px(g, '#d84a3a', 4, 9, 4, 1); px(g, PAL.tire, 0, 1, 12, 1); });
  function drawBike(g, dir, x, y) { // x,y = 脚下（世界像素）
    if (dir === 3) g.drawImage(SIDE, Math.round(x - 13), Math.round(y - 15));
    else if (dir === 2) { g.save(); g.translate(Math.round(x + 13), Math.round(y - 15)); g.scale(-1, 1); g.drawImage(SIDE, 0, 0); g.restore(); }
    else g.drawImage(dir === 0 ? FRONT : BACK, Math.round(x - 6), Math.round(y - 16)); }
  function drawRider(g, c, wx, wy, sheet, meta, row) {
    const fw = meta.fw, fh = meta.fh, x = Math.round(wx - meta.footX), y = Math.round(wy - meta.footY), dir = c.dir, bob = c.moving && (Math.floor(c.anim || 0) & 1) ? 1 : 0;
    g.fillStyle = 'rgba(30,40,20,0.28)'; g.fillRect(Math.round(wx) - 11, Math.round(wy) - 2, 22, 3);
    if (dir === 1) { g.drawImage(sheet, 0, row * fh, fw, fh - 12, x, y - 3 + bob, fw, fh - 12); drawBike(g, dir, wx, wy); return; } // 背影：车在身前（画在人上面）
    drawBike(g, dir, wx, wy); g.drawImage(sheet, 0, row * fh, fw, fh - 12, x, y - 3 + bob, fw, fh - 12);
    if (dir === 0) g.drawImage(FRONT, 0, 0, 12, 8, Math.round(wx - 6), Math.round(wy - 16), 12, 8); // 车把 + 车筐挡在腿前
  }
  // 停车点：地面白色划线框 + 蓝色 P 牌 + 几辆车
  function drawStation(g, s) { const X = Math.round(s.x * T), Y = Math.round(s.y * T), n = left[s.id] == null ? 3 : left[s.id];
    g.fillStyle = 'rgba(40,80,160,0.18)'; g.fillRect(X - 26, Y - 14, 52, 26); g.fillStyle = '#f4f4ee';
    for (let i = -26; i < 26; i += 4) { g.fillRect(X + i, Y - 14, 2, 1); g.fillRect(X + i, Y + 11, 2, 1); } for (let j = -14; j < 12; j += 4) { g.fillRect(X - 26, Y + j, 1, 2); g.fillRect(X + 25, Y + j, 1, 2); }
    for (let k = 0; k < n; k++) drawBike(g, 3, X - 12 + k * 10, Y + 6 - (k & 1) * 4);
    g.fillStyle = '#4a4a52'; g.fillRect(X + 22, Y - 30, 2, 30); g.fillStyle = '#1f55b8'; g.fillRect(X + 16, Y - 40, 14, 12); g.fillStyle = '#fff'; g.font = '10px ArkPixel'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', X + 23, Y - 34); }

  // ---------- DOM ----------
  function el(tag, id, cls, html, parent) { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || document.body).appendChild(e); return e; }
  const isTouch = () => window.InputMode ? InputMode.effectiveTouch() : !!(Q.get('touch') || matchMedia('(pointer: coarse)').matches);
  function buildUI() {
    // v7.9.3：成就卡挂到左上角堆叠里，跟时钟/任务/提示同一列，不会互相压
    el('div', 'achtoast', 'panel', '<div class="ai"></div><div class="ab"><div class="ah">成就达成！</div><div class="an"></div><div class="ad"></div></div>', document.getElementById('hud-left'));
    el('div', 'achpanel', 'panel', '');
    const menu = el('div', 'menu', 'panel', '');
    const items = [['🗺', '校园地图', 'M', () => { A.S.showMap = !A.S.showMap; }], ['📋', '今日任务', 'Q', () => A.toggleQuests()], ['🏅', '成就', 'K', () => togglePanel()], ['🛵', '骑车 / 还车', 'B', () => toggleRide()],
      ['🍂', '换季节', 'J', () => A.cycleSeason()], ['☁', '换天气', 'T', () => A.cycleWeather()], ['🔊', '声音', 'V', () => A.toggleMute()], ['⏩', '快进 1 小时', 'N', () => { A.S.minutes += 60; }],
      ['❓', '操作说明', '', () => { A.S.dialog = helpText(); }]];
    menu.innerHTML = '<div class="mt">菜单 <span class="small">（Tab / Esc 关闭）</span></div>' + items.map((it, i) => `<button data-i="${i}"><span>${it[0]}</span>${it[1]}${it[2] ? `<i>${it[2]}</i>` : ''}</button>`).join('');
    for (const b of menu.querySelectorAll('button')) tapBtn(b, () => { menu.classList.remove('on'); items[+b.dataset.i][3](); });
    tapBtn(el('button', 'menubtn', 'panel', '☰'), () => menu.classList.toggle('on'));
    const rb = el('button', 'ridebtn', 'panel', '<b>🛵</b><span>骑车</span>'); tapBtn(rb, () => toggleRide());
    const joy = el('div', 'joy', '', '<div id="joyknob"></div>'); joyInit(joy);
    if (window.InputMode) InputMode.init({ search: location.search });
    else if (isTouch()) document.body.classList.add('touch');
    for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', e => { if (e.touches.length > 1 || e.target === document.body) e.preventDefault(); }, { passive: false });
  }
  function tapBtn(b, fn) { const go = e => { e.preventDefault(); e.stopPropagation(); fn(); }; b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('mousedown', go); }
  function joyInit(j) { let id = null, cx = 0, cy = 0; const knob = j.firstChild;
    const set = (dx, dy) => { const R = j.clientWidth / 2 - 10, L = Math.hypot(dx, dy), k = L > R ? R / L : 1; knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`; stickV = VC.stickVector(dx, dy, R, 8); };
    j.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); const t = e.changedTouches[0], r = j.getBoundingClientRect(); id = t.identifier; cx = r.left + r.width / 2; cy = r.top + r.height / 2; set(t.clientX - cx, t.clientY - cy); }, { passive: false });
    j.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === id) set(t.clientX - cx, t.clientY - cy); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) if (t.identifier === id) { id = null; stickV = null; knob.style.transform = ''; } };
    j.addEventListener('touchend', end); j.addEventListener('touchcancel', end);
    window.__joy = { set, end: () => { id = null; stickV = null; knob.style.transform = ''; } }; }
  function helpText() { return '电脑：WASD/方向键 移动 · Shift 跑 · E 互动 · B 骑车/还车 · K 成就 · Tab 菜单 · M 地图 · Q 任务。手机：左下摇杆移动，右下 E 互动、🛵 骑车/还车、☰ 菜单；轻点建筑查看介绍，双指缩放。'; }
  function togglePanel(force) { const p = $('achpanel'), on = force != null ? force : !p.classList.contains('on'); p.classList.toggle('on', on); if (on) renderPanel(); }
  function renderPanel() { const p = $('achpanel'), n = VC.ACH.filter(a => ach.got[a.id]).length, fmt = t => { const d = new Date(t); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    p.innerHTML = `<div class="mt">🏅 成就 ${n}/${VC.ACH.length} <span class="small">（K / Esc 关闭）</span></div>` + VC.ACH.map(a => `<div class="ar${ach.got[a.id] ? ' got' : ''}"><span class="ai2">${ach.got[a.id] ? a.icon : '🔒'}</span><div><b>${a.name}${a.cp ? '<i>打卡点</i>' : ''}</b><div class="small">${a.desc}${ach.got[a.id] ? ' · ' + fmt(ach.got[a.id]) : ''}</div></div></div>`).join('')
      + `<div class="small foot">骑车到过的停车点：${ach.stations.length}/${VC.STATIONS.length}（停车点位置未核实）</div>`;
    const cl = el('button', '', 'close', '关闭', p); tapBtn(cl, () => togglePanel(false)); }
  function showAch(a) { toastQ.push(a); pump(); }
  function pump() { if (toastBusy || !toastQ.length) return; const a = toastQ.shift(), t = $('achtoast'); toastBusy = true;
    t.querySelector('.ai').textContent = a.icon; t.querySelector('.an').textContent = a.name; t.querySelector('.ad').textContent = a.desc; t.querySelector('.ah').textContent = a.cp ? '📍 打卡点' : '成就达成！';
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); try { window.Sound && Sound.chime && Sound.chime(); } catch (e) { }
    window.__lastAch = a.id; setTimeout(() => { t.classList.remove('on'); setTimeout(() => { toastBusy = false; pump(); }, 350); }, a.cp ? 2600 : 4200); }
  function award(ids) { for (const id of ids) showAch(VC.ACH.find(a => a.id === id)); if (ids.length) { saveAch(); if ($('achpanel').classList.contains('on')) renderPanel(); } }

  // ---------- 骑车 ----------
  function toggleRide() { const S = A.S, p = A.player; if (S.mode !== 'out') { A.toast('室内不能骑车', 1500); return; }
    const st = VC.nearStation(p.x, p.y);
    if (riding) { if (!st) { A.toast('🅿 要把车骑到停车点（地图上的蓝色 P 牌）的划线里才能还车', 2500); return; }
      riding = false; left[st.id] = Math.min(5, (left[st.id] == null ? 3 : left[st.id]) + 1); A.toast(`✔ 已还车：${st.name}（位置未核实）`, 2000); award(VC.achCheck(ach, { mode: 'out', x: p.x, y: p.y, parkedAt: st.id })); return; }
    if (!st) { A.toast('附近没有共享电动车停车点 —— 找蓝色 P 牌', 2000); return; }
    if ((left[st.id] == null ? 3 : left[st.id]) <= 0) { A.toast('这个停车点没车了，去别的停车点看看', 2000); return; }
    if (!VC.rideOK(A.ground8(), A.M.meta, p.x, p.y)) { A.toast('先走到路面上再骑', 1500); return; }
    left[st.id] = (left[st.id] == null ? 3 : left[st.id]) - 1; riding = true; lastStation = st.id;
    A.toast('🛵 扫码成功！只能在道路上骑（台阶、草地、室内不行），到任意停车点按 E / B 还车。校内限速 20 km/h', 3500); award(VC.achCheck(ach, { mode: 'out', x: p.x, y: p.y, riding: true, rodeAt: st.id })); }

  const V77 = window.V77 = {
    BIKE_SPEED: VC.BIKE_SPEED,
    riding: () => riding,
    init(api) { A = api; buildUI();
      let k = 0; for (let i = 0; i < api.npcs.length && k < 6; i++) if (i % 15 === 4) { api.npcs[i].bike = true; k++; } // 不增加人数：挑现有 6 个同学骑车
      if (Q.get('ride') === '1') { const st = VC.nearStation(api.player.x, api.player.y, 6); if (st) { api.player.x = st.x; api.player.y = st.y; } riding = true; }
      window.__v77 = { ach, stations: VC.STATIONS, ride: () => riding, toggleRide, award, togglePanel, setStick: v => { stickV = v; } }; },
    stick: () => stickV,
    rideMove: (grid, p, dx, dy) => VC.rideMove(grid, A.ground8(), A.M.meta, p, dx, dy),
    key(k) { if (k === 'b') { toggleRide(); return true; } if (k === 'k') { togglePanel(); return true; } if (k === 'tab') { $('menu').classList.toggle('on'); return true; }
      if (k === 'escape') { $('menu').classList.remove('on'); togglePanel(false); } return false; },
    interact(h) { if (h.kind === 'ride' || h.kind === 'park') { toggleRide(); return true; } if (riding && h.kind === 'door') { A.toast('🚫 不能骑进楼里 —— 先到停车点还车', 2000); return true; } return false; },
    tick(dt) { const S = A.S, p = A.player;
      if (S.mode === 'out' && !S.dialog) { const st = VC.nearStation(p.x, p.y);
        if (st && (riding || !S.hint || S.hint.kind === 'info')) S.hint = riding ? { kind: 'park', text: `按 E / B 还车 · ${st.name}` } : { kind: 'ride', text: `按 E / B 扫码骑共享电动车 · ${st.name}（剩 ${left[st.id] == null ? 3 : left[st.id]} 辆）` };
        else if (riding && S.hint && S.hint.kind === 'door') S.hint.text = `骑车不能进「${S.hint.b.name}」—— 先到停车点还车`; }
      const rb = $('ridebtn'); if (rb) { const lab = riding ? '还车' : '骑车'; if (rb.lastChild.textContent !== lab) rb.lastChild.textContent = lab; rb.classList.toggle('on', !!(S.hint && (S.hint.kind === 'ride' || S.hint.kind === 'park'))); }
      achT -= dt; if (achT <= 0) { achT = 0.4; award(VC.achCheck(ach, { mode: S.mode, x: p.x, y: p.y, riding, now: Date.now() })); } },
    sprites(spr, x0, y0, x1, y1) { for (const s of VC.STATIONS) { const wx = s.x * T, wy = s.y * T; if (wx > x0 - 40 && wx < x1 + 40 && wy > y0 - 10 && wy < y1 + 50) spr.push({ y: wy + 12, v77: 'station', s }); } },
    paint(g, o) { if (o.v77 === 'station') drawStation(g, o.s); },
    drawRider,
    tapInspect(cx, cy) { const tip = $('tip'), TT = window.NUC_TIPS; if (!tip || !A) return false; const S = A.S; if (S.mode !== 'out' || S.showMap) return false;
      const r = A.cv.getBoundingClientRect(), s = A.scale(), X = (cx - r.left) * A.cv.width / r.width, Y = (cy - r.top) * A.cv.height / r.height;
      const ox = Math.round(A.cv.width / 2 - A.cam.x * s), oy = Math.round(A.cv.height / 2 - A.cam.y * s), tx = (X - ox) / s / T, ty = (Y - oy) / s / T;
      let title = null, body = null, src = '';
      const st = VC.nearStation(tx, ty, 2); if (st) { title = st.name; body = '校园共享电动车停车点：走到这里按 E / 🛵 骑车，骑到任意停车点还车。'; src = '（位置未核实）运营方：杭州小潮出行（中北大学科技园 2024-08 成交公告）'; }
      else { const b = window.__hoverAt && window.__hoverAt(tx, ty), t = b && TT && TT.tipFor(b.name); if (!t) { tip.classList.remove('on', 'tap'); return false; }
        title = b.name; body = t.t; const ss = (t.s || []).map(k => TT.SRC[k]).filter(Boolean).map(u => u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]); src = (t.v ? '' : '（未核实）') + (ss.length ? '来源：' + [...new Set(ss)].join('、') : ''); }
      tip.innerHTML = '<b></b><div class="tt"></div><div class="ts"></div>'; tip.children[0].textContent = title; tip.children[1].textContent = body; tip.children[2].textContent = src; tip.dataset.n = '';
      tip.style.left = Math.max(6, Math.min(cx - 140, innerWidth - 290)) + 'px'; tip.style.top = Math.max(6, Math.min(cy + 20, innerHeight - 140)) + 'px'; tip.classList.add('on', 'tap');
      clearTimeout(V77._tt); V77._tt = setTimeout(() => tip.classList.remove('on', 'tap'), 4500); return true; },
  };
})();

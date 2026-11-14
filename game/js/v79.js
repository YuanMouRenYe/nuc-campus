// v7.9 手机 / 平板适配层：底栏情境按钮、底部抽屉菜单、拍照触控、安全区、暂停、DPR 上限。
// 不改桌面布局；body.touch / body.phone / body.land / body.tablet 驱动 CSS。
(function () {
  'use strict';
  const C = window.V79Core, $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  let A = null, paused = false, sheetOpen = null;

  const isTouch = () => window.InputMode ? InputMode.effectiveTouch() : !!(Q.get('touch') || matchMedia('(pointer: coarse)').matches || matchMedia('(hover: none)').matches);
  function el(tag, id, cls, html, parent) {
    let e = id && $(id); if (e) { if (html != null) e.innerHTML = html; return e; }
    e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; if (html != null) e.innerHTML = html;
    (parent || document.body).appendChild(e); return e;
  }
  function tap(b, fn) {
    if (!b || b._v79) return; b._v79 = 1;
    const go = e => { e.preventDefault(); e.stopPropagation(); fn(e); };
    b.addEventListener('touchstart', go, { passive: false });
    b.addEventListener('click', go);
  }

  function layoutClass() {
    if (window.InputMode) { InputMode.applyDom(); return InputMode.snapshot().kind; }
    const w = window.innerWidth, h = window.innerHeight;
    const kind = C.classify(w, h, isTouch());
    document.body.classList.toggle('touch', isTouch());
    document.body.classList.toggle('phone', kind === 'phone' || kind === 'phone-land');
    document.body.classList.toggle('land', kind === 'phone-land' || (kind === 'tablet' && w > h));
    document.body.classList.toggle('tablet', kind === 'tablet');
    document.body.classList.toggle('desktop', kind === 'desktop');
    return kind;
  }

  function closeSheets() {
    for (const id of ['menu', 'achpanel', 'tp', 'about', 'sheet', 'photobar']) {
      const e = $(id); if (e) e.classList.remove('on', 'sheet-on');
    }
    document.body.classList.remove('sheet-open');
    sheetOpen = null;
  }
  function openSheet(id) {
    closeSheets();
    const e = $(id); if (!e) return;
    e.classList.add('on', 'sheet-on');
    document.body.classList.add('sheet-open');
    sheetOpen = id;
    // ensure close affordance
    if (!e.querySelector('.sheet-close')) {
      const c = document.createElement('button'); c.className = 'sheet-close'; c.type = 'button'; c.textContent = '关闭';
      tap(c, () => closeSheets()); e.appendChild(c);
    }
  }

  function buildChrome() {
    // 情境主按钮（取代分散的 ebtn 文案 + ridebtn）
    const fab = el('button', 'fab', 'panel fab', '<b id="fabicon">E</b><span id="fablab">互动</span>');
    tap(fab, () => {
      if (window.V78 && V78.frozen && V78.frozen()) { if (window.__v78) __v78.snapPhoto(); return; }
      if (A) A.interact();
    });
    // 菜单枢纽已有 menubtn；补拍照条
    const pb = el('div', 'photoui', 'photoui', `
      <div class="ph-row">
        <button type="button" id="ph-exit" class="ph-btn">退出</button>
        <button type="button" id="ph-zoomout" class="ph-btn">−</button>
        <button type="button" id="ph-zoomin" class="ph-btn">+</button>
        <button type="button" id="ph-snap" class="ph-snap" aria-label="快门">📷</button>
      </div>
      <div class="ph-hint">拖动画布平移 · 双指缩放 · 快门保存</div>`);
    tap($('ph-exit'), () => { if (window.__v78) __v78.togglePhoto(false); });
    tap($('ph-zoomin'), () => A && A.setZoom(window.Core.zoomStep(A.S.zoom, 1)));
    tap($('ph-zoomout'), () => A && A.setZoom(window.Core.zoomStep(A.S.zoom, -1)));
    tap($('ph-snap'), () => savePhoto());
    // 暂停遮罩
    el('div', 'pauseov', 'pauseov', '<div class="panel">已暂停<br><span class="small">回到游戏继续</span></div>');
    tap($('pauseov'), () => { paused = false; document.body.classList.remove('paused'); });
  }

  function rebuildMenu() {
    const menu = $('menu'); if (!menu) return;
    if (menu.dataset.v79 === '1') return; menu.dataset.v79 = '1';
    // 统一成可滚动底部抽屉；把 v7.7/v7.8 功能全收进来
    const items = [
      ['🗺', '校园地图', () => { A.S.showMap = true; }],
      ['📋', '今日任务', () => A.toggleQuests()],
      ['🏅', '成就', () => { if (window.V77) { closeSheets(); /* reopen ach as sheet */ setTimeout(() => { window.__v77.togglePanel(true); sheetify('achpanel'); }, 0); } }],
      ['📍', '地标传送', () => { if (window.__v78) { closeSheets(); setTimeout(() => { openLandmarks(); }, 0); } }],
      ['📷', '拍照', () => { if (window.__v78) __v78.togglePhoto(true); }],
      ['⛶', '沉浸模式', () => { if (window.__v78) __v78.setImmersive(!__v78.immersive()); }],
      ['🛵', '骑车 / 还车', () => { if (window.__v77) __v77.toggleRide(); }],
      ['🍂', '换季节', () => A.cycleSeason()],
      ['☁', '换天气', () => A.cycleWeather()],
      ['🔊', '声音', () => A.toggleMute()],
      ['⏩', '快进 1 小时', () => { A.S.minutes += 60; }],
      ['💾', '导出存档备份', () => { if (window.__v78) __v78.exportBackup(); }],
      ['📂', '导入存档备份', () => { const fi = $('bkfile'); if (fi) fi.click(); }],
      ['ℹ', '关于', () => { if (window.V78) { closeSheets(); setTimeout(() => { const b = [...document.querySelectorAll('#menu button')]; /* use about via API */ openAbout(); }, 0); } }],
      ['🖥', '操作模式', () => cycleInputMode()],
      ['❓', '操作说明', () => { A.S.dialog = helpMobile(); }],
    ];
    menu.innerHTML = '<div class="sheet-handle"></div><div class="mt">菜单</div><div class="sheet-body"></div>';
    const body = menu.querySelector('.sheet-body');
    items.forEach((it, i) => {
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = `<span>${it[0]}</span>${it[1]}`;
      tap(b, () => { closeSheets(); it[2](); });
      body.appendChild(b);
    });
    const cl = document.createElement('button'); cl.type = 'button'; cl.className = 'sheet-close'; cl.textContent = '关闭';
    tap(cl, () => closeSheets()); menu.appendChild(cl);
  }

  function sheetify(id) {
    const e = $(id); if (!e) return;
    e.classList.add('sheet-on', 'on');
    document.body.classList.add('sheet-open');
    sheetOpen = id;
    if (!e.querySelector('.sheet-handle')) {
      const h = document.createElement('div'); h.className = 'sheet-handle'; e.insertBefore(h, e.firstChild);
    }
    if (!e.querySelector('.sheet-close')) {
      const c = document.createElement('button'); c.className = 'sheet-close'; c.type = 'button'; c.textContent = '关闭';
      tap(c, () => closeSheets()); e.appendChild(c);
    }
  }

  // v7.10 新生导航：按「门 → 学习 → 吃饭 → 运动 → 景点」分组，每项带一句「这里是干嘛的」
  const NAV_GROUPS = [
    { title: '校门与报到', ids: ['gate1', 'gate_n', 'spawn'], hint: { gate1: '正门，新生报到从这进', spawn: '报到、领校园一卡通', gate_n: '靠二龙山和北区' } },
    { title: '学习', ids: ['lib', 'hongxue'], hint: { lib: '借书、自习、查资料', hongxue: '上课（302 教室在小测）' } },
    { title: '吃饭', ids: ['canteen', 'shiwei'], hint: { canteen: '西区主食堂', shiwei: '老刀削面在这儿' } },
    { title: '运动', ids: ['badminton', 'swim'], hint: { badminton: '室内羽毛球', swim: '游泳、健身' } },
    { title: '校园景点', ids: ['statue', 'erlong', 'summit'], hint: { statue: '打卡点', erlong: '二龙山登山入口', summit: '看校园全景' } },
  ];
  function goLandmark(l) {
    closeSheets();
    if (A.S.mode !== 'out') { A.toast('请先到室外再传送', 1500); return; }
    if (window.V77 && V77.riding && V77.riding()) { A.toast('请先还车再传送', 1800); return; }
    if (window.V78 && V78.frozen && V78.frozen()) __v78.togglePhoto(false);
    const spot = A.freeSpot(l.x, l.y) || [l.x, l.y];
    A.teleport(spot[0], spot[1]); A.toast(`📍 已传送到「${l.name}」`, 1800);
  }

  function openLandmarks() {
    const p = $('tp'); if (!p || !window.V78Core) return;
    p.innerHTML = '<div class="sheet-handle"></div><div class="mt">去哪里 <span class="small">（点一下直接过去）</span></div><div class="sheet-body"></div>';
    const body = p.querySelector('.sheet-body');
    const byId = new Map(V78Core.LANDMARKS.map(l => [l.id, l]));
    const seen = new Set();
    const addBtn = (l, hint) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'navbtn';
      b.innerHTML = `<span class="navi">${l.icon}</span><span class="navt"><b>${l.name}</b>${hint ? `<i>${hint}</i>` : ''}</span>`;
      tap(b, () => goLandmark(l));
      body.appendChild(b);
    };
    for (const g of NAV_GROUPS) {
      const items = g.ids.map(id => byId.get(id)).filter(Boolean);
      if (!items.length) continue;
      const h = document.createElement('div'); h.className = 'navgroup'; h.textContent = g.title;
      body.appendChild(h);
      for (const l of items) { addBtn(l, g.hint && g.hint[l.id]); seen.add(l.id); }
    }
    const rest = V78Core.LANDMARKS.filter(l => !seen.has(l.id));
    if (rest.length) {
      const h = document.createElement('div'); h.className = 'navgroup'; h.textContent = '其他';
      body.appendChild(h);
      for (const l of rest) addBtn(l);
    }
    const cl = document.createElement('button'); cl.className = 'sheet-close'; cl.type = 'button'; cl.textContent = '关闭';
    tap(cl, () => closeSheets()); p.appendChild(cl);
    sheetify('tp');
  }

  function openAbout() {
    const a = V78Core.ABOUT, p = $('about');
    p.innerHTML = `<div class="sheet-handle"></div><div class="mt">关于</div>
      <div class="ab-body sheet-body"><b>${a.name}</b> · v${a.version}<br>许可：${a.license} · 作者：${a.author}<br><br>${a.repoNote}<br><br><span class="small">${a.learned}</span>
      <br><br><span class="small">v7.9 针对手机做了触控与安全区适配。</span></div>`;
    const cl = document.createElement('button'); cl.className = 'sheet-close'; cl.type = 'button'; cl.textContent = '关闭';
    tap(cl, () => closeSheets()); p.appendChild(cl);
    sheetify('about');
  }


  function cycleInputMode() {
    if (!window.InputMode) { A && A.toast('操作模式模块未加载', 1500); return; }
    const order = InputMode.MODES;
    const cur = InputMode.snapshot().mode;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    InputMode.setMode(next);
    layoutClass();
    // refresh chrome visibility
    updateFab();
    const zh = InputMode.MODE_ZH[next];
    A && A.toast('操作模式：' + zh + (next === 'auto' ? '（按设备自动）' : ''), 2500);
    // rebuild menu label next open
    const menu = $('menu'); if (menu) menu.dataset.v79 = '';
  }

  function helpMobile() {
    return '手机：左下摇杆移动，右下主按钮互动（进入/骑车/还车/查看会随情境变化），☰ 打开菜单（成就、传送、拍照、沉浸、备份、关于等都在里面）。双指捏合缩放。拍照模式可拖动画布并点快门。电脑快捷键仍然可用。';
  }

  async function savePhoto() {
    if (!window.__v78) return;
    // 让 v78 先画一帧带水印；我们拦截下载失败时走分享/新标签
    const prev = HTMLAnchorElement.prototype.click;
    let blobUrl = null, used = false;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download && this.href && this.href.indexOf('blob:') === 0) {
        blobUrl = this.href; used = true;
        // iOS：尝试 share，否则新开
        (async () => {
          try {
            const blob = await fetch(blobUrl).then(r => r.blob());
            const file = new File([blob], 'nuc-campus.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: '中北大学像素校园' });
              A && A.toast('✔ 已调起分享', 2000); return;
            }
          } catch (e) { /* fall through */ }
          // 新标签打开，用户可长按保存
          const w = window.open(blobUrl, '_blank'); if (!w) A && A.toast('请允许弹窗，或长按图片保存', 3000);
          else A && A.toast('✔ 已打开图片，长按即可保存', 2500);
        })();
        return;
      }
      return prev.apply(this, arguments);
    };
    try { __v78.snapPhoto(); } finally { setTimeout(() => { HTMLAnchorElement.prototype.click = prev; }, 0); }
  }


  // Fix photo pan properly in tick instead
  let panLast = null;
  function onPhotoTouch() {
    const cv = $('view'); if (!cv || cv._v79pan2) return; cv._v79pan2 = 1;
    cv.addEventListener('touchstart', e => {
      if (!(window.V78 && V78.frozen && V78.frozen())) { panLast = null; return; }
      if (e.touches.length === 1) panLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      else panLast = null;
    }, { passive: true });
    cv.addEventListener('touchmove', e => {
      if (!panLast || !(window.V78 && V78.frozen && V78.frozen()) || e.touches.length !== 1) return;
      const t = e.touches[0], dx = t.clientX - panLast.x, dy = t.clientY - panLast.y;
      panLast = { x: t.clientX, y: t.clientY };
      const sc = A.scale(), dpr = A.S.dpr || 1;
      A.cam.x -= (dx * dpr) / sc; A.cam.y -= (dy * dpr) / sc;
      if (window.__v78 && __v78._setCam) __v78._setCam(A.cam.x, A.cam.y);
    }, { passive: true });
    cv.addEventListener('touchend', () => { panLast = null; });
  }

  function updateFab() {
    const fab = $('fab'), lab = $('fablab'), ic = $('fabicon'); if (!fab || !A) return;
    if (!document.body.classList.contains('touch')) { fab.style.display = 'none'; return; }
    if (window.V78 && V78.frozen && V78.frozen()) {
      fab.style.display = 'flex'; ic.textContent = '📷'; lab.textContent = '快门'; fab.classList.add('on'); return;
    }
    const hint = A.S.hint, riding = window.V77 && V77.riding && V77.riding();
    const a = C.actionLabel(hint, riding);
    if (!a) { fab.style.display = 'none'; fab.classList.remove('on'); return; }
    fab.style.display = 'flex'; ic.textContent = a.icon; lab.textContent = a.text; fab.classList.add('on');
  }

  function hookMenubtn() {
    let b = $('menubtn'); if (!b) return;
    const nb = b.cloneNode(true); b.parentNode.replaceChild(nb, b); b = nb; b.id = 'menubtn';
    const open = e => { e.preventDefault(); e.stopPropagation();
      rebuildMenu();
      if ($('menu').classList.contains('on') || sheetOpen === 'menu') closeSheets();
      else openSheet('menu');
    };
    b.addEventListener('touchstart', open, { passive: false });
    b.addEventListener('click', open);
  }

  function bindPause() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        paused = true; document.body.classList.add('paused');
        if (A && A.save) A.save();
      }
    });
  }

  function bindGestures() {
    // 禁止双击缩放、长按呼出、选择
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
    document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
    let lp = null;
    document.addEventListener('touchstart', e => {
      if (e.touches.length === 1) lp = setTimeout(() => {}, 500);
    }, { passive: true });
    document.addEventListener('touchend', () => { clearTimeout(lp); });
    document.addEventListener('contextmenu', e => { if (isTouch()) e.preventDefault(); });
  }

  function patchTipPosition() {
    // wrap tip placement: keep inside viewport
    const tip = $('tip'); if (!tip || tip._v79) return; tip._v79 = 1;
    const obs = new MutationObserver(() => {
      if (!tip.classList.contains('on') && !tip.classList.contains('tap')) return;
      const r = tip.getBoundingClientRect(), pad = 8;
      let x = parseFloat(tip.style.left) || r.left, y = parseFloat(tip.style.top) || r.top;
      if (r.right > innerWidth - pad) tip.style.left = Math.max(pad, innerWidth - r.width - pad) + 'px';
      if (r.bottom > innerHeight - pad) tip.style.top = Math.max(pad, innerHeight - r.height - pad) + 'px';
      if (r.left < pad) tip.style.left = pad + 'px';
      if (r.top < pad) tip.style.top = pad + 'px';
    });
    obs.observe(tip, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  function editorBanner() {
    if (!/editor\.html/.test(location.pathname + location.href)) return;
    if (!isTouch()) return;
    const kind = C.classify(innerWidth, innerHeight, true);
    if (kind === 'phone' || kind === 'phone-land') {
      const b = el('div', 'ednote', 'ednote panel', '📱 地图编辑器在手机上操作受限，建议用平板或电脑。<br><button type="button" id="ednote-ok">仍要试用</button> <a class="btn" href="index.html">回游戏</a>');
      tap($('ednote-ok'), () => b.remove());
      document.body.classList.add('touch', 'phone', 'editor-mobile');
    } else {
      document.body.classList.add('touch', 'tablet', 'editor-mobile');
    }
  }

  window.V79 = {
    paused: () => paused,
    init(api) {
      A = api;
      layoutClass();
      buildChrome();
      rebuildMenu();
      hookMenubtn();
      bindPause();
      bindGestures();
      // v7.10 大地图上的「用列表直接去」：手机上点不准地图时，一条路走到地标列表
      { const bmn = $('bigmapnav'); if (bmn) tap(bmn, () => { A.S.showMap = false; openLandmarks(); }); }
      // 触屏上地图只是「看个大概」，把标题里的提示换成实话
      if (document.body.classList.contains('touch')) {
        const t = document.querySelector('#bigwrap .title .small');
        if (t) t.textContent = '（手机上请用下面的列表 · 右下角可关闭）';
      }
      // v7.10 右上角小地图也能点开导航（108px，比地图里任何一栋楼都大）
      { const mm = $('mmwrap'); if (mm) tap(mm, () => { if (A.S.mode !== 'out') return; A.S.showMap = false; openLandmarks(); }); }
      onPhotoTouch();
      patchTipPosition();
      // hide legacy floating controls on phone — CSS also hides
      addEventListener('resize', () => layoutClass());
      addEventListener('orientationchange', () => setTimeout(layoutClass, 150));
      if (window.visualViewport) visualViewport.addEventListener('resize', () => layoutClass());
      // quests collapsed by default on phone（v7.9.3：要真的重绘，否则面板还是展开的）
      if (document.body.classList.contains('phone') && A.S && A.S.showQuests && A.toggleQuests) A.toggleQuests();
      if (window.InputMode) InputMode.onChange(() => { layoutClass(); updateFab(); });
      window.__v79 = {
        classify: C.classify, actionLabel: C.actionLabel, openSheet, closeSheets, openLandmarks, openAbout, cycleInputMode, setInputMode: m => { if (window.InputMode) { InputMode.setMode(m); layoutClass(); updateFab(); } },
        measure: () => {
          const ids = ['fab', 'menubtn', 'joy', 'mute', 'topleft', 'mmwrap'];
          const out = {};
          for (const id of ids) {
            const e = $(id); if (!e) continue;
            const r = e.getBoundingClientRect(), st = getComputedStyle(e);
            if (st.display === 'none' || +st.opacity === 0) { out[id] = { hidden: true }; continue; }
            out[id] = { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
          }
          return { vw: innerWidth, vh: innerHeight, boxes: out, kind: C.classify(innerWidth, innerHeight, isTouch()) };
        },
      };
    },
    tick() {
      updateFab();
      document.body.classList.toggle('photo', !!(window.V78 && V78.frozen && V78.frozen()));
      if (document.body.classList.contains('touch')) {
        const ap = $('achpanel');
        if (ap && ap.classList.contains('on') && !ap.classList.contains('sheet-on')) sheetify('achpanel');
      }
      // sync v78 cam from drag
      if (window.V78 && V78.frozen && V78.frozen() && window.__v78 && __v78._setCam) __v78._setCam(A.cam.x, A.cam.y);
    },
  };

  // editor page auto-init
  if (/editor\.html/.test(location.href)) {
    addEventListener('DOMContentLoaded', editorBanner);
    if (document.readyState !== 'loading') editorBanner();
  }
})();

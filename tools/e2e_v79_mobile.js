// v7.9 手机 e2e：多尺寸点按全功能，断言目标≥44、无溢出、无重叠、无 pageerror
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const B = 'http://localhost:8771/';
const OUT = '/workspace/nuc/shots/v79_audit';
const C = require('/workspace/nuc/game/js/v79core.js');
const DEVICES = [
  { name: 'iphone_se', w: 375, h: 667, dpr: 2 },
  { name: 'iphone_14', w: 390, h: 844, dpr: 3 },
  { name: 'iphone_14_land', w: 844, h: 390, dpr: 3 },
  { name: 'pixel', w: 360, h: 780, dpr: 2.75 },
  { name: 'pro_max', w: 430, h: 932, dpr: 3 },
  { name: 'ipad', w: 820, h: 1180, dpr: 2 },
];

async function auditUI(page) {
  return page.evaluate((MIN) => {
    const vw = innerWidth, vh = innerHeight, issues = [];
    const ids = ['fab', 'menubtn', 'joy', 'topleft', 'mmwrap', 'menu', 'achpanel', 'tp', 'photoui'];
    const boxes = {};
    for (const id of ids) {
      const el = document.getElementById(id); if (!el) continue;
      const st = getComputedStyle(el);
      const shown = st.display !== 'none' && st.visibility !== 'hidden' && +st.opacity > 0.05 && el.classList.contains('on') !== false;
      // for menu-like, only measure if .on
      const isPanel = ['menu','achpanel','tp','about'].includes(id);
      if (isPanel && !el.classList.contains('on')) { boxes[id] = { hidden: true }; continue; }
      if (!isPanel && (st.display === 'none' || +st.opacity === 0)) { boxes[id] = { hidden: true }; continue; }
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) { boxes[id] = { hidden: true }; continue; }
      boxes[id] = { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      if (r.right > vw + 2 || r.bottom > vh + 2 || r.left < -2 || r.top < -2)
        issues.push({ kind: 'overflow', id, r: boxes[id], vw, vh });
    }
    // interactive targets
    for (const id of ['menubtn', 'joy']) {
      const b = boxes[id]; if (!b || b.hidden) continue;
      if (b.w < MIN || b.h < MIN) issues.push({ kind: 'tiny', id, w: b.w, h: b.h });
    }
    if (boxes.fab && !boxes.fab.hidden && (boxes.fab.w < MIN || boxes.fab.h < MIN))
      issues.push({ kind: 'tiny', id: 'fab', w: boxes.fab.w, h: boxes.fab.h });
    // overlap joy vs menubtn / fab
    const ints = ['joy', 'menubtn', 'fab'].map(id => boxes[id]).filter(b => b && !b.hidden);
    const names = ['joy', 'menubtn', 'fab'].filter(id => boxes[id] && !boxes[id].hidden);
    for (let i = 0; i < ints.length; i++) for (let j = i + 1; j < ints.length; j++) {
      const a = ints[i], b = ints[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.x, b.x);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      if (ox > 6 && oy > 6) issues.push({ kind: 'overlap', a: names[i], b: names[j], ox, oy });
    }
    return { vw, vh, dpr: devicePixelRatio, issues, boxes, body: document.body.className, kind: window.__v79 && __v79.measure().kind };
  }, C.MIN_TARGET);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const failures = [];
  for (const d of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(B + 'index.html?nosave&touch=1&x=425.67&y=228&t=600', { timeout: 60000 });
    await page.waitForFunction(() => window.__game && window.__game.ready && window.__v79, null, { timeout: 90000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => { document.body.classList.add('touch'); if (window.V79) {/* layout */} window.dispatchEvent(new Event('resize')); });
    await page.waitForTimeout(300);

    let m = await auditUI(page);
    await page.screenshot({ path: path.join(OUT, `after_${d.name}_play.png`) });

    // open menu sheet
    await page.tap('#menubtn'); await page.waitForTimeout(400);
    const menuOn = await page.evaluate(() => document.getElementById('menu').classList.contains('on'));
    await page.screenshot({ path: path.join(OUT, `after_${d.name}_menu.png`) });
    m = await auditUI(page);
    if (!menuOn) failures.push(d.name + ': menu not open');
    for (const i of m.issues) failures.push(d.name + ': ' + JSON.stringify(i));

    // achievements via menu button
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('#menu button')].find(x => /成就/.test(x.textContent || ''));
      if (b) b.click();
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `after_${d.name}_ach.png`) });
    await page.evaluate(() => { document.getElementById('achpanel')?.classList.remove('on','sheet-on'); document.body.classList.remove('sheet-open'); });

    // landmarks
    await page.tap('#menubtn'); await page.waitForTimeout(200);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#menu button')].find(x => /地标/.test(x.textContent || '')); if (b) b.click(); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `after_${d.name}_tp.png`) });
    await page.evaluate(() => window.__v79 && __v79.closeSheets());

    // photo
    await page.tap('#menubtn'); await page.waitForTimeout(200);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#menu button')].find(x => /拍照/.test(x.textContent || '')); if (b) b.click(); });
    await page.waitForTimeout(500);
    const photo = await page.evaluate(() => window.__v78 && __v78.photo());
    await page.screenshot({ path: path.join(OUT, `after_${d.name}_photo.png`) });
    if (!photo) failures.push(d.name + ': photo not on');
    await page.evaluate(() => { if (window.__v78) __v78.togglePhoto(false); });

    // FAB near library door should show 进入
    await page.evaluate(() => { __game.teleport(425.67, 227.2); });
    await page.waitForTimeout(400);
    const fab = await page.evaluate(() => { const f = document.getElementById('fab'); const st = getComputedStyle(f); return { display: st.display, text: f && f.innerText, on: f.classList.contains('on') }; });
    await page.screenshot({ path: path.join(OUT, `after_${d.name}_fab.png`) });

    // dpr capped
    const dpr = await page.evaluate(() => window.__game.S.dpr);
    if (dpr > 2.01) failures.push(d.name + ': dpr ' + dpr);

    if (errs.length) failures.push(d.name + ': pageerror ' + errs.join('|'));
    console.log(d.name, 'menu', menuOn, 'photo', photo, 'fab', fab.text?.replace(/\s+/g,' '), 'dpr', dpr, 'issues', m.issues.length, 'errs', errs.length);
    await ctx.close();
  }
  console.log('FAILURES', failures.length);
  for (const f of failures) console.log(' -', f);
  fs.writeFileSync(path.join(OUT, 'e2e_failures.json'), JSON.stringify(failures, null, 2));
  await browser.close();
  if (failures.length) process.exit(1);
})();

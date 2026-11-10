// v7.9.1 桌面回归：1280x800 / 1920x1080 — 无摇杆/FAB，悬停 tip，快捷键，无 pageerror
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const B = 'http://localhost:8771/';
const OUT = '/workspace/nuc/shots';
const SIZES = [
  { name: 'desktop_1280', w: 1280, h: 800 },
  { name: 'desktop_1920', w: 1920, h: 1080 },
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const fails = [];
  for (const d of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1, hasTouch: false, isMobile: false });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(B + 'index.html?nosave&input=desktop&x=425.67&y=228&t=600', { timeout: 60000 });
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 90000 });
    await page.waitForTimeout(800);
    // force desktop mode via API too
    await page.evaluate(() => { if (window.InputMode) InputMode.setMode('desktop'); if (window.__v79) __v79.setInputMode('desktop'); });
    await page.waitForTimeout(200);

    const ui = await page.evaluate(() => {
      const joy = document.getElementById('joy'), fab = document.getElementById('fab');
      const st = el => { if (!el) return { missing: true }; const s = getComputedStyle(el); return { display: s.display, opacity: s.opacity, w: el.getBoundingClientRect().width }; };
      return {
        body: document.body.className,
        mode: window.InputMode && InputMode.snapshot(),
        joy: st(joy), fab: st(fab),
        menubtn: st(document.getElementById('menubtn')),
      };
    });
    console.log(d.name, ui.body, ui.mode);
    if (ui.body.includes('touch')) fails.push(d.name + ': body has touch class on desktop mode');
    if (ui.joy.display !== 'none' && ui.joy.w > 0 && +ui.joy.opacity > 0) fails.push(d.name + ': joystick visible');
    if (ui.fab.display !== 'none' && ui.fab.w > 0 && +ui.fab.opacity > 0) fails.push(d.name + ': fab visible');

    // hover tip
    const tipOn = await page.evaluate(() => {
      const cv = document.getElementById('view');
      const r = cv.getBoundingClientRect();
      const ev = new MouseEvent('mousemove', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 - 30, bubbles: true });
      cv.dispatchEvent(ev);
      const tip = document.getElementById('tip');
      return tip && tip.classList.contains('on') ? tip.innerText.slice(0, 40) : null;
    });
    console.log(d.name, 'tip', tipOn);
    // tip may be null if no building under center — move to library door area via teleport already at 425,228
    // try a few offsets
    if (!tipOn) {
      const tip2 = await page.evaluate(() => {
        const cv = document.getElementById('view'), tip = document.getElementById('tip'), r = cv.getBoundingClientRect();
        for (const [dx, dy] of [[0, -40], [0, -80], [20, -60], [-20, -60], [0, 0]]) {
          cv.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + r.width / 2 + dx, clientY: r.top + r.height / 2 + dy, bubbles: true }));
          if (tip.classList.contains('on')) return tip.innerText.slice(0, 60);
        }
        return null;
      });
      console.log(d.name, 'tip2', tip2);
      if (!tip2) fails.push(d.name + ': hover tip did not show near library');
    }

    // shortcuts
    const keys = [
      ['z', () => page.evaluate(() => document.body.classList.contains('immersive'))],
      ['z', null], // toggle off
      ['k', () => page.evaluate(() => document.getElementById('achpanel').classList.contains('on'))],
      ['Escape', null],
      ['y', () => page.evaluate(() => document.getElementById('tp').classList.contains('on'))],
      ['Escape', null],
      ['Tab', () => page.evaluate(() => document.getElementById('menu').classList.contains('on'))],
      ['Escape', null],
      ['p', () => page.evaluate(() => window.__v78 && __v78.photo())],
      ['Escape', null],
    ];
    // B near station - teleport to a station first
    await page.evaluate(() => {
      const st = window.V77Core.STATIONS[0];
      __game.teleport(st.x, st.y);
    });
    await page.waitForTimeout(300);

    for (const [k, check] of keys) {
      if (k === 'Tab') await page.keyboard.press('Tab');
      else if (k === 'Escape') await page.keyboard.press('Escape');
      else await page.keyboard.press(k);
      await page.waitForTimeout(250);
      if (check) {
        const ok = await check();
        console.log(d.name, 'key', k, ok);
        if (!ok) fails.push(d.name + ': shortcut ' + k + ' failed');
      }
    }
    // B ride
    await page.keyboard.press('b');
    await page.waitForTimeout(400);
    const riding = await page.evaluate(() => window.V77 && V77.riding());
    console.log(d.name, 'ride', riding);
    if (!riding) fails.push(d.name + ': B ride failed');
    await page.keyboard.press('b'); // park if possible
    await page.waitForTimeout(300);

    // input mode cycle exists
    const modeOk = await page.evaluate(() => {
      if (!window.InputMode) return false;
      InputMode.setMode('touch');
      const t1 = document.body.classList.contains('touch');
      InputMode.setMode('desktop');
      const t2 = !document.body.classList.contains('touch');
      InputMode.setMode('auto');
      return t1 && t2;
    });
    if (!modeOk) fails.push(d.name + ': mode switch live failed');

    await page.evaluate(() => InputMode.setMode('desktop'));
    await page.screenshot({ path: path.join(OUT, `v791_${d.name}.png`) });
    if (errs.length) fails.push(d.name + ': ' + errs.join('|'));
    await ctx.close();
  }
  console.log('FAILURES', fails.length);
  fails.forEach(f => console.log(' -', f));
  fs.writeFileSync(path.join(OUT, 'v791_desktop_e2e.json'), JSON.stringify(fails, null, 2));
  await browser.close();
  if (fails.length) process.exit(1);
})();

// v7.9 手机适配审计：多机型截图 + 控件尺寸/溢出/重叠检测
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const B = 'http://localhost:8771/';
const OUT = '/workspace/nuc/shots/v79_audit';
const DEVICES = [
  { name: 'iphone_se', w: 375, h: 667, dpr: 2, land: false },
  { name: 'iphone_se_land', w: 667, h: 375, dpr: 2, land: true },
  { name: 'iphone_14', w: 390, h: 844, dpr: 3, land: false },
  { name: 'iphone_14_land', w: 844, h: 390, dpr: 3, land: true },
  { name: 'pixel', w: 360, h: 780, dpr: 2.75, land: false },
  { name: 'pixel_land', w: 780, h: 360, dpr: 2.75, land: true },
  { name: 'pro_max', w: 430, h: 932, dpr: 3, land: false },
  { name: 'pro_max_land', w: 932, h: 430, dpr: 3, land: true },
  { name: 'ipad', w: 820, h: 1180, dpr: 2, land: false },
  { name: 'ipad_land', w: 1180, h: 820, dpr: 2, land: true },
];
const IDS = ['topleft','quests','mmwrap','mute','menubtn','ebtn','ridebtn','joy','immbtn','intro','hint','achtoast','toast','help'];

async function measure(page) {
  return page.evaluate((IDS) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const issues = [];
    const boxes = {};
    const safe = { t: 0, r: 0, b: 0, l: 0 }; // headless can't get env() easily; we note CSS presence separately
    for (const id of IDS) {
      const el = document.getElementById(id);
      if (!el) { issues.push({ kind: 'missing', id }); continue; }
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) { boxes[id] = { hidden: true }; continue; }
      const r = el.getBoundingClientRect();
      boxes[id] = { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      if (r.width > 0 && r.height > 0) {
        if (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1)
          issues.push({ kind: 'overflow', id, r: { x: r.x, y: r.y, w: r.width, h: r.height }, vw, vh });
        // touch targets for buttons
        if (['mute','menubtn','ebtn','ridebtn','immbtn','joy'].includes(id)) {
          if (r.width < 44 || r.height < 44) issues.push({ kind: 'tiny', id, w: r.width, h: r.height });
        }
      }
    }
    // overlap between interactive HUD
    const ints = ['mute','menubtn','ebtn','ridebtn','joy','immbtn'].map(id => boxes[id]).filter(b => b && !b.hidden);
    for (let i = 0; i < ints.length; i++) for (let j = i + 1; j < ints.length; j++) {
      const a = ints[i], b = ints[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.x, b.x);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      if (ox > 4 && oy > 4) issues.push({ kind: 'overlap', a: Object.keys(boxes).find(k => boxes[k]===a), b: Object.keys(boxes).find(k => boxes[k]===b), ox, oy });
    }
    // font sizes too small
    for (const sel of ['.panel', '#clock', '#area', '#quests', '#menu button', '#hint']) {
      const el = document.querySelector(sel); if (!el) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs && fs < 14 && getComputedStyle(el).display !== 'none') issues.push({ kind: 'font', sel, fs });
    }
    // keyboard-only features without visible touch affordance
    const need = [
      { feat: '成就面板', ok: !!document.getElementById('menubtn') },
      { feat: '拍照', ok: !!document.querySelector('#menu button') },
      { feat: '沉浸', ok: !!document.getElementById('immbtn') },
      { feat: '地标', ok: !!document.querySelector('#menu button') },
    ];
    return { vw, vh, dpr: devicePixelRatio, issues, boxes, body: document.body.className, need };
  }, IDS);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const all = [];
  for (const d of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: d.w, height: d.h },
      deviceScaleFactor: d.dpr,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(B + 'index.html?nosave&touch=1&x=425.67&y=228&t=600', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 90000 });
    await page.waitForTimeout(900);
    // force touch class
    await page.evaluate(() => document.body.classList.add('touch'));
    await page.waitForTimeout(200);
    const m0 = await measure(page);
    await page.screenshot({ path: path.join(OUT, `${d.name}_01_play.png`) });
    // open menu
    await page.evaluate(() => { const b = document.getElementById('menubtn'); if (b) b.click(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${d.name}_02_menu.png`) });
    const menuBox = await page.evaluate(() => { const el = document.getElementById('menu'); if (!el) return null; const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,vw:innerWidth,vh:innerHeight,on:el.classList.contains('on') }; });
    // achievements
    await page.evaluate(() => { document.getElementById('menu')?.classList.remove('on'); if (window.__v77) __v77.togglePanel(true); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${d.name}_03_ach.png`) });
    // landmarks
    await page.evaluate(() => { document.getElementById('achpanel')?.classList.remove('on'); document.getElementById('menubtn')?.click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      document.getElementById('menu')?.classList.remove('on');
      if (window.V78 && V78.key) { /* open landmarks via API */ }
      const tp = document.getElementById('tp');
      if (tp) { tp.classList.add('on'); tp.innerHTML = tp.innerHTML || '<div class="mt">地标</div>'; }
      // trigger showLandmarks through menu item eval
      const btns = [...document.querySelectorAll('#menu button')];
      const b = btns.find(x => /地标/.test(x.textContent||''));
      if (b) b.click();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${d.name}_04_tp.png`) });
    await page.evaluate(() => { document.getElementById('tp')?.classList.remove('on'); document.getElementById('menu')?.classList.remove('on'); });
    // photo mode
    await page.keyboard.press('p'); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${d.name}_05_photo.png`) });
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    // tap inspect tip
    await page.evaluate(() => { if (window.V77 && V77.tapInspect) { const r = document.getElementById('view').getBoundingClientRect(); V77.tapInspect(r.left + r.width/2, r.top + r.height/2 - 40); } });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${d.name}_06_tip.png`) });
    // immersive
    await page.keyboard.press('z'); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${d.name}_07_immersive.png`) });
    await page.keyboard.press('z');
    // editor
    const ep = await ctx.newPage();
    await ep.goto(B + 'editor.html?pristine&at=425,228,2', { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await ep.waitForFunction(() => window.__ed && window.__ed.ready, null, { timeout: 60000 }); await ep.waitForTimeout(800); await ep.screenshot({ path: path.join(OUT, `${d.name}_08_editor.png`) }); }
    catch (e) { errs.push('editor:' + e.message); }
    await ep.close();
    all.push({ device: d, measure: m0, menuBox, errs });
    await ctx.close();
    console.log(d.name, 'issues', m0.issues.length, 'errs', errs.length);
  }
  fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(all, null, 2));
  // summary
  const byKind = {};
  for (const a of all) for (const i of a.measure.issues) { byKind[i.kind] = (byKind[i.kind] || 0) + 1; }
  console.log('SUMMARY', JSON.stringify(byKind));
  console.log('menu overflows', all.filter(a => a.menuBox && (a.menuBox.bottom > a.menuBox.vh || a.menuBox.w > a.menuBox.vw)).map(a => a.device.name));
  await browser.close();
})();

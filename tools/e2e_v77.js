// v7.7 e2e：骑车 + 停车点、二龙山成就 toast、手机竖屏 / 横屏（触屏模拟）
const { chromium } = require('playwright-core'); const U = 'http://localhost:8771/index.html?nosave&resetach&t=600';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const errs = [];
  const open = async (opt, q) => { const c = await b.newContext(opt); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.stack)); p.on('requestfailed', r => errs.push('reqfail ' + r.url()));
    p.on('request', r => { if (!r.url().startsWith('http://localhost:8771/') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) errs.push('external ' + r.url()); });
    await p.goto(U + (q || '')); await p.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 60000 }); await p.waitForTimeout(800); return p; };
  const p = await open({ viewport: { width: 1280, height: 720 } }, '&zoom=2');
  const st = await p.evaluate(() => { const s = window.__v77.stations.find(s => s.id === 's6'); const g = window.__game; g.player.x = s.x; g.player.y = s.y + 0.4; g.S.dialog = null; return s; });
  await p.waitForTimeout(500); console.log('hint', await p.evaluate(() => window.__game.S.hint && window.__game.S.hint.text));
  await p.keyboard.press('b'); await p.waitForTimeout(300); console.log('riding', await p.evaluate(() => window.__v77.ride()));
  const x0 = await p.evaluate(() => window.__game.player.x); await p.keyboard.down('d'); await p.waitForTimeout(700); await p.keyboard.up('d');
  const x1 = await p.evaluate(() => window.__game.player.x); console.log('ride dx/0.7s', (x1 - x0).toFixed(2));
  await p.evaluate(() => { const g = window.__game; g.player.x -= 6.2; }); await p.waitForTimeout(400);
  await p.screenshot({ path: '/workspace/nuc/shots/v77_ebike_ride.png' });
  await p.keyboard.press('b'); await p.waitForTimeout(300); console.log('parked', !(await p.evaluate(() => window.__v77.ride())), JSON.stringify(await p.evaluate(() => window.__v77.ach.got)));
  await p.waitForTimeout(9500);
  await p.evaluate(() => { const g = window.__game; g.player.x = 126; g.player.y = 176; }); await p.waitForTimeout(900);
  await p.screenshot({ path: '/workspace/nuc/shots/v77_achievement_toast.png' }); console.log('lastAch', await p.evaluate(() => window.__lastAch));
  await p.keyboard.press('k'); await p.waitForTimeout(300); await p.screenshot({ path: '/workspace/nuc/shots/v77_achievements_panel.png' }); await p.keyboard.press('k');
  for (const [w, h, name] of [[390, 844, 'v77_mobile_portrait'], [844, 390, 'v77_mobile_landscape']]) {
    const m = await open({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 }, '&touch=1');
    await m.evaluate(() => { const s = window.__v77.stations.find(s => s.id === 's10'); const g = window.__game; g.player.x = s.x + 3; g.player.y = s.y + 0.4; });
    const jb = await m.locator('#joy').boundingBox(); const cx = jb.x + jb.width / 2, cy = jb.y + jb.height / 2;
    const cdp = await m.context().newCDPSession(m); const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const y0 = await m.evaluate(() => window.__game.player.x); await tp('touchStart', cx, cy); await tp('touchMove', cx - 30, cy); await tp('touchMove', cx - 50, cy - 4); await m.waitForTimeout(500);
    await m.screenshot({ path: `/workspace/nuc/shots/${name}.png` }); await tp('touchEnd'); const y1 = await m.evaluate(() => window.__game.player.x);
    const info = await m.evaluate(() => ({ cw: document.getElementById('view').width, iw: innerWidth, dpr: devicePixelRatio, scrollY, touch: document.body.classList.contains('touch') }));
    console.log(name, 'joystick dx', (y1 - y0).toFixed(2), JSON.stringify(info));
    const pt = await m.evaluate(() => { const g = window.__game, cv = document.getElementById('view'), r = cv.getBoundingClientRect(), s = (g.S.zoom) * devicePixelRatio; for (let y = 120; y < innerHeight - 200; y += 12) for (let x = 20; x < innerWidth - 20; x += 12) { const X = x * cv.width / r.width, Y = y * cv.height / r.height, ox = Math.round(cv.width / 2 - g.cam.x * s), oy = Math.round(cv.height / 2 - g.cam.y * s); const b = window.__hoverAt((X - ox) / s / 16, (Y - oy) / s / 16); if (b && window.NUC_TIPS.tipFor(b.name) && document.elementFromPoint(x, y) === cv) return [x, y]; } return null; });
    if (pt) await m.touchscreen.tap(pt[0], pt[1]); await m.waitForTimeout(300); if (name.includes('portrait')) await m.screenshot({ path: '/workspace/nuc/shots/v77_mobile_tap_inspect.png' }); console.log('tap tip', pt, await m.evaluate(() => document.getElementById('tip').className + ' ' + document.getElementById('tip').textContent.slice(0, 40)));
  }
  console.log('errors', errs); await b.close();
})();

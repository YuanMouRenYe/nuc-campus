const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?nosave&touch=1&t=600');
  await p.waitForFunction(() => window.__game && window.__game.ready);
  const cdp = await ctx.newCDPSession(p);
  const pinch = async (a, b2) => {
    const pts = d => [{ x: 200 - d / 2, y: 400, id: 1 }, { x: 200 + d / 2, y: 400, id: 2 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(a) });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(a + (b2 - a) * i / 10) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const z = () => p.evaluate(() => window.__game.S.zoom);
  console.log('start', await z());
  await pinch(200, 60); console.log('after pinch in(out)', await z());
  await pinch(60, 250); console.log('after spread', await z());
  // a single tap still works as stick/tap: drag
  const x0 = await p.evaluate(() => window.__game.player.x);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 400, id: 3 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 260, y: 400, id: 3 }] });
  await p.waitForTimeout(600);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  console.log('stick moved', (await p.evaluate(() => window.__game.player.x)) - x0);
  console.log('errors', errs);
  await b.close();
})();

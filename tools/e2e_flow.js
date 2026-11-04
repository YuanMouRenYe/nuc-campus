// Manual end-to-end check (not part of npm test): serve game/ on :8765, then `node tools/e2e_flow.js` with playwright-core + Chrome installed.
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?interior=main'); await p.waitForFunction(() => window.__game && window.__game.ready);
  await p.waitForTimeout(1000); console.log(await p.evaluate(() => JSON.stringify({f:__game.S.fade,fd:__game.S.fadeDir,d:__game.S.dialog,x:__game.player.x,y:__game.player.y}))); await p.evaluate(() => { __game.player.x = 2.5; __game.player.y = 5.6; });
  await p.keyboard.down('w'); await p.waitForTimeout(900); await p.keyboard.up('w'); await p.waitForTimeout(800);
  console.log('after up:', await p.evaluate(() => [__game.S.interior.key, __game.player.x.toFixed(2), __game.player.y.toFixed(2)]));
  await p.keyboard.down('s'); await p.waitForTimeout(500); await p.keyboard.up('s'); await p.waitForTimeout(200);
  await p.keyboard.down('w'); await p.waitForTimeout(900); await p.keyboard.up('w'); await p.waitForTimeout(800);
  console.log('after down:', await p.evaluate(() => [__game.S.interior.key, __game.player.x.toFixed(2), __game.player.y.toFixed(2)]));
  // walk out through main door
  await p.evaluate(() => { __game.player.x = 12.5; __game.player.y = 13.2; });
  await p.keyboard.down('s'); await p.waitForTimeout(700); await p.keyboard.up('s'); await p.waitForTimeout(800);
  console.log('after exit:', await p.evaluate(() => [__game.S.mode, __game.player.x.toFixed(1), __game.player.y.toFixed(1)]));
  // enter classroom building from outside via door
  await p.evaluate(() => { const b = __game.M.buildings.find(b => b.enter === 'classroom'); __game.teleport(b.door[0], b.door[1] + 1.2); });
  await p.waitForTimeout(300); await p.keyboard.press('e'); await p.waitForTimeout(900);
  console.log('enter classroom:', await p.evaluate(() => [__game.S.mode, __game.S.interior && __game.S.interior.key, __game.S.hint && __game.S.hint.text]));
  console.log(errs.join('\n')); await b.close();
})();

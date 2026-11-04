// Manual end-to-end check for phase 3 (not part of npm test): quests, canteen/library actions, bells, save + reload.
// Serve game/ on :8765, then run with playwright-core + Chrome installed.
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const ready = () => p.waitForFunction(() => window.__game && window.__game.ready);
  const st = () => p.evaluate(() => ({ mode: __game.S.mode, key: __game.S.interior && __game.S.interior.key, x: +__game.player.x.toFixed(2), y: +__game.player.y.toFixed(2), done: Object.keys(__game.S.quests.done), toast: __game.S.toast && __game.S.toast.text, dialog: __game.S.dialog, hint: __game.S.hint && __game.S.hint.text }));
  await p.goto('http://localhost:8765/index.html?reset&x=480&y=270&t=479'); await ready();
  await p.waitForTimeout(1500); console.log('bell:', (await st()).toast);
  const enter = (key, re) => p.evaluate(([key, re]) => { const g = __game, b = g.M.buildings.find(b => new RegExp(re).test(b.name) && (b.enter === key || key === 'library2')); g.enterInterior(key, b, true); }, [key, re]);
  await enter('classroom', '12号楼'); await p.evaluate(() => { __game.player.x = 20.5; __game.player.y = 6.6; }); await p.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { const a = await p.evaluate(() => __game.S.quiz && __game.S.quiz.qs[__game.S.quiz.i].a); if (a == null) break; await p.keyboard.press(String(a + 1)); await p.waitForTimeout(900); } // phase 4: 302 高数小测
  console.log('class:', await st()); await p.keyboard.press('e');
  await enter('canteen', '学生一食堂'); await p.evaluate(() => { __game.player.x = 26.5; __game.player.y = 6.7; __game.player.dir = 1; }); await p.waitForTimeout(200);
  console.log('canteen hint:', (await st()).hint); await p.keyboard.press('e'); await p.waitForTimeout(300); console.log('noodle:', await st()); await p.keyboard.press('e');
  await enter('library2', '^图书馆$'); await p.evaluate(() => { __game.player.x = 23.5; __game.player.y = 9.9; }); await p.waitForTimeout(200);
  console.log('library2 hint:', (await st()).hint); await p.keyboard.press('e'); await p.waitForTimeout(300); console.log('borrow:', await st()); await p.keyboard.press('e');
  await p.evaluate(() => { __game.exitInterior(); __game.teleport(126, 176.5); }); await p.waitForTimeout(400); console.log('hill:', await st());
  await p.evaluate(() => { __game.S.zoom = 0.5; __game.save(); });
  await p.goto('http://localhost:8765/index.html'); await ready(); await p.waitForTimeout(500);
  console.log('after reload:', await st(), await p.evaluate(() => ({ zoom: __game.S.zoom, minutes: Math.floor(__game.S.minutes), panel: document.getElementById('qlist').innerText.split('\n').length })));
  await p.evaluate(() => { __game.enterInterior('library2', __game.M.buildings.find(b => b.name === '图书馆'), true); __game.player.x = 12.5; __game.player.y = 8; __game.save(); });
  await p.goto('http://localhost:8765/index.html'); await ready(); await p.waitForTimeout(300); console.log('reload inside:', await st());
  await p.goto('http://localhost:8765/index.html?reset&nosave'); await ready(); console.log('reset:', (await st()).done);
  console.log('errors:', errs); await b.close();
})();

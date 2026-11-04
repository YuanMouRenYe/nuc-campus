// e2e: walk into 12号楼 302 -> 高数小测 pops; answer 2 right (keys) + 1 wrong (tap) -> class quest done; day roll -> log
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1024, height: 576 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?nosave&t=600&interior=classroom&b=' + encodeURIComponent('12号楼'));
  await p.waitForFunction(() => window.__game && window.__game.ready); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__game.player.x = 20; window.__game.player.y = 6.5; }); await p.waitForTimeout(500);
  const quiz = () => p.evaluate(() => { const z = window.__game.S.quiz; return z && { i: z.i, a: z.qs[z.i].a, right: z.right }; });
  let z = await quiz(); console.log('quiz open', !!z, await p.isVisible('#quiz'));
  await p.keyboard.press(String(z.a + 1)); await p.waitForTimeout(900);
  z = await quiz(); await p.keyboard.press(String(z.a + 1)); await p.waitForTimeout(900);
  z = await quiz(); await p.click(`#quiz .opt[data-k="${(z.a + 1) % 4}"]`); await p.waitForTimeout(400);
  await p.screenshot({ path: 'shots/t4_quizwrong.png' }); await p.waitForTimeout(1400);
  const r = await p.evaluate(() => ({ quiz: window.__game.S.quiz, dlg: window.__game.S.dialog, done: window.__game.S.quests.done }));
  console.log('after', r.quiz, r.dlg, JSON.stringify(r.done), await p.isVisible('#quiz'));
  await p.screenshot({ path: 'shots/t4_quizdone.png' });
  await p.evaluate(() => { window.__game.S.dialog = null; window.__game.S.minutes += 1440; }); await p.waitForTimeout(400);
  console.log('roll', JSON.stringify(await p.evaluate(() => window.__game.S.quests)));
  console.log('errors', errs); await b.close();
})();

// v7.7 地图编辑器 e2e：界面截图、拉直台阶（前后对比）、撤销/重做、保存→游戏读取覆盖→重置、导出
const { chromium } = require('playwright-core'); const B = 'http://localhost:8771/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1440, height: 860 }, acceptDownloads: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.stack));
  p.on('request', r => { if (!r.url().startsWith(B) && !/^(data|blob):/.test(r.url())) errs.push('external ' + r.url()); }); p.on('dialog', d => d.accept());
  await p.goto(B + 'editor.html?pristine&at=110,161,3'); await p.waitForFunction(() => window.__ed && window.__ed.ready, null, { timeout: 60000 });
  await p.evaluate(() => { __ed.toggleLayer('col', false); }); await p.waitForTimeout(1500);
  // 找一段台阶：在 (100..120, 150..170) 里
  const info = await p.evaluate(() => { const st = __ed.st, gw = st.gw; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 150 * 4; y < 170 * 4; y++) for (let x = 104 * 4; x < 118 * 4; x++) if (st.ground[y * gw + x] === Core.C.STEPS) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; });
  console.log('stair bbox (sub)', JSON.stringify(info));
  const cx = (info.x0 + info.x1) / 8, cy = (info.y0 + info.y1) / 8; await p.evaluate(([x, y]) => { __ed.view.x = x * 16; __ed.view.y = y * 16; __ed.view.z = 4; }, [cx, cy]);
  // 把台阶画歪：用「台阶↑」画笔在右侧加几块凸出
  const toScreen = async (tx, ty) => p.evaluate(([x, y]) => { const r = document.getElementById('cv').getBoundingClientRect(), s = __ed.worldToScreen(x * 16, y * 16); return [r.left + s[0] / devicePixelRatio, r.top + s[1] / devicePixelRatio]; }, [tx, ty]);
  await p.evaluate(() => { __ed.setPal('stairN'); __ed.setTool('brush'); __ed.setSize(3); });
  for (const [dx, dy] of [[1.2, -0.2], [1.6, 0.6], [-0.9, 1.0]]) { const [sx, sy] = await toScreen((dx > 0 ? info.x1 / 4 : info.x0 / 4) + dx, (info.y0 + info.y1) / 8 + dy); await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(sx + 6, sy + 8); await p.mouse.up(); }
  await p.waitForTimeout(800); await p.screenshot({ path: '/tmp/st_before.png' });
  const crooked = await p.evaluate(() => __ed.st.undo.length);
  await p.keyboard.press('s'); const a = await toScreen(info.x0 / 4 - 2.5, info.y0 / 4 - 1.5), c = await toScreen(info.x1 / 4 + 3, info.y1 / 4 + 1.5);
  await p.mouse.move(a[0], a[1]); await p.mouse.down(); await p.mouse.move(c[0], c[1], { steps: 5 }); await p.waitForTimeout(200); await p.screenshot({ path: '/tmp/st_drag.png' }); await p.mouse.up(); await p.waitForTimeout(900);
  await p.screenshot({ path: '/tmp/st_after.png' });
  const after = await p.evaluate(([i]) => { const st = __ed.st, gw = st.gw; let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 140 * 4; y < 180 * 4; y++) for (let x = 95 * 4; x < 125 * 4; x++) if (st.ground[y * gw + x] === Core.C.STEPS) { n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { n, rectFill: n / ((x1 - x0 + 1) * (y1 - y0 + 1)), undo: st.undo.length }; }, [info]);
  console.log('after straighten', JSON.stringify(after), 'steps before', crooked);
  await p.keyboard.press('Control+z'); const u = await p.evaluate(() => __ed.st.undo.length); await p.keyboard.press('Control+y'); console.log('undo/redo', u, await p.evaluate(() => __ed.st.undo.length));
  // 全景界面截图：缩小到 1×，打开碰撞 + 层级，选中一栋建筑
  await p.evaluate(() => { __ed.view.x = 427 * 16; __ed.view.y = 236 * 16; __ed.view.z = 1; __ed.toggleLayer('col', true); __ed.setTool('select'); const i = __ed.M().buildings.findIndex(b => b.name === '图书馆'); __ed.select(i); __ed.runValidate(); });
  await p.waitForTimeout(2500); await p.screenshot({ path: '/workspace/nuc/shots/v77_editor_ui.png' });
  await p.keyboard.press('?'); await p.waitForTimeout(300); await p.screenshot({ path: '/workspace/nuc/shots/v77_editor_help.png' }); await p.keyboard.press('Escape');
  // 导出
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => __ed.exportJSON())]); await dl.saveAs('/tmp/v77_export.json'); console.log('exported', require('fs').statSync('/tmp/v77_export.json').size);
  // 保存到游戏 → 游戏读取
  await p.evaluate(() => __ed.save()); await p.waitForTimeout(500); console.log('saved KB', await p.evaluate(() => (localStorage.getItem(MapEdit.KEY) || '').length / 1024 | 0));
  const gp = await ctx.newPage(); gp.on('pageerror', e => errs.push(e.stack)); await gp.goto(B + 'index.html?nosave'); await gp.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 60000 });
  console.log('game override', await gp.evaluate(() => [window.__game.S.mapOverride, window.__game.ground8()[(Math.floor(161 * 4)) * 3020 + 110 * 4]]));
  await gp.evaluate(() => { MapEdit.resetOverride(localStorage); }); await gp.reload(); await gp.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 60000 }); console.log('after reset', await gp.evaluate(() => window.__game.S.mapOverride));
  console.log('errors', errs); await b.close();
})();

// v7.8 e2e：沉浸、拍照、地标传送、门口名牌、备份、离线
const { chromium } = require('playwright-core'); const B = 'http://localhost:8771/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = [], ext = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  p.on('request', r => { const u = r.url(); if (!u.startsWith(B) && !/^(data|blob):/.test(u)) ext.push(u); });
  await p.goto(B + 'index.html?nosave&x=425.67&y=228&t=600');
  await p.waitForFunction(() => window.__game && window.__game.ready && window.__v78, null, { timeout: 60000 });
  await p.waitForTimeout(1200);
  // 门口名牌：图书馆门前
  const plaque = await p.evaluate(() => { const b = __v78.nearDoor(__game.M.buildings, __game.player.x, __game.player.y); return b && b.name; });
  console.log('plaque', plaque);
  await p.screenshot({ path: '/workspace/nuc/shots/v78_door_plaque.png' });
  // 沉浸
  await p.keyboard.press('z'); await p.waitForTimeout(400);
  const imm = await p.evaluate(() => [document.body.classList.contains('immersive'), __v78.immersive()]);
  console.log('immersive', imm); await p.screenshot({ path: '/workspace/nuc/shots/v78_immersive.png' });
  await p.keyboard.press('z');
  // 拍照
  await p.keyboard.press('p'); await p.waitForTimeout(500);
  console.log('photo', await p.evaluate(() => __v78.photo()));
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), p.keyboard.press('Enter')]);
  const shot = '/tmp/v78_photo.png'; await dl.saveAs(shot);
  console.log('photo bytes', require('fs').statSync(shot).size);
  await p.screenshot({ path: '/workspace/nuc/shots/v78_photo_mode.png' });
  await p.keyboard.press('Escape');
  // 地标传送
  await p.keyboard.press('y'); await p.waitForTimeout(300);
  await p.screenshot({ path: '/workspace/nuc/shots/v78_landmarks.png' });
  await p.click('#tp button[data-i="7"]'); // 彭德怀雕像
  await p.waitForTimeout(800);
  const pos = await p.evaluate(() => [__game.player.x, __game.player.y]);
  console.log('teleported', pos.map(v => +v.toFixed(1)));
  await p.screenshot({ path: '/workspace/nuc/shots/v78_teleport_statue.png' });
  // 关于
  await p.evaluate(() => { document.querySelector('#menu')?.classList.add('on'); });
  await p.waitForTimeout(200);
  const aboutBtn = await p.$('#menu button >> text=关于');
  if (aboutBtn) { await aboutBtn.click(); await p.waitForTimeout(400); await p.screenshot({ path: '/workspace/nuc/shots/v78_about.png' }); await p.keyboard.press('Escape'); }
  // 备份 pack
  const pack = await p.evaluate(() => __v78.pack({ save: { v: 3, x: 1, y: 2 }, achievements: { got: {}, stations: [] } }));
  console.log('pack format', pack.format, pack.version);
  // 手机竖屏紧凑
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { document.body.classList.add('touch'); window.dispatchEvent(new Event('resize')); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: '/workspace/nuc/shots/v78_mobile_compact.png' });
  console.log('errors', errs); console.log('external', ext); await b.close();
})();

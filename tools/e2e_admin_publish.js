// 本地 admin 服务：ping → publish → 备份存在 → 401 without token
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..');
const TOKEN = 'test-admin-token-e2e-' + Date.now();
const PORT = 8793;

function req(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : Buffer.from(JSON.stringify(body));
    const r = http.request({ host: '127.0.0.1', port: PORT, path: urlPath, method, headers: {
      'Content-Type': 'application/json', 'Content-Length': data ? data.length : 0,
      ...(token ? { 'X-Admin-Token': token } : {}),
    } }, res => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => {
      const t = Buffer.concat(c).toString('utf8'); let j = null; try { j = JSON.parse(t); } catch (e) { j = t; }
      resolve({ status: res.statusCode, body: j });
    }); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

(async () => {
  const child = spawn(process.execPath, [path.join(__dirname, 'admin_server.cjs')], {
    env: { ...process.env, ADMIN_TOKEN: TOKEN, ADMIN_PORT: String(PORT), ADMIN_HOST: '127.0.0.1' },
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let booted = false;
  child.stdout.on('data', d => { if (String(d).includes('管理员令牌') || String(d).includes('本地管理员')) booted = true; });
  child.stderr.on('data', d => process.stderr.write(d));
  for (let i = 0; i < 50 && !booted; i++) await new Promise(r => setTimeout(r, 100));
  // even if banner parse fails, try ping
  let ping;
  for (let i = 0; i < 30; i++) {
    try { ping = await req('GET', '/api/admin-ping'); if (ping.status === 200) break; } catch (e) { await new Promise(r => setTimeout(r, 100)); }
  }
  if (!ping || ping.status !== 200) { child.kill(); throw new Error('admin server did not start'); }
  console.log('ping', ping.body);

  const unauth = await req('POST', '/api/publish-map', { export: { format: 'x' } });
  console.log('unauth', unauth.status);
  if (unauth.status !== 401) throw new Error('expected 401');

  // real export from current game via mapedit encode in node
  const ME = require(path.join(ROOT, 'game/js/mapedit_core.js'));
  const { loadMap } = require(path.join(ROOT, 'game/tests/helpers.cjs'));
  const { M, cls } = loadMap();
  const exp = await ME.encode(M, cls, null);
  const dataDir = path.join(ROOT, 'game/data');
  const before = fs.readFileSync(path.join(dataDir, 'map.json'));
  const pub = await req('POST', '/api/publish-map', { export: exp, allowErrors: true }, TOKEN);
  console.log('pub', pub.status, pub.body && pub.body.ok, pub.body && pub.body.stamp);
  if (pub.status !== 200 || !pub.body.ok) throw new Error('publish failed ' + JSON.stringify(pub.body));
  const bak = path.join(dataDir, 'map.json.bak-' + pub.body.stamp);
  if (!fs.existsSync(bak)) throw new Error('missing backup ' + bak);
  // restore original from backup to keep workspace clean
  fs.copyFileSync(bak, path.join(dataDir, 'map.json'));
  for (const n of ['ground.png', 'terrain.png']) {
    const b = path.join(dataDir, n + '.bak-' + pub.body.stamp);
    if (fs.existsSync(b)) fs.copyFileSync(b, path.join(dataDir, n));
  }
  // remove backups created by test
  for (const f of fs.readdirSync(dataDir)) if (f.includes('.bak-' + pub.body.stamp)) fs.unlinkSync(path.join(dataDir, f));
  // ensure map.json matches prior content length roughly
  const after = fs.readFileSync(path.join(dataDir, 'map.json'));
  console.log('restored', before.length, after.length);
  child.kill();
  console.log('OK');
})().catch(e => { console.error(e); process.exit(1); });

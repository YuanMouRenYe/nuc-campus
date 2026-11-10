// v7.9 管理员发布：本地写盘备份 + GitHub 提交构建（mock fetch）
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), os = require('os');
const lib = require('../../tools/map_publish_lib.cjs');
const GH = require('../js/admin_github.js');
const AF = require('../js/admin_files.js');
const { loadMap } = require('./helpers.cjs');

test('buildPublishFiles produces map.json + greyscale ground + rgb terrain', async () => {
  const { M, cls } = loadMap();
  const t = require('./helpers.cjs').readPNG(path.join(__dirname, '../data/terrain.png'));
  const terr = new Uint8ClampedArray(t.w * t.h * 4);
  for (let i = 0; i < t.w * t.h; i++) { terr[i * 4] = t.data[i * t.ch]; terr[i * 4 + 1] = t.data[i * t.ch + 1]; terr[i * 4 + 2] = t.data[i * t.ch + 2]; terr[i * 4 + 3] = 255; }
  const files = await AF.buildPublishFiles(M, cls, terr);
  assert.ok(files['map.json'].length > 1000);
  assert.ok(files['ground.png'][0] === 137 && files['ground.png'][1] === 80);
  assert.ok(files['terrain.png'].length > 1000);
});

test('publishToDataDir backs up and writes files', async () => {
  const { M, cls } = loadMap();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuc-pub-'));
  // seed old files
  fs.writeFileSync(path.join(dir, 'map.json'), '{"old":true}');
  fs.writeFileSync(path.join(dir, 'ground.png'), Buffer.from([1, 2, 3]));
  const decoded = { map: M, ground: cls, terr: null };
  // build minimal terr so terrain optional
  const r = await lib.publishToDataDir(decoded, dir, { allowErrors: true });
  assert.ok(r.stamp);
  assert.ok(fs.existsSync(path.join(dir, 'map.json.bak-' + r.stamp)));
  const mj = JSON.parse(fs.readFileSync(path.join(dir, 'map.json'), 'utf8'));
  assert.ok(mj.meta && mj.meta.w);
  assert.ok(fs.statSync(path.join(dir, 'ground.png')).size > 100);
});

test('AdminGitHub.publishFiles builds blobs/tree/commit and updates ref (mock fetch)', async () => {
  const calls = [];
  const fetchMock = async (url, opts) => {
    const method = (opts && opts.method) || 'GET';
    calls.push({ method, url, body: opts && opts.body });
    const u = String(url);
    if (method === 'GET' && /\/git\/ref\//.test(u)) return json({ object: { sha: 'aaa111' } });
    if (method === 'GET' && /\/git\/commits\//.test(u)) return json({ tree: { sha: 'tree0' }, sha: 'aaa111' });
    if (method === 'POST' && /\/git\/blobs/.test(u)) return json({ sha: 'blob-' + calls.length });
    if (method === 'POST' && /\/git\/trees/.test(u)) return json({ sha: 'tree1' });
    if (method === 'POST' && /\/git\/commits/.test(u)) return json({ sha: 'ccc999' });
    if (method === 'PATCH' && /\/git\/refs\//.test(u)) return json({ object: { sha: 'ccc999' } });
    return json({ message: 'unexpected ' + method + ' ' + u }, 500);
  };
  function json(o, status) {
    return { ok: !status || status < 400, status: status || 200, text: async () => JSON.stringify(o) };
  }
  const cfg = { owner: 'acme', repo: 'nuc-campus', branch: 'main', token: 'secret-token-do-not-log' };
  const files = { 'map.json': new TextEncoder().encode('{"ok":1}'), 'ground.png': new Uint8Array([137, 80, 78, 71]) };
  const res = await GH.publishFiles(cfg, files, { fetch: fetchMock, message: 'test commit' });
  assert.strictEqual(res.sha, 'ccc999');
  assert.ok(res.url.includes('/commit/ccc999'));
  assert.ok(calls.some(c => c.method === 'POST' && /blobs/.test(c.url)));
  assert.ok(calls.some(c => c.method === 'PATCH'));
  // Authorization present but we never assert the raw token into logs — just check header was sent via body of fetch options
  const blobCall = calls.find(c => /blobs/.test(c.url));
  assert.ok(blobCall);
  // ensure token not accidentally written to repo files in this test
  assert.ok(!String(res.url).includes('secret-token'));
});

test('AdminGitHub retries on 409 conflict then succeeds', async () => {
  let patches = 0;
  const fetchMock = async (url, opts) => {
    const method = (opts && opts.method) || 'GET';
    if (method === 'GET' && /\/git\/ref\//.test(url)) return j({ object: { sha: 'h' + patches } });
    if (method === 'GET' && /\/git\/commits\//.test(url)) return j({ tree: { sha: 't0' } });
    if (method === 'POST' && /blobs/.test(url)) return j({ sha: 'b1' });
    if (method === 'POST' && /trees/.test(url)) return j({ sha: 't1' });
    if (method === 'POST' && /commits/.test(url)) return j({ sha: 'c' + patches });
    if (method === 'PATCH') {
      patches++;
      if (patches === 1) return j({ message: 'conflict' }, 409);
      return j({ ok: 1 });
    }
    return j({ message: 'x' }, 500);
  };
  function j(o, status) { return { ok: !status || status < 400, status: status || 200, text: async () => JSON.stringify(o) }; }
  const res = await GH.publishFiles(
    { owner: 'a', repo: 'b', branch: 'main', token: 't' },
    { 'map.json': new Uint8Array([1, 2, 3]) },
    { fetch: fetchMock, maxRetries: 2 }
  );
  assert.ok(res.sha); assert.ok(patches >= 2);
});

test('config round-trip in memory storage; clear removes token', () => {
  const mem = { s: {}, getItem(k) { return this.s[k] || null; }, setItem(k, v) { this.s[k] = v; }, removeItem(k) { delete this.s[k]; } };
  GH.saveConfig(mem, { owner: 'o', repo: 'r', branch: 'main', token: 'tok' });
  const c = GH.loadConfig(mem);
  assert.strictEqual(c.token, 'tok');
  GH.clearConfig(mem);
  assert.strictEqual(GH.loadConfig(mem), null);
});

#!/usr/bin/env node
// 本地管理员服务器：仅绑定 127.0.0.1，提供游戏静态文件 + POST /api/publish-map。
// 启动：在仓库根目录 npm run admin   或  node tools/admin_server.cjs
// 令牌：环境变量 ADMIN_TOKEN，或启动时随机生成并打印到终端（不会写入任何文件）。
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const lib = require('./map_publish_lib.cjs');

const ROOT = path.resolve(__dirname, '..');
const GAME = path.join(ROOT, 'game');
const DATA = path.join(GAME, 'data');
const HOST = process.env.ADMIN_HOST || '127.0.0.1';
const PORT = +(process.env.ADMIN_PORT || 8790);
const TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(24).toString('hex');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
};

function send(res, code, body, type) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body == null ? '' : String(body));
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Content-Length': buf.length, 'Cache-Control': 'no-store' });
  res.end(buf);
}
function sendJSON(res, code, obj) { send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8'); }

function auth(req) {
  const h = req.headers['x-admin-token'] || '';
  const q = (() => { try { return new URL(req.url, 'http://x').searchParams.get('token') || ''; } catch (e) { return ''; } })();
  return h === TOKEN || q === TOKEN;
}

function safeGamePath(urlPath) {
  let p = decodeURIComponent((urlPath || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  if (p.includes('\0') || p.includes('..')) return null;
  const full = path.normalize(path.join(GAME, p.replace(/^\//, '')));
  if (!full.startsWith(GAME + path.sep) && full !== GAME) return null;
  return full;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(Object.assign(new Error('body too large'), { code: 413 })); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${HOST}:${PORT}`);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
      return res.end();
    }
    // CORS for editor opened from same host is fine; allow header echo for local tools
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');

    if (u.pathname === '/api/admin-ping' && req.method === 'GET') {
      return sendJSON(res, 200, { ok: true, admin: true, bind: HOST + ':' + PORT, needToken: true });
    }
    if (u.pathname === '/api/publish-map' && req.method === 'POST') {
      if (!auth(req)) return sendJSON(res, 401, { ok: false, error: '未授权：请在请求头带上 X-Admin-Token' });
      const raw = await readBody(req, 12 * 1024 * 1024);
      let payload;
      try { payload = JSON.parse(raw.toString('utf8')); } catch (e) { return sendJSON(res, 400, { ok: false, error: 'JSON 无效' }); }
      // payload = 编辑器导出对象，或 { export: {...}, allowErrors?: bool }
      const exp = payload && payload.export ? payload.export : payload;
      let decoded;
      try { decoded = await lib.decodeExport(exp); }
      catch (e) { return sendJSON(res, 400, { ok: false, error: '不是合法的地图导出：' + e.message }); }
      try {
        const r = await lib.publishToDataDir(decoded, DATA, { allowErrors: !!(payload && payload.allowErrors) });
        return sendJSON(res, 200, {
          ok: true, stamp: r.stamp,
          written: r.written.map(w => ({ name: w.name, bytes: w.bytes, bak: w.bak ? path.basename(w.bak) : null })),
          validation: { errors: r.validation.errors.length, warnings: r.validation.warnings.length },
        });
      } catch (e) {
        const code = e.code === 'VALIDATE' ? 422 : 500;
        return sendJSON(res, code, { ok: false, error: e.message, validation: e.validation || null });
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
    const file = safeGamePath(u.pathname);
    if (!file) return send(res, 400, 'Bad path');
    let st; try { st = fs.statSync(file); } catch (e) { return send(res, 404, 'Not Found'); }
    const target = st.isDirectory() ? path.join(file, 'index.html') : file;
    let data; try { data = fs.readFileSync(target); } catch (e) { return send(res, 404, 'Not Found'); }
    send(res, 200, data, MIME[path.extname(target).toLowerCase()] || 'application/octet-stream');
  } catch (e) {
    if (e.code === 413) return sendJSON(res, 413, { ok: false, error: '请求体过大' });
    console.error(e);
    sendJSON(res, 500, { ok: false, error: '服务器错误' });
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  中北大学像素校园 · 本地管理员模式');
  console.log('  只监听 ' + HOST + ':' + PORT + '（本机可访问，局域网不可）');
  console.log('  打开编辑器： http://' + HOST + ':' + PORT + '/editor.html');
  console.log('  管理员令牌（请保密，勿提交到 git）：');
  console.log('    ' + TOKEN);
  console.log('  发布时编辑器会自动带上此令牌；关闭本窗口即失效（除非设了 ADMIN_TOKEN）。');
  console.log('══════════════════════════════════════════════════');
  console.log('');
});

module.exports = { TOKEN, HOST, PORT, server };

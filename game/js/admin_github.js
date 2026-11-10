// 管理员「发布到 GitHub」：用 Git Data API 一次提交改写 data 下的地图文件。
// 浏览器与 node 测试共用；fetch 可注入。令牌只由调用方传入，本模块不读写 localStorage、不打印令牌。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AdminGitHub = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LS_KEY = 'nuc-campus-admin-gh-v1';
  const DATA_PATHS = ['game/data/map.json', 'game/data/ground.png', 'game/data/terrain.png'];

  function b64FromBytes(u8) {
    if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
    let s = ''; const CHUNK = 0x8000;
    for (let i = 0; i < u8.length; i += CHUNK) s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
    return btoa(s);
  }
  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    return Uint8Array.from(Buffer.from(str, 'utf8'));
  }

  function loadConfig(storage) {
    try {
      const o = JSON.parse((storage || localStorage).getItem(LS_KEY) || 'null');
      if (!o || typeof o !== 'object') return null;
      if (!o.owner || !o.repo || !o.branch || !o.token) return null;
      return { owner: String(o.owner), repo: String(o.repo), branch: String(o.branch || 'main'), token: String(o.token), pathPrefix: o.pathPrefix ? String(o.pathPrefix).replace(/^\/+|\/+$/g, '') : '' };
    } catch (e) { return null; }
  }
  function saveConfig(storage, cfg) {
    const s = storage || localStorage;
    if (!cfg) { s.removeItem(LS_KEY); return; }
    s.setItem(LS_KEY, JSON.stringify({
      owner: cfg.owner, repo: cfg.repo, branch: cfg.branch || 'main', token: cfg.token,
      pathPrefix: cfg.pathPrefix || '',
    }));
  }
  function clearConfig(storage) { saveConfig(storage || localStorage, null); }

  function apiPath(owner, repo, p) { return `https://api.github.com/repos/${owner}/${repo}${p}`; }

  function makeClient(cfg, fetchFn) {
    const fetchImpl = fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    if (!fetchImpl) throw new Error('无 fetch');
    async function gh(method, p, body, raw) {
      const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + cfg.token,
        'X-GitHub-Api-Version': '2022-11-28',
      };
      if (body != null && !raw) headers['Content-Type'] = 'application/json';
      const res = await fetchImpl(apiPath(cfg.owner, cfg.repo, p), {
        method, headers, body: body == null ? undefined : (raw ? body : JSON.stringify(body)),
      });
      const text = await res.text();
      let json = null; try { json = text ? JSON.parse(text) : null; } catch (e) { json = { message: text }; }
      if (!res.ok) {
        const err = new Error((json && json.message) || ('HTTP ' + res.status));
        err.status = res.status; err.body = json; throw err;
      }
      return json;
    }
    return { gh, fetchImpl };
  }

  function filePath(cfg, name) {
    const base = (cfg.pathPrefix ? cfg.pathPrefix + '/' : '') + 'game/data/' + name;
    return base.replace(/\/+/g, '/');
  }

  /**
   * files: { 'map.json': Uint8Array|ArrayBuffer|string, 'ground.png': ..., 'terrain.png': ... }
   * opts: { message?, fetch?, onProgress?, maxRetries? }
   */
  async function publishFiles(cfg, files, opts) {
    opts = opts || {};
    const client = makeClient(cfg, opts.fetch);
    const progress = opts.onProgress || (() => {});
    const retries = opts.maxRetries == null ? 2 : opts.maxRetries;
    const msg = opts.message || ('chore(map): 编辑器发布 ' + new Date().toISOString());

    let attempt = 0;
    while (true) {
      attempt++;
      try {
        progress('读取分支 ' + cfg.branch + '…');
        const ref = await client.gh('GET', `/git/ref/heads/${encodeURIComponent(cfg.branch)}`);
        const headSha = ref.object && ref.object.sha;
        if (!headSha) throw new Error('无法解析分支 HEAD');
        progress('读取提交树…');
        const commit = await client.gh('GET', `/git/commits/${headSha}`);
        const baseTree = commit.tree && commit.tree.sha;

        const entries = [];
        for (const [name, content] of Object.entries(files)) {
          progress('上传 ' + name + '…');
          let bytes;
          if (typeof content === 'string') bytes = utf8Bytes(content);
          else if (content instanceof ArrayBuffer) bytes = new Uint8Array(content);
          else bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
          // GitHub blob size soft limit ~100MB; our maps are <1MB
          if (bytes.length > 40 * 1024 * 1024) throw Object.assign(new Error(name + ' 过大（>40MB）'), { status: 413 });
          const blob = await client.gh('POST', '/git/blobs', {
            content: b64FromBytes(bytes),
            encoding: 'base64',
          });
          entries.push({ path: filePath(cfg, name), mode: '100644', type: 'blob', sha: blob.sha });
        }

        progress('创建树…');
        const tree = await client.gh('POST', '/git/trees', { base_tree: baseTree, tree: entries });
        progress('创建提交…');
        const newCommit = await client.gh('POST', '/git/commits', {
          message: msg,
          tree: tree.sha,
          parents: [headSha],
        });
        progress('更新引用…');
        try {
          await client.gh('PATCH', `/git/refs/heads/${encodeURIComponent(cfg.branch)}`, { sha: newCommit.sha });
        } catch (e) {
          if (e.status === 422 || e.status === 409) {
            // fast-forward 失败：强制需要重试
            e.status = 409;
          }
          throw e;
        }
        const html = `https://github.com/${cfg.owner}/${cfg.repo}/commit/${newCommit.sha}`;
        progress('完成');
        return { ok: true, sha: newCommit.sha, url: html, message: msg };
      } catch (e) {
        if ((e.status === 409 || e.status === 422) && attempt <= retries) {
          progress('分支有新提交，重新拉取后重试（' + attempt + '/' + retries + ')…');
          continue;
        }
        if (e.status === 401) throw Object.assign(new Error('令牌无效或已过期（401）'), { status: 401 });
        if (e.status === 403) throw Object.assign(new Error('没有写权限或触发限流（403）：请确认 fine-grained PAT 对仓库有 Contents: Read and write'), { status: 403 });
        throw e;
      }
    }
  }

  /** 从编辑器导出对象 + MapEdit/浏览器侧已有的 PNG 编码器路径：这里接收已编码的三文件 */
  async function publishEncoded(cfg, encodedFiles, opts) {
    return publishFiles(cfg, encodedFiles, opts);
  }

  return { LS_KEY, DATA_PATHS, loadConfig, saveConfig, clearConfig, publishFiles, publishEncoded, filePath, b64FromBytes, makeClient };
});

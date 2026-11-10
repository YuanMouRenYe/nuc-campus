// 浏览器端：把编辑器内存中的 map/ground/terr 编成 GitHub / 本地发布所需的三文件。
// PNG 编码纯 JS（无依赖）；与 tools/map_publish_lib.cjs 输出格式一致。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AdminFiles = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function crc32(buf) {
    let c, crc = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
      c = (crc ^ buf[n]) & 0xff;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b; }
  function concat(arrs) {
    let n = 0; for (const a of arrs) n += a.length;
    const o = new Uint8Array(n); let off = 0;
    for (const a of arrs) { o.set(a, off); off += a.length; }
    return o;
  }
  function chunk(type, data) {
    const t = new TextEncoder().encode(type);
    const td = concat([t, data]);
    const crc = u32(crc32(td));
    return concat([u32(data.length), td, crc]);
  }
  async function deflate(u8) {
    if (typeof CompressionStream !== 'undefined') {
      const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'));
      return new Uint8Array(await new Response(s).arrayBuffer());
    }
    // node
    return new Uint8Array(require('zlib').deflateSync(u8));
  }
  async function encodePNG(w, h, ch, px) {
    const ihdr = new Uint8Array(13);
    const dv = new DataView(ihdr.buffer);
    dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = ch === 1 ? 0 : 2;
    const stride = w * ch, raw = new Uint8Array((stride + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (stride + 1)] = 0;
      raw.set(px.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
    }
    const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    return concat([sig, chunk('IHDR', ihdr), chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array(0))]);
  }

  async function buildPublishFiles(map, ground, terr) {
    const m = map.meta, W = m.w * m.sub, H = m.h * m.sub;
    const out = {
      'map.json': new TextEncoder().encode(JSON.stringify(map)),
      'ground.png': await encodePNG(W, H, 1, ground instanceof Uint8Array ? ground : new Uint8Array(ground)),
    };
    if (terr) {
      const rgb = new Uint8Array(W * H * 3);
      for (let i = 0; i < W * H; i++) {
        rgb[i * 3] = terr[i * 4]; rgb[i * 3 + 1] = terr[i * 4 + 1]; rgb[i * 3 + 2] = terr[i * 4 + 2];
      }
      out['terrain.png'] = await encodePNG(W, H, 3, rgb);
    }
    return out;
  }

  return { encodePNG, buildPublishFiles };
});

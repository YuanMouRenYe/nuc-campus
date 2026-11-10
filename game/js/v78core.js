// v7.8 纯逻辑：地标传送清单、存档备份格式、拍照水印文案。不依赖 DOM；浏览器与 node 测试共用。
// 灵感来自同事项目 PixelCampus 的 UX 想法（沉浸 / 拍照 / 备份 / 关于 / 地标传送），全部从零重写，未复制其代码或素材。
// PixelCampus LICENSE 为「保留所有权利」，本文件不包含其任何源代码。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.V78Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const BACKUP_FORMAT = 'nuc-campus-backup', BACKUP_VERSION = 1;
  const SAVE_KEY = 'nuc-campus-save-v1', ACH_KEY = 'nuc-campus-ach-v1', MAPEDIT_KEY = 'nuc-campus-mapedit-v1', PREF_KEY = 'nuc-campus-pref-v1';
  // 地标：坐标是门外可站立的近似点（格），传送前会再找空位
  const LANDMARKS = [
    { id: 'spawn', name: '主楼前（出生点）', x: 484.05, y: 267.75, icon: '🏛' },
    { id: 'lib', name: '图书馆', x: 425.67, y: 227.0, icon: '📚' },
    { id: 'hongxue', name: '鸿学楼 12 号楼', x: 388.17, y: 234.0, icon: '🏫' },
    { id: 'canteen', name: '文瀛食堂', x: 330.95, y: 297.0, icon: '🍜' },
    { id: 'shiwei', name: '食味坊', x: 319.21, y: 307.0, icon: '🍱' },
    { id: 'badminton', name: '羽毛球馆', x: 435.28, y: 264.0, icon: '🏸' },
    { id: 'swim', name: '游泳馆 · 健身馆', x: 433.62, y: 159.0, icon: '🏊' },
    { id: 'statue', name: '彭德怀雕像', x: 242.51, y: 470.5, icon: '🐴' },
    { id: 'gate1', name: '一道门', x: 241.6, y: 492.0, icon: '🚪' },
    { id: 'gate_n', name: '北门', x: 707.5, y: 54.0, icon: '🚪' },
    { id: 'erlong', name: '二龙山公园大门', x: 199.0, y: 252.0, icon: '⛰' },
    { id: 'summit', name: '二龙山顶', x: 126.0, y: 176.0, icon: '🏔' },
  ];
  const WATERMARK = '中北大学 · 像素校园漫步';
  const ABOUT = {
    name: '中北大学 · 像素校园漫步',
    version: '7.9.1',
    license: 'MIT',
    author: 'Jiarui Qi',
    repoNote: '本仓库以 MIT 许可发布。',
    learned: 'v7.8 的沉浸模式、拍照、存档备份、关于面板、地标传送清单等 UX 灵感，来自同事 EXIST-D 的公开学习项目 PixelCampus（河北工程大学新校区）。该项目 LICENSE 为「保留所有权利」，本游戏未复制其代码或美术，仅参考玩法想法后从零实现。详见 docs/LEARNED_FROM_PIXELCAMPUS.md。',
  };
  function prefParse(s) { try { const o = JSON.parse(s); if (o && typeof o === 'object') return { immersive: !!o.immersive }; } catch (e) { } return { immersive: false }; }
  function packBackup(parts) {
    return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), save: parts.save || null, achievements: parts.achievements || null, mapedit: parts.mapedit || null, pref: parts.pref || null };
  }
  function unpackBackup(obj) {
    if (typeof obj === 'string') { try { obj = JSON.parse(obj); } catch (e) { throw new Error('备份文件不是合法 JSON'); } }
    if (!obj || obj.format !== BACKUP_FORMAT) throw new Error('不是本游戏的存档备份');
    if (obj.version !== BACKUP_VERSION) throw new Error('备份版本不兼容（需要 v' + BACKUP_VERSION + '）');
    return { save: obj.save || null, achievements: obj.achievements || null, mapedit: obj.mapedit || null, pref: obj.pref || null, exportedAt: obj.exportedAt };
  }
  // 门牌：玩家靠近可进入建筑的门时显示
  function nearDoor(buildings, x, y, r) {
    r = r == null ? 4.5 : r; let best = null, bd = r;
    for (const b of buildings || []) {
      if (!b.door || !b.name || b.nodoor) continue;
      const d = Math.hypot(b.door[0] - x, b.door[1] - y);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  function photoFilename(d) {
    d = d || new Date();
    const p = n => String(n).padStart(2, '0');
    return `nuc-campus-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
  }
  return { BACKUP_FORMAT, BACKUP_VERSION, SAVE_KEY, ACH_KEY, MAPEDIT_KEY, PREF_KEY, LANDMARKS, WATERMARK, ABOUT, prefParse, packBackup, unpackBackup, nearDoor, photoFilename };
});

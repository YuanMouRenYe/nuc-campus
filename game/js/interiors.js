// Enterable interiors: char grids (shared with tests via Core.interiorGrid) + procedural pixel rendering.
(function (root) {
  'use strict';
  const DEFS = {
    canteen: {
      title: '食堂 · 一层', floor: 'tile', wall: 'canteen',
      map: [
        '##############################',
        '#wwwwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#wwwwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#KKKKKKKKKK..........KKKKKKKK#',
        '#..........................P.#',
        '#CCCCCCCCCC..........CCCCCCCC#',
        '#............................#',
        '#..hTTh..hTTh..hTTh..hTTh....#',
        '#..hTTh..hTTh..hTTh..hTTh..P.#',
        '#.........................UUU#',
        '#..hTTh..hTTh..hTTh..hTTh.UUU#',
        '#..hTTh..hTTh..hTTh..hTTh....#',
        '#............................#',
        '#P..........................P#',
        '#############DDDD#############',
      ],
      signs: [[2, 1, '面食'], [6, 1, '米饭套餐'], [21, 1, '麻辣烫'], [25, 1, '山西刀削面']], up: 'canteen2',
    },
    canteen2: { // 二楼: 小炒 + 特色窗口 (Shanxi dishes)
      title: '食堂 · 二层 小炒', floor: 'tile', wall: 'canteen',
      map: [
        '##############################',
        '#wwwwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#wwwwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#KKKKKKKKKK..........KKKKKKKK#',
        '#............P...P...........#',
        '#CCCCCCCCCC..........CCCCCCCC#',
        '#............................#',
        '#..hTTh..hTTh..hTTh..hTTh....#',
        '#..hTTh..hTTh..hTTh..hTTh..P.#',
        '#.........................VVV#',
        '#..hTTh..hTTh..hTTh..hTTh.VVV#',
        '#..hTTh..hTTh..hTTh..hTTh....#',
        '#............................#',
        '#P..........................P#',
        '##############################',
      ],
      signs: [[2, 1, '二楼小炒'], [6.5, 1, '过油肉'], [21, 1, '特色窗口'], [25.5, 1, '莜面 · 羊杂']], down: 'canteen',
    },
    main: {
      title: '主楼 · 大厅', floor: 'marble', wall: 'stone',
      map: [
        '##########################',
        '#wwwwwwwwwwwwwwwwwwwwwwww#',
        '#wwwwwwwwwwwwwwwwwwwwwwww#',
        '#UUU.....MMMMMMMM.....EEE#',
        '#UUU..................EEE#',
        '#........................#',
        '#..O.....RRRRRRRR.....O..#',
        '#........................#',
        '#P......................P#',
        '#..O..................O..#',
        '#........................#',
        '#P.....hh........hh.....P#',
        '#......LL........LL......#',
        '#........................#',
        '###########DDDD###########',
      ],
      signs: [[12, 1, '中北大学'], [2, 2, '二层 ↑']], up: 'main2',
    },
    library: {
      title: '图书馆 · 阅览室', floor: 'wood', wall: 'wood',
      map: [
        '############################',
        '#wwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#wwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#BBBBBB..BBBBBB..BBBBBB.UUU#',
        '#.......................UUU#',
        '#BBBBBB..BBBBBB..BBBBBB....#',
        '#..........................#',
        '#BBBBBB..BBBBBB..BBBBBB..P.#',
        '#..........................#',
        '#..hhhhhh....hhhhhh........#',
        '#..LLLLLL....LLLLLL...RRR..#',
        '#..hhhhhh....hhhhhh........#',
        '#..........................#',
        '#P........................P#',
        '############DDDD############',
      ],
      signs: [[12, 1, '安静阅读'], [24.5, 2, '书库 ↑']], up: 'library2',
    },
    library2: {
      title: '图书馆 · 二层 书库', floor: 'wood', wall: 'wood',
      map: [
        '############################',
        '#wwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#wwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#BB.BB.BB.BB.BB.BB.BB...VVV#',
        '#BB.BB.BB.BB.BB.BB.BB...VVV#',
        '#BB.BB.BB.BB.BB.BB.BB......#',
        '#..........................#',
        '#BB.BB.BB.BB.BB.BB.BB..P...#',
        '#BB.BB.BB.BB.BB.BB.BB......#',
        '#..........................#',
        '#..LLLL..LLLL..LLLL..RRR...#',
        '#..hhhh..hhhh..hhhh........#',
        '#P........................P#',
        '############################',
      ],
      signs: [[10, 1, '书库 · 请保持安静'], [24.5, 2, '一层 ↓'], [22, 8.5, '借还处']], down: 'library',
    },
    classroom: {
      title: '教学楼 · 三层', floor: 'terrazzo', wall: 'class',
      map: [
        '##############################',
        '#wwwwwwwwwwwww##wwwwwwwwwwwww#',
        '#wwGGGGGGGGwww##wwGGGGGGGGwww#',
        '#.....QQ......##.....QQ......#',
        '#.............##.............#',
        '#.dd.dd.dd.dd.##.dd.dd.dd.dd.#',
        '#.hh.hh.hh.hh.##.hh.hh.hh.hh.#',
        '#.dd.dd.dd.dd.##.dd.dd.dd.dd.#',
        '#.hh.hh.hh.hh.##.hh.hh.hh.hh.#',
        '#.dd.dd.dd.dd.##.dd.dd.dd.dd.#',
        '#.hh.hh.hh.hh.##.hh.hh.hh.hh.#',
        '#P...........k##k...........P#',
        '#wwwww...wwwwwwwwwwww...wwwww#',
        '#wwwww...wwwwwwwwwwww...wwwww#',
        '#P..........................F#',
        '#............................#',
        '#P..........................P#',
        '#############DDDD#############',
      ],
      signs: [[3, 12, '301'], [18, 12, '302'], [14, 1, '安全出口']],
      boards: [[6.5, 2, '高等数学  第三章'], [21.5, 2, '大学物理  实验预习']],
    },
    dorm: {
      title: '宿舍 · 四层', floor: 'terrazzo', wall: 'dorm',
      map: [
        '########################',
        '#######wwwwwwwwww#######',
        '#######wwwwwwwwww#######',
        '#######YY......YY#######',
        '#######YY......YY#######',
        '#######YY..TT..YY#######',
        '#######....TT....#######',
        '#######kk......kk#######',
        '#wwwwwwwwww..wwwwwwwwww#',
        '#wwnwwwwwww..wwwwwwwnww#',
        '#......................#',
        '#P....................F#',
        '#......................#',
        '###########DD###########',
      ],
      signs: [[9, 8, '413'], [5, 8, '411'], [18, 8, '415']],
    },
    gym: {
      title: '羽毛球馆', floor: 'court', wall: 'gym',
      map: [
        '################################',
        '#wwwwwwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#wwwwwwwwwwwwwwwwwwwwwwwwwwwwww#',
        '#AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA#',
        '#AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#.H..........................H.#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#..............................#',
        '#P............................P#',
        '##############DDDD##############',
      ],
      signs: [[15, 1, '更高 更快 更强']], court: [3, 5, 28, 15],
    },
    main2: {
      title: '主楼 · 二层 校史展廊', floor: 'marble', wall: 'stone',
      map: [
        '##########################',
        '#wwwwwwwwwwwwwwwwwwwwwwww#',
        '#wwwwwwwwwwwwwwwwwwwwwwww#',
        '#VVV.....................#',
        '#VVV..XX..XX..XX..XX.....#',
        '#........................#',
        '#..ZZ..ZZ..ZZ..ZZ..ZZ..ZZ#',
        '#........................#',
        '#........................#',
        '#P......................P#',
        '#..RRRRRR........RRRRRR..#',
        '#........................#',
        '#........................#',
        '#P......................P#',
        '##########################',
      ],
      signs: [[12, 1, '校史展廊'], [2, 2, '一层 ↓'], [6.5, 2, '太行建校'], [10.5, 2, '兵工传统'], [14.5, 2, '校园变迁'], [18.5, 2, '今日中北']], down: 'main',
    },
  };
  // ---- v7.6.4 D: four distinct multi-floor canteens. Each floor's windows / signs follow a public source
  // (see data/canteens_sources.md); windows we could not confirm are marked `u: 1` and listed there as unverified.
  const CANTEEN_SPECS = {
    '文瀛食堂': { wall: 'wy', floor: 'tile', floors: [
      { t: '一层 文瀛餐厅', tables: 'four', win: [[1, 7, '大众套餐', '大众套餐'], [8, 13, '面食', '面食', 1], [14, 19, '米饭套餐', '米饭套餐', 1], [21, 28, '百特中西餐厅', '百特西餐']] },
      { t: '二层 风味餐厅', tables: 'long', win: [[1, 6, '翘脚牛肉面', '翘脚牛肉面'], [7, 12, '非遗砂锅', '非遗砂锅'], [13, 18, '烤鸭拌饭', '烤鸭拌饭'], [20, 24, '酸菜鱼', '酸菜鱼'], [25, 28, '煮馍', '煮馍']] } ] },
    '食味坊': { wall: 'swf', floor: 'wood', floors: [
      { t: '一层 面食', tables: 'four', win: [[1, 8, '老大同刀削面', '刀削面'], [9, 14, '面食', '面食', 1], [16, 22, '米饭套餐', '米饭套餐', 1], [23, 28, '麻辣烫', '麻辣烫', 1]] },
      { t: '二层 自选', tables: 'long', win: [[1, 9, '自选快餐', '自选快餐', 1], [20, 28, '小炒', '小炒盖饭', 1]] } ] },
    '田园餐厅': { wall: 'ty', floor: 'terrazzo', floors: [
      { t: '一层 大众餐', tables: 'four', win: [[1, 9, '大众餐', '大众套餐'], [10, 15, '面食', '面食', 1], [21, 28, '麻辣烫', '麻辣烫', 1]] },
      { t: '二层 现做现售', tables: 'four', win: [[1, 6, '过油肉', '过油肉', 1], [7, 13, '现炒盖饭', '小炒盖饭'], [20, 24, '莜面', '莜面栲栳栳', 1], [25, 28, '羊杂割', '羊杂割', 1]] } ] },
    '龙山餐厅': { wall: 'ls', floor: 'tile', floors: [
      { t: '一层 平价餐', tables: 'four', win: [[1, 9, '平价套餐', '大众套餐'], [10, 15, '面食', '面食', 1], [21, 28, '麻辣烫', '麻辣烫', 1]] },
      { t: '二层 现做现售', tables: 'long', win: [[1, 6, '过油肉', '过油肉', 1], [7, 13, '现炒小炒', '小炒盖饭'], [21, 28, '特色窗口', '莜面栲栳栳', 1]] },
      { t: '三层 特色餐厅', tables: 'booth', win: [[1, 8, '自选菜品', '自选快餐'], [20, 28, '合利屋', '韩式快餐']] } ] },
  };
  const CANTEEN_KEYS = { '文瀛食堂': 'wy', '食味坊': 'swf', '田园餐厅': 'ty', '龙山餐厅': 'ls' };
  function canteenFloorDef(spec, pre, i) {
    const f = spec.floors[i], n = spec.floors.length, W = 30, H = 15, hasUp = i < n - 1, hasDown = i > 0;
    const row = () => Array(W).fill('.'), g = [];
    g.push(Array(W).fill('#')); g.push(['#'].concat(Array(W - 2).fill('w'), ['#'])); g.push(['#'].concat(Array(W - 2).fill('w'), ['#']));
    for (let y = 3; y < H - 1; y++) { const r = row(); r[0] = r[W - 1] = '#'; g.push(r); }
    g.push(Array(W).fill('#'));
    if (i === 0) for (let x = 13; x <= 16; x++) g[H - 1][x] = 'D';
    for (const [x0, x1] of f.win) for (let x = x0; x <= x1; x++) { g[3][x] = 'K'; g[5][x] = 'C'; }
    const stair = (x0, ch) => { for (let y = 9; y <= 10; y++) for (let x = x0; x < x0 + 3; x++) g[y][x] = ch; };
    if (!g[5].slice(1, W - 1).includes('.')) { g[3][19] = '.'; g[5][19] = '.'; } // a gap so the aisle behind the counters is reachable
    if (hasUp) stair(26, 'U'); if (hasDown) stair(1, 'V');
    const xa = hasDown ? 5 : 3, xb = hasUp ? 24 : 27;
    const rowsT = f.tables === 'long' ? [[7, 8], [10, 11]] : [[7, 8], [10, 11]];
    for (const [ya, yb] of rowsT) {
      if (f.tables === 'long') { for (let x = xa; x <= xb; x++) { g[ya][x] = (x === xa || x === xb) ? '.' : 'h'; g[yb][x] = (x === xa || x === xb) ? '.' : 'T'; } // one long row of tables, stools behind
        for (let x = xa + 4; x < xb; x += 6) { g[ya][x] = '.'; g[yb][x] = '.'; } }
      else if (f.tables === 'booth') { for (let x = xa; x + 3 <= xb; x += 5) { g[ya][x] = 'h'; g[ya][x + 1] = 'T'; g[ya][x + 2] = 'T'; g[ya][x + 3] = 'h'; } g[yb] = g[yb].map((c, x) => (x >= xa && x <= xb && c === '.' && x % 7 === 3) ? 'P' : c); }
      else for (let x = xa; x + 3 <= xb; x += 6) for (const y of [ya, yb]) { g[y][x] = 'h'; g[y][x + 1] = 'T'; g[y][x + 2] = 'T'; g[y][x + 3] = 'h'; }
    }
    g[13][1] = 'P'; g[13][W - 2] = 'P'; g[4][W - 3] = '.';
    const map = g.map(r => r.join(''));
    const signs = f.win.map(([x0, x1, s]) => [(x0 + x1) / 2 - 0.5, 1, s]);
    const dishes = f.win.map(([x0, x1, , d, u]) => [x0, x1, d, !!u]);
    return { title: '食堂 · ' + f.t, floor: spec.floor, wall: spec.wall, map, signs, dishes, canteen: i + 1, floors: n,
      up: hasUp ? pre + (i + 2) : undefined, down: hasDown ? pre + i : undefined };
  }
  for (const [name, spec] of Object.entries(CANTEEN_SPECS)) spec.floors.forEach((_, i) => { DEFS[CANTEEN_KEYS[name] + (i + 1)] = canteenFloorDef(spec, CANTEEN_KEYS[name], i); });
  DEFS.canteen.canteen = 1; DEFS.canteen.floors = 2; DEFS.canteen2.canteen = 2; DEFS.canteen2.floors = 2;
  DEFS.canteen.dishes = [[1, 4, '面食'], [5, 10, '米饭套餐'], [11, 23, '麻辣烫'], [24, 28, '刀削面']];
  DEFS.canteen2.dishes = [[1, 5, '过油肉'], [6, 10, '小炒盖饭'], [11, 24, '莜面栲栳栳'], [25, 28, '羊杂割']];
  // which interior key a building's canteen door (or ?interior=canteen2&b=…) leads to
  function canteenKey(key, name) { const pre = name && CANTEEN_KEYS[name]; if (!pre) return key; if (key === 'canteen') return pre + '1'; const m = /^canteen(\d)$/.exec(key); return m && DEFS[pre + m[1]] ? pre + m[1] : key; }
  function dishAt(def, x) { const d = (def.dishes || []).find(q => x >= q[0] && x <= q[1]); return d ? d[2] : null; }
  const FLOORS = {
    tile: (g, x, y) => { g.fillStyle = ((x + y) & 1) ? '#efe6cf' : '#e3d6b8'; g.fillRect(x * 16, y * 16, 16, 16); g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(x * 16, y * 16, 16, 1); g.fillRect(x * 16, y * 16, 1, 16); },
    marble: (g, x, y) => { const a = ((x >> 1) + (y >> 1)) & 1; g.fillStyle = a ? '#e8e6e0' : '#b9b7b2'; g.fillRect(x * 16, y * 16, 16, 16); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x * 16 + 2, y * 16 + 3, 5, 1); g.fillStyle = 'rgba(0,0,0,0.05)'; if (!(x & 1)) g.fillRect(x * 16, y * 16, 1, 16); if (!(y & 1)) g.fillRect(x * 16, y * 16, 16, 1); },
    wood: (g, x, y) => { for (let r = 0; r < 4; r++) { const k = Core.hash2(x + ((r & 1) ? 7 : 0), y * 4 + r); g.fillStyle = k < 0.33 ? '#b9824e' : k < 0.66 ? '#c48d57' : '#ad7746'; g.fillRect(x * 16, y * 16 + r * 4, 16, 4); g.fillStyle = '#8f5f35'; g.fillRect(x * 16, y * 16 + r * 4 + 3, 16, 1); if (((x * 3 + r * 5 + y) % 4) === 0) g.fillRect(x * 16 + 9, y * 16 + r * 4, 1, 3); } },
    terrazzo: (g, x, y) => { g.fillStyle = '#d9d4c8'; g.fillRect(x * 16, y * 16, 16, 16); for (let k = 0; k < 6; k++) { const h = Core.hash2(x * 7 + k, y * 13 - k); g.fillStyle = h < 0.33 ? '#b8b1a2' : h < 0.66 ? '#ece8de' : '#9fa39a'; g.fillRect(x * 16 + ((h * 97) | 0) % 15, y * 16 + ((h * 61) | 0) % 15, 1 + (k & 1), 1); } g.fillStyle = 'rgba(0,0,0,0.07)'; if (!(x % 3)) g.fillRect(x * 16, y * 16, 1, 16); if (!(y % 3)) g.fillRect(x * 16, y * 16, 16, 1); },
    court: (g, x, y) => { g.fillStyle = (x & 1) ? '#d39a5c' : '#cc9255'; g.fillRect(x * 16, y * 16, 16, 16); g.fillStyle = '#b97f45'; g.fillRect(x * 16 + 15, y * 16, 1, 16); if (Core.hash2(x, y) < 0.3) { g.fillStyle = '#dba66a'; g.fillRect(x * 16 + 3, y * 16 + 6, 6, 1); } },
  };
  const WALLS = { canteen: ['#9ccfb6', '#7fb39b', '#f3ebd6', '#4f3524'], wy: ['#a9d3be', '#86b8a0', '#f3ebd6', '#4f3524'], swf: ['#e0b77a', '#c4965a', '#f6ead2', '#5a3a22'], ty: ['#b9d48e', '#97b46c', '#f4f0dc', '#4a4a30'], ls: ['#a8c4dc', '#86a6c2', '#eef0f2', '#3e4a58'], stone: ['#e3dccb', '#cfc6b1', '#f1ece0', '#55606a'], wood: ['#8a5a36', '#744a2b', '#c99a68', '#3b2414'], class: ['#6f9f88', '#4f7f6a', '#f2f0e6', '#4a4f55'], dorm: ['#c9b994', '#a8976f', '#f4efe2', '#4f4a44'], gym: ['#8fa0ae', '#6f8090', '#e9edf0', '#3b4550'] };
  const WALLC = 'wGn';

  function render(key, name) {
    const def = DEFS[key]; const rows = def.map, H = rows.length, W = rows[0].length;
    const bg = document.createElement('canvas'); bg.width = W * 16; bg.height = H * 16; const g = bg.getContext('2d');
    const wp = WALLS[def.wall];
    g.fillStyle = '#20140c'; g.fillRect(0, 0, bg.width, bg.height);
    const items = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = rows[y][x];
      if (c === '#') { g.fillStyle = wp[3]; g.fillRect(x * 16, y * 16, 16, 16); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x * 16, y * 16, 16, 2); continue; }
      if (WALLC.includes(c)) {
        const lower = !(rows[y + 1] && WALLC.includes(rows[y + 1][x]));
        g.fillStyle = lower ? wp[0] : wp[2]; g.fillRect(x * 16, y * 16, 16, 16);
        if (lower) { g.fillStyle = wp[1]; g.fillRect(x * 16, y * 16 + 12, 16, 4); g.fillRect(x * 16, y * 16, 16, 2);
          if (c === 'G') { // blackboard spanning lower + part of upper wall row
            g.fillStyle = '#8a6a44'; g.fillRect(x * 16, y * 16 - 9, 16, 21); g.fillStyle = '#2f4f3f'; g.fillRect(x * 16, y * 16 - 7, 16, 16);
            if (rows[y][x - 1] !== 'G') { g.fillStyle = '#8a6a44'; g.fillRect(x * 16, y * 16 - 9, 2, 21); } if (rows[y][x + 1] !== 'G') { g.fillStyle = '#8a6a44'; g.fillRect(x * 16 + 14, y * 16 - 9, 2, 21); }
            g.fillStyle = '#b89a6a'; g.fillRect(x * 16, y * 16 + 9, 16, 2); if (Core.hash2(x, y) < 0.3) { g.fillStyle = '#f4f4ec'; g.fillRect(x * 16 + 5, y * 16 + 8, 3, 1); } }
          if (c === 'n') { // closed neighbour door on a corridor wall
            g.fillStyle = '#3a2a1c'; g.fillRect(x * 16 + 1, y * 16 - 13, 14, 29); g.fillStyle = '#9a6a3e'; g.fillRect(x * 16 + 2, y * 16 - 12, 12, 28); g.fillStyle = '#b5824e'; g.fillRect(x * 16 + 3, y * 16 - 11, 10, 2);
            g.fillStyle = '#cfe3ea'; g.fillRect(x * 16 + 5, y * 16 - 8, 6, 5); g.fillStyle = '#e6c25a'; g.fillRect(x * 16 + 11, y * 16 + 3, 2, 2); } }
        else { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(x * 16 + 15, y * 16, 1, 16); if (x % 5 === 2 && def.wall !== 'canteen') { g.fillStyle = '#6f9fc4'; g.fillRect(x * 16 + 2, y * 16 + 3, 12, 11); g.fillStyle = '#bfe0f2'; g.fillRect(x * 16 + 3, y * 16 + 4, 4, 9); g.fillStyle = wp[3]; g.fillRect(x * 16 + 8, y * 16 + 3, 1, 11); } }
        continue;
      }
      FLOORS[def.floor](g, x, y);
      if (c === 'U' || c === 'V') { // stairs painted into the floor: U goes up (light treads), V goes down (darkening)
        for (let k = 0; k < 4; k++) { const t = c === 'U' ? k : 3 - k; g.fillStyle = c === 'U' ? ['#ece6d8', '#d9d1bf', '#c7bea9', '#b3a993'][t] : ['#b3a993', '#9a907c', '#7f7666', '#625a4d'][3 - t]; g.fillRect(x * 16, y * 16 + k * 4, 16, 4); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x * 16, y * 16 + k * 4 + 3, 16, 1); }
        if (rows[y][x - 1] !== c) { g.fillStyle = '#8b7f6a'; g.fillRect(x * 16, y * 16, 2, 16); }
        if (rows[y][x + 1] !== c) { g.fillStyle = '#8b7f6a'; g.fillRect(x * 16 + 14, y * 16, 2, 16); }
        continue;
      }
      if (c === 'A') { // bleachers: stepped benches, two colours alternating by row
        g.fillStyle = (y & 1) ? '#3f6fa0' : '#c9472f'; g.fillRect(x * 16, y * 16, 16, 11); g.fillStyle = (y & 1) ? '#5a8cc0' : '#e0644a'; g.fillRect(x * 16, y * 16, 16, 3);
        g.fillStyle = '#6b7480'; g.fillRect(x * 16, y * 16 + 11, 16, 5); g.fillStyle = '#4b535e'; g.fillRect(x * 16, y * 16 + 15, 16, 1); if (!(x % 4)) { g.fillStyle = '#2f3640'; g.fillRect(x * 16, y * 16 + 2, 1, 9); } continue;
      }
      if (c === 'D') { g.fillStyle = '#7b4a2a'; g.fillRect(x * 16, y * 16, 16, 16); g.fillStyle = '#a8703f'; g.fillRect(x * 16 + 1, y * 16 + 2, 14, 12); g.fillStyle = '#d6b25e'; g.fillRect(x * 16, y * 16, 16, 2); }
      if (c !== '.' && c !== 'D') items.push({ c, x, y, def });
    }
    // gym court markings
    if (def.court) { const [cx0, cy0, cx1, cy1] = def.court, X0 = cx0 * 16, Y0 = cy0 * 16 + 8, X1 = (cx1 + 1) * 16, Y1 = cy1 * 16 + 8, mx = (X0 + X1) >> 1, my = (Y0 + Y1) >> 1;
      g.fillStyle = '#f4efe2'; g.fillRect(X0, Y0, X1 - X0, 2); g.fillRect(X0, Y1, X1 - X0, 2); g.fillRect(X0, Y0, 2, Y1 - Y0 + 2); g.fillRect(X1 - 2, Y0, 2, Y1 - Y0 + 2); g.fillRect(mx - 1, Y0, 2, Y1 - Y0);
      for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; g.fillRect(Math.round(mx + Math.cos(t) * 26), Math.round(my + Math.sin(t) * 22), 2, 2); }
      for (const side of [0, 1]) { const kx = side ? X1 - 70 : X0, kw = 70; g.fillStyle = 'rgba(160,60,40,0.35)'; g.fillRect(kx + (side ? 0 : 2), my - 24, kw - 2, 48); g.fillStyle = '#f4efe2'; g.fillRect(kx, my - 24, kw, 2); g.fillRect(kx, my + 22, kw, 2); g.fillRect(side ? kx : kx + kw - 2, my - 24, 2, 48);
        { const hx = side ? X1 - 24 : X0 + 24; for (let a = -40; a <= 40; a++) { const t = a / 40 * Math.PI / 2, px = Math.round(hx + (side ? -1 : 1) * Math.cos(t) * 110), py = Math.round(my + Math.sin(t) * 70); if (py > Y0 + 2 && py < Y1) g.fillRect(px, py, 2, 2); } } } }
    // shadow under top wall
    for (let x = 0; x < W; x++) for (let y = 1; y < H; y++) if (WALLC.includes(rows[y - 1][x]) && !WALLC.includes(rows[y][x])) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x * 16, y * 16, 16, 4); }
    // wall signs
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '12px ArkPixel';
    for (const [sx, sy, t] of def.signs) {
      const label = (key === 'canteen' && t === '面食') ? t : t; const w = label.length * 12 + 10;
      g.fillStyle = '#3b1f10'; g.fillRect(sx * 16 + 8 - w / 2 - 1, sy * 16 + 1, w + 2, 16); g.fillStyle = '#d79b4a'; g.fillRect(sx * 16 + 8 - w / 2, sy * 16 + 2, w, 14);
      g.fillStyle = '#3b1f10'; g.fillText(label, sx * 16 + 8, sy * 16 + 9);
    }
    // chalk writing on blackboards, history panels
    for (const [bx, by, t] of def.boards || []) { g.font = '12px ArkPixel'; g.fillStyle = '#e9efe6'; g.fillText(t, bx * 16 + 8, by * 16 + 1); g.fillStyle = 'rgba(233,239,230,0.6)'; g.fillRect(bx * 16 - 30, by * 16 + 7, 22, 1); }
    // title plaque
    const title = name ? `${name} · ${def.title.split(' · ')[1]}` : def.title;
    return { def, bg, W, H, items: items.map(it => ({ ...it, sortY: (it.y + 1) * 16 - (it.c === 'L' || it.c === 'T' || it.c === 'd' ? 2 : 0) })), title };
  }
  function drawItem(g, it, rnd) {
    const X = it.x * 16, Y = it.y * 16;
    switch (it.c) {
      case 'K': g.fillStyle = '#a7b2b8'; g.fillRect(X, Y - 6, 16, 22); g.fillStyle = '#7f8b91'; g.fillRect(X, Y + 12, 16, 4); g.fillStyle = '#d6dde0'; g.fillRect(X + 1, Y - 6, 14, 2);
        if ((it.x % 3) === 0) { g.fillStyle = '#2d2d2d'; g.fillRect(X + 3, Y - 4, 10, 4); g.fillStyle = '#e8eef0'; g.fillRect(X + 5, Y - 9, 6, 2); } break;
      case 'C': g.fillStyle = '#c47d45'; g.fillRect(X, Y - 4, 16, 20); g.fillStyle = '#e8d7b8'; g.fillRect(X, Y - 6, 16, 4); g.fillStyle = '#9a5c2f'; g.fillRect(X, Y + 12, 16, 4);
        { const dish = ['#e8a33d', '#c9472f', '#7fae4a', '#f2e3b3'][(it.x * 7) % 4]; g.fillStyle = '#c8cdd0'; g.fillRect(X + 2, Y - 8, 12, 4); g.fillStyle = dish; g.fillRect(X + 3, Y - 8, 10, 2); } break;
      case 'T': g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(X + 1, Y + 12, 15, 4); g.fillStyle = '#f2f0ea'; g.fillRect(X, Y - 2, 16, 13); g.fillStyle = '#c9c4b8'; g.fillRect(X, Y + 11, 16, 3); g.fillStyle = '#8a8478'; g.fillRect(X + 2, Y + 14, 2, 2); g.fillRect(X + 12, Y + 14, 2, 2);
        if (Core.hash2(it.x, it.y) < 0.45) { g.fillStyle = '#e8e2d2'; g.fillRect(X + 4, Y + 1, 8, 6); g.fillStyle = Core.hash2(it.y, it.x) < .5 ? '#d68a3a' : '#9ebf5a'; g.fillRect(X + 5, Y + 2, 6, 3); } break;
      case 'h': g.fillStyle = '#e07b3c'; g.fillRect(X + 3, Y + 2, 10, 9); g.fillStyle = '#b85a24'; g.fillRect(X + 3, Y + 9, 10, 2); g.fillStyle = '#6a4a35'; g.fillRect(X + 4, Y + 11, 2, 4); g.fillRect(X + 10, Y + 11, 2, 4); break;
      case 'P': g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + 3, Y + 13, 11, 3); g.fillStyle = '#a65a32'; g.fillRect(X + 4, Y + 7, 8, 8); g.fillStyle = '#7f4424'; g.fillRect(X + 4, Y + 13, 8, 2);
        g.fillStyle = '#3f8a46'; g.fillRect(X + 2, Y - 6, 12, 13); g.fillStyle = '#5aaa55'; g.fillRect(X + 4, Y - 9, 6, 8); g.fillRect(X + 9, Y - 4, 4, 6); g.fillStyle = '#86cc6a'; g.fillRect(X + 5, Y - 8, 2, 3); break;
      case 'B': { g.fillStyle = '#5a3620'; g.fillRect(X, Y - 14, 16, 30); g.fillStyle = '#3f2414'; g.fillRect(X, Y + 13, 16, 3);
        const cols = ['#b5402f', '#3f6fa0', '#d8a838', '#4e8a4a', '#7a4a8a', '#e6dcc4'];
        for (let s = 0; s < 3; s++) { const sy = Y - 12 + s * 9; g.fillStyle = '#2e1a0e'; g.fillRect(X + 1, sy, 14, 8); for (let k = 1; k < 15; k += 2) { g.fillStyle = cols[(Core.hash2(it.x * 16 + k, it.y * 3 + s) * 6) | 0]; g.fillRect(X + k, sy + 1 + ((k * 7 + s) % 3 === 0 ? 1 : 0), 2, 7 - ((k * 7 + s) % 3 === 0 ? 1 : 0)); } g.fillStyle = '#7a4c2c'; g.fillRect(X, sy + 8, 16, 1); } break; }
      case 'L': g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X, Y + 12, 16, 4); g.fillStyle = '#8f5a32'; g.fillRect(X, Y - 2, 16, 13); g.fillStyle = '#a86e3e'; g.fillRect(X, Y - 2, 16, 2); g.fillStyle = '#6e4224'; g.fillRect(X, Y + 11, 16, 3);
        if (Core.hash2(it.x, it.y * 5) < 0.4) { g.fillStyle = '#f5efe0'; g.fillRect(X + 4, Y + 2, 8, 5); g.fillStyle = '#9a9a9a'; g.fillRect(X + 5, Y + 3, 6, 1); }
        if (Core.hash2(it.x * 3, it.y) < 0.25) { g.fillStyle = '#e8d27a'; g.fillRect(X + 11, Y - 6, 3, 5); g.fillStyle = '#4a4a4a'; g.fillRect(X + 12, Y - 2, 1, 2); } break;
      case 'R': g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X, Y + 12, 16, 4); g.fillStyle = '#6d4a32'; g.fillRect(X, Y - 4, 16, 18); g.fillStyle = '#e9dcc0'; g.fillRect(X, Y - 6, 16, 3); g.fillStyle = '#8a6244'; g.fillRect(X + 1, Y + 1, 14, 1); break;
      case 'O': g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + 1, Y + 12, 16, 4); g.fillStyle = '#d6d0c2'; g.fillRect(X + 2, Y - 30, 12, 44); g.fillStyle = '#f2eee4'; g.fillRect(X + 4, Y - 30, 3, 44); g.fillStyle = '#b8b0a0'; g.fillRect(X, Y + 10, 16, 5); g.fillRect(X, Y - 32, 16, 4); break;
      case 'E': g.fillStyle = (it.y & 1) ? '#c9c2b2' : '#b5ad9b'; g.fillRect(X, Y, 16, 16); for (let k = 0; k < 4; k++) { g.fillStyle = k & 1 ? '#a39b89' : '#ddd6c6'; g.fillRect(X, Y + k * 4, 16, 2); } break;
      case 'M': g.fillStyle = '#3b4a44'; g.fillRect(X, Y - 12, 16, 20); g.fillStyle = '#d7c48a'; g.fillRect(X, Y - 12, 16, 2); g.fillRect(X, Y + 6, 16, 2);
        g.fillStyle = '#6f8f7a'; g.fillRect(X + 2, Y - 8, 12, 12); g.fillStyle = '#9bb89f'; g.fillRect(X + 4 + (it.x % 3) * 2, Y - 5, 4, 5); break;
      case 'G': case 'n': break;
      case 'd': g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(X, Y + 12, 16, 4); g.fillStyle = '#d8b07a'; g.fillRect(X, Y - 1, 16, 11); g.fillStyle = '#e8c895'; g.fillRect(X, Y - 1, 16, 2); g.fillStyle = '#a77a48'; g.fillRect(X, Y + 10, 16, 3); g.fillStyle = '#5b5f66'; g.fillRect(X + 1, Y + 13, 2, 3); g.fillRect(X + 13, Y + 13, 2, 3);
        { const h = Core.hash2(it.x * 5, it.y * 3); if (h < 0.35) { g.fillStyle = '#f5efe0'; g.fillRect(X + 3, Y + 2, 9, 6); g.fillStyle = '#8a9ab0'; g.fillRect(X + 4, Y + 3, 7, 1); g.fillRect(X + 4, Y + 5, 5, 1); } else if (h < 0.5) { g.fillStyle = ['#3f6fa0', '#b5402f', '#4e8a4a'][(h * 60 | 0) % 3]; g.fillRect(X + 5, Y + 1, 7, 5); } else if (h < 0.6) { g.fillStyle = '#9ad1e8'; g.fillRect(X + 11, Y - 4, 3, 7); } } break;
      case 'Q': g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X, Y + 12, 16, 4); g.fillStyle = '#8a5a36'; g.fillRect(X, Y - 6, 16, 19); g.fillStyle = '#a8744a'; g.fillRect(X, Y - 6, 16, 3); g.fillStyle = '#6a4226'; g.fillRect(X, Y + 11, 16, 2);
        if (it.def && it.def.map[it.y][it.x - 1] !== 'Q') { g.fillStyle = '#2d2d33'; g.fillRect(X + 4, Y - 9, 10, 4); g.fillStyle = '#7fb8e0'; g.fillRect(X + 5, Y - 8, 8, 2); } break;
      case 'Y': { const top = it.def && it.def.map[it.y - 1][it.x] !== 'Y', bot = it.def && it.def.map[it.y + 1][it.x] !== 'Y', left = it.def && it.def.map[it.y][it.x - 1] !== 'Y';
        g.fillStyle = '#7d8a96'; g.fillRect(X + (left ? 0 : 14), Y - (top ? 18 : 0), 2, 16 + (top ? 18 : 0)); g.fillStyle = left ? '#6a8fb8' : '#b86a7a'; g.fillRect(X, Y - 14, 16, 8); g.fillStyle = left ? '#8fb2d8' : '#d68e9c'; g.fillRect(X, Y - 14, 16, 2);
        if (top) { g.fillStyle = '#f2eee4'; g.fillRect(X + 2, Y - 13, 10, 4); g.fillStyle = '#7d8a96'; g.fillRect(X, Y - 20, 16, 2); }
        g.fillStyle = '#c9a26c'; g.fillRect(X, Y + 2, 16, 10); g.fillStyle = '#dcb984'; g.fillRect(X, Y + 2, 16, 2); if (bot) { g.fillStyle = '#7d8a96'; g.fillRect(X, Y + 12, 16, 2); }
        if (Core.hash2(it.x, it.y) < 0.4) { g.fillStyle = '#2d2d33'; g.fillRect(X + 4, Y + 3, 8, 4); g.fillStyle = '#7fb8e0'; g.fillRect(X + 5, Y + 4, 6, 2); } break; }
      case 'k': g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X, Y + 12, 16, 4); g.fillStyle = '#b88a58'; g.fillRect(X, Y - 18, 16, 32); g.fillStyle = '#d0a470'; g.fillRect(X, Y - 18, 16, 2); g.fillStyle = '#8d6238'; g.fillRect(X + 7, Y - 16, 1, 28); g.fillStyle = '#e6c25a'; g.fillRect(X + 5, Y - 4, 1, 3); g.fillRect(X + 9, Y - 4, 1, 3); break;
      case 'H': g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(X - 2, Y + 12, 20, 4); g.fillStyle = '#4b535e'; g.fillRect(X + 6, Y - 30, 4, 44); g.fillStyle = '#2f3640'; g.fillRect(X + 2, Y + 10, 12, 4);
        g.fillStyle = '#f4f6f8'; g.fillRect(X - 4, Y - 44, 24, 16); g.fillStyle = '#c9472f'; g.fillRect(X + 2, Y - 40, 12, 8); g.fillStyle = '#f4f6f8'; g.fillRect(X + 4, Y - 38, 8, 5); g.fillStyle = '#e0642a'; g.fillRect(X + 1, Y - 28, 14, 2); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(X + 3, Y - 26, 1, 5); g.fillRect(X + 7, Y - 26, 1, 6); g.fillRect(X + 12, Y - 26, 1, 5); break;
      case 'X': { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X, Y + 12, 16, 4); g.fillStyle = '#3b3530'; g.fillRect(X, Y - 14, 16, 26); g.fillStyle = '#7a2418'; g.fillRect(X + 1, Y - 13, 15, 3);
        const first = it.def && it.def.map[it.y][it.x - 1] !== 'X'; g.fillStyle = '#efe6cf'; g.fillRect(X + (first ? 2 : 0), Y - 9, 14, 18); g.fillStyle = '#a89a7a'; g.fillRect(X + (first ? 3 : 1), Y - 7, 12, 6); g.fillStyle = '#6a5d48'; g.fillRect(X + (first ? 4 : 2), Y + 2, 9, 1); g.fillRect(X + (first ? 4 : 2), Y + 5, 7, 1);
        g.fillStyle = '#5b5f66'; g.fillRect(X + (first ? 2 : 12), Y + 12, 2, 4); break; }
      case 'Z': g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X, Y + 12, 16, 4); g.fillStyle = '#6d4a32'; g.fillRect(X, Y + 2, 16, 12); g.fillStyle = 'rgba(190,225,240,0.55)'; g.fillRect(X, Y - 10, 16, 13); g.fillStyle = '#e8f4f8'; g.fillRect(X, Y - 10, 16, 1); g.fillRect(X + 2, Y - 8, 1, 9);
        g.fillStyle = ['#b08a3e', '#7a7e84', '#a0522d'][(it.x >> 2) % 3]; g.fillRect(X + 5 + (it.x & 1) * 2, Y - 3, 5, 5); break;
      case 'F': g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + 2, Y + 12, 12, 4); g.fillStyle = '#e8ecee'; g.fillRect(X + 3, Y - 6, 10, 20); g.fillStyle = '#8fc6e8'; g.fillRect(X + 4, Y - 16, 8, 10); g.fillStyle = '#c4e4f4'; g.fillRect(X + 5, Y - 15, 2, 8); g.fillStyle = '#c9472f'; g.fillRect(X + 5, Y + 1, 2, 2); g.fillStyle = '#3f6fa0'; g.fillRect(X + 9, Y + 1, 2, 2); break;
    }
  }
  // interior backgrounds are built lazily the first time a room is entered, then reused
  const CACHE = new Map();
  function renderCached(key, name) { const k = key + '|' + (name || ''); let r = CACHE.get(k); if (!r) { r = render(key, name); CACHE.set(k, r); } return r; }
  root.Interiors = { DEFS, CANTEEN_SPECS, CANTEEN_KEYS, canteenKey, dishAt, render: renderCached, renderFresh: render, drawItem, CACHE };
})(typeof window !== 'undefined' ? window : globalThis);

// v7.4: buildings and big props are assembled from three orthographic views (top roof, south front, west left face),
//       the v7.3 right-hand side wall is removed, and the display helicopter is mirrored (nose east).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M, cls } = loadMap(), { C } = Core, S = M.meta.sub, GW = M.meta.w * S;
const rd = f => fs.readFileSync(path.join(__dirname, '../js/' + f), 'utf8');
const BLD = rd('buildings.js'), P7 = rd('props_v7.js'), PR = rd('props.js');
const at = (x, y) => cls[Math.floor(y * S) * GW + Math.floor(x * S)];
// v7.5: the v7.4 left-face projection is no longer the default (flat Stardew look); it is kept behind ?obl=shear,
// so these tests switch the mode to 'shear' while they run.
const shear = fn => () => { const m = Core.OBL.MODE; Core.OBL.MODE = 'shear'; M.buildings.forEach(b => delete b._obl);
  try { fn(); } finally { Core.OBL.MODE = m; M.buildings.forEach(b => delete b._obl); } };

test('v7.4 projection parameters: fixed left-face factor 0.3-0.5, top > front > left lighting', () => {
  const O = Core.OBL; assert.ok(O.K >= 0.3 && O.K <= 0.5, 'K = ' + O.K); assert.ok(O.CAP > 0 && O.MIN > 0);
  assert.ok(O.SHADE.top > O.SHADE.front && O.SHADE.front > O.SHADE.left);
});
test('v7.4 (?obl=shear) every tall building gets a west face; the wedge lies left of the footprint, width = K * min(depth, CAP)', shear(() => {
  let n = 0;
  for (const b of M.buildings) {
    const ob = Core.oblique(b); if (!ob.faces.length) continue; n++;
    assert.ok(ob.x0 <= b.bbox[0] + 1e-9, b.id); assert.equal(ob.poly.length, b.poly.length + ob.faces.length);
    for (const f of ob.faces) {
      assert.ok(Math.abs(f.w * 16 - Core.OBL.K * Math.min(f.D * 16, Core.OBL.CAP)) < 1e-6, b.id);
      assert.ok(f.Np[0] < f.N[0] && f.Np[1] === f.N[1]); assert.ok(f.w * 16 <= Core.OBL.K * Core.OBL.CAP + 1e-9);
      const c = [(f.S[0] + f.N[0] + f.Np[0]) / 3, (f.S[1] + f.N[1] + f.Np[1]) / 3]; assert.ok(!Core.inPoly(b.poly, c[0], c[1]), b.id + ' wedge outside footprint');
    }
  }
  assert.ok(n > 100, 'faces on ' + n + ' buildings');
  const dorm = M.buildings.find(b => /^文瀛苑5号/.test(b.name || '')); assert.ok(dorm && Core.oblique(dorm).faces.length >= 1);
}));
test('v7.4 (?obl=shear) collision is still the real footprint; the ground under a left face is treated like ground under a roof', shear(() => {
  const sh = Core.roofShadow(cls, M.meta, M.buildings, Core.shadowKeep(M));
  let checked = 0, shaded = 0, openSolid = 0;
  for (const b of M.buildings) for (const f of Core.oblique(b).faces) {
    const x = (f.S[0] + f.N[0] + f.Np[0]) / 3, y = (f.S[1] + f.N[1] + f.Np[1]) / 3, i = Math.floor(y * S) * GW + Math.floor(x * S), k = cls[i];
    if (k === C.BUILDING) continue; checked++;
    if (Core.SHADOW_OPEN.has(k)) { openSolid += sh[i] ? 1 : 0; continue; }   // roads / paths / steps under a face stay walkable
    if (!Core.BLOCKING.has(k)) shaded += sh[i] ? 1 : 0;
  }
  assert.ok(checked > 50 && shaded > checked / 3, checked + ' / ' + shaded); assert.equal(openSolid, 0);
  // the class grid itself is untouched: the map build owns footprints, the projection only draws
  assert.ok(!/C\.BUILDING/.test(Core.oblique.toString()));
}));
test('v7.4 renderer: left face drawn from the oblique poly, right-hand side wall removed, x-ray / reveal / culling use it', () => {
  assert.doesNotMatch(BLD, /function side3\(/); assert.match(BLD, /function leftFace\(/);
  assert.match(BLD, /Core\.OBL\.SHADE\.front/); assert.match(BLD, /Core\.oblique\(b\)\.x0/); assert.match(BLD, /Core\.oblique\(b\)\.poly/);
});
test('v7.4 big props (?obl=shear): box3 top face recedes up-left with a west side face; helicopter mirrored to face east', () => {
  const i = P7.indexOf('function box3('), body = P7.slice(i, i + 1600);
  assert.match(body, /x0 - s, yTop - d/); assert.match(body, /x0 - s, yBot - d/); assert.doesNotMatch(body, /x1 \+ s/);
  const j = P7.indexOf('function heliSprite('), H = P7.slice(j, j + 4000);
  assert.match(H, /scale\(-1, 1\)/); assert.match(H, /facing: 'east'/); assert.match(PR, /PropsV7\.box3\(/);
});

// v7.5: back to the original Stardew Valley look. Every building is a flat upright roof (the footprint lifted by the wall
//       height, same width as the facade) above its south facade. No side walls, no shear, no taper (those stay behind ?obl=).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const Core = require('../js/core.js'); const { loadMap } = require('./helpers.cjs');
const { M } = loadMap();
const rd = f => fs.readFileSync(path.join(__dirname, '../js/' + f), 'utf8');
const BLD = rd('buildings.js'), P7 = rd('props_v7.js'), CORE = rd('core.js');
const byName = re => M.buildings.find(b => re.test(b.name || ''));

test('v7.5 default projection is flat: no building gets a side face, outline = real footprint', () => {
  assert.equal(Core.OBL.MODE, 'flat');
  for (const b of M.buildings) { delete b._obl; const ob = Core.oblique(b);
    assert.equal(ob.faces.length, 0, b.id); assert.strictEqual(ob.poly, b.poly, b.id); if (b.bbox) assert.equal(ob.x0, b.bbox[0]); }
  assert.equal(Core.taper(byName(/^教学楼18#/)), null);
});
test('v7.5 the old experiments are only reachable through ?obl=, default stays flat', () => {
  assert.match(CORE, /obl=\(shear\|\[ABCDE\]\)/); assert.match(CORE, /\|\| 'flat';/);
  const re = /[?&]obl=(shear|[ABCDE])\b/;
  assert.equal(re.exec('?x=1&obl=shear')[1], 'shear'); assert.equal(re.exec('?obl=E')[1], 'E'); assert.equal(re.exec('?obl=Z'), null); assert.equal(re.exec('?obl=Dx'), null);
});
test('v7.5 only mostly-south edges get a facade: no east/west wall is ever extruded', () => {
  assert.ok(Core.OBL.FRONT_MIN >= 0.5); assert.match(BLD, /Core\.OBL\.MODE === 'flat' \? Core\.OBL\.FRONT_MIN : 0\.02/);
  let fronts = 0, sides = 0;
  for (const b of M.buildings) { const P = b.poly; if (!P || P.length < 3) continue;
    let A = 0; for (let i = 0; i < P.length; i++) { const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length]; A += x0 * y1 - x1 * y0; }
    for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length], ex = c[0] - a[0], ey = c[1] - a[1], L = Math.hypot(ex, ey); if (L * 16 < 0.5) continue;
      let nx = ey, ny = -ex; if (!(A > 0)) { nx = -nx; ny = -ny; } nx /= L; ny /= L;
      // screen y points down: a south-facing edge has an outward normal with ny > 0 (same convention as the renderer)
      if (ny > Core.OBL.FRONT_MIN) { fronts++; if (Math.abs(nx) > 0.87) sides++; } } }
  assert.ok(fronts >= M.buildings.length, 'fronts ' + fronts); assert.equal(sides, 0);
});
test('v7.5 v5 wall heights kept (14 + 18 per floor), Stardew touches present (eaves, lower-right drop shadow)', () => {
  const b18 = byName(/^教学楼18#/), d5 = byName(/^文瀛苑5号/);
  assert.equal(Core.wallHeight(b18), 14 + 18 * b18.f); assert.equal(Core.wallHeight(d5), 14 + 18 * d5.f);
  assert.match(BLD, /v7\.5 Stardew eaves/); assert.match(BLD, /v7\.5 soft drop shadow, lower right/);
  assert.match(BLD, /kind === 'main' && window\.LegacyArt/);   // 主楼 facade kept
});
test('v7.5 big props: box3 draws an upright top rectangle, no side face; helicopter still faces east', () => {
  const ops = []; const g = new Proxy({}, { get: (t, k) => k in t ? t[k] : (...a) => ops.push([k, ...a]), set: (t, k, v) => (t[k] = v, true) });
  global.window = { Core }; global.document = undefined;
  const src = P7.slice(P7.indexOf('function box3(')); const body = src.slice(0, src.indexOf('\n  }\n') + 4);
  const box3 = new Function('return ' + body.trim())();
  box3(g, 10, 30, 50, 60, 8, '#111', '#eee');
  assert.ok(ops.length > 0); assert.ok(!ops.some(o => o[0] === 'beginPath' || o[0] === 'lineTo'), 'no polygons');
  for (const o of ops) if (o[0] === 'fillRect') { assert.ok(o[1] >= 10 && o[1] + o[3] <= 30); assert.ok(o[2] >= 46 && o[2] + o[4] <= 51); }
  delete global.window;
  const j = P7.indexOf('function heliSprite('), H = P7.slice(j, j + 4000); assert.match(H, /facing: 'east'/);
});

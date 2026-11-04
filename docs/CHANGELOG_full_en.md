> 注:这是截至 v7.6.4 的英文 README 原文,作为完整更新日志保留。文中引用的 `shots/*.png` 截图大多未随仓库发布(仅 `docs/screenshots/` 中的 3 张)。

# 中北大学 · 像素校园漫步 v7.6.1

A Stardew-style top-down (3/4) pixel walk around the real campus of 中北大学 in Taiyuan.
- The layout is converted from OpenStreetMap and covers 西区, 中心区, 东区, 北区, 南区 · 德怀广场, 二龙山 and the 汾河 edge, at 2.5 m per tile.
- 彭德怀雕像, the 中北大学 gate stone and the 主楼 façade use the art from the earlier campus-walk project, placed at their real positions.
- 德怀楼 wears the user's old 德怀楼 façade (legacy art) in the middle of the real building.
- Enterable buildings:
  - 主楼: the lobby, plus stairs up to the **2F 校史展廊** (walk onto the stairs to change floor)
  - 图书馆
  - 学生一食堂, 学生二食堂 and 田园餐厅, each with stairs up to a **2F 小炒 / 特色窗口** floor (过油肉, 小炒盖饭, 莜面栲栳栳, 羊杂割)
  - **12号楼 · 鸿学楼**: a 3F corridor with classrooms 301/302, blackboards and a podium. Sitting down in 302 starts a 3-question 高数小测
  - **文瀛苑9号公寓**: a 4F corridor and dorm room 413 with bunks; the room goes dark at 23:00 熄灯 (desk lamp and phone screens only)
  - **体育馆**: a basketball court with bleachers
- Students around campus and indoors say short campus-life lines when you press E next to them.
- Flat roofs have solar panels, water tanks, skylights, AC units and vents. Street lamps have a banded pixel glow at night.
- Building names were checked against the official campus map. See `docs/NAMES.md` for the sources; anything unverified is left unnamed.

## Run
The game is plain static HTML with no build step:
```
cd game && python3 -m http.server 8080    # or: npx serve -l 8080 .
```
Then open http://localhost:8080/. It has to be served over HTTP because `fetch` does not work from `file://`.

## Controls
| Key | Action |
|---|---|
| WASD / arrow keys | Walk |
| Shift | Run |
| E / Space / Enter | Enter a door, talk to a student, or read a sign or statue |
| M | Full map (click to teleport) |
| + / − / mouse wheel | Zoom (0.25×, 0.5×, 1–4×). At 0.25× you see the whole campus |
| Q | Show or hide the quest panel (it folds by itself indoors) |
| V | Mute or unmute (also the 🔊 button) |
| N | Skip ahead one hour (day/night) |
| J | Cycle the season: auto (real date) → 春 → 夏 → 秋 → 冬 |
| T | Cycle the weather: auto → ☀ clear → 🌧 rain → ❄ snow |
| 1–4 | Answer the 302 高数小测 (or tap/click an option) |
| Esc | Close the map or dialog |

On touch screens, drag to walk, pinch with two fingers to zoom, and tap the round **E** button at the bottom right. Its label shows 进入 / 交谈 / 查看 / 关闭. To leave a building, walk down onto the door tiles. To change floor, walk onto the stairs.

URL parameters (used for testing and screenshots):
- `x`, `y`: start position in tiles
- `zoom`: 0.25, 0.5, 1, 2, 3 or 4
- `t`: minutes since 00:00, e.g. `t=1290` is 21:30
- `dir`: 0 = down, 1 = up, 2 = left, 3 = right
- `map=1`: open the full map
- `interior=main|main2|library|library2|canteen|canteen2|classroom|dorm|gym`, plus `b=<name>` to pick which building's door you start at (e.g. `b=一食堂`)
- `season=spring|summer|autumn|winter`, `weather=clear|rain|snow`: force season / weather (default: season from the real date, weather rolled per game day)
- `bells=summer|winter`: force the 夏令时 / 冬令时 bell schedule (default: real date)
- `touch=1`: show the on-screen E button on desktop
- `nosave`: don't read or write the save. `reset`: delete the save. `mute`: start muted

Any of `x`, `y`, `t`, `interior` or `nosave` in the URL also turns saving off, so test links never overwrite your game.

`window.__game` exposes the state plus `teleport`, `enterInterior` and `exitInterior`.

## Tests
```
cd game && npm test        # node --test, no dependencies
```
The tests check:
- the map raster against its metadata
- that the areas and key buildings are present
- that the OSM statue node lands on its POI
- that the spawn is walkable and every enterable door can be reached on foot (flood fill)
- that buildings block movement and roads do not
- that interiors are rectangular, have an exit (a door, or stairs down) and can be walked
- that every interior character is either floor or solid furniture
- that the new rooms have their furniture (blackboards, desks, bunks, hoops, bleachers)
- that the 主楼 1F↔2F stairs are linked and the arrival points can be walked and reached
- that the classroom, dorm and gym doors exist on the map and can be reached
- the clock and day/night helpers, wall heights (18 px per floor, 主楼 tallest on the whole map), and the legacy-art port
- phase 3 (`tests/phase3.test.cjs`):
  - bell times, the schedule (canteen crowds, NPC goals, lit windows), quest checks, and the zoom steps
  - that the quest targets (12号楼, the 一食堂 刀削面 counter, the 二龙山 summit) and the library 2F desk can be reached
  - the save round-trip, and that a garbage save is rejected
  - lamp count, spacing, and that lamps never block a door
- v6 (`tests/v6.test.cjs`): doors reachable under full collision, porches, underpass ends, fences have reachable gates, rail blocked except at the crossing, split proportional courts, and 二龙山 terraces
- v7.1 (`tests/v71.test.cjs`): the 四道门 underpass has two entrances and one shared exit, the willow stands in the 二道门 crossing, the rail park sits opposite 行知广场, the tank exists, and every road/path/steps cell stays walkable and connected under roofs
- v7.5 (`tests/v75.test.cjs`): flat Stardew projection by default (no side faces, outline = real footprint), only mostly-south edges get a façade, v5 wall heights kept, eaves and drop shadow present, `box3` draws an upright top with no side face, the helicopter still faces east
- v7.6 (`tests/v76.test.cjs`, `tests/v76b.test.cjs`): the 南区 underpass (stairs + slope, both mouths reachable), 15号楼 / 4号楼, 柏林园 and 刘鼎; base-only building collision (ground under the lifted roof walkable) and the whole-building fade (the old underpass test now checks it is gone and the road runs straight through)
- v7.6.1 (`tests/v761.test.cjs`): the 南区 road runs straight under the rail bridge (continuous road, abutments/retaining walls block, deck art drawn above the player), the 地下停车场 ramp/canopy/sign/vents beside the N–S road with a walkable lawn roof, the 小树林 paths/喷泉/凉亭, and the standing rules (trees no collision, roads walkable, base-only collision)
- v7.6.1 terrain (`tests/v761b.test.cjs`, 7 tests): terrain.png matches the grid, terrace walls only on natural ground, a wall at every DEM level change on open ground, road ramps with a direction, uphill slow-down, 二龙山 untouched, no trees on walls / stairs reachable
- v7.6.1 slopes (`tests/v761c.test.cjs`, 6 tests): the four named slopes (rail-bridge dip both sides, 1.5道门 → 二道门, 软件 ↔ 兵器, 瑾瑜 → 兵器), side walls never block, foundations on sloping sites, minimap contours, the 瑾瑜国际会议中心 label
- phase 4 (`tests/phase4.test.cjs`): far-zoom y-sort, season by month and per-day weather, season/weather/day/log in the save, pinch steps, the 食堂 2F stairs, 熄灯 times, day-varying quests and the 第 N 天 log, the 高数 quiz bank, and the 冬令时/夏令时 bells

## Rebuild the map
```
python3 tools/build_map.py          # needs Pillow + numpy; the DEM tiles in data/dem/ (tools/fetch_dem.py)
```
`tools/build_map.py` reads `data/osm_map.xml` (raw OSM) and `data/supplement_px.json` (hand-traced additions). It writes `game/data/ground.png` (8-bit class index per ¼-tile sub-cell) and `game/data/map.json` (buildings with floors, roof style, door and interior key; trees; rail lines; labels; POIs; spawn).
- With the Esri mosaic present locally (`data/sat_z18.jpg` + `.txt`), the output is byte-identical to the shipped version (verified by md5).
- That imagery is not redistributed. Without it, the script still runs (only `data/crops/meta.json`, the georeference for the traced supplement, is needed). It falls back to class-based roof colours and seeded tree placement, with somewhat fewer trees (about 15.7k instead of 23.5k), and the tests still pass.

`tools/preview_map.py` renders a debug PNG. `tools/build_chars.py` rebuilds the student sprites from the CC0 Julia sheet: download it from OpenGameArt into `assets_src/julia/`.

## Architecture (game/js)
- **`core.js`**: pure logic that also runs in Node, so it can be tested: classes, projection, collision grid (¼-tile), axis-separated movement with corner sliding, interior grids, clock.
- **`ground.js`**: procedural per-pixel ground shader. Each class has its own pattern: grass tufts, curbed asphalt, running-bond brick paths, plaza pavers, water, court markings, track, parking bays, cliffs, steps.
- **`buildings.js`**: prerenders each OSM footprint as a 3/4 sprite. (v6) Per-building looks come from the `LOOKS` table, see `docs/BUILDING_LOOKS.md`. South-facing edges are extruded into façades with windows, floor bands and plinth. The roof is the footprint lifted by the wall height, styled red tile, blue steel, dome, pavilion or flat with parapet, AC units and penthouses. Sprites are cut into vertical strips so each strip can be y-sorted against the player.
- **`fields.js`** (v6): real-metre court and field templates (basketball, tennis, volleyball, badminton, multi, football), scaled uniformly onto each field, plus the running track.
- **`props.js`**: trees (deciduous, pine, shrub, blossom), lamps, and legacy statics. (v6) Also gate arches, underpass stair pits, and fence meshes with gate posts.
- **`legacy_art.js`**: the ported MIT art.
- **`interiors.js`**: ASCII-grid interiors drawn at 2×, with furniture collision. The rooms are the canteen, library, 主楼 lobby and 2F, classroom corridor, dorm, and gym. Stairs are `U`/`V` tiles linked through `def.up`/`def.down`.
- **`game.js`**: the game itself:
  - loading, and 512 px ground chunks rendered lazily (LRU of 70)
  - y-sorted draw list, plus a translucent "ghost" of the player when something covers them, and (v5) see-through x-ray ovals in tall façades/roofs around the player and nearby entrances
  - lerped camera with integer zoom
  - NPCs and seated diners, with talk lines picked per place
  - day/night tint and lamp glow
  - wood/paper HUD, minimap and full map
  - fades between the campus and interiors

## What we took from https://exist.qd.je/pixel/
That site has no licence, so **no code or assets were copied**. We took these ideas and techniques and implemented them ourselves:
- Prerendered, chunked ground with procedural texture variation instead of a tile atlas.
- Buildings drawn as façade plus raised roof, sorted by the base y of the footprint, so you can walk behind them.
- A warm wood-frame and paper HUD with a pixel CJK font (we chose the OFL Ark Pixel font), a clock with an area name, and a framed minimap.
- A smoothly lerped camera with integer zoom steps to keep pixels crisp.
- Context hints such as "按 E 进入「…」", fade transitions into small hand-made interiors, and a day/night tint with lamp glow.

## v2 changes
- 德怀楼 uses the legacy façade. The 主楼 roof label moved to the north roof edge, so it no longer overlaps the 中北大学 lettering.
- Building names were re-verified against the official map (`docs/NAMES.md`, `tools/official_map_fit.py`). 体育馆 was moved to the correct footprint.
- New interiors: classroom, dorm, gym, and 主楼 2F.
- NPC talk, the on-screen E button, roof details, and a crisper lamp glow.
- `tools/e2e_flow.js` is a manual Playwright check. It walks up and down the 主楼 stairs, out of the main door, and into the classroom building. It needs playwright-core, Chrome and a local server on :8765.

## v3 changes
- **Night**
  - Building windows light up warmly after dusk, randomly per window. How many windows are lit depends on the building type and the hour: dorms are brightest in the evening and go dark at 23:00 熄灯, and the library stays lit until 22:30.
  - There are now 1101 street and plaza lamps (up from the rim-only layout), including a grid across the 主楼 plaza.
- **Zoom**
  - Zoom now goes down to 0.5× and 0.25×. At those levels the game uses cached far chunks, building LODs, scaled characters (dots at 0.25×) and lamp glow.
  - The full campus fits on screen at 0.25× (see `shots/v3_overview.png`).
- **Daily schedule**
  - Class bells (上课/下课/晚自习) ring at a fixed timetable starting at 08:00, with a toast and a sound. (v4: now checked against public sources, see below.)
  - The canteens fill up for breakfast (06:50–08:00, half full), lunch (11:30–13:00) and dinner (17:30–19:00), with queues at the counters.
  - Students drift toward teaching buildings, canteens, the library or dorms depending on the hour, and mostly go indoors late at night.
- **Quests**
  - The panel (Q) lists four quests:
    - go to class in 12号楼
    - eat 山西刀削面 at 一食堂 (press E at the counter)
    - borrow a book in 图书馆 2F
    - climb to the 二龙山长廊
  - Finishing one gives a toast, a chime and a ✓. Finishing all four shows 🎉.
- **Sound**
  - CC0 sounds play footsteps that depend on the surface (concrete, grass, wood), birds by day, crickets at night, and the class bell. The quest chime is synthesised.
  - Audio starts on the first key or tap. Press V or the 🔊 button to mute.
- **图书馆 2F**: stacks and a borrowing desk, reached by the stairs in the library.
- **Save**
  - The game saves to `localStorage` (`nuc-campus-save-v1`) every 5 s and when you leave the page. The save holds your position, the room you are in, the time, zoom, quests and mute setting.
  - Use `?reset` to start over.
- **Performance**
  - The building sprite cut is now computed analytically, without pixel readback.
  - The minimap and full map are cached, and building sprites are prewarmed in idle time, nearest first.
  - Far-zoom frames are about 9× (0.5×) and 50× (0.25×) cheaper than in v2.
- `tools/e2e_phase3.js` is a manual Playwright check. It hears the 08:00 bell, completes all four quests, reloads to check the save (including inside 图书馆 2F), then checks `?reset`.

## v4 changes
- **0.25× fix**: student dots no longer draw over the roofs of buildings to their south (far zooms y-sort dots against building bases too).
- **Seasons & weather** (J / T keys, `?season=` / `?weather=`, saved):
  - The default season follows the real date; November is 秋: ginkgo-gold, orange and red trees and dry grass with fallen leaves.
  - 冬 (Taiyuan winter): bare trees, snow-laden pines, snow on roofs (clipped to each roof, with eaves), snowy ground, packed snow on paths, slushy roads, an icy 汾河.
  - 春 has blossom trees, 夏 deeper greens.
  - Weather is rolled per game day by season (snow mostly in winter, rain mostly in summer). Rain draws streaks, splashes and umbrellas over the walkers, plays a CC0 rain loop and hushes the birds and crickets. Snow draws drifting flakes. The HUD clock shows 春/夏/秋/冬 plus ☀/🌧/❄.
- **Pinch-to-zoom** on phones (two fingers; one finger still walks). The phone HUD is more compact.
- **食堂 2F**: stairs in every canteen lead up to 二楼小炒 / 特色窗口 (过油肉, 小炒盖饭, 莜面栲栳栳, 羊杂割), with their own lines and a lighter crowd.
- **宿舍熄灯**: at 23:00 a toast says 熄灯了, and the dorm room dims to a single desk lamp with phone glows until 06:30. The dorm windows outside already went dark in v3.
- **Day-varying quests + 第 N 天 log**: day 1 keeps the classic four. Every later day gives 302 class plus three of 刀削面, 二楼过油肉, 二龙山, 图书馆借书, 彭德怀雕像打卡, 体育馆打球, 主楼校史展, and 熄灯前回宿舍 (21:00–23:00). At midnight the panel logs 第 N 天 x/y (★ when complete) and the new list arrives.
- **302 高数小测**: sitting down in 12号楼 302 opens three multiple-choice questions (limits, derivatives, integrals; 10-question bank, picked per day). Getting 2 of 3 right finishes class. Otherwise stand up and sit again to retry.
- **Bell times checked** against public NUC pages. Mornings are 8:00–9:40 and 10:10–11:50. Afternoons start at 14:00 (冬令时) or 14:30 (夏令时, ≈5月6日–10月8日). Evening times are still approximate. See `docs/bell_times.md` for the sources.
- `tools/e2e_pinch.js` (CDP touch pinch) and `tools/e2e_quiz.js` (answers the quiz, checks the class quest and the day roll) are new manual Playwright checks. `e2e_phase3.js` now answers the quiz.

## v5 changes
- **Bigger buildings.** Walls are now 18 px per floor (was 10), so a building reads at a more believable size next to the 32 px player:
  - `wallHeight = 14 + 18 × floors`, minimum 22 px, cap 230 px (was 96, which flattened 5F and 9F into the same height). See `Core.WALL` in `js/core.js`.
  - 1F 32 px, 5F 104 px, 6F 122 px, 8F 158 px.
  - **主楼 260 px** (was 150), still the tallest and grandest building on the map. Its legacy façade scales with it.
  - **德怀楼 140 px** (was 80). The legacy façade still sits in the middle, and the 彭德怀雕像 in front is unchanged.
  - Pavilions are 32 px.
  - Ratios to the player (32 px): 12号楼 5F is 3.25× (was 2.0×), 主楼 8.1× (was 4.7×). Real life is about 9.7× and 17.5×, so the art is still compressed, but much less.
- **X-ray.** Taller roofs can now hide whatever stands just north of them. Any façade or roof strip that covers the player is cut with a soft see-through oval (30% alpha), and so is any enterable door within 10 tiles. The old ghost stays as well.
  - The case this fixes: 文瀛苑9号公寓 (the player's dorm) is 4.6 tiles north of 10号公寓, whose 6F roof now covers 9号's door. Its sign still peeks over the roof, and the x-ray shows the door. This is the only enterable door affected.
  - A door never cuts its own building, so 主楼's entrance stays solid.
- **Roads.** The road/path area hidden behind walls or roofs grew from 5.2% to 9.2%. It is mostly the thin strips of road just north of long 5–6F blocks, such as the road along the railway behind 怡丁苑1号公寓, the ring road behind 德怀楼's west wing, and the 北区 east–west road. The player and doors stay visible through the x-ray. See `shots/v5_road_cover.png`.
- Not affected (checked): the minimap and full map (footprints only), door hints and fast travel (tiles), and the far-zoom y-sort (by footprint base, so 0.25× dots still never draw over roofs).
- **Performance.** Sprite memory went from 22.0 to 24.8 MPx. A 1× frame takes 3.0 → 3.4 ms, while 0.5× and 0.25× frame times are unchanged.
- Shots: `v5_scale_zhulou.png`, `v5_scale_2.png`, `v5_scale_compare.png`, `v5_before_after.png`, `v5_overview.png`, `v5_xray_dorm.png`, `v5_road_cover.png`, `v5_far025.png`, `v5_dehuai_statue.png`.
## v6 changes
The fixes follow the play-test feedback, in priority order.
- **Entrances (1a).**
  - **Rail underpasses** are real two-ended passages: 四道门地下通道 and 兰伙路下穿通道. Each end has a stair pit with parapets and a blue sign. Press E at one end to walk through (a short fade) to the other side's exit spot. The 四道门 arch was dropped because it sat on top of the pit.
  - **Campus gates** (二道门, 三道门, 五道门, 六道门) get brick pillars with a name beam over the road, and the pillars block movement. Where the road does not run through the gate point, a sign stands instead.
  - **The 二道门 level crossing** is the only place the railway can be crossed on foot. It has rubber crossing panels with yellow-black edges. The rail has fence posts on both sides everywhere else, and the rail cells block movement.
  - **Canteen doors:** 学生一食堂, 学生二食堂 and 田园餐厅 have a porch/annex that owns the door.
  - **Interior exits** put you back on a free tile outside the door, never inside a tree, lamp or wall.
  - Trees are cleared from fence lines, gate mouths and underpass ends so none of them block an entrance.
- **One court template, scaled (1b).** `js/fields.js` holds real-metre templates: basketball 15×28 m (keys, free-throw circles, 3-pt arc, hoops), tennis, volleyball, badminton, multi-court, and football 68×105 m (boxes, arcs, goals). Each field scales the template uniformly to its size and rotates it to follow the long side. The 400 m track has rounded lanes.
- **Split basketball courts (1c).** The solid red pads are now 32 individual marked courts: a 5×4 block in 东区, 2×5 by the 大操场, and singles.
- **二龙山 elevation (2a).** The hill has 7 stepped bands taken from the v0.3.28 contour idea and drawn in 3/4: each band gets its own tint, and each step is a terrace face with a grass lip, an earth face with ledges, and a dark foot shadow. Terrace faces block movement, and the paths and steps still reach the summit. The data is in `data/elev.png`.
- **Building looks (2b).** Facades now vary by building: brick for the older 3F type, cream with balconies, white or yellow with coloured spandrel bands, blue-grey ribbon glazing, and glazed stair cores. 文瀛苑17号 has a 回字 courtyard. Unnamed blocks pick a variant by hash. 主楼, 德怀楼 and the 彭德怀雕像 are unchanged, and so are the v5 heights. Sources and verification status are in `docs/BUILDING_LOOKS.md`: most looks are text-sourced or unverified, and no photos ship.
- **Fences with gates (3a).** The 大操场 has 4 gates, the 怡丁苑足球场 3, and the 东区足球场 2. They are mesh fences with posts, gate openings are walkable, and the fence line itself blocks movement.
- **Paths (3b).** Walkways still come from OSM footway/path/steps. No hand edits were made against the official map this round (see "Unresolved").
- **Tests:** `tests/v6.test.cjs` adds 7 tests, for 39 in total:
  - doors reachable with full collision (trees, lamps, fences, pits) and exit spots free
  - porches own the canteen doors
  - both underpass ends reachable
  - every fence has open gates reachable from both sides, and the fence line is solid
  - rail cells block, and the crossing can be walked and reached
  - at least 30 basketball courts, and templates are proportional
  - at least 5 elevation bands, terraces block, and the summit is reachable
- **Shots:** `v6_*.png` after shots, plus `v6_cmp_*.png` before/after pairs (v5 | v6): basketball, 怡丁苑 football fence, 二龙山 terraces, dorm row, 二道门 crossing, 四道门 underpass, 大操场, and 文瀛苑17 courtyard.
- **Unresolved:**
  - Most facade colours have no photo.
  - Floor counts: sources say 文瀛6, 9 and 13 are 3F and 文瀛4 is 2F, but OSM (and so the game) says 6F. Heights were kept as asked.
  - The walkways have not been redrawn against the official map `cm2.jpg`.

## v7 changes
The fixes follow the v6 play-test feedback. All positions are approximate. Sources are in `docs/V7_SOURCES.md` and names in `docs/NAMES.md`.
- **Gates and perimeter (14, 10).**
  - A wall runs around the campus. The map edge, the river and the fenced railway close the remaining sides.
  - Only 一道门, 1.5道门, 七道门 (east edge on 兰伙路, facing 兰村 and 田园餐厅) and 北门 (= 新北区东大门) open the wall.
  - 二, 三, 四, 五 and 六道门 are place-name labels only, with no frames.
  - 二道门 is now a big willow by the level crossing.
- **Stardew perspective (15).** Ground behind or under a building's roof is blocked, the way Stardew puts back walls on its impassable "Buildings" layer and roofs on the "Front" layer. The player can no longer stand on a roof (the img6 / 17# bug). The only walkable cells left under roofs are short carved links to doors, gates and the 门洞: 4.2% of roof cells.
- **Trees (16).** Trees no longer collide. A tree turns semi-transparent while it overlaps the player.
- **Player marker (17).** A big, bright, blinking marker with a direction arrow, on the minimap and the M map.
- **Wayfinding (1).**
  - Names for the 北区 buildings (17#, 18#, 兵器馆, 龙山餐厅, …).
  - Sub-area labels, and a "区 · 地点" line in the HUD.
  - A proximity intro card for big buildings (idea from exist.qd.je/pixel, reimplemented).
- **17#–18# 连廊 (18).** A two-floor bridge on piers joins the buildings, and the interiors link both ways ("走连廊").
- **兵器馆门洞 (19).** s15 is a ground-level arcade from the inner court to the 北门 plaza.
- **北门 (2).** An entrance plaza with a 升旗台, a fountain and gate pillars on the wall.
- **行知广场 (3).** A 升旗台 on the axis, and grey granite paving with a red axis.
- **中北大学 校名石 (9).** Moved into the plaza's SW corner and aligned with the plaza.
- **Canteens (6).** 文瀛食堂 and 龙山餐厅 can be entered.
- **Courts (7).** Every court pad is fenced and has gates.
- **Underpasses (13).** A large glass canopy covers each stair pit.
- **铁路主题广场 (12).** Platform, 上兰村 station sign, signals, a wheel set and two old coaches.
- **二龙山 (5).**
  - The 长廊 is a stepped covered corridor with red columns, a railing seat and a green tile roof. It has 攒尖 pavilions at both ends and a two-tier one at the bend.
  - Stair flights are widened, and roads also get stairs where they cross a terrace.
  - Every hill plateau is reachable with the real player footprint.
- **Steps (4).** Treads with nosing and risers, side cheeks, and shading graded along the flight.
- **Tests.** `tests/v7.test.cjs` adds 9 tests, for 48 in total: trees, perspective, gates, courts, canteens, stairs, 17–18 link, 门洞 and 二龙山 reachability.
- **Shots.** `v7_*.png`, plus `v7_cmp_*.png` before/after pairs (v6 | v7).
- **Known limits.**
  - The 连廊 and the 门洞 are mostly hidden behind the roofs south of them; you see the player through the x-ray hole.
  - 1.5道门, the canopy look and the plaza colour have no photo source.
  - The HUD region name for 17# and 18# still says 东区.

## v7.1 changes
- **四道门 underpass.** There are now two glass-canopied entrances, west (x 467.6–482.9) and east (x 492.6–505.3), on the north side of the railway. Each has a ramp, and both lead to the same south exit by 四道门 (the portal is shared). 兰伙路 is unchanged.
- **二道门 willow.** The willow now stands in the road where the road meets the level crossing. The junction is widened to a ROAD disk (r 5.2) with a footway rim so you can walk around the tree. The tree has no collider, so the crossing stays open, and it fades when the player is behind it.
- **铁路主题公园.** Moved opposite 行知广场, on the north track: a DF4 locomotive plus six green 25-type coaches with a yellow stripe (YZ25), a platform, a 上兰村站 sign, and two signals.
- **Tank display (坦克展台).** The old rail-plaza spot north of the 怡丁苑 football pitch held (moved south in v7.5.1) a tank on a grey plinth, set on a lawn, with lamps and an info card. The coach and wheelset props are removed from there.
- **Roads under roofs.** ROAD, PATH and STEPS cells are always walkable, even under a facade or roof (`Core.SHADOW_OPEN`). Only a building footprint blocks. Buildings render normally. When the player steps onto a road stretch that a building covers, that building's overlapping strip smoothly fades to semi-transparent, and it fades back when the player leaves. The perspective test is updated, and a road walkable/connected test is added.
- **Shots.** `v71_cmp_underpass/willow/railpark/tank.png` (v7 | v7.1), and `v71_cmp_road_reveal.png` (v7 blocked | v7.1 player in the covered road | v7.1 player away, normal rendering).
- **Sources.** Satellite tiles (`data/sat_z18.txt`) were used for the canopy positions and the train line. The layout is in `tools/layout_v71.py`.
- **Known limits.** The coach and locomotive livery and the tank model are generic pixel art, not copies of the real exhibits.


## v7.2 changes
- **北区 names west of 北门广场** (corrected by the user, a NUC student). Across from 软件实验大楼 is **兵器教学陈列馆** (C 座, 展馆). East of 软件 is **航空宇航学院** (B 座; the user wrote 航天宇航学院). East of the 陈列馆 is **机械工程学院** (A 座). Both 学院 show 学院楼 on their cards. The names now agree across map labels, minimap, full map, HUD, intro cards and the 北门 text. No quest pointed at the old names.
- **门洞**: no label and no card any more ("兵器馆门洞" and the "兵器馆" sub-label are gone). It is still a walkable arcade.
- **One clean fade** at the 门洞. B 座, the 门洞 wing and A 座 share a `fadeGroup` and fade together. The 门洞 wing now has the same look and roof colour as B 座, so there is no stray grey block. The reveal mask fills gaps of 2 tiles or less, has a soft edge, and includes the paved 门洞 floor (`meta.revealRects`). Bridges get a reveal strip too.
- **北门广场** is open: no lamps in the middle, only sparse rim lamps (`meta.openPlazas`).
- **宣传展板**: a row of 6 generic boards between the two 学院 and 北门广场, with an intro card. Their real content was not found.
- **展示直升机** on a plinth on the lawn east of the 门洞 wing. It is a generic model, has collision on its body only, and has an intro card.
- **HUD**: 17# and 18# now read 北区, not 东区 (`meta.areaRects`).
- Tests: `tests/v72.test.cjs` (7 tests). Shots: `v72_beiqu_names.png`, `v72_cmp_beimen.png`, `v72_helicopter.png`.

## v7.3 changes
- **Three visible faces.** Every building now shows its roof, its front façade and a shaded side wall on the right (east). The light comes from the upper left.
  - The side strip is narrower and darker than the front. Its depth scales with wall height (about 0.24 × wall height, 4 to 26 px).
  - It has its own windows, floor bands and plinth. The front windows and bands are unchanged.
  - It is drawn inside the old silhouette (`side3` in `buildings.js`), so collision, sort order, x-ray, occlusion and the road-reveal fade all behave as before.
  - 主楼 and 德怀楼 keep their legacy façades and only gain the side strip. The 彭德怀 statue is untouched.
  - Big props now have a top face and an east side face (`PropsV7.box3`): gate pillars, the gate stone frame, the tank and helicopter plinths, and the 宣传展板.
- **龙山餐厅 outdoor staircase.** A wide flight runs up to the south door: 13.5 tiles (about 34 m) wide and 8 treads deep.
  - Each tread is drawn raised by its height, with a bright nosing and a dark riser.
  - Stone cheek walls with handrails climb with the flight, and a central handrail runs down the middle.
  - At the top there is a landing slab. The glass door and name board are raised onto it.
  - Characters on the flight are drawn lifted (`Core.stairLift`), so you visibly climb. Collision and sorting still use the ground position.
  - A paved service lane at the foot of the flight joins the west and east roads.
  - The cheek walls are solid; the treads are walkable.
  - Sources are in `docs/NAMES.md` (v7.3).
- Tests: `tests/v73.test.cjs` (5 tests). They cover the flight's presence, contiguity, reachability from door to lane to roads to spawn, cheeks, lamps, trees and lift, plus side-face and `box3` checks.
- Shots: `v73_cmp_threefaces_zhulou.png`, `v73_cmp_threefaces_dorm.png`, `v73_cmp_threefaces_beiqu.png`, `v73_cmp_longshan_stairs.png`.

## v7.4 changes
- **Three-view buildings (上视图 + 正视图 + 左视图).** The v7.3 right-hand side wall is gone. Each building is now drawn from three views put together:
  - **Top view:** the roof, shifted up by the wall height and to the left by the receding depth.
  - **Front view:** the full south façade, unchanged.
  - **Left view:** the west face, a sheared parallelogram joined to the left edge of the façade and the left edge of the roof.
- **Projection** (`Core.OBL`, `Core.oblique(b)`). It is a cabinet-style oblique view:
  - Each west-facing footprint edge recedes K = 0.35 px to the left per px of north–south depth.
  - The receding depth is capped at 160 px, so the widest left face is 3.5 tiles. Edges shorter than 6 px are skipped.
  - The light comes from the upper right. Shading is top 1.0, front about 0.9, left 0.72.
  - The left face has its own window columns, floor bands, plinth and brick, in the same material as the front.
  - 174 of 177 buildings get at least one left face.
- **Behaviour:**
  - Collision is still the real footprint.
  - Ground under a left face counts as under-roof (`roofShadow`), but roads, paths and steps there stay walkable.
  - The sprite bbox, culling, x-ray pieces and the road-reveal fade all use the extended outline, so the fade also clears the left face.
- **Big props** (`PropsV7.box3`) now show a top face that recedes up-left and a west side face. Deeper boxes are used for the gate pillars (8 px), the tank plinth (16), the helicopter plinth (14) and the boards (3).
- **Display helicopter** is mirrored and now faces east (nose to the right).
- Tests: `tests/v74.test.cjs` (5 tests). The v7.3 side-wall test now checks the new projection.
- Shots: `v74_cmp_zhulou.png`, `v74_cmp_dorm.png`, `v74_cmp_beiqu.png`, `v74_cmp_longshan.png` (v7.3 | v7.4), and `v74_helicopter.png`.

## v7.5 changes
- **Original Stardew Valley look.** All side-face experiments are dropped. Every building is now drawn as just two parts:
  - **Roof:** a flat upright rectangle seen from above. It is the real footprint lifted by the wall height, the same width as the façade.
  - **Front:** the south façade below the roof.
  - **Gone:** the v7.4 left face, the v7.3 right wall, the shear and the taper.
- **Which edges get a façade:** only footprint edges that face mostly south (`Core.OBL.FRONT_MIN = 0.5`, within 60° of south). So an east or west wall is never extruded, even on the slightly rotated dorms.
- **Stardew touches:**
  - Eaves: the roof overhangs the façade by about 2 px, with a lit drip edge, a darker fascia board and a soft shadow under it.
  - A two-step soft drop shadow on the ground to the lower right.
  - Rooftop details as before.
- **Kept from v7.4:**
  - v5 wall heights (14 + 18 px per floor)
  - the road-reveal fade, the blocking rules and collision (real footprint)
  - the 主楼, 德怀楼 and 彭德怀 art
  - the east-facing helicopter
- **Big props:** `PropsV7.box3` now draws an upright top rectangle above the front, d/2 px tall, with no side face.
- **Comparison only:** the old projections are still reachable through the URL. `?obl=shear` gives the v7.4 left face, and `?obl=A|B|C|D|E` give the v7.5 mock-ups. The default is always the flat Stardew look.
- Tests: `tests/v75.test.cjs` (5 tests). The v7.4 projection tests now run in `shear` mode.
- Shots: `v75_stardew_cmp.png` (v7.4 | v7.5 for 18#, 文瀛苑5号, 主楼 and 龙山餐厅) and `v75_stardew_overview.png` (1×, 西区 · 文瀛苑).

## v7.5.1 changes
- **Tank display moved to the south side of the 怡丁苑 football field.** v7.1 had put it on the lawn north of the pitch, under 怡丁苑1号公寓, which was wrong.
  - It now stands across the road below the field, on a lawn cleared out of the wood. The lawn is `TANK.lawn` (297–331 × 425–436.5).
  - The grey plinth (`TANK.plinth`) has plaza lamps round it, and a short footpath (`TANK.link`) joins it to the road.
  - Tank sprite at (314, 430). Its collision box moves with it; the plinth front is walkable.
  - The `坦克展台` area label follows the tank.
- **Old north spot:** back to plain lawn, with no paving and no lamps. Nothing else changes.
- Tests: `tests/v751.test.cjs` (5 tests).
  - Checks that the tank is south of and outside the fence, that none of it is on a road, and that no trees or buildings sit on its lawn.
  - Also checks the lamps, that the north spot is restored, and the collision and reachability.
  - The v7.1 tank test now asserts the south position.
- Shot: `v751_tank.png` (before | after).

## v7.6 changes
- **南区铁路地下通道** (passage `nanqu_rail`) — *superseded in v7.6.1: it is a normal road under a rail bridge, see below*: an underpass under the rail, on the N–S road between 文瀛苑 / 柏林园 (north) and
  15号楼 (south). Each mouth has **stairs (台阶) on one half and a smooth slope (斜坡) on the other**, with a yellow handrail
  between them and a glass canopy in the 东区 四道门 underpass style. Walk into a mouth to come out at the other one.
  - The road crossing the rail at grade (x 241–245, y 374–376) is rail + fence and was already blocking in v7.5.1, so the
    underpass is the way across here.
  - Sources: the 东区 underpass design (5 m × 2.87 m × 11 m, glass canopy) at jbjsc.nuc.edu.cn/info/1675/1115.htm, and
    台阶 + 斜坡 at hqfw.nuc.edu.cn/info/1015/1130.htm. No page documents this exact underpass, so its look is assumed.
- **15号楼 · 逸夫楼** (U-shape, 5F) at the south mouth, and **4号楼 · 酬学楼** (4F) about 140 m further south, behind 德怀楼.
  Both footprints are approximate. Sources: jbjsc.nuc.edu.cn/info/1675/1096.htm and a-site.cn/article/1588537.html.
- **柏林园**, taken from the OSM park 1069158508. It has:
  - a 侧柏 forest (a new columnar cypress tree type), paths, an entrance plaza, a pond with a fountain;
  - the 77 m 文化长廊, a 凉亭 and a culture wall;
  - a label and an intro card.
  - Sources: baike.baidu.com/item/柏林园/3364823, hqfw.nuc.edu.cn/info/1015/1312.htm, hqfw.nuc.edu.cn/info/1015/4757.htm
    and dwxcb.nuc.edu.cn/info/1169/13582.htm.
  - The interior layout is approximate. The 孔子塑像 is not added.
- **刘鼎塑像**: the 2002 bust (0.6 m) with a label, an E-info hint and an intro card. The card gives his biography and the
  inscriptions by 聂荣臻 and 习仲勋. Sources: jbjsc.nuc.edu.cn/info/1681/1192.htm and dwxcb.nuc.edu.cn/info/1021/1172.htm.
  The exact spot inside the park is unknown, so the bust sits at the entrance plaza.
- **Collision = the building base only.** Only the real footprint at ground level blocks. The roof is drawn lifted by the
  wall height, and the ground under it, north of the base, is now walkable (`roofShadow` is no longer used for collision).
  Roads under a building drawing stay walkable.
- **Whole-building fade.** When a building hides the player, the WHOLE building eases to α ≈ 0.45 (`Core.FADE_ALPHA`), and
  eases back to opaque when the player leaves. This covers standing behind it, under its lifted roof or facade, or on a road
  it covers. It is tested against the sprite's opaque pixels and the draw order (`hidesPlayer`).
  - Fade groups (航空宇航学院 / 门洞 / 机械工程学院) still fade together.
  - The old x-ray ovals and the road-strip cutouts are removed.
- Tests:
  - `tests/v76.test.cjs` (8 tests; 6 since v7.6.1): underpass, buildings, 柏林园 and 刘鼎.
  - `tests/v76b.test.cjs` (5 tests): footprint collision and the fade.
  - The v7.1 reveal assertion now checks the fade.
- Shots: `v76_underpass.png` (before | after), `v76_bailinyuan.png`, `v76_liuding.png` and `v76_fade.png` (opaque | faded).

## v7.6.1 changes
- **南区铁路桥 — a normal road under the railway** (replaces the v7.6 地下通道). The N–S road between 文瀛苑 / 柏林园 and
  15号楼 now simply runs straight on under the rail. The rail crosses on a small bridge: a concrete deck with railings and
  two abutments, the road slightly sunken under it with gentle slopes and low retaining walls on both sides.
  - No teleport, no glass canopy, no stairs. The rail fence posts stop at the bridge, the rail cells under the deck are
    repaved as road, and you just walk through.
  - The deck is a static drawn above the player while you are under it, and it fades (α ≈ 0.45) so you can see yourself.
    Only the abutments and the retaining walls block.
  - Source: the user's description (「正常在铁路下面修的一条路…沿着那条路直着下去」). The road line is the OSM way; the
    bridge size and the sunken profile are assumed.
- **地下停车场** just south of 15号楼 · 逸夫楼, east of the N–S road (where the player stood in the user's screenshot):
  a vehicle ramp with a short paved link from the road, a glass canopy over the lower ramp, a blue "P 地下停车场" sign,
  a green lawn roof with four vents, and a label. The lawn is walkable; only the ramp side walls block.
  - Sources: the user; hqfw.nuc.edu.cn/info/1084/10756.htm (南区地下车库, 150 元/月). OSM has no parking tag here.
  - Uncertain: the ramp position and direction are approximate, placed on a faint light strip next to the SW corner of
    15号楼 seen on satellite imagery (used for research only, not shipped). The garage extent is assumed.
- **小树林** south of the garage, inside OSM park 1069158507: trees (no collision), four paved paths, a 喷泉 on a small
  round plaza, a 凉亭 (小树林凉亭), and a label.
  - Sources: the user; jbjsc.nuc.edu.cn/info/1680/1039.htm (the 2008 plan: a square with a fountain at the 地下通道 / garage
    entrance); www.nuc.edu.cn/info/1353/37503.htm (2025: 修葺休闲凉亭, 增设花园小喷泉). The fountain spot follows the
    satellite imagery; the 凉亭 spot and the path layout are approximate.
- **柏林园 stays where it was** (OSM park 1069158508, north of the rail next to 二龙山). It matches the sources
  (校园西南角, 二龙山东麓). OSM park 1069158507, south of the rail, is the 小树林 above.
- Rules kept: flat Stardew roof + façade (no side walls), base-only collision, whole-building fade, trees without
  collision, roads walkable.
- **坡 — real height differences from a DEM** (「中北大学其实有很多很多的坡」).
  - DEM: Mapzen / Tilezen **Terrarium** terrain tiles, z15, from AWS Open Data (https://registry.opendata.aws/terrain-tiles/).
    Over China they come from **SRTM** (NASA / USGS, public domain). Attribution: "Terrain tiles: Mapzen / Tilezen
    (AWS Open Data), SRTM data courtesy of NASA / USGS." The six tiles are elevation grids (not imagery), shipped in
    `data/dem/` (340 KB); `tools/fetch_dem.py` re-downloads them.
  - `tools/terrain_v761.py`: height sampled per tile, smoothed (~10 m), quantised into **3 m levels**
    (DEM 811–975 m over the map; the campus falls from ≈860 m in the north to ≈820 m in the south, 37 levels).
  - Stardew-style rendering: on natural ground (grass / wood / hill / bare) each level line becomes a 坎 / retaining edge
    (TERRACE: lip, earth face, drop shadow), which blocks. Footpaths that cross a face get stairs (STEPS).
    Roads, footways, plazas and parking are never walled: where they cross a level line they are drawn as a **ramp**
    (lighter at the top, darker at the bottom, contour hatching every 8 px). Odd levels get a very faint lawn tint.
  - Walking **uphill on a ramp is slower** (down to ×0.75 straight up the slope); downhill and flat are normal speed.
  - Connectivity: after placing walls, any pocket that was reachable before and is cut off gets a stair carved through
    the wall, so every road, footway and stairs cell stays reachable (all earlier road / stairs tests pass unchanged).
  - Left flat on purpose: 二龙山 keeps its own v6 terraces (its mask + 6 tiles is excluded), the rail bridge cut, the
    garage roof, the sports fields, fenced areas, the tank lawn, 柏林园, the 小树林, and everything west of x = 120
    (off campus, the 二龙山 flank down to the 汾河).
  - Biggest local height differences (range within ±24 tiles ≈ 60 m of the label): 3号楼 · 诚学楼 ≈ 24 m (the
    二龙山 east foot west of it), 北区宿舍 B ≈ 14 m, 文瀛苑 15号 ≈ 13 m, 文瀛苑 14号 ≈ 13 m, 西苑教工宿舍 ≈ 13 m,
    文瀛苑 8号 / 北区宿舍 A ≈ 12 m, 文瀛苑 6号 / 5号楼 明学楼 / 文瀛苑 13号 ≈ 12 m (also in `map.json` → `terrain.relief`).
  - Uncertain: SRTM is ~30 m and a surface model (buildings and trees blur into it). Smoothing removes small banks, and
    real retaining walls and stairs are not surveyed, so wall and stair positions follow the DEM, not the real ones.
    `NUC_TERRAIN=0 python3 tools/build_map.py` builds the old flat map for comparison.
- **The four big slopes you named** (`tools/slopes_v761.py`, drawn on top of the DEM terraces). Each one is a polyline
  along the real road. Every paved cell within ~2.5 tiles of it gets one **continuous ramp** for the whole length:
  lighter at the top and darker at the bottom, with stronger contour hatching, and the downhill direction taken from
  the DEM. The natural ground right beside the paved strip gets a **low stone side wall** (coursed stone, 8 px), and
  the wall casts a shadow on the road. The side walls are drawn only and do not block, so the lawns beside them stay
  reachable. On these long slopes, walking uphill is slowed to ×0.85 (×0.75 on the short terrace ramps). Each slope
  has an intro spot that gives its DEM numbers.
  | # | Slope | DEM (Terrarium / SRTM, ~10 m smoothing) |
  |---|---|---|
  | 1 | The N–S road under the 南区 rail bridge (north of 15号楼 · 逸夫楼) | ≈831.4 m north of the bridge → ≈828.5 m at the bridge → ≈824.4 m south: ≈7 m over ≈118 m. I added an extra **3 m dip under the deck** (assumed; SRTM can't resolve it), so the road ramps down into the cut from both sides and is flat under the deck |
  | 2 | 1.5道门 → 二道门 | ≈817.1 → ≈828.1 m: **≈11 m over ≈290 m (≈3.8 %)**, drawn as one even grade |
  | 3 | 软件实验大楼 (high) ↔ 兵器教学陈列馆 (low), 北区 | ≈851.0 vs ≈845.9 m: ≈5 m. East road ≈852.0 → 846.5 m, west road ≈849.3 → 846.0 m. The E–W road between the two buildings follows the contour and stays roughly level |
  | 4 | 瑾瑜国际会议中心 → 兵器陈列馆 | 瑾瑜 ≈840.5 m. 科学楼西路 ≈839.6 → 847.2 m (≈7.6 m); the east road ≈836.8 → 846.5 m (≈10 m) |
- **景峪国际中心 = 瑾瑜国际会议中心.** It is part of the 现代分析测试中心 (科学楼 A/B/C 座 + 瑾瑜国际会议中心;
  1 floor, partly 2; 4428.67 m²) in 新北区, and the school paper says the buildings were "依地势而建". It is not in OSM.
  I put it at the low west wing of the 科学楼 footprint, where the imagery shows a fan-shaped hall (approximate), and
  added the label 「瑾瑜国际会议中心」 plus an intro spot. Sources:
  admin.qy-office.com/shtml/zbdx/20240906/283.shtml, jdgc.nuc.edu.cn/info/1091/5264.htm and
  hqfw.nuc.edu.cn/info/1016/8226.htm. jbjsc.nuc.edu.cn (基本建设部) lists 「科学楼西路、挡土墙及边坡工程」, which is
  evidence for retaining walls on that road.
- **Exposed foundation on sloping sites.** 150 buildings stand on ground that falls ≥ 1 m from their highest point to
  their south (low) side. They get a coursed-stone base band along the south façade, up to 10 px at 3 px per metre,
  that follows the drop from the west end to the east end, with a lit cap line and a dark foot (`b.found` in
  map.json, `foundation()` in buildings.js).
- **Minimap contours.** The M map draws a faint 1-px line wherever the 3 m level changes, a little stronger every
  15 m.
- Tests: `tests/v761.test.cjs` (5 tests), `tests/v761b.test.cjs` (7 terrain tests) and `tests/v761c.test.cjs`
  (6 tests for the four slopes: DEM rise, both bridge approaches ramp and the deck stays flat, the gate road is one
  continuous climb, side walls never block and roads stay reachable, foundations, contours, the 瑾瑜 label). The
  3 v7.6 underpass tests are replaced by one "superseded" test. 109 tests pass.
- Shots: `v761_rail_road.png` (before | after | under the deck), `v761_parking_grove.png`, and `v761_slopes.png`
  (before / after at 文瀛苑 and at the 二龙山 east foot, plus a whole-map level overview). `v761_slope1.png` …
  `v761_slope4.png` show each named slope before (flat) | after, with the DEM heights marked.

## v7.6.2 changes
- **No hatching anywhere.** The v7.6.1 contour hatching on sloped roads / paths is gone. A slope now shows only a very
  soft, smooth tint (lighter at the top, darker at the foot, fading out at both ends). Kerb joints are vertical, never
  diagonal. A test checks that `ground.js` has no diagonal `(wx ± wy) % n` stripe formula and no contour-hatch code left.
- **Roads keep their full width.** When a building, field or fence overlapped a road, the other object was trimmed back
  instead of the road being covered.
  - Trimmed: 26 buildings (1363.3 tile² in total, e.g. 软件实验大楼 266 tile², 机械工程学院 106, 电子实验楼 102), plus
    5 fields and 4 fences.
  - Not trimmed: 6 buildings that would have lost more than 40 % of their area. They are 德怀楼 (0.44), 工字楼 (0.83),
    文澜苑1号公寓 (0.53), 文澜苑2号公寓 (0.41), s71 (1.0) and 洗涤中心 (0.66). Each one is logged in `map.json → v762.road_trim`.
- **Flag on the 主楼 axis.** The 行知广场升旗台 now stands at x = 484.05, the same x as the 主楼 front door (the
  「中北大学」 facade). It is centred on the red axis strip of 行知广场.
  - Evidence: the 主楼 door, the plaza axis strip, and a satellite crop (used only to check, not shipped).
  - The satellite plinth reads about 2 tiles east of this. That is inside the image registration error, so the building
    axis wins.
- **17号楼穿堂.** There is a walk-through passage (y 319.3–321.8) right through 17号楼, from west to east, with its own
  intro card.
- **西北区 relabels.** The old 北区学生公寓 blocks s29–s39 are now 家属楼 (staff housing). s53 / s54 are
  中北大学附属学校 · 中学部 / 小学部, and s40 is 校医院. The area labels are 家属区（教工住宅）, 附属学校操场 and 工程训练中心.
  The exact building-by-building positions are approximate. Sources:
  - https://fsxx.nuc.edu.cn/xxgk.htm (中北大学附属学校：位于中北大学校内，幼儿园 + 九年一贯制)
  - https://dag.nuc.edu.cn/wsxs/sgll/zyjz.htm (档案馆：子校教学楼、幼儿园、教职工住宅楼列表)
  - https://admin.qy-office.com/shtml/zbdx/20240906/283.shtml (中北大学报：新北区建筑，工程训练中心位于46#教工住宅楼北侧)
  - OSM W1069150668 amenity=hospital 中北大学医院; W1069155864 家属区
- **瑾瑜国际会议中心** is now its own building, with the distinctive fan-shaped hall (centre 522.7, 110.1, radius
  18.8). 科学楼 A / B / C 座 (现代分析测试中心) are kept as separate wings. Sources:
  - https://admin.qy-office.com/shtml/zbdx/20240906/283.shtml (中北大学报：现代分析测试中心 = 科学楼 A/B/C + 瑾瑜国际会议中心；新北区建筑“依地势而建”)
  - https://jbjsc.nuc.edu.cn/ (基本建设部：科学楼西路、挡土墙及边坡工程)
- **主楼 vs 11号楼.** 主楼 is the building with 「中北大学」 on the front. It is now split from 11号楼, the block behind it to
  the north. 主楼 spans y 237.1–262.8 and 11号楼 spans y 215.6–235.7.
- **图书馆.** In front of the library there are two round fountains (图书馆西 / 东喷泉), placed symmetrically about the
  axis x = 427. Between them a wide stone stair with an arched (fanned) foot runs down from the door, and a straight
  walk carries on to the road. The forecourt has no trees.
- **Canteens.** 学生第一食堂 = **文瀛食堂** (enterable through its porch) and 学生第二食堂 = **食味坊** (enterable). The old
  names are gone from every label.
- **食味坊.** The road block that ran into 食味坊 does not exist in reality, so it was removed. No road cell is left under
  the building, and its door opens onto a walkway.
- **大操场.** The football-pitch markings are scaled to 0.92 so they sit inside the inner kerb of the track. The track
  runs all the way round, and the grass Ds lie beyond both goal lines.
- **East side of the stadium.** 羽毛球馆 is named and enterable. A paved path runs along its south side
  (x 416.6–461, y 263.2–264.9), and the basketball pad moved down to y 265.4. A single long building,
  **体育器材室 · 东看台**, runs along the east of the track, and the field gate is south of it.
- **West side of the stadium.** **主席台** sits between two **西看台**, with small flights of steps up from the track. The
  大操场 fence moved west to x 374.3, behind the stands, and 19号楼 was trimmed (east edge 373.92 → 373.8).
  - How east and west differ: the west is a ceremonial grandstand (看台 / 主席台 / 看台) with the gate south of it. The
    east is one long equipment-room stand with the gate south of it.
- **Tidy layout.** 169 building outlines were squared to the axes (160 of them to clean rectangles). 3 buildings that
  really stand at an angle keep their angle. Of 254 road nodes, 207 were straightened (max move 1.6 tiles), so the share
  of axis-aligned road segments rose from 0.143 to 0.375.
- **柏林园.** A small kidney-shaped pond lies beside the 文化长廊 (centre 205, 336.4, plus a smaller lobe to the west).
  The fountain in the forest was removed.
- **二龙山: simple routes, and what is on the hill.** The real trail geometry is NOT reproduced (per the user: 「只需要知道山上有什么东西」).
  - All the old broken trail fragments were wiped (12,535 cells). In their place are clean, axis-aligned stone stair
    routes, with a flight of steps at every terrace wall:
    - **益足道 · 南线**: from the foot plaza by the park gate, west and then straight up to the 长廊 (131.5 tiles).
    - **益足道 · 东线**: up the east side to the 东线观景台, then west to the 世纪碑 (105 tiles).
    - **飞瀑小径**: a short spur to 龙山飞瀑 (20 tiles).
    - **下山步道 · 北线**: down the north side to the west road (45.1 tiles).
  - Along the top, a promenade (2803 cells) joins both ends of the 二龙山长廊.
  - Features, each with a sprite, a label and an intro card:
    - 二龙山公园大门 and the 「龙园」石碑 at the foot;
    - route signposts;
    - 爱心台;
    - 怡人台 · 凉亭 (a pavilion);
    - 世纪碑 (with the 「继往开来铸辉煌」 text);
    - 民国碉堡（遗迹）;
    - 龙山飞瀑 (a water channel and pool);
    - 二龙山长廊 (两座四角亭 + 27 间子廊, 95 米, 2000 年).
  - There are area cards for 爱心林, 桃园 and 大型草画. The whole hill has a card too (原名裂石山; students carried the stones up).
  - The positions of the features are schematic. The 凉亭 position is approximate, and no details of the 草画 were found.
  - A BFS test walks from the foot to every feature, every platform, both 长廊 ends and the summit. Sources:
  - https://dwxcb.nuc.edu.cn/info/1169/13577.htm (二龙山长廊：两座四角亭 + 27 间子廊，全长 95 米，2000 年建校 60 周年时由学生处和重庆校友会出资建造)
  - https://www.nuc.edu.cn/info/1014/32562.htm (登山打卡路线：公园大门 → 爱心台 → 南侧怡人台 → 山顶 → 龙山长廊打卡 → 北侧下山)
  - https://cn.wtcf.org.cn/csfc/yl/csyl/jd/20160818265250.html (益足道、爱心林、怡人台、龙山飞瀑、爱心台、长廊、大型草画；山脚石碑“龙园”)
  - http://glc.nuc.edu.cn/info/1007/3140.htm (世纪碑：1999 年老同志寻石太行所立，2019 年 9 月 30 日修缮揭幕；《世纪碑赋》“继往开来铸辉煌”)
  - http://hqfw.nuc.edu.cn/info/1015/1476.htm (二龙山示意图：登山线路、凉亭、长廊、水渠，民国时期碉堡、暗道、暗洞)
  - https://dwxcb.nuc.edu.cn/hszl/dbdh/els.htm (原名裂石山；石阶和长廊的石块都是勤工助学的学生抬上山的)
  - https://baike.baidu.com/item/二龙山/3348491 (三条登山步道；爱心台、怡人台、桃园、世纪碑；解放战争时期碉堡、地下暗道)
- **Tests:** 127 pass, 0 fail (`cd game && npm test`). The new file `tests/v762.test.cjs` has the 二龙山 route, feature
  and connectivity tests, plus one test for each of items 1–15 above.
- **Screenshots** are in `shots/v762_*.png`: plaza, roads (before / after), 17hao, northwest (before / after), guoji,
  zhulou_11, library, shiweifang, stadium, sports, zhuxitai, tidy_overview (before / after), bailin_pond and
  erlongshan. The flag comparison uses satellite imagery, so it is not shipped.

## v7.6.3 changes
- **One colour for paths, roads, footways and stairs on every level** (user: 「尽量颜色统一」). Before this, a paved
  surface on a DEM ramp got a smooth top-to-foot tint, so the same path looked lighter above a terrace and darker below
  it. Stairs were also grey with a gradient along each flight.
  - Paved surfaces (ROAD / PATH / STEPS / PLAZA / APRON / PARKING) now skip every per-level and ramp tint.
  - Stairs use the path palette: a lighter nosing, the tan tread and a darker riser, the same on every flight and level.
  - Height still shows through the terrace walls, the low side walls and the shadows they cast.
- **Grass is unchanged:** the per-level grass tint on 二龙山 and the DEM lawns is exactly as in v7.6.2.
- **New tests** in `tests/v763.test.cjs`:
  - more than 500k paved pixels on 20+ levels, with zero tinted;
  - the path tile uses the same palette colours on every level;
  - every stair tread phase has exactly one colour across all flights;
  - the grass colour hash equals v7.6.2's.
- **Tests:** 130 pass, 0 fail.
- **Shot:** `shots/v763_color.png`, before / after of the 二龙山 east stair in autumn.

## v7.6.4 changes
Rule for this release: satellite imagery + OSM decide; user descriptions were treated as hints and checked. Anything
that could not be confirmed is marked as such in the in-game text and in the notes files.
- **新北区 / 北门:** 北门 plaza without fountain or 展板; own facades for 软件实验大楼, 仪器科学大楼, 兵器教学陈列馆, 航空宇航 /
  机械工程学院 and 半导体与能源宇航学院楼; aircraft model at (577.6, 52.9); s22 = 文韬苑6号, new s764_d7 = 文韬苑7号.
  Notes: `shots/v764_north_bldgs_notes.md`. Shot: `shots/v764_north_ba.png`.
- **East side:** 龙山餐厅 west stair + west entrance; 广顺超市 and 印刷厂 (position from satellite, identity presumed);
  court fence removed; 东看台 passage + footpath; two sand volleyball courts; 小楼; court nets with posts and collision.
- **Layout:** 西区 ledges turned into stairs; tiny terraces flattened; `fit_shape` building outlines; garage entry from the
  east; tree tidy; road-colour audit; 七道门 underpass; 四道门 entrances swapped (`shots/v764_sidaomen_ba.png`);
  文韬苑1号 凹 footprint.
- **Props:** 北区停车场 (OSM W543815611) with stall decals and parked cars; 行知广场 stalls, cars, lamps; wheel sculpture at
  (492.5, 321.8); 二道门 willow redrawn for four seasons, trunk-only collision (`shots/v764_willow_seasons.png`);
  德怀广场 name plaque (`shots/v764_dehuai_plaque.png`).
- **Morning:** 06:00–07:00 教官大队 drill on 行知广场, 07:00 flag guard march, flag up at 07:05 (times are game settings).
- **NPCs:** placement spreads people over teaching / dorm areas instead of clumping at doors (`shots/v764_npc_heatmap.png`).
- **Canteens (D):** 文瀛食堂 (2 floors), 食味坊 (2), 田园餐厅 (2), 龙山餐厅 (3) get their own interiors with stairs,
  named windows and dishes. Unverified windows are flagged; sources in `game/data/canteens_sources.md`.
  The noodle quest now points to 食味坊 1F「老大同刀削面」. Shot: `shots/v764_canteens.png`.
- **Hover tooltips (C):** move the mouse over a building or landmark for a 1–3 sentence description
  (`game/data/tooltips.js`). Every entry lists its sources; entries without a solid source show 「未核实」. 137 of 137
  named places are covered, 71 of them sourced. Touch devices don't show it. Shot: `shots/v764_tooltip.png`.
- **Tests:** new `tests/v764.test.cjs` (drill / guard / flag, canteens, quest text, tooltips coverage, NPC door share,
  willow / lot / volleyball data, lamp fade) and `tests/npcsim.cjs`. The v7.6.3 grass hash was re-baselined because the
  v7.6.4 map changed. 137 tests: 133 pass, 0 fail, 4 skipped.

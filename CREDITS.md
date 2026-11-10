# Credits & licences

| What | Where used | Author / source | Licence |
|---|---|---|---|
| Campus layout: buildings, roads, water, landuse, names, 彭德怀雕像 node | `data/osm_map.xml` → `game/data/ground.png`, `game/data/map.json` | © OpenStreetMap contributors, API 0.6 `map` call (bounds lat 38.000–38.035, lon 112.425–112.470), fetched 2026-10 | ODbL 1.0, https://www.openstreetmap.org/copyright |
| Hand-traced supplement (missing footprints, paths, 二龙山 trails, plaza and court outlines) | `data/supplement_px.json` | Traced by us over imagery, in our own pixel coordinates | Same as the game (MIT); derived data attributed to OSM |
| Satellite imagery (Esri World Imagery) | Tracing reference and roof-tint sampling only, at build time | Esri, Maxar, Earthstar Geographics | **Not redistributed.** Not in the zip and not shipped in the game |
| Character sprites: "Top-down player sprite sheet – Julia" | `game/assets/chars/students.png`: cropped to 32×36 and palette-swapped into 8 student variants by `tools/build_chars.py` | ArlanTR, https://opengameart.org/content/top-down-player-sprite-sheet-julia | CC0 1.0 |
| Ark Pixel Font 12px (zh_hans, proportional) | `game/assets/fonts/ark-pixel-12px-zh_hans.woff2` | TakWolf, https://github.com/TakWolf/ark-pixel-font (release 2026.10.25) | SIL OFL 1.1 (`game/assets/fonts/OFL.txt`) |
| 彭德怀 statue, 中北大学 gate stone, 主楼 façade and 德怀楼 façade pixel art | `game/js/legacy_art.js` | Ported verbatim from the user's earlier project campus-walk v0.3.28 (`art.js`), © 2026 Campus Walk contributors | MIT |
| 中北大学校园平面图 (official campus map) | Reference only, used to verify building names (`docs/NAMES.md`, `tools/official_map_fit.py`) | 中北大学招生网, https://zbzs.nuc.edu.cn/info/1002/3696.htm | **Not redistributed.** The image is not in the zip or the game; only the names were taken |
| Footsteps (concrete, grass, wood) and class bell: Kenney "Impact Sounds" 1.0 (`impactBell_heavy_000/002`, `footstep_concrete_000–003`, `footstep_grass_000–002`, `footstep_wood_000–002`) | `game/audio/step_*.mp3`, `bell.mp3`, `bell2.mp3`; re-encoded OGG→MP3 | Kenney, https://kenney.nl/assets/impact-sounds (`game/audio/KENNEY_LICENSE.txt`) | CC0 1.0 |
| "Ambient Bird Sounds" (daytime loop) | `game/audio/birds_day.mp3`; re-encoded OGG→MP3 | isaiah658, https://opengameart.org/content/ambient-bird-sounds | CC0 1.0 |
| "Crickets Ambient Noise - loopable" (night loop) | `game/audio/crickets_night.mp3`; re-encoded at a lower bitrate | Wolfgang_ (credit to Ted Kerr appreciated), https://opengameart.org/content/crickets-ambient-noise-loopable | CC0 1.0 |
| "Rain (loopable)" | `game/audio/rain_loop.mp3` (rain weather ambience) | Ylmir, https://opengameart.org/content/rain-loopable | CC0 1.0 |
| Everything else: ground shader, buildings and roof details, trees, lamps and glow, all interiors (classroom, dorm, gym, 主楼 2F and 图书馆 2F included), lit windows, schedule, quests, 高数 quiz, seasons (autumn/winter trees, snow on roofs and ground), rain/snow particles and umbrellas, canteen 2F, dorm lights-out, save, synthesised quest chime, NPC lines, HUD and E button, engine | `game/js/*`, `game/style.css` | Written for this project | MIT |

Not used:
- No Stardew Valley assets. Stardew was only a style reference, and nothing was ripped or traced from it.
- Nothing was copied from https://exist.qd.je/pixel/, which has no licence. Only ideas and techniques were taken from it (see README).

v2 adds no new third-party assets. v3 adds only the CC0 audio listed above.

## v7.7
- 地图编辑器、共享电单车与停车点、成就图标与提示、虚拟摇杆:全部为本项目代码程序绘制,无新增外部素材、字体或库,MIT。
- 停车点运营方名称「杭州小潮出行」取自 2024-08 学校通知(仅作文字说明,未核实);停车点位置为游戏设定,未核实。

## v7.8
- UX 灵感（沉浸 / 拍照 / 备份 / 关于 / 地标传送 / 门口名牌 / 竖屏紧凑）参考同事 EXIST-D 的 PixelCampus（https://github.com/EXIST-D/PixelCampus）。该项目 LICENSE 为保留所有权利；本版本全部从零重写，**未复制其代码或美术**。详见 docs/LEARNED_FROM_PIXELCAMPUS.md。

## v7.9
- 手机 / 平板触控适配（情境按钮、底部抽屉、安全区、拍照分享）。无新外部素材。
- 管理员本地发布服务与 GitHub 提交逻辑为本项目代码；不捆绑任何令牌。

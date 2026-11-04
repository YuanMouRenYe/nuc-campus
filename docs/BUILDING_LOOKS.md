# Building looks (v6)

Facades are drawn in `game/js/buildings.js` (the `LOOKS` table, then `FALLBACK` for anything without a named look).
**No photos ship with the game.** The photos below were only looked at as reference.

Status legend:
- **photo**: a photo was checked.
- **text**: a written source gives the type or floor count, but no facade photo was found. Colours are a guess.
- **unverified**: no source. The look is a plausible pixel-art variant picked so that neighbouring blocks differ.

Floor counts (and so wall heights) are still the v5 values from OSM `building:levels`. Where a source disagrees, the table says so, but v6 does not change any heights.

## Photo references (Wikimedia Commons, CC BY-SA 3.0, used for reference only)
| Photo | Shows | Used for |
|---|---|---|
| [华北工学院-2003 - panoramio.jpg](https://commons.wikimedia.org/wiki/File:%E5%8D%8E%E5%8C%97%E5%B7%A5%E5%AD%A6%E9%99%A2-2003_-_panoramio.jpg) | 德怀楼: beige tile wings, dark glazed central tower | confirms the existing legacy 德怀楼 facade (kept unchanged) |
| [Jiancaoping, Taiyuan … panoramio (3).jpg](https://commons.wikimedia.org/wiki/File:Jiancaoping,_Taiyuan,_Shanxi,_China_-_panoramio_(3).jpg) | 德怀楼 with the 彭德怀 statue | confirms the statue placement (kept unchanged) |
| [Jiancaoping … panoramio.jpg](https://commons.wikimedia.org/wiki/File:Jiancaoping,_Taiyuan,_Shanxi,_China_-_panoramio.jpg), [(1)](https://commons.wikimedia.org/wiki/File:Jiancaoping,_Taiyuan,_Shanxi,_China_-_panoramio_(1).jpg) | 主楼: pale tile, central glass curtain wall, 中北大学 lettering | 主楼 kept unchanged (legacy facade) |
| [远眺中北大学-2010 - panoramio.jpg](https://commons.wikimedia.org/wiki/File:%E8%BF%9C%E7%9C%BA%E4%B8%AD%E5%8C%97%E5%A4%A7%E5%AD%A6-2010_-_panoramio.jpg) | hillside above the campus with stepped terraces | supports the stepped 二龙山 terraces |
| [Nuc 景色.jpg](https://commons.wikimedia.org/wiki/File:Nuc_%E6%99%AF%E8%89%B2.jpg) | red-columned pavilion by the water, in snow | pavilion look (red columns, green tiles); already like this |

## Text sources
- S1: [blog.gaein.cn, 中北大学宿舍 (2021)](https://blog.gaein.cn/passages/dormitory-of-nuc/): 文瀛5 and 文瀛10 are the same newer type (6F, balconies). 文瀛6, 9 and 13 are older 3F blocks. 文瀛17 is a 6F 回字楼 east of 麦港 and the main field.
- S2: [nuc.edu.cn/info/1576/17143.htm](https://www.nuc.edu.cn/info/1576/17143.htm): 文瀛苑4# is 2F, 7# and 8# are 6F (7685 m²), 20# (单1) is 2F, 21# (单2) is 3F.
- S3: [aiyangedu.com/WShanXiGaoKao/694366.html](https://www.aiyangedu.com/WShanXiGaoKao/694366.html): 文瀛6 is 3F. 文瀛7 (国防生公寓) is 6F with balconies.
- S4: [jbjsc.nuc.edu.cn/jpgc.htm](https://jbjsc.nuc.edu.cn/jpgc.htm), [info/1663/1064.htm](https://jbjsc.nuc.edu.cn/info/1663/1064.htm): the 精品工程 list (怡丁苑棚户区改造, 文韬6#/7#学生公寓, 科学楼, 一道门, 实习大楼, 实验大楼), all newer builds.
- S5: colleges.chat: 文韬3 is 6F.

## Per-building looks
| Building | Look in game | Basis | Status |
|---|---|---|---|
| 主楼 | legacy v0.3.28 facade, unchanged | photos above | photo |
| 德怀楼 + 彭德怀雕像 | legacy facade, unchanged | photos above | photo |
| 文瀛苑6 / 9 / 13号 | red-brown brick, light slab bands, paired windows (older type) | S1, S3 | text. Height: S1 and S3 say 3F, OSM says 6F, and the v5 height is kept. |
| 文瀛苑5 / 10号 | cream tile, a balcony slab on every other bay, glazed stair core | S1 | text |
| 文瀛苑7 / 8号 | white tile, red spandrel bands, stair cores (国防生 block) | S2, S3 | text |
| 文瀛苑17号 | grey with brown bands and stair cores, plus a drawn 回字 courtyard in the roof. The OSM footprint is a plain 67×70 m rectangle, so the courtyard is visual only and the size is a guess. | S1 | text |
| 文瀛苑1–4号 | peach, paired windows | none (S2 says 4# is 2F; OSM 6F is kept) | unverified |
| 文瀛苑11 / 12 / 14 / 15号 | pink with balconies | none | unverified |
| 文瀛苑16 / 18 / 19号 | yellow with orange bands and stair cores | none | unverified |
| 文韬苑6 / 7号 | blue-grey, ribbon windows (2017 build) | S4 | text (no footprint named 6/7 on the map yet) |
| 文韬苑1–5, 8, 9号 | white with blue bands and stair cores | S5 (3# is 6F) | unverified |
| 文澜苑1 / 2号 | sand with balconies | none | unverified |
| 怡丁苑1号公寓 | tan with terracotta bands (renovated) | S4 | text |
| 科学楼 | blue-grey, ribbon windows (精品工程) | S4 | text |
| 软件学院, 新北区教学楼, 教学楼18# | white, ribbon windows (newer) | none | unverified |
| 旧1号楼, 工字楼, 炮库 | brick (older) | none | unverified |
| 图书馆 | library palette, ribbon windows | none | unverified |
| other dorms / housing / teaching blocks | one of 3–5 variants per kind, picked by a hash of the OSM id | none | unverified |
| canteens, gym, sheds, pavilion | v5 palettes | none | unverified |

## How to fix a look
Edit the matching row of `LOOKS` in `game/js/buildings.js`:
- `pal`: one of the `LOOK_PAL` keys
- `style`: `plain`, `brick`, `balcony`, `band` or `strip`
- `band`: the spandrel colour
- `stair`: adds a glazed stair core
- `pair`: groups the windows in pairs

Rows match on the building name, and the first match wins.

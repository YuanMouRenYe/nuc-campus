# 署名与第三方许可(ATTRIBUTION / NOTICE)

本仓库的**代码**以 MIT 许可发布(见 `LICENSE`)。以下数据和素材**不适用** MIT,各自遵循原许可。逐项明细见 `CREDITS.md`。

## 地图数据:OpenStreetMap(ODbL 1.0)
- `data/osm_map.xml` 为 OpenStreetMap 原始数据;`game/data/ground.png`、`terrain.png`、`map.json` 以及 `data/supplement_px.json` 是由其生成或与其结合的衍生数据库。
- 署名:**© OpenStreetMap contributors**,数据以 Open Database License 1.0 提供,https://www.openstreetmap.org/copyright 。
- 按 ODbL 要求:公开使用这些数据(包括游戏画面)时需注明上述署名;若公开分发修改后的衍生数据库,需同样以 ODbL 提供。游戏内与本文件均保留该署名。

## 高程数据:Mapzen / Tilezen Terrarium 瓦片
- `data/dem/t15_*.png` 来自 AWS Open Data 的 Terrain Tiles(`s3://elevation-tiles-prod`,https://registry.opendata.aws/terrain-tiles/ ),由 `tools/fetch_dem.py` 下载;`game/data/elev.png`、`terrain.png` 由其派生。
- 本区域数据源为 SRTM(NASA / USGS,公有领域)。
- 署名:**Terrain tiles: Mapzen / Tilezen (AWS Open Data); SRTM data courtesy of NASA / USGS.** 各数据源的署名要求见 https://github.com/tilezen/joerd/blob/master/docs/attribution.md 。

## 字体
- Ark Pixel Font 12px(zh_hans),TakWolf,https://github.com/TakWolf/ark-pixel-font ,SIL Open Font License 1.1,全文见 `game/assets/fonts/OFL.txt`。

## 角色精灵与音效(CC0 1.0)
- 角色:"Top-down player sprite sheet – Julia",ArlanTR,OpenGameArt(经 `tools/build_chars.py` 裁剪、换色)。
- 音效:Kenney "Impact Sounds"(`game/audio/KENNEY_LICENSE.txt`);isaiah658 "Ambient Bird Sounds";Wolfgang_ "Crickets Ambient Noise"(感谢 Ted Kerr);Ylmir "Rain (loopable)"。

## 旧作移植
- `game/js/legacy_art.js`:彭德怀雕像、校名石、主楼与德怀楼立面像素画,来自 campus-walk v0.3.28,© 2026 Campus Walk contributors,MIT。

## 未分发的参考资料
- Esri World Imagery 卫星影像(© Esri, Maxar, Earthstar Geographics):只在本地用于描图和构建时的屋顶取色,**不在本仓库中**。
- 中北大学官方校园平面图(中北大学招生网):只用于核对名称,**不在本仓库中**。
- 参考截图、照片:不在本仓库中。

## 校名与标识
- 「中北大学」校名、校徽及相关标识归**中北大学**所有,不在 MIT 许可范围内。游戏中的校名石与建筑名称仅用于描述真实校园。
- 本项目为个人非官方作品,与中北大学无隶属或授权关系。

## 风格参考
- 视觉风格参考了 Stardew Valley,但**未使用任何 Stardew Valley 素材**。
- https://exist.qd.je/pixel/ 未声明许可,只借鉴了思路,没有复制代码或素材。

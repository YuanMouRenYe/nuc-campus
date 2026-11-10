# 手机适配审计（v7.9）

用户反馈（v7.8）：「这些功能在手机上都适配的很烂」。本文件记录审计方法、问题清单与修复对照。

## 审计方法

- 工具：playwright-core + 本机 Chrome，`isMobile` + `hasTouch`，DPR 2–3。
- 机型：360×780、375×667、390×844、430×932 及各自横屏；平板 820×1180。
- 截图：`shots/v79_audit/`  
  - 修复前：`iphone_14_01_play.png` 等（无 `after_` 前缀）  
  - 修复后：`after_iphone_14_play.png` 等
- 自动化断言（`tools/e2e_v79_mobile.js`）：触控目标 ≥ 44px、可见控件不溢出视口、摇杆/☰/主按钮互不重叠、pageerror=0、拍照/菜单/成就/传送可点、DPR ≤ 2。

## 修复前主要问题

1. **控件挤在右下**：`ebtn`、`ridebtn`、`menubtn`、`mute`、`immbtn` 叠罗汉，横屏更糟。
2. **触控目标偏小**：`mute` / `immbtn` 高度约 40px（&lt; 44）。
3. **字体过小**：窄屏下 `.panel` / `#quests` 落到 11–12px。
4. **键盘功能没有触控入口**：拍照平移靠 WASD、沉浸靠 Z、传送靠 Y；菜单条目多但居中小窗，小屏难滚动。
5. **介绍卡 / 提示压住摇杆**：`#intro` 与 `#joy` 在竖屏重叠。
6. **成就 toast 默认在屏外**：虽为动画起点，但布局未考虑 `safe-area`。
7. **无刘海 / Home 条安全区**：部分按钮贴边。
8. **DPR 不封顶**：Pro 类设备 canvas 像素过多，易掉帧。
9. **拍照无法在 iOS 可靠下载**：`<a download>` 在 Safari 常失效。
10. **编辑器在手机几乎不可用**：侧栏挤爆，无说明。

## 修复后（v7.9）

| 问题 | 处理 |
|---|---|
| 右下按钮过多 | 只留 **☰** + **情境主按钮 FAB**（进入/骑车/还车/查看）；骑车/静音/沉浸进菜单 |
| 目标过小 | FAB 72、☰ 56、摇杆 ≥108；CSS `min-width/height` |
| 字体 | 触屏面板 ≥14px |
| 键盘功能 | 菜单抽屉含成就/传送/拍照/沉浸/备份/关于；拍照有快门与 ± 缩放 |
| 介绍卡挡摇杆 | `#intro`/`#hint` 抬到摇杆上方；横屏改为左侧窄条 |
| Toast / 成就 | `top: calc(... + env(safe-area-inset-top))` |
| 安全区 | 摇杆/FAB/☰/顶栏均加 `env(safe-area-inset-*)`；高度用 `100dvh` |
| DPR | 触屏 `capDpr` ≤ 2 |
| iOS 存图 | 优先 `navigator.share({files})`，否则新标签打开 blob 供长按保存 |
| 切后台 | `visibilitychange` → 暂停遮罩并存档 |
| 编辑器 | 手机提示「建议平板/电脑」；侧栏改底部抽屉式；仍可试用 |
| 桌面 | 未改键位与布局；仅 `body.touch` 生效 |

## 仍需真机确认

- iPhone Safari 全屏与底部工具栏伸缩时，`visualViewport` 是否始终贴合。
- `navigator.share` 在微信内置浏览器中的可用性（可能只剩新标签/长按）。
- 低端 Android 的 60fps（已降 DPR；未做动态降画质）。
- 横屏「把手机横过来」提示未强制锁定方向（iOS 网页无法可靠 lock）。

## 回归

- `npm test`：含 `tests/v79.test.cjs`。
- `tools/e2e_v79_mobile.js`：上列 6 机型 FAILURES=0。

## v7.9.1 操作模式（兼顾 PC 与手机）

### 统一探测

所有入口（`v77.js` / `v79.js` / `game.js`）改为调用 `js/input_mode.js`：

- **能力**：`(pointer: coarse)` / `(any-pointer: coarse)` / `(hover: none)` 且非 fine，或 URL `?touch=1`
- **用户覆盖**：菜单「操作模式」在 **自动 / 电脑 / 触屏** 间循环，写入 `localStorage` 键 `nuc-campus-input-mode-v1`，**立刻生效、无需刷新**
- URL `?input=desktop|touch|auto` 可临时覆盖本页会话

### 壳与混合

| 模式 | 表现 |
|---|---|
| 电脑 | 无摇杆 / FAB；悬停介绍与全部快捷键 |
| 触屏 | 摇杆 + 情境主按钮 + 底部抽屉；默认不显示悬停 tip |
| 自动 | 按能力探测选壳 |
| 混合 | 触屏壳下若收到键盘 `keydown` 或鼠标 `pointermove`，启用悬停 tip 与快捷键，控件仍保留 |

### 桌面回归

`tools/e2e_v791_desktop.js` 在 1280×800、1920×1080 断言：无摇杆/FAB、悬停 tip、快捷键 Z/P/Y/K/B/Tab、模式热切换、无 pageerror。截图 `shots/v791_desktop_*.png`。

# 管理员发布地图（v7.9）

地图编辑器默认只把修改保存在**本浏览器**（localStorage）。要让所有人看到改动，需要管理员把 `game/data/map.json`、`ground.png`、`terrain.png` 写进项目。本仓库**没有托管后端**，提供两条互不依赖的路径。

> 普通访客看不到「发布」按钮；只有本机配置了令牌 / PAT 才会出现。

---

## A. 本地发布（`npm run admin`）

适合在自己电脑上改图、立刻写进工作副本，再自己 `git commit`。

### 步骤

1. 在仓库根目录执行：
   ```bash
   npm run admin
   ```
   会启动一个**只绑定 `127.0.0.1`** 的静态服务（默认端口 `8790`），并在终端打印一长串**管理员令牌**。
2. 浏览器打开终端提示的地址，例如：  
   `http://127.0.0.1:8790/editor.html`
3. 点 **⚙ 管理员**，把令牌粘贴到「本地令牌」，可选填服务地址（默认即可），点「保存设置」。
4. 改好地图后点 **☁ 发布到项目**。  
   服务端会校验导出 → 把旧文件备份为 `*.bak-时间戳` → 写入新的三份数据。
5. 自己检查 `git diff game/data/`，满意再提交。确认无误后可删掉 `.bak-*`（不要提交备份）。

### 安全

- 服务**不监听局域网**，手机/平板访问不到（这是故意的）。平板要本地发布，请用电脑上的 `npm run admin`，或改用下面的 GitHub 路径。
- 令牌只在终端显示；可用环境变量固定：`ADMIN_TOKEN=... npm run admin`。
- 请求必须带请求头 `X-Admin-Token`；关闭终端后随机令牌即失效。

### 端口

`ADMIN_PORT=8791 npm run admin` 可换端口。

---

## B. 发布到 GitHub（Pages 自动部署）

适合改完后一键推到 GitHub，让 GitHub Pages / Actions 重新部署。网站运行时仍然离线；**只有你按下「发布到 GitHub」时**才会访问 `api.github.com`。

### 创建 fine-grained PAT（推荐）

1. 打开 GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**。
2. **Token name**：例如 `nuc-campus-map-publish`。
3. **Expiration**：按需（建议 90 天内，到期轮换）。
4. **Resource owner**：选你的用户或组织。
5. **Repository access**：选 **Only select repositories**，只勾选**这一个**校园游戏仓库。
6. **Permissions** → **Repository permissions**：
   - **Contents**: **Read and write**（用于创建 blob/tree/commit、更新分支引用）
   - 其它保持 No access（不需要 Administration、Secrets、Workflows 等）
7. 生成后**立刻复制**令牌（`github_pat_…`）。GitHub 只显示一次。

> 不要用 classic PAT 的 `repo` 全权限，除非你清楚风险。不要把 PAT 发给别人、不要写进代码、不要截图上传。

### 在编辑器里配置

1. 用任意静态服务器打开 `editor.html`（不必是 admin 服务）。
2. **⚙ 管理员** → 填写：
   - 仓库：`owner/name`（例如 `jiaruiqi/nuc-campus`）
   - 分支：通常 `main`
   - 路径前缀：若游戏在仓库子目录才填；根目录留空
   - PAT：粘贴上一步的令牌
3. **保存设置**。令牌只进本浏览器 `localStorage` 键 `nuc-campus-admin-gh-v1`。
4. 点 **🐙 发布到 GitHub**。进度会显示在状态栏；成功后给出 commit 链接。

### 冲突与错误

| 情况 | 处理 |
|---|---|
| 401 | PAT 错了或过期 → 重新生成并「保存设置」 |
| 403 | 仓库没授权 Contents: write，或触发限流 |
| 409 / 非快进 | 分支上有新提交 → 自动重新拉 HEAD 再试（最多几次） |
| 文件过大 | 单文件勿超约 40MB（本项目地图远小于此） |

### 退出管理员

点 **退出管理员 / 清除令牌**：删掉本地令牌与 GitHub PAT，发布按钮隐藏。换电脑或公共电脑用完必清。

### 撤销 PAT

GitHub → Fine-grained tokens → 找到该令牌 → **Revoke**。撤销后旧浏览器里的配置立即失效。

---

## 与「保存到游戏」的区别

| | 保存到游戏 | 发布到项目 | 发布到 GitHub |
|---|---|---|---|
| 写哪里 | 本浏览器 localStorage | 本机 `game/data/` | 远程仓库 `game/data/` |
| 谁能看 | 仅你这台浏览器 | 你本机之后的 git 提交 | 全网（随 Pages 部署） |
| 要不要联网 | 否 | 否（本机回环） | 仅点击发布时 |

不要再运行 `build_map.py` 覆盖手工发布的结果，除非你有意重建并准备重做编辑。详见 `docs/MAP_EDITOR.md`。

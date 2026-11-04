# 把本仓库上传到 GitHub

压缩包 `nuc-campus-github-v7.6.4.zip` 里已经是一个完整的 git 仓库:分支 `main`,包含一次初始提交(作者 Jiarui Qi)和标签 `v7.6.4`。在另一台电脑上只需要**解压 → 设置身份 → 关联远程仓库 → 推送**。本仓库最大文件约 0.6 MB,不需要 Git LFS。

## 0. 解压
把 zip 拷到另一台电脑,解压后进入 `nuc-campus` 文件夹(里面应能看到 `README.md`、`game/`,以及隐藏的 `.git/` 文件夹)。
- **建议解压到纯英文路径**,例如 `C:\code\nuc-campus` 或 `~/code/nuc-campus`。
- Windows 请用系统自带的“全部解压缩”或 7-Zip;**不要只复制 zip 里的部分文件**,否则 `.git` 会丢失。

## 1. 安装 git
- **Windows**:安装 https://git-scm.com/download/win (默认选项即可,自带 Git Credential Manager 和 Git Bash)。之后用 “Git Bash” 或 PowerShell 操作。
- **macOS**:终端运行 `xcode-select --install`(自带 git),或 `brew install git`。

验证:`git --version`

## 2. 设置身份(只需一次)
```bash
git config --global user.name  "Jiarui Qi"
git config --global user.email "你的GitHub邮箱或 noreply 邮箱"
```
初始提交使用的是占位邮箱 `jiaruiqi@users.noreply.github.com`。如果想让提交显示为你的 GitHub 账号,在仓库目录里改作者后再推送(标签需要重新打):
```bash
git commit --amend --reset-author --no-edit
git tag -f -a v7.6.4 -m "v7.6.4"
```
GitHub 的 noreply 邮箱在 Settings → Emails 里查看,格式为 `数字ID+用户名@users.noreply.github.com`。

## 3. 推送

### 方式 A:网页建仓库 + git push(推荐)
1. 登录 GitHub,右上角 **+ → New repository**。
2. Repository name 填 `nuc-campus`,选 Public 或 Private。**不要勾选** “Add a README”、“.gitignore”、“license”(必须是空仓库,否则推送会被拒绝)。
3. 在仓库目录执行(把 `<用户名>` 换成你的 GitHub 用户名):
   ```bash
   cd nuc-campus
   git remote add origin https://github.com/<用户名>/nuc-campus.git
   git push -u origin main --tags
   ```
4. 认证:
   - **Windows / 装了 Git Credential Manager**:会弹出浏览器登录窗口,登录即可。
   - **macOS / 终端提示输入密码时**:用户名填 GitHub 用户名,**密码填 Personal Access Token(PAT),不是登录密码**。创建方法:GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token,Repository access 选这个仓库,Permissions 里 **Contents: Read and write**(如果要推送 `.github/workflows/` 还需要 **Workflows: Read and write**)。经典 token 则勾选 `repo` 和 `workflow`。

也可以用脚本代替第 3 步(会检查仓库状态、添加 remote 并推送):
- macOS / Git Bash:`bash push_to_github.sh https://github.com/<用户名>/nuc-campus.git`
- Windows PowerShell:`powershell -ExecutionPolicy Bypass -File .\push_to_github.ps1 https://github.com/<用户名>/nuc-campus.git`

### 方式 B:GitHub CLI(一条命令建仓库并推送)
1. 安装 gh:Windows `winget install GitHub.cli`;macOS `brew install gh`。
2. 登录:`gh auth login`(选 GitHub.com → HTTPS → 浏览器登录)。
3. 在仓库目录执行:
   ```bash
   gh repo create nuc-campus --public --source . --push
   git push origin --tags
   ```
   (`--push` 只推当前分支,标签需要再推一次。想建私有仓库把 `--public` 换成 `--private`。)

## 4. 可选:GitHub Pages(在线试玩)
仓库自带 `.github/workflows/pages.yml`:每次推送到 `main` 时先跑 `npm test`,通过后把 `game/` 部署到 Pages。
1. 推送后打开仓库 **Settings → Pages**,**Source** 选 **GitHub Actions**。
2. 到 **Actions** 页签,对 “Deploy game to GitHub Pages” 点 **Run workflow**(或再推送一次)。
3. 完成后访问 `https://<用户名>.github.io/nuc-campus/`。
- 未启用 Pages 时,第一次推送触发的部署任务会失败(红叉),属正常现象;启用后重新运行即可。
- 私有仓库使用 Pages 需要付费计划。不想要这个功能,删除 `.github/workflows/pages.yml` 再提交即可。

## 5. 常见问题
| 现象 | 原因 / 处理 |
|---|---|
| `remote: error: File ... is 1xx MB; this exceeds GitHub's file size limit of 100 MB` 或大文件警告 | 不要把卫星图、截图、zip 加进仓库(`.gitignore` 已排除)。如果已经提交了,`git rm --cached <文件>` 后 `git commit --amend`,再推送。本仓库原始内容没有超过 1 MB 的文件 |
| `Authentication failed` / `Support for password authentication was removed` | 密码处要填 PAT 而不是登录密码;或安装 Git Credential Manager 后重试。macOS 可在“钥匙串访问”里删除旧的 github.com 条目 |
| `refusing to allow a Personal Access Token to create or update workflow` | PAT 缺少 Workflows 权限(经典 token 勾选 `workflow`) |
| `! [rejected] main -> main (fetch first)` | 远程仓库不是空的(建仓库时勾了 README)。最简单:删掉重建一个空仓库;或执行 `git pull --rebase origin main --allow-unrelated-histories` 后再推 |
| `remote origin already exists` | `git remote set-url origin https://github.com/<用户名>/nuc-campus.git` |
| `fatal: not a git repository` | 不在 `nuc-campus` 目录里,或解压时 `.git` 丢失。重新完整解压 |
| 中文路径 / 文件名显示成 `\344\270\255...` | 执行 `git config --global core.quotepath false`;Windows 终端乱码可先运行 `chcp 65001`。路径中有中文一般不影响推送,出问题时把仓库移到英文路径 |
| Windows 上 `git status` 显示所有文件都被修改 | 换行符问题。执行 `git config core.autocrlf false` 后 `git checkout -- .`(仓库内已用 `.gitattributes` 统一为 LF) |
| PowerShell 提示“禁止运行脚本” | 用上面带 `-ExecutionPolicy Bypass` 的命令运行,或直接手动执行第 3 步的三条 git 命令 |

## 6. 推送后自检
```bash
git log --oneline --decorate -3     # 应看到 (HEAD -> main, tag: v7.6.4, origin/main)
git status                          # working tree clean
```
在 GitHub 网页上应能看到 README、`Releases/Tags` 中的 `v7.6.4`。

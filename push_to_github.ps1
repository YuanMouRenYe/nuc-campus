# 用法: powershell -ExecutionPolicy Bypass -File .\push_to_github.ps1 https://github.com/<用户名>/nuc-campus.git
# 先在 GitHub 网页上创建一个空仓库(不要勾选 README / .gitignore / license)。
param([Parameter(Mandatory = $true)][string]$Url)
$ErrorActionPreference = 'Continue'   # native git writes progress to stderr; check $LASTEXITCODE instead
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host '未找到 git,请先安装: https://git-scm.com/download/win' -ForegroundColor Red; exit 1 }
git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { Write-Host '当前目录不是 git 仓库(解压时 .git 可能丢失)' -ForegroundColor Red; exit 1 }
if (-not (git config user.name)) { Write-Host '请先设置: git config --global user.name "你的名字"' -ForegroundColor Red; exit 1 }
if (-not (git config user.email)) { Write-Host '请先设置: git config --global user.email "你的邮箱"' -ForegroundColor Red; exit 1 }
git config core.quotepath false
git config core.autocrlf false
$dirty = git status --porcelain
if ($dirty) { Write-Host '提示: 有未提交的改动,只会推送已提交的内容:'; git status --short }
git remote get-url origin *> $null
if ($LASTEXITCODE -eq 0) { git remote set-url origin $Url } else { git remote add origin $Url }
Write-Host "推送到 $Url ..."
git push -u origin main --tags
if ($LASTEXITCODE -ne 0) { Write-Host '推送失败,见 docs/UPLOAD_TO_GITHUB.md 的“常见问题”' -ForegroundColor Red; exit 1 }
Write-Host ('完成。打开 ' + ($Url -replace '\.git$', '') + ' 查看。')

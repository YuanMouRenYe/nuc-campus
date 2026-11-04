#!/usr/bin/env bash
# 用法: bash push_to_github.sh https://github.com/<用户名>/nuc-campus.git
# 先在 GitHub 网页上创建一个空仓库(不要勾选 README / .gitignore / license)。
set -euo pipefail
URL="${1:-}"
if [ -z "$URL" ]; then echo "用法: bash push_to_github.sh https://github.com/<用户名>/nuc-campus.git" >&2; exit 1; fi
cd "$(dirname "$0")"
command -v git >/dev/null || { echo "未找到 git,请先安装: https://git-scm.com" >&2; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "当前目录不是 git 仓库(解压时 .git 可能丢失)" >&2; exit 1; }
git config user.name >/dev/null || { echo "请先设置: git config --global user.name \"你的名字\"" >&2; exit 1; }
git config user.email >/dev/null || { echo "请先设置: git config --global user.email \"你的邮箱\"" >&2; exit 1; }
git config core.quotepath false
if [ -n "$(git status --porcelain)" ]; then echo "提示: 有未提交的改动,只会推送已提交的内容:"; git status --short; fi
if git remote get-url origin >/dev/null 2>&1; then git remote set-url origin "$URL"; else git remote add origin "$URL"; fi
echo "推送到 $URL ..."
git push -u origin main --tags
echo "完成。打开 ${URL%.git} 查看。"

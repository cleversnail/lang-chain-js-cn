#!/bin/bash
# 构建并发布 VitePress 站点到 GitHub Pages（gh-pages 分支）
#
# 用法：npm run deploy:github  或  bash scripts/deploy-github.sh
#
# 为什么不用 GitHub Actions：
#   仓库里配了工作流，但作业始终拿不到 runner（runner_name/steps 均为空、几秒即失败）。
#   Actions 设置本身正常，真实原因只在网页 UI 显示、暂未排查。
#   因此改为「本地构建 → 推 gh-pages 分支」，完全不依赖 Actions。
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_SLUG="cleversnail/lang-chain-js-cn"
SITE_URL="https://${REPO_SLUG%/*}.github.io/${REPO_SLUG#*/}/"

echo "▶ [1/4] 构建站点（base = /lang-chain-js-cn/，GitHub Pages 子路径）"
npm run docs:build

echo "▶ [2/4] 暂存产物"
DIST=$(mktemp -d)
cp -R docs/.vitepress/dist/. "$DIST/"

echo "▶ [3/4] 更新 gh-pages 分支"
WT=$(mktemp -d)
rmdir "$WT"
git worktree remove "$WT" --force 2>/dev/null || true
git worktree add -f "$WT" gh-pages >/dev/null

push_done=0
(
  cd "$WT"
  git rm -rq --ignore-unmatch .          # 清掉旧产物（含哈希名已变的旧资源）
  cp -R "$DIST/." .
  touch .nojekyll                        # 防止 Jekyll 干扰
  git add -A
  # 注意：VitePress 的构建是**非确定性**的 —— 同样的输入，app.js 的分块哈希每次都会变
  # （实测：连续两次构建得到 app.sHRSOsiS.js 和 app.CzBnp81m.js）。
  # 所以这个「无变化就跳过」的判断基本不会命中，每次发布会各产生一个提交。
  # 这是无害的（gh-pages 上的历史只用于发布，不影响站点内容）。
  if git diff --cached --quiet; then
    echo "  （站点内容无变化，跳过提交）"
  else
    git -c user.name="蜗牛" -c user.email="652501825@qq.com" \
        commit -q -m "deploy: 重新发布站点 $(date '+%Y-%m-%d %H:%M')"
    git push github gh-pages
    echo "  ✅ 已推送 gh-pages"
  fi
)
git worktree remove "$WT" --force
rm -rf "$DIST"

echo "▶ [4/4] 触发 Pages 构建"
if gh api -X POST "repos/$REPO_SLUG/pages/builds" >/dev/null 2>&1; then
  echo "  已触发构建"
else
  echo "  ⚠️ 触发失败（可稍等自动构建，或去仓库 Pages 页手动重试）"
fi

echo ""
echo "✅ 发布流程结束"
echo "   线上地址：$SITE_URL"
echo ""
echo "提示：源码改动请用一条命令同步两个远端 ——"
echo "   git push origin main     # 同时推 Gitee 和 GitHub"

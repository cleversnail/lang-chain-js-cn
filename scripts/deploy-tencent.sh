#!/bin/bash
# 构建并发布到腾讯云 CloudBase 静态网站托管
#
# 用法：
#   bash scripts/deploy-tencent.sh <环境ID>
#   或先 export TCB_ENV_ID=<环境ID>，然后 bash scripts/deploy-tencent.sh
#
# 首次使用前需要先登录（二选一）：
#   npx --yes -p @cloudbase/cli tcb login
#   npx --yes -p @cloudbase/cli tcb login --cloudbase-api-key <环境APIKey> -e <环境ID>
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_ID="${1:-${TCB_ENV_ID:-}}"
if [ -z "$ENV_ID" ]; then
  echo "❌ 缺少环境 ID"
  echo "用法: bash scripts/deploy-tencent.sh <环境ID>"
  exit 1
fi

TCB="npx --yes -p @cloudbase/cli tcb"

echo "▶ [1/3] 类型检查"
npm run typecheck

echo "▶ [2/3] 构建站点"
npm run docs:build

echo "▶ [3/3] 发布到 CloudBase 环境：$ENV_ID"
# --verify：发布后校验远端与本地一致
# 想更保险可再加 --safe（发布前备份，失败自动回滚）
$TCB hosting deploy docs/.vitepress/dist -e "$ENV_ID" --verify

echo ""
echo "✅ 发布完成"
echo "   访问地址通常为： https://$ENV_ID.tcloudbaseapp.com/"

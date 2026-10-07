#!/bin/bash
# 一键验证电子书里所有依赖 API 的示例能否跑通
# 用法：npm run verify   （需要先配好 .env；会真实消耗少量 API 额度，约需 15 分钟）
#
# 三级判定：
#   ✅ PASS     进程正常退出，且输出看起来合理
#   ⚠️ SUSPECT  进程正常退出、也没抛错，但输出明显不对（空回复 / 工具没被调用 / 解析失败…）
#   ❌ FAIL     非零退出，或出现真正的运行时故障
#
# 为什么需要 SUSPECT 这一级：
#   很多 bug 不会让进程崩，只会让结果"静悄悄地错"。例：
#     - 模型返回空内容（token 全花在思考上）
#     - 演示"错误密钥"却成功了（改了实例属性但底层客户端没变）
#     - 工具数据表键名与提问语言不匹配 → 查不到 → 走兜底分支
#     - withStructuredOutput 解析失败被 catch 吞掉
#   这些全都 exit=0、且不含错误关键字，只看退出码是抓不到的。
cd "$(dirname "$0")/.."

FILES=(
  01-introduction/code/01-hello-world.ts
  01-introduction/code/02-message-types.ts
  01-introduction/code/03-model-comparison.ts
  02-chat-models/code/01-multi-turn.ts
  02-chat-models/code/02-streaming.ts
  02-chat-models/code/03-parameters.ts
  02-chat-models/code/04-error-handling.ts
  02-chat-models/code/05-token-usage.ts
  03-prompts-messages-outputs/code/01-messages-vs-templates.ts
  03-prompts-messages-outputs/code/02-basic-prompt-template.ts
  03-prompts-messages-outputs/code/03-template-formats.ts
  03-prompts-messages-outputs/code/04-few-shot.ts
  03-prompts-messages-outputs/code/05-composition.ts
  03-prompts-messages-outputs/code/06-structured-output.ts
  03-prompts-messages-outputs/code/07-zod-complex.ts
  04-function-calling-tools/code/02-tool-calling.ts
  04-function-calling-tools/code/03-tool-execution-loop.ts
  04-function-calling-tools/code/04-multiple-tools.ts
  05-agents/code/01-create-agent.ts
  05-agents/code/02-multi-tool-agent.ts
  05-agents/code/03-agent-with-middleware.ts
  05-agents/code/04-summarization-middleware.ts
  05-agents/code/05-manual-react-loop.ts
  06-mcp/code/01-mcp-http.ts
  06-mcp/code/02-mcp-stdio.ts
  06-mcp/code/03-multi-server.ts
  07-documents-embeddings-semantic-search/code/04-embeddings.ts
  07-documents-embeddings-semantic-search/code/05-vector-store.ts
  07-documents-embeddings-semantic-search/code/06-similarity-scores.ts
  08-agentic-rag-systems/code/01-traditional-rag.ts
  08-agentic-rag-systems/code/02-agentic-rag.ts
  08-agentic-rag-systems/code/03-conversational-rag.ts
  08-agentic-rag-systems/code/04-when-to-use-rag.ts
)

# ① 真正的运行时故障 → FAIL
FAILPAT="❌ 调用失败|UnhandledPromiseRejection|is not a function|Cannot read propert|SyntaxError|Error: connect|BadRequestError"

# ② "进程没崩但结果不对"的信号 → SUSPECT
SUSPECTPAT="（意外地成功了）|（实际字数：0）|未生成工具调用|模型没有发起工具调用|OUTPUT_PARSING_FAILURE|OutputParserException|Failed to parse|暂无数据|没有找到|未找到结果|回复为空|正文 0 字|未配置 AI_EMBEDDING_API_KEY"

# ③ 某些示例"故意展示"上述现象（用于教学）→ 放行，不算问题
allowed_patterns() {
  case "$1" in
    02-chat-models/code/03-parameters.ts)
      echo "回复为空 正文 0 字" ;;   # 示例故意演示"推理型模型 maxTokens 太小导致正文为空"
    07-documents-embeddings-semantic-search/code/04-embeddings.ts|\
    07-documents-embeddings-semantic-search/code/05-vector-store.ts|\
    07-documents-embeddings-semantic-search/code/06-similarity-scores.ts|\
    08-agentic-rag-systems/code/01-traditional-rag.ts|\
    08-agentic-rag-systems/code/02-agentic-rag.ts|\
    08-agentic-rag-systems/code/03-conversational-rag.ts|\
    08-agentic-rag-systems/code/04-when-to-use-rag.ts)
      echo "未配置 AI_EMBEDDING_API_KEY" ;;  # 未配 embedding 时预期会打印降级提示
    08-agentic-rag-systems/code/01-traditional-rag.ts)
      echo "没有找到" ;;  # 传统 RAG 演示"每问必搜"，检索到无关文档属预期
    *) echo "" ;;
  esac
}

PASS=0; FAIL=0; SUSPECT=0
FAILED_LIST=(); SUSPECT_LIST=()
i=0
for f in "${FILES[@]}"; do
  i=$((i+1))
  printf "[%2d/%2d] %-58s " "$i" "${#FILES[@]}" "$(basename "$f")"
  out=$(npx tsx "$f" 2>&1)
  code=$?

  # ---- FAIL ----
  if [ $code -ne 0 ] || echo "$out" | grep -qE "$FAILPAT"; then
    FAIL=$((FAIL+1)); FAILED_LIST+=("$f")
    echo "❌ FAIL (exit=$code)"
    echo "$out" | grep -E "$FAILPAT" | head -2 | sed 's/^/          /'
    continue
  fi

  # ---- 逐个检查可疑信号，扣掉该文件允许的 ----
  allow=$(allowed_patterns "$f")
  bad=""
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [ -n "$allow" ] && echo "$allow" | grep -qF "$p"; then
      continue
    fi
    bad="$bad$p "
  done < <(echo "$out" | grep -oE "$SUSPECTPAT" | sort -u)

  if [ -n "$bad" ]; then
    SUSPECT=$((SUSPECT+1)); SUSPECT_LIST+=("$f")
    echo "⚠️  SUSPECT"
    echo "          可疑输出：$bad"
    echo "$out" | grep -oE "$SUSPECTPAT" | sort -u | head -3 | sed 's/^/          /'
  else
    PASS=$((PASS+1))
    echo "✅ PASS"
  fi
done

echo ""
echo "======================================================"
echo "总计 ${#FILES[@]}   通过 $PASS   可疑 $SUSPECT   失败 $FAIL"
if [ ${#SUSPECT_LIST[@]} -gt 0 ]; then
  echo "可疑文件（进程没崩，但结果不对）："
  printf '  ⚠️  %s\n' "${SUSPECT_LIST[@]}"
fi
if [ ${#FAILED_LIST[@]} -gt 0 ]; then
  echo "失败文件："
  printf '  ❌ %s\n' "${FAILED_LIST[@]}"
fi
echo "======================================================"

# 有可疑或有失败 → 整体判不通过（让 CI / npm run verify 能感知）
[ $((FAIL + SUSPECT)) -eq 0 ] || exit 1

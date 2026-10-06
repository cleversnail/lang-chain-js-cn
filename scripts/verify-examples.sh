#!/bin/bash
# 一键验证电子书里所有依赖 API 的示例能否跑通
# 用法：npm run verify   （需要先配好 .env；会真实消耗少量 API 额度，约需 5 分钟）
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

# 只在出现"真正的运行时故障"时判失败（❌ 也可能只是示例刻意打印的内容）
FAILPAT="❌ 调用失败|UnhandledPromiseRejection|is not a function|Cannot read propert|SyntaxError|Error: connect"

PASS=0; FAIL=0; FAILED_LIST=()
for f in "${FILES[@]}"; do
  out=$(npx tsx "$f" 2>&1)
  code=$?
  if [ $code -ne 0 ] || echo "$out" | grep -qE "$FAILPAT"; then
    FAIL=$((FAIL+1)); FAILED_LIST+=("$f")
    echo "❌ FAIL  $f  (exit=$code)"
    echo "$out" | grep -E "$FAILPAT" | head -2 | sed 's/^/        /'
  else
    PASS=$((PASS+1))
    echo "✅ PASS  $f"
  fi
done

echo ""
echo "======================================================"
echo "总计: ${#FILES[@]}  通过: $PASS  失败: $FAIL"
if [ $FAIL -gt 0 ]; then printf '失败文件:\n'; printf '  %s\n' "${FAILED_LIST[@]}"; fi
echo "======================================================"

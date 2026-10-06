/**
 * 示例 5：Token 用量与成本
 * 运行：npx tsx 02-chat-models/code/05-token-usage.ts
 *
 * 模型按 token 计费，而对话历史会不断累积 token。
 * 理解 token 用量，是控制成本和避免"超出上下文窗口"的前提。
 */
import { HumanMessage, SystemMessage, type BaseMessage } from "langchain";
import { createModel } from "../../lib/model.js";

function getUsage(msg: any) {
  // LangChain v1 会在消息上附带 usage_metadata
  return msg?.usage_metadata ?? msg?.response_metadata?.usage ?? null;
}

async function main() {
  console.log("💰 Token 用量与成本\n");
  console.log("=".repeat(72));

  const model = createModel();
  const messages: BaseMessage[] = [
    new SystemMessage("你是一位简洁的助手。"),
    new HumanMessage("用一句话介绍你自己。"),
  ];

  const r1 = await model.invoke(messages);
  const usage = getUsage(r1);

  console.log("\n🤖 回复：", r1.content);
  if (usage) {
    console.log("\n📊 本次用量：");
    console.log(`   输入 token：${usage.input_tokens ?? usage.prompt_tokens ?? "?"}`);
    console.log(`   输出 token：${usage.output_tokens ?? usage.completion_tokens ?? "?"}`);
    console.log(`   合计 token：${usage.total_tokens ?? "?"}`);
  } else {
    console.log("\n（该服务商未返回 usage 信息）");
  }

  // 粗略估算：1 token ≈ 4 个字符 / 0.75 个英文单词
  const chars = String(r1.content).length;
  console.log(`\n🔎 粗略估算：回复约 ${chars} 字符 ≈ ${Math.ceil(chars / 4)} token`);

  console.log("\n💡 为什么要关心 token？");
  console.log("   • 模型有 token 上限（上下文窗口）");
  console.log("   • 计费按 token 算");
  console.log("   • token 越多，响应越慢");
  console.log("   • 多轮对话里，历史越长，每次请求的输入 token 越多");
  console.log("\n👉 应对手段（第 5 章会讲）：定期总结/裁剪历史，用 summarizationMiddleware。");
}

main().catch(console.error);

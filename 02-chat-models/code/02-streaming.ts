/**
 * 示例 2：流式输出（Streaming）
 * 运行：npx tsx 02-chat-models/code/02-streaming.ts
 *
 * 对比"等全部生成完再显示"和"边生成边显示"的用户体验差异。
 */
import { createModel } from "../../lib/model.js";

const prompt = "用两段话解释互联网是如何工作的。";

async function nonStreaming() {
  console.log("📝 非流式（传统方式，等全部生成完）：\n");
  const model = createModel();
  const start = Date.now();
  const res = await model.invoke(prompt);
  console.log(res.content);
  console.log(`\n⏱️  全部内容在 ${Date.now() - start}ms 后一次性返回\n`);
}

async function streaming() {
  console.log("=".repeat(72));
  console.log("⚡ 流式（边生成边显示，首字更快）：\n");
  const model = createModel();

  const start = Date.now();
  let firstChunk = 0;

  // stream() 返回一个异步迭代器，逐块吐出内容
  const stream = await model.stream(prompt);
  for await (const chunk of stream) {
    if (firstChunk === 0) firstChunk = Date.now();
    process.stdout.write(String(chunk.content));   // 不加换行，连续输出
  }

  console.log("\n");
  console.log(`⏱️  首块到达：${firstChunk - start}ms`);
  console.log(`⏱️  全部完成：${Date.now() - start}ms`);
  console.log("\n✅ 注意：虽然总耗时相近，但流式的“感知速度”快得多！");
}

async function main() {
  console.log("🎯 流式 vs 非流式对比\n");
  console.log("=".repeat(72));
  await nonStreaming();
  await streaming();
  console.log("\n💡 做聊天界面时，一定要用流式——用户能立刻看到反馈。");
}

main().catch(console.error);

/**
 * 示例 1：多轮对话（记忆的本质）
 * 运行：npx tsx 02-chat-models/code/01-multi-turn.ts
 *
 * ⭐ 核心认知：大模型本身**没有记忆**。
 *   所谓"记忆"，就是每次请求都把之前的对话历史一起发过去。
 */
import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from "langchain";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("💬 多轮对话示例\n");

  const model = createModel();

  // 对话历史：一个数组，每次往返都往里追加
  const messages: BaseMessage[] = [
    new SystemMessage("你是一位编程导师，回答简洁清晰。"),
    new HumanMessage("什么是 TypeScript？"),
  ];

  console.log("👤 用户：什么是 TypeScript？");
  const r1 = await model.invoke(messages);
  console.log("\n🤖 AI：", r1.content);
  messages.push(new AIMessage(String(r1.content)));   // ← 关键：把 AI 的回复也存进历史

  console.log("\n👤 用户：能举个简单例子吗？");
  messages.push(new HumanMessage("能举个简单例子吗？"));
  const r2 = await model.invoke(messages);
  console.log("\n🤖 AI：", r2.content);
  messages.push(new AIMessage(String(r2.content)));

  console.log("\n👤 用户：和 JavaScript 相比有什么好处？");
  messages.push(new HumanMessage("和 JavaScript 相比有什么好处？"));
  const r3 = await model.invoke(messages);
  console.log("\n🤖 AI：", r3.content);

  console.log(`\n\n✅ 注意：AI 在整个过程中保持了上下文！`);
  console.log(`📊 当前对话历史共有 ${messages.length} 条消息`);
  console.log("💡 想想：如果历史无限增长，会带来什么问题？（见 05-token-usage.ts）");
}

main().catch(console.error);

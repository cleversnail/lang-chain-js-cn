/**
 * 示例 1：消息 vs 模板 —— 两条路线
 * 运行：npx tsx 03-prompts-messages-outputs/code/01-messages-vs-templates.ts
 *
 * 同样一个翻译任务，两种写法：
 *   路线 A：直接手搓消息数组（适合智能体、动态流程）
 *   路线 B：用提示词模板（适合复用、RAG、链式流程）
 */
import { HumanMessage, SystemMessage } from "langchain";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  const model = createModel();
  console.log("🎯 消息 vs 模板：两种范式\n");
  console.log("=".repeat(72));

  // ---------- 路线 A：消息数组 ----------
  console.log("\n🤖 路线 A：消息数组（Message Arrays）\n");

  const messages = [
    new SystemMessage("你是一位翻译助手。"),
    new HumanMessage("把 'Hello, world!' 翻译成法语"),
  ];
  const resA = await model.invoke(messages);
  console.log(`✅ 结果：${resA.content}`);
  console.log("\n💡 特点：直接、灵活，智能体（createAgent）主要用这种形式");

  // ---------- 路线 B：提示词模板 ----------
  console.log("\n" + "=".repeat(72));
  console.log("\n📋 路线 B：提示词模板（ChatPromptTemplate）\n");

  const template = ChatPromptTemplate.fromMessages([
    ["system", "你是一位翻译助手。"],
    ["human", "把 '{text}' 翻译成 {language}"],
  ]);
  // 用 | 把模板和模型"接"成一条链
  const chain = template.pipe(model);
  const resB = await chain.invoke({ text: "Hello, world!", language: "法语" });
  console.log(`✅ 结果：${resB.content}`);
  console.log("\n💡 特点：带变量 {text} {language}，可复用，是 RAG 的标准做法");

  // ---------- 怎么选 ----------
  console.log("\n" + "=".repeat(72));
  console.log("\n🎯 选择指南：");
  console.log("   用【消息】当：构建智能体、处理多步推理、需要完全掌控消息流");
  console.log("   用【模板】当：构建 RAG、需要可复用提示词、需要变量替换");
  console.log("\n   两者都重要，关键是知道什么时候用哪个。");
}

main().catch(console.error);

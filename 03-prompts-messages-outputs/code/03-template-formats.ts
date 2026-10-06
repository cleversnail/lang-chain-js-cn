/**
 * 示例 3：两种模板格式
 * 运行：npx tsx 03-prompts-messages-outputs/code/03-template-formats.ts
 *
 * ChatPromptTemplate —— 面向"多角色消息"，聊天模型首选
 * PromptTemplate     —— 面向"单个字符串"，简单直接
 */
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  const model = createModel();
  console.log("🎨 模板格式\n");
  console.log("=".repeat(72));

  // ---------- 1. ChatPromptTemplate ----------
  console.log("\n1️⃣  ChatPromptTemplate（多角色消息，推荐）\n");
  const chatTemplate = ChatPromptTemplate.fromMessages([
    ["system", "你是一位{role}，说话风格{style}。"],
    ["human", "{question}"],
  ]);
  const r1 = await chatTemplate
    .pipe(model)
    .invoke({ role: "海盗船长", style: "夸张而富有冒险精神", question: "什么是 TypeScript？" });
  console.log(r1.content);

  // ---------- 2. PromptTemplate ----------
  console.log("\n" + "=".repeat(72));
  console.log("\n2️⃣  PromptTemplate（单个字符串，简单）\n");
  const stringTemplate = PromptTemplate.fromTemplate("写一句关于{topic}的{adjective}{item}。");

  // .format() 先看拼出来的最终提示词长什么样
  const formatted = await stringTemplate.format({
    topic: "程序员",
    adjective: "搞笑的",
    item: "打油诗",
  });
  console.log("拼出的提示词：", formatted);

  const r2 = await model.invoke(formatted);
  console.log("\n模型回复：\n", r2.content);

  console.log("\n" + "=".repeat(72));
  console.log("\n✅ 小结：");
  console.log("   • ChatPromptTemplate：多角色消息，聊天模型首选");
  console.log("   • PromptTemplate：单字符串，简单场景够用");
  console.log("   • 都用 {变量} 语法，都用 .pipe(model) 接成链");
}

main().catch(console.error);

/**
 * 示例 2：基础提示词模板
 * 运行：npx tsx 03-prompts-messages-outputs/code/02-basic-prompt-template.ts
 *
 * 模板 = 带占位符的提示词。用 {} 声明变量，invoke 时传值。
 */
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("📝 基础提示词模板\n");

  const model = createModel();

  const template = ChatPromptTemplate.fromMessages([
    ["system", "你是翻译助手，负责把 {input_language} 翻译成 {output_language}。"],
    ["human", "{text}"],
  ]);

  // 一条链：模板 → 模型
  const chain = template.pipe(model);

  // 同一个模板，传入不同变量 → 不同结果
  const cases = [
    { target: "法语", vars: { input_language: "英语", output_language: "法语", text: "你好，你好吗？" } },
    { target: "日语", vars: { input_language: "英语", output_language: "日语", text: "你好，你好吗？" } },
    { target: "西班牙语", vars: { input_language: "英语", output_language: "西班牙语", text: "你好，你好吗？" } },
  ];

  for (const c of cases) {
    const res = await chain.invoke(c.vars);
    console.log(`翻译成${c.target}：${res.content}\n`);
  }

  console.log("✅ 同一个模板，复用三次！");
  console.log("💡 模板让提示词可复用、可测试、可维护。");
}

main().catch(console.error);

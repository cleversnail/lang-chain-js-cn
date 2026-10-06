/**
 * 示例 6：结构化输出（withStructuredOutput）
 * 运行：npx tsx 03-prompts-messages-outputs/code/06-structured-output.ts
 *
 * 让模型直接返回"符合 ts 类型"的对象，而不是一段要靠正则去抠的文字。
 * 用 Zod 定义 schema，再让模型按 schema 产出。
 *
 * ⚠️ 重要坑：withStructuredOutput 有三种模式，兼容性差别很大：
 *   - jsonSchema（默认）    ：很多服务商不支持，会报 "response_format type is unavailable"
 *   - functionCalling      ：会强制指定 tool_choice，思考型模型（如 deepseek-flash）不支持
 *   - jsonMode             ：兼容性最好，但**要求提示词里出现 json / JSON 字样**
 * 本示例用 jsonMode，并在提示词里明确写了「以 JSON 格式返回」。
 */
import * as z from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("📋 结构化输出\n");

  const model = createModel();

  // 用 Zod 声明"我想要的形状"
  const PersonSchema = z.object({
    name: z.string().describe("姓名"),
    age: z.number().describe("年龄"),
    email: z.string().describe("电子邮箱"),
    occupation: z.string().describe("职业"),
  });

  // 让模型直接产出符合 schema 的对象
  const structured = model.withStructuredOutput(PersonSchema, {
    method: "jsonMode",
  });

  // ⚠️ jsonMode 要求提示词里出现 json / JSON 字样（否则服务商会直接报错）
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "从用户的自述中抽取个人信息，并以 JSON 格式返回。" +
        "字段名必须严格使用这些英文键：name, age, email, occupation",
    ],
    ["human", "{text}"],
  ]);

  const chain = prompt.pipe(structured);

  const inputs = [
    "我叫 Alice Johnson，28 岁，软件工程师，邮箱 alice.j@email.com",
    "嗨！我是 Bob，35 岁数据科学家，邮箱 bob.smith@company.com",
    "Sarah Martinez | 市场总监 | 年龄：42 | 联系方式：sarah.m@marketing.co",
  ];

  for (const text of inputs) {
    console.log("=".repeat(72));
    console.log(`\n输入：${text}\n`);
    const r = await chain.invoke({ text });
    console.log("✅ 提取结果（类型安全）：");
    console.log(JSON.stringify(r, null, 2));
    // 直接当对象用，IDE 有补全、编译期有类型检查
    console.log(`\n📝 带类型访问：${r.name}，${r.age} 岁，${r.occupation}，${r.email}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n💡 结构化输出的价值：");
  console.log("   • 类型安全：TypeScript 知道每个字段的类型");
  console.log("   • 无需手工解析、无需正则");
  console.log("   • 内置校验：age 一定是数字");
  console.log("   • 输出格式稳定，适合直接入库/调接口");
}

main().catch(console.error);

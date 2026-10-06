/**
 * 示例 4：Few-Shot（少样本）提示
 * 运行：npx tsx 03-prompts-messages-outputs/code/04-few-shot.ts
 *
 * 与其"讲道理"，不如给几个例子——模型会照着例子模仿。
 * 这是让输出格式稳定的利器。
 */
import {
  ChatPromptTemplate,
  FewShotChatMessagePromptTemplate,
} from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function emotionToEmoji() {
  console.log("1️⃣  情绪 → Emoji\n");
  const model = createModel();

  const examples = [
    { input: "开心", output: "😊" },
    { input: "难过", output: "😢" },
    { input: "兴奋", output: "🎉" },
    { input: "生气", output: "😠" },
  ];

  // 每个例子的消息形状
  const examplePrompt = ChatPromptTemplate.fromMessages([
    ["human", "{input}"],
    ["ai", "{output}"],
  ]);

  // 把例子打包成"少样本模板"
  const fewShot = new FewShotChatMessagePromptTemplate({
    examplePrompt,
    examples,
    inputVariables: [],
  });

  const finalTemplate = ChatPromptTemplate.fromMessages([
    ["system", "根据下面这些例子，把情绪转换成 Emoji："],
    fewShot as any,
    ["human", "{input}"],
  ]);

  const chain = finalTemplate.pipe(model);
  for (const emotion of ["惊讶", "困惑", "疲惫", "自豪"]) {
    const res = await chain.invoke({ input: emotion });
    console.log(`${emotion} → ${String(res.content).trim()}`);
  }
}

async function codeComment() {
  console.log("\n" + "=".repeat(72));
  console.log("\n2️⃣  代码 → 注释生成\n");
  const model = createModel();

  const examples = [
    { code: "const sum = (a, b) => a + b;", comment: "// 求两数之和" },
    { code: "const users = data.filter(u => u.active);", comment: "// 过滤出活跃用户" },
    { code: "await db.save(record);", comment: "// 异步保存记录到数据库" },
  ];

  const examplePrompt = ChatPromptTemplate.fromMessages([
    ["human", "代码：{code}"],
    ["ai", "{comment}"],
  ]);

  const fewShot = new FewShotChatMessagePromptTemplate({
    examplePrompt,
    examples,
    inputVariables: [],
  });

  const finalTemplate = ChatPromptTemplate.fromMessages([
    ["system", "参照示例，为代码生成简洁的中文注释："],
    fewShot as any,
    ["human", "代码：{code}"],
  ]);

  const chain = finalTemplate.pipe(model);
  const tests = [
    "const sorted = items.sort((a, b) => a.price - b.price);",
    "if (user.role === 'admin') return true;",
  ];
  for (const code of tests) {
    const res = await chain.invoke({ code });
    console.log(`代码：${code}`);
    console.log(`注释：${String(res.content).trim()}\n`);
  }
}

async function main() {
  console.log("💡 Few-Shot 少样本提示\n");
  console.log("=".repeat(72));
  await emotionToEmoji();
  await codeComment();
  console.log("\n" + "=".repeat(72));
  console.log("\n✅ 结论：给出 2~5 个例子，输出格式会稳定得多。");
  console.log("💡 比“只讲规则”更可靠，又比“微调模型”更快更便宜。");
}

main().catch(console.error);

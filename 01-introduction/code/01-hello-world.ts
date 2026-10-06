/**
 * 示例 1：第一次调用 LLM
 * 运行：npx tsx 01-introduction/code/01-hello-world.ts
 *
 * 这一节故意"手写" ChatOpenAI 的构造，让你看清最核心的三件事：
 *   1. 用哪个模型（model）
 *   2. 服务地址在哪（configuration.baseURL）
 *   3. 怎么鉴权（apiKey）
 * 后面章节会用 lib/model.ts 里的 createModel() 把这个过程封装起来。
 */
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

async function main() {
  console.log("🚀 你好，LangChain.js！\n");

  // 1. 创建模型实例
  const model = new ChatOpenAI({
    model: process.env.AI_MODEL,
    apiKey: process.env.AI_API_KEY,
    configuration: { baseURL: process.env.AI_ENDPOINT },
  });

  // 2. 发起第一次调用（invoke = 调用并等待完整结果）
  const response = await model.invoke("用一句话解释 LangChain 是什么。");

  // 3. 读取回复内容
  console.log("🤖 AI 回复：", response.content);
  console.log("\n✅ 成功！你刚刚完成了第一次 LangChain.js 调用。");
}

main().catch((err) => {
  console.error("❌ 调用失败：", err instanceof Error ? err.message : err);
  console.error("   请检查 .env 里的 AI_API_KEY / AI_ENDPOINT / AI_MODEL 是否正确。");
});

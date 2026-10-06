/**
 * 示例 3：对比不同模型 / 参数
 * 运行：npx tsx 01-introduction/code/03-model-comparison.ts
 *
 * 想对比两个模型？在 .env 里加一行：
 *   AI_MODEL_ALT=另一个模型名
 * 没有配置时，本示例会自动改为对比"低温度 vs 高温度"。
 */
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

async function runOnce(label: string, modelName: string, temperature?: number) {
  const model = new ChatOpenAI({
    model: modelName,
    apiKey: process.env.AI_API_KEY,
    configuration: { baseURL: process.env.AI_ENDPOINT },
    ...(temperature !== undefined ? { temperature } : {}),
  });

  const start = Date.now();
  const response = await model.invoke("用一句话解释递归。");
  const cost = Date.now() - start;

  console.log(`\n📊 ${label}`);
  console.log("-".repeat(60));
  console.log(`回复：${response.content}`);
  console.log(`⏱️  用时：${cost}ms`);
}

async function main() {
  console.log("🔬 模型 / 参数对比\n");

  const mainModel = process.env.AI_MODEL!;
  const altModel = process.env.AI_MODEL_ALT;

  if (altModel) {
    await runOnce(`模型 A：${mainModel}`, mainModel);
    await runOnce(`模型 B：${altModel}`, altModel);
    console.log("\n💡 观察：不同模型在同一问题上的详略、措辞、速度差异。");
  } else {
    console.log("（未配置 AI_MODEL_ALT，改为对比 temperature 的效果）");
    await runOnce(`temperature = 0.0（更确定）`, mainModel, 0.0);
    await runOnce(`temperature = 1.0（更随机）`, mainModel, 1.0);
    console.log("\n💡 观察：温度越高，回答越发散、越有创意；温度越低越稳定。");
    console.log("   想看模型对比？在 .env 加：AI_MODEL_ALT=另一个模型名");
  }
}

main().catch(console.error);

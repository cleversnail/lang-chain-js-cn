/**
 * 示例 3：完整的"三步走"工具执行闭环
 * 运行：npx tsx 04-function-calling-tools/code/03-tool-execution-loop.ts
 *
 * 这是理解 Agent 的钥匙。三步是：
 *   第 1 步：模型生成工具调用（规划 / Planning）
 *   第 2 步：你的代码执行工具（执行 / Doing）
 *   第 3 步：把结果回传给模型，让它组织成人话（沟通 / Communicating）
 */
import { AIMessage, HumanMessage, ToolMessage, tool } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";

const weatherTool = tool(
  async (input) => {
    // 模拟一次"查天气"的 API 调用
    const temps: Record<string, string> = {
      Seattle: "12°C，多云",
      Paris: "18°C，晴",
      Tokyo: "24°C，小雨",
      London: "14°C，阴",
    };
    return `${input.city} 当前天气：${temps[input.city] ?? "暂无数据"}`;
  },
  {
    name: "getWeather",
    description: "查询某个城市的当前天气",
    schema: z.object({ city: z.string().describe("城市名") }),
  }
);

async function main() {
  console.log("🔄 完整的工具执行闭环\n");
  console.log("=".repeat(72) + "\n");

  const model = createModel();
  const modelWithTools = model.bindTools([weatherTool]);

  const query = "西雅图现在天气怎么样？";
  console.log(`用户：${query}\n`);

  // ===== 第 1 步：模型生成工具调用 =====
  console.log("=== 第 1 步：模型生成工具调用（规划）===");
  const response1 = await modelWithTools.invoke([new HumanMessage(query)]);

  if (!response1.tool_calls || response1.tool_calls.length === 0) {
    console.log("模型没有发起工具调用");
    return;
  }
  const call = response1.tool_calls[0];
  console.log(`✅ 模型决定调用：${call.name}`);
  console.log(`   参数：${JSON.stringify(call.args)}`);
  console.log("💡 模型只是“描述了要做什么”，没有真的执行。\n");

  // ===== 第 2 步：你的代码执行工具 =====
  console.log("=== 第 2 步：你的代码执行工具（执行）===");
  // 用 schema.parse 校验并转换参数，拒绝脏数据
  const toolResult = await weatherTool.invoke(weatherTool.schema.parse(call.args));
  console.log(`✅ 工具真实返回：${toolResult}`);
  console.log("💡 真正的 API 调用 / 数据库查询，发生在这里。\n");

  // ===== 第 3 步：把结果回传给模型 =====
  console.log("=== 第 3 步：把结果回传给模型（沟通）===");
  const messages = [
    new HumanMessage(query),
    new AIMessage({ content: response1.content, tool_calls: response1.tool_calls }),
    new ToolMessage({ content: String(toolResult), tool_call_id: call.id || "" }),
  ];
  const finalResponse = await model.invoke(messages);
  console.log("✅ 模型组织出的最终回答：");
  console.log("   ", finalResponse.content);

  console.log("\n" + "=".repeat(72));
  console.log("\n🎓 三步走的意义：");
  console.log("   • 模型负责：理解意图 + 组织自然语言");
  console.log("   • 你的代码负责：真正执行 + 安全控制 + 参数校验");
  console.log("   → 模型永远无法越过你的代码去执行任何东西（安全边界）");
}

main().catch(console.error);

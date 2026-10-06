/**
 * 示例 4：多个工具，让模型自己挑
 * 运行：npx tsx 04-function-calling-tools/code/04-multiple-tools.ts
 *
 * 当工具变多，"工具描述"写得清不清楚，直接决定模型选得对不对。
 */
import { tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculator = tool(
  async (input) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "执行数学计算",
    schema: z.object({ expression: z.string() }),
  }
);

const search = tool(
  async (input) => {
    const db: Record<string, string> = {
      "法国的首都": "巴黎",
      "东京的人口": "约 1400 万",
      "谁发明了 JavaScript": "Brendan Eich",
    };
    return db[input.query] ?? "没有找到结果";
  },
  {
    name: "search",
    description: "查询事实性信息",
    schema: z.object({ query: z.string() }),
  }
);

const weather = tool(
  async (input) => `${input.city} 天气：24°C，晴`,
  {
    name: "getWeather",
    description: "查询某个城市的当前天气",
    schema: z.object({ city: z.string() }),
  }
);

async function main() {
  console.log("🎛️  多工具演示\n");
  console.log("=".repeat(72) + "\n");

  const modelWithTools = createModel().bindTools([calculator, search, weather]);

  const queries = [
    "125 * 8 等于几？",
    "法国的首都是哪里？",
    "东京天气怎么样？",
  ];

  for (const q of queries) {
    console.log(`提问：${q}`);
    const res = await modelWithTools.invoke(q);
    if (res.tool_calls && res.tool_calls.length > 0) {
      const call = res.tool_calls[0];
      console.log(`  ✓ 选中的工具：${call.name}`);
      console.log(`  ✓ 参数：${JSON.stringify(call.args)}`);
    } else {
      console.log("  ✗ 未生成工具调用");
    }
    console.log("-".repeat(72));
  }

  console.log("\n💡 结论：");
  console.log("   • 模型会根据问题自动挑选合适的工具");
  console.log("   • description 写得越清楚，选得越准");
  console.log("   • 工具越多，能力越强（但要注意别让描述互相混淆）");
}

main().catch(console.error);

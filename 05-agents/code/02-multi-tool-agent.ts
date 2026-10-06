/**
 * 示例 2：多工具智能体
 * 运行：npx tsx 05-agents/code/02-multi-tool-agent.ts
 *
 * 智能体会自动为每个问题挑选合适的工具——你不需要写任何 if/else。
 */
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculatorTool = tool(
  async (input) => `结果是：${evaluate(input.expression)}`,
  {
    name: "calculator",
    description: "执行数学计算。用于算术运算。",
    schema: z.object({ expression: z.string().describe("要计算的数学表达式") }),
  }
);

const weatherTool = tool(
  async (input) => {
    const weather: Record<string, string> = {
      西雅图: "12°C，多云",
      巴黎: "18°C，晴",
      东京: "24°C，小雨",
      纽约: "21°C，多云",
    };
    return weather[input.city] ?? `${input.city} 暂无天气数据`;
  },
  {
    name: "getWeather",
    description: "查询某个城市的当前天气",
    schema: z.object({ city: z.string().describe("城市名称") }),
  }
);

const searchTool = tool(
  async (input) => {
    const db: Record<string, string> = {
      "LangChain.js":
        "LangChain.js 是一个用于构建大语言模型应用的框架，提供工具、智能体、链和记忆等能力。",
      TypeScript: "TypeScript 是在 JavaScript 之上加入静态类型的编程语言。",
    };
    return db[input.query] ?? `没有找到关于 ${input.query} 的资料`;
  },
  {
    name: "search",
    description: "搜索一般性知识。用于常识类问题。",
    schema: z.object({ query: z.string().describe("搜索关键词") }),
  }
);

async function main() {
  console.log("🎛️  多工具智能体\n");

  const agent = createAgent({
    model: createModel(),
    tools: [calculatorTool, weatherTool, searchTool],
  });

  const queries = [
    "50 * 25 等于几？",
    "东京天气怎么样？",
    "介绍一下 LangChain.js",
  ];

  for (const q of queries) {
    console.log(`👤 用户：${q}`);
    const res = await agent.invoke({ messages: [new HumanMessage(q)] });
    const last = res.messages[res.messages.length - 1];
    console.log(`🤖 智能体：${last.content}\n`);
  }

  console.log("💡 同一个智能体实例，自动处理了三种不同的问题类型。");
  console.log("   这就是生产环境里构建智能体的标准套路：");
  console.log("   1. 定义工具  2. 交给 createAgent  3. 让它自己选和执行");
}

main().catch(console.error);

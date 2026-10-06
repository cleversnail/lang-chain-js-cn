/**
 * 示例 1：用 createAgent() 创建你的第一个智能体
 * 运行：npx tsx 05-agents/code/01-create-agent.ts
 *
 * 上一章我们手动写了"生成 → 执行 → 回传"的三步循环。
 * createAgent() 把那个循环（ReAct 循环）整个封装好了，你只需要给它模型和工具。
 */
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculatorTool = tool(
  async (input) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "执行数学计算。需要计算数学表达式时使用。",
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式，例如 '25 * 8'"),
    }),
  }
);

async function main() {
  console.log("🤖 你的第一个智能体\n");

  const model = createModel();

  // 就这么多——模型 + 工具 = 一个会自己思考、自己用工具的智能体
  const agent = createAgent({
    model,
    tools: [calculatorTool],
  });

  const query = "125 * 8 等于多少？";
  console.log(`👤 用户：${query}\n`);

  // createAgent 返回的是一个"图"，输入输出都用 messages 数组
  const response = await agent.invoke({
    messages: [new HumanMessage(query)],
  });

  // 取最后一条消息，就是智能体的最终回答
  const last = response.messages[response.messages.length - 1];
  console.log(`🤖 智能体：${last.content}\n`);

  console.log("💡 相比手动三步循环，createAgent() 帮你做了：");
  console.log("   • 自动执行工具并回传结果");
  console.log("   • 自动判断何时结束（不再需要工具时）");
  console.log("   • 自动处理多轮工具调用");
  console.log("   → 底层就是第 4 章那个循环，只是被封装好了");
}

main().catch(console.error);

/**
 * 示例 5：手动实现 ReAct 循环（理解 createAgent 到底做了什么）
 * 运行：npx tsx 05-agents/code/05-manual-react-loop.ts
 *
 * 这个示例故意"手搓"智能体循环，让你看清 createAgent() 内部的那台机器。
 * 教学价值 > 实用价值：真实项目里请直接用 createAgent()。
 */
import { AIMessage, HumanMessage, ToolMessage, tool, type BaseMessage } from "langchain";
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

async function main() {
  console.log("🔁 手动实现 ReAct 循环\n");

  const model = createModel();
  const modelWithTools = model.bindTools([calculator]);
  const tools: Record<string, typeof calculator> = { calculator };

  const messages: BaseMessage[] = [
    new HumanMessage("(123 + 456) * 2 等于几？再用它除以 3。"),
  ];

  const MAX_STEPS = 8;   // 安全上限，防止无限循环

  for (let step = 1; step <= MAX_STEPS; step++) {
    console.log("─".repeat(60));
    console.log(`第 ${step} 轮 · 思考（Thought）`);

    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // 没有工具调用了 → 说明任务完成，输出最终答案
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log("\n✅ 不再需要工具，任务完成");
      console.log(`🤖 最终回答：${response.content}`);
      return;
    }

    // 有工具调用 → 执行（Action）
    for (const call of response.tool_calls) {
      console.log(`行动（Action）：调用 ${call.name}，参数 ${JSON.stringify(call.args)}`);
      const t = tools[call.name];
      if (!t) {
        messages.push(
          new ToolMessage({ content: `未知工具：${call.name}`, tool_call_id: call.id || "" })
        );
        continue;
      }
      const result = await t.invoke(t.schema.parse(call.args));
      console.log(`观察（Observation）：${result}`);
      messages.push(new ToolMessage({ content: String(result), tool_call_id: call.id || "" }));
    }
  }

  console.log("⚠️  达到最大步数上限，循环停止");
}

main().catch(console.error);

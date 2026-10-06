/**
 * 示例 2：把工具"挂"到模型上，看模型如何发起调用
 * 运行：npx tsx 04-function-calling-tools/code/02-tool-calling.ts
 *
 * ⭐ 关键认知：模型不会真的执行函数。
 *   它只会生成一个"工具调用请求"（工具名 + 参数）。
 *   真正执行的是你的代码。
 */
import { tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculatorTool = tool(
  async (input) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "执行数学计算",
    schema: z.object({ expression: z.string().describe("要计算的数学表达式") }),
  }
);

async function main() {
  console.log("🔗 工具调用演示\n");
  console.log("=".repeat(72) + "\n");

  const model = createModel();

  // bindTools：把工具"介绍"给模型（不执行，只是让它知道有哪些工具）
  const modelWithTools = model.bindTools([calculatorTool]);

  console.log("🤖 提问：25 * 17 等于几？\n");
  const response = await modelWithTools.invoke("25 * 17 等于几？");

  console.log("文本内容（content）：", response.content);
  console.log("\n工具调用（tool_calls）：");
  console.log(JSON.stringify(response.tool_calls, null, 2));

  if (response.tool_calls && response.tool_calls.length > 0) {
    const call = response.tool_calls[0];
    console.log("\n" + "-".repeat(72));
    console.log("✅ 模型生成了一个工具调用！");
    console.log("   工具名：", call.name);
    console.log("   参数：", call.args);
    console.log("   调用 ID：", call.id);
    console.log("\n💡 注意：模型只是“描述了要做什么”，并没有真的算。");
    console.log("   下一步（示例 3）才由你的代码去执行。");
  }
}

main().catch(console.error);

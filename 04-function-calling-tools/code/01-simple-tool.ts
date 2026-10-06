/**
 * 示例 1：定义你的第一个工具
 * 运行：npx tsx 04-function-calling-tools/code/01-simple-tool.ts
 *
 * 工具 = 一个函数 + 一段"说明书"（描述 + 参数 schema）。
 * "说明书"决定了大模型能不能看懂、什么时候该用它。
 */
import { tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";

// 定义一个计算器工具
const calculatorTool = tool(
  async (input) => {
    // 用 mathjs 安全求值（比 eval / new Function 安全，只允许数学运算）
    try {
      const result = evaluate(input.expression);
      return `结果是：${result}`;
    } catch (err) {
      return `表达式求值失败：${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: "calculator",
    description: "用于执行数学计算。需要计算数字时使用它。",
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式，例如 '25 * 4'"),
    }),
  }
);

async function main() {
  console.log("🧮 一个简单的计算器工具\n");
  console.log("=".repeat(72));

  console.log("\n工具名：", calculatorTool.name);
  console.log("工具描述：", calculatorTool.description);
  console.log("参数列表：", Object.keys(calculatorTool.schema.shape).join(", "));

  console.log("\n" + "=".repeat(72));
  console.log("\n直接调用工具（不经过模型）：");

  for (const expr of ["25 * 17", "(100 + 50) / 2", "sqrt(144)"]) {
    const result = await calculatorTool.invoke({ expression: expr });
    console.log(`  ${expr} = ${result}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n✅ 工具的三要素：");
  console.log("   • 函数本体：真正干活的代码");
  console.log("   • name：模型引用它时的名字");
  console.log("   • description + schema：告诉模型“这是干嘛的、参数长什么样”");
}

main().catch(console.error);

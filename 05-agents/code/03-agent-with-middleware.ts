/**
 * 示例 3：给智能体加中间件（Middleware）
 * 运行：npx tsx 05-agents/code/03-agent-with-middleware.ts
 *
 * 中间件可以"拦截并改写"智能体的行为，常用于：
 *   • 动态选模型（简单问题用便宜模型，复杂问题用强模型）→ 省成本
 *   • 工具报错时优雅兜底 → 更稳
 *   • 日志、监控、注入用户上下文
 */
import { createAgent, createMiddleware, HumanMessage, ToolMessage, tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculatorTool = tool(
  async (input) => `结果是：${evaluate(input.expression)}`,
  {
    name: "calculator",
    description: "执行数学计算",
    schema: z.object({ expression: z.string().describe("数学表达式") }),
  }
);

const searchTool = tool(
  async (input) => {
    // 故意制造一个失败场景：查询里含 error 就抛错
    if (input.query.toLowerCase().includes("error")) {
      throw new Error("搜索服务暂时不可用");
    }
    return `关于「${input.query}」的搜索结果：找到了一些相关资料。`;
  },
  {
    name: "search",
    description: "搜索信息",
    schema: z.object({ query: z.string().describe("搜索关键词") }),
  }
);

async function main() {
  console.log("🔧 带中间件的智能体\n");

  const basicModel = createModel();                        // 便宜/快的模型
  const capableModel = createModel({ temperature: 0.1 });  // 更强/更稳的模型

  // 中间件 1：动态选模型
  const dynamicModelSelection = createMiddleware({
    name: "DynamicModelSelection",
    wrapModelCall: (request, handler) => {
      console.log(`  [中间件] 当前消息数：${request.messages.length}`);
      if (request.messages.length > 10) {
        console.log("  [中间件] 🔄 对话很长，切换到更强模型\n");
        return handler({ ...request, model: capableModel });
      }
      console.log("  [中间件] ✓ 使用基础模型\n");
      return handler(request);
    },
  });

  // 中间件 2：工具错误兜底
  const toolErrorHandler = createMiddleware({
    name: "ToolErrorHandler",
    wrapToolCall: async (request, handler) => {
      try {
        return await handler(request);
      } catch (err: any) {
        console.error(`  [中间件] ⚠️  工具 ${request.tool?.name} 失败：${err.message}`);
        console.log("  [中间件] 🔄 返回兜底信息\n");
        return new ToolMessage({
          content: `使用工具 ${request.tool?.name} 时出错：${err.message}。我会换一种方式回答。`,
          tool_call_id: request.toolCall.id || "",
        });
      }
    },
  });

  const agent = createAgent({
    model: basicModel,
    tools: [calculatorTool, searchTool],
    middleware: [dynamicModelSelection, toolErrorHandler],
  });

  console.log("测试 1：简单计算");
  console.log("-".repeat(60));
  const r1 = await agent.invoke({ messages: [new HumanMessage("25 * 8 等于几？")] });
  console.log(`🤖 ${r1.messages[r1.messages.length - 1].content}\n\n`);

  console.log("测试 2：触发工具报错，观察兜底");
  console.log("-".repeat(60));
  const r2 = await agent.invoke({
    messages: [new HumanMessage("搜索一下 error 处理的最佳实践")],
  });
  console.log(`🤖 ${r2.messages[r2.messages.length - 1].content}\n`);

  console.log("💡 中间件的价值：");
  console.log("   • 动态选模型 → 省成本");
  console.log("   • 错误兜底 → 不崩、优雅降级");
  console.log("   • 不改动工具本身，就能改变整体行为");
}

main().catch(console.error);

/**
 * 一个本地 MCP 服务器（通过 stdio 通信）
 *
 * MCP 的"服务端"角色：把能力（这里是两个数学工具）按标准协议暴露出去，
 * 任何支持 MCP 的客户端都能即插即用，不需要为它写专门的集成代码。
 *
 * 单独运行（一般不需要，客户端会自动把它当子进程拉起）：
 *   npx tsx 06-mcp/servers/stdio-calculator-server.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluate } from "mathjs";

const server = new McpServer({
  name: "local-calculator",
  version: "1.0.0",
});

// 工具 1：表达式计算
server.tool(
  "calculate",
  "执行数学计算，支持加减乘除、幂、开方、三角函数等表达式",
  { expression: z.string().describe("要计算的数学表达式，例如 '15 * 23 + 100'") },
  async ({ expression }) => {
    try {
      const result = evaluate(expression);
      return { content: [{ type: "text", text: `${expression} = ${result}` }] };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `表达式无效：${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  }
);

// 工具 2：温度换算
server.tool(
  "convert_temperature",
  "在摄氏度与华氏度之间换算",
  {
    value: z.number().describe("温度数值"),
    from: z.enum(["celsius", "fahrenheit"]).describe("原始单位"),
  },
  async ({ value, from }) => {
    const c = from === "celsius" ? value : ((value - 32) * 5) / 9;
    const f = from === "fahrenheit" ? value : (value * 9) / 5 + 32;
    return {
      content: [{ type: "text", text: `${value}°${from === "celsius" ? "C" : "F"} = ${c.toFixed(2)}°C / ${f.toFixed(2)}°F` }],
    };
  }
);

// 用 stdio 传输：通过标准输入输出与父进程通信
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("🧮 本地计算器 MCP 服务器已启动（stdio）");

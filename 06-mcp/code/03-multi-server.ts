/**
 * 示例 3：同时连接多个 MCP 服务器
 * 运行：npx tsx 06-mcp/code/03-multi-server.ts
 *
 * 一个客户端，多个服务器，工具池统一——这就是 MCP 最爽的地方。
 *   服务器 1：本地计算器（stdio）
 *   服务器 2：Context7 文档（HTTP，需联网）
 * 如果 Context7 连不上，脚本会自动只使用本地计算器。
 */
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent, HumanMessage } from "langchain";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";
import { createModel } from "../../lib/model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🌐 多服务器 MCP 集成\n");

  const mcpClient = new MultiServerMCPClient({
    calculator: {
      transport: "stdio",
      command: "npx",
      args: ["tsx", join(__dirname, "../servers/stdio-calculator-server.ts")],
    },
    context7: {
      transport: "http",
      url: process.env.MCP_SERVER_URL || "https://mcp.context7.com/mcp",
    },
  });

  try {
    console.log("🔧 正在汇总所有服务器的工具……");
    const tools = await mcpClient.getTools();
    console.log(`✅ 共拿到 ${tools.length} 个工具：`);
    for (const t of tools) console.log(`   • ${t.name}`);

    const agent = createAgent({ model: createModel(), tools });

    const queries = [
      "25 * 4 + 100 等于几？",
      "帮我查一下 Express.js 中间件的文档",
    ];

    for (const q of queries) {
      console.log(`\n👤 用户：${q}`);
      const res = await agent.invoke({ messages: [new HumanMessage(q)] });
      console.log(`🤖 智能体：${res.messages[res.messages.length - 1].content}`);
    }

    console.log("\n💡 要点：智能体面对来自不同服务器的工具，照样自动挑对的那个。");
  } catch (err) {
    console.error("❌ 出错：", err instanceof Error ? err.message : err);
    console.log("💡 如果是 Context7 连不上，可以先把 context7 那段配置删掉，只留本地计算器。");
  } finally {
    await mcpClient.close();
    console.log("\n🔌 MCP 连接已关闭");
  }
}

main().catch(console.error);

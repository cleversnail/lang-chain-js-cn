/**
 * 示例 2：通过 stdio 连接本地 MCP 服务器
 * 运行：npx tsx 06-mcp/code/02-mcp-stdio.ts
 *
 * stdio 传输：客户端把 MCP 服务器当作"子进程"启动，通过标准输入输出通信。
 * 不需要外网，最适合本地跑通、也最适合学习。
 *
 * 服务器代码见：06-mcp/servers/stdio-calculator-server.ts
 */
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent, HumanMessage } from "langchain";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";
import { createModel } from "../../lib/model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🔧 通过 stdio 连接本地 MCP 服务器\n");

  // command + args：客户端会以子进程方式启动这个服务器
  const mcpClient = new MultiServerMCPClient({
    localCalculator: {
      transport: "stdio",
      command: "npx",
      args: ["tsx", join(__dirname, "../servers/stdio-calculator-server.ts")],
    },
  });

  try {
    console.log("📟 正在启动并连接本地 MCP 服务器……");
    const tools = await mcpClient.getTools();
    console.log(`✅ 连接成功，拿到 ${tools.length} 个工具：`);
    for (const t of tools) console.log(`   • ${t.name}：${t.description}`);

    const agent = createAgent({ model: createModel(), tools });

    const queries = [
      "15 * 23 + 100 等于几？",
      "把 100 华氏度换算成摄氏度",
      "计算一下 sqrt(144) 加 sin(pi/2)",
    ];

    for (const q of queries) {
      console.log(`\n👤 用户：${q}`);
      const res = await agent.invoke({ messages: [new HumanMessage(q)] });
      console.log(`🤖 智能体：${res.messages[res.messages.length - 1].content}`);
    }

    console.log("\n💡 要点：stdio 传输 = 进程间通信（stdin/stdout）；");
    console.log("   HTTP 传输 = 网络通信。同一套 agent 代码，两种传输都能用。");
  } catch (err) {
    console.error("❌ 本地 MCP 服务器出错：", err instanceof Error ? err.message : err);
  } finally {
    await mcpClient.close();
    console.log("\n🔌 MCP 连接已关闭");
  }
}

main().catch(console.error);

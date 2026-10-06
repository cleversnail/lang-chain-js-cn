/**
 * 示例 1：通过 HTTP 连接远程 MCP 服务器（Context7 文档服务）
 * 运行：npx tsx 06-mcp/code/01-mcp-http.ts
 *
 * Context7 是一个文档 MCP 服务，能提供"最新版本"的库文档。
 * 它暴露的工具通常包括：resolve-library-id、get-library-docs 等。
 *
 * 需要联网。若网络不通，请看示例 2（本地 stdio 服务器，无需外网）。
 */
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent, HumanMessage } from "langchain";
import "dotenv/config";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("🔌 连接远程 MCP 服务器（Context7）\n");

  const serverUrl = process.env.MCP_SERVER_URL || "https://mcp.context7.com/mcp";
  console.log(`📡 目标：${serverUrl}\n`);

  const mcpClient = new MultiServerMCPClient({
    context7: {
      transport: "http",
      url: serverUrl,
      // 可选：填了 CONTEXT7_API_KEY 能提高限速额度
      ...(process.env.CONTEXT7_API_KEY
        ? { headers: { Authorization: `Bearer ${process.env.CONTEXT7_API_KEY}` } }
        : {}),
    },
  });

  try {
    console.log("🔧 正在获取工具列表……");
    const tools = await mcpClient.getTools();
    console.log(`✅ 拿到 ${tools.length} 个工具：`);
    for (const t of tools) console.log(`   • ${t.name}：${t.description}`);

    // 关键点：MCP 工具和自定义工具用起来一模一样，直接丢给 createAgent
    const agent = createAgent({
      model: createModel(),
      tools,
    });

    const query = "React 的 useState 怎么用？给我最新文档。";
    console.log(`\n👤 用户：${query}\n`);
    const res = await agent.invoke({ messages: [new HumanMessage(query)] });
    console.log(`🤖 智能体：${res.messages[res.messages.length - 1].content}`);

    console.log("\n💡 要点：MCP 提供了标准化的外部工具接入方式；");
    console.log("   从 MCP 拿到的工具，和自定义工具在 createAgent 里完全等价。");
  } catch (err) {
    console.error("❌ 连接 MCP 服务器失败：", err instanceof Error ? err.message : err);
    console.log("\n💡 可能是网络问题。可以先运行示例 2（本地 stdio 服务器），它不需要外网。");
  } finally {
    await mcpClient.close();
    console.log("\n🔌 MCP 连接已关闭");
  }
}

main().catch(console.error);

/**
 * 示例 2：Agentic RAG —— 让智能体自己决定要不要检索
 * 运行：npx tsx 08-agentic-rag-systems/code/02-agentic-rag.ts
 *
 * 与传统 RAG 的唯一区别：检索变成一个"工具"，是否使用由智能体自己判断。
 *   常识问题 → 直接回答，不检索
 *   知识库问题 → 调用检索工具
 */
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";
import { buildVectorStore } from "../../lib/kb.js";

async function main() {
  console.log("🤖 Agentic RAG\n");

  const { store, chunkCount } = await buildVectorStore();
  console.log(`📚 知识库就绪（${chunkCount} 个文本块）\n`);

  // 把"检索"包装成一个工具，交给智能体决策
  const retrievalTool = tool(
    async (input) => {
      console.log(`   🔍 智能体决定检索：${input.query}`);
      const results = await store.similaritySearch(input.query, 3);
      return results.map((d) => `[${d.metadata.source}] ${d.pageContent}`).join("\n\n");
    },
    {
      name: "searchKnowledgeBase",
      description:
        "检索本项目知识库，获取关于 LangChain.js、RAG、向量存储、智能体、MCP 的事实性资料。当问题需要这些具体知识时才使用。",
      schema: z.object({ query: z.string().describe("检索关键词") }),
    }
  );

  const agent = createAgent({
    model: createModel(),
    tools: [retrievalTool],
  });

  const questions = [
    "法国的首都是哪里？",                 // 常识 → 应该直接回答
    "LangChain.js 是什么？",              // 知识库 → 应触发检索
    "MCP 是什么？",                       // 知识库 → 应触发检索
  ];

  for (const q of questions) {
    console.log("=".repeat(72));
    console.log(`\n❓ ${q}\n`);
    const res = await agent.invoke({ messages: [new HumanMessage(q)] });
    console.log(`🤖 ${res.messages[res.messages.length - 1].content}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n💡 Agentic RAG 的好处：");
  console.log("   ✓ 只在必要时检索 → 更省钱");
  console.log("   ✓ 常识问题响应更快");
  console.log("   ✓ 可扩展到多个检索源 / 多个工具");
}

main().catch(console.error);

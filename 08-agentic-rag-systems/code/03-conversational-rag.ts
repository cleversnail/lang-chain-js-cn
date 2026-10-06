/**
 * 示例 3：带记忆的 RAG（多轮追问）
 * 运行：npx tsx 08-agentic-rag-systems/code/03-conversational-rag.ts
 *
 * 把第 2 章（记忆）和第 8 章（RAG）合起来：
 * 每次把对话历史一起发给智能体，于是它能听懂"它呢？""再详细说说"这种指代。
 */
import { createAgent, HumanMessage, tool, type BaseMessage } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";
import { buildVectorStore } from "../../lib/kb.js";

async function main() {
  console.log("💬 带记忆的 RAG\n");

  const { store } = await buildVectorStore();
  console.log("📚 知识库就绪\n");

  const retrievalTool = tool(
    async (input) => {
      const results = await store.similaritySearch(input.query, 3);
      return results.map((d) => `[${d.metadata.source}] ${d.pageContent}`).join("\n\n");
    },
    {
      name: "searchKnowledgeBase",
      description: "检索知识库获取 LangChain.js / RAG / MCP / 向量存储相关资料",
      schema: z.object({ query: z.string() }),
    }
  );

  const agent = createAgent({ model: createModel(), tools: [retrievalTool] });

  const history: BaseMessage[] = [];
  const turns = [
    "什么是 RAG？",
    "它和传统关键词搜索有什么区别？",   // "它" 指代 RAG
    "那 Agentic RAG 呢？",              // 承接上文
  ];

  for (const q of turns) {
    console.log("=".repeat(72));
    console.log(`\n👤 用户：${q}\n`);
    history.push(new HumanMessage(q));

    const res = await agent.invoke({ messages: [...history] });
    const last = res.messages[res.messages.length - 1];
    console.log(`🤖 ${last.content}`);

    // 关键的"记忆"动作：把本轮完整消息并入历史
    history.push(...res.messages.slice(1));
  }

  console.log("\n" + "=".repeat(72));
  console.log(`\n✅ 三轮对话结束，历史共 ${history.length} 条消息。`);
  console.log("💡 因为携带了历史，智能体能正确理解「它」「那……呢」这类指代。");
  console.log("⚠️  历史越长越贵，生产环境记得配 summarizationMiddleware（第 5 章）。");
}

main().catch(console.error);

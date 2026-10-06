/**
 * 示例 4：决策框架 —— 什么时候该用 RAG？
 * 运行：npx tsx 08-agentic-rag-systems/code/04-when-to-use-rag.ts
 *
 * 三种典型方案的选择：
 *   1. 提示词工程（Prompt Engineering）—— 数据小且静态
 *   2. RAG                              —— 数据大、需要检索、更新频繁
 *   3. 微调（Fine-tuning）              —— 想改变模型的"行为/风格"（本示例只讲，不演示）
 */
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";
import { buildVectorStore } from "../../lib/kb.js";

async function scenario1_promptEngineering() {
  console.log("📋 场景 1：小型 FAQ（用提示词工程就够了）");
  console.log("-".repeat(72));
  console.log("数据量小、几乎不变 → 直接塞进提示词即可，无需检索\n");

  const faq = `
产品 FAQ：
Q: 退货政策？ A: 30 天无理由退款。
Q: 多久发货？ A: 标准 2-3 个工作日，加急 1 天。
Q: 有质保吗？  A: 有，整机 1 年质保。
`;

  const chain = ChatPromptTemplate.fromMessages([
    ["system", "你是客服助手，依据以下 FAQ 回答：\n\n{context}"],
    ["human", "{question}"],
  ]).pipe(createModel());

  const q = "你们的退货政策是什么？";
  console.log(`❓ ${q}`);
  const res = await chain.invoke({ context: faq, question: q });
  console.log(`🤖 ${res.content}\n`);
  console.log("💡 为什么用提示词工程：数据小、全都在提示词里、无需检索、快且便宜。\n");
}

async function scenario2_rag() {
  console.log("=".repeat(72));
  console.log("\n📚 场景 2：大知识库（必须用 RAG）");
  console.log("-".repeat(72));
  console.log("数据量大、装不进提示词、且更新频繁 → 检索 + 生成\n");

  const { store, chunkCount } = await buildVectorStore();
  const retrievalTool = tool(
    async (input) => {
      const r = await store.similaritySearch(input.query, 3);
      return r.map((d) => `[${d.metadata.source}] ${d.pageContent}`).join("\n\n");
    },
    {
      name: "searchKnowledgeBase",
      description: "检索知识库",
      schema: z.object({ query: z.string() }),
    }
  );
  const agent = createAgent({ model: createModel(), tools: [retrievalTool] });

  const q = "RAG 是怎么工作的？";
  console.log(`❓ ${q}（知识库 ${chunkCount} 块）`);
  const res = await agent.invoke({ messages: [new HumanMessage(q)] });
  console.log(`🤖 ${res.messages[res.messages.length - 1].content}\n`);
  console.log("💡 为什么用 RAG：可扩展、易更新、可溯源、只检索相关内容。\n");
}

async function framework() {
  console.log("=".repeat(72));
  console.log("\n🎓 决策框架\n");
  console.log("第 1 步：信息能塞进提示词吗（< 约 8000 token）？");
  console.log("   ✅ 能   → 用【提示词工程】");
  console.log("   ❌ 不能 → 进入第 2 步\n");
  console.log("第 2 步：你要「补充信息」还是「改变行为」？");
  console.log("   📚 补信息 → 用【RAG】");
  console.log("   🎨 改行为 → 用【微调 Fine-tuning】\n");
  console.log("第 3 步：信息更新频繁吗？");
  console.log("   ✅ 是 → 一定用 RAG（易于更新）");
  console.log("   ❌ 否 → 都行，但 RAG 更便宜\n");
  console.log("第 4 步：需要标注来源吗？");
  console.log("   ✅ 需要 → 用 RAG（能追踪来源文档）");
  console.log("\n" + "=".repeat(72));
  console.log("\n📋 三者速查：");
  console.log("   提示词工程：小、静态数据      → 简单、快、便宜");
  console.log("   RAG：大、可检索知识库         → 可扩展、可更新、可溯源");
  console.log("   微调：改变模型行为/风格       → 效果强，但贵、慢、难更新");
}

async function main() {
  console.log("🎯 什么时候该用 RAG？\n");
  console.log("=".repeat(72) + "\n");
  await scenario1_promptEngineering();
  await scenario2_rag();
  await framework();
}

main().catch(console.error);

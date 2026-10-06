/**
 * 示例 1：传统 RAG —— "每问必搜"
 * 运行：npx tsx 08-agentic-rag-systems/code/01-traditional-rag.ts
 *
 * 传统 RAG 的流程是固定的一条链：
 *   查询 → 一定去检索 → 把检索结果塞进提示词 → 模型生成答案
 *
 * 问题：连"法国首都是哪"这种常识问题也要搜一遍，浪费时间与金钱。
 * 对比示例 2 的 Agentic RAG。
 */
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
import type { Document } from "@langchain/core/documents";
import { createModel } from "../../lib/model.js";
import { buildVectorStore } from "../../lib/kb.js";

async function main() {
  console.log("📖 传统 RAG（每问必搜）\n");

  const { store, chunkCount } = await buildVectorStore();
  console.log(`📚 知识库就绪（${chunkCount} 个文本块）\n`);

  const retriever = store.asRetriever({ k: 2 });

  const prompt = ChatPromptTemplate.fromTemplate(
    "请根据下面的资料回答问题：\n\n{context}\n\n问题：{input}\n\n答案："
  );

  const combineDocsChain = await createStuffDocumentsChain({
    llm: createModel(),
    prompt,
  });

  const ragChain = await createRetrievalChain({
    retriever,
    combineDocsChain,
  });

  console.log("💡 观察：每条问题都会触发一次检索（哪怕它根本不需要）：\n");

  const questions = [
    "法国的首都是哪里？",              // 常识，本不需要检索
    "LangChain.js 是什么？",           // 需要检索
    "什么是 RAG？",                    // 需要检索
  ];

  for (const q of questions) {
    console.log("=".repeat(72));
    console.log(`\n❓ ${q}\n`);
    console.log("   🔍 传统 RAG：无条件检索中……");
    const res = await ragChain.invoke({ input: q });
    console.log(`🤖 ${res.answer}`);
    console.log(`\n📄 检索了 ${res.context.length} 个文档块：`);
    (res.context as Document[]).forEach((d, i) => console.log(`   ${i + 1}. ${d.metadata.source}`));
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n💡 传统 RAG 的特点：");
  console.log("   • 结构简单、行为可预测");
  console.log("   • 但对常识问题也强行走一遍检索，浪费 API 调用与时间");
  console.log("   → 看看示例 2 的 Agentic RAG 怎么改进");
}

main().catch(console.error);

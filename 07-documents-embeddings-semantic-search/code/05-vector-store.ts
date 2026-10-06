/**
 * 示例 5：向量存储 + 语义搜索
 * 运行：npx tsx 07-documents-embeddings-semantic-search/code/05-vector-store.ts
 *
 * 向量数据库 = 存向量 + 快速找"最相似"的几条。
 * 本示例用内存版 MemoryVectorStore（学习友好；生产可换 Chroma/Pinecone 等）。
 */
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { createEmbeddings } from "../../lib/embeddings.js";

async function main() {
  console.log("🗄️  向量存储与语义搜索\n");

  const embeddings = createEmbeddings();

  const docs = [
    new Document({ pageContent: "Python 是数据科学与机器学习常用的编程语言。", metadata: { category: "编程", lang: "python" } }),
    new Document({ pageContent: "JavaScript 广泛用于网站开发与构建交互式网页。", metadata: { category: "编程", lang: "javascript" } }),
    new Document({ pageContent: "机器学习算法能从大规模数据中发现规律。", metadata: { category: "AI", topic: "机器学习" } }),
    new Document({ pageContent: "神经网络受人类大脑启发，用于深度学习。", metadata: { category: "AI", topic: "深度学习" } }),
    new Document({ pageContent: "猫是独立的宠物，喜欢打盹和抓老鼠。", metadata: { category: "动物", type: "哺乳动物" } }),
    new Document({ pageContent: "狗是忠诚的伙伴，喜欢玩接球和散步。", metadata: { category: "动物", type: "哺乳动物" } }),
  ];

  console.log(`📚 用 ${docs.length} 个文档建立向量库……\n`);
  const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
  console.log("✅ 向量库建立完成\n");
  console.log("=".repeat(72));

  const searches = [
    { query: "适合做 AI 的编程语言", k: 2 },
    { query: "需要运动量的宠物", k: 2 },
    { query: "搭建网站", k: 2 },
  ];

  for (const { query, k } of searches) {
    console.log(`\n🔍 查询：「${query}」（取前 ${k} 条）\n`);
    const results = await store.similaritySearch(query, k);
    results.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.pageContent}   [分类：${d.metadata.category}]`);
    });
    console.log("-".repeat(72));
  }

  console.log("\n💡 注意：");
  console.log("   • 结果按语义相似度排序");
  console.log("   • 不需要出现完全一样的关键词也能命中");
  console.log("   • 这就是 RAG 的检索底座");
}

main().catch(console.error);

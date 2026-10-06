/**
 * 示例 3：元数据（Metadata）—— 文档的"身份证"
 * 运行：npx tsx 07-documents-embeddings-semantic-search/code/03-metadata.ts
 *
 * metadata 用来做过滤、溯源、分类。
 * 关键特性：切分时，metadata 会自动复制到每一个子块上（不丢失来源信息）。
 */
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

async function main() {
  console.log("🏷️  文档元数据\n");

  const docs = [
    new Document({
      pageContent:
        "LangChain.js 是一个用于构建 AI 应用的框架。它为语言模型、向量存储和链提供了抽象。",
      metadata: {
        source: "langchain-intro.md",
        category: "tutorial",
        difficulty: "beginner",
        date: "2024-01-15",
        tags: ["langchain", "javascript", "ai"],
      },
    }),
    new Document({
      pageContent:
        "RAG（检索增强生成）把文档检索与大模型生成结合，让模型能访问外部知识。",
      metadata: {
        source: "rag-explained.md",
        category: "concept",
        difficulty: "intermediate",
        date: "2024-02-20",
        tags: ["rag", "retrieval", "llm"],
      },
    }),
    new Document({
      pageContent:
        "向量数据库存储嵌入向量并支持语义搜索。常见的有 Pinecone、Weaviate、Chroma。",
      metadata: {
        source: "vector-db-guide.md",
        category: "infrastructure",
        difficulty: "intermediate",
        date: "2024-03-10",
        tags: ["vectors", "embeddings", "database"],
      },
    }),
  ];

  console.log(`📚 创建了 ${docs.length} 个带元数据的文档\n`);
  docs.forEach((d, i) => {
    console.log(`文档 ${i + 1}：${d.metadata.source}`);
    console.log("   ", JSON.stringify(d.metadata));
  });

  // 切分：元数据会被复制到每个子块
  console.log("\n" + "=".repeat(72));
  console.log("\n✂️  切分后，元数据依然保留：\n");
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 40, chunkOverlap: 10 });
  const chunks = await splitter.splitDocuments(docs);
  console.log(`切分产出 ${chunks.length} 块，前两块示例：`);
  chunks.slice(0, 2).forEach((c, i) => {
    console.log(`  块 ${i + 1} 来源：${c.metadata.source} ｜ 分类：${c.metadata.category}`);
  });

  // 按元数据过滤
  console.log("\n" + "=".repeat(72));
  console.log("\n🔍 按元数据过滤：\n");
  const beginner = docs.filter((d) => d.metadata.difficulty === "beginner");
  console.log(`beginner 级文档：${beginner.map((d) => d.metadata.source).join(", ") || "无"}`);
  const aiTagged = docs.filter((d) => (d.metadata.tags as string[])?.includes("ai"));
  console.log(`打了 ai 标签的文档：${aiTagged.map((d) => d.metadata.source).join(", ") || "无"}`);

  console.log("\n✅ 元数据是组织、过滤、溯源的基石。");
}

main().catch(console.error);

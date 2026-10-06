/**
 * 示例 6：带分数的检索（看相似度到底多高）
 * 运行：npx tsx 07-documents-embeddings-semantic-search/code/06-similarity-scores.ts
 *
 * similaritySearchWithScore 会一并返回相似度分数，
 * 方便你用"阈值"筛掉不相关的结果。
 */
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { createEmbeddings, embeddingMode } from "../../lib/embeddings.js";

// 相似度阈值的"口径"取决于所用的嵌入模型：
//   - 真正的 embedding 模型（如 text-embedding-3、bge-m3）分数分布较宽
//   - 本地离线嵌入（词袋）分数整体偏低
// 所以下面按当前模式选择对应的阈值。
const MODE = embeddingMode();
const THRESHOLDS =
  MODE === "openai"
    ? { great: 0.85, good: 0.7, ok: 0.5 }
    : { great: 0.35, good: 0.25, ok: 0.12 };

function interpret(score: number): string {
  if (score > THRESHOLDS.great) return "🎯 非常匹配";
  if (score > THRESHOLDS.good) return "✅ 匹配良好";
  if (score > THRESHOLDS.ok) return "⚠️  一般匹配";
  return "❌ 匹配很弱";
}

async function main() {
  console.log("📊 带分数的语义检索\n");

  const embeddings = createEmbeddings();

  const docs = [
    new Document({ pageContent: "Python 非常适合数据科学与机器学习。", metadata: { category: "编程" } }),
    new Document({ pageContent: "JavaScript 驱动交互式网页应用。", metadata: { category: "编程" } }),
    new Document({ pageContent: "机器学习算法能在大数据中发现规律。", metadata: { category: "AI" } }),
    new Document({ pageContent: "猫是喜欢晒太阳的独立宠物。", metadata: { category: "动物" } }),
    new Document({ pageContent: "狗是热爱户外活动的忠诚伙伴。", metadata: { category: "动物" } }),
    new Document({ pageContent: "TypeScript 为 JavaScript 增加了静态类型。", metadata: { category: "编程" } }),
  ];

  const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
  console.log(`✅ 向量库已就绪（${docs.length} 条）\n`);
  console.log("=".repeat(72));

  const queries = [
    "用于网站开发的编程语言",
    "适合公寓饲养的宠物",
    "用 AI 理解数据",
  ];

  for (const q of queries) {
    console.log(`\n🔍 查询：「${q}」\n`);
    const results = await store.similaritySearchWithScore(q, 3);
    results.forEach(([doc, score], i) => {
      console.log(`${i + 1}. 分数 ${score.toFixed(4)}  ${interpret(score)}`);
      console.log(`   内容：${doc.pageContent}`);
    });
    console.log("-".repeat(72));
  }

  console.log("\n💡 分数的用法：");
  console.log("   • 生产系统常设阈值（如 > 0.7）过滤掉不相关内容");
  console.log("   • 若一条都不过阈值，可以让智能体「直接回答」或「如实说没查到」");
  console.log(`\n⚠️  当前嵌入模式：${MODE}。不同嵌入模型的分数口径不同，`);
  console.log("    阈值务必用你自己的数据实测标定，不能照搬别人的数字。");
}

main().catch(console.error);

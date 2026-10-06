/**
 * 示例 4：嵌入（Embeddings）—— 把文本变成向量
 * 运行：npx tsx 07-documents-embeddings-semantic-search/code/04-embeddings.ts
 *
 * 核心思想：把文本映射成一串数字（向量），语义相近的文本，向量也相近。
 * 于是"比较意思"变成了"比较数字"——计算机就能算了。
 *
 * 本示例用 lib/embeddings.ts：
 *   - 配了 embedding 服务 → 用真正的模型
 *   - 没配 → 自动降级为本地离线嵌入（保证能跑）
 */
import { createEmbeddings, cosineSimilarity } from "../../lib/embeddings.js";

async function main() {
  console.log("🔢 嵌入与相似度\n");

  const embeddings = createEmbeddings();

  const texts = [
    "LangChain 让构建 AI 应用更简单",
    "LangChain 简化了 AI 应用开发",
    "我喜欢晚餐吃披萨",
    "今天天气晴朗",
  ];

  console.log("正在生成嵌入向量……\n");
  const vectors = await embeddings.embedDocuments(texts);

  console.log(`✅ 生成 ${vectors.length} 个向量，每个 ${vectors[0].length} 维`);
  console.log("第一个向量的前 8 个数字：", vectors[0].slice(0, 8).map((n) => n.toFixed(3)));

  console.log("\n" + "=".repeat(72));
  console.log("\n📊 两两相似度（余弦相似度，越接近 1 越相似）：\n");

  const pairs: Array<[number, number, string]> = [
    [0, 1, "LangChain 相关 vs LangChain 相关"],
    [0, 2, "LangChain vs 披萨"],
    [0, 3, "LangChain vs 天气"],
    [2, 3, "披萨 vs 天气"],
  ];

  for (const [i, j, desc] of pairs) {
    const sim = cosineSimilarity(vectors[i], vectors[j]);
    console.log(`${desc}：${sim.toFixed(4)}`);
    console.log(`   「${texts[i]}」 vs 「${texts[j]}」\n`);
  }

  console.log("=".repeat(72));
  console.log("\n💡 解读：");
  console.log("   • 语义相近 → 相似度高");
  console.log("   • 主题无关 → 相似度低");
  console.log("   • 嵌入捕捉的是「意思」，不只是「关键词」");
  console.log("\n⚠️  若你看到的是本地离线嵌入的结果，那只反映「字面重合」，");
  console.log("    语义效果有限。配置真正的 embedding 服务后对比一下差异。");
}

main().catch(console.error);

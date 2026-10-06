/**
 * 示例 2：切分长文本（Chunking）
 * 运行：npx tsx 07-documents-embeddings-semantic-search/code/02-splitting.ts
 *
 * 为什么要切？
 *   1. 模型有上下文窗口上限，整本书塞不进去
 *   2. 检索时需要"精准定位"，小块比大块更好命中
 *
 * 切太碎 vs 切太粗：
 *   小块（200-500 字符）：更精准，但上下文少
 *   大块（1000-2000 字符）：上下文足，但不够精准
 */
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "../../data");

async function main() {
  console.log("✂️  文本切分\n");

  const text = readFileSync(join(DATA, "article.txt"), "utf-8");
  console.log(`原文长度：${text.length} 字符\n`);

  // RecursiveCharacterTextSplitter：优先按段落切，其次句子，再次词
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,      // 每块目标长度
    chunkOverlap: 40,    // 相邻块重叠长度（见示例 3）
  });

  const docs = await splitter.createDocuments([text]);

  console.log(`✂️  切成 ${docs.length} 块\n`);
  console.log("=".repeat(72));

  docs.forEach((doc, i) => {
    console.log(`\n📄 第 ${i + 1} / ${docs.length} 块（${doc.pageContent.length} 字符）`);
    console.log("-".repeat(72));
    console.log(doc.pageContent);
  });

  console.log("\n" + "=".repeat(72));
  console.log(`\n💡 原文 ${text.length} 字符 → ${docs.length} 块，平均每块约 ${Math.round(text.length / docs.length)} 字符`);
  console.log("   推荐：chunkSize 200~1000，chunkOverlap 取 chunkSize 的 10%~20%");
}

main().catch(console.error);

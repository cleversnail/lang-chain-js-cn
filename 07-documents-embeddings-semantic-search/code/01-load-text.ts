/**
 * 示例 1：加载文本文件 → Document
 * 运行：npx tsx 07-documents-embeddings-semantic-search/code/01-load-text.ts
 *
 * LangChain 里一切文本处理的基本单位是 Document：
 *   pageContent —— 真正的文本
 *   metadata    —— 附加信息（来源、分类、日期……）
 */
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { Document } from "@langchain/core/documents";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "../../data");

async function main() {
  console.log("📄 加载文本文件\n");

  // 方式 1：用加载器读取文件
  const loader = new TextLoader(join(DATA, "sample.txt"));
  const docs = await loader.load();

  console.log(`📚 共加载 ${docs.length} 个 Document\n`);
  console.log("📝 内容（前 160 字）：");
  console.log(docs[0].pageContent.slice(0, 160) + "...\n");
  console.log("🏷️  metadata：", docs[0].metadata);
  console.log(`\n📊 统计：${docs[0].pageContent.length} 字符 / ${docs[0].pageContent.split(/\s+/).length} 词元`);

  // 方式 2：手工构造 Document（可以自己塞 metadata）
  const manual = new Document({
    pageContent: "这是手工创建的文档内容。",
    metadata: { source: "手工创建", category: "示例" },
  });
  console.log("\n" + "=".repeat(72));
  console.log("\n✍️  手工创建 Document：");
  console.log("   内容：", manual.pageContent);
  console.log("   元数据：", manual.metadata);

  console.log("\n✅ Document = pageContent + metadata，这是一切后续处理的输入。");
}

main().catch(console.error);

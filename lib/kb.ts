/**
 * 知识库工具 —— 第 08 章使用。
 *
 * 把 data/docs/ 下的 Markdown 文件加载进来、切成小块、建成一个内存向量库。
 * 真实项目里，这一步通常换成从数据库 / 对象存储 / 网页抓取来构建。
 */
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createEmbeddings } from "./embeddings.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, "../data/docs");

/** 读入知识库文档，并按语义切成小块 */
export async function loadKnowledgeBase(): Promise<Document[]> {
  const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  const raw = files.map(
    (f) =>
      new Document({
        pageContent: readFileSync(join(DOCS_DIR, f), "utf-8"),
        metadata: { source: f },
      })
  );

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 50 });
  return await splitter.splitDocuments(raw);
}

/** 构建内存向量库（返回 store 和它切分后的文档数） */
export async function buildVectorStore(): Promise<{ store: MemoryVectorStore; chunkCount: number }> {
  const embeddings = createEmbeddings();
  const chunks = await loadKnowledgeBase();
  const store = await MemoryVectorStore.fromDocuments(chunks, embeddings);
  return { store, chunkCount: chunks.length };
}

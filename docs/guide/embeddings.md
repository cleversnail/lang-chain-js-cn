# 第 7 章 · 文档、嵌入与语义搜索

> 本章是 RAG（检索增强生成）的地基。**RAG 是当前企业里最有价值的 AI 应用形态**——让模型回答它训练时没见过、但你公司内部才有的知识。

## 🎯 本章目标

- 理解 `Document` 这个基本单位
- 学会文本切分（Chunking）
- 用元数据（Metadata）做过滤与溯源
- 理解嵌入（Embeddings）：把"意思"变成数字
- 搭起向量库并做语义搜索
- 用相似度分数做阈值过滤

**本章代码**

> 📌 **代码约定**：正文的代码块都尽量保持**可直接运行**（含 import 与模型初始化）。若某段为聚焦概念的**节选**，会明确标注「节选」并指向同名的 `code/` 完整文件。

| 文件 | 内容 |
| --- | --- |
| `code/01-load-text.ts` | 加载文本 → Document |
| `code/02-splitting.ts` | 文本切分 |
| `code/03-metadata.ts` | 元数据：过滤与溯源 |
| `code/04-embeddings.ts` | 嵌入与相似度 |
| `code/05-vector-store.ts` | 向量库 + 语义搜索 |
| `code/06-similarity-scores.ts` | 带分数的检索 |

> ⚠️ **关于本章的运行效果**：如果你**没有配置 embedding 服务**，本章代码会自动降级为
> **本地离线嵌入**（用哈希词袋模拟），能跑通、但只反映"字面重合"，语义效果有限。
> 想看到真正的语义检索，请在 `.env` 里配 `AI_EMBEDDING_API_KEY`（见第 0 章第五节）。
>
> 下文所有输出都是**离线模式下的真实输出**，我会明确标注哪些地方"效果不如真实嵌入"。

---

## 一、Document：LangChain 的基本单位

LangChain 里一切文本处理的基本单位是 **`Document`**，它只有两个字段：

| 字段 | 含义 |
| --- | --- |
| `pageContent` | 真正的文本内容 |
| `metadata` | 附加信息（来源、分类、日期、标签……） |

### 示例 1：加载文本文件

```typescript
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
```

运行：

```bash
npx tsx 07-documents-embeddings-semantic-search/code/01-load-text.ts
```

预期输出（节选）：

```
📄 加载文本文件

📚 共加载 1 个 Document

📝 内容（前 160 字）：
LangChain.js：构建 AI 应用的框架

LangChain.js 是一个用于构建大语言模型（LLM）应用的框架。
它提供了一整套工具与抽象，让开发者更容易在生产环境中使用 LLM。

核心特性：
- 模型抽象：用同一套接口对接不同服务商
- 提示词管理：通过模板创建可复用、可测试的提示词
- 文档处理：高效...

🏷️  metadata： { source: '/…/langChain/data/sample.txt' }

📊 统计：367 字符 / 38 词元

========================================================================

✍️  手工创建 Document：
   内容： 这是手工创建的文档内容。
   元数据： { source: '手工创建', category: '示例' }

✅ Document = pageContent + metadata，这是一切后续处理的输入。
```

两种创建方式：**加载器**（从文件/网页/PDF 读）和**手工构造**。
后面做 RAG 时你两者都会用到。

---

## 二、为什么要切分（Chunking）

**不能把整本书直接塞给模型**，原因有两个：

1. **上下文窗口有上限**——塞不下
2. **检索要精准**——小块比大块更容易"命中"

切太碎 vs 切太粗：

| 块大小 | 优点 | 缺点 |
| --- | --- | --- |
| 小（200~500 字符） | 更精准 | 上下文少，可能答不完整 |
| 大（1000~2000 字符） | 上下文足 | 不够精准，容易夹带无关内容 |

### 示例 2：切分长文本

```typescript
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
```

运行：

```bash
npx tsx 07-documents-embeddings-semantic-search/code/02-splitting.ts
```

预期输出：

```
✂️  文本切分

原文长度：385 字符

✂️  切成 2 块

========================================================================

📄 第 1 / 2 块（197 字符）
------------------------------------------------------------------------
人工智能与机器学习

人工智能（AI）正在改变我们与技术互动的方式。
从虚拟助手到推荐系统，AI 正逐渐成为日常生活的一部分。

机器学习基础

机器学习是 AI 的一个分支，它让系统能够从经验中学习并自我改进，
而不需要被显式编程。……

📄 第 2 / 2 块（185 字符）
------------------------------------------------------------------------
机器学习的类型

1. 监督学习：算法从带标签的训练数据中学习
2. 无监督学习：算法在无标签数据中发现规律
3. 强化学习：算法通过试错进行学习

深度学习

深度学习是机器学习的子集，使用多层神经网络。……

========================================================================

💡 原文 385 字符 → 2 块，平均每块约 193 字符
```

**两个关键参数**：

- `chunkSize` — 每块目标长度
- `chunkOverlap` — 相邻块**重叠**长度

> 💡 为什么要 `chunkOverlap`？因为一个完整的句子可能刚好被切断在边界上。
> 让相邻块重叠一点，能避免"答案被腰斩"。**经验值：overlap 取 chunkSize 的 10%~20%。**

> 💡 为什么叫 `Recursive`（递归）？它会**优先按大结构切**：先试段落（`\n\n`），
> 不行再试句子（`。`），再不行才按字符硬切。这样切出来的块尽量语义完整。

---

## 三、元数据（Metadata）

`metadata` 是文档的"身份证"，用来**过滤、溯源、分类**。

它有一个很关键的特性：**切分时，元数据会自动复制到每个子块上**——来源信息不会丢。

### 示例 3：元数据与过滤

```typescript
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
```

运行：

```bash
npx tsx 07-documents-embeddings-semantic-search/code/03-metadata.ts
```

预期输出（节选）：

```
📚 创建了 3 个带元数据的文档

文档 1：langchain-intro.md
    {"source":"langchain-intro.md","category":"tutorial","difficulty":"beginner",...}
文档 2：rag-explained.md
    {"source":"rag-explained.md","category":"concept","difficulty":"intermediate",...}
文档 3：vector-db-guide.md
    {"source":"vector-db-guide.md","category":"infrastructure","difficulty":"intermediate",...}

========================================================================

✂️  切分后，元数据依然保留：

切分产出 5 块，前两块示例：
  块 1 来源：langchain-intro.md ｜ 分类：tutorial
  块 2 来源：langchain-intro.md ｜ 分类：tutorial

========================================================================

🔍 按元数据过滤：

beginner 级文档：langchain-intro.md
打了 ai 标签的文档：langchain-intro.md

✅ 元数据是组织、过滤、溯源的基石。
```

**元数据的三大用途**：

1. **过滤** — 只搜某个分类/日期范围（"只查 2024 年后的产品文档"）
2. **溯源** — 回答时附上来源（"据《vector-db-guide.md》第 3 节……"）
3. **分类** — 按标签组织知识库

> 💡 很多 RAG 系统效果差，根因就是**元数据没设计好**——答出来了，
> 但用户不知道出处、无法验证。生产环境务必保留 `source`。

---

## 四、嵌入（Embeddings）：把"意思"变成数字

### 核心思想

**把文本映射成一串数字（向量）。语义相近的文本，向量也相近。**

于是"比较意思"就变成了"比较数字"——计算机就能算了。

```
"LangChain 让构建 AI 应用更简单"   → [0.12, -0.98, 0.34, ...]   ┐
                                                                 ├ 向量接近 → 意思接近
"LangChain 简化了 AI 应用开发"     → [0.11, -0.95, 0.36, ...]   ┘
"我喜欢晚餐吃披萨"                 → [-0.77, 0.21, -0.05, ...]  ← 离得远
```

### 示例 4：嵌入与相似度

```typescript
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
```

运行：

```bash
npx tsx 07-documents-embeddings-semantic-search/code/04-embeddings.ts
```

预期输出（**这是离线模式下的真实输出**）：

```
🔢 嵌入与相似度

【提示】未配置 AI_EMBEDDING_API_KEY，本次使用本地离线嵌入演示（仅字面相似度）。
       想看真正的语义检索效果，请在 .env 里配置支持 embedding 的服务商。

正在生成嵌入向量……

✅ 生成 4 个向量，每个 256 维
第一个向量的前 8 个数字： [ '0.000', '0.000', '0.243', '0.000', ... ]

========================================================================

📊 两两相似度（余弦相似度，越接近 1 越相似）：

LangChain 相关 vs LangChain 相关：0.4118
   「LangChain 让构建 AI 应用更简单」 vs 「LangChain 简化了 AI 应用开发」

LangChain vs 披萨：0.1252
   「LangChain 让构建 AI 应用更简单」 vs 「我喜欢晚餐吃披萨」

LangChain vs 天气：0.0000
   「LangChain 让构建 AI 应用更简单」 vs 「今天天气晴朗」

披萨 vs 天气：0.0716
   「我喜欢晚餐吃披萨」 vs 「今天天气晴朗」
```

**看那组数字**：语义相关的那对是 **0.4118**，无关的只有 **0.0000~0.1252**——
**分离度是清晰的**。这就是"能用数字衡量语义"的证据。

> ⚠️ **但请注意**：上面是**离线嵌入**（没配 embedding 服务时的自动降级）。
> 它靠"字面重合"打分，所以两个句子必须**有共同词**才能得高分。
> 配了真正的 embedding 模型（如 `bge-m3`）后，连"意思相近但用词完全不同"的句子
> 也能得高分——**那才是真正的语义检索**。

> 💡 **关于"降级"设计**：DeepSeek 等部分服务商不提供 embedding 接口。
> 为了不让你卡在半路，`lib/embeddings.ts` 检测到没有配置 embedding 密钥时，
> **自动切换到本地离线嵌入**——流程照跑，只是效果打折。
> 这是做教程时很值得学的一招：**永远给读者一条"能跑通"的路。**

---

## 五、向量库与语义搜索

**向量库 = 存向量 + 快速找出"最相似"的几条。**

### 示例 5：向量库 + 语义搜索

```typescript
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
```

运行：

```bash
npx tsx 07-documents-embeddings-semantic-search/code/05-vector-store.ts
```

预期输出（**离线模式下的真实输出**）：

```
📚 用 6 个文档建立向量库……

✅ 向量库建立完成

========================================================================

🔍 查询：「适合做 AI 的编程语言」（取前 2 条）

   1. Python 是数据科学与机器学习常用的编程语言。   [分类：编程]
   2. 猫是独立的宠物，喜欢打盹和抓老鼠。   [分类：动物]

🔍 查询：「需要运动量的宠物」（取前 2 条）

   1. 猫是独立的宠物，喜欢打盹和抓老鼠。   [分类：动物]
   2. Python 是数据科学与机器学习常用的编程语言。   [分类：编程]

🔍 查询：「搭建网站」（取前 2 条）

   1. JavaScript 广泛用于网站开发与构建交互式网页。   [分类：编程]
   2. 机器学习算法能从大规模数据中发现规律。   [分类：AI]
```

**请诚实地看这个结果**：

- 第 1、3 条查询的 **Top-1 是对的**（Python / JavaScript）
- 但第 2 条查询"需要运动量的宠物"，正确答案应该是**狗**，却返回了**猫**（离线嵌入没有"运动量"这个概念）
- 而且 Top-2 常混进明显无关的条目

**这不是代码 bug，而是离线嵌入的能力天花板。** 换成真正的 embedding 服务后：

```
🔍 查询：「需要运动量的宠物」

   1. 狗是忠诚的伙伴，喜欢玩接球和散步。   ← 正确！
   2. 猫是独立的宠物，喜欢打盹和抓老鼠。
```

> 📌 **这就是本章最值钱的一课**：**语义检索的质量，取决于嵌入模型的质量。**
> 离线词袋只能匹配字面，真正的嵌入模型才懂"运动量 ≈ 散步/玩接球"。
> 生产环境**别在这上面省钱**。

---

## 六、带分数的检索（阈值过滤）

生产系统不能"搜到什么就用什么"——要用**相似度分数**把明显无关的结果筛掉。

### 示例 6：看分数、做阈值判断

```typescript
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
```

运行：

```bash
npx tsx 07-documents-embeddings-semantic-search/code/06-similarity-scores.ts
```

预期输出（离线模式下的真实输出）：

```
🔍 查询：「适合公寓饲养的宠物」

1. 分数 0.2529  ✅ 匹配良好
   内容：猫是喜欢晒太阳的独立宠物。
2. 分数 0.1802  ⚠️  一般匹配
   内容：狗是热爱户外活动的忠诚伙伴。
3. 分数 0.1765  ⚠️  一般匹配
   内容：TypeScript 为 JavaScript 增加了静态类型。

🔍 查询：「用 AI 理解数据」

1. 分数 0.2840  ✅ 匹配良好
   内容：机器学习算法能在大数据中发现规律。
2. 分数 0.2236  ⚠️  一般匹配
   内容：Python 非常适合数据科学与机器学习。
3. 分数 0.0745  ❌ 匹配很弱
   内容：JavaScript 驱动交互式网页应用。
```

**注意那句最关键的提醒**（脚本自己打印的）：

> ⚠️ 不同嵌入模型的分数口径不同，**阈值务必用你自己的数据实测标定，不能照搬别人的数字。**

这句话非常重要：

- 用 `text-embedding-3`，0.7 可能算"一般"
- 用离线词袋，0.25 就已经是"很好"了
- **同一个数字在不同模型下含义完全不同**

所以示例里按 `embeddingMode()` **动态选择阈值**——这就是工程上该有的写法。

---

## 七、完整链路

把本章串起来，一个 RAG 的检索部分长这样：

```
原始文档（PDF / Markdown / 网页）
   ↓ 加载器        TextLoader / PDFLoader / CheerioWebBaseLoader…
Document[]（带 metadata）
   ↓ 切分          RecursiveCharacterTextSplitter
Document[]（小块，metadata 自动继承）
   ↓ 嵌入          embeddings.embedDocuments()
向量 + 原文档
   ↓ 存入           MemoryVectorStore / Chroma / Pinecone…
向量库
   ↓ 查询           store.similaritySearch(query, k)
最相关的 k 条  →  喂给模型生成答案（下一章！）
```

**下一章就是把这个链路接上 LLM，做出完整的 RAG。**

---

## 🎓 本章要点

- `Document = pageContent + metadata`，是一切处理的基本单位
- 切分（Chunking）解决"塞不下"和"不够准"，`chunkOverlap` 防止答案被腰斩
- **元数据在切分时会自动继承**，是做过滤和溯源的关键
- 嵌入把"意思"变成向量，**语义相近 → 向量相近**
- 向量库 = 存向量 + 快速找最相似的几条
- 检索质量**取决于嵌入模型质量**——离线词袋只能匹配字面
- 阈值要按**你自己的嵌入模型和数据**实测标定

---

## 🎮 动手练习

1. 把 `02-splitting.ts` 的 `chunkSize` 改成 100 和 500，对比块数与内容完整度
2. 给 `05-vector-store.ts` 加一条"关于猫的冷知识"文档，看它会不会被"宠物"类查询命中
3. 在 `06-similarity-scores.ts` 里加一行"低于阈值就打印『未找到相关内容』"，模拟生产环境的兜底
4. 配一个真正的 embedding 服务（如硅基流动 `BAAI/bge-m3`），重跑示例 5 和 6，
   **亲身对比离线嵌入与真实嵌入的差距**——这是本章最值得做的实验

---

---

## 📂 本章完整代码

学到哪一章想直接翻代码，可以点这两个入口（两处内容同步，选能打开的）：

- **GitHub**：https://github.com/cleversnail/lang-chain-js-cn/tree/main/07-documents-embeddings-semantic-search/code
- **Gitee**：https://gitee.com/snail_wn/lang-chain-js-cn/tree/main/07-documents-embeddings-semantic-search/code

章节说明在本页，可直接运行的 `.ts` 文件在上面这两个目录里。

---

## 🗺️ 导航

[← 上一章：MCP](/guide/mcp) ｜ [返回总目录](/) ｜ [下一章：Agentic RAG →](/guide/agentic-rag)

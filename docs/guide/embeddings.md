# 第 7 章 · 文档、嵌入与语义搜索

> 本章是 RAG 的地基。搞懂"文档 → 切分 → 向量 → 检索"这条链路，第 8 章的 Agentic RAG 就水到渠成。

## 🎯 本章目标

- 理解 `Document` 是什么（内容 + 元数据）
- 学会切分长文档（Chunking）与重叠（Overlap）
- 理解嵌入（Embeddings）和相似度
- 用向量库做语义搜索（Semantic Search）

**本章代码**

| 文件 | 内容 |
| --- | --- |
| `code/01-load-text.ts` | 加载文件 → Document |
| `code/02-splitting.ts` | 切分长文本 |
| `code/03-metadata.ts` | 元数据与过滤 |
| `code/04-embeddings.ts` | 嵌入与相似度 |
| `code/05-vector-store.ts` | 向量库 + 语义搜索 |
| `code/06-similarity-scores.ts` | 带分数的检索 |

---

## 一、Document：LangChain 的基本单位

一切文本处理都从 `Document` 开始：

```typescript
new Document({
  pageContent: "真正的文本内容",
  metadata: { source: "来源", category: "分类", date: "日期" },
})
```

- `pageContent` —— 文本本身
- `metadata` —— 附加信息（来源、分类、日期、标签……）

**元数据的价值**：过滤、溯源、分类。而且**切分时元数据会自动复制到每个子块**，来源信息不丢。

---

## 二、为什么要切分（Chunking）

两个原因：

1. **上下文窗口有限** —— 整本书塞不进模型
2. **检索需要精准** —— 一篇文章里只有一小段跟问题相关，整篇喂进去反而干扰

### 切多大？

| 块大小 | 优点 | 缺点 |
| --- | --- | --- |
| 小（200~500 字符） | 检索精准 | 上下文不足 |
| 大（1000~2000 字符） | 上下文充足 | 检索不精准 |

**经验值**：`chunkSize` 200~1000，`chunkOverlap` 取 `chunkSize` 的 **10%~20%**。

### 用什么切？

```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,
  chunkOverlap: 40,
});
const docs = await splitter.createDocuments([text]);
```

`RecursiveCharacterTextSplitter` 是**推荐默认值**：它会"递归地"尝试——先按段落切，不行再按句子，再不行按词——尽量保持语义完整。

### 为什么要 Overlap（重叠）

如果块与块之间毫无重叠，边界处的句子会被硬生生切断，上下文丢失。

`chunkOverlap` 让相邻块**共享一小段**，把边界处的语义接回来。

```
块1: [........................]
块2:                [........................]   ← 开头与块1结尾重叠
```

---

## 三、嵌入（Embeddings）：把"意思"变成数字

这是本章最核心的概念，也是最巧妙的一点。

**问题**：计算机怎么比较"两句话是不是一个意思"？它只会算数。

**解法**：把文本映射成一串数字（一个**向量**）——这就是**嵌入**。

```
"LangChain 让构建 AI 应用更简单"  →  [0.23, -0.41, 0.87, ...]  (1536 个数)
"LangChain 简化了 AI 应用开发"    →  [0.21, -0.39, 0.85, ...]  (很接近！)
"我喜欢晚餐吃披萨"                →  [-0.6, 0.12, -0.3, ...]   (差很远)
```

于是**"比较意思"就变成了"比较数字"**。常用余弦相似度衡量：

| 分数 | 含义 |
| --- | --- |
| ~1.0 | 几乎相同 |
| 0.8~0.9 | 非常相似 |
| 0.6~0.8 | 有些相关 |
| < 0.6 | 主题不同 |

```typescript
const embeddings = createEmbeddings();
const vectors = await embeddings.embedDocuments(texts);
const sim = cosineSimilarity(vectors[0], vectors[1]);
```

> ⚠️ **关于本电子书的嵌入**：`lib/embeddings.ts` 会判断你有没有配 `AI_EMBEDDING_API_KEY`。
> - 配了 → 用真正的 embedding 模型（能理解"番茄≈西红柿"）
> - 没配 → 自动降级为**本地离线嵌入**（只看字面重合），保证示例照样能跑
>
> 想看真正的语义效果，请配置一个支持 embedding 的服务商（如硅基流动的 `BAAI/bge-m3`）。

---

## 四、向量库与语义搜索

**向量库** = 存向量 + 快速找"最相似"的若干条。

本电子书用内存版 `MemoryVectorStore`（学习友好）。生产环境可换 Chroma / Pinecone / Qdrant 等。

```typescript
const store = await MemoryVectorStore.fromDocuments(docs, embeddings);

const results = await store.similaritySearch("需要运动量的宠物", 2);
// → [狗是忠诚的伙伴..., 猫是独立的宠物...]
```

**注意**：查询里没有出现"猫"或"狗"，但依然命中了——这就是**语义搜索**和关键词搜索的区别。

### 带分数检索

```typescript
const results = await store.similaritySearchWithScore(query, 3);
results.forEach(([doc, score]) => {
  console.log(score, doc.pageContent);   // score 越接近 1 越相似
});
```

生产系统常设一个**阈值**（如 `score > 0.7`）过滤掉不相关内容；若一条都不过阈值，就让智能体"如实说没查到"。

> ⚠️ **阈值口径取决于嵌入模型**：真正的 embedding 模型（`text-embedding-3`、`bge-m3`）分数分布较宽；
> 本地离线嵌入（词袋）分数整体偏低。所以 `06-similarity-scores.ts` 会**按当前模式选择阈值**，
> 并提示你：阈值必须用自己的数据实测标定，不能照搬别人的数字。

---

## 五、完整链路

```
文档 → 加载(Document) → 切分(Chunks) → 向量化(Embeddings) → 存入向量库
                                                                    ↓
用户查询 → 向量化 → 相似度检索 → 取出 Top-K 块 → 交给模型生成答案
```

第 8 章就是把这条链路的最后一环交给**智能体**来决定。

---

## 🎓 本章要点

- `Document` = `pageContent` + `metadata`；切分时元数据自动继承
- 切分：`chunkSize` 200~1000，`chunkOverlap` 取 10%~20%
- **嵌入**把语义变成向量，让"比意思"变成"比数字"
- 向量库支持**语义搜索**——不用出现关键词也能命中
- 用相似度**分数/阈值**过滤噪声

---

## 🎮 动手练习

1. 给 `data/` 里加一个你自己的 `.txt` 文件，用 `01-load-text.ts` 加载并查看元数据
2. 把 `02-splitting.ts` 的 `chunkSize` 改成 50 和 500，对比切出来的块数
3. 配一个真正的 embedding 服务，重跑 `04-embeddings.ts`，观察"披萨/天气"的相似度是否变得更低

---

## 🗺️ 导航

[← 上一章：MCP](/guide/mcp) ｜ [返回总目录](/) ｜ [下一章：Agentic RAG →](/guide/agentic-rag)

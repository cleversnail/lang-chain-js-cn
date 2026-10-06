# 第 8 章 · Agentic RAG

> 本章是全书收官：把前面所有知识点——工具（第 4 章）、智能体（第 5 章）、
> 文档与向量检索（第 7 章）——组合成一个真正有用的系统。

## 🎯 本章目标

- 理解传统 RAG 的局限
- 用"智能体 + 检索工具"实现 **Agentic RAG**
- 做出带记忆的多轮问答
- 掌握"何时用 RAG / 提示词工程 / 微调"的决策框架

**本章代码**

| 文件 | 内容 |
| --- | --- |
| `code/01-traditional-rag.ts` | 传统 RAG（每问必搜） |
| `code/02-agentic-rag.ts` | Agentic RAG（智能体决定是否检索） |
| `code/03-conversational-rag.ts` | 带记忆的多轮 RAG |
| `code/04-when-to-use-rag.ts` | 决策框架 |

知识库素材在 `data/docs/`，加载逻辑见 `lib/kb.ts`。

---

## 一、RAG 是什么（快速回顾）

**RAG = Retrieval（检索）+ Augmented（增强）+ Generation（生成）**

一句话：**回答前，先去你的知识库里查资料，再基于资料作答。**

```
查询 → 检索相关文档 → 拼成上下文 → 模型生成答案
```

好处：让模型用上**外部知识**——不用重新训练，回答更准、更新、还能**溯源**。

---

## 二、传统 RAG 的问题：每问必搜

传统 RAG 是一条固定链：

```typescript
const ragChain = await createRetrievalChain({ retriever, combineDocsChain });
const res = await ragChain.invoke({ input: question });
```

问题在于：**无论什么问题，它都先搜一遍。**

问"法国首都是哪"——它也要去你的知识库里翻一遍。检索浪费时间、浪费 API 调用，还可能因为检索到不相关的内容而**干扰**本来能直接答对的问题。

运行看看：

```bash
npx tsx 08-agentic-rag-systems/code/01-traditional-rag.ts
```

---

## 三、Agentic RAG：让智能体决定"要不要搜"

**改动只有一处**：把"检索"从固定步骤，变成一个**工具**。

```typescript
const retrievalTool = tool(
  async (input) => {
    const results = await store.similaritySearch(input.query, 3);
    return results.map((d) => `[${d.metadata.source}] ${d.pageContent}`).join("\n\n");
  },
  {
    name: "searchKnowledgeBase",
    description: "检索本项目知识库……当问题需要这些具体知识时才使用。",
    schema: z.object({ query: z.string() }),
  }
);

const agent = createAgent({ model, tools: [retrievalTool] });
```

于是行为变成**自主的**：

| 问题类型 | 智能体的决定 |
| --- | --- |
| "法国首都是哪" | 直接回答（不检索） |
| "LangChain.js 是什么" | 调用检索工具 |
| "MCP 是什么" | 调用检索工具 |

> 💡 **这就是"Agentic"的含义**：把"要不要检索、检索什么"的决定权交给智能体，
> 而不是写死在流程里。第 5 章的 `createAgent` 在这里完美复用。

运行：

```bash
npx tsx 08-agentic-rag-systems/code/02-agentic-rag.ts
```

---

## 四、带记忆的 RAG

把第 2 章的"记忆"接进来，就能听懂指代：

```
用户：什么是 RAG？
AI：（回答）

用户：它和传统关键词搜索有什么区别？     ← "它"指 RAG
AI：（正确理解）
```

关键动作：**每轮把历史一起发过去，并把本轮消息并入历史。**

```typescript
const history: BaseMessage[] = [];
history.push(new HumanMessage(q));
const res = await agent.invoke({ messages: [...history] });
history.push(...res.messages.slice(1));   // 把本轮完整消息并入历史
```

> ⚠️ 历史越长越贵。生产环境请配 `summarizationMiddleware`（见第 5 章）。

运行：

```bash
npx tsx 08-agentic-rag-systems/code/03-conversational-rag.ts
```

---

## 五、决策框架：RAG vs 提示词工程 vs 微调

三者不是"谁更强"，而是**针对不同问题**：

| 方案 | 适合 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **提示词工程** | 数据小且静态（< ~8K token） | 简单、快、便宜 | 不可扩展、难更新 |
| **RAG** | 大、可检索、更新频繁的知识库 | 可扩展、易更新、可溯源 | 需要向量库、有检索开销 |
| **微调** | 想改变模型的**行为/风格** | 能从根本上改变输出方式 | 贵、慢、难更新 |

### 决策四步

1. 信息能塞进提示词吗（< ~8000 token）？→ **能就用提示词工程**
2. 要"补充信息"还是"改变行为"？→ 补信息用 **RAG**，改行为用**微调**
3. 信息更新频繁吗？→ 频繁就一定用 **RAG**（易于更新）
4. 需要标注来源吗？→ 需要就用 **RAG**（能追踪来源）

> 🎯 关键区分：**RAG 是"加事实"，微调是"改行为"。**
> "让模型知道公司最新政策" → RAG；"让模型总用公司的代码风格写代码" → 微调。

运行：

```bash
npx tsx 08-agentic-rag-systems/code/04-when-to-use-rag.ts
```

---

## 六、恭喜你，走完了全程

回头看看这条学习路径：

```
模型调用(1) → 多轮/流式/参数(2) → 提示词与结构化输出(3)
         → 工具(4) → 智能体(5) → MCP 外部工具(6)
         → 文档/嵌入/语义检索(7) → Agentic RAG(8)
```

你现在已经掌握了用 LangChain.js 构建**生产级 AI 应用**所需的核心能力。

**下一步建议**：

- 把 `lib/embeddings.ts` 换成真正的 embedding 服务，体验真实语义检索
- 把 `MemoryVectorStore` 换成 Chroma / Pinecone，做持久化
- 给你的 RAG 加上 `mmr` 检索、多查询、重排序等进阶策略
- 参考官方文档：https://docs.langchain.com/oss/javascript/langchain/overview

---

## 🎓 本章要点

- RAG = 检索 + 生成，让模型用上外部知识
- 传统 RAG **每问必搜**，浪费且可能干扰
- **Agentic RAG** 把检索变成工具，由智能体自主决定
- 加"记忆"即可支持多轮追问（注意控制历史长度）
- **RAG 加事实，微调改行为**——选型的第一原则

---

## 🎮 动手练习

1. 给 `02-agentic-rag.ts` 再加一个工具（比如"计算器"或"当前时间"），让它既能查知识库、又能算数
2. 修改检索工具的 `k`（返回条数），观察 k=1 和 k=5 对答案的影响
3. 在 `03-conversational-rag.ts` 里加一个 `summarizationMiddleware`，支持超长对话

---

## 🗺️ 导航

[← 上一章：文档、嵌入与语义搜索](/guide/embeddings) ｜ [返回总目录](/)

# 第 8 章 · Agentic RAG 系统

> 恭喜你走到最后一章。这一章把前面所有东西**串成一个完整系统**：
> 文档处理（第 7 章）+ 工具（第 4 章）+ 智能体（第 5 章）+ 记忆（第 2 章）= Agentic RAG。

## 🎯 本章目标

- 理解 RAG 是什么、为什么它是最有价值的 AI 应用形态
- 看清**传统 RAG 的缺陷**：每问必搜
- 用 **Agentic RAG** 让智能体自己决定要不要检索
- 做出**带记忆的 RAG**（能听懂"它呢？""再详细说说"）
- 掌握 RAG / 提示词工程 / 微调 的**决策框架**

**本章代码**

> 📌 **代码约定**：正文的代码块都尽量保持**可直接运行**（含 import 与模型初始化）。若某段为聚焦概念的**节选**，会明确标注「节选」并指向同名的 `code/` 完整文件。

| 文件 | 内容 |
| --- | --- |
| `code/01-traditional-rag.ts` | 传统 RAG：每问必搜 |
| `code/02-agentic-rag.ts` | Agentic RAG：智能体决定要不要搜 |
| `code/03-conversational-rag.ts` | 带记忆的 RAG |
| `code/04-when-to-use-rag.ts` | 决策框架：RAG vs 提示词 vs 微调 |

> ⚠️ 本章的知识库用**离线嵌入**建立（未配 embedding 服务时的自动降级），
> 所以检索质量有限。但**本章的重点是"架构模式"而不是"检索精度"**，
> 你完全能看清传统 RAG 与 Agentic RAG 的结构差异。

---

## 一、RAG 是什么（快速回顾）

**RAG = Retrieval（检索）+ Augmented（增强）+ Generation（生成）**

不训练模型，而是**在回答前先查资料**，把查到的内容塞进提示词：

```
用户提问
   ↓
检索相关文档（第 7 章的向量库）
   ↓
把「文档 + 问题」一起交给模型
   ↓
基于资料生成答案（还能标注来源）
```

**为什么它是最有价值的 AI 应用形态**：

- 模型可以回答**它训练时没见过**的知识（你公司内部的文档、最新的产品手册）
- **不用重新训练**，改文档就改了"知识"——更新成本极低
- **可溯源**——能告诉用户答案来自哪份文件

---

## 二、传统 RAG 的问题：每问必搜

### 示例 1：传统 RAG

传统 RAG 是一条**固定**的链：`查询 → 一定去检索 → 生成`。

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
import type { Document } from "@langchain/core/documents";
import { createModel } from "../../lib/model.js";
import { buildVectorStore } from "../../lib/kb.js";

async function main() {
  console.log("📖 传统 RAG（每问必搜）\n");

  const { store, chunkCount } = await buildVectorStore();
  console.log(`📚 知识库就绪（${chunkCount} 个文本块）\n`);

  const retriever = store.asRetriever({ k: 2 });

  const prompt = ChatPromptTemplate.fromTemplate(
    "请根据下面的资料回答问题：\n\n{context}\n\n问题：{input}\n\n答案："
  );

  const combineDocsChain = await createStuffDocumentsChain({
    llm: createModel(),
    prompt,
  });

  const ragChain = await createRetrievalChain({
    retriever,
    combineDocsChain,
  });

  console.log("💡 观察：每条问题都会触发一次检索（哪怕它根本不需要）：\n");

  const questions = [
    "法国的首都是哪里？",              // 常识，本不需要检索
    "LangChain.js 是什么？",           // 需要检索
    "什么是 RAG？",                    // 需要检索
  ];

  for (const q of questions) {
    console.log("=".repeat(72));
    console.log(`\n❓ ${q}\n`);
    console.log("   🔍 传统 RAG：无条件检索中……");
    const res = await ragChain.invoke({ input: q });
    console.log(`🤖 ${res.answer}`);
    console.log(`\n📄 检索了 ${res.context.length} 个文档块：`);
    (res.context as Document[]).forEach((d, i) => console.log(`   ${i + 1}. ${d.metadata.source}`));
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n💡 传统 RAG 的特点：");
  console.log("   • 结构简单、行为可预测");
  console.log("   • 但对常识问题也强行走一遍检索，浪费 API 调用与时间");
  console.log("   → 看看示例 2 的 Agentic RAG 怎么改进");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 08-agentic-rag-systems/code/01-traditional-rag.ts
```

预期输出（节选）：

```
📚 知识库就绪（6 个文本块）

💡 观察：每条问题都会触发一次检索（哪怕它根本不需要）：

========================================================================

❓ 法国的首都是哪里？

   🔍 传统 RAG：无条件检索中……
🤖 巴黎

📄 检索了 2 个文档块：
   1. mcp.md        ← 跟法国首都毫无关系！
   2. agents.md     ← 也毫无关系！

========================================================================

❓ LangChain.js 是什么？

   🔍 传统 RAG：无条件检索中……
🤖 LangChain.js 是 2023 年发布的，Python 版 LangChain 的 JavaScript / TypeScript
移植版本。它让前端与 Node.js 开发者可以用熟悉的 Web 技术栈来构建大模型应用。……

📄 检索了 2 个文档块：
   1. rag-explained.md
   2. langchain-intro.md
```

**看第一问的检索结果**：问"法国首都"，它老老实实检索回来两个文档块——
`mcp.md` 和 `agents.md`，**跟法国首都毫无关系**。

这就是传统 RAG 的毛病：**它不知道该不该搜，所以一律都搜。**

- 浪费一次嵌入计算 + 一次向量检索（都是钱）
- 白白拉长提示词（token 又多花一笔）
- 最糟的是：**无关的检索结果可能干扰模型**，让答案变差

---

## 三、Agentic RAG：让智能体决定"要不要搜"

**改动只有一处**：把"检索"从固定流程**变成一个工具**，是否使用交给智能体自己判断。

```
传统 RAG                           Agentic RAG
─────────                          ───────────
查询 → [检索] → 生成               查询 → [智能体判断]
       ↑ 必走                              ├─ 常识问题  → 直接回答
                                          └─ 知识问题  → 调用检索工具 → 生成
```

### 示例 2：Agentic RAG

```typescript
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";
import { buildVectorStore } from "../../lib/kb.js";

async function main() {
  console.log("🤖 Agentic RAG\n");

  const { store, chunkCount } = await buildVectorStore();
  console.log(`📚 知识库就绪（${chunkCount} 个文本块）\n`);

  // 把"检索"包装成一个工具，交给智能体决策
  const retrievalTool = tool(
    async (input) => {
      console.log(`   🔍 智能体决定检索：${input.query}`);
      const results = await store.similaritySearch(input.query, 3);
      return results.map((d) => `[${d.metadata.source}] ${d.pageContent}`).join("\n\n");
    },
    {
      name: "searchKnowledgeBase",
      description:
        "检索本项目知识库，获取关于 LangChain.js、RAG、向量存储、智能体、MCP 的事实性资料。当问题需要这些具体知识时才使用。",
      schema: z.object({ query: z.string().describe("检索关键词") }),
    }
  );

  const agent = createAgent({
    model: createModel(),
    tools: [retrievalTool],
  });

  const questions = [
    "法国的首都是哪里？",                 // 常识 → 应该直接回答
    "LangChain.js 是什么？",              // 知识库 → 应触发检索
    "MCP 是什么？",                       // 知识库 → 应触发检索
  ];

  for (const q of questions) {
    console.log("=".repeat(72));
    console.log(`\n❓ ${q}\n`);
    const res = await agent.invoke({ messages: [new HumanMessage(q)] });
    console.log(`🤖 ${res.messages[res.messages.length - 1].content}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n💡 Agentic RAG 的好处：");
  console.log("   ✓ 只在必要时检索 → 更省钱");
  console.log("   ✓ 常识问题响应更快");
  console.log("   ✓ 可扩展到多个检索源 / 多个工具");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 08-agentic-rag-systems/code/02-agentic-rag.ts
```

预期输出（节选）：

```
========================================================================

❓ 法国的首都是哪里？

🤖 法国的首都是**巴黎**（Paris）。

巴黎位于法国北部的塞纳河畔，是法国最大的城市，也是全国的政治、经济、文化
和交通中心。……
（注意：这里**没有任何「🔍 智能体决定检索」的日志**——它判断这题不用查资料）

========================================================================

❓ LangChain.js 是什么？

   🔍 智能体决定检索：LangChain.js 是什么 概述      ← 这里触发了检索！
🤖 **LangChain.js 是什么**

LangChain.js 于 **2023 年发布**，是 Python 版 LangChain 的 JavaScript /
TypeScript 移植版本。……

========================================================================

❓ MCP 是什么？

   🔍 智能体决定检索：MCP 是什么
🤖 ……（基于知识库回答）
```

**对比一下两章的输出差异**：

| | 传统 RAG | Agentic RAG |
| --- | --- | --- |
| "法国首都" | 🔍 无条件检索（查到无关文档） | ✅ 直接回答，**零检索** |
| "LangChain.js 是什么" | 🔍 检索 | 🔍 检索（该查就查） |
| 成本 | 每问一次检索 | 只在必要时检索 |

**这就是 Agentic 的含义**：不是"套一个固定流程"，而是**让模型自己拿主意。**

> 💡 这个模式还能自然扩展：再加一个"查数据库"的工具、一个"查工单系统"的工具——
> 智能体会在它们之间自动选择。这就是**企业级 AI 中台**的雏形。

---

## 四、带记忆的 RAG

真实用户不会每次都把话说完整，他们会说："**它**和传统关键词搜索有什么区别？"、
"**那** Agentic RAG 呢？"

要听懂这些**指代**，就必须带对话历史。

### 示例 3：带记忆的 RAG

```typescript
import { createAgent, HumanMessage, tool, type BaseMessage } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";
import { buildVectorStore } from "../../lib/kb.js";

async function main() {
  console.log("💬 带记忆的 RAG\n");

  const { store } = await buildVectorStore();
  console.log("📚 知识库就绪\n");

  const retrievalTool = tool(
    async (input) => {
      const results = await store.similaritySearch(input.query, 3);
      return results.map((d) => `[${d.metadata.source}] ${d.pageContent}`).join("\n\n");
    },
    {
      name: "searchKnowledgeBase",
      description: "检索知识库获取 LangChain.js / RAG / MCP / 向量存储相关资料",
      schema: z.object({ query: z.string() }),
    }
  );

  const agent = createAgent({ model: createModel(), tools: [retrievalTool] });

  const history: BaseMessage[] = [];
  const turns = [
    "什么是 RAG？",
    "它和传统关键词搜索有什么区别？",   // "它" 指代 RAG
    "那 Agentic RAG 呢？",              // 承接上文
  ];

  for (const q of turns) {
    console.log("=".repeat(72));
    console.log(`\n👤 用户：${q}\n`);
    history.push(new HumanMessage(q));

    const res = await agent.invoke({ messages: [...history] });
    const last = res.messages[res.messages.length - 1];
    console.log(`🤖 ${last.content}`);

    // 关键的"记忆"动作：把本轮完整消息并入历史
    history.push(...res.messages.slice(1));
  }

  console.log("\n" + "=".repeat(72));
  console.log(`\n✅ 三轮对话结束，历史共 ${history.length} 条消息。`);
  console.log("💡 因为携带了历史，智能体能正确理解「它」「那……呢」这类指代。");
  console.log("⚠️  历史越长越贵，生产环境记得配 summarizationMiddleware（第 5 章）。");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 08-agentic-rag-systems/code/03-conversational-rag.ts
```

预期输出（节选）：

```
👤 用户：什么是 RAG？

🤖 **RAG（Retrieval Augmented Generation，检索增强生成）** 是把「文档检索」与
「大模型生成」结合起来的一种技术方案。……
参考来源：知识库中的 rag-explained.md、vector-store.md。

========================================================================

👤 用户：它和传统关键词搜索有什么区别？

🤖 ## 先澄清一点范围

严格来说，**RAG 和关键词搜索不是同一层的东西**，直接对比会有点错位：

- **关键词搜索**是一种检索方式；
- **RAG** 是「检索 + 生成」的整体流程……

知识库里对这一点只有一句直接表述：
> 与关键词搜索不同，语义搜索理解的是"意思"而不是"字面"。—— vector-store.md

具体展开一下（**这部分是我基于这一条的补充说明，不是知识库原文**）：……
```

第三段回答里的那句话**特别值得注意**：

> **这部分是我基于这一条的补充说明，不是知识库原文**

模型主动**区分了"知识库里有依据的"和"我自己补充的"**。这是可溯源 RAG 的高级表现——
**它没有把推测伪装成事实**。

> 💡 想让模型更稳定地这样做，可以在系统提示词里明确要求：
> "回答时标注每条信息的来源；知识库未覆盖的部分要明确说明是你的补充。"

> ⚠️ 历史会越滚越长（最后 3 轮结束后已有十几条消息）。
> 生产环境一定要配 `summarizationMiddleware`（第 5 章），否则 token 成本会失控。

---

## 五、决策框架：RAG vs 提示词工程 vs 微调

学到这儿，你手里有三种武器。**知道什么时候用哪个，比会用更重要。**

### 示例 4：三种场景实演

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";
import { buildVectorStore } from "../../lib/kb.js";

async function scenario1_promptEngineering() {
  console.log("📋 场景 1：小型 FAQ（用提示词工程就够了）");
  console.log("-".repeat(72));
  console.log("数据量小、几乎不变 → 直接塞进提示词即可，无需检索\n");

  const faq = `
产品 FAQ：
Q: 退货政策？ A: 30 天无理由退款。
Q: 多久发货？ A: 标准 2-3 个工作日，加急 1 天。
Q: 有质保吗？  A: 有，整机 1 年质保。
`;

  const chain = ChatPromptTemplate.fromMessages([
    ["system", "你是客服助手，依据以下 FAQ 回答：\n\n{context}"],
    ["human", "{question}"],
  ]).pipe(createModel());

  const q = "你们的退货政策是什么？";
  console.log(`❓ ${q}`);
  const res = await chain.invoke({ context: faq, question: q });
  console.log(`🤖 ${res.content}\n`);
  console.log("💡 为什么用提示词工程：数据小、全都在提示词里、无需检索、快且便宜。\n");
}

async function scenario2_rag() {
  console.log("=".repeat(72));
  console.log("\n📚 场景 2：大知识库（必须用 RAG）");
  console.log("-".repeat(72));
  console.log("数据量大、装不进提示词、且更新频繁 → 检索 + 生成\n");

  const { store, chunkCount } = await buildVectorStore();
  const retrievalTool = tool(
    async (input) => {
      const r = await store.similaritySearch(input.query, 3);
      return r.map((d) => `[${d.metadata.source}] ${d.pageContent}`).join("\n\n");
    },
    {
      name: "searchKnowledgeBase",
      description: "检索知识库",
      schema: z.object({ query: z.string() }),
    }
  );
  const agent = createAgent({ model: createModel(), tools: [retrievalTool] });

  const q = "RAG 是怎么工作的？";
  console.log(`❓ ${q}（知识库 ${chunkCount} 块）`);
  const res = await agent.invoke({ messages: [new HumanMessage(q)] });
  console.log(`🤖 ${res.messages[res.messages.length - 1].content}\n`);
  console.log("💡 为什么用 RAG：可扩展、易更新、可溯源、只检索相关内容。\n");
}

async function framework() {
  console.log("=".repeat(72));
  console.log("\n🎓 决策框架\n");
  console.log("第 1 步：信息能塞进提示词吗（< 约 8000 token）？");
  console.log("   ✅ 能   → 用【提示词工程】");
  console.log("   ❌ 不能 → 进入第 2 步\n");
  console.log("第 2 步：你要「补充信息」还是「改变行为」？");
  console.log("   📚 补信息 → 用【RAG】");
  console.log("   🎨 改行为 → 用【微调 Fine-tuning】\n");
  console.log("第 3 步：信息更新频繁吗？");
  console.log("   ✅ 是 → 一定用 RAG（易于更新）");
  console.log("   ❌ 否 → 都行，但 RAG 更便宜\n");
  console.log("第 4 步：需要标注来源吗？");
  console.log("   ✅ 需要 → 用 RAG（能追踪来源文档）");
  console.log("\n" + "=".repeat(72));
  console.log("\n📋 三者速查：");
  console.log("   提示词工程：小、静态数据      → 简单、快、便宜");
  console.log("   RAG：大、可检索知识库         → 可扩展、可更新、可溯源");
  console.log("   微调：改变模型行为/风格       → 效果强，但贵、慢、难更新");
}

async function main() {
  console.log("🎯 什么时候该用 RAG？\n");
  console.log("=".repeat(72) + "\n");
  await scenario1_promptEngineering();
  await scenario2_rag();
  await framework();
}

main().catch(console.error);
```

运行：

```bash
npx tsx 08-agentic-rag-systems/code/04-when-to-use-rag.ts
```

预期输出（节选）：

```
📋 场景 1：小型 FAQ（用提示词工程就够了）
------------------------------------------------------------------------
数据量小、几乎不变 → 直接塞进提示词即可，无需检索

❓ 你们的退货政策是什么？
🤖 我们的退货政策是：**30 天无理由退款**。

💡 为什么用提示词工程：数据小、全都在提示词里、无需检索、快且便宜。

========================================================================

📚 场景 2：大知识库（必须用 RAG）
------------------------------------------------------------------------
❓ RAG 是怎么工作的？（知识库 6 块）
🤖 根据知识库里的材料，我整理如下。

## 一句话定义
RAG（Retrieval Augmented Generation，检索增强生成）把文档检索和大模型生成
结合起来……（来源：rag-explained.md）
……

========================================================================

🎓 决策框架

第 1 步：信息能塞进提示词吗（< 约 8000 token）？
   ✅ 能   → 用【提示词工程】
   ❌ 不能 → 进入第 2 步
……
```

### 决策流程图

```
信息能塞进提示词吗（< ~8000 token）？
   │
   ├─ 能 ──→ 【提示词工程】 简单、快、便宜
   │
   └─ 不能 ─→ 你要的是「补充信息」还是「改变行为」？
                 │
                 ├─ 补信息 ──→ 【RAG】 可扩展、可更新、可溯源
                 │              ↑
                 │        信息更新频繁？→ RAG 几乎是唯一选择
                 │        需要标注来源？→ RAG 天然支持
                 │
                 └─ 改行为 ──→ 【微调】
                               效果强，但贵、慢、难更新
                               （且权重一改，就得重新训练）
```

### 三者对比表

| | 提示词工程 | RAG | 微调 |
| --- | --- | --- | --- |
| 适用数据量 | 小（能塞进提示词） | 大、可检索 | — |
| 更新成本 | 改文字即可 | **改文档即可** | 要重新训练 |
| 可溯源 | ❌ | ✅ | ❌ |
| 成本 | 极低 | 中 | 高 |
| 上线速度 | 分钟级 | 天级 | 周级 |
| 能改变模型行为/风格 | 弱 | ❌ | ✅ **强** |

> 💡 **一句话经验**：90% 的企业场景，答案是 **RAG**。
> 只有当你要"改变模型的说话方式/输出风格"，或者"知识是内隐的、难以写成文档"时，
> 才考虑微调。而且**微调和 RAG 不冲突**——很多团队两个都用。

---

## 六、恭喜你，走完了全程

回头看一遍你走过的路：

| 章 | 你学到了 | 它是 RAG 的哪一块 |
| --- | --- | --- |
| 0 | 环境、Provider 抽象 | 地基 |
| 1 | 第一次调用、消息类型 | 地基 |
| 2 | 多轮对话、流式、参数、token | **记忆** |
| 3 | 提示词模板、结构化输出 | **提示词** |
| 4 | 工具、函数调用 | **工具** |
| 5 | 智能体、中间件 | **Agent** |
| 6 | MCP | **工具生态** |
| 7 | 文档、切分、嵌入、向量库 | **检索** |
| 8 | 传统 RAG → Agentic RAG | **把它们拼成系统** |

**你已经掌握了当前 AI 应用开发的核心技能栈。** 接下来最有价值的三件事：

1. **换一个真正的 embedding 服务**，回第 7 章重跑示例 5、6，亲眼看看语义检索的威力
2. **把知识库换成你自己的文档**（把 `data/docs/` 里的 md 换成你的资料）
3. **加一个 Web 界面**，把它变成一个能用的产品

---

## 🎓 本章要点

- RAG = 检索 + 生成，**不用训练模型就能让它懂你的知识**
- 传统 RAG 的毛病是**每问必搜**（浪费钱、还可能被无关结果干扰）
- **Agentic RAG**：把检索变成工具，让智能体自己决定要不要搜
- **带记忆的 RAG** 才能听懂"它""那……呢"这类指代
- 好的 RAG 会**区分"有依据的"和"我补充的"**——不把推测伪装成事实
- 决策框架：能塞进提示词 → 提示词工程；要补信息 → RAG；要改行为 → 微调
- 三者不互斥，生产系统常常组合使用

---

## 🎮 动手练习

1. 给 `02-agentic-rag.ts` 加第二个工具（比如"查当前时间"），问一个需要**同时用两个工具**的问题
2. 把 `03-conversational-rag.ts` 升级：加上 `summarizationMiddleware`，让长对话也不怕 token 爆炸
3. 修改 `02-agentic-rag.ts` 里检索工具的 `description`，观察智能体的调用行为如何变化
   （试试把描述写得很含糊，看它会不会该查的时候不查）
4. **综合练习**：把 `data/docs/` 里的文档换成你自己的领域资料（比如你的产品手册），
   搭一个能回答你领域问题的 RAG——这就是一个可以拿去用的真实项目了

---

## 🗺️ 导航

[← 上一章：文档、嵌入与语义搜索](../07-documents-embeddings-semantic-search/README.md) ｜ [返回总目录](../README.md) ｜ [回到术语表](../GLOSSARY.md)

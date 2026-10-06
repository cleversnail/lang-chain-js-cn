# 术语表（Glossary）

本电子书中出现的核心术语速查。

---

## A

**Agent（智能体）**
能对问题推理、自主决定采取什么行动、并迭代逼近答案的 AI 系统。与"链"沿固定路径执行不同，智能体会动态选择工具。遵循 ReAct 模式（推理 + 行动）。见 [第 5 章](./05-agents/README.md)。

**Agent Loop（智能体循环）**
智能体反复"思考 → 行动 → 观察"直到解决问题的迭代过程。

**AIMessage**
代表模型回复的消息类型。多轮对话中通常会被加回历史。

---

## C

**Chain（链）**
把若干步骤按固定顺序串起来的流程，前一步输出即后一步输入。用 LCEL（`|` 管道）构建。与智能体的区别是**路径固定**。

**Chunk / Chunking（切分）**
把长文档拆成更小块的过程。小块检索更精准，大块上下文更足。见 [第 7 章](./07-documents-embeddings-semantic-search/README.md)。

**Chunk Overlap（块重叠）**
相邻块之间共享的字符数，用来保住边界处的上下文。推荐取 chunkSize 的 10%~20%。

**Context Window（上下文窗口）**
模型单次请求能处理的最大 token 数（含输入 + 输出）。超出就需要裁剪或总结历史。

**Cosine Similarity（余弦相似度）**
衡量两个向量（嵌入）相似程度的指标，取值约 0~1，越接近 1 越相似。

---

## D

**Document（文档）**
LangChain 处理文本的基本单位，由 `pageContent`（文本）与 `metadata`（元数据）组成。

**Document Loader（文档加载器）**
把各种格式（txt / pdf / 网页 / csv……）读成 `Document` 的组件。

---

## E

**Embedding（嵌入）**
把文本映射成数值向量，使语义相近的文本在向量空间中彼此靠近。"比意思"由此变成"比数字"。

**Embedding Model（嵌入模型）**
把文本转成向量的模型，如 `text-embedding-3-small`、`BAAI/bge-m3`。

---

## F

**Few-Shot Prompting（少样本提示）**
在提示词里给 2~5 个示例，让模型照着模仿，比只写规则更可靠。

**Function Calling（函数调用）**
模型生成"调用某函数 + 参数"的结构化请求的能力。**模型只描述，不执行**；执行由你的代码完成。

---

## H

**HumanMessage**
代表用户输入的消息类型。

---

## L

**LCEL（LangChain 表达式语言）**
用 `|` 管道把组件串成链的语法，例如 `prompt | model | parser`。

**LLM（大语言模型）**
在海量文本上训练、能理解与生成自然语言的模型。

---

## M

**maxTokens**
限制回复长度的参数，用来控制成本与篇幅。

**MCP（Model Context Protocol，模型上下文协议）**
让 AI 应用通过统一接口连接外部工具与数据源的开放标准，常被比作"AI 世界的 USB-C"。见 [第 6 章](./06-mcp/README.md)。

**MCP Server**
按 MCP 协议暴露工具/能力的程序（如文件系统、数据库、文档服务）。

**Memory（记忆）**
让应用"记住"之前交互的能力。实现方式就是每次把对话历史一起发过去——模型本身是无状态的。

**Metadata（元数据）**
附加在文档上的信息（来源、分类、日期……），用于过滤、分类、溯源。切分时会自动复制到每个子块。

**Middleware（中间件）**
在模型调用/工具调用前后插入逻辑的机制，用于日志、成本优化、错误兜底、注入上下文等。

**MMR（最大边际相关）**
一种检索策略，在"相关性"与"多样性"之间平衡，避免返回一堆近乎重复的结果。

---

## O

**Output Parser（输出解析器）**
把模型原始输出转成结构化数据的组件。LangChain v1 更推荐直接用 `withStructuredOutput`。

---

## P

**Prompt（提示词）**
你给模型的指令、问题或上下文。

**Prompt Template（提示词模板）**
带占位符（变量）的可复用提示词结构。使提示词可测试、可维护，并降低提示词注入风险。

**Provider（服务商）**
提供 LLM 接口的公司（OpenAI、Anthropic、DeepSeek、Azure、硅基流动……）。LangChain 用统一接口适配它们。

---

## R

**RAG（检索增强生成）**
先检索相关文档，再把它们作为上下文交给模型生成答案，让模型用上外部知识。

**Rate Limit（限流）**
服务商对单位时间内请求数/ token 数的限制，超限返回 429。用 `withRetry()` 自动退避重试。

**ReAct**
"Reasoning + Acting"的推理模式：思考 → 行动 → 观察 → 重复 → 回答。

**Retriever（检索器）**
在向量库中按查询返回最相关文档的组件，屏蔽底层检索策略差异。

---

## S

**Semantic Search（语义搜索）**
按"意思"而非"字面关键词"检索。用嵌入实现。

**Streaming（流式输出）**
逐块返回生成内容而非等全部生成完，显著改善"感知速度"。

**SystemMessage**
设定模型身份、语气与行为准则的消息类型。

---

## T

**Temperature（温度）**
控制随机性的参数。0 最确定，越高越发散有创意。注意不同模型支持范围不同。

**Token（词元）**
模型处理文本的最小单位。粗略换算：1 token ≈ 4 字符 ≈ ¾ 个英文单词。既影响成本也影响速度。

**Tool（工具）**
模型可调用的函数，用于执行计算、查库、调 API 等，扩展模型能力边界。

**ToolMessage**
承载工具执行结果的消息类型，回传给模型让它组织最终答案。

**Text Splitter（文本切分器）**
把长文档拆成小块的组件。推荐 `RecursiveCharacterTextSplitter`。

---

## V

**Vector（向量）**
一串数字（如 1536 维），表示文本的语义。使文本相似度可以用数学计算。

**Vector Store（向量库）**
专门存储与检索向量的数据库，支持快速相似度搜索。如 `MemoryVectorStore`、Chroma、Pinecone、Qdrant。

---

## Z

**Zod**
TypeScript 优先的 schema 校验库。在 LangChain.js 中用于定义工具参数和结构化输出的形状，同时提供编译期类型与运行期校验。

**withStructuredOutput**
让模型直接返回符合 Zod schema 的对象的方法，避免手工解析 JSON。不同服务商支持的模式不同（`jsonSchema` / `functionCalling` / `jsonMode`），兼容性最好的是 `functionCalling`。

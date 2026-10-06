# 第 0 章 · 环境准备

> 本章不需要写代码，只要把环境跑通，后面 8 章就都能顺利运行。

## 一、你需要什么

- **Node.js ≥ 20**（本电子书在 Node 24 上实测通过）
- **npm 或 pnpm**（任选）
- 一个**兼容 OpenAI 接口**的大模型服务商账号（见下文）
- 一个能写代码的编辑器（VS Code 推荐）

检查版本：

```bash
node -v   # 期望 v20 以上
npm -v
```

## 二、安装依赖

在电子书根目录（本文件所在目录的上一级）执行：

```bash
npm install
# 或者
pnpm install
```

这会装好全书所有章节需要的依赖，包括：

| 包 | 作用 |
| --- | --- |
| `langchain` | v1 主包，导出 `createAgent`、`tool`、各类消息等 |
| `@langchain/core` | 核心抽象（消息、Runnable、文档、Embeddings） |
| `@langchain/openai` | OpenAI 兼容的对话模型 / 嵌入模型 |
| `@langchain/classic` | 传统组件（文档加载器、`MemoryVectorStore`、旧式链） |
| `@langchain/textsplitters` | 文本切分器 |
| `@langchain/mcp-adapters` | 连接 MCP 服务器（第 6 章） |
| `zod` | 定义工具参数与结构化输出的 schema |
| `mathjs` | 安全地计算数学表达式（工具示例用） |
| `dotenv` | 读取 `.env` |
| `tsx` / `typescript` | 直接运行 `.ts` 文件、类型检查 |

## 三、配置模型（关键步骤）

复制环境变量模板：

```bash
cp .env.example .env
```

然后打开 `.env`，填入你的服务商信息：

```bash
# 对话模型（必填）
AI_API_KEY=你的密钥
AI_ENDPOINT=https://api.deepseek.com/v1      # 换成你的服务商地址
AI_MODEL=deepseek-chat                        # 换成你的模型名

# 嵌入模型（第 7、8 章才需要）
AI_EMBEDDING_API_KEY=
AI_EMBEDDING_MODEL=BAAI/bge-m3
```

> **为什么只要"兼容 OpenAI 接口"就行？**
> 因为全书统一用 `ChatOpenAI` 这个客户端，它只要求服务商提供
> `POST {AI_ENDPOINT}/chat/completions` 这样的标准接口。
> 换服务商时，你**只改 `.env`，不动任何一行代码**——这正是 LangChain 抽象层要解决的问题。

### 常见服务商填法

| 服务商 | AI_ENDPOINT | AI_MODEL 示例 |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` |
| 阿里 DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 月之暗面 Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| Azure OpenAI | `https://<资源名>.openai.azure.com/openai/v1` | 你的部署名 |

> ⚠️ **关于嵌入模型**：DeepSeek 等部分服务商**不提供** embedding 接口。
> 为了让你不被卡住，第 7、8 章的代码会在没有 embedding 密钥时
> **自动降级为本地离线嵌入**，流程照样跑通（只是语义效果有限）。
> 想体验真正的语义检索，请配一个支持 embedding 的服务商（如硅基流动的 `BAAI/bge-m3`）。

## 四、运行任意一章的代码

用 `tsx` 直接跑 TypeScript，无需编译：

```bash
npx tsx 01-introduction/code/01-hello-world.ts
```

或者用 npm 脚本：

```bash
npm start 01-introduction/code/01-hello-world.ts
```

## 五、类型检查（可选但推荐）

想知道自己改的代码有没有类型错误：

```bash
npm run typecheck     # 等价于 tsc --noEmit
```

## 六、目录结构

```
langChain/
├── README.md                 # 总目录与阅读指南
├── 00-course-setup/          # 本章：环境准备
├── 01-introduction/          # 第 1 章：入门
├── 02-chat-models/           # 第 2 章：对话模型与基础交互
├── 03-prompts-messages-outputs/  # 第 3 章：提示词、消息与结构化输出
├── 04-function-calling-tools/    # 第 4 章：函数调用与工具
├── 05-agents/                # 第 5 章：智能体
├── 06-mcp/                   # 第 6 章：模型上下文协议 MCP
├── 07-documents-embeddings-semantic-search/  # 第 7 章：文档、嵌入与语义搜索
├── 08-agentic-rag-systems/   # 第 8 章：Agentic RAG
├── lib/                      # 全书共用的工具（配置、模型工厂、嵌入工厂）
├── data/                     # 示例数据（文本、文档知识库）
└── .env.example              # 环境变量模板
```

---

**下一步**：[第 1 章 · LangChain.js 入门 →](/guide/introduction)

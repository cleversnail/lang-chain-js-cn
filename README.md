# 《LangChain.js 中文入门电子书》

> 一本从零到落地的中文教程，每章都有**概念讲解 + 可直接运行的代码**。
> 内容基于微软官方课程 [microsoft/langchainjs-for-beginners](https://github.com/microsoft/langchainjs-for-beginners) 整理、翻译并改写为中文，代码已适配 LangChain **v1.x**。

---

## 这本书适合谁

- 会 JavaScript / TypeScript，但**没接触过 LangChain**
- 想用 JS/TS 构建 AI 应用（聊天机器人、知识库问答、智能体……）
- 希望**边读边跑**代码，而不是只看理论

---

## 快速开始（4 步）

```bash
# 第 1 步：把本书示例克隆到本地
git clone https://gitee.com/snail_wn/lang-chain-js-cn.git
cd lang-chain-js-cn

# 第 2 步：安装依赖
npm install

# 第 3 步：配置模型（复制模板后填入你的密钥）
cp .env.example .env
#   然后编辑 .env：至少填 AI_API_KEY / AI_ENDPOINT / AI_MODEL

# 第 4 步：跑通第一个例子
npx tsx 01-introduction/code/01-hello-world.ts
```

> 不想用 Git？到 https://gitee.com/snail_wn/lang-chain-js-cn 点「克隆/下载 → 下载 ZIP」，
> 解压后进入同名目录，从第 2 步开始做即可。

> 只要你的服务商**兼容 OpenAI 接口**（DeepSeek、OpenAI、硅基流动、DashScope、Kimi、Azure……），都能直接用。
> 换服务商时**只改 `.env`，不动代码**。详细说明见 [第 0 章 · 环境准备](./00-course-setup/README.md)。

### 📦 想把 LangChain 装进**自己的项目**？

上面 3 步是「跑本书的示例」。如果你是要在**自己的项目**里使用 LangChain，装法是：

```bash
npm install -S langchain          # npm（-S 即 --save，npm 5+ 已默认）
pnpm install langchain            # pnpm
yarn add langchain                # yarn
```

注意 LangChain v1 是**「一个主包 + 若干按需包」**，通常还要按需装上
`@langchain/openai`、`zod`、`@langchain/textsplitters` 等。

完整说明（含每个包什么时候需要、如何验证）见
[第 0 章 · 二、把 LangChain 装进你自己的项目](./00-course-setup/README.md)。

---

## 目录

| 章 | 标题 | 你会学到 | 代码 |
| :-: | --- | --- | :-: |
| 0 | [环境准备](./00-course-setup/README.md) | 安装依赖、配置模型、运行示例 | — |
| 1 | [LangChain.js 入门](./01-introduction/README.md) | 框架是什么、核心概念、第一次调用 | 3 个 |
| 2 | [对话模型与基础交互](./02-chat-models/README.md) | 多轮对话、流式、参数、错误处理、token | 5 个 |
| 3 | [提示词、消息与结构化输出](./03-prompts-messages-outputs/README.md) | 消息/模板、Few-Shot、Zod 结构化输出 | 7 个 |
| 4 | [函数调用与工具](./04-function-calling-tools/README.md) | 定义工具、三步走执行闭环、多工具选择 | 4 个 |
| 5 | [智能体（Agents）](./05-agents/README.md) | createAgent、ReAct、中间件、长对话压缩 | 5 个 |
| 6 | [模型上下文协议 MCP](./06-mcp/README.md) | 连接远程/本地 MCP 服务器、多服务器、写服务器 | 4 个 |
| 7 | [文档、嵌入与语义搜索](./07-documents-embeddings-semantic-search/README.md) | Document、切分、嵌入、向量检索 | 6 个 |
| 8 | [Agentic RAG](./08-agentic-rag-systems/README.md) | 传统 RAG vs Agentic RAG、带记忆问答、选型 | 4 个 |

> 全书共 **9 章、38 个可运行代码示例**。
>
> 📖 术语看不懂？查 [中文术语表 GLOSSARY.md](./GLOSSARY.md)。

---

## 学习路线图

```
        模型调用(1)
            │
    多轮/流式/参数(2)
            │
  提示词与结构化输出(3)
            │
        工具(4)
            │
       智能体(5) ── MCP 外部工具(6)
            │
  文档/嵌入/语义检索(7)
            │
      Agentic RAG(8)
```

**建议顺序阅读**：后面的章节会复用前面的概念（例如第 8 章把第 4、5、7 章的知识组合起来）。

---

## 目录结构

```
langChain/
├── README.md                      ← 你在这里
├── GLOSSARY.md                    ← 中文术语表
├── .env.example                   ← 环境变量模板
├── package.json / tsconfig.json   ← 依赖与 TS 配置
│
├── 00-course-setup/               ← 第 0 章：环境准备
├── 01-introduction/               ← 第 1 章
│   ├── README.md                  ← 中文讲解
│   └── code/*.ts                  ← 可运行代码
├── 02-chat-models/
├── 03-prompts-messages-outputs/
├── 04-function-calling-tools/
├── 05-agents/
├── 06-mcp/
│   └── servers/stdio-calculator-server.ts   ← 手写的 MCP 服务器
├── 07-documents-embeddings-semantic-search/
├── 08-agentic-rag-systems/
│
├── lib/                           ← 全书共用的工具
│   ├── env.ts                     ← 读取环境变量
│   ├── model.ts                   ← 对话模型工厂 createModel()
│   ├── embeddings.ts              ← 嵌入模型工厂 createEmbeddings()
│   ├── offline-embeddings.ts      ← 离线嵌入（无 API 时的降级方案）
│   └── kb.ts                      ← 知识库加载（第 8 章）
├── scripts/verify-examples.sh     ← 一键验证所有示例
└── data/                          ← 示例素材
    ├── sample.txt / article.txt
    └── docs/*.md                  ← RAG 知识库
```

---

## 常用命令

```bash
# 运行任意一个示例
npx tsx <章节目录>/code/<文件名>.ts

# 也行（等价）
npm start <章节目录>/code/<文件名>.ts

# 类型检查（检查你改过的代码有没有类型错误）
想一次性确认环境正常（会真实调用 API，约 15 分钟）：

```bash
npm run verify
```

它会逐个跑完全部示例并给出三级判定：

| 判定 | 含义 |
| --- | --- |
| ✅ PASS | 进程正常退出，输出合理 |
| ⚠️ SUSPECT | 进程没崩、也没抛错，但**结果明显不对**（空回复、工具没被调用、解析失败…） |
| ❌ FAIL | 非零退出，或出现真正的运行时故障 |

> 💡 为什么要单独有 SUSPECT 这一级？因为很多 bug **不会让程序崩溃，只会让结果静悄悄地错**。
> 只看退出码是抓不到的——本电子书开发过程中靠它抓出了 6 个这类问题。

---

## 关于服务商与嵌入

- **对话模型**：任何兼容 OpenAI 接口的服务商都行（只改 `.env`）
- **嵌入模型**：第 7、8 章需要。**注意 DeepSeek 等部分服务商不提供 embedding 接口**。
  - 配了 `AI_EMBEDDING_API_KEY` → 用真正的 embedding（推荐，如硅基流动 `BAAI/bge-m3`）
  - 没配 → 代码自动降级为**本地离线嵌入**，流程照样跑通（仅字面相似度，语义效果有限）

---

## 遇到问题？

1. **报错 `缺少环境变量 AI_API_KEY`** → 你还没 `cp .env.example .env` 并填写
2. **401 / 鉴权失败** → 检查 `.env` 里的密钥是否正确、是否有对应模型的权限
3. **429 / 限流** → 代码里已用 `withRetry()`；也可稍等再试
4. **第 6 章连不上 Context7** → 网络问题，改成跑 `02-mcp-stdio.ts`（本地，无需外网）
5. **第 7、8 章检索效果怪** → 你可能在用离线嵌入；配置真正的 embedding 服务后再看

---

## 版权与致谢

内容改编自微软开源课程 [LangChain.js for Beginners](https://github.com/microsoft/langchainjs-for-beginners)（MIT License，作者 Dan Wahlin 及贡献者）。
本中文版仅供学习使用。

官方文档：https://docs.langchain.com/oss/javascript/langchain/overview

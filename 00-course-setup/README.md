# 第 0 章 · 环境准备

> 本章不用写业务代码，只要把环境跑通，后面 8 章就都能顺利运行。

## 一、你需要什么

- **Node.js ≥ 20**（本电子书在 Node 24 上实测通过）
- **npm / pnpm / yarn**（任选其一）
- **Git**（用来把本书示例克隆到本地；第四节有安装方法）
- 一个**兼容 OpenAI 接口**的大模型服务商账号（见第五节）
- 一个能写代码的编辑器（VS Code 推荐）

检查版本：

```bash
node -v    # 期望 v20 以上
npm -v
git --version
```

三个都有一个版本号输出，就可以往下走了。

---

## 二、把 LangChain 装进**你自己**的项目

这是最重要的一节。本书示例都放在本书目录里，但如果你要把 LangChain 用在自己的项目中，就要按下面的方式安装。

### 1. 安装主包

```bash
# npm
npm install -S langchain

# pnpm
pnpm install langchain

# yarn
yarn add langchain
```

> `-S` 是 `--save` 的缩写，表示把依赖写进 `package.json` 的 `dependencies`。
> 从 npm 5 开始这已是默认行为，所以 `npm install langchain` 效果完全一样。

### 2. LangChain v1 是「一个主包 + 若干按需包」

**只装 `langchain` 通常不够。** 它是一个主包，具体能力分散在多个包里按需引入。

| 包 | 装它的理由 | 本书哪章用到 |
| --- | --- | --- |
| `langchain` | 主包：`createAgent`、`tool`、各类消息 | 全书 |
| `@langchain/openai` | 对接任何 OpenAI 兼容接口（DeepSeek、Kimi、DashScope、Azure…） | 第 1 章起 |
| `zod` | 定义工具参数、结构化输出的 schema | 第 3、4、5、8 章 |
| `@langchain/core` | 核心抽象：`Document`、`Embeddings`、Prompt 模板 | 第 3、7 章 |
| `@langchain/textsplitters` | 文档切分（切块器） | 第 7 章 |
| `@langchain/classic` | 传统组件：文档加载器、`MemoryVectorStore` | 第 7、8 章 |
| `@langchain/mcp-adapters` | 连接 MCP 服务器 | 第 6 章 |

### 3. 按需求装

**起步最小集**（够跑第 1~5 章）：

```bash
npm install -S langchain @langchain/openai zod
```

**要写 RAG**（第 7、8 章需要）：

```bash
npm install -S @langchain/textsplitters @langchain/classic
```

**要用 MCP**（第 6 章需要）：

```bash
npm install -S @langchain/mcp-adapters
```

**一次装齐**（省事，推荐先这样练手）：

```bash
npm install -S langchain @langchain/openai @langchain/core zod @langchain/textsplitters @langchain/classic @langchain/mcp-adapters
```

> pnpm 用户把 `npm install -S` 换成 `pnpm add`；yarn 用户换成 `yarn add`。
> 例如：`pnpm add langchain @langchain/openai zod`

### 4. 还要有 TypeScript 运行环境

本书全部示例都是 `.ts` 文件，直接运行 TypeScript 需要这两个开发依赖：

```bash
npm install -D typescript tsx @types/node
```

- `-D` = `--save-dev`，表示只用于开发，不进生产依赖
- `tsx` 让你可以直接 `npx tsx xxx.ts` 运行，无需先编译

### 5. 验证装好了

```bash
npm ls langchain
```

或者写个最小的 `hello.ts` 试一下：

```typescript
import { ChatOpenAI } from "@langchain/openai";
console.log("LangChain 已就绪");
```

```bash
npx tsx hello.ts
```

> 💡 **在本书目录里不用重复装**：本书根目录的 `package.json` 已经声明了上面全部依赖，
> 你只要在项目根目录执行一次 `npm install`（或用 `pnpm install`），后面所有章节的示例都能直接跑。
> 这一节讲的是「装进你自己的项目」，两者不要混淆。

---

## 三、把本书示例克隆到本地

本书的全部示例代码托管在 Gitee 上。**第一步就是把它克隆下来**：

```bash
# 克隆仓库
git clone https://gitee.com/snail_wn/lang-chain-js-cn.git

# 进入项目目录
cd lang-chain-js-cn
```

克隆完成后，`lang-chain-js-cn` 这个目录就是**本书根目录**——后面所有命令都在这里执行。

> **不想用 Git？** 打开仓库页面 https://gitee.com/snail_wn/lang-chain-js-cn ，
> 点右上角「克隆/下载」→「下载 ZIP」，解压后进入同名目录，效果一样。

> **命令还不会用？** 下面「附：Git 极简入门」有 3 条命令的说明。

---

## 四、安装依赖

在**本书根目录**执行一次即可：

```bash
npm install
# 或
pnpm install
```

这一步会把全书所有章节需要的依赖装好（首次约 1~4 分钟）。装完的版本大致是：

| 包 | 版本 |
| --- | --- |
| `langchain` | ^1.5 |
| `@langchain/core` | ^1.2 |
| `@langchain/openai` | ^1.5 |
| `@langchain/classic` | ^1.0 |
| `@langchain/textsplitters` | ^1.0 |
| `@langchain/mcp-adapters` | ^1.1 |
| `zod` | ^3.25 |
| `tsx` / `typescript` | ^4 / ^5 |

其他辅助包：`dotenv`（读取 `.env`）、`mathjs`（工具示例里安全求值）。

---

## 五、配置模型（关键步骤）

复制环境变量模板：

```bash
cp .env.example .env
```

然后打开 `.env`，填入你的服务商信息：

```bash
# 对话模型（必填）
AI_API_KEY=你的密钥
AI_ENDPOINT=https://api.deepseek.com/v1      # 换成你的服务商地址
AI_MODEL=deepseek-chat                       # 换成你的模型名

# 嵌入模型（第 7、8 章才需要）
AI_EMBEDDING_API_KEY=
AI_EMBEDDING_MODEL=BAAI/bge-m3
```

> **为什么只要「兼容 OpenAI 接口」就行？**
> 因为全书统一用 `ChatOpenAI` 这个客户端，它只要求服务商提供
> `POST {AI_ENDPOINT}/chat/completions` 这样的标准接口。
> 换服务商时，你**只改 `.env`，不动任何一行代码**——这正是 LangChain 抽象层要解决的问题。

### 常见服务商填法

| 服务商 | AI_ENDPOINT | AI_MODEL 示例 |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-flash` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` |
| 阿里 DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 月之暗面 Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| Azure OpenAI | `https://<资源名>.openai.azure.com/openai/v1` | 你的部署名 |

> ⚠️ **关于嵌入模型**：DeepSeek 等部分服务商**不提供** embedding 接口。
> 为了让你不被卡住，第 7、8 章的代码会在没有 embedding 密钥时
> **自动降级为本地离线嵌入**，流程照样跑通（只是语义效果有限）。
> 想体验真正的语义检索，请配一个支持 embedding 的服务商（如硅基流动的 `BAAI/bge-m3`）。

---

## 六、运行任意一章的代码

用 `tsx` 直接跑 TypeScript，无需编译：

```bash
npx tsx 01-introduction/code/01-hello-world.ts
```

或者用 npm 脚本：

```bash
npm start 01-introduction/code/01-hello-world.ts
```

---

## 七、类型检查与一键验证（可选但推荐）

想知道自己改的代码有没有类型错误：

```bash
npm run typecheck     # 等价于 tsc --noEmit
```

想一次性确认环境正常（会真实调用 API，约 5 分钟）：

```bash
npm run verify
```

---

## 八、目录结构

```
lang-chain-js-cn/             # 克隆下来的目录名（= 本书根目录）
├── README.md                 # 总目录与阅读指南
├── GLOSSARY.md               # 中文术语表
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
├── docs/                     # VitePress 站点源码（就是你现在看的这个网站）
├── scripts/                  # verify-examples.sh / deploy-tencent.sh 等脚本
└── .env.example              # 环境变量模板
```

---

## 附：Git 极简入门

不会 Git 也没关系，你只需要认识 3 条命令。

**安装 Git**

| 系统 | 安装方式 |
| --- | --- |
| macOS | 终端执行 `xcode-select --install`（弹出窗口点安装即可） |
| Windows | 到 https://git-scm.com/download/win 下载安装 |
| Linux (Debian/Ubuntu) | `sudo apt install git` |

装完检查：`git --version`

**3 条命令走天下**

```bash
# 1. 把远程仓库复制到本地（最常用）
git clone https://gitee.com/snail_wn/lang-chain-js-cn.git

# 2. 进入刚克隆下来的目录
cd lang-chain-js-cn

# 3. 看看当前状态（改了哪些文件）
git status
```

就这三条，足够把本书跑起来。

**几个常见疑问**

- **克隆要密码吗？** 公开仓库不需要，直接克隆即可
- **克隆到哪了？** 在你执行 `git clone` 时所在的目录下，新建了一个 `lang-chain-js-cn` 文件夹
- **我想放别的地方？** `git clone <地址> 我想要的目录名`
- **以后想更新到最新版？** 在项目目录里执行 `git pull`

---

**下一步**：[第 1 章 · LangChain.js 入门 →](../01-introduction/README.md)

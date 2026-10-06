# 第 6 章 · 模型上下文协议（MCP）

## 🎯 本章目标

- 理解 MCP 是什么、为什么需要它
- 用 `MultiServerMCPClient` 连接远程 / 本地 MCP 服务器
- 认识 HTTP 与 stdio 两种传输方式
- 同时连接多个服务器，把工具汇总给智能体
- 亲手写一个 MCP 服务器

**本章代码**

> 📌 **代码约定**：正文的代码块都尽量保持**可直接运行**（含 import 与模型初始化）。若某段为聚焦概念的**节选**，会明确标注「节选」并指向同名的 `code/` 完整文件。

| 文件 | 内容 |
| --- | --- |
| `code/01-mcp-http.ts` | 连接远程 MCP 服务器（HTTP） |
| `code/02-mcp-stdio.ts` | 连接本地 MCP 服务器（stdio，无需外网） |
| `code/03-multi-server.ts` | 同时连接多个服务器 |
| `servers/stdio-calculator-server.ts` | 手写一个 MCP 服务器 |

---

## 一、MCP 是什么

**MCP（Model Context Protocol，模型上下文协议）**是一个开放标准，让 AI 应用通过**统一接口**连接外部工具与数据源。

它由 Anthropic 在 2024 年 11 月提出，随后被 OpenAI（2025 年 3 月）、Google DeepMind（2025 年 4 月）采纳。

> 🧠 **最好的比喻：MCP 是"AI 世界的 USB-C"。**
> 以前每种设备都要一根专用线（每个服务都要写一套定制集成代码）；
> 现在一个接口通吃——任何支持 MCP 的客户端，都能连接任何 MCP 服务器。

### 没有 MCP 会怎样

想让 AI 访问 GitHub、数据库、文件系统、文档站……你得**为每个服务单独写一套工具**。代码重复、难维护、无法复用。

### 有了 MCP

这些能力都由标准化的 **MCP 服务器**暴露出来，你的代码只需要"连接 + 取工具"：

```
你的 AI 应用 ──┬── MCP Server (GitHub 工具)
              ├── MCP Server (数据库工具)
              └── MCP Server (文档工具)
```

---

## 二、连接一个 MCP 服务器

在 LangChain.js 里，用 `@langchain/mcp-adapters` 的 `MultiServerMCPClient`：

```typescript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent } from "langchain";
import { createModel } from "../lib/model.js";

const mcpClient = new MultiServerMCPClient({
  context7: {
    transport: "http",
    url: "https://mcp.context7.com/mcp",
  },
});

const tools = await mcpClient.getTools();   // 拿到标准 LangChain 工具
const agent = createAgent({ model: createModel(), tools });  // 直接喂给智能体
```

**最妙的一点**：从 MCP 拿到的工具，和你在第 4 章手写的工具**完全等价**，`createAgent()` 一视同仁。

> ⚠️ 用完记得 `await mcpClient.close()`，否则脚本可能不退出。

运行示例 1（需联网）：

```bash
npx tsx 06-mcp/code/01-mcp-http.ts
```

---

## 三、两种传输方式

| 传输方式 | 通信机制 | 适合场景 |
| --- | --- | --- |
| **stdio** | 进程间通信（stdin/stdout），服务器是客户端的**子进程** | 本地工具、CLI 工具、无外网 |
| **HTTP** | 网络通信 | 远程服务、云上的 MCP 服务器 |

stdio 配置长这样——客户端会**自动把服务器当子进程启动**：

```typescript
{
  localCalculator: {
    transport: "stdio",
    command: "npx",
    args: ["tsx", "06-mcp/servers/stdio-calculator-server.ts"],
  },
}
```

**同一套 agent 代码，两种传输都能跑。**

运行示例 2（本地，无需外网——**建议先跑这个**）：

```bash
npx tsx 06-mcp/code/02-mcp-stdio.ts
```

---

## 四、连接多个服务器

`MultiServerMCPClient` 顾名思义，能同时连多个：

```typescript
const mcpClient = new MultiServerMCPClient({
  calculator: { transport: "stdio", command: "npx", args: ["tsx", ".../stdio-calculator-server.ts"] },
  context7:   { transport: "http", url: "https://mcp.context7.com/mcp" },
});

const tools = await mcpClient.getTools();   // 汇总所有服务器的工具
```

智能体面对来自不同服务器的工具，照样自动挑对的那个。**加服务器不用改 agent 代码**，这让系统可以水平扩展。

运行示例 3：

```bash
npx tsx 06-mcp/code/03-multi-server.ts
```

---

## 五、亲手写一个 MCP 服务器

见 `servers/stdio-calculator-server.ts`。核心就三步：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "local-calculator", version: "1.0.0" });

// 1. 注册工具（名字 + 描述 + 参数 schema + 处理函数）
server.tool(
  "calculate",
  "执行数学计算",
  { expression: z.string().describe("数学表达式") },
  async ({ expression }) => ({
    content: [{ type: "text", text: `${expression} = ${evaluate(expression)}` }],
  })
);

// 2. 用 stdio 传输
const transport = new StdioServerTransport();

// 3. 连接
await server.connect(transport);
```

写完这个服务器，**任何**支持 MCP 的客户端（不只是 LangChain，还有 Claude Desktop、各种 IDE 插件）都能直接用它的能力——这就是标准化协议的价值。

---

## 🎓 本章要点

- **MCP = AI 世界的 USB-C**，一个协议连接所有工具与数据源
- `MultiServerMCPClient` 是客户端；MCP 服务器暴露能力
- **stdio**（本地子进程）与 **HTTP**（远程）两种传输
- MCP 工具与自定义工具在 `createAgent` 里**完全等价**
- 多服务器 = 工具池可插拔扩展

---

## 🎮 动手练习

1. 给 `servers/stdio-calculator-server.ts` 加一个 `random_number` 工具（返回指定范围内的随机数），然后在客户端里用起来
2. 写一个只暴露"当前时间"的 MCP 服务器，并用 `MultiServerMCPClient` 连接它
3. 观察 `01-mcp-http.ts` 的失败路径：如果网络不通，它是否优雅地降级了？

---

## 🗺️ 导航

[← 上一章：智能体](/guide/agents) ｜ [返回总目录](/) ｜ [下一章：文档、嵌入与语义搜索 →](/guide/embeddings)

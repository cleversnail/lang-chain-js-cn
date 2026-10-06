# 第 6 章 · MCP（模型上下文协议）

## 🎯 本章目标

- 搞懂 MCP 是什么、解决什么问题
- 连接远程 MCP 服务器（HTTP 传输）
- 连接本地 MCP 服务器（stdio 传输）
- 同时连接多个服务器，统一工具池
- **亲手写一个 MCP 服务器**

**本章代码**

> 📌 **代码约定**：正文的代码块都尽量保持**可直接运行**（含 import 与模型初始化）。若某段为聚焦概念的**节选**，会明确标注「节选」并指向同名的 `code/` 完整文件。

| 文件 | 内容 |
| --- | --- |
| `code/01-mcp-http.ts` | 连接远程 MCP 服务器（Context7 文档服务） |
| `code/02-mcp-stdio.ts` | 连接本地 MCP 服务器 |
| `code/03-multi-server.ts` | 同时连接多个服务器 |
| `servers/stdio-calculator-server.ts` | 我们自己写的 MCP 服务器 |

---

## 一、MCP 是什么

### 一个痛点

假设你想让 AI 读你的数据库、查 GitHub、搜网页、看本地文件……

**每接一个系统，你就要写一套专门的集成代码。** 换个 AI 客户端（Claude Desktop、Cursor、
你自己的应用），这些代码还得再写一遍。

### MCP 的解法

**MCP（Model Context Protocol，模型上下文协议）= AI 世界的 USB 接口标准。**

- **服务器（Server）** 按标准把能力"暴露"出去
- **客户端（Client）** 按标准去"发现并调用"能力
- 两边只要都遵守 MCP，就能**即插即用**

所以一个现成的 MCP 服务器（比如"查文档"、"查数据库"）可以被任何 MCP 客户端复用——
你不用为它写专门的集成代码。

### 和上一章的关系

回忆第 4、5 章：我们手写了很多工具（calculator、getWeather…）。

**MCP 只是工具的另一种来源。** 从 MCP 拿到的工具，在 `createAgent()` 里和自定义工具
**完全等价**——直接丢进 `tools` 数组就能用。

```
自定义工具  ─┐
            ├─→ createAgent({ model, tools })
MCP 工具   ─┘
```

### 两种传输方式

| 传输 | 通信方式 | 典型场景 |
| --- | --- | --- |
| `stdio` | 进程间通信（子进程的 stdin/stdout） | 本地工具、本机文件/命令 |
| `http` | 网络通信 | 远程服务、SaaS、团队共享 |

---

## 二、连接一个 MCP 服务器

### 示例 1：连接远程 MCP 服务器（HTTP）

这里连的是 **Context7** —— 一个提供"最新版本文档"的公开 MCP 服务。

```typescript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent, HumanMessage } from "langchain";
import "dotenv/config";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("🔌 连接远程 MCP 服务器（Context7）\n");

  const serverUrl = process.env.MCP_SERVER_URL || "https://mcp.context7.com/mcp";
  console.log(`📡 目标：${serverUrl}\n`);

  const mcpClient = new MultiServerMCPClient({
    context7: {
      transport: "http",
      url: serverUrl,
      // 可选：填了 CONTEXT7_API_KEY 能提高限速额度
      ...(process.env.CONTEXT7_API_KEY
        ? { headers: { Authorization: `Bearer ${process.env.CONTEXT7_API_KEY}` } }
        : {}),
    },
  });

  try {
    console.log("🔧 正在获取工具列表……");
    const tools = await mcpClient.getTools();
    console.log(`✅ 拿到 ${tools.length} 个工具：`);
    for (const t of tools) console.log(`   • ${t.name}：${t.description}`);

    // 关键点：MCP 工具和自定义工具用起来一模一样，直接丢给 createAgent
    const agent = createAgent({
      model: createModel(),
      tools,
    });

    const query = "React 的 useState 怎么用？给我最新文档。";
    console.log(`\n👤 用户：${query}\n`);
    const res = await agent.invoke({ messages: [new HumanMessage(query)] });
    console.log(`🤖 智能体：${res.messages[res.messages.length - 1].content}`);

    console.log("\n💡 要点：MCP 提供了标准化的外部工具接入方式；");
    console.log("   从 MCP 拿到的工具，和自定义工具在 createAgent 里完全等价。");
  } catch (err) {
    console.error("❌ 连接 MCP 服务器失败：", err instanceof Error ? err.message : err);
    console.log("\n💡 可能是网络问题。可以先运行示例 2（本地 stdio 服务器），它不需要外网。");
  } finally {
    await mcpClient.close();
    console.log("\n🔌 MCP 连接已关闭");
  }
}

main().catch(console.error);
```

运行（需要联网）：

```bash
npx tsx 06-mcp/code/01-mcp-http.ts
```

预期输出（节选）：

```
🔌 连接远程 MCP 服务器（Context7）

📡 目标：https://mcp.context7.com/mcp

🔧 正在获取工具列表……
✅ 拿到 2 个工具：
   • resolve-library-id：Resolves a package/product name to a Context7-compatible
     library ID and returns matching libraries.

You MUST call this function before 'Query Documentation' tool to obtain a valid
Context7-compatible library ID …（工具描述很长，这是 MCP 服务器的作者写的"说明书"）
   • query-docs：……

👤 用户：React 的 useState 怎么用？给我最新文档。

🤖 智能体：……（模型先调 resolve-library-id 找到 React 的库 ID，
   再调 query-docs 拉最新文档，最后整理成答案）

💡 要点：MCP 提供了标准化的外部工具接入方式；
   从 MCP 拿到的工具，和自定义工具在 createAgent 里完全等价。

🔌 MCP 连接已关闭
```

**只有 4 步**：配置服务器 → `getTools()` → 丢给 `createAgent` → 调用。

注意 `getTools()` 返回的就是**标准的 LangChain 工具对象**——所以后面所有用法
（多工具选择、中间件、Agent 循环）全都自动适用。

> 💡 示例里做了 `try/catch/finally` 兜底：网络不通时给友好提示，并在最后 `close()`
> 关闭连接。真实项目里**一定要记得关闭**，否则子进程会残留。

---

## 三、两种传输方式

### 示例 2：连接本地 MCP 服务器（stdio）

stdio 传输：客户端把 MCP 服务器当作**子进程**启动，通过标准输入输出通信。
**不需要外网**，最适合本地学习。

```typescript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent, HumanMessage } from "langchain";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";
import { createModel } from "../../lib/model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🔧 通过 stdio 连接本地 MCP 服务器\n");

  // command + args：客户端会以子进程方式启动这个服务器
  const mcpClient = new MultiServerMCPClient({
    localCalculator: {
      transport: "stdio",
      command: "npx",
      args: ["tsx", join(__dirname, "../servers/stdio-calculator-server.ts")],
    },
  });

  try {
    console.log("📟 正在启动并连接本地 MCP 服务器……");
    const tools = await mcpClient.getTools();
    console.log(`✅ 连接成功，拿到 ${tools.length} 个工具：`);
    for (const t of tools) console.log(`   • ${t.name}：${t.description}`);

    const agent = createAgent({ model: createModel(), tools });

    const queries = [
      "15 * 23 + 100 等于几？",
      "把 100 华氏度换算成摄氏度",
      "计算一下 sqrt(144) 加 sin(pi/2)",
    ];

    for (const q of queries) {
      console.log(`\n👤 用户：${q}`);
      const res = await agent.invoke({ messages: [new HumanMessage(q)] });
      console.log(`🤖 智能体：${res.messages[res.messages.length - 1].content}`);
    }

    console.log("\n💡 要点：stdio 传输 = 进程间通信（stdin/stdout）；");
    console.log("   HTTP 传输 = 网络通信。同一套 agent 代码，两种传输都能用。");
  } catch (err) {
    console.error("❌ 本地 MCP 服务器出错：", err instanceof Error ? err.message : err);
  } finally {
    await mcpClient.close();
    console.log("\n🔌 MCP 连接已关闭");
  }
}

main().catch(console.error);
```

运行（**无需外网**）：

```bash
npx tsx 06-mcp/code/02-mcp-stdio.ts
```

预期输出：

```
🔧 通过 stdio 连接本地 MCP 服务器

📟 正在启动并连接本地 MCP 服务器……
🧮 本地计算器 MCP 服务器已启动（stdio）
✅ 连接成功，拿到 2 个工具：
   • calculate：执行数学计算，支持加减乘除、幂、开方、三角函数等表达式
   • convert_temperature：在摄氏度与华氏度之间换算

👤 用户：15 * 23 + 100 等于几？
🤖 智能体：15 × 23 = 345，再加 100 等于 **445**。

👤 用户：把 100 华氏度换算成摄氏度
🤖 智能体：100 华氏度 ≈ **37.78 摄氏度**。

换算公式：(°F − 32) × 5/9 = (100 − 32) × 5/9 ≈ 37.78 °C

👤 用户：计算一下 sqrt(144) 加 sin(pi/2)
🤖 智能体：计算结果为 **13**。

拆解一下：
- √144 = 12
- sin(π/2) = 1
- 12 + 1 = 13

💡 要点：stdio 传输 = 进程间通信（stdin/stdout）；
   HTTP 传输 = 网络通信。同一套 agent 代码，两种传输都能用。

🔌 MCP 连接已关闭
```

**关键差别只在配置块**：

```typescript
// 本地（stdio）：告诉它用什么命令启动子进程
{ transport: "stdio", command: "npx", args: ["tsx", ".../server.ts"] }

// 远程（http）：告诉它 URL
{ transport: "http", url: "https://..." }
```

**连接之后完全一样** —— `getTools()`、`createAgent()`、`invoke()` 都不变。
这就是 MCP 的价值：**传输方式对上层透明**。

---

## 四、连接多个服务器

### 示例 3：一个客户端，多个服务器

这是 MCP 最爽的地方：**工具池统一**。

```typescript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent, HumanMessage } from "langchain";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";
import { createModel } from "../../lib/model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🌐 多服务器 MCP 集成\n");

  const mcpClient = new MultiServerMCPClient({
    calculator: {
      transport: "stdio",
      command: "npx",
      args: ["tsx", join(__dirname, "../servers/stdio-calculator-server.ts")],
    },
    context7: {
      transport: "http",
      url: process.env.MCP_SERVER_URL || "https://mcp.context7.com/mcp",
    },
  });

  try {
    console.log("🔧 正在汇总所有服务器的工具……");
    const tools = await mcpClient.getTools();
    console.log(`✅ 共拿到 ${tools.length} 个工具：`);
    for (const t of tools) console.log(`   • ${t.name}`);

    const agent = createAgent({ model: createModel(), tools });

    const queries = [
      "25 * 4 + 100 等于几？",
      "帮我查一下 Express.js 中间件的文档",
    ];

    for (const q of queries) {
      console.log(`\n👤 用户：${q}`);
      const res = await agent.invoke({ messages: [new HumanMessage(q)] });
      console.log(`🤖 智能体：${res.messages[res.messages.length - 1].content}`);
    }

    console.log("\n💡 要点：智能体面对来自不同服务器的工具，照样自动挑对的那个。");
  } catch (err) {
    console.error("❌ 出错：", err instanceof Error ? err.message : err);
    console.log("💡 如果是 Context7 连不上，可以先把 context7 那段配置删掉，只留本地计算器。");
  } finally {
    await mcpClient.close();
    console.log("\n🔌 MCP 连接已关闭");
  }
}

main().catch(console.error);
```

运行：

```bash
npx tsx 06-mcp/code/03-multi-server.ts
```

预期输出（节选）：

```
🌐 多服务器 MCP 集成

🔧 正在汇总所有服务器的工具……
🧮 本地计算器 MCP 服务器已启动（stdio）
✅ 共拿到 4 个工具：
   • calculate
   • convert_temperature
   • resolve-library-id
   • query-docs

👤 用户：25 * 4 + 100 等于几？
🤖 智能体：25 × 4 + 100 = **200**

计算过程：
- 25 × 4 = 100
- 100 + 100 = 200

👤 用户：帮我查一下 Express.js 中间件的文档
🤖 智能体：我查到了 Express.js 官方文档中关于中间件的内容，为你整理如下：

## 一、什么是中间件（Middleware）
中间件函数可以访问请求对象（req）、响应对象（res），以及请求-响应周期中的 next 函数……
（后面是一整篇结构化的技术文档摘要）

💡 要点：智能体面对来自不同服务器的工具，照样自动挑对的那个。

🔌 MCP 连接已关闭
```

**看那个工具池**：`calculate` / `convert_temperature` 来自**本地**服务器，
`resolve-library-id` / `query-docs` 来自**远程**服务器。

模型完全不管工具从哪来，它只看描述、挑最合适的。**这就是"即插即用"的实际效果。**

---

## 五、亲手写一个 MCP 服务器

上面用的本地计算器服务器，就是**我们自己写的**（`servers/stdio-calculator-server.ts`）。
看懂它，你就掌握了 MCP 的"服务端"。

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { evaluate } from "mathjs";

const server = new McpServer({
  name: "local-calculator",
  version: "1.0.0",
});

// 工具 1：表达式计算
server.tool(
  "calculate",
  "执行数学计算，支持加减乘除、幂、开方、三角函数等表达式",
  { expression: z.string().describe("要计算的数学表达式，例如 '15 * 23 + 100'") },
  async ({ expression }) => {
    try {
      const result = evaluate(expression);
      return { content: [{ type: "text", text: `${expression} = ${result}` }] };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `表达式无效：${err instanceof Error ? err.message : String(err)}` },
        ],
        isError: true,
      };
    }
  }
);

// 工具 2：温度换算
server.tool(
  "convert_temperature",
  "在摄氏度与华氏度之间换算",
  {
    value: z.number().describe("温度数值"),
    from: z.enum(["celsius", "fahrenheit"]).describe("原始单位"),
  },
  async ({ value, from }) => {
    const c = from === "celsius" ? value : ((value - 32) * 5) / 9;
    const f = from === "fahrenheit" ? value : (value * 9) / 5 + 32;
    return {
      content: [{ type: "text", text: `${value}°${from === "celsius" ? "C" : "F"} = ${c.toFixed(2)}°C / ${f.toFixed(2)}°F` }],
    };
  }
);

// 用 stdio 传输：通过标准输入输出与父进程通信
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("🧮 本地计算器 MCP 服务器已启动（stdio）");
```

单独运行看看（一般不需要——客户端会自动把它当子进程拉起）：

```bash
npx tsx 06-mcp/servers/stdio-calculator-server.ts
# 输出：🧮 本地计算器 MCP 服务器已启动（stdio）
# 然后它会挂起等待客户端连接，Ctrl+C 退出
```

### 服务端三件事

1. **建服务器** — `new McpServer({ name, version })`
2. **注册工具** — `server.tool(名字, 描述, 参数schema, 处理函数)`
   （发现了吗？和 `tool()` 几乎一样的四要素）
3. **连接传输** — `server.connect(new StdioServerTransport())`

> 💡 注意最后一行用的是 `console.error` 而不是 `console.log`。
> 因为 stdio 传输下，**`stdout` 是给协议通信用的**——
> 你要打印调试信息，必须走 `stderr`，否则会污染协议消息、导致连接失败。
> 这是个很容易踩的坑。

> 想让它变成**远程**服务器？把 `StdioServerTransport` 换成 HTTP 传输即可，
> 工具定义一个字都不用改。

---

## 🎓 本章要点

- **MCP = AI 世界的 USB 标准**：服务器暴露能力，客户端发现并调用，即插即用
- MCP 工具在 `createAgent()` 里和自定义工具**完全等价**
- 两种传输：`stdio`（本地子进程）/ `http`（远程网络），**上层代码一致**
- 一个客户端可连多个服务器，**工具池统一**
- 写服务器三件事：建服务器 → 注册工具 → 连接传输
- ⚠️ stdio 服务器里**日志必须用 `console.error`**（stdout 属于协议）

---

## 🎮 动手练习

1. 给 `servers/stdio-calculator-server.ts` 加一个工具：`random_number`（生成指定范围的随机数）
2. 让示例 2 问一句需要**同时用两个工具**的问题（比如"把 100°F 换成摄氏度，再乘以 3"）
3. 写一个"查本地文件"的 MCP 服务器（读某个目录下的文件列表），接进智能体
4. 观察 `code/01-mcp-http.ts` 的失败路径：把 `MCP_SERVER_URL` 改成一个不存在的地址，
   看 `catch` 分支的友好提示

---

## 🗺️ 导航

[← 上一章：智能体](/guide/agents) ｜ [返回总目录](/) ｜ [下一章：文档、嵌入与语义搜索 →](/guide/embeddings)

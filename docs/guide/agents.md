# 第 5 章 · 智能体（Agents）

## 🎯 本章目标

- 用 `createAgent()` 构建能自主决策的智能体
- 理解 ReAct 循环（推理 + 行动）
- 认识中间件（Middleware）的威力
- 用 `summarizationMiddleware` 控制长对话的 token
- 亲手实现一次 ReAct 循环，看清 `createAgent()` 内部

**本章代码**

> 📌 **代码约定**：正文的代码块都尽量保持**可直接运行**（含 import 与模型初始化）。若某段为聚焦概念的**节选**，会明确标注「节选」并指向同名的 `code/` 完整文件。

| 文件 | 内容 |
| --- | --- |
| `code/01-create-agent.ts` | 第一个智能体 |
| `code/02-multi-tool-agent.ts` | 多工具自动选择 |
| `code/03-agent-with-middleware.ts` | 中间件：动态选模型 + 错误兜底 |
| `code/04-summarization-middleware.ts` | 自动总结长对话 |
| `code/05-manual-react-loop.ts` | 手搓 ReAct 循环 |

---

## 一、链 vs 智能体：固定路线 vs 自主导航

- **链（Chain）**：像坐地铁——线路固定，A 站进、B 站出，不会变。
- **智能体（Agent）**：像打车——司机（模型）根据路况（问题）自己决定走哪条路、在哪停。

智能体的价值在于**动态决策**：它自己判断"要不要用工具、用哪个工具、用几次"。

---

## 二、ReAct 模式

ReAct = **Rea**soning（推理）+ **Act**ing（行动）。这是一个循环：

```
思考（Thought）→ 行动（Action / 调用工具）→ 观察（Observation）→ 重复 → 最终回答
```

回忆第 4 章：我们把"模型规划 → 代码执行 → 结果回传"走了**一遍**。

**如果把这个过程放进一个循环，反复执行直到模型不再需要工具——这就是 ReAct，也就是 Agent。**

---

## 三、用 createAgent() 构建智能体

第 4 章那个循环，`createAgent()` 全替你封装好了：

```typescript
import { createAgent, HumanMessage, tool } from "langchain";
import { createModel } from "../lib/model.js";

const model = createModel();
// calculatorTool / weatherTool / searchTool 的定义见 code/02-multi-tool-agent.ts

const agent = createAgent({
  model,
  tools: [calculatorTool, weatherTool, searchTool],
});

const response = await agent.invoke({
  messages: [new HumanMessage("东京天气怎么样？")],
});

// 取最后一条消息就是最终答案
const last = response.messages[response.messages.length - 1];
console.log(last.content);
```

**就这么多。** 它自动做了：

- 执行工具并把结果回传
- 判断何时结束（不再需要工具时）
- 处理需要多次工具调用的复杂任务

> 💡 `createAgent()` 返回的是一个 **LangGraph 图**，输入输出都用 `messages` 数组。这也是为什么调用形式是 `agent.invoke({ messages: [...] })`。

### 多工具自动选择

```typescript
import { createAgent } from "langchain";
import { createModel } from "../lib/model.js";

const agent = createAgent({
  model: createModel(),
  tools: [calculator, weather, search],   // 工具定义见 code/02-multi-tool-agent.ts
});
```

| 提问 | 自动选中的工具 |
| --- | --- |
| "50 * 25 等于几？" | `calculator` |
| "东京天气怎么样？" | `weather` |
| "介绍一下 LangChain.js" | `search` |

一个实例，什么问题都接得住——**你不需要写任何 if/else 去分发。**

---

## 四、中间件（Middleware）：给智能体装"插件"

中间件能在"模型调用"和"工具调用"前后插入你自己的逻辑。

### 中间件 1：动态选模型（省成本）

```typescript
import { createMiddleware } from "langchain";

const dynamicModelSelection = createMiddleware({
  name: "DynamicModelSelection",
  wrapModelCall: (request, handler) => {
    if (request.messages.length > 10) {
      return handler({ ...request, model: capableModel });  // 长对话→强模型
    }
    return handler(request);                                // 否则→便宜模型
  },
});
```

简单问题用便宜的小模型，复杂问题才切到大模型——**直接省钱**。

### 中间件 2：工具错误兜底（更稳）

```typescript
const toolErrorHandler = createMiddleware({
  name: "ToolErrorHandler",
  wrapToolCall: async (request, handler) => {
    try {
      return await handler(request);
    } catch (err: any) {
      return new ToolMessage({
        content: `工具出错：${err.message}。我会换一种方式回答。`,
        tool_call_id: request.toolCall.id || "",
      });
    }
  },
});
```

工具挂了也不崩溃，而是给模型一条兜底信息，让它继续想办法。

### 组装

```typescript
// basicModel / calculatorTool / searchTool / 两个 middleware 均在上文已定义
const agent = createAgent({
  model: basicModel,
  tools: [calculatorTool, searchTool],
  middleware: [dynamicModelSelection, toolErrorHandler],
});
```

**常用场景**：日志监控、成本优化、自动重试、注入用户身份/权限、限流。

---

## 五、内置中间件：summarizationMiddleware

回顾第 2 章的痛点：**对话越长，token 越贵。**

`summarizationMiddleware` 会在历史过长时**自动总结压缩**：

> 📌 **节选**：以下是 `createAgent({ ... })` 里 `middleware` 字段的写法
> （`model` 来自同一个 `createAgent` 调用）。完整可运行版本见
> `code/04-summarization-middleware.ts`。

```typescript
middleware: [
  summarizationMiddleware({
    model,
    trigger: { tokens: 200, messages: 4 },  // 达到阈值触发
    keep: { messages: 2 },                  // 压缩后保留最近 2 条
  }),
],
```

- `trigger` — 何时压缩
- `keep` — 压缩后保留多少条原始消息

这是做"长期陪伴型对话"产品的必备手段：**既记得住上下文，又不被 token 账单压垮。**

---

## 六、亲手实现 ReAct 循环（强烈建议看）

`code/05-manual-react-loop.ts` 用大约 40 行代码，把 `createAgent()` 内部的机器拆开给你看：

```typescript
for (let step = 1; step <= MAX_STEPS; step++) {
  const response = await modelWithTools.invoke(messages);   // 思考
  messages.push(response);

  if (!response.tool_calls?.length) {                       // 没有工具调用 → 结束
    return response.content;
  }

  for (const call of response.tool_calls) {                 // 行动
    const result = await tools[call.name].invoke(call.args);
    messages.push(new ToolMessage({ content: String(result), tool_call_id: call.id }));
  }
}
```

看完这个，你就彻底明白"智能体"不是什么魔法，而是一个**受控的循环**。

> ⚠️ 注意 `MAX_STEPS` 上限——真实系统里必须有这个"刹车"，防止智能体陷入无限循环。

---

## 🎓 本章要点

- 智能体 = 动态决策，链 = 固定路线
- ReAct 循环：思考 → 行动 → 观察 → 重复 → 回答
- `createAgent({ model, tools })` 一行搞定，底层就是第 4 章那个循环
- **中间件**是定制智能体行为的利器（省成本、兜错、监控）
- `summarizationMiddleware` 解决长对话的 token 膨胀
- 永远给循环设一个步数上限

---

## 🎮 动手练习

1. 给 `02-multi-tool-agent.ts` 加一个"查询当前时间"的工具，问它"现在东京几点，天气如何"（需要连续用两个工具）
2. 写一个中间件，统计每次调用了哪些工具、共几次，最后打印统计
3. 把 `05-manual-react-loop.ts` 改成"支持多个工具"的版本

---

## 🗺️ 导航

[← 上一章：函数调用与工具](/guide/tools) ｜ [返回总目录](/) ｜ [下一章：MCP →](/guide/mcp)

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

### ReAct 模式

ReAct = **Rea**soning（推理）+ **Act**ing（行动）。这是一个循环：

```
思考（Thought）→ 行动（Action / 调用工具）→ 观察（Observation）→ 重复 → 最终回答
```

回忆第 4 章：我们把"模型规划 → 代码执行 → 结果回传"走了**一遍**。

**如果把这个过程放进一个循环，反复执行直到模型不再需要工具——这就是 ReAct，也就是 Agent。**

### 示例 1：第一个智能体

第 4 章那个循环，`createAgent()` 全替你封装好了：

```typescript
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculatorTool = tool(
  async (input) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "执行数学计算。需要计算数学表达式时使用。",
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式，例如 '25 * 8'"),
    }),
  }
);

async function main() {
  console.log("🤖 你的第一个智能体\n");

  const model = createModel();

  // 就这么多——模型 + 工具 = 一个会自己思考、自己用工具的智能体
  const agent = createAgent({
    model,
    tools: [calculatorTool],
  });

  const query = "125 * 8 等于多少？";
  console.log(`👤 用户：${query}\n`);

  // createAgent 返回的是一个"图"，输入输出都用 messages 数组
  const response = await agent.invoke({
    messages: [new HumanMessage(query)],
  });

  // 取最后一条消息，就是智能体的最终回答
  const last = response.messages[response.messages.length - 1];
  console.log(`🤖 智能体：${last.content}\n`);

  console.log("💡 相比手动三步循环，createAgent() 帮你做了：");
  console.log("   • 自动执行工具并回传结果");
  console.log("   • 自动判断何时结束（不再需要工具时）");
  console.log("   • 自动处理多轮工具调用");
  console.log("   → 底层就是第 4 章那个循环，只是被封装好了");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 05-agents/code/01-create-agent.ts
```

预期输出：

```
🤖 你的第一个智能体

👤 用户：125 * 8 等于多少？

🤖 智能体：125 × 8 = **1000**

💡 相比手动三步循环，createAgent() 帮你做了：
   • 自动执行工具并回传结果
   • 自动判断何时结束（不再需要工具时）
   • 自动处理多轮工具调用
   → 底层就是第 4 章那个循环，只是被封装好了
```

> 💡 `createAgent()` 返回的是一个 **LangGraph 图**，输入输出都用 `messages` 数组。
> 这也是为什么调用形式是 `agent.invoke({ messages: [...] })`，
> 而取结果要写 `response.messages[response.messages.length - 1]`。

---

## 二、多工具自动选择

### 示例 2：一个实例，三种问题

```typescript
import { createAgent, HumanMessage, tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculatorTool = tool(
  async (input) => `结果是：${evaluate(input.expression)}`,
  {
    name: "calculator",
    description: "执行数学计算。用于算术运算。",
    schema: z.object({ expression: z.string().describe("要计算的数学表达式") }),
  }
);

const weatherTool = tool(
  async (input) => {
    const weather: Record<string, string> = {
      西雅图: "12°C，多云",
      巴黎: "18°C，晴",
      东京: "24°C，小雨",
      纽约: "21°C，多云",
    };
    return weather[input.city] ?? `${input.city} 暂无天气数据`;
  },
  {
    name: "getWeather",
    description: "查询某个城市的当前天气",
    schema: z.object({ city: z.string().describe("城市名称") }),
  }
);

const searchTool = tool(
  async (input) => {
    const db: Record<string, string> = {
      "LangChain.js":
        "LangChain.js 是一个用于构建大语言模型应用的框架，提供工具、智能体、链和记忆等能力。",
      TypeScript: "TypeScript 是在 JavaScript 之上加入静态类型的编程语言。",
    };
    return db[input.query] ?? `没有找到关于 ${input.query} 的资料`;
  },
  {
    name: "search",
    description: "搜索一般性知识。用于常识类问题。",
    schema: z.object({ query: z.string().describe("搜索关键词") }),
  }
);

async function main() {
  console.log("🎛️  多工具智能体\n");

  const agent = createAgent({
    model: createModel(),
    tools: [calculatorTool, weatherTool, searchTool],
  });

  const queries = [
    "50 * 25 等于几？",
    "东京天气怎么样？",
    "介绍一下 LangChain.js",
  ];

  for (const q of queries) {
    console.log(`👤 用户：${q}`);
    const res = await agent.invoke({ messages: [new HumanMessage(q)] });
    const last = res.messages[res.messages.length - 1];
    console.log(`🤖 智能体：${last.content}\n`);
  }

  console.log("💡 同一个智能体实例，自动处理了三种不同的问题类型。");
  console.log("   这就是生产环境里构建智能体的标准套路：");
  console.log("   1. 定义工具  2. 交给 createAgent  3. 让它自己选和执行");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 05-agents/code/02-multi-tool-agent.ts
```

预期输出（节选）：

```
🎛️  多工具智能体

👤 用户：50 * 25 等于几？
🤖 智能体：50 × 25 = **1250**

👤 用户：东京天气怎么样？
🤖 智能体：东京现在的天气是 **24°C，小雨**。

出门的话建议带把伞，气温比较舒适，但雨天路面湿滑，注意防滑和保暖别着凉～

👤 用户：介绍一下 LangChain.js
🤖 智能体：LangChain.js 是一个用于构建大语言模型应用的框架，提供工具、智能体、
链和记忆等能力。它让你用熟悉的 JavaScript / TypeScript 技术栈来开发 AI 应用……
```

同一个实例，三个问题，**自动选对了三个不同的工具**（calculator / getWeather / search），
**你不需要写任何 if/else 去分发**。

---

## 三、中间件（Middleware）：给智能体装"插件"

中间件能在"模型调用"和"工具调用"前后插入你自己的逻辑。这里演示两个最实用的：

- **动态选模型**（简单问题用便宜模型，复杂问题才切强模型）→ 省成本
- **工具错误兜底**（工具挂了也不崩）→ 更稳

### 示例 3：动态选模型 + 错误兜底

```typescript
import { createAgent, createMiddleware, HumanMessage, ToolMessage, tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculatorTool = tool(
  async (input) => `结果是：${evaluate(input.expression)}`,
  {
    name: "calculator",
    description: "执行数学计算",
    schema: z.object({ expression: z.string().describe("数学表达式") }),
  }
);

const searchTool = tool(
  async (input) => {
    // 故意制造一个失败场景：查询里含 error 就抛错
    if (input.query.toLowerCase().includes("error")) {
      throw new Error("搜索服务暂时不可用");
    }
    return `关于「${input.query}」的搜索结果：找到了一些相关资料。`;
  },
  {
    name: "search",
    description: "搜索信息",
    schema: z.object({ query: z.string().describe("搜索关键词") }),
  }
);

async function main() {
  console.log("🔧 带中间件的智能体\n");

  const basicModel = createModel();                        // 便宜/快的模型
  const capableModel = createModel({ temperature: 0.1 });  // 更强/更稳的模型

  // 中间件 1：动态选模型
  const dynamicModelSelection = createMiddleware({
    name: "DynamicModelSelection",
    wrapModelCall: (request, handler) => {
      console.log(`  [中间件] 当前消息数：${request.messages.length}`);
      if (request.messages.length > 10) {
        console.log("  [中间件] 🔄 对话很长，切换到更强模型\n");
        return handler({ ...request, model: capableModel });
      }
      console.log("  [中间件] ✓ 使用基础模型\n");
      return handler(request);
    },
  });

  // 中间件 2：工具错误兜底
  const toolErrorHandler = createMiddleware({
    name: "ToolErrorHandler",
    wrapToolCall: async (request, handler) => {
      try {
        return await handler(request);
      } catch (err: any) {
        console.error(`  [中间件] ⚠️  工具 ${request.tool?.name} 失败：${err.message}`);
        console.log("  [中间件] 🔄 返回兜底信息\n");
        return new ToolMessage({
          content: `使用工具 ${request.tool?.name} 时出错：${err.message}。我会换一种方式回答。`,
          tool_call_id: request.toolCall.id || "",
        });
      }
    },
  });

  const agent = createAgent({
    model: basicModel,
    tools: [calculatorTool, searchTool],
    middleware: [dynamicModelSelection, toolErrorHandler],
  });

  console.log("测试 1：简单计算");
  console.log("-".repeat(60));
  const r1 = await agent.invoke({ messages: [new HumanMessage("25 * 8 等于几？")] });
  console.log(`🤖 ${r1.messages[r1.messages.length - 1].content}\n\n`);

  console.log("测试 2：触发工具报错，观察兜底");
  console.log("-".repeat(60));
  const r2 = await agent.invoke({
    messages: [new HumanMessage("搜索一下 error 处理的最佳实践")],
  });
  console.log(`🤖 ${r2.messages[r2.messages.length - 1].content}\n`);

  console.log("💡 中间件的价值：");
  console.log("   • 动态选模型 → 省成本");
  console.log("   • 错误兜底 → 不崩、优雅降级");
  console.log("   • 不改动工具本身，就能改变整体行为");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 05-agents/code/03-agent-with-middleware.ts
```

预期输出（节选）：

```
测试 1：简单计算
------------------------------------------------------------
  [中间件] 当前消息数：1
  [中间件] ✓ 使用基础模型

  [中间件] 当前消息数：3
  [中间件] ✓ 使用基础模型

🤖 25 × 8 = **200**


测试 2：触发工具报错，观察兜底
------------------------------------------------------------
  [中间件] 当前消息数：1
  [中间件] ✓ 使用基础模型

  [中间件] ⚠️  工具 search 失败：搜索服务暂时不可用
  [中间件] 🔄 返回兜底信息

  [中间件] 当前消息数：4
  [中间件] ✓ 使用基础模型

🤖 搜索服务暂时不可用，我改用已有知识来回答。下面是一份比较通用的
「错误处理最佳实践」总结……
```

看两件事：

1. `[中间件]` 那几行是**我们的中间件打印的**——它在每次模型调用前被触发
2. 测试 2 里工具**真的抛错了**，但流程没崩：中间件把错误转成一条兜底信息塞回给模型，
   模型于是"换了个方式"继续回答

**常用场景**：日志监控、成本优化、自动重试、注入用户身份/权限、限流。

---

## 四、内置中间件：summarizationMiddleware

回顾第 2 章的痛点：**对话越长，token 越贵。**

`summarizationMiddleware` 会在历史过长时**自动总结压缩**，既保住上下文，又控制 token。

配置两个参数：

- `trigger` — 何时压缩（`{ tokens, messages }`，两者都满足才触发）
- `keep` — 压缩后保留多少条**原始**消息

### 示例 4：自动压缩长对话

```typescript
import { createAgent, summarizationMiddleware, HumanMessage, SystemMessage, tool } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";

const kb: Record<string, string> = {
  叠加态:
    "叠加态指量子系统在未被测量前可以同时处于多个状态，就像薛定谔的猫既死又活。这让量子比特能同时表示 0 和 1。",
  纠缠:
    "量子纠缠指两个粒子的状态相互关联，测量其中一个会瞬间影响另一个，爱因斯坦称之为「幽灵般的超距作用」。",
  隧穿:
    "量子隧穿指粒子能穿过经典物理上无法逾越的势垒。它是太阳发光（核聚变）的原因，也是芯片制程微缩的挑战。",
};

const researchTool = tool(
  async (input) => {
    const key = Object.keys(kb).find((k) => input.topic.includes(k));
    return key ? kb[key] : "量子力学描述原子尺度上物质与能量的行为，包含叠加、纠缠、隧穿等概念。";
  },
  {
    name: "research",
    description: "获取量子力学某个概念的详细解释",
    schema: z.object({ topic: z.string().describe("要研究的话题") }),
  }
);

async function main() {
  console.log("📚 内置中间件：自动总结长对话\n");

  const model = createModel();

  const agent = createAgent({
    model,
    tools: [researchTool],
    middleware: [
      summarizationMiddleware({
        model,
        trigger: { tokens: 200, messages: 4 },  // 达到任一阈值的组合时压缩
        keep: { messages: 2 },                  // 压缩后保留最近 2 条
      }),
    ],
  });

  const system = new SystemMessage(
    "你是量子物理研究助手。总是使用 research 工具给出准确详细的解释，最终回答尽量简洁。"
  );
  const messages: (SystemMessage | HumanMessage)[] = [system];

  const questions = [
    "什么是量子叠加态？",
    "量子纠缠是怎么工作的？",
    "解释一下量子隧穿",
    "它有哪些实际应用？",
    "叠加态和纠缠之间有什么联系？",
  ];

  let maxSeen = 0;
  for (let i = 0; i < questions.length; i++) {
    console.log(`\n📝 第 ${i + 1} 轮：${questions[i]}`);
    messages.push(new HumanMessage(questions[i]));

    const res = await agent.invoke({ messages: [...messages] });
    const last = res.messages[res.messages.length - 1];
    const content = String(last.content);

    console.log(`  [状态] 本轮共 ${res.messages.length} 条消息`);
    if (maxSeen > 0 && res.messages.length < maxSeen) {
      console.log("  🔄 检测到历史被压缩了（消息数下降）→ 节省了 token");
    }
    maxSeen = Math.max(maxSeen, res.messages.length);

    console.log(`🤖 ${content.length > 200 ? content.slice(0, 200) + "..." : content}`);
  }

  console.log("\n💡 小结：");
  console.log("   • summarizationMiddleware 会在历史过长时自动总结压缩");
  console.log("   • 用 trigger 控制何时压缩，keep 控制保留多少");
  console.log("   • 这是做「长期对话」类产品的必备手段");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 05-agents/code/04-summarization-middleware.ts
```

预期输出（节选，观察 `[状态]` 那几行）：

```
📝 第 1 轮：什么是量子叠加态？
  [状态] 本轮共 5 条消息
🤖 **量子叠加态**是指：一个量子系统在未被测量之前，可以同时处于多个可能状态的组合之中……

📝 第 2 轮：量子纠缠是怎么工作的？
  [状态] 本轮共 7 条消息
🤖 **量子叠加态**……

📝 第 3 轮：解释一下量子隧穿
  [状态] 本轮共 9 条消息
🤖 ## 量子叠加态……

📝 第 4 轮：它有哪些实际应用？
  [状态] 本轮共 7 条消息
  🔄 检测到历史被压缩了（消息数下降）→ 节省了 token
🤖 1. 量子叠加态：…… 2. 量子纠缠：…… 3. 量子隧穿：…… 4. 实际应用……

📝 第 5 轮：叠加态和纠缠之间有什么联系？
  [状态] 本轮共 8 条消息
  🔄 检测到历史被压缩了（消息数下降）→ 节省了 token
🤖 ……
```

关键观察：第 3 轮历史涨到 **9 条**，第 4 轮**掉回 7 条**——中间发生了**自动总结压缩**。
而且模型仍然记得前面聊过的所有概念（第 5 轮还能把三者的联系串起来）——**上下文没丢，token 省了**。

> 💡 这就是做"长期陪伴型对话"产品的必备手段：既记得住上下文，又不被 token 账单压垮。

---

## 五、亲手实现 ReAct 循环（强烈建议看）

这个示例**故意"手搓"**智能体循环，把 `createAgent()` 内部那台机器拆开给你看。

### 示例 5：手搓 ReAct

```typescript
import { AIMessage, HumanMessage, ToolMessage, tool, type BaseMessage } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculator = tool(
  async (input) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "执行数学计算",
    schema: z.object({ expression: z.string() }),
  }
);

async function main() {
  console.log("🔁 手动实现 ReAct 循环\n");

  const model = createModel();
  const modelWithTools = model.bindTools([calculator]);
  const tools: Record<string, typeof calculator> = { calculator };

  const messages: BaseMessage[] = [
    new HumanMessage("(123 + 456) * 2 等于几？再用它除以 3。"),
  ];

  const MAX_STEPS = 8;   // 安全上限，防止无限循环

  for (let step = 1; step <= MAX_STEPS; step++) {
    console.log("─".repeat(60));
    console.log(`第 ${step} 轮 · 思考（Thought）`);

    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // 没有工具调用了 → 说明任务完成，输出最终答案
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log("\n✅ 不再需要工具，任务完成");
      console.log(`🤖 最终回答：${response.content}`);
      return;
    }

    // 有工具调用 → 执行（Action）
    for (const call of response.tool_calls) {
      console.log(`行动（Action）：调用 ${call.name}，参数 ${JSON.stringify(call.args)}`);
      const t = tools[call.name];
      if (!t) {
        messages.push(
          new ToolMessage({ content: `未知工具：${call.name}`, tool_call_id: call.id || "" })
        );
        continue;
      }
      const result = await t.invoke(t.schema.parse(call.args));
      console.log(`观察（Observation）：${result}`);
      messages.push(new ToolMessage({ content: String(result), tool_call_id: call.id || "" }));
    }
  }

  console.log("⚠️  达到最大步数上限，循环停止");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 05-agents/code/05-manual-react-loop.ts
```

预期输出：

```
🔁 手动实现 ReAct 循环

────────────────────────────────────────────────────────────
第 1 轮 · 思考（Thought）
行动（Action）：调用 calculator，参数 {"expression":"(123 + 456) * 2"}
观察（Observation）：1158
行动（Action）：调用 calculator，参数 {"expression":"(123 + 456) * 2 / 3"}
观察（Observation）：386
────────────────────────────────────────────────────────────
第 2 轮 · 思考（Thought）

✅ 不再需要工具，任务完成
🤖 最终回答：- \((123 + 456) \times 2 = 1158\)
- 再除以 3：\(1158 \div 3 = 386\)

答案是 **386**。
```

有意思的细节：模型在第 1 轮里**一口气发了两个工具调用**（先算乘法、再算除法），
第 2 轮它就不再需要工具，直接给答案——**两轮就收敛了**。

> ⚠️ 注意 `MAX_STEPS = 8` 这个"刹车"。真实系统里必须有这个上限，
> 否则模型一旦陷入循环（反复调同一个工具），就会无限跑下去烧你的钱。

> 📌 **节选说明**：本示例为教学而精简——只注册了一个工具、`tools` 表也是手写的。
> 生产环境请直接用 `createAgent()`。完整可运行版本见 `code/05-manual-react-loop.ts`。

---

## 🎓 本章要点

- 智能体 = 动态决策，链 = 固定路线
- ReAct 循环：思考 → 行动 → 观察 → 重复 → 回答
- `createAgent({ model, tools })` 一行搞定，底层就是第 4 章那个循环
- **中间件**是定制智能体行为的利器（省成本、兜错、监控）
- `summarizationMiddleware` 解决长对话的 token 膨胀（历史条数会**真的下降**）
- 手搓循环能让你彻底理解"智能体不是魔法，是受控的循环"
- 永远给循环设一个步数上限

---

## 🎮 动手练习

1. 给 `02-multi-tool-agent.ts` 加一个"查询当前时间"的工具，问它"现在东京几点，天气如何"
   （需要连续用两个工具）
2. 写一个中间件，统计每次调用了哪些工具、共几次，最后打印统计
3. 把 `05-manual-react-loop.ts` 改成"支持多个工具"的版本
4. 把 `04-summarization-middleware.ts` 的 `trigger.messages` 改成 2，看压缩变得更频繁后效果如何

---

---

## 📂 本章完整代码

学到哪一章想直接翻代码，可以点这两个入口（两处内容同步，选能打开的）：

- **GitHub**：https://github.com/cleversnail/lang-chain-js-cn/tree/main/05-agents/code
- **Gitee**：https://gitee.com/snail_wn/lang-chain-js-cn/tree/main/05-agents/code

章节说明在本页，可直接运行的 `.ts` 文件在上面这两个目录里。

---

## 🗺️ 导航

[← 上一章：函数调用与工具](../04-function-calling-tools/README.md) ｜ [返回总目录](../README.md) ｜ [下一章：MCP →](../06-mcp/README.md)

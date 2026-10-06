# 第 4 章 · 函数调用与工具

> 本章是理解智能体（Agent）的**前置必修课**。工具是智能体的"手脚"——没有工具，智能体只是一台会说话的打字机。

## 🎯 本章目标

- 学会用 `tool()` 定义工具
- 理解"模型只负责**规划**，你的代码负责**执行**"这一核心分工
- 掌握完整的三步走执行闭环（生成 → 执行 → 回传）
- 让模型在多个工具中自动挑选

**本章代码**

> 📌 **代码约定**：正文的代码块都尽量保持**可直接运行**（含 import 与模型初始化）。若某段为聚焦概念的**节选**，会明确标注「节选」并指向同名的 `code/` 完整文件。

| 文件 | 内容 |
| --- | --- |
| `code/01-simple-tool.ts` | 定义第一个工具 |
| `code/02-tool-calling.ts` | 把工具挂到模型上，观察工具调用 |
| `code/03-tool-execution-loop.ts` | 完整的三步走闭环 |
| `code/04-multiple-tools.ts` | 多工具自动选择 |

---

## 一、工具长什么样

一个工具 = **一个函数** + **一段"说明书"**。

### 示例 1：定义一个计算器工具

```typescript
import { tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";

// 定义一个计算器工具
const calculatorTool = tool(
  async (input) => {
    // 用 mathjs 安全求值（比 eval / new Function 安全，只允许数学运算）
    try {
      const result = evaluate(input.expression);
      return `结果是：${result}`;
    } catch (err) {
      return `表达式求值失败：${err instanceof Error ? err.message : String(err)}`;
    }
  },
  {
    name: "calculator",
    description: "用于执行数学计算。需要计算数字时使用它。",
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式，例如 '25 * 4'"),
    }),
  }
);

async function main() {
  console.log("🧮 一个简单的计算器工具\n");
  console.log("=".repeat(72));

  console.log("\n工具名：", calculatorTool.name);
  console.log("工具描述：", calculatorTool.description);
  console.log("参数列表：", Object.keys(calculatorTool.schema.shape).join(", "));

  console.log("\n" + "=".repeat(72));
  console.log("\n直接调用工具（不经过模型）：");

  for (const expr of ["25 * 17", "(100 + 50) / 2", "sqrt(144)"]) {
    const result = await calculatorTool.invoke({ expression: expr });
    console.log(`  ${expr} = ${result}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n✅ 工具的三要素：");
  console.log("   • 函数本体：真正干活的代码");
  console.log("   • name：模型引用它时的名字");
  console.log("   • description + schema：告诉模型“这是干嘛的、参数长什么样”");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 04-function-calling-tools/code/01-simple-tool.ts
```

预期输出：

```
🧮 一个简单的计算器工具

========================================================================

工具名： calculator
工具描述： 用于执行数学计算。需要计算数字时使用它。
参数列表： expression

========================================================================

直接调用工具（不经过模型）：
  25 * 17 = 结果是：425
  (100 + 50) / 2 = 结果是：75
  sqrt(144) = 结果是：12

========================================================================

✅ 工具的三要素：
   • 函数本体：真正干活的代码
   • name：模型引用它时的名字
   • description + schema：告诉模型"这是干嘛的、参数长什么样"
```

三个关键部分：

- **name** — 模型引用它时的名字
- **description** — 决定模型**什么时候该用它**（写得越清楚，选得越准）
- **schema** — 用 Zod 定义参数，既做校验，又告诉模型参数长什么样

> 比喻：这就像给员工一张"岗位说明卡"。说明卡写得越清楚，经理（模型）派活越准。

> 💡 本示例**不经模型**直接调用工具（`calculatorTool.invoke(...)`），
> 让你先确认工具本身是好的——这是排查问题时非常有用的习惯：
> **先单独验证工具，再让它参与模型调用。**

---

## 二、⭐ 最重要的一点：模型不会执行函数

**新手最容易误解的一点**：以为模型调用工具时会自己去跑那个函数。

**不会。** 模型只会生成一个"工具调用请求"。

### 示例 2：观察模型如何发起调用

```typescript
import { tool } from "langchain";
import * as z from "zod";
import { evaluate } from "mathjs";
import { createModel } from "../../lib/model.js";

const calculatorTool = tool(
  async (input) => String(evaluate(input.expression)),
  {
    name: "calculator",
    description: "执行数学计算",
    schema: z.object({ expression: z.string().describe("要计算的数学表达式") }),
  }
);

async function main() {
  console.log("🔗 工具调用演示\n");
  console.log("=".repeat(72) + "\n");

  const model = createModel();

  // bindTools：把工具"介绍"给模型（不执行，只是让它知道有哪些工具）
  const modelWithTools = model.bindTools([calculatorTool]);

  console.log("🤖 提问：25 * 17 等于几？\n");
  const response = await modelWithTools.invoke("25 * 17 等于几？");

  console.log("文本内容（content）：", response.content);
  console.log("\n工具调用（tool_calls）：");
  console.log(JSON.stringify(response.tool_calls, null, 2));

  if (response.tool_calls && response.tool_calls.length > 0) {
    const call = response.tool_calls[0];
    console.log("\n" + "-".repeat(72));
    console.log("✅ 模型生成了一个工具调用！");
    console.log("   工具名：", call.name);
    console.log("   参数：", call.args);
    console.log("   调用 ID：", call.id);
    console.log("\n💡 注意：模型只是“描述了要做什么”，并没有真的算。");
    console.log("   下一步（示例 3）才由你的代码去执行。");
  }
}

main().catch(console.error);
```

运行：

```bash
npx tsx 04-function-calling-tools/code/02-tool-calling.ts
```

预期输出：

```
🔗 工具调用演示

========================================================================

🤖 提问：25 * 17 等于几？

文本内容（content）： 

工具调用（tool_calls）：
[
  {
    "name": "calculator",
    "args": {
      "expression": "25 * 17"
    },
    "type": "tool_call",
    "id": "call_00_DvUx99BKykXgHtjxEsGR8319"
  }
]

------------------------------------------------------------------------
✅ 模型生成了一个工具调用！
   工具名： calculator
   参数： { expression: '25 * 17' }
   调用 ID： call_00_DvUx99BKykXgHtjxEsGR8319
```

**注意两个细节**：

1. `content` 是**空的**——因为模型决定"我要调工具"而不是"直接说话"，所以没有文本内容
2. `tool_calls` 里只有**工具名和参数**，**没有结果**——真正的执行是你的代码来做的

这样设计的好处：

- **安全** — 模型无法越过你的代码执行任何危险操作
- **灵活** — 换实现不用重新训练模型
- **可靠** — 你可以在执行前后做校验、重试、兜底

---

## 三、完整的三步走闭环

这是本章的核心，也是 Agent 的底层原理。

### 示例 3：三步走

```typescript
import { AIMessage, HumanMessage, ToolMessage, tool } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";

const weatherTool = tool(
  async (input) => {
    // 模拟一次"查天气"的 API 调用
    // 注意：键名要和用户提问的语言一致，否则会查不到（这是个常见坑）
    const temps: Record<string, string> = {
      西雅图: "12°C，多云",
      巴黎: "18°C，晴",
      东京: "24°C，小雨",
      伦敦: "14°C，阴",
    };
    return `${input.city} 当前天气：${temps[input.city] ?? "暂无数据"}`;
  },
  {
    name: "getWeather",
    description: "查询某个城市的当前天气",
    schema: z.object({ city: z.string().describe("城市名") }),
  }
);

async function main() {
  console.log("🔄 完整的工具执行闭环\n");
  console.log("=".repeat(72) + "\n");

  const model = createModel();
  const modelWithTools = model.bindTools([weatherTool]);

  const query = "西雅图现在天气怎么样？";
  console.log(`用户：${query}\n`);

  // ===== 第 1 步：模型生成工具调用 =====
  console.log("=== 第 1 步：模型生成工具调用（规划）===");
  const response1 = await modelWithTools.invoke([new HumanMessage(query)]);

  if (!response1.tool_calls || response1.tool_calls.length === 0) {
    console.log("模型没有发起工具调用");
    return;
  }
  const call = response1.tool_calls[0];
  console.log(`✅ 模型决定调用：${call.name}`);
  console.log(`   参数：${JSON.stringify(call.args)}`);
  console.log("💡 模型只是“描述了要做什么”，没有真的执行。\n");

  // ===== 第 2 步：你的代码执行工具 =====
  console.log("=== 第 2 步：你的代码执行工具（执行）===");
  // 用 schema.parse 校验并转换参数，拒绝脏数据
  const toolResult = await weatherTool.invoke(weatherTool.schema.parse(call.args));
  console.log(`✅ 工具真实返回：${toolResult}`);
  console.log("💡 真正的 API 调用 / 数据库查询，发生在这里。\n");

  // ===== 第 3 步：把结果回传给模型 =====
  console.log("=== 第 3 步：把结果回传给模型（沟通）===");
  const messages = [
    new HumanMessage(query),
    new AIMessage({ content: response1.content, tool_calls: response1.tool_calls }),
    new ToolMessage({ content: String(toolResult), tool_call_id: call.id || "" }),
  ];
  const finalResponse = await model.invoke(messages);
  console.log("✅ 模型组织出的最终回答：");
  console.log("   ", finalResponse.content);

  console.log("\n" + "=".repeat(72));
  console.log("\n🎓 三步走的意义：");
  console.log("   • 模型负责：理解意图 + 组织自然语言");
  console.log("   • 你的代码负责：真正执行 + 安全控制 + 参数校验");
  console.log("   → 模型永远无法越过你的代码去执行任何东西（安全边界）");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 04-function-calling-tools/code/03-tool-execution-loop.ts
```

预期输出：

```
用户：西雅图现在天气怎么样？

=== 第 1 步：模型生成工具调用（规划）===
✅ 模型决定调用：getWeather
   参数：{"city":"西雅图"}
💡 模型只是"描述了要做什么"，没有真的执行。

=== 第 2 步：你的代码执行工具（执行）===
✅ 工具真实返回：西雅图 当前天气：12°C，多云
💡 真正的 API 调用 / 数据库查询，发生在这里。

=== 第 3 步：把结果回传给模型（沟通）===
✅ 模型组织出的最终回答：
    西雅图目前天气：12°C，多云。

温度偏凉，建议外出时带一件外套。如果你需要更详细的信息（比如体感温度、
湿度、未来几天的预报或降雨概率），告诉我，我可以再帮你查。
```

**第 3 步是升华点**：工具返回的是干巴巴的 `西雅图 当前天气：12°C，多云`，
模型把它变成了**有温度的自然语言**（还主动建议带外套）。

> 💡 **如果把这三步放进一个 `while` 循环反复执行，直到模型不再请求工具——
> 恭喜你，你自己实现了一个 Agent。** 第 5 章的 `createAgent()` 就是把这个循环封装好了。

> ⚠️ 本示例演示了一个真实的坑：工具的数据表最初用英文键（`Seattle`），
> 而用户用中文提问（`西雅图`），结果查不到、返回"暂无数据"。
> **工具的键名/接口要和用户的输入语言对齐**，否则功能"看起来通了、实际没通"。

---

## 四、多工具自动选择

### 示例 4：三个工具，自动分发

```typescript
import { tool } from "langchain";
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

const search = tool(
  async (input) => {
    const db: Record<string, string> = {
      "法国的首都": "巴黎",
      "东京的人口": "约 1400 万",
      "谁发明了 JavaScript": "Brendan Eich",
    };
    // 容错匹配：模型给的关键词不一定和键名逐字相同
    const q = input.query.trim();
    const key =
      Object.keys(db).find((k) => q.includes(k) || k.includes(q)) ??
      Object.keys(db).find((k) => q.includes("法国") && k.includes("法国"));
    return key ? db[key] : `没有找到「${input.query}」的结果`;
  },
  {
    name: "search",
    description:
      "查询事实性信息。凡是涉及首都、人口、发明者等客观事实的问题，都必须调用此工具查询，不要凭记忆直接回答。",
    schema: z.object({ query: z.string() }),
  }
);

const weather = tool(
  async (input) => `${input.city} 天气：24°C，晴`,
  {
    name: "getWeather",
    description: "查询某个城市的当前天气",
    schema: z.object({ city: z.string() }),
  }
);

async function main() {
  console.log("🎛️  多工具演示\n");
  console.log("=".repeat(72) + "\n");

  const modelWithTools = createModel().bindTools([calculator, search, weather]);

  const queries = [
    "125 * 8 等于几？",
    "法国的首都是哪里？",
    "东京天气怎么样？",
  ];

  for (const q of queries) {
    console.log(`提问：${q}`);
    const res = await modelWithTools.invoke(q);
    if (res.tool_calls && res.tool_calls.length > 0) {
      const call = res.tool_calls[0];
      console.log(`  ✓ 选中的工具：${call.name}`);
      console.log(`  ✓ 参数：${JSON.stringify(call.args)}`);
    } else {
      console.log("  ✗ 未生成工具调用");
    }
    console.log("-".repeat(72));
  }

  console.log("\n💡 结论：");
  console.log("   • 模型会根据问题自动挑选合适的工具");
  console.log("   • description 写得越清楚，选得越准");
  console.log("   • 工具越多，能力越强（但要注意别让描述互相混淆）");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 04-function-calling-tools/code/04-multiple-tools.ts
```

预期输出：

```
提问：125 * 8 等于几？
  ✓ 选中的工具：calculator
  ✓ 参数：{"expression":"125 * 8"}
------------------------------------------------------------------------
提问：法国的首都是哪里？
  ✓ 选中的工具：search
  ✓ 参数：{"query":"法国的首都"}
------------------------------------------------------------------------
提问：东京天气怎么样？
  ✓ 选中的工具：getWeather
  ✓ 参数：{"city":"东京"}
------------------------------------------------------------------------
```

三个问题，三个不同的工具，**你不需要写任何 if/else 去分发**。

> ⚠️ 这里也藏着一个真实的坑：`search` 工具最初的描述只是"查询事实性信息"，
> 结果模型**直接凭记忆回答了"法国的首都是巴黎"**，压根没调工具。
> 把描述改成"**凡是涉及首都、人口、发明者等客观事实的问题，都必须调用此工具查询，
> 不要凭记忆直接回答**"之后，它才稳定地调用。
>
> **结论：工具描述不只是"说明书"，它还是"调度指令"。**
> 想让模型必用某个工具，就在描述里明确要求。

---

## 🎓 本章要点

- 工具 = 函数 + 说明书（name / description / schema）
- **模型只规划，不执行**；执行永远是你的代码
- 三步走：生成工具调用 → 执行 → 回传结果
- 回传后模型会把干巴巴的数据**组织成人话**
- 把三步放进循环 = Agent（下一章见）
- **工具描述的清晰度、以及数据与输入语言的匹配度，直接决定功能是否真的生效**

---

## 🎮 动手练习

1. 给 `01-simple-tool.ts` 加一个 `getCurrentTime` 工具（返回当前时间），让它能被模型调用
2. 修改 `03-tool-execution-loop.ts`：在"第 2 步"里加一句
   `if (call.args.city === "禁止的城市") throw new Error("不允许查询")`，观察模型如何应对工具报错
3. 写一个**多工具 + 循环**的版本，让它能连续调用多个工具（这就是手搓 Agent！）

---

## 🗺️ 导航

[← 上一章：提示词、消息与结构化输出](../03-prompts-messages-outputs/README.md) ｜ [返回总目录](../README.md) ｜ [下一章：智能体 →](../05-agents/README.md)

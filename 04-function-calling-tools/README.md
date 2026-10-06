# 第 4 章 · 函数调用与工具

> 本章是理解智能体（Agent）的**前置必修课**。工具是智能体的"手脚"——没有工具，智能体只是一台会说话的打字机。

## 🎯 本章目标

- 学会用 `tool()` 定义工具
- 理解"模型只负责**规划**，你的代码负责**执行**"这一核心分工
- 掌握完整的三步走执行闭环（生成 → 执行 → 回传）
- 让模型在多个工具中自动挑选

**本章代码**

| 文件 | 内容 |
| --- | --- |
| `code/01-simple-tool.ts` | 定义第一个工具 |
| `code/02-tool-calling.ts` | 把工具挂到模型上，观察工具调用 |
| `code/03-tool-execution-loop.ts` | 完整的三步走闭环 |
| `code/04-multiple-tools.ts` | 多工具自动选择 |

---

## 一、工具长什么样

一个工具 = **一个函数** + **一段"说明书"**。

```typescript
const calculatorTool = tool(
  // ① 函数本体：真正干活的代码
  async (input) => {
    const result = evaluate(input.expression);
    return `结果是：${result}`;
  },
  // ② 说明书：名字 + 描述 + 参数 schema
  {
    name: "calculator",
    description: "用于执行数学计算。需要计算数字时使用它。",
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式，例如 '25 * 4'"),
    }),
  }
);
```

三个关键字：

- **name** — 模型引用它时的名字
- **description** — 决定模型**什么时候该用它**（写得越清楚，选得越准）
- **schema** — 用 Zod 定义参数，既做校验，又告诉模型参数长什么样

> 比喻：这就像给餐厅员工一张"岗位说明卡"。说明卡写得越清楚，经理（模型）派活越准。

---

## 二、⭐ 最重要的一点：模型不会执行函数

**新手最容易误解的一点**：以为模型调用工具时会自己去跑那个函数。

**不会。** 模型只会生成一个"工具调用请求"：

```typescript
const modelWithTools = model.bindTools([calculatorTool]);
const response = await modelWithTools.invoke("25 * 17 等于几？");

console.log(response.content);      // 一段文字（可能是空的）
console.log(response.tool_calls);   // [{ name: "calculator", args: { expression: "25*17" }, id: "..." }]
```

注意：`response.tool_calls` 里只有**工具名和参数**，没有结果。**真正的执行，是你的代码来做的。**

这样设计的好处：

- **安全** — 模型无法越过你的代码执行任何危险操作
- **灵活** — 换实现不用重新训练模型
- **可靠** — 你可以在执行前后做校验、重试、兜底

---

## 三、完整的三步走闭环

这是本章的核心，也是 Agent 的底层原理（三块拼图：规划 / 执行 / 沟通）。

### 第 1 步：模型生成工具调用（规划 Planning）

```typescript
const response1 = await modelWithTools.invoke([new HumanMessage(query)]);
const call = response1.tool_calls[0];
// → { name: "getWeather", args: { city: "西雅图" }, id: "call_abc" }
```

模型只**描述**要做什么，不执行。

### 第 2 步：你的代码执行工具（执行 Doing）

```typescript
const toolResult = await weatherTool.invoke(weatherTool.schema.parse(call.args));
```

真正的 API 调用 / 数据库查询发生在这里。这里也是你做**参数校验、权限控制、错误兜底**的地方。

### 第 3 步：把结果回传给模型（沟通 Communicating）

```typescript
const messages = [
  new HumanMessage(query),
  new AIMessage({ content: response1.content, tool_calls: response1.tool_calls }),
  new ToolMessage({ content: String(toolResult), tool_call_id: call.id || "" }),
];
const finalResponse = await model.invoke(messages);
```

模型收到工具结果后，把它组织成人话。

```
┌─────────────┐   工具调用   ┌──────────────┐
│  模型(规划)  │ ──────────▶ │ 你的代码(执行) │
└─────────────┘             └──────────────┘
       ▲                            │
       └───────── 结果回传 ◀────────┘
```

> 💡 **如果把这"三步"放进一个 `while` 循环反复执行，直到模型不再请求工具——恭喜你，你自己实现了一个 Agent。** 第 5 章的 `createAgent()` 就是把这个循环替你封装好了。

运行：

```bash
npx tsx 04-function-calling-tools/code/03-tool-execution-loop.ts
```

---

## 四、多工具自动选择

```typescript
const modelWithTools = model.bindTools([calculator, search, weather]);
```

模型会根据问题自动挑选：

| 提问 | 选中的工具 |
| --- | --- |
| "125 * 8 等于几？" | `calculator` |
| "法国的首都是哪里？" | `search` |
| "东京天气怎么样？" | `getWeather` |

**描述写得越清楚，选得越准。** 如果两个工具描述含糊、功能重叠，模型就会选错。

---

## 🎓 本章要点

- 工具 = 函数 + 说明书（name / description / schema）
- **模型只规划，不执行**；执行永远是你的代码
- 三步走：生成工具调用 → 执行 → 回传结果
- 把三步放进循环 = Agent（下一章见）
- 工具描述的清晰度，直接决定模型的选择质量

---

## 🎮 动手练习

1. 给 `01-simple-tool.ts` 加一个 `getCurrentTime` 工具（返回当前时间），让模型在合适的时候调用
2. 修改 `03-tool-execution-loop.ts`：在"第 2 步"里加一个 `if (call.args.city === "禁止的城市") throw ...`，观察模型如何应对工具报错
3. 写一个**多工具 + 循环**的版本，让它能连续调用多个工具（这就是手搓 Agent！）

---

## 🗺️ 导航

[← 上一章：提示词、消息与结构化输出](../03-prompts-messages-outputs/README.md) ｜ [返回总目录](../README.md) ｜ [下一章：智能体 →](../05-agents/README.md)

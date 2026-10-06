# 第 2 章 · 对话模型与基础交互

## 🎯 本章目标

- 搞懂"多轮对话"到底是怎么实现的
- 学会流式输出（Streaming）
- 用 `temperature` / `maxTokens` 控制模型行为
- 处理错误并自动重试
- 理解 token 用量与成本

**本章代码**

> 📌 **代码约定**：正文的代码块都尽量保持**可直接运行**（含 import 与模型初始化）。若某段为聚焦概念的**节选**，会明确标注「节选」并指向同名的 `code/` 完整文件。

| 文件 | 内容 |
| --- | --- |
| `code/01-multi-turn.ts` | 多轮对话：记忆的本质 |
| `code/02-streaming.ts` | 流式输出，边生成边显示 |
| `code/03-parameters.ts` | temperature 与 maxTokens |
| `code/04-error-handling.ts` | 错误处理与 withRetry() |
| `code/05-token-usage.ts` | Token 用量与成本 |

---

## 一、⭐ 最重要的一节课：模型其实没有记忆

很多人第一次用大模型都会困惑：**"为什么它记不住我上一句说的话？"**

真相是：**大模型是无状态的（stateless）。** 它每次收到请求，都只处理你这次发过去的内容，处理完就"忘光"。它自己不会记住任何东西。

那 ChatGPT 里"它记得我聊过什么"是怎么回事？

答案是：**客户端每次把完整对话历史一起发过去。** 所谓"记忆"，只是"每次都把之前的聊天记录附上"而已。

```
第 1 次请求：[系统, 用户A]                    → AI 回复 B
第 2 次请求：[系统, 用户A, AI_B, 用户C]        → AI 回复 D
第 3 次请求：[系统, 用户A, AI_B, 用户C, AI_D, 用户E] → …
```

看 `code/01-multi-turn.ts`，你会发现核心动作就一个：

```typescript
messages.push(new AIMessage(String(response.content)));  // 把 AI 的回复也存进历史
```

> 💡 **代价**：历史越长，每次请求携带的 token 越多 → 越贵、越慢，最终还会撑爆"上下文窗口"。怎么解决？正是 `05-token-usage.ts` 和第 5 章要讲的。

运行：

```bash
npx tsx 02-chat-models/code/01-multi-turn.ts
```

---

## 二、流式输出（Streaming）

### 比喻：打字机 vs 一次性递一沓纸

- **非流式**：模型把整段话全部生成完，再一次性返回。用户盯着空白页干等。
- **流式**：模型每生成一小块（几个字），就立刻吐出来。用户马上看到字在"长出来"。

两者的**总耗时其实差不多**，但流式的**感知速度**快得多，用户体验天差地别。

```typescript
import { createModel } from "../lib/model.js";

const model = createModel();
const prompt = "用两段话解释互联网是如何工作的。";

const stream = await model.stream(prompt);
for await (const chunk of stream) {
  process.stdout.write(String(chunk.content));   // 逐块写出去
}
```

运行：

```bash
npx tsx 02-chat-models/code/02-streaming.ts
```

**结论**：只要你要做聊天界面（不管是网页还是终端），**一定要用流式**。

---

## 三、模型参数

### temperature（温度）

控制随机性。可以想象成"给模型倒多少酒"：

| 取值 | 效果 | 适合场景 |
| --- | --- | --- |
| 0.0 | 高度确定，同输入几乎同输出 | 代码、事实问答、数据抽取 |
| 0.7 ~ 1.0 | 平衡，默认区间 | 一般对话 |
| 1.5 ~ 2.0 | 非常发散、有创意 | 头脑风暴、创意写作 |

> ⚠️ 不同模型的取值范围不同。有的模型（例如某些推理型模型）**只支持 temperature=1**，传别的值会报错。示例代码里做了容错处理。

### maxTokens

限制回复的最大长度，用来**控成本、控篇幅**。设得太小，回复会被"戛然而止"地截断。

运行：

```bash
npx tsx 02-chat-models/code/03-parameters.ts
```

---

## 四、错误处理与自动重试

真实环境里，**限流（429）和瞬时网络错误是常态**，不是意外。所以：

```typescript
import { createModel } from "../lib/model.js";

const model = createModel();
const prompt = "你好";

// 兜底：用 try/catch 捕获异常
try {
  const res = await model.invoke(prompt);
  console.log(res.content);
} catch (err) {
  console.error("调用失败：", err);
}

// 重试：用内置的指数退避重试抵御瞬时故障
const robust = model.withRetry({ stopAfterAttempt: 3 });
const res2 = await robust.invoke(prompt);
console.log(res2.content);
```

`withRetry()` 会自动做**指数退避重试**，不需要你写循环。

**按错误类型分别处理：**

| 错误 | 含义 | 处理 |
| --- | --- | --- |
| 401 / Unauthorized | 鉴权失败 | 检查 API Key |
| 429 / rate limit | 触发限流 | 用 `withRetry()` |
| timeout | 超时 | 增大超时时间或重试 |

运行：

```bash
npx tsx 02-chat-models/code/04-error-handling.ts
```

---

## 五、Token 用量与成本

**Token 是模型处理文本的最小单位。** 粗略换算：**1 token ≈ 4 个字符 ≈ ¾ 个英文单词**。

为什么要关心：

- 模型有 **token 上限**（上下文窗口）
- 计费**按 token** 算
- token 越多，响应越慢
- 多轮对话中，历史越长，每次请求的输入 token 越多

LangChain v1 会把用量信息挂在返回消息上：

```typescript
import { HumanMessage, SystemMessage } from "langchain";
import { createModel } from "../lib/model.js";

const model = createModel();
const messages = [
  new SystemMessage("你是一位简洁的助手。"),
  new HumanMessage("用一句话介绍你自己。"),
];

const res = await model.invoke(messages);
console.log(res.usage_metadata);  // input_tokens / output_tokens / total_tokens
```

运行：

```bash
npx tsx 02-chat-models/code/05-token-usage.ts
```

---

## 🎓 本章要点

- **模型无状态**；"记忆"= 每次把历史一起发过去
- **流式**让体验更好，做聊天界面必用
- **temperature** 管风格，**maxTokens** 管长度
- 用 **try/catch + withRetry()** 应对真实世界的故障
- **token** 既是成本也是瓶颈，多轮对话要当心历史膨胀

---

## 🎮 动手练习

1. 改造 `01-multi-turn.ts`：用 `readline` 做个真正的循环，让用户能一直聊下去
2. 改造 `02-streaming.ts`：把流式内容**同时**收集成一个完整字符串，最后打印总长度
3. 在 `03-parameters.ts` 里试试 `temperature = 1.5`（如果你的模型支持）

---

## 🗺️ 导航

[← 上一章：入门](/guide/introduction) ｜ [返回总目录](/) ｜ [下一章：提示词、消息与结构化输出 →](/guide/prompts)

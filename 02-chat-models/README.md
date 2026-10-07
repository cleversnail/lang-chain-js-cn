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

### 示例 1：多轮对话

完整代码就在 `code/01-multi-turn.ts`。核心动作只有一个：
**把 AI 的回复也 push 进历史**。

```typescript
import { HumanMessage, AIMessage, SystemMessage, type BaseMessage } from "langchain";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("💬 多轮对话示例\n");

  const model = createModel();

  // 对话历史：一个数组，每次往返都往里追加
  const messages: BaseMessage[] = [
    new SystemMessage("你是一位编程导师，回答简洁清晰。"),
    new HumanMessage("什么是 TypeScript？"),
  ];

  console.log("👤 用户：什么是 TypeScript？");
  const r1 = await model.invoke(messages);
  console.log("\n🤖 AI：", r1.content);
  messages.push(new AIMessage(String(r1.content)));   // ← 关键：把 AI 的回复也存进历史

  console.log("\n👤 用户：能举个简单例子吗？");
  messages.push(new HumanMessage("能举个简单例子吗？"));
  const r2 = await model.invoke(messages);
  console.log("\n🤖 AI：", r2.content);
  messages.push(new AIMessage(String(r2.content)));

  console.log("\n👤 用户：和 JavaScript 相比有什么好处？");
  messages.push(new HumanMessage("和 JavaScript 相比有什么好处？"));
  const r3 = await model.invoke(messages);
  console.log("\n🤖 AI：", r3.content);

  console.log(`\n\n✅ 注意：AI 在整个过程中保持了上下文！`);
  console.log(`📊 当前对话历史共有 ${messages.length} 条消息`);
  console.log("💡 想想：如果历史无限增长，会带来什么问题？（见 05-token-usage.ts）");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 02-chat-models/code/01-multi-turn.ts
```

预期输出（节选，内容因模型而异）：

```
💬 多轮对话示例

👤 用户：什么是 TypeScript？

🤖 AI： TypeScript 是微软开发的 JavaScript 超集：任何合法的 JavaScript 基本都能在
TypeScript 中运行，同时它增加了静态类型系统……

👤 用户：能举个简单例子吗？

🤖 AI： 可以，看一个更直观的例子：……（略）

👤 用户：和 JavaScript 相比有什么好处？

🤖 AI： 和 JavaScript 相比，TypeScript 主要有这些好处：更早发现错误、更好的代码
提示、重构更安全、代码即文档……

✅ 注意：AI 在整个过程中保持了上下文！
📊 当前对话历史共有 6 条消息
```

> 💡 **代价**：历史越长，每次请求携带的 token 越多 → 越贵、越慢，最终还会撑爆"上下文窗口"。怎么解决？正是 `05-token-usage.ts` 和第 5 章要讲的。

---

## 二、流式输出（Streaming）

### 比喻：打字机 vs 一次性递一沓纸

- **非流式**：模型把整段话全部生成完，再一次性返回。用户盯着空白页干等。
- **流式**：模型每生成一小块（几个字），就立刻吐出来。用户马上看到字在"长出来"。

两者的**总耗时其实差不多**，但流式的**感知速度**快得多，用户体验天差地别。

### 示例 2：流式 vs 非流式对比

```typescript
import { createModel } from "../../lib/model.js";

const prompt = "用两段话解释互联网是如何工作的。";

async function nonStreaming() {
  console.log("📝 非流式（传统方式，等全部生成完）：\n");
  const model = createModel();
  const start = Date.now();
  const res = await model.invoke(prompt);
  console.log(res.content);
  console.log(`\n⏱️  全部内容在 ${Date.now() - start}ms 后一次性返回\n`);
}

async function streaming() {
  console.log("=".repeat(72));
  console.log("⚡ 流式（边生成边显示，首字更快）：\n");
  const model = createModel();

  const start = Date.now();
  let firstChunk = 0;

  // stream() 返回一个异步迭代器，逐块吐出内容
  const stream = await model.stream(prompt);
  for await (const chunk of stream) {
    if (firstChunk === 0) firstChunk = Date.now();
    process.stdout.write(String(chunk.content));   // 不加换行，连续输出
  }

  console.log("\n");
  console.log(`⏱️  首块到达：${firstChunk - start}ms`);
  console.log(`⏱️  全部完成：${Date.now() - start}ms`);
  console.log("\n✅ 注意：虽然总耗时相近，但流式的“感知速度”快得多！");
}

async function main() {
  console.log("🎯 流式 vs 非流式对比\n");
  console.log("=".repeat(72));
  await nonStreaming();
  await streaming();
  console.log("\n💡 做聊天界面时，一定要用流式——用户能立刻看到反馈。");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 02-chat-models/code/02-streaming.ts
```

预期输出（节选）：

```
📝 非流式（传统方式，等全部生成完）：

互联网本质上是一个由无数计算机、服务器、路由器和光缆……（两段话）

⏱️  全部内容在 3726ms 后一次性返回

========================================================================
⚡ 流式（边生成边显示，首字更快）：

互联网本质上是"网络的网络"：你的手机或电脑先通过 Wi-Fi……（字一个个出现）

⏱️  首块到达：160ms
⏱️  全部完成：4308ms

✅ 注意：虽然总耗时相近，但流式的"感知速度"快得多！
```

**关键对比**：非流式要等 **3726ms** 才看到第一个字；流式 **160ms** 就开始出字了
（总耗时反而略长，但用户早就在看内容了）。

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

限制回复的最大长度，用来**控成本、控篇幅**。

> ⚠️ **推理型模型的坑**：如果模型"先思考、再作答"（比如 DeepSeek 的推理模型），
> `maxTokens` 限制的是「**思考 + 正文**」的总量。预算设太小，token 会全花在思考上，
> **正文一个字都没有**，而且**不会报错**。示例里专门演示并检测了这种情况。

### 示例 3：参数演示

```typescript
import { createModel } from "../../lib/model.js";

const prompt = "给一个关于时间旅行的科幻故事写一句有创意的开场白。";

async function temperatureDemo() {
  console.log(`🌡️  温度对比（模型：${process.env.AI_MODEL}）\n`);
  console.log("=".repeat(72));

  for (const temp of [0, 1]) {
    console.log(`\n温度 = ${temp}（同一提示词跑 2 次）：`);
    console.log("-".repeat(72));
    try {
      for (let i = 1; i <= 2; i++) {
        const res = await createModel({ temperature: temp }).invoke(prompt);
        console.log(`  第 ${i} 次：${res.content}`);
      }
    } catch (err: any) {
      console.log(`  ⚠️  该模型不支持 temperature=${temp}，已跳过（${err?.message ?? err}）`);
    }
  }
  console.log("\n💡 温度 0：两次几乎一样；温度 1：两次更有变化。");
}

async function maxTokensDemo() {
  console.log("\n\n📏 maxTokens 长度限制\n");
  console.log("=".repeat(72));

  for (const maxTokens of [40, 300, 2000]) {
    console.log(`\nmaxTokens = ${maxTokens}：`);
    console.log("-".repeat(72));
    try {
      const res = await createModel({ maxTokens }).invoke(
        "用五段话详细解释什么是机器学习。"
      );
      const content = String(res.content);
      const meta: any = (res as any).response_metadata ?? {};
      const usage: any = (res as any).usage_metadata ?? {};
      const reasoning = usage?.output_token_details?.reasoning;

      if (!content.trim()) {
        console.log("  ⚠️  回复为空（正文 0 字）——这是个重要现象，不是 bug：");
        console.log(`     finish_reason = ${meta.finish_reason ?? "?"}，本次输出 token 全花在「思考」上了` +
          (reasoning !== undefined ? `（思考 ${reasoning} tokens）` : ""));
        console.log("     💡 原因：该模型是「推理型模型」，会先思考、再作答；");
        console.log("        maxTokens 限制的是「思考 + 正文」的总量，预算太小就只剩思考。");
        console.log("        → 把 maxTokens 调大即可看到正文。");
      } else {
        console.log(content);
        console.log(`\n（正文 ${content.length} 字，finish_reason = ${meta.finish_reason ?? "?"}）`);
      }
    } catch (err: any) {
      console.log(`  ⚠️  该模型不支持 maxTokens=${maxTokens}，已跳过（${err?.message ?? err}）`);
    }
  }
  console.log("\n💡 限制越紧，回复越短；太小会被「截断」，甚至只剩思考、没有正文。");
}

async function main() {
  console.log("🎛️  模型参数演示\n");
  await temperatureDemo();
  await maxTokensDemo();
  console.log("\n\n✅ 小结：温度管“风格”，maxTokens 管“长度”。");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 02-chat-models/code/03-parameters.ts
```

预期输出（节选）：

```
🌡️  温度对比（模型：deepseek-flash）

温度 = 0（同一提示词跑 2 次）：
  第 1 次：“我收到的第一封来自未来的信，是用我自己的骨灰写的，落款日期是昨天。”
  第 2 次：“我最后一次穿越时间，是为了参加自己的第一次时间旅行……”

温度 = 1（同一提示词跑 2 次）：
  第 1 次：我在时间尽头开了一家当铺，专收被未来退回来的过去……
  第 2 次：我第一次穿越时间，是为了参加自己的葬礼……

📏 maxTokens 长度限制

maxTokens = 40：
  ⚠️  回复为空（正文 0 字）——这是个重要现象，不是 bug：
     finish_reason = length，本次输出 token 全花在「思考」上了（思考 40 tokens）
     💡 原因：该模型是「推理型模型」，会先思考、再作答；
        maxTokens 限制的是「思考 + 正文」的总量，预算太小就只剩思考。
        → 把 maxTokens 调大即可看到正文。

maxTokens = 300：
  ⚠️  回复为空（正文 0 字）……（同上）

maxTokens = 2000：
  机器学习是人工智能的一个核心分支，它的目标是让计算机不必由人逐条编写规则……
  （正文 1340 字，finish_reason = stop）
```

**你会观察到**：

- 温度 0 的两次回答风格接近、收束稳定；温度 1 的两次明显更跳脱
- `maxTokens` 设成 40 / 300 时**正文完全为空**，因为预算被"思考"吃光了
- 调到 2000 才有完整正文（1340 字）

> 💡 这就是为什么不要盲目给推理型模型设很小的 `maxTokens`——
> 它不报错，只是静悄悄地什么都不说。

---

## 四、错误处理与自动重试

真实环境里，**限流（429）和瞬时网络错误是常态**，不是意外。所以：

### 示例 4：错误处理与 withRetry()

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("🛡️  错误处理示例\n");
  console.log("=".repeat(72));

  // ---- 1. 用 try/catch 包住调用 ----
  console.log("\n1️⃣  用 try/catch 优雅地捕获错误\n");
  try {
    const res = await createModel().invoke("你好");
    console.log("✅ 调用成功：", res.content);
  } catch (err: any) {
    console.log("❌ 捕获到错误：", String(err?.message ?? err).slice(0, 120));
  }

  // ---- 2. 故意用错误的密钥，看错误长什么样 ----
  console.log("\n" + "=".repeat(72));
  console.log("\n2️⃣  故意用错误的密钥，观察鉴权错误\n");
  try {
    // ⚠️ 要点：必须**新建一个模型实例**才能真正用上错误的密钥。
    //    直接改已有实例的 apiKey 属性是无效的——底层 HTTP 客户端在构造时就已初始化。
    const bad = new ChatOpenAI({
      model: process.env.AI_MODEL,
      apiKey: "invalid-key-for-demo",
      configuration: { baseURL: process.env.AI_ENDPOINT },
    });
    await bad.invoke("你好");
    console.log("（意外地成功了）");
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    console.log("❌ 捕获到错误：", msg.slice(0, 120), "...");
    console.log("💡 解决：检查 .env 里的 AI_API_KEY 是否正确");
  }

  // ---- 3. 用 withRetry() 自动重试 ----
  console.log("\n" + "=".repeat(72));
  console.log("\n3️⃣  使用 withRetry() 自动重试（最多 3 次）\n");
  const robustModel = createModel().withRetry({ stopAfterAttempt: 3 });
  try {
    const res = await robustModel.invoke("2 + 2 等于几？");
    console.log("✅ 成功：", res.content);
    console.log("💡 一次就成功时，重试机制完全不打扰你；");
    console.log("   遇到 429 限流或瞬时网络错误时，它会自动重试。");
  } catch (err: any) {
    console.log("❌ 3 次重试后仍失败：", String(err?.message ?? err).slice(0, 120));
  }

  // ---- 4. 错误分类 ----
  console.log("\n" + "=".repeat(72));
  console.log("\n4️⃣  按错误类型给出不同处理\n");
  const categories: Array<[string, string]> = [
    ["401 / Unauthorized", "鉴权失败 → 检查 API Key"],
    ["429 / rate limit", "触发限流 → 用 withRetry() 自动退避重试"],
    ["timeout", "请求超时 → 提高超时时间或重试"],
  ];
  for (const [key, tip] of categories) {
    console.log(`   • ${key.padEnd(22)} → ${tip}`);
  }

  console.log("\n✅ 最佳实践：");
  console.log("   1. 永远用 try/catch 包住 API 调用");
  console.log("   2. 用 withRetry() 处理瞬时故障");
  console.log("   3. 给用户友好的错误提示，而不是把堆栈直接抛出去");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 02-chat-models/code/04-error-handling.ts
```

预期输出（节选）：

```
1️⃣  用 try/catch 优雅地捕获错误

✅ 调用成功： 你好！很高兴见到你。有什么我可以帮你的吗？……

2️⃣  故意用错误的密钥，观察鉴权错误

❌ 捕获到错误： 401 Authentication Fails, Your api key: ****demo is invalid ...
💡 解决：检查 .env 里的 AI_API_KEY 是否正确

3️⃣  使用 withRetry() 自动重试（最多 3 次）

✅ 成功： 4
💡 一次就成功时，重试机制完全不打扰你；
   遇到 429 限流或瞬时网络错误时，它会自动重试。

4️⃣  按错误类型给出不同处理

   • 401 / Unauthorized     → 鉴权失败 → 检查 API Key
   • 429 / rate limit       → 触发限流 → 用 withRetry() 自动退避重试
   • timeout                → 请求超时 → 提高超时时间或重试
```

`withRetry()` 会自动做**指数退避重试**，不需要你写循环。

**按错误类型分别处理：**

| 错误 | 含义 | 处理 |
| --- | --- | --- |
| 401 / Unauthorized | 鉴权失败 | 检查 API Key |
| 429 / rate limit | 触发限流 | 用 `withRetry()` |
| timeout | 超时 | 增大超时时间或重试 |

> 💡 第 2 步值得多看一眼：**为什么不能直接改已有实例的 `apiKey`？**
> 因为底层 HTTP 客户端在**构造模型时**就已经用当时的密钥初始化好了，
> 之后改属性不会影响它。这是很多人的 debug 陷阱——你以为换了密钥，其实没有。

---

## 五、Token 用量与成本

**Token 是模型处理文本的最小单位。** 粗略换算：**1 token ≈ 4 个字符 ≈ ¾ 个英文单词**。

为什么要关心：

- 模型有 **token 上限**（上下文窗口）
- 计费**按 token** 算
- token 越多，响应越慢
- 多轮对话中，历史越长，每次请求的输入 token 越多

### 示例 5：读取 token 用量

LangChain v1 会把用量信息挂在返回消息上：

```typescript
import { HumanMessage, SystemMessage, type BaseMessage } from "langchain";
import { createModel } from "../../lib/model.js";

function getUsage(msg: any) {
  // LangChain v1 会在消息上附带 usage_metadata
  return msg?.usage_metadata ?? msg?.response_metadata?.usage ?? null;
}

async function main() {
  console.log("💰 Token 用量与成本\n");
  console.log("=".repeat(72));

  const model = createModel();
  const messages: BaseMessage[] = [
    new SystemMessage("你是一位简洁的助手。"),
    new HumanMessage("用一句话介绍你自己。"),
  ];

  const r1 = await model.invoke(messages);
  const usage = getUsage(r1);

  console.log("\n🤖 回复：", r1.content);
  if (usage) {
    console.log("\n📊 本次用量：");
    console.log(`   输入 token：${usage.input_tokens ?? usage.prompt_tokens ?? "?"}`);
    console.log(`   输出 token：${usage.output_tokens ?? usage.completion_tokens ?? "?"}`);
    console.log(`   合计 token：${usage.total_tokens ?? "?"}`);
  } else {
    console.log("\n（该服务商未返回 usage 信息）");
  }

  // 粗略估算：1 token ≈ 4 个字符 / 0.75 个英文单词
  const chars = String(r1.content).length;
  console.log(`\n🔎 粗略估算：回复约 ${chars} 字符 ≈ ${Math.ceil(chars / 4)} token`);

  console.log("\n💡 为什么要关心 token？");
  console.log("   • 模型有 token 上限（上下文窗口）");
  console.log("   • 计费按 token 算");
  console.log("   • token 越多，响应越慢");
  console.log("   • 多轮对话里，历史越长，每次请求的输入 token 越多");
  console.log("\n👉 应对手段（第 5 章会讲）：定期总结/裁剪历史，用 summarizationMiddleware。");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 02-chat-models/code/05-token-usage.ts
```

预期输出：

```
💰 Token 用量与成本

🤖 回复： 我是一个简洁的 AI 助手，乐于用清晰直接的方式帮你解决问题。

📊 本次用量：
   输入 token：41
   输出 token：81
   合计 token：122

🔎 粗略估算：回复约 31 字符 ≈ 8 token

💡 为什么要关心 token？
   • 模型有 token 上限（上下文窗口）
   • 计费按 token 算
   • token 越多，响应越慢
   • 多轮对话里，历史越长，每次请求的输入 token 越多

👉 应对手段（第 5 章会讲）：定期总结/裁剪历史，用 summarizationMiddleware。
```

> ⚠️ 注意 `usage_metadata` 的**口径**：不同服务商返回的字段名可能不同
> （有的叫 `input_tokens`，有的叫 `prompt_tokens`），所以示例里做了兼容兜底。
> 推理型模型还可能额外返回 `output_token_details.reasoning`（思考消耗的 token）。

---

## 🎓 本章要点

- **模型无状态**；"记忆"= 每次把历史一起发过去
- **流式**让体验更好（首字 160ms vs 全量 3726ms），做聊天界面必用
- **temperature** 管风格，**maxTokens** 管长度
- ⚠️ 推理型模型的 `maxTokens` 包含"思考"开销，设太小会**正文为空且不报错**
- 用 **try/catch + withRetry()** 应对真实世界的故障
- **token** 既是成本也是瓶颈，多轮对话要当心历史膨胀

---

## 🎮 动手练习

1. 改造 `01-multi-turn.ts`：用 `readline` 做个真正的循环，让用户能一直聊下去
2. 改造 `02-streaming.ts`：把流式内容**同时**收集成一个完整字符串，最后打印总长度
3. 在 `03-parameters.ts` 里试试 `temperature = 1.5`（如果你的模型支持）
4. 观察 `05-token-usage.ts`：把 SystemMessage 改长一些，看输入 token 涨了多少

---

---

## 📂 本章完整代码

学到哪一章想直接翻代码，可以点这两个入口（两处内容同步，选能打开的）：

- **GitHub**：https://github.com/cleversnail/lang-chain-js-cn/tree/main/02-chat-models/code
- **Gitee**：https://gitee.com/snail_wn/lang-chain-js-cn/tree/main/02-chat-models/code

章节说明在本页，可直接运行的 `.ts` 文件在上面这两个目录里。

---

## 🗺️ 导航

[← 上一章：入门](../01-introduction/README.md) ｜ [返回总目录](../README.md) ｜ [下一章：提示词、消息与结构化输出 →](../03-prompts-messages-outputs/README.md)

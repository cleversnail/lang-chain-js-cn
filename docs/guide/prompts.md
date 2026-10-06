# 第 3 章 · 提示词、消息与结构化输出

## 🎯 本章目标

- 分清"消息数组"和"提示词模板"两条路线，知道何时用哪个
- 掌握 `ChatPromptTemplate` / `PromptTemplate`
- 学会 Few-Shot（少样本）提示
- 学会提示词组合与 `.partial()`
- **让模型直接返回类型安全的对象**（结构化输出，本章重头戏）

**本章代码**

> 📌 **代码约定**：正文的代码块都尽量保持**可直接运行**（含 import 与模型初始化）。若某段为聚焦概念的**节选**，会明确标注「节选」并指向同名的 `code/` 完整文件。

| 文件 | 内容 |
| --- | --- |
| `code/01-messages-vs-templates.ts` | 两条路线对比 |
| `code/02-basic-prompt-template.ts` | 基础提示词模板 |
| `code/03-template-formats.ts` | 两种模板格式 |
| `code/04-few-shot.ts` | Few-Shot 少样本提示 |
| `code/05-composition.ts` | 提示词组合与 partial |
| `code/06-structured-output.ts` | 结构化输出（Zod + jsonMode） |
| `code/07-zod-complex.ts` | 复杂嵌套 schema 抽取 |

---

## 一、两条路线：消息 vs 模板

这是本章最重要的一个判断。做 AI 应用时，你几乎总是在这两种写法里选一种。

### 示例 1：同一个翻译任务，两种写法

```typescript
import { HumanMessage, SystemMessage } from "langchain";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  const model = createModel();
  console.log("🎯 消息 vs 模板：两种范式\n");
  console.log("=".repeat(72));

  // ---------- 路线 A：消息数组 ----------
  console.log("\n🤖 路线 A：消息数组（Message Arrays）\n");

  const messages = [
    new SystemMessage("你是一位翻译助手。"),
    new HumanMessage("把 'Hello, world!' 翻译成法语"),
  ];
  const resA = await model.invoke(messages);
  console.log(`✅ 结果：${resA.content}`);
  console.log("\n💡 特点：直接、灵活，智能体（createAgent）主要用这种形式");

  // ---------- 路线 B：提示词模板 ----------
  console.log("\n" + "=".repeat(72));
  console.log("\n📋 路线 B：提示词模板（ChatPromptTemplate）\n");

  const template = ChatPromptTemplate.fromMessages([
    ["system", "你是一位翻译助手。"],
    ["human", "把 '{text}' 翻译成 {language}"],
  ]);
  // 用 | 把模板和模型"接"成一条链
  const chain = template.pipe(model);
  const resB = await chain.invoke({ text: "Hello, world!", language: "法语" });
  console.log(`✅ 结果：${resB.content}`);
  console.log("\n💡 特点：带变量 {text} {language}，可复用，是 RAG 的标准做法");

  // ---------- 怎么选 ----------
  console.log("\n" + "=".repeat(72));
  console.log("\n🎯 选择指南：");
  console.log("   用【消息】当：构建智能体、处理多步推理、需要完全掌控消息流");
  console.log("   用【模板】当：构建 RAG、需要可复用提示词、需要变量替换");
  console.log("\n   两者都重要，关键是知道什么时候用哪个。");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 03-prompts-messages-outputs/code/01-messages-vs-templates.ts
```

预期输出：

```
🎯 消息 vs 模板：两种范式

========================================================================

🤖 路线 A：消息数组（Message Arrays）

✅ 结果：**Bonjour, monde !**

（也可写作：**Bonjour le monde !**）

💡 特点：直接、灵活，智能体（createAgent）主要用这种形式

========================================================================

📋 路线 B：提示词模板（ChatPromptTemplate）

✅ 结果：Bonjour, le monde !

💡 特点：带变量 {text} {language}，可复用，是 RAG 的标准做法

========================================================================

🎯 选择指南：
   用【消息】当：构建智能体、处理多步推理、需要完全掌控消息流
   用【模板】当：构建 RAG、需要可复用提示词、需要变量替换

   两者都重要，关键是知道什么时候用哪个。
```

### 选择指南

| 场景 | 用什么 |
| --- | --- |
| 构建智能体、需要中间件 | 消息 |
| 多步推理、完全掌控消息流 | 消息 |
| 构建 RAG | 模板 |
| 可复用提示词、变量替换 | 模板 |

---

## 二、模板基础

### 示例 2：一个模板，复用三次

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("📝 基础提示词模板\n");

  const model = createModel();

  const template = ChatPromptTemplate.fromMessages([
    ["system", "你是翻译助手，负责把 {input_language} 翻译成 {output_language}。"],
    ["human", "{text}"],
  ]);

  // 一条链：模板 → 模型
  const chain = template.pipe(model);

  // 同一个模板，传入不同变量 → 不同结果
  const cases = [
    { target: "法语", vars: { input_language: "英语", output_language: "法语", text: "你好，你好吗？" } },
    { target: "日语", vars: { input_language: "英语", output_language: "日语", text: "你好，你好吗？" } },
    { target: "西班牙语", vars: { input_language: "英语", output_language: "西班牙语", text: "你好，你好吗？" } },
  ];

  for (const c of cases) {
    const res = await chain.invoke(c.vars);
    console.log(`翻译成${c.target}：${res.content}\n`);
  }

  console.log("✅ 同一个模板，复用三次！");
  console.log("💡 模板让提示词可复用、可测试、可维护。");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 03-prompts-messages-outputs/code/02-basic-prompt-template.ts
```

预期输出（节选）：

```
📝 基础提示词模板

翻译成法语：Bonjour, comment allez-vous ?

翻译成日语：こんにちは、お元気ですか？

翻译成西班牙语：Hola, ¿cómo estás?

✅ 同一个模板，复用三次！
💡 模板让提示词可复用、可测试、可维护。
```

> 💡 注意：这个示例把中文当成了"英语"来翻译（`input_language: "英语"` 但 `text` 是中文），
> 所以模型的回答有时会先"纠正"你。改成 `input_language: "中文"` 就正常了。

### 示例 3：两种模板格式

```typescript
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  const model = createModel();
  console.log("🎨 模板格式\n");
  console.log("=".repeat(72));

  // ---------- 1. ChatPromptTemplate ----------
  console.log("\n1️⃣  ChatPromptTemplate（多角色消息，推荐）\n");
  const chatTemplate = ChatPromptTemplate.fromMessages([
    ["system", "你是一位{role}，说话风格{style}。"],
    ["human", "{question}"],
  ]);
  const r1 = await chatTemplate
    .pipe(model)
    .invoke({ role: "海盗船长", style: "夸张而富有冒险精神", question: "什么是 TypeScript？" });
  console.log(r1.content);

  // ---------- 2. PromptTemplate ----------
  console.log("\n" + "=".repeat(72));
  console.log("\n2️⃣  PromptTemplate（单个字符串，简单）\n");
  const stringTemplate = PromptTemplate.fromTemplate("写一句关于{topic}的{adjective}{item}。");

  // .format() 先看拼出来的最终提示词长什么样
  const formatted = await stringTemplate.format({
    topic: "程序员",
    adjective: "搞笑的",
    item: "打油诗",
  });
  console.log("拼出的提示词：", formatted);

  const r2 = await model.invoke(formatted);
  console.log("\n模型回复：\n", r2.content);

  console.log("\n" + "=".repeat(72));
  console.log("\n✅ 小结：");
  console.log("   • ChatPromptTemplate：多角色消息，聊天模型首选");
  console.log("   • PromptTemplate：单字符串，简单场景够用");
  console.log("   • 都用 {变量} 语法，都用 .pipe(model) 接成链");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 03-prompts-messages-outputs/code/03-template-formats.ts
```

预期输出（节选，风格因模型而异）：

```
1️⃣  ChatPromptTemplate（多角色消息，推荐）

哟嗬嗬！把朗姆酒放下，听船长给你讲——TypeScript 就是 JavaScript 的
"镀金航海图 + 铁甲船规"！……（用海盗口吻讲了一大段）

========================================================================

2️⃣  PromptTemplate（单个字符串，简单）

拼出的提示词： 写一句关于程序员的搞笑的打油诗。

模型回复：
 一杯咖啡一包烟，一个 Bug 改一天。
```

**关键差别**：`ChatPromptTemplate` 能分别控制 system 和 human 的角色，模型会**真的进入角色**；
`PromptTemplate` 只是拼出一个字符串，没有角色概念。

---

## 三、Few-Shot：用例子教模型

有时"讲道理"不如"给例子"。给 2~5 个输入-输出示例，模型会照着模仿——这就是 Few-Shot。

### 示例 4：情绪转 Emoji + 代码生成注释

```typescript
import {
  ChatPromptTemplate,
  FewShotChatMessagePromptTemplate,
} from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function emotionToEmoji() {
  console.log("1️⃣  情绪 → Emoji\n");
  const model = createModel();

  const examples = [
    { input: "开心", output: "😊" },
    { input: "难过", output: "😢" },
    { input: "兴奋", output: "🎉" },
    { input: "生气", output: "😠" },
  ];

  // 每个例子的消息形状
  const examplePrompt = ChatPromptTemplate.fromMessages([
    ["human", "{input}"],
    ["ai", "{output}"],
  ]);

  // 把例子打包成"少样本模板"
  const fewShot = new FewShotChatMessagePromptTemplate({
    examplePrompt,
    examples,
    inputVariables: [],
  });

  const finalTemplate = ChatPromptTemplate.fromMessages([
    ["system", "根据下面这些例子，把情绪转换成 Emoji："],
    fewShot as any,
    ["human", "{input}"],
  ]);

  const chain = finalTemplate.pipe(model);
  for (const emotion of ["惊讶", "困惑", "疲惫", "自豪"]) {
    const res = await chain.invoke({ input: emotion });
    console.log(`${emotion} → ${String(res.content).trim()}`);
  }
}

async function codeComment() {
  console.log("\n" + "=".repeat(72));
  console.log("\n2️⃣  代码 → 注释生成\n");
  const model = createModel();

  const examples = [
    { code: "const sum = (a, b) => a + b;", comment: "// 求两数之和" },
    { code: "const users = data.filter(u => u.active);", comment: "// 过滤出活跃用户" },
    { code: "await db.save(record);", comment: "// 异步保存记录到数据库" },
  ];

  const examplePrompt = ChatPromptTemplate.fromMessages([
    ["human", "代码：{code}"],
    ["ai", "{comment}"],
  ]);

  const fewShot = new FewShotChatMessagePromptTemplate({
    examplePrompt,
    examples,
    inputVariables: [],
  });

  const finalTemplate = ChatPromptTemplate.fromMessages([
    ["system", "参照示例，为代码生成简洁的中文注释："],
    fewShot as any,
    ["human", "代码：{code}"],
  ]);

  const chain = finalTemplate.pipe(model);
  const tests = [
    "const sorted = items.sort((a, b) => a.price - b.price);",
    "if (user.role === 'admin') return true;",
  ];
  for (const code of tests) {
    const res = await chain.invoke({ code });
    console.log(`代码：${code}`);
    console.log(`注释：${String(res.content).trim()}\n`);
  }
}

async function main() {
  console.log("💡 Few-Shot 少样本提示\n");
  console.log("=".repeat(72));
  await emotionToEmoji();
  await codeComment();
  console.log("\n" + "=".repeat(72));
  console.log("\n✅ 结论：给出 2~5 个例子，输出格式会稳定得多。");
  console.log("💡 比“只讲规则”更可靠，又比“微调模型”更快更便宜。");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 03-prompts-messages-outputs/code/04-few-shot.ts
```

预期输出：

```
1️⃣  情绪 → Emoji

惊讶 → 抱歉，惊讶应该是 😲（不是 😠）。
困惑 → 😕
疲惫 → 😩
自豪 → 😎

========================================================================

2️⃣  代码 → 注释生成

代码：const sorted = items.sort((a, b) => a.price - b.price);
注释：// 按价格升序排序

代码：if (user.role === 'admin') return true;
注释：// 若用户是管理员则返回 true
```

> 💡 第一行很有意思：模型发现"惊讶"和示例中的"生气 😠"不属于同一类，
> 于是**主动纠正**了你给的示例。这说明 Few-Shot 是在"教模式"，不是在"查表"——
> 所以示例要选得准确，否则模型会连你的错误一起学（或反过来纠正你）。

**好处**：比"只讲规则"可靠得多；比"微调模型"又快又便宜，改起来还容易。

---

## 四、组合与 .partial()

两招让提示词不重复：**抽片段复用** + **固化变量**。

### 示例 5：片段复用 与 partial

```typescript
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

// 可复用的提示词片段（真实项目里可以抽到单独的配置文件）
const ROLE_LINE = "你是一位{role}。";
const BRAND_VOICE = "始终使用专业、友善、简洁的语气，面向中文用户。";

async function main() {
  const model = createModel();
  console.log("🔗 提示词组合\n");
  console.log("=".repeat(72));

  // ---------- 1. 用片段拼出模板 ----------
  console.log("\n1️⃣  用可复用片段拼装模板\n");

  // 把两个片段拼成一段 template，再用 .format() 看拼出的最终提示词
  const combined = PromptTemplate.fromTemplate(`${ROLE_LINE}\n${BRAND_VOICE}`);
  const systemText = await combined.format({ role: "耐心的教学助手" });
  console.log("拼出的 system 提示词：");
  console.log("   " + systemText.replace("\n", "  "));

  const educator = ChatPromptTemplate.fromMessages([
    ["system", systemText],
    ["human", "{question}"],
  ]);
  const rA = await educator.pipe(model).invoke({ question: "什么是向量数据库？" });
  console.log("\n🤖", rA.content);

  // ---------- 2. 用 .partial() 固化固定变量 ----------
  console.log("\n" + "=".repeat(72));
  console.log("\n2️⃣  用 .partial() 预填固定变量\n");

  // 模板里原本有两个变量：{tone} 和 {question}
  const customerService = ChatPromptTemplate.fromMessages([
    ["system", "你是一位客服助手，语气{tone}。"],
    ["human", "{question}"],
  ]);

  // 固化 tone 后，"友好版 / 简洁版"各自只剩 {question} 一个变量
  const friendlyService = await customerService.partial({ tone: "友好耐心" });
  const conciseService = await customerService.partial({ tone: "简洁干脆" });

  const q = "我的订单什么时候发货？";
  const friendly = await friendlyService.pipe(model).invoke({ question: q });
  const concise = await conciseService.pipe(model).invoke({ question: q });

  console.log("【友好版】", friendly.content);
  console.log("\n【简洁版】", concise.content);

  console.log("\n" + "=".repeat(72));
  console.log("\n✅ 组合的好处：");
  console.log("   • 提示词片段集中维护，改一处、全局生效");
  console.log("   • 品牌语气保持一致");
  console.log("   • .partial() 减少重复传参，让模板更聚焦");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 03-prompts-messages-outputs/code/05-composition.ts
```

预期输出（节选）：

```
1️⃣  用可复用片段拼装模板

拼出的 system 提示词：
   你是一位耐心的教学助手。  始终使用专业、友善、简洁的语气，面向中文用户。

🤖 向量数据库是一种专门用来存储、索引和查询"向量"的数据库。

可以这样理解：
- 传统数据库擅长按精确条件查，比如"年龄 = 25""订单号 = A123"。
- 向量数据库擅长按相似度查，比如"和这句话意思最接近的内容有哪些？"
……（略）

========================================================================

2️⃣  用 .partial() 预填固定变量

【友好版】 亲，您好～很抱歉让您久等啦！我这边需要先帮您查一下具体订单状态……
【简洁版】 请提供订单号，我马上帮您查发货时间。
```

**"友好版"和"简洁版"用的是同一个模板**，只是 `tone` 变量被 `.partial()` 预先固化了两个不同的值。
想调整全站语气，只改模板那一处即可。

---

## 五、⭐ 结构化输出：本章的重头戏

### 问题

以往让模型返回 JSON，你得像这样：写死"请返回 JSON"、然后正则抠、再 `JSON.parse`、
还要防它偶尔多写一句话把格式搞崩。

### 解法

用 **Zod 声明你想要的形状**，让模型直接返回类型正确的对象：

```typescript
const PersonSchema = z.object({
  name: z.string().describe("姓名"),
  age: z.number().describe("年龄"),
});
const structured = model.withStructuredOutput(PersonSchema, { method: "jsonMode" });
```

`describe()` 不只是注释——它会作为提示**告诉模型这个字段是什么**，填得更准。

### ⚠️ 三种模式，兼容性差别巨大（实测数据）

`withStructuredOutput` 支持三种模式，选错了会直接报错。下面是**在本电子书环境
（DeepSeek 思考型模型）实测**的结果：

| 模式 | 写法 | 实测结果 |
| --- | --- | --- |
| `jsonSchema`（默认） | `withStructuredOutput(schema)` | ❌ `This response_format type is unavailable now` |
| `functionCalling` | `{ method: "functionCalling" }` | ❌ `Thinking mode does not support this tool_choice` |
| **`jsonMode`** | `{ method: "jsonMode" }` | ✅ 可用（但见下面两个前提） |

**用 `jsonMode` 的两个前提**（缺一就会报错或解析失败）：

1. **提示词里必须出现 `json` / `JSON` 字样**
   否则服务商直接拒绝：`Prompt must contain the word 'json'`
2. **必须在提示词里明确列出需要的英文键名**
   因为 `jsonMode` **不强制** schema，模型可能自己起中文键名（如 `"姓名"` 而不是 `name`），
   导致解析失败 `OUTPUT_PARSING_FAILURE`

> 💡 这两点很反直觉，但都是真实踩过的坑。如果你换用 OpenAI 等原生支持 `json_schema` 的
> 服务商，可以直接用默认模式，约束最严格、最省心——所以**模式选择要跟着服务商走**。

### 示例 6：从自述中抽取个人信息

```typescript
import * as z from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("📋 结构化输出\n");

  const model = createModel();

  // 用 Zod 声明"我想要的形状"
  const PersonSchema = z.object({
    name: z.string().describe("姓名"),
    age: z.number().describe("年龄"),
    email: z.string().describe("电子邮箱"),
    occupation: z.string().describe("职业"),
  });

  // 让模型直接产出符合 schema 的对象
  const structured = model.withStructuredOutput(PersonSchema, {
    method: "jsonMode",
  });

  // ⚠️ jsonMode 要求提示词里出现 json / JSON 字样（否则服务商会直接报错）
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "从用户的自述中抽取个人信息，并以 JSON 格式返回。" +
        "字段名必须严格使用这些英文键：name, age, email, occupation",
    ],
    ["human", "{text}"],
  ]);

  const chain = prompt.pipe(structured);

  const inputs = [
    "我叫 Alice Johnson，28 岁，软件工程师，邮箱 alice.j@email.com",
    "嗨！我是 Bob，35 岁数据科学家，邮箱 bob.smith@company.com",
    "Sarah Martinez | 市场总监 | 年龄：42 | 联系方式：sarah.m@marketing.co",
  ];

  for (const text of inputs) {
    console.log("=".repeat(72));
    console.log(`\n输入：${text}\n`);
    const r = await chain.invoke({ text });
    console.log("✅ 提取结果（类型安全）：");
    console.log(JSON.stringify(r, null, 2));
    // 直接当对象用，IDE 有补全、编译期有类型检查
    console.log(`\n📝 带类型访问：${r.name}，${r.age} 岁，${r.occupation}，${r.email}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n💡 结构化输出的价值：");
  console.log("   • 类型安全：TypeScript 知道每个字段的类型");
  console.log("   • 无需手工解析、无需正则");
  console.log("   • 内置校验：age 一定是数字");
  console.log("   • 输出格式稳定，适合直接入库/调接口");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 03-prompts-messages-outputs/code/06-structured-output.ts
```

预期输出（节选）：

```
输入：我叫 Alice Johnson，28 岁，软件工程师，邮箱 alice.j@email.com

✅ 提取结果（类型安全）：
{
  "name": "Alice Johnson",
  "age": 28,
  "email": "alice.j@email.com",
  "occupation": "软件工程师"
}

📝 带类型访问：Alice Johnson，28 岁，软件工程师，alice.j@email.com
========================================================================

输入：Sarah Martinez | 市场总监 | 年龄：42 | 联系方式：sarah.m@marketing.co

✅ 提取结果（类型安全）：
{
  "name": "Sarah Martinez",
  "age": 42,
  "email": "sarah.m@marketing.co",
  "occupation": "市场总监"
}
```

注意三种完全不同的输入格式（口语自述、带感叹号的自我介绍、竖线分隔的简历式文本），
都被**规整成了同一个对象结构**——这就是结构化输出的价值。

### 示例 7：复杂嵌套 schema

```typescript
import * as z from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("🏢 复杂结构化抽取\n");

  const model = createModel();

  // 嵌套对象 + 数组 + 多种类型
  const CompanySchema = z.object({
    name: z.string().describe("公司名称"),
    founded: z.number().describe("成立年份"),
    headquarters: z
      .object({ city: z.string(), country: z.string() })
      .describe("总部所在地"),
    products: z.array(z.string()).describe("主要产品或服务列表"),
    employeeCount: z.number().describe("大致员工人数"),
    isPublic: z.boolean().describe("是否上市"),
  });

  // 同示例 6：用 jsonMode（兼容性最好），且提示词里必须出现 JSON 字样
  const structured = model.withStructuredOutput(CompanySchema, {
    method: "jsonMode",
  });

  const template = ChatPromptTemplate.fromMessages([
    [
      "system",
      "从文本中抽取公司信息。信息缺失时，可依据常识做合理估计。以 JSON 格式返回。" +
        "字段名必须严格使用这些英文键：name, founded, headquarters（含 city、country 两个子键），" +
        "products（字符串数组），employeeCount, isPublic（布尔值）",
    ],
    ["human", "{text}"],
  ]);

  const chain = template.pipe(structured);

  const samples = [
    "微软成立于 1975 年，总部位于美国华盛顿州雷德蒙德。公司已上市，全球员工超过 220000 人。主要产品有 Windows、Office、Azure、Xbox。",
    "SpaceX 位于加州霍桑，成立于 2002 年，专注航天器、火箭与卫星互联网（Starlink），约有 13000 名员工，为私人持股公司。",
  ];

  for (const text of samples) {
    console.log("=".repeat(72));
    const r = await chain.invoke({ text });
    console.log("\n✅ 抽取结果：");
    console.log(JSON.stringify(r, null, 2));
    console.log("\n📊 类型安全访问：");
    console.log(`   ${r.name}（${r.isPublic ? "上市" : "未上市"}）`);
    console.log(`   成立：${r.founded}`);
    console.log(`   总部：${r.headquarters.city}，${r.headquarters.country}`);
    console.log(`   产品：${r.products.join("、")}`);
    console.log(`   员工：${r.employeeCount.toLocaleString()}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n🎯 典型用途：文档信息抽取、表单自动填充、数据库写入、分类打标。");
}

main().catch(console.error);
```

运行：

```bash
npx tsx 03-prompts-messages-outputs/code/07-zod-complex.ts
```

预期输出（节选）：

```
✅ 抽取结果：
{
  "name": "微软",
  "founded": 1975,
  "headquarters": {
    "city": "雷德蒙德",
    "country": "美国"
  },
  "products": [
    "Windows",
    "Office",
    "Azure",
    "Xbox"
  ],
  "employeeCount": 220000,
  "isPublic": true
}

📊 类型安全访问：
   微软（上市）
   成立：1975
   总部：雷德蒙德，美国
   产品：Windows、Office、Azure、Xbox
   员工：220,000
```

注意几个细节：

- 嵌套对象 `headquarters` 被正确拆成了 `city` / `country`
- 数组 `products` 是真正的数组，可以直接 `.join()`
- `employeeCount` 是**数字**（原文是"超过 220000 人"），可以直接 `.toLocaleString()`
- `isPublic` 是**布尔值**，可以直接做 `? :` 判断

这就是"类型安全"的实际价值：**拿到手就能算，不用再做类型转换和清洗。**

---

## 🎓 本章要点

- **消息**适合智能体与动态流程；**模板**适合可复用与 RAG
- `ChatPromptTemplate` 面向多角色消息，`PromptTemplate` 面向单字符串
- **Few-Shot** 用例子换稳定性，是格式控制的利器（注意例子本身要准）
- `.partial()` 固化变量，片段变量拼接可复用
- **`withStructuredOutput` + Zod** 让模型吐出类型安全的对象
- ⚠️ 三种模式兼容性差异很大：**默认 jsonSchema 和 functionCalling 在 DeepSeek 上都不可用，
  要用 `jsonMode` + 提示词含「JSON」+ 明确列出英文键名**

---

## 🎮 动手练习

1. 用 `02-basic-prompt-template.ts` 做一个"多语言代码注释生成器"（把 `input_language` 改对）
2. 用 `04-few-shot.ts` 的思路，教模型把"打分 1-5 星"转成文字评价
3. 定义一个你自己的 Zod schema（比如"书单条目"：书名/作者/年份/标签数组），
   用 `withStructuredOutput` 从一段简介里抽取
4. 试试把示例 6 的 `jsonMode` 换成 `functionCalling`，看看报什么错——
   理解"模式要跟着服务商走"

---

## 🗺️ 导航

[← 上一章：对话模型与基础交互](/guide/chat-models) ｜ [返回总目录](/) ｜ [下一章：函数调用与工具 →](/guide/tools)

# 第 3 章 · 提示词、消息与结构化输出

## 🎯 本章目标

- 分清"消息数组"和"提示词模板"两条路线，知道何时用哪个
- 掌握 `ChatPromptTemplate` / `PromptTemplate`
- 学会 Few-Shot（少样本）提示
- 学会提示词组合与 `.partial()`
- **让模型直接返回类型安全的对象**（结构化输出）

**本章代码**

| 文件 | 内容 |
| --- | --- |
| `code/01-messages-vs-templates.ts` | 两条路线对比 |
| `code/02-basic-prompt-template.ts` | 基础提示词模板 |
| `code/03-template-formats.ts` | 两种模板格式 |
| `code/04-few-shot.ts` | Few-Shot 少样本提示 |
| `code/05-composition.ts` | 提示词组合与 partial |
| `code/06-structured-output.ts` | 结构化输出（Zod） |
| `code/07-zod-complex.ts` | 复杂嵌套 schema 抽取 |

---

## 一、两条路线：消息 vs 模板

这是本章最重要的一个判断。做 AI 应用时，你几乎总是在这两种写法里选一种。

### 路线 A：消息数组（Messages）

```typescript
const messages = [
  new SystemMessage("你是一位翻译助手。"),
  new HumanMessage("把 'Hello, world!' 翻译成法语"),
];
const res = await model.invoke(messages);
```

- 直接、灵活、完全掌控
- **智能体（`createAgent`）主要用这种形式**
- 适合动态、多步推理的流程

### 路线 B：提示词模板（Templates）

```typescript
const template = ChatPromptTemplate.fromMessages([
  ["system", "你是一位翻译助手。"],
  ["human", "把 '{text}' 翻译成 {language}"],
]);
const chain = template.pipe(model);       // 用 | 接成链
const res = await chain.invoke({ text: "Hello, world!", language: "法语" });
```

- 带变量 `{text}` `{language}`，**可复用**
- **RAG 系统的标准做法**
- 适合格式固定、需要一致性的场景

### 选择指南

| 场景 | 用什么 |
| --- | --- |
| 构建智能体、需要中间件 | 消息 |
| 多步推理、完全掌控消息流 | 消息 |
| 构建 RAG | 模板 |
| 可复用提示词、变量替换 | 模板 |

---

## 二、模板基础

### 消息模板：`ChatPromptTemplate`

聊天模型首选。用 `fromMessages` 声明每个角色的内容：

```typescript
const template = ChatPromptTemplate.fromMessages([
  ["system", "你是翻译助手，负责把 {input_language} 翻译成 {output_language}。"],
  ["human", "{text}"],
]);
const chain = template.pipe(model);
const res = await chain.invoke({
  input_language: "英语", output_language: "法语", text: "你好，你好吗？",
});
```

### 字符串模板：`PromptTemplate`

简单场景够用。`format()` 能让你先看到"最终拼出来的提示词"长什么样：

```typescript
const t = PromptTemplate.fromTemplate("写一句关于{topic}的{adjective}{item}。");
const formatted = await t.format({ topic: "程序员", adjective: "搞笑的", item: "打油诗" });
```

---

## 三、Few-Shot：用例子教模型

有时"讲道理"不如"给例子"。给 2~5 个输入-输出示例，模型会照着模仿——这就是 Few-Shot。

```typescript
const examples = [
  { input: "开心", output: "😊" },
  { input: "难过", output: "😢" },
];

const examplePrompt = ChatPromptTemplate.fromMessages([
  ["human", "{input}"],
  ["ai", "{output}"],
]);

const fewShot = new FewShotChatMessagePromptTemplate({ examplePrompt, examples, inputVariables: [] });

const finalTemplate = ChatPromptTemplate.fromMessages([
  ["system", "根据下面这些例子，把情绪转换成 Emoji："],
  fewShot,
  ["human", "{input}"],
]);
```

**好处**：比"只讲规则"可靠得多；比"微调模型"又快又便宜，改起来还容易。

---

## 四、组合与 .partial()

两招让提示词不重复：

```typescript
// 1. 两个 PromptTemplate 用 pipe 拼成一段
const combined = roleLine.pipe(brandVoice);

// 2. .partial() 固化一部分变量，让模板更聚焦
const friendly = await customerService.partial({ tone: "友好耐心" });
const concise  = await customerService.partial({ tone: "简洁干脆" });
```

---

## 五、⭐ 结构化输出：本章的重头戏

### 问题

以往让模型返回 JSON，你得像这样：写死"请返回 JSON"、然后正则抠、再 `JSON.parse`、还要防它偶尔多写一句话把格式搞崩。

### 解法

用 **Zod 声明你想要的形状**，让模型直接返回类型正确的对象：

```typescript
const PersonSchema = z.object({
  name: z.string().describe("姓名"),
  age: z.number().describe("年龄"),
  email: z.string().describe("电子邮箱"),
  occupation: z.string().describe("职业"),
});

const structured = model.withStructuredOutput(PersonSchema, { strict: true });

const r = await structured.invoke("我叫 Alice，28 岁，软件工程师，alice@email.com");
console.log(r.name);   // ← 直接当对象用，有类型、有补全
```

`strict: true` 让输出**严格贴合 schema**，最大程度避免格式漂移。

### 复杂结构也支持

```typescript
const CompanySchema = z.object({
  name: z.string(),
  founded: z.number(),
  headquarters: z.object({ city: z.string(), country: z.string() }),  // 嵌套对象
  products: z.array(z.string()),                                      // 数组
  isPublic: z.boolean(),
});
```

`describe()` 不只是注释——它会作为提示**告诉模型这个字段是什么**，填得更准。

### 价值

- ✅ 类型安全：TypeScript 全程知道每个字段的类型
- ✅ 无需手工解析、无需正则
- ✅ 内置校验（age 一定是数字）
- ✅ 输出格式稳定，可直接入库 / 调接口

**典型用途**：文档信息抽取、表单自动填充、结构化入库、分类打标。

---

## 🎓 本章要点

- **消息**适合智能体与动态流程；**模板**适合可复用与 RAG
- `ChatPromptTemplate` 面向多角色消息，`PromptTemplate` 面向单字符串
- **Few-Shot** 用例子换稳定性，是格式控制利器
- `.partial()` 固化变量，`pipe` 拼接片段
- **`withStructuredOutput` + Zod** 让模型吐出类型安全的对象——生产项目必备

---

## 🎮 动手练习

1. 用 `02-basic-prompt-template.ts` 做一个"多语言代码注释生成器"
2. 用 `04-few-shot.ts` 的思路，教模型把"打分 1-5 星"转成文字评价
3. 定义一个你自己的 Zod schema（比如"书单条目"），用 `withStructuredOutput` 从一段简介里抽取

---

## 🗺️ 导航

[← 上一章：对话模型与基础交互](/guide/chat-models) ｜ [返回总目录](/) ｜ [下一章：函数调用与工具 →](/guide/tools)

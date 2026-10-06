# 第 1 章 · LangChain.js 入门

## 🎯 本章目标

- 理解 LangChain.js 是什么、解决什么问题
- 认识它的 5 个核心概念
- 完成你的第一次 LLM 调用

**本章代码**

| 文件 | 内容 |
| --- | --- |
| `code/01-hello-world.ts` | 第一次调用 LLM |
| `code/02-message-types.ts` | 用 System / Human 消息控制 AI 风格 |
| `code/03-model-comparison.ts` | 对比不同模型或参数 |

---

## 一、用"五金店"来理解 LangChain

**假设你要盖一栋房子。** 你当然可以自己烧砖、自己配水泥、自己造锤子——但更聪明的做法，是去一家五金店买现成的材料和成熟的工具。

**LangChain.js 就是 AI 开发界的五金店。**

| 五金店提供 | LangChain.js 提供 |
| --- | --- |
| 🔨 现成的工具（锤子、锯子、电钻） | 现成的组件（对话模型、提示词、工具） |
| 🧱 优质材料（木料、钉子、油漆） | 优质抽象（同一套接口适配任何服务商） |
| 📋 施工图纸 | 常见 AI 应用的设计范式 |
| 🔄 标准化的可互换零件 | 可组合的组件，彼此无缝衔接 |

结果就是：**你可以专注于"盖房子"（做应用），而不用重新发明轮子。**

---

## 二、LangChain.js 是什么

一句话：**LangChain.js 是一个用大语言模型（LLM）构建 AI 应用的框架。**

### 没有它会怎样

- 每换一家模型服务商（OpenAI / Anthropic / 国产大模型…），就要重写一套调用代码
- 得自己造一套提示词管理系统
- 得自己实现工具调用、函数调用的逻辑
- 得从零实现"记忆"和多轮对话
- 想搞 Agent，却毫无章法

### 有了它，你得到

- **服务商抽象**：在 OpenAI / Azure / Anthropic / 国产模型之间切换，只需改配置
- **提示词模板**：可复用、可测试的提示词
- **工具（Tools）**：用自定义函数和 API 扩展模型能力
- **记忆（Memory）**：内置的多轮对话历史管理
- **智能体（Agents）**：能自主决策、自己选工具的 AI

---

## 三、5 个核心概念

| 概念 | 通俗解释 | 在哪一章学 |
| --- | --- | --- |
| **模型 Model** | AI 的"大脑"，处理输入、生成输出 | 本章 + 第 2 章 |
| **提示词 Prompt** | 你和模型沟通的方式（可模板化） | 第 3 章 |
| **工具 Tool** | 给模型装上的"手"，让它能调用外部函数 | 第 4 章 |
| **智能体 Agent** | 会自己思考、自己选工具的 AI 系统 | 第 5 章 |
| **记忆 Memory** | 让 AI 记住之前聊过什么 | 第 2 章 |

它们是这样串联起来的：

```
用户输入 → 记忆 → 提示词 → 工具/智能体 → 模型 → 回复
```

**现在看不懂没关系**，你会一章一章地把它们逐个吃透。

---

## 四、动手：你的第一次调用

### 示例 1：Hello World

三步走。先看代码 `code/01-hello-world.ts`：

**第 1 步：导入需要的模块**

```typescript
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";   // 自动加载 .env

...configuration: { baseURL: process.env.AI_ENDPOINT } });

// 第 3 步：提问并拿到回复
const response = await model.invoke("用一句话解释 LangChain 是什么。");
console.log(response.content);
```

**发生了什么？**

1. 从 `@langchain/openai` 导入 `ChatOpenAI` 这个"客户端"
2. 用三个参数构造它：**模型名**、**接口地址**、**密钥**
3. 调用 `invoke()`，传入提示词，同步等待完整回复
4. 从返回对象里读 `.content` 得到文本

**为什么把密钥放 `.env`？**

- 密钥不进代码仓库，更安全
- 换服务商时**只改配置文件，不改代码**——就像换联系人只需要改通讯录里的号码，拨号方式完全不变

运行：

```bash
npx tsx 01-introduction/code/01-hello-world.ts
```

预期输出（内容会因模型而异）：

```
🚀 你好，LangChain.js！

🤖 AI 回复： LangChain 是一个用于构建大语言模型应用的框架……

✅ 成功！你刚刚完成了第一次 LangChain.js 调用。
```

---

### 示例 2：消息类型

让 AI 用"给 10 岁小孩讲"的风格解释量子计算——靠的就是 `SystemMessage`。

```typescript
import { HumanMessage, SystemMessage } from "langchain";

const messages = [
  new SystemMessage("你是一位耐心的老师，擅长用最简单的比喻向 10 岁孩子解释事情。"),
  new HumanMessage("解释一下量子计算。"),
];

const response = await model.invoke(messages);
```

三种消息：

- **SystemMessage** — 设定 AI 的身份、语气、行为准则（只在开头出现一次）
- **HumanMessage** — 用户说的话
- **AIMessage** — AI 说过的话（用于把它拼回对话历史）

> 为什么用消息数组而不是一坨字符串？
> 因为它给了你**对 AI 行为的精确控制**，也为后续多轮对话、工具调用打下了基础。

运行：

```bash
npx tsx 01-introduction/code/02-message-types.ts
```

**小实验**：把 SystemMessage 改成"你是一位冷酷的海盗船长"，再跑一次，看看风格变化。

---

### 示例 3：对比模型 / 参数

同一个问题，换个模型或用不同参数，结果会不一样。

在 `.env` 里加一行就能对比两个模型：

```bash
AI_MODEL_ALT=另一个模型名
```

没配的话，示例会自动改为**对比温度（temperature）**：温度 0 更确定，温度 1 更发散。

```bash
npx tsx 01-introduction/code/03-model-comparison.ts
```

---

## 五、🌱 关于 `lib/model.ts` 的小提示

你会发现后面的章节不再手写 `new ChatOpenAI(...)`，而是这样：

```typescript
import { createModel } from "../lib/model.js";
const model = createModel();            // 读取 .env
const creative = createModel({ temperature: 1.0 });  // 覆盖参数
```

它做的事**和示例 1 完全一样**，只是把"读环境变量 → 构造模型"这段重复代码收进了一个函数。你完全可以继续手写，效果一致。

---

## 🎓 本章要点

- LangChain.js 是**抽象层**，让你用同一套代码对接不同的模型服务商
- 它由**可组合的组件**构成：模型、提示词、工具、智能体、记忆
- 配置通过 `.env` 完成：`AI_API_KEY` / `AI_ENDPOINT` / `AI_MODEL`
- 消息**有类型**：System / Human / AI 各司其职

---

## 🎮 动手练习

1. 打开 `code/01-hello-world.ts`，把问题改成"用简单的语言解释 AI"，再运行一次
2. 把 `02-message-types.ts` 的 SystemMessage 换成别的角色（海盗、诗人、面试官），观察变化
3. 在 `.env` 里设置 `AI_MODEL_ALT`，跑一次模型对比

---

## 🗺️ 导航

[← 上一章：环境准备](../00-course-setup/README.md) ｜ [返回总目录](../README.md) ｜ [下一章：对话模型与基础交互 →](../02-chat-models/README.md)

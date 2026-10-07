---
layout: home

hero:
  name: LangChain.js
  text: 中文入门电子书
  tagline: 9 章 · 38 个示例，边读边跑
  image:
    src: /logo.svg
    alt: LangChain.js
  actions:
    - theme: brand
      text: 开始阅读
      link: /guide/setup
    - theme: alt
      text: 术语表
      link: /glossary

features:
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg>'
    title: 全中文讲解
    details: 概念、代码注释、控制台输出、报错提示全部中文，不再被英文文档劝退。
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>'
    title: 真的能跑起来
    details: 不绑定 Azure / Microsoft Foundry，任何兼容 OpenAI 接口的服务商都能直接用；换服务商只改 .env，不动代码。
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.2l2.4 2.4 4.6-4.9"/></svg>'
    title: 实测通过
    details: 全部示例端到端跑通，tsc 类型检查零错误，并附带一键验证脚本 npm run verify。
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M2 13l10 5 10-5"/><path d="M2 18l10 5 10-5"/></svg>'
    title: 循序渐进
    details: 模型 → 提示词 → 工具 → 智能体 → MCP → 向量检索 → Agentic RAG，每一步都踩着上一步。
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.5 5 8.6 4.2 6.3 4.2H3v13.6h3.3c2.3 0 4.2.8 5.7 2.3 1.5-1.5 3.4-2.3 5.7-2.3H21V4.2h-3.3c-2.3 0-4.2.8-5.7 2.3z"/><path d="M12 6.5v13.6"/></svg>'
    title: 小白友好
    details: 用「五金店」「打字机」「给模型倒酒」这类比喻解释抽象概念，每个例子都给预期输出。
  - icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.1 3.1z"/></svg>'
    title: 贴近实战
    details: 覆盖结构化输出、工具调用三步闭环、ReAct 循环、中间件、RAG 选型等生产必备知识。
---

## 这本书适合谁

- 会 **JavaScript / TypeScript**，但没接触过 LangChain
- 想用 JS/TS 构建 AI 应用：聊天机器人、知识库问答、智能体……
- 希望**边读边跑**代码，而不是只看理论

> 💡 唯一的硬门槛是「会 JS/TS」。如果连 `async/await` 和 `npm` 都还没用过，
> 建议先补这两样，再回来读——这一点和官方原版课程的要求一致。

## 阅读顺序

```
1 模型 → 2 对话 → 3 提示词 → 4 工具 → 5 智能体 → 6 MCP → 7 检索 → 8 RAG
```

建议按顺序读，后面的章节会复用前面的概念。第 6 章（MCP）相对独立，卡住了可以先跳过，最后回头补。

## 快速开始

```bash
# 1. 克隆本书源码（两个地址选一个，内容同步）
git clone https://github.com/cleversnail/lang-chain-js-cn.git   # GitHub
# git clone https://gitee.com/snail_wn/lang-chain-js-cn.git     # Gitee（国内更稳）
cd lang-chain-js-cn

# 2. 安装依赖
npm install

# 3. 配置模型（填入你的 API Key / 接口地址 / 模型名）
cp .env.example .env

# 4. 跑通第一个例子
npx tsx 01-introduction/code/01-hello-world.ts
```

> 不想用 Git？打开 [GitHub 仓库](https://github.com/cleversnail/lang-chain-js-cn) 或
> [Gitee 仓库](https://gitee.com/snail_wn/lang-chain-js-cn)，
> 点「Code / 克隆下载 → Download ZIP / 下载 ZIP」，解压后从第 2 步开始。

**源码地址**：[GitHub](https://github.com/cleversnail/lang-chain-js-cn) ｜
[Gitee](https://gitee.com/snail_wn/lang-chain-js-cn)（两处同步，选能打开的）

完整说明见 [第 0 章 · 环境准备](/guide/setup)。

> 📦 **想装进自己的项目？** 上面是跑本书示例的方式。若要在自己的项目里用 LangChain：
> `npm install -S langchain`（或 `pnpm install langchain` / `yarn add langchain`），
> 并注意 v1 是「主包 + 按需包」结构——详见 [第 0 章第二节](/guide/setup)。

## 内容来源

本教程内容改编自微软官方开源课程
[LangChain.js for Beginners](https://github.com/microsoft/langchainjs-for-beginners)（MIT License，作者 Dan Wahlin 及贡献者），
已翻译为中文、适配 LangChain v1.x，并改造为不依赖特定云服务商的版本。本中文版仅供学习使用。

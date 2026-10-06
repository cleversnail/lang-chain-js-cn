import { defineConfig } from "vitepress";

/**
 * VitePress 配置 —— 参考 vuejs.org 官方站点的信息架构：
 * 顶栏导航 + 左侧目录 + 右侧大纲 + 本地搜索。
 */
export default defineConfig({
  lang: "zh-CN",
  title: "LangChain.js 中文入门",
  description:
    "从零到落地的 LangChain.js 中文教程，9 章 38 个可运行代码示例，适配任意兼容 OpenAI 接口的大模型服务商。",

  // 默认且始终使用浅色（浅天蓝主题）。
  // 设为 false = 关闭深色模式；若想保留深色切换，改成 true（跟随系统）。
  appearance: false,

  // 部署在域名根目录时保持 "/"。
  // 若部署到「子路径」（如 Gitee Pages 的 /仓库名/），需改成 "/仓库名/"。
  base: "/",

  cleanUrls: true,

  markdown: {
    // 教程代码很多，行号对阅读和复制都有帮助
    lineNumbers: true,
    theme: { light: "github-light", dark: "github-dark" },
  },

  head: [
    ["meta", { name: "theme-color", content: "#38bdf8" }],
  ],

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "首页", link: "/" },
      { text: "教程", link: "/guide/setup", activeMatch: "/guide/" },
      { text: "术语表", link: "/glossary" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "开始",
          items: [
            { text: "第 0 章 · 环境准备", link: "/guide/setup" },
            { text: "第 1 章 · 入门", link: "/guide/introduction" },
          ],
        },
        {
          text: "基础能力",
          items: [
            { text: "第 2 章 · 对话模型与基础交互", link: "/guide/chat-models" },
            { text: "第 3 章 · 提示词、消息与结构化输出", link: "/guide/prompts" },
          ],
        },
        {
          text: "构建 AI 应用",
          items: [
            { text: "第 4 章 · 函数调用与工具", link: "/guide/tools" },
            { text: "第 5 章 · 智能体（Agents）", link: "/guide/agents" },
            { text: "第 6 章 · 模型上下文协议 MCP", link: "/guide/mcp" },
          ],
        },
        {
          text: "检索与 RAG",
          items: [
            { text: "第 7 章 · 文档、嵌入与语义搜索", link: "/guide/embeddings" },
            { text: "第 8 章 · Agentic RAG", link: "/guide/agentic-rag" },
          ],
        },
        {
          text: "附录",
          items: [{ text: "术语表", link: "/glossary" }],
        },
      ],
    },

    outline: {
      level: [2, 3],
      label: "本页目录",
    },

    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "搜索文档", buttonAriaLabel: "搜索文档" },
          modal: {
            noResultsText: "没有找到相关结果",
            resetButtonTitle: "清除查询条件",
            footer: {
              selectText: "选择",
              navigateText: "切换",
              closeText: "关闭",
            },
          },
        },
      },
    },

    docFooter: { prev: "上一章", next: "下一章" },
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "目录",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",

    footer: {
      message: "内容改编自 Microsoft 开源课程 LangChain.js for Beginners（MIT License）",
      copyright: "本中文版仅供学习使用",
    },
  },
});

import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import * as process from "node:process";

// 自动加载 .env（基于脚本所在目录解析，不受运行目录影响）
process.loadEnvFile(fileURLToPath(new URL("./.env", import.meta.url)));

// 1. 定义一个工具：搜索
const search = tool(
  ({ query }) => `Results for: ${query}`,
  {
    name: "search",
    description: "Search for information",
    schema: z.object({
      query: z.string().describe("The search query"),
    })
  }
);

// 2. 创建模型实例（DeepSeek 走 OpenAI 兼容接口）
const model = new ChatOpenAI({
  model: "deepseek-chat",
  apiKey: process.env.DEEPSEEK_API_KEY,
  configuration: {
    baseURL: "https://api.deepseek.com",
  },
});

// 3. 创建 Agent
const agent = createAgent({
  model,
  tools: [search],
});

// 4. 调用 Agent
const result = await agent.invoke({  // 调用 Agent 并传入用户消息
  messages: [{ role: "user", content: "Search for ReAct agents" }],
});

console.log(result);

/**
 * 示例 2：消息类型（Message Types）
 * 运行：npx tsx 01-introduction/code/02-message-types.ts
 *
 * 与其把一坨字符串丢给模型，不如用"角色化的消息数组"：
 *   SystemMessage —— 设定 AI 的身份与行为准则
 *   HumanMessage  —— 用户输入
 *   AIMessage     —— AI 之前的回复（本书后面会大量用到）
 */
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "langchain";
import "dotenv/config";

async function main() {
  console.log("🎭 理解消息类型\n");

  const model = new ChatOpenAI({
    model: process.env.AI_MODEL,
    apiKey: process.env.AI_API_KEY,
    configuration: { baseURL: process.env.AI_ENDPOINT },
  });

  // 同一个问题，用不同的 SystemMessage 会得到完全不同的风格
  const messages = [
    new SystemMessage("你是一位耐心的老师，擅长用最简单的比喻向 10 岁孩子解释事情。"),
    new HumanMessage("解释一下量子计算。"),
  ];

  const response = await model.invoke(messages);

  console.log("🤖 AI 回复：\n");
  console.log(response.content);
  console.log("\n✅ 注意到 SystemMessage 如何影响了回答的风格了吗？");
}

main().catch(console.error);

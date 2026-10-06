/**
 * 对话模型工厂 —— 全书统一的模型创建入口。
 *
 * 为什么要封装一层？
 *   它把"用哪家服务商 / 哪个模型 / 密钥在哪"这些琐事集中到一处，
 *   让每一章的示例代码都能专注在那一章要讲的知识点上。
 *
 * 它是怎么实现的？其实就是把 AppConfig 里的值塞给 ChatOpenAI。
 * 你也可以在任何一章里直接手写 new ChatOpenAI({...})，效果完全一样。
 */
import { ChatOpenAI } from "@langchain/openai";
import { getConfig } from "./env.js";

/** createModel 的可选参数：temperature、maxTokens 等都可以覆盖 */
export type ModelOptions = Partial<{
  temperature: number;
  maxTokens: number;
  model: string;
}>;

export function createModel(options: ModelOptions = {}): ChatOpenAI {
  const cfg = getConfig();
  return new ChatOpenAI({
    model: options.model ?? cfg.model,
    apiKey: cfg.apiKey,
    configuration: { baseURL: cfg.baseURL },
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
  });
}

/** 打印一条分隔线，让控制台输出更好读 */
export function banner(title: string): void {
  console.log("\n" + "=".repeat(72));
  console.log("  " + title);
  console.log("=".repeat(72) + "\n");
}

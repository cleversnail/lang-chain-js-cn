/**
 * 嵌入模型工厂 —— 第 07、08 章使用。
 *
 * 策略：
 *   - 配了独立 embedding 服务（AI_EMBEDDING_API_KEY）
 *     → 使用真正的 OpenAIEmbeddings；
 *   - 否则 → 自动降级到本地离线嵌入 LocalHashEmbeddings，保证示例照样能跑。
 *
 * 为什么要"独立"密钥才认为能调真实接口？
 *   因为对话模型的服务商（如 DeepSeek）通常**不提供** embedding 接口。
 */
import { OpenAIEmbeddings } from "@langchain/openai";
import type { Embeddings } from "@langchain/core/embeddings";
import { getConfig } from "./env.js";
import { LocalHashEmbeddings } from "./offline-embeddings.js";

export type EmbeddingMode = "openai" | "offline";

/** 当前使用的嵌入模式，供示例代码据此调整相似度阈值的解读 */
export function embeddingMode(): EmbeddingMode {
  return process.env.AI_EMBEDDING_API_KEY ? "openai" : "offline";
}

export function createEmbeddings(): Embeddings {
  const cfg = getConfig();

  if (embeddingMode() === "offline") {
    console.log(
      "【提示】未配置 AI_EMBEDDING_API_KEY，本次使用本地离线嵌入演示（仅字面相似度）。\n" +
        "       想看真正的语义检索效果，请在 .env 里配置支持 embedding 的服务商。\n"
    );
    return new LocalHashEmbeddings(256);
  }

  return new OpenAIEmbeddings({
    model: cfg.embeddingModel,
    apiKey: cfg.embeddingApiKey,
    configuration: { baseURL: cfg.embeddingBaseURL },
  });
}

/** 计算两个向量的余弦相似度，方便讲解相似度指标 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

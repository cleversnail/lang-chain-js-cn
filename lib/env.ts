/**
 * 统一读取环境变量。
 *
 * 全书所有示例都通过这里读取配置，你只需要在一个 .env 文件里改一次，
 * 所有章节的代码就会跟着切换服务商。
 *
 * 相关变量（见根目录 .env.example）：
 *   AI_API_KEY           对话模型密钥（必填）
 *   AI_ENDPOINT          对话模型接口地址，兼容 OpenAI 协议
 *   AI_MODEL             对话模型名称
 *   AI_EMBEDDING_MODEL   嵌入模型名称
 *   AI_EMBEDDING_ENDPOINT / AI_EMBEDDING_API_KEY   嵌入服务独立配置（可选）
 */
import "dotenv/config";

export interface AppConfig {
  /** 对话模型密钥 */
  apiKey: string;
  /** 对话模型接口 baseURL，例如 https://api.deepseek.com/v1 */
  baseURL: string;
  /** 对话模型名称，例如 deepseek-chat */
  model: string;
  /** 嵌入模型名称 */
  embeddingModel: string;
  /** 嵌入服务接口；为空时回退到 baseURL */
  embeddingBaseURL: string;
  /** 嵌入服务密钥；为空时回退到 apiKey */
  embeddingApiKey: string;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `缺少环境变量 ${name}。请先复制 .env.example 为 .env 并填写（见 00-course-setup/README.md）。`
    );
  }
  return value;
}

export function getConfig(): AppConfig {
  const apiKey = process.env.AI_API_KEY ?? "";
  const baseURL = process.env.AI_ENDPOINT ?? "https://api.deepseek.com/v1";
  const model = process.env.AI_MODEL ?? "deepseek-chat";

  return {
    apiKey,
    baseURL,
    model,
    embeddingModel: process.env.AI_EMBEDDING_MODEL ?? "BAAI/bge-m3",
    // 嵌入服务若未单独配置，就复用对话服务的地址与密钥
    embeddingBaseURL: process.env.AI_EMBEDDING_ENDPOINT || baseURL,
    embeddingApiKey: process.env.AI_EMBEDDING_API_KEY || apiKey,
  };
}

export function assertChatKey(): void {
  required("AI_API_KEY", process.env.AI_API_KEY);
}

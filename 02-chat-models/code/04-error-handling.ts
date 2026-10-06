/**
 * 示例 4：错误处理与自动重试
 * 运行：npx tsx 02-chat-models/code/04-error-handling.ts
 *
 * 真实项目里，网络抖动、限流（429）几乎不可避免。
 * LangChain 内置了 withRetry()：指数退避自动重试。
 */
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("🛡️  错误处理示例\n");
  console.log("=".repeat(72));

  // ---- 1. 用 try/catch 包住调用 ----
  console.log("\n1️⃣  用 try/catch 优雅地捕获错误\n");
  try {
    const res = await createModel().invoke("你好");
    console.log("✅ 调用成功：", res.content);
  } catch (err: any) {
    console.log("❌ 捕获到错误：", String(err?.message ?? err).slice(0, 120));
  }

  // ---- 2. 故意用错误的密钥，看错误长什么样 ----
  console.log("\n" + "=".repeat(72));
  console.log("\n2️⃣  故意用错误的密钥，观察鉴权错误\n");
  try {
    const bad = createModel();
    (bad as any).apiKey = "invalid-key-for-demo";
    await bad.invoke("你好");
    console.log("（意外地成功了）");
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    console.log("❌ 捕获到错误：", msg.slice(0, 120), "...");
    console.log("💡 解决：检查 .env 里的 AI_API_KEY 是否正确");
  }

  // ---- 3. 用 withRetry() 自动重试 ----
  console.log("\n" + "=".repeat(72));
  console.log("\n3️⃣  使用 withRetry() 自动重试（最多 3 次）\n");
  const robustModel = createModel().withRetry({ stopAfterAttempt: 3 });
  try {
    const res = await robustModel.invoke("2 + 2 等于几？");
    console.log("✅ 成功：", res.content);
    console.log("💡 一次就成功时，重试机制完全不打扰你；");
    console.log("   遇到 429 限流或瞬时网络错误时，它会自动重试。");
  } catch (err: any) {
    console.log("❌ 3 次重试后仍失败：", String(err?.message ?? err).slice(0, 120));
  }

  // ---- 4. 错误分类 ----
  console.log("\n" + "=".repeat(72));
  console.log("\n4️⃣  按错误类型给出不同处理\n");
  const categories: Array<[string, string]> = [
    ["401 / Unauthorized", "鉴权失败 → 检查 API Key"],
    ["429 / rate limit", "触发限流 → 用 withRetry() 自动退避重试"],
    ["timeout", "请求超时 → 提高超时时间或重试"],
  ];
  for (const [key, tip] of categories) {
    console.log(`   • ${key.padEnd(22)} → ${tip}`);
  }

  console.log("\n✅ 最佳实践：");
  console.log("   1. 永远用 try/catch 包住 API 调用");
  console.log("   2. 用 withRetry() 处理瞬时故障");
  console.log("   3. 给用户友好的错误提示，而不是把堆栈直接抛出去");
}

main().catch(console.error);

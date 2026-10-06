/**
 * 示例 3：模型参数（temperature 与 maxTokens）
 * 运行：npx tsx 02-chat-models/code/03-parameters.ts
 *
 * temperature：控制随机性/创造性（越低越确定，越高越发散）
 * maxTokens：限制回复长度（控制成本与篇幅）
 *
 * 注意：不同服务商支持的取值范围不同，本示例对不支持的参数做了容错。
 */
import { createModel } from "../../lib/model.js";

const prompt = "给一个关于时间旅行的科幻故事写一句有创意的开场白。";

async function temperatureDemo() {
  console.log(`🌡️  温度对比（模型：${process.env.AI_MODEL}）\n`);
  console.log("=".repeat(72));

  for (const temp of [0, 1]) {
    console.log(`\n温度 = ${temp}（同一提示词跑 2 次）：`);
    console.log("-".repeat(72));
    try {
      for (let i = 1; i <= 2; i++) {
        const res = await createModel({ temperature: temp }).invoke(prompt);
        console.log(`  第 ${i} 次：${res.content}`);
      }
    } catch (err: any) {
      console.log(`  ⚠️  该模型不支持 temperature=${temp}，已跳过（${err?.message ?? err}）`);
    }
  }
  console.log("\n💡 温度 0：两次几乎一样；温度 1：两次更有变化。");
}

async function maxTokensDemo() {
  console.log("\n\n📏 maxTokens 长度限制\n");
  console.log("=".repeat(72));

  for (const maxTokens of [40, 300, 2000]) {
    console.log(`\nmaxTokens = ${maxTokens}：`);
    console.log("-".repeat(72));
    try {
      const res = await createModel({ maxTokens }).invoke(
        "用五段话详细解释什么是机器学习。"
      );
      const content = String(res.content);
      const meta: any = (res as any).response_metadata ?? {};
      const usage: any = (res as any).usage_metadata ?? {};
      const reasoning = usage?.output_token_details?.reasoning;

      if (!content.trim()) {
        console.log("  ⚠️  回复为空（正文 0 字）——这是个重要现象，不是 bug：");
        console.log(`     finish_reason = ${meta.finish_reason ?? "?"}，本次输出 token 全花在「思考」上了` +
          (reasoning !== undefined ? `（思考 ${reasoning} tokens）` : ""));
        console.log("     💡 原因：该模型是「推理型模型」，会先思考、再作答；");
        console.log("        maxTokens 限制的是「思考 + 正文」的总量，预算太小就只剩思考。");
        console.log("        → 把 maxTokens 调大即可看到正文。");
      } else {
        console.log(content);
        console.log(`\n（正文 ${content.length} 字，finish_reason = ${meta.finish_reason ?? "?"}）`);
      }
    } catch (err: any) {
      console.log(`  ⚠️  该模型不支持 maxTokens=${maxTokens}，已跳过（${err?.message ?? err}）`);
    }
  }
  console.log("\n💡 限制越紧，回复越短；太小会被「截断」，甚至只剩思考、没有正文。");
}

async function main() {
  console.log("🎛️  模型参数演示\n");
  await temperatureDemo();
  await maxTokensDemo();
  console.log("\n\n✅ 小结：温度管“风格”，maxTokens 管“长度”。");
}

main().catch(console.error);

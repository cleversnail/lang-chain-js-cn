/**
 * 示例 5：提示词组合与"部分模板"（Partial）
 * 运行：npx tsx 03-prompts-messages-outputs/code/05-composition.ts
 *
 * 把重复出现的提示词片段抽出来复用，是保持"品牌语气"一致的关键。
 * 本示例演示两种手段：
 *   1. 用可复用的"片段变量"拼出模板（把角色、语气等拆开维护）
 *   2. ChatPromptTemplate.partial({...}) —— 预先固化一部分变量
 */
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

// 可复用的提示词片段（真实项目里可以抽到单独的配置文件）
const ROLE_LINE = "你是一位{role}。";
const BRAND_VOICE = "始终使用专业、友善、简洁的语气，面向中文用户。";

async function main() {
  const model = createModel();
  console.log("🔗 提示词组合\n");
  console.log("=".repeat(72));

  // ---------- 1. 用片段拼出模板 ----------
  console.log("\n1️⃣  用可复用片段拼装模板\n");

  // 把两个片段拼成一段 template，再用 .format() 看拼出的最终提示词
  const combined = PromptTemplate.fromTemplate(`${ROLE_LINE}\n${BRAND_VOICE}`);
  const systemText = await combined.format({ role: "耐心的教学助手" });
  console.log("拼出的 system 提示词：");
  console.log("   " + systemText.replace("\n", "  "));

  const educator = ChatPromptTemplate.fromMessages([
    ["system", systemText],
    ["human", "{question}"],
  ]);
  const rA = await educator.pipe(model).invoke({ question: "什么是向量数据库？" });
  console.log("\n🤖", rA.content);

  // ---------- 2. 用 .partial() 固化固定变量 ----------
  console.log("\n" + "=".repeat(72));
  console.log("\n2️⃣  用 .partial() 预填固定变量\n");

  // 模板里原本有两个变量：{tone} 和 {question}
  const customerService = ChatPromptTemplate.fromMessages([
    ["system", "你是一位客服助手，语气{tone}。"],
    ["human", "{question}"],
  ]);

  // 固化 tone 后，"友好版 / 简洁版"各自只剩 {question} 一个变量
  const friendlyService = await customerService.partial({ tone: "友好耐心" });
  const conciseService = await customerService.partial({ tone: "简洁干脆" });

  const q = "我的订单什么时候发货？";
  const friendly = await friendlyService.pipe(model).invoke({ question: q });
  const concise = await conciseService.pipe(model).invoke({ question: q });

  console.log("【友好版】", friendly.content);
  console.log("\n【简洁版】", concise.content);

  console.log("\n" + "=".repeat(72));
  console.log("\n✅ 组合的好处：");
  console.log("   • 提示词片段集中维护，改一处、全局生效");
  console.log("   • 品牌语气保持一致");
  console.log("   • .partial() 减少重复传参，让模板更聚焦");
}

main().catch(console.error);

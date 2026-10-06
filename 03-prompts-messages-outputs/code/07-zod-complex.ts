/**
 * 示例 7：复杂嵌套 schema
 * 运行：npx tsx 03-prompts-messages-outputs/code/07-zod-complex.ts
 *
 * 演示嵌套对象、数组、多种数据类型——真实的"信息抽取"长这样。
 *
 * 注意 withStructuredOutput 的模式选择，见示例 6 的说明（这里用 jsonMode）。
 */
import * as z from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "../../lib/model.js";

async function main() {
  console.log("🏢 复杂结构化抽取\n");

  const model = createModel();

  // 嵌套对象 + 数组 + 多种类型
  const CompanySchema = z.object({
    name: z.string().describe("公司名称"),
    founded: z.number().describe("成立年份"),
    headquarters: z
      .object({ city: z.string(), country: z.string() })
      .describe("总部所在地"),
    products: z.array(z.string()).describe("主要产品或服务列表"),
    employeeCount: z.number().describe("大致员工人数"),
    isPublic: z.boolean().describe("是否上市"),
  });

  // 同示例 6：用 jsonMode（兼容性最好），且提示词里必须出现 JSON 字样
  const structured = model.withStructuredOutput(CompanySchema, {
    method: "jsonMode",
  });

  const template = ChatPromptTemplate.fromMessages([
    [
      "system",
      "从文本中抽取公司信息。信息缺失时，可依据常识做合理估计。以 JSON 格式返回。" +
        "字段名必须严格使用这些英文键：name, founded, headquarters（含 city、country 两个子键），" +
        "products（字符串数组），employeeCount, isPublic（布尔值）",
    ],
    ["human", "{text}"],
  ]);

  const chain = template.pipe(structured);

  const samples = [
    "微软成立于 1975 年，总部位于美国华盛顿州雷德蒙德。公司已上市，全球员工超过 220000 人。主要产品有 Windows、Office、Azure、Xbox。",
    "SpaceX 位于加州霍桑，成立于 2002 年，专注航天器、火箭与卫星互联网（Starlink），约有 13000 名员工，为私人持股公司。",
  ];

  for (const text of samples) {
    console.log("=".repeat(72));
    const r = await chain.invoke({ text });
    console.log("\n✅ 抽取结果：");
    console.log(JSON.stringify(r, null, 2));
    console.log("\n📊 类型安全访问：");
    console.log(`   ${r.name}（${r.isPublic ? "上市" : "未上市"}）`);
    console.log(`   成立：${r.founded}`);
    console.log(`   总部：${r.headquarters.city}，${r.headquarters.country}`);
    console.log(`   产品：${r.products.join("、")}`);
    console.log(`   员工：${r.employeeCount.toLocaleString()}`);
  }

  console.log("\n" + "=".repeat(72));
  console.log("\n🎯 典型用途：文档信息抽取、表单自动填充、数据库写入、分类打标。");
}

main().catch(console.error);

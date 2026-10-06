/**
 * 示例 4：内置中间件 summarizationMiddleware —— 自动压缩长对话
 * 运行：npx tsx 05-agents/code/04-summarization-middleware.ts
 *
 * 回顾第 2 章：对话历史会越滚越长，token 成本越来越高。
 * summarizationMiddleware 会在历史变长时，自动把它"总结压缩"，
 * 既保住上下文，又控制 token。
 *
 * 配置：
 *   trigger: {tokens, messages} —— 达到阈值时触发（两者都满足才触发）
 *   keep:    {messages}         —— 压缩后保留最近几条原始消息
 */
import { createAgent, summarizationMiddleware, HumanMessage, SystemMessage, tool } from "langchain";
import * as z from "zod";
import { createModel } from "../../lib/model.js";

const kb: Record<string, string> = {
  叠加态:
    "叠加态指量子系统在未被测量前可以同时处于多个状态，就像薛定谔的猫既死又活。这让量子比特能同时表示 0 和 1。",
  纠缠:
    "量子纠缠指两个粒子的状态相互关联，测量其中一个会瞬间影响另一个，爱因斯坦称之为「幽灵般的超距作用」。",
  隧穿:
    "量子隧穿指粒子能穿过经典物理上无法逾越的势垒。它是太阳发光（核聚变）的原因，也是芯片制程微缩的挑战。",
};

const researchTool = tool(
  async (input) => {
    const key = Object.keys(kb).find((k) => input.topic.includes(k));
    return key ? kb[key] : "量子力学描述原子尺度上物质与能量的行为，包含叠加、纠缠、隧穿等概念。";
  },
  {
    name: "research",
    description: "获取量子力学某个概念的详细解释",
    schema: z.object({ topic: z.string().describe("要研究的话题") }),
  }
);

async function main() {
  console.log("📚 内置中间件：自动总结长对话\n");

  const model = createModel();

  const agent = createAgent({
    model,
    tools: [researchTool],
    middleware: [
      summarizationMiddleware({
        model,
        trigger: { tokens: 200, messages: 4 },  // 达到任一阈值的组合时压缩
        keep: { messages: 2 },                  // 压缩后保留最近 2 条
      }),
    ],
  });

  const system = new SystemMessage(
    "你是量子物理研究助手。总是使用 research 工具给出准确详细的解释，最终回答尽量简洁。"
  );
  const messages: (SystemMessage | HumanMessage)[] = [system];

  const questions = [
    "什么是量子叠加态？",
    "量子纠缠是怎么工作的？",
    "解释一下量子隧穿",
    "它有哪些实际应用？",
    "叠加态和纠缠之间有什么联系？",
  ];

  let maxSeen = 0;
  for (let i = 0; i < questions.length; i++) {
    console.log(`\n📝 第 ${i + 1} 轮：${questions[i]}`);
    messages.push(new HumanMessage(questions[i]));

    const res = await agent.invoke({ messages: [...messages] });
    const last = res.messages[res.messages.length - 1];
    const content = String(last.content);

    console.log(`  [状态] 本轮共 ${res.messages.length} 条消息`);
    if (maxSeen > 0 && res.messages.length < maxSeen) {
      console.log("  🔄 检测到历史被压缩了（消息数下降）→ 节省了 token");
    }
    maxSeen = Math.max(maxSeen, res.messages.length);

    console.log(`🤖 ${content.length > 200 ? content.slice(0, 200) + "..." : content}`);
  }

  console.log("\n💡 小结：");
  console.log("   • summarizationMiddleware 会在历史过长时自动总结压缩");
  console.log("   • 用 trigger 控制何时压缩，keep 控制保留多少");
  console.log("   • 这是做「长期对话」类产品的必备手段");
}

main().catch(console.error);

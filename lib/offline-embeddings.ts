/**
 * 本地离线嵌入（无需任何 API）。
 *
 * 用途：当你的服务商不提供 embedding 接口时，让第 07、08 章的流程仍然能跑通，
 *      方便理解"切分 → 向量化 → 相似度检索"的完整链路。
 *
 * 原理（很朴素的词袋 + 特征哈希）：
 *   1. 把文本切成小词元：
 *        - 英文/数字按整词切
 *        - 中文同时取「单字」和「相邻二元组」（如「向量数据库」→ 向量/量数/数据/据库）
 *   2. 用哈希把每个词元映射到固定维度的某个下标上并计数；
 *   3. 做 L2 归一化。
 * 于是"共享词汇/字组越多"的两段文本，余弦相似度越高。
 *
 * 维度取 256：维度越低碰撞越多、向量越密、相似度整体偏高；
 * 维度越高越稀疏、越容易把相关文本也判成低分。256 是实测分离度较好的取值。
 *
 * ⚠️ 它只捕捉「字面重合」，不捕捉真正的语义。
 *    要体会真正的语义相似（例如「番茄」≈「西红柿」），请配置一个真正的 embedding 模型。
 */
import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";

export class LocalHashEmbeddings extends Embeddings {
  dimensions: number;

  constructor(dimensions = 256, params: EmbeddingsParams = {}) {
    super(params);
    this.dimensions = dimensions;
  }

  /** 英文/数字整词 + 中文单字 + 中文相邻二元组 */
  private tokenize(text: string): string[] {
    const lower = text.toLowerCase();
    const tokens: string[] = [];

    // 英文单词与数字
    for (const m of lower.matchAll(/[a-z0-9]+/g)) tokens.push(m[0]);

    // 中文单字
    const cjk = [...lower].filter((ch) => /[\u4e00-\u9fff]/.test(ch));

    // 中文相邻二元组（提升相关短语的相似度）
    for (let i = 0; i < cjk.length - 1; i++) tokens.push(cjk[i] + cjk[i + 1]);

    tokens.push(...cjk);
    return tokens;
  }

  private hashToken(token: string): number {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  private embedOne(text: string): number[] {
    const vec = new Array<number>(this.dimensions).fill(0);
    for (const token of this.tokenize(text)) {
      vec[this.hashToken(token) % this.dimensions] += 1;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.embedOne(t));
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embedOne(text);
  }
}

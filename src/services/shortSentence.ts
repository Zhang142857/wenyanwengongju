/**
 * 短句生成服务 - 用于从文言文库生成适合出题的短句
 * 从统一配置服务动态获取API配置
 */

import { configService } from './configService'

// API Key 轮询索引
let currentKeyIndex = 0;

/**
 * 获取下一个API配置（轮询）
 */
function getNextApiConfig() {
  const configs = configService.getAIConfig().filter(c => c.apiKey)

  if (configs.length === 0) {
    throw new Error('未配置API Key，请在设置中添加API配置')
  }

  const config = configs[currentKeyIndex]
  currentKeyIndex = (currentKeyIndex + 1) % configs.length
  return config
}

export interface ShortSentenceRequest {
  sentence: string;
  articleId: string;
  sentenceId: string;
}

export interface ShortSentenceResponse {
  shortSentences: string[];
  sourceArticleId: string;
  sourceSentenceId: string;
}

/**
 * 从长句中提取适合出题的短句
 */
export async function extractShortSentences(
  sentence: string
): Promise<string[]> {
  const prompt = `你是一个文言文专家。请分析以下文言文句子，将其分割成适合出题的短句。

规则：
1. 按照逗号、顿号等标点符号分割
2. 只保留长短适中且结构完整的短句（4-15字）
3. 太短的短句（1-3字）不要保留，如"饮水"
4. 长句（15字以上）直接保留，如"如使人之所欲莫甚于生"
5. 保留有完整语法结构的短句，如"乐亦在其中矣"
6. 每个短句用"|"分隔
7. 如果整句话本身就是长句，直接返回整句
8. 不要添加标点符号

例子：
输入：孔子及其弟子子曰："饭疏食、饮水，曲肱而枕之，乐亦在其中矣。不义而富且贵，于我如浮云。"
输出：饭疏食|曲肱而枕之|乐亦在其中矣|不义而富且贵|于我如浮云

输入：如使人之所欲莫甚于生
输出：如使人之所欲莫甚于生

句子：${sentence}

请直接输出短句，用"|"分隔，不要有任何额外的话：`;

  try {
    const apiConfig = getNextApiConfig();
    console.log(`[短句生成] 使用模型: ${apiConfig.model}`);

    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [
          {
            role: 'system',
            content: '你是一个文言文专家。只输出短句，用"|"分隔，不要有任何额外的话。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API 请求失败: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || '';

    // 解析响应
    const shortSentences = content
      .split('|')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length >= 4 && s.length <= 15);

    return shortSentences;
  } catch (error) {
    console.error('AI 请求失败:', error);
    throw error;
  }
}

/**
 * 批量生成短句（带详细统计）
 */
export async function batchExtractShortSentences(
  requests: ShortSentenceRequest[],
  onProgress?: (current: number, total: number, stats?: {
    speed: number; // 每秒处理的请求数
    startTime: number;
    totalGenerated: number; // 总共生成的短句数
  }) => void
): Promise<ShortSentenceResponse[]> {
  // 动态导入配置（避免循环依赖）
  const { getShortSentenceConcurrency, getBatchDelayMs } = await import('./concurrencyConfig')

  const results: ShortSentenceResponse[] = [];
  const concurrency = getShortSentenceConcurrency();
  const startTime = Date.now();
  let totalGenerated = 0;

  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);

    // 更新进度
    if (onProgress) {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = i > 0 ? i / elapsed : 0;

      onProgress(i, requests.length, {
        speed,
        startTime,
        totalGenerated,
      });
    }

    const batchPromises = batch.map(async (req) => {
      try {
        const shortSentences = await extractShortSentences(req.sentence);
        return {
          shortSentences,
          sourceArticleId: req.articleId,
          sourceSentenceId: req.sentenceId,
        };
      } catch (error) {
        console.error(`处理句子失败: ${req.sentence}`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter((r): r is ShortSentenceResponse => r !== null);
    results.push(...validResults);

    // 累加生成的短句数量
    totalGenerated += validResults.reduce((sum, r) => sum + r.shortSentences.length, 0);

    // 批次间延迟
    if (i + concurrency < requests.length) {
      await new Promise(resolve => setTimeout(resolve, getBatchDelayMs()));
    }
  }

  // 最终进度
  if (onProgress) {
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = requests.length / elapsed;

    onProgress(requests.length, requests.length, {
      speed,
      startTime,
      totalGenerated,
    });
  }

  return results;
}

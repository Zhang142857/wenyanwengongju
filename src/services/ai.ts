/**
 * AI 服务 - 用于自动生成义项
 * 使用MiniMax API (MiniMax-M2模型)
 */

// API配置
interface ApiConfig {
  baseUrl: string
  apiKey: string
  model: string
  provider: 'minimax' | 'siliconflow'
}

// 硅基流动 API - 使用 Ling-flash-2.0 模型（通过硅基流动）
const ALL_API_CONFIGS: ApiConfig[] = [
  {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-vkasvvxaewwtnrfnyjkdqizcubmwlvywlbzuvgsfjotoxtrg',
    model: 'inclusionAI/Ling-flash-2.0',
    provider: 'siliconflow',
  },
  {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-vzuzylxxtolfxmlcmmhykqgctgiuivbfgtlwebcjcxpdlqyv',
    model: 'inclusionAI/Ling-flash-2.0',
    provider: 'siliconflow',
  },
  {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-cplztrsifchetezkbabzxrzsnmlyvuwlspevkgpmztfksthz',
    model: 'inclusionAI/Ling-flash-2.0',
    provider: 'siliconflow',
  },
  {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-izfpkafaxakjrexfsecdkoqxtearoidybzootmwzjpbofqnx',
    model: 'inclusionAI/Ling-flash-2.0',
    provider: 'siliconflow',
  },
  {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-mkdvcwoseuxtfmltgmnxxiaaornbkrookxbqctiuvjgweecw',
    model: 'inclusionAI/Ling-flash-2.0',
    provider: 'siliconflow',
  },
  {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-limxenepsomcnviqzvoevkzmngcihkmvezrlamjqkmtblrfs',
    model: 'inclusionAI/Ling-flash-2.0',
    provider: 'siliconflow',
  },
  {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-qtfeqncvnoftrgngdzxhhpfvovgcigftdfyohrpxxoycdrdf',
    model: 'inclusionAI/Ling-flash-2.0',
    provider: 'siliconflow',
  },
]

// API 轮询索引
let currentConfigIndex = 0

/**
 * 获取下一个API配置（轮询）
 */
function getNextApiConfig(): ApiConfig {
  const config = ALL_API_CONFIGS[currentConfigIndex]
  currentConfigIndex = (currentConfigIndex + 1) % ALL_API_CONFIGS.length
  return config
}

// 兼容旧代码
function getNextApiKey(): string {
  return getNextApiConfig().apiKey
}

/**
 * 通用AI请求函数
 */
async function makeAIRequest(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<{ content: string; usage?: { total_tokens: number; completion_tokens: number } }> {
  // 动态导入配置（避免循环依赖）
  const { getModelId, isThinkingModel } = await import('./concurrencyConfig')
  
  const config = getNextApiConfig()
  const modelId = getModelId() || config.model  // 使用配置的模型ID，如果没有则使用默认
  const isThinking = isThinkingModel()
  
  console.log(`[AI请求] 使用模型: ${modelId}${isThinking ? ' (思考模型)' : ''}`)
  
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,  // 使用配置的模型ID
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.max_tokens ?? 500,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI API 请求失败: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content?.trim() || '',
    usage: data.usage,
  }
}

/**
 * 重置API Key索引（用于测试或重新开始）
 */
export function resetApiKeyIndex(): void {
  currentConfigIndex = 0
}

export interface AIDefinitionRequest {
  sentence: string;
  character: string;
}

export interface AIDefinitionResponse {
  character: string;
  definition: string;
  sentence: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface KeyCharactersResponse {
  sentence: string;
  characters: string[];
}

/**
 * 第一轮：找出句子中需要制作义项的重点字
 * 分批处理，避免一次性发送太多句子
 */
export async function findKeyCharacters(
  sentences: string[],
  onProgress?: (current: number, total: number) => void
): Promise<KeyCharactersResponse[]> {
  const allResults: KeyCharactersResponse[] = [];
  const batchSize = 30; // 每批处理30个句子
  const concurrency = Math.min(2, ALL_API_CONFIGS.length); // 并发数等于API配置数量

  // 将句子分成多个批次
  const batches: string[][] = [];
  for (let i = 0; i < sentences.length; i += batchSize) {
    batches.push(sentences.slice(i, i + batchSize));
  }

  // 并发处理批次
  for (let i = 0; i < batches.length; i += concurrency) {
    const concurrentBatches = batches.slice(i, i + concurrency);
    
    // 更新进度
    if (onProgress) {
      onProgress(i * batchSize, sentences.length);
    }

    // 并发处理多个批次
    const batchPromises = concurrentBatches.map(async (batch, batchIndex) => {
      const actualIndex = i + batchIndex;

      const prompt = `你是一个文言文教学专家。请分析以下文言文句子，找出每个句子中需要制作义项的重点字。

【重点字的定义】
重点字是指在文言文教学中需要重点讲解的字，包括：

1. 【常见实词】（选择性标注）
   - 动词：学、教、说、为、得、知、见、闻、去、来、往、行、坐、立、卧等
   - 形容词：好、恶、美、丑、大、小、多、少、高、低、长、短等
   - 名词：人、物、事、理、道、心、身、手、足、头、眼等
   - 只标注有特殊含义或容易混淆的实词

2. 【虚词】（必须全部标注）
   ⚠️ 重要：句子中的所有虚词都必须标注！
   
   - 连词：而、然、然而、但、且、及、与、或、若、则、乃、故、因、所以等
   - 介词：以、于、在、从、向、被、为、与、自、由等
   - 代词：之、其、此、彼、是、斯、何、谁、孰、安、焉等
   - 助词：也、矣、乎、哉、焉、耳、兮、夫、盖等
   - 副词：不、未、莫、勿、无、非、弗、毋、则、乃、即、既、已、尚、犹、尤、特等
   - 语气词：乎、哉、也、矣、焉、耳、兮等

3. 【古今异义字】（必须标注）
   - 意思在现代汉语中完全不同的字
   - 例如：说（通"悦"）、为（做、成为）、去（离开）等

4. 【通假字】（必须标注）
   - 用一个字代替另一个字的情况
   - 例如：说通悦、亦通异、女通汝等

【不要标注的字】
- 标点符号
- 人名、地名、朝代名
- 现代汉语中的虚词（的、了、呢、吗、啊等）

【输出要求】
- 必须标注句子中的所有虚词
- 实词只标注重要的、有特殊含义的
- 用"|"分隔多个字
- 如果句子中没有重点字，返回空字符串

输出格式（每行一个句子）：
句子1|||字1|字2|字3
句子2|||字1|字2

句子列表：
${batch.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

请严格按照格式输出，不要有任何额外的话：`;

      try {
        const result = await makeAIRequest(
          [
            {
              role: 'system',
              content: '你是一个文言文专家，专门负责标注文言文中需要解释的重点字。只输出结果，不要有任何额外的话。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          { temperature: 0.3, max_tokens: 2000 }
        );

        const content = result.content;

        // 解析响应
        const lines = content.trim().split('\n');
        const results: KeyCharactersResponse[] = [];

        for (let j = 0; j < lines.length; j++) {
          const line = lines[j];
          if (!line.trim()) continue;

          const parts = line.split('|||');
          if (parts.length !== 2) continue;

          const sentence = parts[0].replace(/^\d+\.\s*/, '').trim();
          const charactersStr = parts[1].trim();
          const characters = charactersStr ? charactersStr.split('|').filter((c: string) => c.trim()) : [];

          results.push({
            sentence,
            characters,
          });
        }

        return results;
      } catch (error) {
        console.error(`批次 ${actualIndex + 1} 请求失败:`, error);
        return [];
      }
    });

    // 等待所有并发批次完成
    const batchResults = await Promise.all(batchPromises);
    allResults.push(...batchResults.flat());

    // 批次间短暂延迟（使用多API Key后可以减少延迟）
    if (i + concurrency < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // 最终进度
  if (onProgress) {
    onProgress(sentences.length, sentences.length);
  }

  return allResults;
}

/**
 * 第二轮：为单个字生成义项
 */
export async function generateDefinition(
  sentence: string,
  character: string
): Promise<string> {
  const prompt = `请解释文言文句子中"${character}"字的意思。

句子：${sentence}
字：${character}

要求：
1. 只输出这个字在这个句子中的意思，2-6个字
2. 不要输出注释、例句或其他解释
3. 如果是多义字，只输出在这个句子中的意思
4. 输出格式：直接输出意思，不要有任何前缀或后缀

【实词输出格式】
- "学"在"学而时习之"中：学习
- "道"在"得道多助"中：道义
- "说"在"不亦说乎"中：通"悦"，高兴

【虚词输出格式】
⚠️ 重要：虚词必须按照以下格式输出

连词：
- "而"在"学而时习之"中：连词，表顺承
- "且"在"且焉置土石"中：连词，表递进
- "则"在"学而不思则罔"中：连词，表承接

介词：
- "以"在"可以为师"中：介词，凭借
- "于"在"生于忧患"中：介词，在
- "为"在"为之奈何"中：介词，对于

代词：
- "之"在"学而时习之"中：代词
- "其"在"其如土石何"中：代词
- "此"在"此之谓也"中：代词
⚠️ 代词只写"代词"，不要写代指什么！

助词：
- "也"在"学而时习之，不亦说乎"中：语气助词
- "矣"在"逝者如斯夫"中：语气助词
- "乎"在"不亦说乎"中：语气助词

副词：
- "不"在"不亦说乎"中：副词，表否定
- "未"在"未之有也"中：副词，表否定
- "乃"在"乃不知有汉"中：副词，竟然

请直接输出"${character}"在句子中的意思：`;

  try {
    const result = await makeAIRequest(
      [
        {
          role: 'system',
          content: '你是一个文言文专家。只输出字的意思，2-4个字，不要有任何额外的话。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      { temperature: 0.3, max_tokens: 50 }
    );

    return result.content;
  } catch (error) {
    console.error('AI 请求失败:', error);
    throw error;
  }
}

/**
 * 为单个字生成义项（带token信息）
 */
export async function generateDefinitionWithTokens(
  sentence: string,
  character: string
): Promise<{ definition: string; tokens: { prompt: number; completion: number; total: number } }> {
  const prompt = `请解释文言文句子中"${character}"字的意思。

句子：${sentence}
字：${character}

要求：
1. 只输出这个字在这个句子中的意思，2-6个字
2. 不要输出注释、例句或其他解释
3. 如果是多义字，只输出在这个句子中的意思
4. 输出格式：直接输出意思，不要有任何前缀或后缀

【实词输出格式】
- "学"在"学而时习之"中：学习
- "道"在"得道多助"中：道义
- "说"在"不亦说乎"中：通"悦"，高兴

【虚词输出格式】
⚠️ 重要：虚词必须按照以下格式输出

连词：
- "而"在"学而时习之"中：连词，表顺承
- "且"在"且焉置土石"中：连词，表递进
- "则"在"学而不思则罔"中：连词，表承接

介词：
- "以"在"可以为师"中：介词，凭借
- "于"在"生于忧患"中：介词，在
- "为"在"为之奈何"中：介词，对于

代词：
- "之"在"学而时习之"中：代词
- "其"在"其如土石何"中：代词
- "此"在"此之谓也"中：代词
⚠️ 代词只写"代词"，不要写代指什么！

助词：
- "也"在"学而时习之，不亦说乎"中：语气助词
- "矣"在"逝者如斯夫"中：语气助词
- "乎"在"不亦说乎"中：语气助词

副词：
- "不"在"不亦说乎"中：副词，表否定
- "未"在"未之有也"中：副词，表否定
- "乃"在"乃不知有汉"中：副词，竟然

请直接输出"${character}"在句子中的意思：`;

  try {
    const result = await makeAIRequest(
      [
        {
          role: 'system',
          content: '你是一个文言文专家。只输出字的意思，2-4个字，不要有任何额外的话。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      { temperature: 0.3, max_tokens: 50 }
    );

    const usage = result.usage || { total_tokens: 0, completion_tokens: 0 };

    return {
      definition: result.content,
      tokens: {
        prompt: (usage.total_tokens || 0) - (usage.completion_tokens || 0),
        completion: usage.completion_tokens || 0,
        total: usage.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error('AI 请求失败:', error);
    throw error;
  }
}

/**
 * 批量生成义项（并发请求，带详细统计）
 */
export async function batchGenerateDefinitions(
  requests: AIDefinitionRequest[],
  concurrency?: number,  // 如果不指定，使用配置中的值
  onProgress?: (current: number, total: number, stats?: {
    totalTokens: number;
    completionTokens: number;
    speed: number; // 每秒处理的请求数
    tokenSpeed: number; // 每秒生成的token数
    startTime: number;
  }) => void
): Promise<AIDefinitionResponse[]> {
  // 动态导入配置（避免循环依赖）
  const { getAIDefinitionConcurrency, getBatchDelayMs, getRetryDelayMs } = await import('./concurrencyConfig')
  
  // 使用提供的并发数，或从配置中获取
  const finalConcurrency = concurrency ?? getAIDefinitionConcurrency()
  const results: AIDefinitionResponse[] = [];
  const errors: Array<{ request: AIDefinitionRequest; error: any }> = [];
  
  let totalTokens = 0;
  let completionTokens = 0;
  const startTime = Date.now();

  // 分批处理
  for (let i = 0; i < requests.length; i += finalConcurrency) {
    const batch = requests.slice(i, i + finalConcurrency);
    const batchStartTime = Date.now();

    // 更新进度
    if (onProgress) {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = i > 0 ? i / elapsed : 0;
      const tokenSpeed = elapsed > 0 ? completionTokens / elapsed : 0;
      
      onProgress(i, requests.length, {
        totalTokens,
        completionTokens,
        speed,
        tokenSpeed,
        startTime,
      });
    }

    const batchPromises = batch.map(async (req) => {
      try {
        const result = await generateDefinitionWithTokens(req.sentence, req.character);
        
        // 累加token统计
        totalTokens += result.tokens.total;
        completionTokens += result.tokens.completion;
        
        return {
          character: req.character,
          definition: result.definition,
          sentence: req.sentence,
          tokens: result.tokens,
        };
      } catch (error) {
        errors.push({ request: req, error });
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter((r): r is NonNullable<typeof r> => r !== null);
    results.push(...validResults);

    // 批次间延迟，避免限流
    if (i + finalConcurrency < requests.length) {
      await new Promise(resolve => setTimeout(resolve, getBatchDelayMs()));
    }
  }

  // 最终进度
  if (onProgress) {
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = requests.length / elapsed;
    const tokenSpeed = completionTokens / elapsed;
    
    onProgress(requests.length, requests.length, {
      totalTokens,
      completionTokens,
      speed,
      tokenSpeed,
      startTime,
    });
  }

  // 处理失败的请求
  if (errors.length > 0) {
    console.warn(`⚠️ 第一轮：${errors.length} 个请求失败，准备重试...`, errors);
    
    // 重试失败的请求（逐个重试，降低并发）
    for (const { request, error } of errors) {
      console.log(`🔄 重试: ${request.character} in "${request.sentence.substring(0, 20)}..."`)
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));  // 重试前等待1秒
        
        const result = await generateDefinitionWithTokens(request.sentence, request.character);
        
        totalTokens += result.tokens.total;
        completionTokens += result.tokens.completion;
        
        results.push({
          character: request.character,
          definition: result.definition,
          sentence: request.sentence,
          tokens: result.tokens,
        });
        
        console.log(`✅ 重试成功: ${request.character}`)
      } catch (retryError) {
        console.error(`❌ 重试失败: ${request.character}`, retryError);
      }
    }
  }

  return results;
}


/**
 * AI二次验证：验证义项是否正确
 */
export async function validateDefinition(
  character: string,
  sentences: string[]
): Promise<{ isValid: boolean; reason?: string }> {
  console.log(`[AI二次验证] 开始验证字符"${character}"，例句数: ${sentences.length}`)
  
  const prompt = `请判断以下文言文句子中的"${character}"字是否是人名、地名、朝代名的一部分。

句子列表：
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}

如果"${character}"是人名、地名、朝代名的一部分，请回答"是"并说明原因（如：人名"谢太傅"中的"太"）。
如果不是，请回答"否"。

只输出"是"或"否"，如果是，后面加上原因：`;

  try {
    const result = await makeAIRequest(
      [
        {
          role: 'system',
          content: '你是文言文专家。只输出"是"或"否"，如果是人名/地名，说明原因。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      { temperature: 0.2, max_tokens: 100 }
    );

    const content = result.content;
    console.log(`[AI二次验证] "${character}" AI响应: ${content}`)

    if (content.startsWith('是')) {
      const reason = content.substring(1).trim();
      console.log(`[AI二次验证] "${character}" 判定为人名/地名: ${reason}`)
      return { isValid: false, reason: reason || '人名/地名/朝代名' };
    }

    console.log(`[AI二次验证] "${character}" 判定为有效`)
    return { isValid: true };
  } catch (error) {
    console.error(`[AI二次验证] "${character}" 请求失败:`, error);
    throw error;
  }
}

/**
 * 批量AI二次验证（并发）
 */
export async function batchValidateDefinitions(
  validations: Array<{ character: string; sentences: string[] }>,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ character: string; isValid: boolean; reason?: string }>> {
  // 动态导入配置
  const { getAIDefinitionConcurrency, getBatchDelayMs } = await import('./concurrencyConfig')
  
  const results: Array<{ character: string; isValid: boolean; reason?: string }> = []
  const concurrency = getAIDefinitionConcurrency()
  
  for (let i = 0; i < validations.length; i += concurrency) {
    const batch = validations.slice(i, i + concurrency)
    
    if (onProgress) {
      onProgress(i, validations.length)
    }
    
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await validateDefinition(item.character, item.sentences)
        return {
          character: item.character,
          isValid: result.isValid,
          reason: result.reason,
        }
      } catch (error) {
        console.error(`验证失败: ${item.character}`, error)
        // 验证失败时，默认认为有效（保守策略）
        return {
          character: item.character,
          isValid: true,
        }
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    // 批次间延迟
    if (i + concurrency < validations.length) {
      await new Promise(resolve => setTimeout(resolve, getBatchDelayMs()))
    }
  }
  
  if (onProgress) {
    onProgress(validations.length, validations.length)
  }
  
  return results
}

// 保留旧函数名作为别名，保持向后兼容
export const validateDefinitionNotName = validateDefinition

/**
 * AI合并重复：检查义项是否重复
 */
export async function checkDuplicateDefinitions(
  character: string,
  definitions: Array<{ id: string; content: string }>
): Promise<Array<{ keepId: string; deleteId: string; reason: string }>> {
  if (definitions.length < 2) {
    return [];
  }

  const prompt = `以下是"${character}"字的所有义项，请判断是否有语义重复或可合并的义项。

义项列表：
${definitions.map((d, i) => `${i + 1}. ${d.content}`).join('\n')}

如果有重复，请按以下格式输出（每行一个）：
合并 X 到 Y|原因

例如：
合并 2 到 1|都是代词，语义相同
合并 3 到 1|都表示顺承关系

如果没有重复，只输出"无"。`;

  try {
    const result = await makeAIRequest(
      [
        {
          role: 'system',
          content: '你是文言文专家。只输出合并建议或"无"，不要有其他话。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      { temperature: 0.2, max_tokens: 200 }
    );

    const content = result.content;

    if (content === '无' || !content) {
      return [];
    }

    // 解析合并建议
    const merges: Array<{ keepId: string; deleteId: string; reason: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/合并\s*(\d+)\s*到\s*(\d+)\s*[|｜]\s*(.+)/);
      if (match) {
        const deleteIndex = parseInt(match[1]) - 1;
        const keepIndex = parseInt(match[2]) - 1;
        const reason = match[3].trim();

        if (deleteIndex >= 0 && deleteIndex < definitions.length &&
            keepIndex >= 0 && keepIndex < definitions.length) {
          merges.push({
            keepId: definitions[keepIndex].id,
            deleteId: definitions[deleteIndex].id,
            reason,
          });
        }
      }
    }

    return merges;
  } catch (error) {
    console.error('AI 请求失败:', error);
    throw error;
  }
}

/**
 * 批量AI合并重复（并发）
 */
export async function batchCheckDuplicateDefinitions(
  checks: Array<{ character: string; definitions: Array<{ id: string; content: string }> }>,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ keepId: string; deleteId: string; reason: string }>> {
  // 动态导入配置
  const { getAIDefinitionConcurrency, getBatchDelayMs } = await import('./concurrencyConfig')
  
  const allMerges: Array<{ keepId: string; deleteId: string; reason: string }> = []
  const concurrency = getAIDefinitionConcurrency()
  
  for (let i = 0; i < checks.length; i += concurrency) {
    const batch = checks.slice(i, i + concurrency)
    
    if (onProgress) {
      onProgress(i, checks.length)
    }
    
    const batchPromises = batch.map(async (item) => {
      try {
        const merges = await checkDuplicateDefinitions(item.character, item.definitions)
        return merges
      } catch (error) {
        console.error(`合并检查失败: ${item.character}`, error)
        return []
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    allMerges.push(...batchResults.flat())
    
    // 批次间延迟
    if (i + concurrency < checks.length) {
      await new Promise(resolve => setTimeout(resolve, getBatchDelayMs()))
    }
  }
  
  if (onProgress) {
    onProgress(checks.length, checks.length)
  }
  
  return allMerges
}

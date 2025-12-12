// AI权重调整服务
// 实现AI自动调整权重分配的功能

import { ArticleWeight, CharacterWeight } from '../types/weight';

/**
 * AI权重调整请求
 */
export interface AIWeightRequest {
  type: 'single' | 'batch';
  targetId?: string;           // 单个调整时的目标ID
  context: {
    articleWeights?: ArticleWeight[];
    characterWeights?: CharacterWeight[];
    otherCharactersWeight?: number;
  };
  requirement?: string;        // 用户需求描述
}

/**
 * AI权重建议
 */
export interface AIWeightSuggestion {
  id: string;
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
}

/**
 * AI权重调整结果
 */
export interface AIWeightResult {
  success: boolean;
  suggestions: AIWeightSuggestion[];
  overallReasoning: string;
  error?: string;
}

/**
 * 验证AI请求参数完整性
 */
export function validateAIWeightRequest(request: AIWeightRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.type) {
    errors.push('请求类型不能为空');
  }

  if (request.type === 'single' && !request.targetId) {
    errors.push('单个调整时必须指定目标ID');
  }

  if (!request.context) {
    errors.push('上下文信息不能为空');
  }

  // 验证上下文中至少有一种权重数据
  if (request.context) {
    const hasArticleWeights = request.context.articleWeights && request.context.articleWeights.length > 0;
    const hasCharacterWeights = request.context.characterWeights && request.context.characterWeights.length > 0;
    
    if (!hasArticleWeights && !hasCharacterWeights) {
      errors.push('上下文中必须包含文章权重或重点字权重数据');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


/**
 * AI权重调整服务类
 */
export class AIWeightService {
  private apiEndpoint: string;
  private apiKey: string;

  constructor(apiEndpoint?: string, apiKey?: string) {
    this.apiEndpoint = apiEndpoint || '';
    this.apiKey = apiKey || '';
  }

  /**
   * 调整权重
   */
  async adjustWeight(request: AIWeightRequest): Promise<AIWeightResult> {
    // 验证请求参数
    const validation = validateAIWeightRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        suggestions: [],
        overallReasoning: '',
        error: validation.errors.join('; '),
      };
    }

    try {
      // 构建提示词
      const prompt = this.buildPrompt(request);
      
      // 调用AI服务
      const response = await this.callAI(prompt);
      
      // 解析响应
      return this.parseResponse(response, request);
    } catch (error) {
      return {
        success: false,
        suggestions: [],
        overallReasoning: '',
        error: error instanceof Error ? error.message : 'AI服务调用失败',
      };
    }
  }

  /**
   * 构建AI提示词
   */
  private buildPrompt(request: AIWeightRequest): string {
    let prompt = '请根据以下信息，为权重分配提供建议：\n\n';

    if (request.context.articleWeights && request.context.articleWeights.length > 0) {
      prompt += '文章权重配置：\n';
      request.context.articleWeights.forEach(aw => {
        prompt += `- ${aw.articleTitle}: ${aw.weight}%${aw.included ? ' (已选中)' : ''}\n`;
      });
      prompt += '\n';
    }

    if (request.context.characterWeights && request.context.characterWeights.length > 0) {
      prompt += '重点字权重配置：\n';
      request.context.characterWeights.forEach(cw => {
        prompt += `- ${cw.char}: ${cw.weight}%\n`;
      });
      if (request.context.otherCharactersWeight !== undefined) {
        prompt += `- 其他字: ${request.context.otherCharactersWeight}%\n`;
      }
      prompt += '\n';
    }

    if (request.requirement) {
      prompt += `用户需求：${request.requirement}\n\n`;
    }

    if (request.type === 'single' && request.targetId) {
      prompt += `请为ID为 "${request.targetId}" 的项目提供权重建议。\n`;
    } else {
      prompt += '请为所有项目提供权重建议。\n';
    }

    prompt += '\n请以JSON格式返回建议，格式如下：\n';
    prompt += '{"suggestions": [{"id": "项目ID", "suggestedWeight": 数值, "reason": "原因"}], "overallReasoning": "整体分析"}';

    return prompt;
  }

  /**
   * 调用AI服务
   */
  private async callAI(prompt: string): Promise<string> {
    if (!this.apiEndpoint || !this.apiKey) {
      throw new Error('AI服务未配置');
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '你是一个教育领域的权重分配专家，帮助教师合理分配考试题目的权重。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI服务请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 解析AI响应
   */
  private parseResponse(response: string, request: AIWeightRequest): AIWeightResult {
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析AI响应');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      const suggestions: AIWeightSuggestion[] = (parsed.suggestions || []).map((s: any) => {
        // 查找当前权重
        let currentWeight = 0;
        if (request.context.articleWeights) {
          const article = request.context.articleWeights.find(a => a.articleId === s.id);
          if (article) currentWeight = article.weight;
        }
        if (request.context.characterWeights) {
          const char = request.context.characterWeights.find(c => c.char === s.id);
          if (char) currentWeight = char.weight;
        }

        return {
          id: s.id,
          currentWeight,
          suggestedWeight: Math.max(0, Math.min(100, s.suggestedWeight || 0)),
          reason: s.reason || '',
        };
      });

      return {
        success: true,
        suggestions,
        overallReasoning: parsed.overallReasoning || '',
      };
    } catch (error) {
      return {
        success: false,
        suggestions: [],
        overallReasoning: '',
        error: 'AI响应格式错误',
      };
    }
  }

  /**
   * 应用AI建议到权重配置
   */
  applysuggestions(
    suggestions: AIWeightSuggestion[],
    articleWeights?: ArticleWeight[],
    characterWeights?: CharacterWeight[]
  ): { articleWeights?: ArticleWeight[]; characterWeights?: CharacterWeight[] } {
    const result: { articleWeights?: ArticleWeight[]; characterWeights?: CharacterWeight[] } = {};

    if (articleWeights) {
      result.articleWeights = articleWeights.map(aw => {
        const suggestion = suggestions.find(s => s.id === aw.articleId);
        if (suggestion) {
          return { ...aw, weight: suggestion.suggestedWeight };
        }
        return aw;
      });
    }

    if (characterWeights) {
      result.characterWeights = characterWeights.map(cw => {
        const suggestion = suggestions.find(s => s.id === cw.char);
        if (suggestion) {
          return { ...cw, weight: suggestion.suggestedWeight };
        }
        return cw;
      });
    }

    return result;
  }
}

// 导出默认实例
export const aiWeightService = new AIWeightService();

import type { ExamScope, QuestionType } from './examGenerator';
import type { StorageService } from './storage';

/**
 * AI考点生成请求
 */
export interface AIKeyPointRequest {
  requirement: string;           // 用户需求描述
  scope: ExamScope;              // 考察范围
  questionType: QuestionType;    // 题型
  apiConfigId?: string;          // AI配置ID
}

/**
 * AI考点生成结果
 */
export interface AIKeyPointResult {
  characters: string[];                    // 建议的考察字
  reasoning: string;                       // AI的推理说明
  availability: Map<string, boolean>;      // 每个字在范围内是否有数据
}

/**
 * AI考点生成服务
 */
export class AIKeyPointService {
  constructor(private storage: StorageService) {}

  /**
   * 生成考点建议
   */
  async generateKeyPoints(request: AIKeyPointRequest): Promise<AIKeyPointResult> {
    const { requirement, scope, questionType, apiConfigId } = request;

    // 构建提示词
    const prompt = this.buildPrompt(requirement, scope, questionType);

    // 调用AI服务
    const { callAI } = await import('./ai');
    const response = await callAI(prompt, apiConfigId);

    // 解析AI响应
    const parsed = this.parseAIResponse(response);

    // 验证考点可用性
    const availability = this.validateKeyPoints(parsed.characters, scope);

    return {
      characters: parsed.characters,
      reasoning: parsed.reasoning,
      availability,
    };
  }

  /**
   * 构建AI提示词
   */
  private buildPrompt(requirement: string, scope: ExamScope, questionType: QuestionType): string {
    const scopeDesc = this.describeScopeForAI(scope);
    const typeDesc = questionType === 'same-character' 
      ? '同一个字（需要选择有多个义项的字）' 
      : '不同字（可以选择不同的字）';

    return `你是一个文言文教学专家。请根据以下信息，推荐适合出题的考点（重点字）。

用户需求：${requirement}

考察范围：${scopeDesc}

题型：${typeDesc}

请按以下格式回复：

推荐考点：[用空格分隔的字，例如：而 以 之 其]

推理说明：[简要说明为什么推荐这些字]

注意事项：
1. 如果是"同一个字"题型，请推荐有多个常见义项的字（如虚词：而、以、之、其等）
2. 如果是"不同字"题型，可以推荐不同的实词或虚词
3. 考虑用户需求和考察范围，推荐3-10个字
4. 优先推荐常见且重要的字`;
  }

  /**
   * 描述考察范围（供AI理解）
   */
  private describeScopeForAI(scope: ExamScope): string {
    if (scope.articleId) {
      const article = this.storage.getArticleById(scope.articleId);
      return article ? `文章《${article.title}》` : '指定文章';
    }
    if (scope.collectionId) {
      const collection = this.storage.getCollectionById(scope.collectionId);
      return collection ? `集《${collection.name}》` : '指定集';
    }
    if (scope.libraryId) {
      const library = this.storage.getLibraryById(scope.libraryId);
      return library ? `库《${library.name}》` : '指定库';
    }
    return '所有内容';
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(response: string): Omit<AIKeyPointResult, 'availability'> {
    // 提取推荐考点
    const charactersMatch = response.match(/推荐考点[：:]\s*([^\n]+)/);
    const characters = charactersMatch 
      ? charactersMatch[1].trim().split(/\s+/).filter(c => c.length === 1)
      : [];

    // 提取推理说明
    const reasoningMatch = response.match(/推理说明[：:]\s*([^\n]+(?:\n(?!推荐考点|注意事项)[^\n]+)*)/);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '无说明';

    return {
      characters,
      reasoning,
    };
  }

  /**
   * 验证考点在范围内的可用性
   */
  validateKeyPoints(characters: string[], scope: ExamScope): Map<string, boolean> {
    const availability = new Map<string, boolean>();

    // 获取范围内的所有句子ID
    const sentenceIds = this.getSentenceIdsInScope(scope);

    // 获取所有义项
    const definitions = this.storage.getDefinitions();

    for (const char of characters) {
      // 查找该字的义项
      const charDefinitions = definitions.filter(d => d.character === char);

      if (charDefinitions.length === 0) {
        availability.set(char, false);
        continue;
      }

      // 检查是否有义项关联到范围内的句子
      let hasLinkInScope = false;
      for (const def of charDefinitions) {
        const links = this.storage.getDefinitionLinksForDefinition(def.id);
        if (links.some(link => sentenceIds.has(link.sentenceId))) {
          hasLinkInScope = true;
          break;
        }
      }

      availability.set(char, hasLinkInScope);
    }

    return availability;
  }

  /**
   * 获取范围内的句子ID集合
   */
  private getSentenceIdsInScope(scope: ExamScope): Set<string> {
    const sentenceIds = new Set<string>();
    const libraries = this.storage.getLibraries();

    for (const library of libraries) {
      if (scope.libraryId && library.id !== scope.libraryId) {
        continue;
      }

      for (const collection of library.collections) {
        if (scope.collectionId && collection.id !== scope.collectionId) {
          continue;
        }

        for (const article of collection.articles) {
          if (scope.articleId && article.id !== scope.articleId) {
            continue;
          }

          article.sentences.forEach(sentence => sentenceIds.add(sentence.id));
        }
      }
    }

    return sentenceIds;
  }
}

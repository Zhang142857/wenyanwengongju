import type {
  SearchResult,
  SearchScope,
  SearchOptions,
  Library,
  Collection,
  Article,
  Sentence,
} from '@/types';
import { StorageService } from '@/services/storage';

/**
 * 默认搜索选项
 */
export const defaultSearchOptions: SearchOptions = {
  mode: 'normal',
  caseSensitive: false,
  wholeWord: false,
  fuzzyMatch: false,
  fuzzyTolerance: 0.8,
};

/**
 * 搜索工具类
 * 负责文本搜索和筛选功能
 */
export class SearchTool {
  private storage: StorageService;

  constructor(storage: StorageService) {
    this.storage = storage;
  }

  /**
   * 按字符搜索句子
   * @param char 要搜索的字符
   * @param scope 搜索范围（可选）
   * @returns 搜索结果列表
   */
  searchByCharacter(char: string, scope?: SearchScope): SearchResult[] {
    const results: SearchResult[] = [];
    const libraries = this.storage.getLibraries();

    for (const library of libraries) {
      // 如果指定了库范围，检查当前库是否在范围内
      if (scope?.libraryIds && !scope.libraryIds.includes(library.id)) {
        continue;
      }

      for (const collection of library.collections) {
        // 如果指定了集范围，检查当前集是否在范围内
        if (scope?.collectionIds && !scope.collectionIds.includes(collection.id)) {
          continue;
        }

        for (const article of collection.articles) {
          for (const sentence of article.sentences) {
            // 检查句子是否包含目标字符
            if (sentence.text.includes(char)) {
              // 找到所有匹配位置
              const matchPositions = this.findAllPositions(sentence.text, char);

              results.push({
                sentence,
                article,
                collection,
                library,
                matchPositions,
              });
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * 使用正则表达式搜索句子
   * @param pattern 正则表达式模式
   * @param scope 搜索范围（可选）
   * @param options 搜索选项（可选）
   * @returns 搜索结果列表
   * @throws Error 如果正则表达式无效
   */
  searchByRegex(pattern: string, scope?: SearchScope, options?: Partial<SearchOptions>): SearchResult[] {
    if (!pattern || pattern.trim() === '') {
      throw new Error('正则表达式不能为空');
    }

    try {
      // 清理正则表达式模式
      let cleanPattern = pattern.trim();
      
      // 如果模式以 / 开头和结尾，提取中间的模式和标志
      const regexMatch = cleanPattern.match(/^\/(.+?)\/([gimuy]*)$/);
      let flags = 'g';
      
      if (regexMatch) {
        cleanPattern = regexMatch[1];
        const userFlags = regexMatch[2];
        // 保留用户指定的标志，但确保有 g 标志
        flags = userFlags.includes('g') ? userFlags : userFlags + 'g';
      } else {
        // 如果没有指定标志，根据选项设置
        if (options?.caseSensitive === false) {
          flags += 'i';
        }
      }

      // 验证正则表达式
      let regex: RegExp;
      try {
        regex = new RegExp(cleanPattern, flags);
      } catch (e) {
        throw new Error(`正则表达式语法错误: ${e instanceof Error ? e.message : '未知错误'}`);
      }

      const results: SearchResult[] = [];
      const sentences = this.getAllSentences(scope);

      for (const { sentence, article, collection, library } of sentences) {
        // 重置正则表达式的 lastIndex
        regex.lastIndex = 0;
        
        const matches: RegExpExecArray[] = [];
        let match: RegExpExecArray | null;
        
        // 使用 exec 循环获取所有匹配
        while ((match = regex.exec(sentence.text)) !== null) {
          matches.push(match);
          
          // 防止无限循环（零宽度匹配）
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }

        if (matches.length > 0) {
          // 获取所有匹配的起始位置和长度
          const matchPositions = matches
            .map(m => m.index)
            .filter(idx => idx !== undefined) as number[];
          
          const matchLengths = matches.map(m => m[0].length);

          // 调试日志
          console.log('正则匹配结果:', {
            text: sentence.text,
            pattern: cleanPattern,
            matches: matches.map(m => ({
              matched: m[0],
              index: m.index,
              length: m[0].length
            })),
            matchPositions,
            matchLengths
          });

          results.push({
            sentence,
            article,
            collection,
            library,
            matchPositions,
            matchLengths,
            matchType: 'regex',
          });
        }
      }

      return results;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('正则表达式')) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`正则表达式错误: ${errorMessage}`);
    }
  }

  /**
   * 反向搜索 - 查找不包含指定字符的句子
   * 反向匹配应用于所有筛选条件，返回满足所有筛选条件但不包含搜索字符的句子
   * @param char 要排除的字符
   * @param scope 搜索范围（可选）
   * @returns 搜索结果列表
   */
  searchInverse(char: string, scope?: SearchScope): SearchResult[] {
    const results: SearchResult[] = [];
    const sentences = this.getAllSentences(scope);

    for (const { sentence, article, collection, library } of sentences) {
      if (!sentence.text.includes(char)) {
        results.push({
          sentence,
          article,
          collection,
          library,
          matchPositions: [], // 反向搜索没有具体匹配位置
          matchType: 'exact',
        });
      }
    }

    return results;
  }

  /**
   * 反向正则搜索 - 查找不匹配指定正则表达式的句子
   * @param pattern 正则表达式模式
   * @param scope 搜索范围（可选）
   * @param options 搜索选项（可选）
   * @returns 搜索结果列表
   */
  searchInverseRegex(pattern: string, scope?: SearchScope, options?: Partial<SearchOptions>): SearchResult[] {
    if (!pattern || pattern.trim() === '') {
      throw new Error('正则表达式不能为空');
    }

    try {
      // 清理正则表达式模式
      let cleanPattern = pattern.trim();
      
      // 如果模式以 / 开头和结尾，提取中间的模式和标志
      const regexMatch = cleanPattern.match(/^\/(.+?)\/([gimuy]*)$/);
      let flags = '';
      
      if (regexMatch) {
        cleanPattern = regexMatch[1];
        flags = regexMatch[2];
      } else {
        // 如果没有指定标志，根据选项设置
        if (options?.caseSensitive === false) {
          flags = 'i';
        }
      }

      const regex = new RegExp(cleanPattern, flags);
      const results: SearchResult[] = [];
      const sentences = this.getAllSentences(scope);

      for (const { sentence, article, collection, library } of sentences) {
        // 重置正则表达式的 lastIndex
        regex.lastIndex = 0;
        
        // 反向匹配：不包含该模式的句子
        if (!regex.test(sentence.text)) {
          results.push({
            sentence,
            article,
            collection,
            library,
            matchPositions: [],
            matchType: 'exact',
          });
        }
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`正则表达式错误: ${errorMessage}`);
    }
  }

  /**
   * 使用选项进行搜索
   * @param query 搜索查询
   * @param options 搜索选项
   * @param scope 搜索范围（可选）
   * @returns 搜索结果列表
   */
  searchWithOptions(
    query: string,
    options: SearchOptions,
    scope?: SearchScope
  ): SearchResult[] {
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }

    // 根据模式选择搜索方法
    switch (options.mode) {
      case 'regex':
        return this.searchByRegex(query, scope, options);
      case 'inverse':
        // 反向匹配：首先尝试作为正则表达式，如果失败则作为普通字符
        try {
          return this.searchInverseRegex(query, scope, options);
        } catch {
          // 如果正则表达式无效，降级为普通字符反向搜索
          return this.searchInverse(query, scope);
        }
      case 'normal':
      default:
        return this.searchByCharacter(query, scope);
    }
  }

  /**
   * 获取所有句子及其上下文信息
   * @param scope 搜索范围（可选）
   * @returns 句子及其上下文信息的数组
   */
  private getAllSentences(scope?: SearchScope): Array<{
    sentence: Sentence;
    article: Article;
    collection: Collection;
    library: Library;
  }> {
    const sentences: Array<{
      sentence: Sentence;
      article: Article;
      collection: Collection;
      library: Library;
    }> = [];
    const libraries = this.storage.getLibraries();

    for (const library of libraries) {
      if (scope?.libraryIds && !scope.libraryIds.includes(library.id)) {
        continue;
      }

      for (const collection of library.collections) {
        if (scope?.collectionIds && !scope.collectionIds.includes(collection.id)) {
          continue;
        }

        for (const article of collection.articles) {
          for (const sentence of article.sentences) {
            sentences.push({ sentence, article, collection, library });
          }
        }
      }
    }

    return sentences;
  }

  /**
   * 查找字符在文本中的所有位置
   * @param text 文本
   * @param char 要查找的字符
   * @returns 位置索引数组
   */
  private findAllPositions(text: string, char: string): number[] {
    const positions: number[] = [];
    let index = text.indexOf(char);

    while (index !== -1) {
      positions.push(index);
      index = text.indexOf(char, index + 1);
    }

    return positions;
  }
}

/**
 * 高亮字符
 * @param text 原始文本
 * @param positions 要高亮的位置数组
 * @param matchLengths 匹配长度数组（用于正则匹配，可选）
 * @returns 带有高亮标记的文本
 */
export function highlightCharacter(
  text: string,
  positions: number[],
  matchLengths?: number[]
): string {
  if (positions.length === 0) {
    return text;
  }

  // 创建位置和长度的配对
  const matches = positions.map((pos, idx) => ({
    pos,
    length: matchLengths?.[idx] ?? 1, // 默认长度为1（单个字符）
  }));

  // 按位置从后往前排序，避免位置偏移
  const sortedMatches = [...matches].sort((a, b) => b.pos - a.pos);
  let result = text;

  for (const { pos, length } of sortedMatches) {
    if (pos >= 0 && pos + length <= result.length) {
      const matchedText = result.slice(pos, pos + length);
      result =
        result.slice(0, pos) +
        '<mark>' +
        matchedText +
        '</mark>' +
        result.slice(pos + length);
    }
  }

  return result;
}

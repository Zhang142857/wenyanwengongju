/**
 * AI整理义项服务 - 四步流程
 */

import { StorageService } from './storage';
import { generateDefinition } from './ai';

export interface CharacterSentencePair {
  sentence: string;
  character: string;
  sentenceId: string;
}

/**
 * 第一步：程序查找重点字
 * 遍历长句库，找到所有包含重点字的(句子, 字)对
 * 支持范围过滤
 */
export function findSentencesWithKeyCharacters(
  storage: StorageService,
  keyChars: string[],
  scope?: { libraryId?: string; collectionId?: string; articleId?: string }
): CharacterSentencePair[] {
  const pairs: CharacterSentencePair[] = [];
  const libraries = storage.getLibraries();

  for (const library of libraries) {
    // 检查库范围
    if (scope?.libraryId && library.id !== scope.libraryId) {
      continue;
    }

    for (const collection of library.collections) {
      // 检查集范围
      if (scope?.collectionId && collection.id !== scope.collectionId) {
        continue;
      }

      for (const article of collection.articles) {
        // 检查文章范围
        if (scope?.articleId && article.id !== scope.articleId) {
          continue;
        }

        for (const sentence of article.sentences) {
          // 检查句子是否包含任何重点字
          for (const char of keyChars) {
            if (sentence.text.includes(char)) {
              pairs.push({
                sentence: sentence.text,
                character: char,
                sentenceId: sentence.id,
              });
            }
          }
        }
      }
    }
  }

  return pairs;
}

/**
 * 第二步：去重逻辑
 * 确保第一步已处理的(句子, 字)对不会在第二步重复处理
 */
export function deduplicateCharacterSentencePairs(
  allPairs: CharacterSentencePair[],
  processedPairs: CharacterSentencePair[]
): CharacterSentencePair[] {
  const processedKeys = new Set(
    processedPairs.map(p => `${p.sentence}|${p.character}`)
  );

  return allPairs.filter(pair => {
    const key = `${pair.sentence}|${pair.character}`;
    return !processedKeys.has(key);
  });
}

/**
 * 批量生成义项（带进度回调）
 */
export async function batchGenerateDefinitionsWithProgress(
  pairs: CharacterSentencePair[],
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ pair: CharacterSentencePair; definition: string }>> {
  // 动态导入配置（避免循环依赖）
  const { getAIDefinitionConcurrency, getBatchDelayMs } = await import('./concurrencyConfig')
  
  const results: Array<{ pair: CharacterSentencePair; definition: string }> = [];
  const concurrency = getAIDefinitionConcurrency();

  for (let i = 0; i < pairs.length; i += concurrency) {
    const batch = pairs.slice(i, i + concurrency);

    if (onProgress) {
      onProgress(i, pairs.length);
    }

    const batchPromises = batch.map(async (pair) => {
      try {
        const definition = await generateDefinition(pair.sentence, pair.character);
        return { pair, definition };
      } catch (error) {
        console.error(`生成义项失败: ${pair.character} in ${pair.sentence}`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is { pair: CharacterSentencePair; definition: string } => r !== null));

    // 批次间延迟
    if (i + concurrency < pairs.length) {
      await new Promise(resolve => setTimeout(resolve, getBatchDelayMs()));
    }
  }

  if (onProgress) {
    onProgress(pairs.length, pairs.length);
  }

  return results;
}

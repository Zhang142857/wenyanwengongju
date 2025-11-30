import { v4 as uuidv4 } from 'uuid';
import type { Library, Collection, Article, Sentence, StorageData } from '@/types';

/**
 * 导入数据格式
 * 简化的JSON格式，用户只需提供基本信息
 */
export interface ImportLibrary {
  name: string;
  collections: ImportCollection[];
}

export interface ImportCollection {
  name: string;
  order: number;
  articles: ImportArticle[];
}

export interface ImportArticle {
  title: string;
  sentences: string[]; // 已分割好的句子数组
}

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean;
  message: string;
  librariesCount?: number;
  collectionsCount?: number;
  articlesCount?: number;
  sentencesCount?: number;
}

/**
 * 将导入格式转换为完整的存储数据
 */
export function convertImportData(importLibraries: ImportLibrary[]): StorageData {
  const libraries: Library[] = [];
  let totalCollections = 0;
  let totalArticles = 0;
  let totalSentences = 0;

  for (const importLib of importLibraries) {
    const libraryId = uuidv4();
    const collections: Collection[] = [];

    for (const importCol of importLib.collections) {
      const collectionId = uuidv4();
      const articles: Article[] = [];
      totalCollections++;

      for (const importArt of importCol.articles) {
        const articleId = uuidv4();
        const sentences: Sentence[] = [];
        totalArticles++;

        // 将句子数组转换为Sentence对象
        importArt.sentences.forEach((sentenceText, index) => {
          if (sentenceText.trim()) {
            sentences.push({
              id: uuidv4(),
              text: sentenceText.trim(),
              articleId,
              index,
            });
            totalSentences++;
          }
        });

        articles.push({
          id: articleId,
          title: importArt.title,
          content: importArt.sentences.join(''), // 重建完整内容
          collectionId,
          sentences,
        });
      }

      collections.push({
        id: collectionId,
        name: importCol.name,
        libraryId,
        articles,
        order: importCol.order,
      });
    }

    libraries.push({
      id: libraryId,
      name: importLib.name,
      collections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    libraries,
    quotes: [],
    definitions: [],
    translations: [],
    characterDefinitionLinks: [],
    sentenceTranslationLinks: [],
    shortSentences: [],
    keyCharacters: [],
  };
}

/**
 * 验证导入数据格式
 */
export function validateImportData(data: any): { valid: boolean; error?: string } {
  if (!Array.isArray(data)) {
    return { valid: false, error: '数据必须是数组格式' };
  }

  for (let i = 0; i < data.length; i++) {
    const lib = data[i];
    
    if (!lib.name || typeof lib.name !== 'string') {
      return { valid: false, error: `库 ${i + 1}: 缺少或无效的 name 字段` };
    }

    if (!Array.isArray(lib.collections)) {
      return { valid: false, error: `库 "${lib.name}": collections 必须是数组` };
    }

    for (let j = 0; j < lib.collections.length; j++) {
      const col = lib.collections[j];
      
      if (!col.name || typeof col.name !== 'string') {
        return { valid: false, error: `库 "${lib.name}", 集 ${j + 1}: 缺少或无效的 name 字段` };
      }

      if (typeof col.order !== 'number') {
        return { valid: false, error: `库 "${lib.name}", 集 "${col.name}": order 必须是数字` };
      }

      if (!Array.isArray(col.articles)) {
        return { valid: false, error: `库 "${lib.name}", 集 "${col.name}": articles 必须是数组` };
      }

      for (let k = 0; k < col.articles.length; k++) {
        const art = col.articles[k];
        
        if (!art.title || typeof art.title !== 'string') {
          return { valid: false, error: `库 "${lib.name}", 集 "${col.name}", 文章 ${k + 1}: 缺少或无效的 title 字段` };
        }

        if (!Array.isArray(art.sentences)) {
          return { valid: false, error: `库 "${lib.name}", 集 "${col.name}", 文章 "${art.title}": sentences 必须是数组` };
        }

        if (art.sentences.length === 0) {
          return { valid: false, error: `库 "${lib.name}", 集 "${col.name}", 文章 "${art.title}": sentences 不能为空` };
        }

        for (let l = 0; l < art.sentences.length; l++) {
          if (typeof art.sentences[l] !== 'string') {
            return { valid: false, error: `库 "${lib.name}", 集 "${col.name}", 文章 "${art.title}", 句子 ${l + 1}: 必须是字符串` };
          }
        }
      }
    }
  }

  return { valid: true };
}

/**
 * 从JSON字符串导入数据
 */
export function importFromJSON(jsonString: string): ImportResult {
  try {
    const data = JSON.parse(jsonString);
    
    // 验证数据格式
    const validation = validateImportData(data);
    if (!validation.valid) {
      return {
        success: false,
        message: `数据格式错误: ${validation.error}`,
      };
    }

    // 转换数据
    const storageData = convertImportData(data as ImportLibrary[]);

    // 统计信息
    const librariesCount = storageData.libraries.length;
    const collectionsCount = storageData.libraries.reduce(
      (sum, lib) => sum + lib.collections.length,
      0
    );
    const articlesCount = storageData.libraries.reduce(
      (sum, lib) =>
        sum +
        lib.collections.reduce((colSum, col) => colSum + col.articles.length, 0),
      0
    );
    const sentencesCount = storageData.libraries.reduce(
      (sum, lib) =>
        sum +
        lib.collections.reduce(
          (colSum, col) =>
            colSum +
            col.articles.reduce(
              (artSum, art) => artSum + art.sentences.length,
              0
            ),
          0
        ),
      0
    );

    return {
      success: true,
      message: '导入成功',
      librariesCount,
      collectionsCount,
      articlesCount,
      sentencesCount,
    };
  } catch (error) {
    return {
      success: false,
      message: `解析JSON失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 生成示例JSON
 */
export function generateExampleJSON(): string {
  const example: ImportLibrary[] = [
    {
      name: '文言文库',
      collections: [
        {
          name: '七年级上册',
          order: 1,
          articles: [
            {
              title: '论语十则',
              sentences: [
                '子曰：学而时习之，不亦说乎？',
                '有朋自远方来，不亦乐乎！',
                '人不知而不愠，不亦君子乎？',
              ],
            },
            {
              title: '陋室铭',
              sentences: [
                '山不在高，有仙则名。',
                '水不在深，有龙则灵。',
                '斯是陋室，惟吾德馨。',
              ],
            },
          ],
        },
        {
          name: '八年级上册',
          order: 2,
          articles: [
            {
              title: '桃花源记',
              sentences: [
                '晋太元中，武陵人捕鱼为业。',
                '缘溪行，忘路之远近。',
                '忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。',
              ],
            },
          ],
        },
      ],
    },
  ];

  return JSON.stringify(example, null, 2);
}

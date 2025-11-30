// 核心数据类型定义

/**
 * 库接口 - 存储文本的最高层级容器
 */
export interface Library {
  id: string;
  name: string;
  collections: Collection[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 集接口 - 库中的分类单元
 */
export interface Collection {
  id: string;
  name: string;
  libraryId: string;
  articles: Article[];
  order: number;
}

/**
 * 文章接口 - 集中的具体文言文篇目
 */
export interface Article {
  id: string;
  title: string;
  content: string;
  collectionId: string;
  sentences: Sentence[];
}

/**
 * 句子接口 - 用于搜索结果
 */
export interface Sentence {
  id: string;
  text: string;
  articleId: string;
  index: number;
}

/**
 * 搜索范围
 */
export interface SearchScope {
  libraryIds?: string[];
  collectionIds?: string[];
}

/**
 * 搜索模式
 */
export type SearchMode = 'normal' | 'regex' | 'inverse';

/**
 * 搜索选项
 */
export interface SearchOptions {
  mode: SearchMode;
  caseSensitive: boolean;
  wholeWord: boolean;
  fuzzyMatch: boolean;
  fuzzyTolerance: number; // 0-1, for fuzzy matching
}

/**
 * 搜索结果
 */
export interface SearchResult {
  sentence: Sentence;
  article: Article;
  collection: Collection;
  library: Library;
  matchPositions: number[];
  matchLengths?: number[]; // 用于正则匹配，表示每个匹配的长度
  matchType?: 'exact' | 'regex' | 'fuzzy';
  matchScore?: number;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * 名言接口
 */
export interface Quote {
  id: string;
  text: string;
  author: string;
}

/**
 * 义项接口 - 文言文中某个字的具体含义解释
 */
export interface Definition {
  id: string;
  character: string;        // 关联的字
  content: string;          // 义项内容
  createdAt: string;
  updatedAt: string;
}

/**
 * 翻译接口 - 对一个句子或短语的现代汉语翻译
 */
export interface Translation {
  id: string;
  originalText: string;     // 原文文本
  translatedText: string;   // 翻译内容
  createdAt: string;
  updatedAt: string;
}

/**
 * 字-义项-句子关联接口
 */
export interface CharacterDefinitionLink {
  id: string;
  definitionId: string;
  sentenceId: string;       // 例句ID
  characterPosition: number; // 字在句子中的位置
}

/**
 * 句子-翻译关联接口
 */
export interface SentenceTranslationLink {
  id: string;
  translationId: string;
  sentenceId: string;
  startPosition: number;    // 翻译文本在句子中的起始位置
  endPosition: number;      // 翻译文本在句子中的结束位置
}

/**
 * 标注信息（用于渲染）
 */
export interface AnnotationInfo {
  type: 'definition' | 'translation';
  startPosition: number;
  endPosition: number;
  data: Definition | Translation;
}

/**
 * 带例句的义项
 */
export interface DefinitionWithExamples {
  definition: Definition;
  examples: ExampleSentence[];
}

/**
 * 例句信息
 */
export interface ExampleSentence {
  sentence: Sentence;
  article: Article;
  collection: Collection;
  characterPosition: number;
}

/**
 * 短句接口 - 用于自动出题的短句库
 */
export interface ShortSentence {
  id: string;
  text: string;
  sourceArticleId: string;
  sourceSentenceId: string;
  createdAt: string;
}

/**
 * 存储数据结构
 */
export interface StorageData {
  libraries: Library[];
  quotes: Quote[];
  definitions: Definition[];
  translations: Translation[];
  characterDefinitionLinks: CharacterDefinitionLink[];
  sentenceTranslationLinks: SentenceTranslationLink[];
  shortSentences: ShortSentence[];
  keyCharacters: string[];  // 重点字列表
}

/**
 * 默认重点字列表（常见虚词）
 */
export const DEFAULT_KEY_CHARACTERS = [
  '而', '以', '之', '其', '于', '为', '则', '乃',
  '故', '因', '所', '者', '也', '矣', '乎', '哉',
  '焉', '且', '若', '然', '与', '及', '或', '何',
  '安', '孰', '未', '莫', '勿', '无', '非', '弗',
  '毋', '即', '既', '已', '尚', '犹', '尤', '特',
  '盖', '夫', '耳', '兮', '斯', '此', '彼', '是'
];

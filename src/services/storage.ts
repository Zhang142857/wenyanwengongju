import { v4 as uuidv4 } from 'uuid';
import type {
  Library,
  Collection,
  Article,
  Sentence,
  StorageData,
  Definition,
  Translation,
  CharacterDefinitionLink,
  SentenceTranslationLink,
  ShortSentence,
} from '@/types';

/**
 * 存储服务类
 * 负责数据的组织、管理和持久化
 */
export class StorageService {
  private data: StorageData;

  constructor() {
    this.data = {
      libraries: [],
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
   * 初始化存储
   */
  async initialize(): Promise<void> {
    await this.loadFromLocal();
  }

  /**
   * 获取所有库
   */
  getLibraries(): Library[] {
    return this.data.libraries;
  }

  /**
   * 获取指定集
   */
  getCollection(collectionId: string): Collection | null {
    for (const library of this.data.libraries) {
      const collection = library.collections.find(c => c.id === collectionId);
      if (collection) {
        return collection;
      }
    }
    return null;
  }

  /**
   * 获取指定文章
   */
  getArticle(articleId: string): Article | null {
    for (const library of this.data.libraries) {
      for (const collection of library.collections) {
        const article = collection.articles.find(a => a.id === articleId);
        if (article) {
          return article;
        }
      }
    }
    return null;
  }

  /**
   * 根据ID获取库
   */
  getLibraryById(libraryId: string): Library | null {
    return this.data.libraries.find(l => l.id === libraryId) || null;
  }

  /**
   * 根据ID获取集
   */
  getCollectionById(collectionId: string): Collection | null {
    for (const library of this.data.libraries) {
      const collection = library.collections.find(c => c.id === collectionId);
      if (collection) {
        return collection;
      }
    }
    return null;
  }

  /**
   * 根据ID获取文章
   */
  getArticleById(articleId: string): Article | null {
    return this.getArticle(articleId);
  }

  /**
   * 根据ID获取句子
   */
  getSentenceById(sentenceId: string): Sentence | null {
    for (const library of this.data.libraries) {
      for (const collection of library.collections) {
        for (const article of collection.articles) {
          const sentence = article.sentences.find(s => s.id === sentenceId);
          if (sentence) {
            return sentence;
          }
        }
      }
    }
    return null;
  }

  /**
   * 添加文章
   * 自动分割句子
   */
  addArticle(
    collectionId: string,
    article: Omit<Article, 'id' | 'sentences'>
  ): Article {
    const collection = this.getCollection(collectionId);
    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    const newArticle: Article = {
      ...article,
      id: uuidv4(),
      collectionId,
      sentences: this.splitIntoSentences(article.content, uuidv4()),
    };

    collection.articles.push(newArticle);
    
    // 更新库的更新时间
    const library = this.findLibraryByCollectionId(collectionId);
    if (library) {
      library.updatedAt = new Date().toISOString();
    }

    return newArticle;
  }

  /**
   * 分割文章内容为句子
   */
  private splitIntoSentences(content: string, articleId: string): Sentence[] {
    // 按照文言文标点符号分割：。？！；
    const sentenceDelimiters = /([。？！；])/g;
    const parts = content.split(sentenceDelimiters);
    
    const sentences: Sentence[] = [];
    let currentSentence = '';
    let index = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part.match(sentenceDelimiters)) {
        // 这是标点符号，添加到当前句子
        currentSentence += part;
        
        // 创建句子对象
        if (currentSentence.trim()) {
          sentences.push({
            id: uuidv4(),
            text: currentSentence.trim(),
            articleId,
            index: index++,
          });
        }
        
        currentSentence = '';
      } else if (part.trim()) {
        // 这是文本内容
        currentSentence += part;
      }
    }

    // 处理最后一个句子（如果没有标点结尾）
    if (currentSentence.trim()) {
      sentences.push({
        id: uuidv4(),
        text: currentSentence.trim(),
        articleId,
        index: index++,
      });
    }

    return sentences;
  }

  /**
   * 通过集ID查找所属的库
   */
  private findLibraryByCollectionId(collectionId: string): Library | null {
    for (const library of this.data.libraries) {
      if (library.collections.some(c => c.id === collectionId)) {
        return library;
      }
    }
    return null;
  }

  /**
   * 序列化数据
   */
  serialize(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * 反序列化数据
   */
  deserialize(json: string): void {
    try {
      const parsed = JSON.parse(json);
      
      // 验证数据结构
      if (!parsed.libraries || !Array.isArray(parsed.libraries)) {
        throw new Error('Invalid data structure: missing libraries array');
      }
      if (!parsed.quotes || !Array.isArray(parsed.quotes)) {
        throw new Error('Invalid data structure: missing quotes array');
      }
      
      // 确保新字段存在（向后兼容）
      this.data = {
        ...parsed,
        definitions: parsed.definitions || [],
        translations: parsed.translations || [],
        characterDefinitionLinks: parsed.characterDefinitionLinks || [],
        sentenceTranslationLinks: parsed.sentenceTranslationLinks || [],
        shortSentences: parsed.shortSentences || [],
        keyCharacters: parsed.keyCharacters || [],
      };
    } catch (error) {
      throw new Error(`Failed to deserialize data: ${error}`);
    }
  }

  /**
   * 保存到本地存储
   */
  async saveToLocal(): Promise<void> {
    try {
      const serialized = this.serialize();
      
      // 在浏览器环境使用 localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('classical-chinese-data', serialized);
      }
    } catch (error) {
      throw new Error(`Failed to save to local storage: ${error}`);
    }
  }

  /**
   * 从本地存储加载
   */
  async loadFromLocal(): Promise<void> {
    try {
      // 在浏览器环境使用 localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('classical-chinese-data');
        
        if (stored) {
          this.deserialize(stored);
        } else {
          // 如果没有数据，初始化为空结构
          this.data = {
            libraries: [],
            quotes: [],
            definitions: [],
            translations: [],
            characterDefinitionLinks: [],
            sentenceTranslationLinks: [],
            shortSentences: [],
            keyCharacters: [],
          };
        }
      }
    } catch (error) {
      console.error('Failed to load from local storage:', error);
      // 加载失败时使用空数据结构
      this.data = {
        libraries: [],
        quotes: [],
        definitions: [],
        translations: [],
        characterDefinitionLinks: [],
        sentenceTranslationLinks: [],
        shortSentences: [],
        keyCharacters: [],
      };
    }
  }

  /**
   * 添加库
   */
  addLibrary(name: string): Library {
    const newLibrary: Library = {
      id: uuidv4(),
      name,
      collections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.data.libraries.push(newLibrary);
    return newLibrary;
  }

  /**
   * 添加集
   */
  addCollection(libraryId: string, name: string, order: number): Collection {
    const library = this.data.libraries.find(l => l.id === libraryId);
    if (!library) {
      throw new Error(`Library with id ${libraryId} not found`);
    }

    const newCollection: Collection = {
      id: uuidv4(),
      name,
      libraryId,
      articles: [],
      order,
    };

    library.collections.push(newCollection);
    library.updatedAt = new Date().toISOString();
    
    return newCollection;
  }

  /**
   * 获取所有义项
   */
  getDefinitions(): Definition[] {
    return this.data.definitions;
  }

  /**
   * 获取所有翻译
   */
  getTranslations(): Translation[] {
    return this.data.translations;
  }

  /**
   * 获取所有字-义项关联
   */
  getCharacterDefinitionLinks(): CharacterDefinitionLink[] {
    return this.data.characterDefinitionLinks;
  }

  /**
   * 获取所有句子-翻译关联
   */
  getSentenceTranslationLinks(): SentenceTranslationLink[] {
    return this.data.sentenceTranslationLinks;
  }

  /**
   * 添加义项
   */
  addDefinition(character: string, content: string): Definition {
    const newDefinition: Definition = {
      id: uuidv4(),
      character,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.definitions.push(newDefinition);
    return newDefinition;
  }

  /**
   * 添加义项或返回已存在的义项（去重）
   * 如果已存在相同字符和内容的义项，返回现有义项
   */
  addDefinitionOrGetExisting(character: string, content: string): Definition {
    // 查找是否已存在相同的义项
    const existing = this.data.definitions.find(
      d => d.character === character && d.content === content
    );

    if (existing) {
      return existing;
    }

    // 不存在则创建新义项
    return this.addDefinition(character, content);
  }

  /**
   * 添加翻译
   */
  addTranslation(originalText: string, translatedText: string): Translation {
    const newTranslation: Translation = {
      id: uuidv4(),
      originalText,
      translatedText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.translations.push(newTranslation);
    return newTranslation;
  }

  /**
   * 添加字-义项关联
   */
  addCharacterDefinitionLink(
    definitionId: string,
    sentenceId: string,
    characterPosition: number
  ): CharacterDefinitionLink {
    const newLink: CharacterDefinitionLink = {
      id: uuidv4(),
      definitionId,
      sentenceId,
      characterPosition,
    };

    this.data.characterDefinitionLinks.push(newLink);
    return newLink;
  }

  /**
   * 添加句子-翻译关联
   */
  addSentenceTranslationLink(
    translationId: string,
    sentenceId: string,
    startPosition: number,
    endPosition: number
  ): SentenceTranslationLink {
    const newLink: SentenceTranslationLink = {
      id: uuidv4(),
      translationId,
      sentenceId,
      startPosition,
      endPosition,
    };

    this.data.sentenceTranslationLinks.push(newLink);
    return newLink;
  }

  /**
   * 根据ID获取义项
   */
  getDefinitionById(definitionId: string): Definition | null {
    return this.data.definitions.find(d => d.id === definitionId) || null;
  }

  /**
   * 根据ID获取翻译
   */
  getTranslationById(translationId: string): Translation | null {
    return this.data.translations.find(t => t.id === translationId) || null;
  }

  /**
   * 获取句子的所有义项关联
   */
  getDefinitionLinksForSentence(sentenceId: string): CharacterDefinitionLink[] {
    return this.data.characterDefinitionLinks.filter(
      link => link.sentenceId === sentenceId
    );
  }

  /**
   * 获取句子的所有翻译关联
   */
  getTranslationLinksForSentence(sentenceId: string): SentenceTranslationLink[] {
    return this.data.sentenceTranslationLinks.filter(
      link => link.sentenceId === sentenceId
    );
  }

  /**
   * 获取义项的所有关联
   */
  getDefinitionLinksForDefinition(definitionId: string): CharacterDefinitionLink[] {
    return this.data.characterDefinitionLinks.filter(
      link => link.definitionId === definitionId
    );
  }

  /**
   * 获取所有短句
   */
  getShortSentences(): ShortSentence[] {
    return this.data.shortSentences;
  }

  /**
   * 添加短句
   * 验证短句长度（4-15字），过滤掉1-3字的短句
   */
  addShortSentence(text: string, sourceArticleId: string, sourceSentenceId: string): ShortSentence | null {
    // 验证短句长度
    if (text.length < 4 || text.length > 15) {
      return null;
    }

    const newShortSentence: ShortSentence = {
      id: uuidv4(),
      text,
      sourceArticleId,
      sourceSentenceId,
      createdAt: new Date().toISOString(),
    };

    this.data.shortSentences.push(newShortSentence);
    return newShortSentence;
  }

  /**
   * 删除短句
   */
  deleteShortSentence(id: string): boolean {
    const index = this.data.shortSentences.findIndex(s => s.id === id);
    if (index > -1) {
      this.data.shortSentences.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 更新义项
   */
  updateDefinition(id: string, content: string): boolean {
    const definition = this.data.definitions.find(d => d.id === id);
    if (definition) {
      definition.content = content;
      definition.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 删除义项
   */
  deleteDefinition(id: string): boolean {
    const index = this.data.definitions.findIndex(d => d.id === id);
    if (index > -1) {
      this.data.definitions.splice(index, 1);
      // 同时删除相关的关联
      this.data.characterDefinitionLinks = this.data.characterDefinitionLinks.filter(
        link => link.definitionId !== id
      );
      return true;
    }
    return false;
  }

  /**
   * 清空所有短句
   */
  clearShortSentences(): void {
    this.data.shortSentences = [];
  }

  /**
   * 清空所有义项库（包括义项、关联和短句）
   */
  clearAllDefinitions(): void {
    this.data.definitions = [];
    this.data.characterDefinitionLinks = [];
    this.data.shortSentences = [];
  }

  /**
   * 获取所有重点字
   */
  getKeyCharacters(): string[] {
    return this.data.keyCharacters;
  }

  /**
   * 添加重点字
   */
  addKeyCharacter(char: string): void {
    if (!this.data.keyCharacters.includes(char)) {
      this.data.keyCharacters.push(char);
    }
  }

  /**
   * 删除重点字
   */
  removeKeyCharacter(char: string): void {
    const index = this.data.keyCharacters.indexOf(char);
    if (index > -1) {
      this.data.keyCharacters.splice(index, 1);
    }
  }

  /**
   * 合并义项
   * 将 deleteId 义项的所有例句关联移动到 keepId 义项下，然后删除 deleteId 义项
   */
  mergeDefinitions(keepId: string, deleteId: string): boolean {
    const keepDef = this.getDefinitionById(keepId);
    const deleteDef = this.getDefinitionById(deleteId);

    if (!keepDef || !deleteDef) {
      return false;
    }

    // 获取要删除义项的所有关联
    const linksToMove = this.data.characterDefinitionLinks.filter(
      link => link.definitionId === deleteId
    );

    // 将这些关联的 definitionId 更新为 keepId
    for (const link of linksToMove) {
      link.definitionId = keepId;
    }

    // 删除被合并的义项
    const index = this.data.definitions.findIndex(d => d.id === deleteId);
    if (index > -1) {
      this.data.definitions.splice(index, 1);
    }

    return true;
  }
}

import type { StorageService } from './storage';
import type { Sentence, Definition } from '@/types';

/**
 * 题型类型
 */
export type QuestionType = 'same-character' | 'different-characters'

/**
 * 答案类型：找相同还是找不同
 */
export type AnswerType = 'find-same' | 'find-different'

/**
 * 出题配置
 */
export interface ExamConfig {
  // 必填
  questionCount: number; // 题目数量
  scope: ExamScope; // 考察范围

  // 可选
  questionType?: QuestionType; // 题型（默认 'same-character'）
  answerType?: AnswerType; // 答案类型：找相同或找不同（默认 'find-different'）
  targetCharacters?: string[]; // 优先考察的字
  optionsCount?: number; // 每题选项数（默认4）
  sentencesPerOption?: number; // 每个选项的短句数量（默认3，范围2-8）
  correctAnswer?: 'A' | 'B' | 'C' | 'D'; // 正确答案（默认随机）
  matchPattern?: string; // 匹配规则（正则表达式）
  includePreviousKnowledge?: boolean; // 包括之前知识
}

export interface ExamScope {
  libraryId?: string;
  collectionId?: string;
  articleId?: string;
}

export interface ExamQuestion {
  id: string;
  questionType: QuestionType; // 题型
  answerType: AnswerType; // 答案类型：找相同或找不同
  character: string; // 考察的字（same-character 模式）
  characters?: string[]; // 考察的字列表（different-characters 模式）
  definition: string; // 该字的义项（same-character 模式）
  definitions?: string[]; // 各选项的义项（different-characters 模式）
  options: ExamOption[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

export interface ExamOption {
  label: 'A' | 'B' | 'C' | 'D';
  character?: string; // 该选项考察的字（different-characters 模式）
  definition?: string; // 该选项的义项（different-characters 模式）
  sentence: string;
  isSameDefinition: boolean; // 是否与题目义项相同
}

/**
 * 出题生成器
 */
export class ExamGenerator {
  constructor(private storage: StorageService) {}

  /**
   * 生成试题
   */
  async generateExam(config: ExamConfig): Promise<ExamQuestion[]> {
    console.log('ExamGenerator.generateExam 开始，配置:', config)
    
    const questionType = config.questionType || 'same-character'
    
    // 根据题型调用不同的生成方法
    if (questionType === 'different-characters') {
      return this.generateDifferentCharactersExam(config)
    } else {
      return this.generateSameCharacterExam(config)
    }
  }

  /**
   * 生成"同一个字"题型
   */
  private async generateSameCharacterExam(config: ExamConfig): Promise<ExamQuestion[]> {
    console.log('生成"同一个字"题型')
    
    // 1. 获取短句库
    const shortSentences = this.storage.getShortSentences();
    console.log('短句库中的短句数量:', shortSentences.length)

    if (shortSentences.length === 0) {
      throw new Error('短句库为空，请先生成短句库');
    }

    // 2. 获取所有义项
    const definitions = this.storage.getDefinitions();
    console.log('义项库中的义项数量:', definitions.length)

    if (definitions.length === 0) {
      throw new Error('义项库为空，请先添加义项或使用"AI自动生成义项"功能');
    }
    
    // 3. 检查义项是否有关联的例句
    const definitionsWithLinks = definitions.filter(def => {
      const links = this.storage.getDefinitionLinksForDefinition(def.id)
      return links.length > 0
    })
    console.log('有例句关联的义项数量:', definitionsWithLinks.length)
    
    if (definitionsWithLinks.length === 0) {
      throw new Error('义项库中的义项都没有关联例句，请使用"AI自动生成义项"功能生成带例句的义项');
    }

    // 4. 生成题目
    const questions: ExamQuestion[] = [];
    const usedCharacters = new Set<string>();
    const failedAttempts: string[] = []

    // 优先使用目标字符
    if (config.targetCharacters && config.targetCharacters.length > 0) {
      for (const char of config.targetCharacters) {
        if (questions.length >= config.questionCount) break;

        const question = this.generateQuestionForCharacter(
          char,
          shortSentences,
          definitionsWithLinks,
          config
        );

        if (question) {
          questions.push(question);
          usedCharacters.add(char);
        } else {
          failedAttempts.push(char)
        }
      }
    }

    // 补充其他题目
    let attempts = 0
    const maxAttempts = definitionsWithLinks.length * 2 // 防止无限循环
    
    while (questions.length < config.questionCount && attempts < maxAttempts) {
      attempts++
      
      const availableChars = definitionsWithLinks
        .map(d => d.character)
        .filter(c => !usedCharacters.has(c));

      if (availableChars.length === 0) {
        console.warn('可用字符不足，只能生成', questions.length, '道题');
        break;
      }

      const randomChar = availableChars[Math.floor(Math.random() * availableChars.length)];
      const question = this.generateQuestionForCharacter(
        randomChar,
        shortSentences,
        definitionsWithLinks,
        config
      );

      if (question) {
        questions.push(question);
        usedCharacters.add(randomChar);
        console.log(`成功生成第 ${questions.length} 题，字: ${randomChar}`)
      } else {
        // 如果无法生成题目，标记该字符已使用
        usedCharacters.add(randomChar);
        failedAttempts.push(randomChar)
        console.log(`无法为字 "${randomChar}" 生成题目`)
      }
    }
    
    if (failedAttempts.length > 0) {
      console.log('无法生成题目的字:', failedAttempts)
    }
    
    if (questions.length === 0) {
      throw new Error('无法生成"同一个字"题型的题目。\n\n可能原因：\n1. 大部分字只有1个义项（需要至少2个义项）\n2. 义项的短句数量不足（每个义项至少需要3个短句）\n\n建议解决方案：\n1. 切换到"不同字"题型（对数据要求更低）\n2. 使用"AI自动生成义项"功能生成更多义项\n3. 扩大考察范围');
    }

    console.log(`成功生成 ${questions.length} 道题目`)
    return questions;
  }

  /**
   * 生成"不同字"题型
   * 每个选项考察不同的字
   */
  private async generateDifferentCharactersExam(config: ExamConfig): Promise<ExamQuestion[]> {
    console.log('生成"不同字"题型')
    
    // 1. 获取短句库
    const shortSentences = this.storage.getShortSentences();
    if (shortSentences.length === 0) {
      throw new Error('短句库为空，请先生成短句库');
    }

    // 2. 获取所有义项
    const definitions = this.storage.getDefinitions();
    if (definitions.length === 0) {
      throw new Error('义项库为空，请先添加义项或使用"AI自动生成义项"功能');
    }
    
    // 3. 检查义项是否有关联的例句
    const definitionsWithLinks = definitions.filter(def => {
      const links = this.storage.getDefinitionLinksForDefinition(def.id)
      return links.length > 0
    })
    
    if (definitionsWithLinks.length === 0) {
      throw new Error('义项库中的义项都没有关联例句');
    }

    // 4. 按字符分组并统计每个字符的可用短句数量
    const optionsCount = config.optionsCount || 4
    const sentencesPerOption = config.sentencesPerOption || 3
    
    interface CharacterInfo {
      character: string
      definitions: Definition[]
      shortSentencesCount: number
      matchingShortSentences: any[] // 保存匹配的短句，避免重复计算
    }
    
    const characterInfos: CharacterInfo[] = []
    
    // 按字符分组
    const charGroups = new Map<string, Definition[]>()
    for (const def of definitionsWithLinks) {
      if (!charGroups.has(def.character)) {
        charGroups.set(def.character, [])
      }
      charGroups.get(def.character)!.push(def)
    }
    
    // 为每个字符统计可用短句数量
    // 新逻辑：直接从短句库中找到所有包含该字的短句
    for (const [character, defs] of charGroups.entries()) {
      // 直接从短句库中找到所有包含该字的短句
      const matchingShortSentences = shortSentences.filter(ss => ss.text.includes(character))
      
      characterInfos.push({
        character,
        definitions: defs,
        shortSentencesCount: matchingShortSentences.length,
        matchingShortSentences
      })
    }
    
    // 5. 筛选出符合条件的字符（短句数量 >= sentencesPerOption）
    const validCharacters = characterInfos.filter(info => info.shortSentencesCount >= sentencesPerOption)
    
    console.log(`📊 字符筛选结果：总共 ${characterInfos.length} 个字符，符合条件的 ${validCharacters.length} 个`)
    
    if (validCharacters.length < optionsCount) {
      const insufficientChars = characterInfos
        .filter(info => info.shortSentencesCount < sentencesPerOption)
        .slice(0, 10) // 只显示前10个
      
      console.log('❌ 短句不足的字符示例:', insufficientChars.map(info => 
        `${info.character}(${info.shortSentencesCount}个)`
      ).join(', '))
      
      throw new Error(
        `无法生成"不同字"题型的题目。\n\n` +
        `数据统计：\n` +
        `- 总字符数：${characterInfos.length}\n` +
        `- 符合条件的字符：${validCharacters.length}\n` +
        `- 需要字符数：${optionsCount}（每题）× ${config.questionCount}（题目数）\n\n` +
        `可能原因：\n` +
        `1. 大部分字的短句数量不足（每个字至少需要${sentencesPerOption}个短句）\n` +
        `2. 符合条件的字符数量不足\n\n` +
        `建议解决方案：\n` +
        `1. 减少"每选项短句数"（当前${sentencesPerOption}个）\n` +
        `2. 减少题目数量（当前${config.questionCount}题）\n` +
        `3. 减少每题选项数（当前${optionsCount}个）\n` +
        `4. 使用"AI自动生成义项"功能\n` +
        `5. 扩大考察范围`
      )
    }

    // 6. 生成题目
    const questions: ExamQuestion[] = []
    const usedCharacters = new Set<string>()

    for (let i = 0; i < config.questionCount; i++) {
      // 从符合条件的字符中筛选未使用的
      const availableChars = validCharacters.filter(info => !usedCharacters.has(info.character))
      
      if (availableChars.length < optionsCount) {
        console.warn(`可用字符不足（需要${optionsCount}个，只有${availableChars.length}个），只能生成${questions.length}道题`)
        break
      }

      // 随机选择N个字符
      const selectedCharInfos = this.randomSelect(availableChars, optionsCount)
      
      // 为每个字符生成选项
      const options: ExamOption[] = []
      const labels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
      const correctAnswer = config.correctAnswer || this.randomAnswer()
      const correctIndex = labels.indexOf(correctAnswer)
      
      const questionChars: string[] = []
      const questionDefs: string[] = []

      for (let j = 0; j < optionsCount; j++) {
        const charInfo = selectedCharInfos[j]
        const char = charInfo.character
        const charDefs = charInfo.definitions
        
        // 直接使用预先筛选好的短句
        const matchingShortSentences = charInfo.matchingShortSentences
        
        // 随机选择短句
        const selectedSentences = this.randomSelect(matchingShortSentences, sentencesPerOption)
        
        // 为每个短句查找对应的义项
        const sentenceDefinitions: string[] = []
        for (const ss of selectedSentences) {
          // 根据短句的 sourceSentenceId 查找义项
          const definition = this.findDefinitionForSentence(char, ss.sourceSentenceId, charDefs)
          sentenceDefinitions.push(definition)
        }
        
        // 生成短句文本
        const sentencesText = selectedSentences.map((s: any) => s.text).join('   ')
        
        // 生成解析文本（每个短句对应的义项）
        const definitionText = sentenceDefinitions.join('/')
        
        options.push({
          label: labels[j],
          character: char,
          definition: definitionText,
          sentence: sentencesText,
          isSameDefinition: j === correctIndex, // 正确答案标记
        })
        
        questionChars.push(char)
        questionDefs.push(definitionText)
      }
      
      // 生成题目
      questions.push({
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        questionType: 'different-characters',
        answerType: config.answerType || 'find-different',
        character: questionChars[correctIndex], // 主要考察字（正确答案的字）
        characters: questionChars,
        definition: questionDefs[correctIndex], // 主要义项（正确答案的义项）
        definitions: questionDefs,
        options,
        correctAnswer,
      })
      
      // 标记这些字符已使用
      selectedCharInfos.forEach(info => usedCharacters.add(info.character))
      console.log(`✅ 成功生成第 ${questions.length} 题，考察字: ${questionChars.join(', ')}`)
    }
    
    if (questions.length === 0) {
      throw new Error('无法生成"不同字"题型的题目。\n\n可能原因：\n1. 每个字的短句数量不足（每个字至少需要3个短句）\n2. 可用字符数量不足（需要至少 题目数×选项数 个字符）\n\n建议解决方案：\n1. 减少题目数量\n2. 减少每题选项数\n3. 使用"AI自动生成义项"功能\n4. 扩大考察范围')
    }

    console.log(`成功生成 ${questions.length} 道题目`)
    return questions
  }

  /**
   * 为指定字符生成一道题
   * 题目格式：找出意思都相同的一项（正确答案的N个短句是相同义项，其他选项的N个短句是不同义项）
   */
  private generateQuestionForCharacter(
    character: string,
    shortSentences: any[], // ShortSentence[]
    definitions: Definition[],
    config: ExamConfig
  ): ExamQuestion | null {
    // 获取该字的所有义项
    const charDefinitions = definitions.filter(d => d.character === character);

    if (charDefinitions.length < 2) {
      console.log(`字 "${character}" 的义项数量不足 (${charDefinitions.length} < 2)`)
      return null; // 至少需要2个义项才能出题
    }

    // 随机选择一个义项作为正确答案（相同义项）
    const targetDefinition = charDefinitions[Math.floor(Math.random() * charDefinitions.length)];

    // 获取该义项关联的句子ID和句子文本
    const links = this.storage.getDefinitionLinksForDefinition(targetDefinition.id);
    const linkedSentenceIds = new Set(links.map(link => link.sentenceId));
    
    // 获取关联句子的文本（用于模糊匹配）
    const linkedSentenceTexts: string[] = [];
    for (const link of links) {
      const sentence = this.storage.getSentenceById(link.sentenceId);
      if (sentence) {
        linkedSentenceTexts.push(sentence.text);
      }
    }
    
    // 从短句库中找到包含该字且来源于关联句子的短句（用于正确答案）
    // 策略1：通过sourceSentenceId精确匹配
    let sameShortSentences = shortSentences.filter(ss => 
      ss.text.includes(character) && linkedSentenceIds.has(ss.sourceSentenceId)
    );
    
    // 策略2：如果精确匹配不足，尝试通过文本包含关系匹配
    if (sameShortSentences.length < (config.sentencesPerOption || 3)) {
      const additionalMatches = shortSentences.filter(ss => {
        if (!ss.text.includes(character)) return false;
        if (linkedSentenceIds.has(ss.sourceSentenceId)) return false; // 已经匹配过
        // 检查短句是否是某个关联句子的子串
        return linkedSentenceTexts.some(sentenceText => sentenceText.includes(ss.text));
      });
      sameShortSentences = [...sameShortSentences, ...additionalMatches];
    }

    // 获取其他义项的例句ID和文本
    const otherDefinitions = charDefinitions.filter(d => d.id !== targetDefinition.id);
    const otherSentenceIds = new Set<string>();
    const otherSentenceTexts: string[] = [];
    
    for (const def of otherDefinitions) {
      const defLinks = this.storage.getDefinitionLinksForDefinition(def.id);
      defLinks.forEach(link => {
        otherSentenceIds.add(link.sentenceId);
        const sentence = this.storage.getSentenceById(link.sentenceId);
        if (sentence) {
          otherSentenceTexts.push(sentence.text);
        }
      });
    }
    
    // 从短句库中找到包含该字且来源于其他义项句子的短句（用于干扰项）
    // 策略1：通过sourceSentenceId精确匹配
    let differentShortSentences = shortSentences.filter(ss => 
      ss.text.includes(character) && otherSentenceIds.has(ss.sourceSentenceId)
    );
    
    // 策略2：如果精确匹配不足，尝试通过文本包含关系匹配
    const neededDifferent = ((config.optionsCount || 4) - 1) * (config.sentencesPerOption || 3);
    if (differentShortSentences.length < neededDifferent) {
      const additionalMatches = shortSentences.filter(ss => {
        if (!ss.text.includes(character)) return false;
        if (otherSentenceIds.has(ss.sourceSentenceId)) return false; // 已经匹配过
        if (linkedSentenceIds.has(ss.sourceSentenceId)) return false; // 不能和正确答案重复
        // 检查短句是否是某个其他义项句子的子串
        return otherSentenceTexts.some(sentenceText => sentenceText.includes(ss.text));
      });
      differentShortSentences = [...differentShortSentences, ...additionalMatches];
    }

    // 生成选项
    const optionsCount = config.optionsCount || 4;
    const correctAnswer = config.correctAnswer || this.randomAnswer();

    // 每个选项需要的短句数量（默认3，范围2-8）
    let sentencesPerOption = config.sentencesPerOption || 3;
    // 验证范围
    if (sentencesPerOption < 2) sentencesPerOption = 2;
    if (sentencesPerOption > 8) sentencesPerOption = 8;

    const sameCount = sentencesPerOption; // 正确答案需要N个相同义项的短句
    const differentCount = (optionsCount - 1) * sentencesPerOption; // 其他选项各需要N个不同义项的短句

    // 随机选择短句
    const selectedSame = this.randomSelect(sameShortSentences, sameCount);
    const selectedDifferent = this.randomSelect(differentShortSentences, differentCount);

    if (selectedSame.length < sameCount || selectedDifferent.length < differentCount) {
      console.log(`字 "${character}" 的短句数量不足:`, {
        需要相同义项短句: sameCount,
        实际相同义项短句: selectedSame.length,
        需要不同义项短句: differentCount,
        实际不同义项短句: selectedDifferent.length
      })
      return null; // 短句不足
    }

    // 构建选项
    const options: ExamOption[] = [];
    const labels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

    // 将正确答案放在指定位置
    const correctIndex = labels.indexOf(correctAnswer);

    let differentIndex = 0;

    for (let i = 0; i < optionsCount; i++) {
      if (i === correctIndex) {
        // 正确答案：3个相同义项的短句
        const sentencesText = selectedSame.map((s: any) => s.text).join('   ');
        options.push({
          label: labels[i],
          sentence: sentencesText,
          isSameDefinition: true,
        });
      } else {
        // 干扰项：3个不同义项的短句
        const optionSentences = selectedDifferent.slice(
          differentIndex,
          differentIndex + sentencesPerOption
        );
        const sentencesText = optionSentences.map((s: any) => s.text).join('   ');
        options.push({
          label: labels[i],
          sentence: sentencesText,
          isSameDefinition: false,
        });
        differentIndex += sentencesPerOption;
      }
    }

    return {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      questionType: 'same-character',
      answerType: config.answerType || 'find-different',
      character,
      definition: targetDefinition.content,
      options,
      correctAnswer,
    };
  }

  /**
   * 获取指定范围内的句子
   */
  private getSentencesInScope(scope: ExamScope, includePrevious: boolean = false): Sentence[] {
    const sentences: Sentence[] = [];
    const libraries = this.storage.getLibraries();

    for (const library of libraries) {
      // 库筛选
      if (scope.libraryId && library.id !== scope.libraryId) {
        continue;
      }

      for (const collection of library.collections) {
        // 集筛选
        if (scope.collectionId && collection.id !== scope.collectionId) {
          // 如果开启了"包括之前知识"，则包含order更小的集
          if (includePrevious && scope.collectionId) {
            const targetCollection = library.collections.find(c => c.id === scope.collectionId);
            if (!targetCollection || collection.order >= targetCollection.order) {
              continue;
            }
          } else {
            continue;
          }
        }

        for (const article of collection.articles) {
          // 文章筛选
          if (scope.articleId && article.id !== scope.articleId) {
            continue;
          }

          sentences.push(...article.sentences);
        }
      }
    }

    return sentences;
  }

  /**
   * 随机选择元素
   */
  private randomSelect<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * 随机生成答案
   */
  private randomAnswer(): 'A' | 'B' | 'C' | 'D' {
    const answers: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    return answers[Math.floor(Math.random() * answers.length)];
  }

  /**
   * 根据短句的来源句子ID查找对应的义项
   * @param character 字符
   * @param sourceSentenceId 短句的来源句子ID
   * @param charDefs 该字符的所有义项
   * @returns 义项内容
   */
  private findDefinitionForSentence(
    character: string,
    sourceSentenceId: string,
    charDefs: Definition[]
  ): string {
    // 遍历该字符的所有义项，查找关联到这个句子的义项
    for (const def of charDefs) {
      const links = this.storage.getDefinitionLinksForDefinition(def.id)
      for (const link of links) {
        if (link.sentenceId === sourceSentenceId) {
          return def.content
        }
      }
    }
    
    // 如果没有找到精确匹配，尝试通过句子文本匹配
    const sentence = this.storage.getSentenceById(sourceSentenceId)
    if (sentence) {
      for (const def of charDefs) {
        const links = this.storage.getDefinitionLinksForDefinition(def.id)
        for (const link of links) {
          const linkedSentence = this.storage.getSentenceById(link.sentenceId)
          if (linkedSentence && linkedSentence.text.includes(sentence.text)) {
            return def.content
          }
        }
      }
    }
    
    // 如果还是没有找到，返回第一个义项（兜底）
    return charDefs.length > 0 ? charDefs[0].content : '未知'
  }
}

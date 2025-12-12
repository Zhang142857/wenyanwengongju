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
export interface CharacterWeight {
  char: string;
  weight: number; // 0-100
}

export interface ArticleWeightConfig {
  articleId: string;
  weight: number; // 0-100，0表示完全排除
  included: boolean; // 是否包含在考察范围
}

export interface ExamConfig {
  // 必填
  questionCount: number; // 题目数量
  scope: ExamScope; // 考察范围

  // 可选
  questionType?: QuestionType; // 题型（默认 'same-character'）
  answerType?: AnswerType; // 答案类型：找相同或找不同（默认 'find-different'）
  targetCharacters?: string[]; // 优先考察的字（已废弃，使用 priorityCharacters）
  priorityCharacters?: string[]; // 优先考察的字
  characterWeights?: CharacterWeight[]; // 字符权重配置（新）
  articleWeights?: ArticleWeightConfig[]; // 文章权重配置（新）
  randomRate?: number; // 随机率 0-100，默认100（100表示完全随机，0表示只用优先字）
  optionsCount?: number; // 每题选项数（默认4）
  sentencesPerOption?: number; // 每个选项的短句数量（默认3，范围2-8）
  correctAnswer?: 'A' | 'B' | 'C' | 'D'; // 正确答案（默认随机）
  matchPattern?: string; // 匹配规则（正则表达式）
  includePreviousKnowledge?: boolean; // 包括之前知识
  previousKnowledgeWeight?: number; // 之前知识的权重 0-100
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
    
    // 获取文章权重配置
    const articleWeights = config.articleWeights;
    if (articleWeights && articleWeights.length > 0) {
      const includedCount = articleWeights.filter(aw => aw.included && aw.weight > 0).length;
      console.log(`文章权重配置: ${articleWeights.length}篇文章, ${includedCount}篇被选中`);
    }
    
    // 1. 获取范围内的短句库
    const shortSentences = this.getShortSentencesInScope(config.scope, config.includePreviousKnowledge, articleWeights);
    console.log('范围内短句数量:', shortSentences.length)

    if (shortSentences.length === 0) {
      throw new Error('指定范围内没有短句数据，请先生成短句库或扩大考察范围');
    }

    // 2. 获取范围内的义项
    const definitions = this.getDefinitionsInScope(config.scope, config.includePreviousKnowledge, articleWeights);
    console.log('范围内义项数量:', definitions.length)

    if (definitions.length === 0) {
      throw new Error('指定范围内没有义项数据，请使用"AI自动生成义项"功能或扩大考察范围');
    }
    
    // 3. 检查义项是否有关联的例句
    const definitionsWithLinks = definitions.filter(def => {
      const links = this.storage.getDefinitionLinksForDefinition(def.id)
      return links.length > 0
    })
    console.log('有例句关联的义项数量:', definitionsWithLinks.length)
    
    if (definitionsWithLinks.length === 0) {
      throw new Error('指定范围内的义项都没有关联例句，请使用"AI自动生成义项"功能');
    }

    // 4. 生成题目
    const questions: ExamQuestion[] = [];
    const usedCharacters = new Set<string>();
    const failedAttempts: string[] = []

    // 获取字符权重配置
    const characterWeights = config.characterWeights || [];
    const priorityChars = config.priorityCharacters || config.targetCharacters || [];
    const randomRate = config.randomRate !== undefined ? config.randomRate : 100;
    
    // 如果有权重配置，使用权重选择字符
    const useWeightedSelection = characterWeights.length > 0;
    
    // 计算需要多少题使用优先字，多少题随机
    const totalQuestions = config.questionCount;
    let priorityQuestionCount: number;
    let randomQuestionCount: number;
    
    if (useWeightedSelection) {
      // 使用权重配置时，所有题目都从权重列表中选择
      priorityQuestionCount = totalQuestions;
      randomQuestionCount = 0;
      console.log(`使用权重配置，${characterWeights.length}个字符`);
    } else {
      priorityQuestionCount = randomRate === 100 ? 0 : Math.ceil(totalQuestions * (100 - randomRate) / 100);
      randomQuestionCount = totalQuestions - priorityQuestionCount;
      console.log(`随机率: ${randomRate}%, 优先字题目: ${priorityQuestionCount}, 随机题目: ${randomQuestionCount}`);
    }

    // 第一阶段：生成优先字/权重字题目
    let priorityQuestionsGenerated = 0;
    
    if (useWeightedSelection) {
      // 使用权重选择字符（优先考察重点字，但不排斥其他字）
      const weightedChars = this.selectCharactersByWeight(characterWeights, totalQuestions * 2); // 多选一些备用
      console.log(`🎯 重点字权重选择: ${weightedChars.join(', ')}`);
      
      for (const char of weightedChars) {
        if (questions.length >= totalQuestions) break;
        if (usedCharacters.has(char)) continue;

        const question = this.generateQuestionForCharacter(
          char,
          shortSentences,
          definitionsWithLinks,
          config
        );

        if (question) {
          questions.push(question);
          usedCharacters.add(char);
          priorityQuestionsGenerated++;
          console.log(`✓ 重点字 "${char}" 生成第 ${questions.length} 题`);
        } else {
          failedAttempts.push(char);
          console.log(`✗ 重点字 "${char}" 无法生成题目（数据不足）`);
        }
      }
      
      console.log(`📊 重点字生成了 ${priorityQuestionsGenerated} 道题，还需要 ${totalQuestions - questions.length} 道`);
    } else if (priorityChars.length > 0 && priorityQuestionCount > 0) {
      for (const char of priorityChars) {
        if (questions.length >= priorityQuestionCount) break;

        const question = this.generateQuestionForCharacter(
          char,
          shortSentences,
          definitionsWithLinks,
          config
        );

        if (question) {
          questions.push(question);
          usedCharacters.add(char);
          priorityQuestionsGenerated++;
          console.log(`✓ 优先字 "${char}" 生成第 ${questions.length} 题`)
        } else {
          failedAttempts.push(char)
          console.log(`✗ 优先字 "${char}" 无法生成题目`)
        }
      }
    }

    // 第二阶段：补充随机题目（当重点字不够时，从其他字中补充）
    if (questions.length < config.questionCount) {
      console.log(`🔄 开始补充随机题目，还需要 ${config.questionCount - questions.length} 道`);
    }
    
    let attempts = 0
    const maxAttempts = definitionsWithLinks.length * 2 // 防止无限循环
    let randomQuestionsGenerated = 0;
    
    while (questions.length < config.questionCount && attempts < maxAttempts) {
      attempts++
      
      const availableChars = definitionsWithLinks
        .map(d => d.character)
        .filter(c => !usedCharacters.has(c));

      if (availableChars.length === 0) {
        console.warn('⚠️ 可用字符不足，只能生成', questions.length, '道题');
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
        randomQuestionsGenerated++;
        console.log(`✓ 其他字 "${randomChar}" 生成第 ${questions.length} 题`)
      } else {
        // 如果无法生成题目，标记该字符已使用
        usedCharacters.add(randomChar);
        failedAttempts.push(randomChar)
      }
    }
    
    // 输出统计信息
    console.log(`📊 题目生成统计: 重点字 ${priorityQuestionsGenerated} 道, 其他字 ${randomQuestionsGenerated} 道, 共 ${questions.length} 道`);
    
    if (failedAttempts.length > 0) {
      console.log('无法生成题目的字:', failedAttempts)
    }
    
    if (questions.length === 0) {
      // 统计数据
      const charGroups = new Map<string, number>();
      for (const def of definitionsWithLinks) {
        charGroups.set(def.character, (charGroups.get(def.character) || 0) + 1);
      }
      const multiDefChars = Array.from(charGroups.values()).filter(count => count >= 2).length;
      
      throw new Error(
        `无法生成"同一个字"题型的题目。\n\n` +
        `数据统计（当前范围）：\n` +
        `- 义项总数：${definitionsWithLinks.length}\n` +
        `- 短句总数：${shortSentences.length}\n` +
        `- 有多个义项的字：${multiDefChars}\n` +
        `- 需要题目数：${config.questionCount}\n\n` +
        `可能原因：\n` +
        `1. 大部分字只有1个义项（需要至少2个义项）\n` +
        `2. 义项的短句数量不足（每个义项至少需要${config.sentencesPerOption || 3}个短句）\n\n` +
        `建议解决方案：\n` +
        `1. 切换到"不同字"题型（对数据要求更低）\n` +
        `2. 使用"AI自动生成义项"功能生成更多义项\n` +
        `3. 扩大考察范围或减少题目数量`
      );
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
    
    // 获取文章权重配置
    const articleWeights = config.articleWeights;
    if (articleWeights && articleWeights.length > 0) {
      const includedCount = articleWeights.filter(aw => aw.included && aw.weight > 0).length;
      console.log(`文章权重配置: ${articleWeights.length}篇文章, ${includedCount}篇被选中`);
    }
    
    // 1. 获取范围内的短句库
    const shortSentences = this.getShortSentencesInScope(config.scope, config.includePreviousKnowledge, articleWeights);
    if (shortSentences.length === 0) {
      throw new Error('指定范围内没有短句数据，请先生成短句库或扩大考察范围');
    }

    // 2. 获取范围内的义项
    const definitions = this.getDefinitionsInScope(config.scope, config.includePreviousKnowledge, articleWeights);
    if (definitions.length === 0) {
      throw new Error('指定范围内没有义项数据，请使用"AI自动生成义项"功能或扩大考察范围');
    }
    
    // 3. 检查义项是否有关联的例句
    const definitionsWithLinks = definitions.filter(def => {
      const links = this.storage.getDefinitionLinksForDefinition(def.id)
      return links.length > 0
    })
    
    if (definitionsWithLinks.length === 0) {
      throw new Error('指定范围内的义项都没有关联例句');
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
    
    // 检查重点字的数据情况
    const characterWeightsForCheck = config.characterWeights || [];
    if (characterWeightsForCheck.length > 0) {
      console.log(`🔍 [不同字题型] 检查重点字数据情况:`);
      for (const cw of characterWeightsForCheck.filter(w => w.weight > 0)) {
        const charInfo = characterInfos.find(info => info.character === cw.char);
        if (charInfo) {
          const isValid = charInfo.shortSentencesCount >= sentencesPerOption;
          console.log(`   ${cw.char}: ${charInfo.shortSentencesCount}个短句 ${isValid ? '✓ 可用' : `✗ 不足(需要${sentencesPerOption}个)`}`);
        } else {
          console.log(`   ${cw.char}: 无义项数据 ✗`);
        }
      }
    }
    
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
    const usedNormalChars = new Set<string>() // 普通字只能使用一次
    const priorityCharUsageCount = new Map<string, number>() // 重点字的使用次数
    
    // 获取优先字符列表和权重配置
    const characterWeights = config.characterWeights || [];
    const priorityChars = config.priorityCharacters || config.targetCharacters || [];
    const randomRate = config.randomRate !== undefined ? config.randomRate : 100;
    const useWeightedSelection = characterWeights.length > 0;
    
    // 计算每个重点字的最大使用次数（基于权重）
    const priorityCharMaxUsage = new Map<string, number>();
    const priorityCharSet = new Set<string>();
    if (useWeightedSelection) {
      for (const cw of characterWeights) {
        if (cw.weight > 0) {
          // 权重越高，允许使用的次数越多
          // 权重80%的字在5道题中最多可以使用 ceil(5 * 0.8) = 4 次
          const maxUsage = Math.max(1, Math.ceil(config.questionCount * cw.weight / 100));
          priorityCharMaxUsage.set(cw.char, maxUsage);
          priorityCharSet.add(cw.char);
          priorityCharUsageCount.set(cw.char, 0);
        }
      }
    }
    
    // 调试日志
    if (useWeightedSelection) {
      const weightedCharsDebug = characterWeights
        .filter(w => w.weight > 0)
        .map(w => `${w.char}(${w.weight}%,最多${priorityCharMaxUsage.get(w.char)}次)`);
      console.log(`🎯 [不同字题型] 使用权重配置: ${weightedCharsDebug.join(', ')}`);
      
      // 检查哪些重点字在有效字符列表中
      const validCharsSet = new Set(validCharacters.map(v => v.character));
      const matchedChars = characterWeights.filter(w => w.weight > 0 && validCharsSet.has(w.char));
      const unmatchedChars = characterWeights.filter(w => w.weight > 0 && !validCharsSet.has(w.char));
      
      console.log(`📊 重点字匹配情况: ${matchedChars.length}个可用, ${unmatchedChars.length}个不可用`);
      if (unmatchedChars.length > 0) {
        console.log(`⚠️ 不可用的重点字（数据不足）: ${unmatchedChars.map(w => w.char).join(', ')}`);
      }
    }
    
    let priorityQuestionsCount = 0;
    let randomQuestionsCount = 0;

    for (let i = 0; i < config.questionCount; i++) {
      // 从符合条件的字符中筛选可用的字符
      // 重点字：检查是否达到最大使用次数
      // 普通字：检查是否已使用
      const availableChars = validCharacters.filter(info => {
        if (priorityCharSet.has(info.character)) {
          // 重点字：检查使用次数
          const currentUsage = priorityCharUsageCount.get(info.character) || 0;
          const maxUsage = priorityCharMaxUsage.get(info.character) || 1;
          return currentUsage < maxUsage;
        } else {
          // 普通字：检查是否已使用
          return !usedNormalChars.has(info.character);
        }
      })
      
      if (availableChars.length < optionsCount) {
        console.warn(`可用字符不足（需要${optionsCount}个，只有${availableChars.length}个），只能生成${questions.length}道题`)
        break
      }

      // 根据权重或随机率选择字符
      let selectedCharInfos: typeof validCharacters;
      let usedPriorityInThisQuestion = false;
      
      if (useWeightedSelection) {
        // 使用权重配置选择字符
        // 策略：权重高的字优先被选中，且更可能成为正确答案
        const weightedChars = characterWeights
          .filter(w => w.weight > 0)
          .sort((a, b) => b.weight - a.weight)
          .map(w => w.char);
        
        const priorityCharInfos = availableChars.filter(info => weightedChars.includes(info.character));
        const nonPriorityChars = availableChars.filter(info => !weightedChars.includes(info.character));
        
        if (priorityCharInfos.length >= optionsCount) {
          // 重点字足够，全部从重点字中选择（按权重）
          selectedCharInfos = this.selectCharInfosByWeight(priorityCharInfos, characterWeights, optionsCount);
          usedPriorityInThisQuestion = true;
        } else if (priorityCharInfos.length > 0) {
          // 重点字不足，优先使用重点字，补充其他字
          // 确保重点字在前面（更可能成为正确答案）
          const supplementCount = optionsCount - priorityCharInfos.length;
          const supplementChars = this.randomSelect(nonPriorityChars, supplementCount);
          // 重点字放在前面，这样在随机选择正确答案时更可能选中重点字
          selectedCharInfos = [...priorityCharInfos, ...supplementChars];
          usedPriorityInThisQuestion = true;
          console.log(`📝 第${i+1}题: 使用${priorityCharInfos.length}个重点字 + ${supplementChars.length}个其他字`);
        } else {
          // 没有可用的重点字，完全随机
          selectedCharInfos = this.randomSelect(availableChars, optionsCount);
        }
        
        if (usedPriorityInThisQuestion) {
          priorityQuestionsCount++;
        } else {
          randomQuestionsCount++;
        }
      } else if (randomRate === 0 && priorityChars.length > 0) {
        // 随机率为0，只使用优先字
        const priorityCharInfos = availableChars.filter(info => priorityChars.includes(info.character));
        if (priorityCharInfos.length >= optionsCount) {
          selectedCharInfos = this.randomSelect(priorityCharInfos, optionsCount);
        } else {
          // 优先字不足，补充随机字
          const remainingCount = optionsCount - priorityCharInfos.length;
          const nonPriorityChars = availableChars.filter(info => !priorityChars.includes(info.character));
          const supplementChars = this.randomSelect(nonPriorityChars, remainingCount);
          selectedCharInfos = [...priorityCharInfos, ...supplementChars];
        }
      } else if (randomRate === 100 || priorityChars.length === 0) {
        // 随机率为100或没有优先字，完全随机
        selectedCharInfos = this.randomSelect(availableChars, optionsCount);
      } else {
        // 混合模式：按比例选择优先字和随机字
        const priorityCount = Math.ceil(optionsCount * (100 - randomRate) / 100);
        const randomCount = optionsCount - priorityCount;
        
        const priorityCharInfos = availableChars.filter(info => priorityChars.includes(info.character));
        const nonPriorityChars = availableChars.filter(info => !priorityChars.includes(info.character));
        
        const selectedPriority = this.randomSelect(priorityCharInfos, Math.min(priorityCount, priorityCharInfos.length));
        const selectedRandom = this.randomSelect(nonPriorityChars, optionsCount - selectedPriority.length);
        
        selectedCharInfos = [...selectedPriority, ...selectedRandom];
        
        // 如果总数不足，从所有可用字符中补充
        if (selectedCharInfos.length < optionsCount) {
          const usedInSelection = new Set(selectedCharInfos.map(info => info.character));
          const remaining = availableChars.filter(info => !usedInSelection.has(info.character));
          const supplement = this.randomSelect(remaining, optionsCount - selectedCharInfos.length);
          selectedCharInfos = [...selectedCharInfos, ...supplement];
        }
      }
      
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
      selectedCharInfos.forEach(info => {
        if (priorityCharSet.has(info.character)) {
          // 重点字：增加使用次数
          const currentUsage = priorityCharUsageCount.get(info.character) || 0;
          priorityCharUsageCount.set(info.character, currentUsage + 1);
        } else {
          // 普通字：标记为已使用
          usedNormalChars.add(info.character);
        }
      })
      console.log(`✅ 成功生成第 ${questions.length} 题，考察字: ${questionChars.join(', ')}`)
    }
    
    if (questions.length === 0) {
      throw new Error('无法生成"不同字"题型的题目。\n\n可能原因：\n1. 每个字的短句数量不足（每个字至少需要3个短句）\n2. 可用字符数量不足（需要至少 题目数×选项数 个字符）\n\n建议解决方案：\n1. 减少题目数量\n2. 减少每题选项数\n3. 使用"AI自动生成义项"功能\n4. 扩大考察范围')
    }

    // 输出统计信息
    if (useWeightedSelection) {
      console.log(`📊 [不同字题型] 题目生成统计: 使用重点字 ${priorityQuestionsCount} 题, 完全随机 ${randomQuestionsCount} 题, 共 ${questions.length} 题`);
      
      // 显示每个重点字的实际使用次数
      const usageStats = Array.from(priorityCharUsageCount.entries())
        .filter(([_, count]) => count > 0)
        .map(([char, count]) => `${char}×${count}`)
        .join(', ');
      if (usageStats) {
        console.log(`📈 重点字使用情况: ${usageStats}`);
      }
    }
    
    console.log(`成功生成 ${questions.length} 道题目`)
    return questions
  }

  /**
   * 根据权重选择字符
   * 权重越高，被选中的概率越大
   */
  private selectCharactersByWeight(weights: CharacterWeight[], count: number): string[] {
    if (weights.length === 0) return [];
    
    // 过滤掉权重为0的字符
    const validWeights = weights.filter(w => w.weight > 0);
    if (validWeights.length === 0) return [];
    
    // 计算总权重
    const totalWeight = validWeights.reduce((sum, w) => sum + w.weight, 0);
    
    // 根据权重随机选择
    const selected: string[] = [];
    const availableWeights = [...validWeights];
    
    while (selected.length < count && availableWeights.length > 0) {
      // 随机选择一个
      const random = Math.random() * availableWeights.reduce((sum, w) => sum + w.weight, 0);
      let cumulative = 0;
      
      for (let i = 0; i < availableWeights.length; i++) {
        cumulative += availableWeights[i].weight;
        if (random <= cumulative) {
          selected.push(availableWeights[i].char);
          availableWeights.splice(i, 1); // 移除已选择的，避免重复
          break;
        }
      }
    }
    
    return selected;
  }

  /**
   * 根据权重选择字符信息（用于不同字题型）
   * 从字符信息列表中根据权重随机选择
   */
  private selectCharInfosByWeight<T extends { character: string }>(
    charInfos: T[],
    weights: CharacterWeight[],
    count: number
  ): T[] {
    if (charInfos.length === 0) return [];
    
    // 构建权重映射
    const weightMap = new Map(weights.map(w => [w.char, w.weight]));
    
    // 为每个字符信息添加权重
    const infosWithWeight = charInfos.map(info => ({
      info,
      weight: weightMap.get(info.character) || 1, // 默认权重为1
    }));
    
    // 根据权重随机选择
    const selected: T[] = [];
    const available = [...infosWithWeight];
    
    while (selected.length < count && available.length > 0) {
      const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
      const random = Math.random() * totalWeight;
      let cumulative = 0;
      
      for (let i = 0; i < available.length; i++) {
        cumulative += available[i].weight;
        if (random <= cumulative) {
          selected.push(available[i].info);
          available.splice(i, 1);
          break;
        }
      }
    }
    
    return selected;
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
   * 获取指定范围内的义项
   * 只返回关联到范围内句子的义项
   */
  private getDefinitionsInScope(
    scope: ExamScope, 
    includePrevious: boolean = false,
    articleWeights?: ArticleWeightConfig[]
  ): Definition[] {
    // 获取范围内的句子ID集合
    const sentenceIds = this.getSentenceIdsInScope(scope, includePrevious, articleWeights);
    
    // 获取所有义项
    const allDefinitions = this.storage.getDefinitions();
    
    // 筛选出关联到范围内句子的义项
    const definitionsInScope: Definition[] = [];
    
    for (const definition of allDefinitions) {
      const links = this.storage.getDefinitionLinksForDefinition(definition.id);
      
      // 检查是否有任何关联指向范围内的句子
      const hasLinkInScope = links.some(link => sentenceIds.has(link.sentenceId));
      
      if (hasLinkInScope) {
        definitionsInScope.push(definition);
      }
    }
    
    return definitionsInScope;
  }

  /**
   * 获取指定范围内的短句
   * 根据 sourceSentenceId 筛选范围内的短句
   */
  private getShortSentencesInScope(
    scope: ExamScope, 
    includePrevious: boolean = false,
    articleWeights?: ArticleWeightConfig[]
  ): any[] {
    // 获取范围内的句子ID集合
    const sentenceIds = this.getSentenceIdsInScope(scope, includePrevious, articleWeights);
    
    // 获取所有短句
    const allShortSentences = this.storage.getShortSentences();
    
    // 筛选出来源于范围内句子的短句
    const shortSentencesInScope = allShortSentences.filter(
      shortSentence => sentenceIds.has(shortSentence.sourceSentenceId)
    );
    
    return shortSentencesInScope;
  }

  /**
   * 获取指定范围内的句子ID集合
   * 用于筛选义项和短句
   * @param scope 考察范围
   * @param includePrevious 是否包含之前知识
   * @param articleWeights 文章权重配置（可选，用于过滤文章）
   */
  private getSentenceIdsInScope(
    scope: ExamScope, 
    includePrevious: boolean = false,
    articleWeights?: ArticleWeightConfig[]
  ): Set<string> {
    const sentenceIds = new Set<string>();
    const libraries = this.storage.getLibraries();

    // 构建文章过滤集合（只包含 included=true 且 weight>0 的文章）
    const includedArticleIds = articleWeights 
      ? new Set(articleWeights.filter(aw => aw.included && aw.weight > 0).map(aw => aw.articleId))
      : null;
    
    // 如果有文章权重配置但没有任何文章被选中，返回空集合
    if (includedArticleIds && includedArticleIds.size === 0) {
      console.log('⚠️ 文章权重配置中没有任何文章被选中');
      return sentenceIds;
    }

    for (const library of libraries) {
      // 库筛选
      if (scope.libraryId && library.id !== scope.libraryId) {
        continue;
      }

      // 找到目标集和目标文章的索引（用于"包括之前知识"的比较）
      let targetCollection: any = null;
      let targetArticleIndex: number = -1;
      
      if (scope.collectionId) {
        targetCollection = library.collections.find(c => c.id === scope.collectionId);
        if (targetCollection && scope.articleId) {
          targetArticleIndex = targetCollection.articles.findIndex((a: any) => a.id === scope.articleId);
        }
      }

      for (const collection of library.collections) {
        // 集筛选
        if (scope.collectionId && collection.id !== scope.collectionId) {
          // 如果开启了"包括之前知识"，则包含order更小的集
          if (includePrevious && targetCollection) {
            if (collection.order >= targetCollection.order) {
              continue;
            }
            // 之前的集，包含所有文章（但仍需检查文章权重）
            for (const article of collection.articles) {
              // 检查文章是否在权重配置中被选中
              if (includedArticleIds && !includedArticleIds.has(article.id)) {
                continue;
              }
              article.sentences.forEach((sentence: any) => sentenceIds.add(sentence.id));
            }
            continue;
          } else {
            continue;
          }
        }

        for (let articleIndex = 0; articleIndex < collection.articles.length; articleIndex++) {
          const article = collection.articles[articleIndex];
          
          // 检查文章是否在权重配置中被选中
          if (includedArticleIds && !includedArticleIds.has(article.id)) {
            continue;
          }
          
          // 文章筛选
          if (scope.articleId && article.id !== scope.articleId) {
            // 如果开启了"包括之前知识"，则包含同一集中索引更小的文章
            if (includePrevious && targetArticleIndex >= 0 && collection.id === scope.collectionId) {
              if (articleIndex >= targetArticleIndex) {
                continue;
              }
              // 之前的文章，包含所有句子
              article.sentences.forEach((sentence: any) => sentenceIds.add(sentence.id));
              continue;
            } else {
              continue;
            }
          }

          // 添加该文章的所有句子ID
          article.sentences.forEach((sentence: any) => sentenceIds.add(sentence.id));
        }
      }
    }

    return sentenceIds;
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

// 权重系统类型定义

/**
 * 文章权重
 * 用于控制各文章在出题中的比重
 */
export interface ArticleWeight {
  articleId: string;
  articleTitle: string;
  collectionId: string;
  collectionName: string;
  weight: number;      // 0-100
  included: boolean;   // 是否包含在考察范围
  order: number;       // 显示顺序
}

/**
 * 重点字权重
 * 用于控制重点字在出题中的考察概率
 */
export interface CharacterWeight {
  char: string;
  weight: number;      // 0-100，该字在重点字池中的权重
}

/**
 * 统一权重配置
 * 整合文章、义项、考察字的加权数据
 */
export interface UnifiedWeightConfig {
  id: string;
  name: string;
  note?: string;
  
  // 文章权重配置
  articleWeights: ArticleWeight[];
  
  // 重点字权重配置
  characterWeights: CharacterWeight[];
  otherCharactersWeight: number;  // 其他字的权重（0-100）
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 权重验证结果
 * 用于验证权重配置的有效性
 */
export interface WeightValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * 题目分配结果
 * 用于计算重点字和其他字的题目数量分配
 */
export interface QuestionDistribution {
  priorityCount: number;  // 重点字题目数量
  otherCount: number;     // 其他字题目数量
}

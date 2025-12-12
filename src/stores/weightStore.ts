// 权重状态管理 Store
// 使用 Zustand 实现统一的权重状态管理，支持双向数据同步

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  UnifiedWeightConfig,
  ArticleWeight,
  CharacterWeight,
} from '../types/weight';
import { calculateOtherCharactersWeight, validateWeights } from '../services/weightCalculator';
import { weightStorage, createDefaultWeightConfig } from '../services/weightStorage';
import { weightEventBus } from '../services/weightEventBus';

/**
 * 权重状态接口
 */
export interface WeightState {
  // 当前配置
  currentConfig: UnifiedWeightConfig | null;
  
  // 是否已初始化
  initialized: boolean;
  
  // 文章权重操作
  setArticleWeight: (articleId: string, weight: number) => void;
  setArticleIncluded: (articleId: string, included: boolean) => void;
  setArticleRange: (startIndex: number, endIndex: number) => void;
  addArticle: (article: Omit<ArticleWeight, 'order'>) => void;
  removeArticle: (articleId: string) => void;
  
  // 重点字权重操作
  addCharacter: (char: string, weight: number) => void;
  removeCharacter: (char: string) => void;
  setCharacterWeight: (char: string, weight: number) => void;
  setOtherCharactersWeight: (weight: number) => void;
  
  // 配置管理
  loadConfig: (config: UnifiedWeightConfig) => void;
  saveConfig: (name?: string, note?: string) => void;
  resetConfig: () => void;
  initializeFromStorage: () => void;
  
  // 获取验证结果
  getValidationResult: () => ReturnType<typeof validateWeights> | null;
}


/**
 * 创建权重状态 Store
 */
export const useWeightStore = create<WeightState>((set, get) => ({
  currentConfig: null,
  initialized: false,

  // 设置文章权重
  setArticleWeight: (articleId: string, weight: number) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    const oldArticle = currentConfig.articleWeights.find(aw => aw.articleId === articleId);
    const previousWeight = oldArticle?.weight;

    const updatedArticleWeights = currentConfig.articleWeights.map((aw) =>
      aw.articleId === articleId ? { ...aw, weight: Math.max(0, Math.min(100, weight)) } : aw
    );

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      articleWeights: updatedArticleWeights,
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
    weightEventBus.publish('article:weight-changed', {
      config: updatedConfig,
      changedField: articleId,
      previousValue: previousWeight,
      newValue: Math.max(0, Math.min(100, weight)),
    });
  },

  // 设置文章是否包含在考察范围
  setArticleIncluded: (articleId: string, included: boolean) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    const oldArticle = currentConfig.articleWeights.find(aw => aw.articleId === articleId);
    const previousIncluded = oldArticle?.included;

    const updatedArticleWeights = currentConfig.articleWeights.map((aw) =>
      aw.articleId === articleId ? { ...aw, included } : aw
    );

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      articleWeights: updatedArticleWeights,
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
    weightEventBus.publish('article:included-changed', {
      config: updatedConfig,
      changedField: articleId,
      previousValue: previousIncluded,
      newValue: included,
    });
  },

  // 设置文章范围（拖拽选择）
  setArticleRange: (startIndex: number, endIndex: number) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    const updatedArticleWeights = currentConfig.articleWeights.map((aw, index) => ({
      ...aw,
      included: index >= minIndex && index <= maxIndex,
    }));

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      articleWeights: updatedArticleWeights,
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
    weightEventBus.publish('article:range-selected', {
      config: updatedConfig,
      changedField: 'articleRange',
      previousValue: { startIndex, endIndex },
      newValue: { minIndex, maxIndex },
    });
  },

  // 添加文章
  addArticle: (article: Omit<ArticleWeight, 'order'>) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    // 检查是否已存在
    if (currentConfig.articleWeights.some((aw) => aw.articleId === article.articleId)) {
      return;
    }

    const newArticle: ArticleWeight = {
      ...article,
      order: currentConfig.articleWeights.length,
    };

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      articleWeights: [...currentConfig.articleWeights, newArticle],
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
  },

  // 移除文章
  removeArticle: (articleId: string) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    const updatedArticleWeights = currentConfig.articleWeights
      .filter((aw) => aw.articleId !== articleId)
      .map((aw, index) => ({ ...aw, order: index }));

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      articleWeights: updatedArticleWeights,
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
  },


  // 添加重点字
  addCharacter: (char: string, weight: number) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    // 检查是否已存在
    if (currentConfig.characterWeights.some((cw) => cw.char === char)) {
      return;
    }

    const newCharWeight: CharacterWeight = {
      char,
      weight: Math.max(0, Math.min(100, weight)),
    };

    const updatedCharacterWeights = [...currentConfig.characterWeights, newCharWeight];
    const newOtherWeight = calculateOtherCharactersWeight(updatedCharacterWeights);

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      characterWeights: updatedCharacterWeights,
      otherCharactersWeight: newOtherWeight,
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
    weightEventBus.publish('character:added', {
      config: updatedConfig,
      changedField: char,
      newValue: newCharWeight,
    });
  },

  // 移除重点字
  removeCharacter: (char: string) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    const updatedCharacterWeights = currentConfig.characterWeights.filter(
      (cw) => cw.char !== char
    );
    const newOtherWeight = calculateOtherCharactersWeight(updatedCharacterWeights);

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      characterWeights: updatedCharacterWeights,
      otherCharactersWeight: newOtherWeight,
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
  },

  // 设置重点字权重
  setCharacterWeight: (char: string, weight: number) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    const oldChar = currentConfig.characterWeights.find(cw => cw.char === char);
    const previousWeight = oldChar?.weight;

    const updatedCharacterWeights = currentConfig.characterWeights.map((cw) =>
      cw.char === char ? { ...cw, weight: Math.max(0, Math.min(100, weight)) } : cw
    );
    const newOtherWeight = calculateOtherCharactersWeight(updatedCharacterWeights);

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      characterWeights: updatedCharacterWeights,
      otherCharactersWeight: newOtherWeight,
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
    weightEventBus.publish('character:weight-changed', {
      config: updatedConfig,
      changedField: char,
      previousValue: previousWeight,
      newValue: Math.max(0, Math.min(100, weight)),
    });
  },

  // 设置其他字权重（手动设置，会调整重点字权重）
  setOtherCharactersWeight: (weight: number) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    const clampedWeight = Math.max(0, Math.min(100, weight));

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      otherCharactersWeight: clampedWeight,
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
  },


  // 加载配置
  loadConfig: (config: UnifiedWeightConfig) => {
    set({ currentConfig: config, initialized: true });
    weightStorage.saveConfig(config);
    weightStorage.setCurrentConfigId(config.id);
    weightEventBus.publish('config:loaded', {
      config,
    });
  },

  // 保存配置
  saveConfig: (name?: string, note?: string) => {
    const { currentConfig } = get();
    if (!currentConfig) return;

    const updatedConfig: UnifiedWeightConfig = {
      ...currentConfig,
      name: name || currentConfig.name,
      note: note !== undefined ? note : currentConfig.note,
      updatedAt: new Date().toISOString(),
    };

    set({ currentConfig: updatedConfig });
    weightStorage.saveConfig(updatedConfig);
  },

  // 重置配置
  resetConfig: () => {
    const defaultConfig = createDefaultWeightConfig();
    set({ currentConfig: defaultConfig, initialized: true });
    weightStorage.saveConfig(defaultConfig);
    weightStorage.setCurrentConfigId(defaultConfig.id);
    weightEventBus.publish('config:reset', {
      config: defaultConfig,
    });
  },

  // 从存储初始化
  initializeFromStorage: () => {
    const { initialized } = get();
    if (initialized) return;

    const config = weightStorage.loadCurrentConfig();
    set({ currentConfig: config, initialized: true });
  },

  // 获取验证结果
  getValidationResult: () => {
    const { currentConfig } = get();
    if (!currentConfig) return null;
    return validateWeights(currentConfig);
  },
}));

// 导出便捷的选择器
export const selectCurrentConfig = (state: WeightState) => state.currentConfig;
export const selectArticleWeights = (state: WeightState) => state.currentConfig?.articleWeights ?? [];
export const selectCharacterWeights = (state: WeightState) => state.currentConfig?.characterWeights ?? [];
export const selectOtherCharactersWeight = (state: WeightState) => state.currentConfig?.otherCharactersWeight ?? 100;

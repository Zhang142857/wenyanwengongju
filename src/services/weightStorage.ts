// 权重存储服务
// 实现权重配置的JSON序列化/反序列化和LocalStorage持久化

import { v4 as uuidv4 } from 'uuid';
import { UnifiedWeightConfig, ArticleWeight, CharacterWeight } from '../types/weight';

const STORAGE_KEY = 'weight-configs';
const CURRENT_CONFIG_KEY = 'current-weight-config';

/**
 * 创建默认的权重配置
 */
export function createDefaultWeightConfig(): UnifiedWeightConfig {
  return {
    id: uuidv4(),
    name: '默认配置',
    articleWeights: [],
    characterWeights: [],
    otherCharactersWeight: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 序列化权重配置为JSON字符串
 */
export function serializeWeightConfig(config: UnifiedWeightConfig): string {
  return JSON.stringify(config);
}

/**
 * 反序列化JSON字符串为权重配置
 */
export function deserializeWeightConfig(json: string): UnifiedWeightConfig {
  const parsed = JSON.parse(json);
  
  // 验证必要字段
  if (!parsed.id || typeof parsed.id !== 'string') {
    throw new Error('Invalid weight config: missing or invalid id');
  }
  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('Invalid weight config: missing or invalid name');
  }
  if (!Array.isArray(parsed.articleWeights)) {
    throw new Error('Invalid weight config: missing or invalid articleWeights');
  }
  if (!Array.isArray(parsed.characterWeights)) {
    throw new Error('Invalid weight config: missing or invalid characterWeights');
  }
  if (typeof parsed.otherCharactersWeight !== 'number') {
    throw new Error('Invalid weight config: missing or invalid otherCharactersWeight');
  }
  
  // 验证文章权重结构
  for (const aw of parsed.articleWeights) {
    if (!aw.articleId || typeof aw.weight !== 'number') {
      throw new Error('Invalid article weight structure');
    }
  }
  
  // 验证重点字权重结构
  for (const cw of parsed.characterWeights) {
    if (!cw.char || typeof cw.weight !== 'number') {
      throw new Error('Invalid character weight structure');
    }
  }
  
  return {
    id: parsed.id,
    name: parsed.name,
    note: parsed.note,
    articleWeights: parsed.articleWeights as ArticleWeight[],
    characterWeights: parsed.characterWeights as CharacterWeight[],
    otherCharactersWeight: parsed.otherCharactersWeight,
    createdAt: parsed.createdAt || new Date().toISOString(),
    updatedAt: parsed.updatedAt || new Date().toISOString(),
  };
}

/**
 * 权重存储服务类
 */
export class WeightStorage {
  /**
   * 保存权重配置到LocalStorage
   */
  saveConfig(config: UnifiedWeightConfig): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    // 更新时间戳
    const updatedConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    
    // 获取现有配置列表
    const configs = this.getAllConfigs();
    const existingIndex = configs.findIndex(c => c.id === config.id);
    
    if (existingIndex >= 0) {
      configs[existingIndex] = updatedConfig;
    } else {
      configs.push(updatedConfig);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  }
  
  /**
   * 从LocalStorage加载指定配置
   */
  loadConfig(configId: string): UnifiedWeightConfig | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    
    const configs = this.getAllConfigs();
    return configs.find(c => c.id === configId) || null;
  }
  
  /**
   * 获取所有保存的配置
   */
  getAllConfigs(): UnifiedWeightConfig[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(item => deserializeWeightConfig(JSON.stringify(item)));
    } catch {
      return [];
    }
  }
  
  /**
   * 删除指定配置
   */
  deleteConfig(configId: string): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    
    const configs = this.getAllConfigs();
    const filteredConfigs = configs.filter(c => c.id !== configId);
    
    if (filteredConfigs.length === configs.length) {
      return false; // 没有找到要删除的配置
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredConfigs));
    return true;
  }
  
  /**
   * 保存当前使用的配置ID
   */
  setCurrentConfigId(configId: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    localStorage.setItem(CURRENT_CONFIG_KEY, configId);
  }
  
  /**
   * 获取当前使用的配置ID
   */
  getCurrentConfigId(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return localStorage.getItem(CURRENT_CONFIG_KEY);
  }
  
  /**
   * 加载当前配置，如果不存在则创建默认配置
   */
  loadCurrentConfig(): UnifiedWeightConfig {
    const currentId = this.getCurrentConfigId();
    
    if (currentId) {
      const config = this.loadConfig(currentId);
      if (config) {
        return config;
      }
    }
    
    // 创建并保存默认配置
    const defaultConfig = createDefaultWeightConfig();
    this.saveConfig(defaultConfig);
    this.setCurrentConfigId(defaultConfig.id);
    return defaultConfig;
  }
  
  /**
   * 清空所有配置
   */
  clearAllConfigs(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CURRENT_CONFIG_KEY);
  }
}

// 导出默认实例
export const weightStorage = new WeightStorage();

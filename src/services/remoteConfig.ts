/**
 * 远程配置服务
 * 支持从远程URL获取配置，带有本地缓存和校验机制
 */

interface RemoteConfigOptions {
  url: string;
  refreshInterval?: number;
  fallbackToLocal?: boolean;
  timeout?: number;
}

interface ConfigCache {
  data: any;
  timestamp: number;
  etag?: string;
}

const CONFIG_CACHE_KEY = 'remote_config_cache';
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_REFRESH_INTERVAL = 3600000; // 1 hour

/**
 * 配置校验器
 */
function validateConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('配置必须是一个对象');
    return { valid: false, errors };
  }

  // 校验必需字段
  if (typeof config.schemaVersion !== 'number') {
    errors.push('缺少或无效的 schemaVersion');
  }

  if (typeof config.version !== 'string') {
    errors.push('缺少或无效的 version');
  }

  // 校验 AI 配置
  if (config.ai) {
    if (!Array.isArray(config.ai.apiConfigs)) {
      errors.push('ai.apiConfigs 必须是数组');
    } else {
      config.ai.apiConfigs.forEach((apiConfig: any, index: number) => {
        if (!apiConfig.provider) {
          errors.push(`ai.apiConfigs[${index}] 缺少 provider`);
        }
        if (!apiConfig.baseUrl) {
          errors.push(`ai.apiConfigs[${index}] 缺少 baseUrl`);
        }
      });
    }
  }

  // 校验系统配置
  if (config.system) {
    if (config.system.appTitle && typeof config.system.appTitle !== 'string') {
      errors.push('system.appTitle 必须是字符串');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 从本地存储获取缓存的配置
 */
function getCachedConfig(): ConfigCache | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CONFIG_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('读取配置缓存失败:', error);
  }
  return null;
}

/**
 * 将配置保存到本地缓存
 */
function setCachedConfig(data: any, etag?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cache: ConfigCache = {
      data,
      timestamp: Date.now(),
      etag
    };
    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('保存配置缓存失败:', error);
  }
}

/**
 * 检查缓存是否过期
 */
function isCacheExpired(cache: ConfigCache, refreshInterval: number): boolean {
  return Date.now() - cache.timestamp > refreshInterval;
}

/**
 * 从远程获取配置
 */
export async function fetchRemoteConfig(options: RemoteConfigOptions): Promise<{
  config: any;
  fromCache: boolean;
  error?: string;
}> {
  const {
    url,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    fallbackToLocal = true,
    timeout = DEFAULT_TIMEOUT
  } = options;

  // 检查缓存
  const cached = getCachedConfig();
  if (cached && !isCacheExpired(cached, refreshInterval)) {
    return { config: cached.data, fromCache: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    // 如果有缓存的 ETag，使用条件请求
    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 304 Not Modified - 使用缓存
    if (response.status === 304 && cached) {
      setCachedConfig(cached.data, cached.etag);
      return { config: cached.data, fromCache: true };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const config = await response.json();
    const etag = response.headers.get('ETag') || undefined;

    // 校验配置
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(`配置校验失败: ${validation.errors.join(', ')}`);
    }

    // 保存到缓存
    setCachedConfig(config, etag);

    return { config, fromCache: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('获取远程配置失败:', errorMessage);

    // 如果允许回退到本地缓存
    if (fallbackToLocal && cached) {
      console.warn('使用本地缓存的配置');
      return { config: cached.data, fromCache: true, error: errorMessage };
    }

    throw error;
  }
}

/**
 * 清除配置缓存
 */
export function clearConfigCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONFIG_CACHE_KEY);
}

/**
 * 获取缓存状态
 */
export function getConfigCacheStatus(): {
  hasCached: boolean;
  timestamp?: number;
  isExpired?: boolean;
} {
  const cached = getCachedConfig();
  if (!cached) {
    return { hasCached: false };
  }

  return {
    hasCached: true,
    timestamp: cached.timestamp,
    isExpired: isCacheExpired(cached, DEFAULT_REFRESH_INTERVAL)
  };
}

/**
 * 配置管理器类
 */
export class RemoteConfigManager {
  private options: RemoteConfigOptions;
  private refreshTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(config: any) => void> = new Set();

  constructor(options: RemoteConfigOptions) {
    this.options = options;
  }

  /**
   * 启动自动刷新
   */
  startAutoRefresh(): void {
    if (this.refreshTimer) return;

    const interval = this.options.refreshInterval || DEFAULT_REFRESH_INTERVAL;
    this.refreshTimer = setInterval(async () => {
      try {
        const result = await fetchRemoteConfig(this.options);
        if (!result.fromCache) {
          this.notifyListeners(result.config);
        }
      } catch (error) {
        console.error('自动刷新配置失败:', error);
      }
    }, interval);
  }

  /**
   * 停止自动刷新
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 添加配置更新监听器
   */
  addListener(callback: (config: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(config: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('配置监听器执行失败:', error);
      }
    });
  }

  /**
   * 手动获取配置
   */
  async getConfig(): Promise<any> {
    const result = await fetchRemoteConfig(this.options);
    return result.config;
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.listeners.clear();
  }
}

export default RemoteConfigManager;

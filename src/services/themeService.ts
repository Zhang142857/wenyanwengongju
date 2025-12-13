/**
 * 主题服务 - 处理主题的加载、验证、应用和持久化
 */

import type { Theme, ThemeColors, ThemeShadows, ThemeRadius, ThemeBackground, ThemeValidationResult } from '../types/theme';
import { DEFAULT_THEME_ID } from '../types/theme';

// 内置主题列表
export const builtinThemes: Theme[] = [
  {
    id: 'aqua-glass',
    name: '蓝绿玻璃',
    description: '默认主题，清新的蓝绿色液态玻璃风格',
    author: '系统',
    version: '1.0.0',
    colors: {
      primary: '#4facfe',
      primaryLight: '#6fc3ff',
      primaryDark: '#3a8fd9',
      accent: '#43e97b',
      accentLight: '#5fffa0',
      bgPrimary: '#e0f7fa',
      bgSecondary: '#b2ebf2',
      bgCard: 'rgba(255, 255, 255, 0.45)',
      bgCardHover: 'rgba(255, 255, 255, 0.65)',
      textPrimary: '#1a3a52',
      textSecondary: '#4a6b82',
      textMuted: '#8ba5b8',
      border: 'rgba(255, 255, 255, 0.35)',
      highlight: 'rgba(79, 172, 254, 0.15)',
      highlightText: '#2196f3',
    },
    shadows: {
      sm: '0 2px 8px rgba(79, 172, 254, 0.12)',
      md: '0 4px 16px rgba(79, 172, 254, 0.18)',
      lg: '0 8px 32px rgba(79, 172, 254, 0.25)',
    },
    radius: {
      sm: '8px',
      md: '16px',
      lg: '20px',
    },
    background: {
      gradient: 'linear-gradient(135deg, #e0f7fa 0%, #80deea 50%, #4dd0e1 100%)',
      overlay: `radial-gradient(circle at 20% 30%, rgba(67, 233, 123, 0.25) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(79, 172, 254, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)`,
    },
  },
  {
    id: 'warm-sunset',
    name: '暖阳夕照',
    description: '温暖的橙红色调，适合长时间阅读',
    author: '系统',
    version: '1.0.0',
    colors: {
      primary: '#ff7e5f',
      primaryLight: '#ff9a7b',
      primaryDark: '#e65c3e',
      accent: '#feb47b',
      accentLight: '#ffc89e',
      bgPrimary: '#fff5f0',
      bgSecondary: '#ffe8dc',
      bgCard: 'rgba(255, 255, 255, 0.5)',
      bgCardHover: 'rgba(255, 255, 255, 0.7)',
      textPrimary: '#4a2c2a',
      textSecondary: '#7a5a58',
      textMuted: '#a88a88',
      border: 'rgba(255, 126, 95, 0.2)',
      highlight: 'rgba(255, 126, 95, 0.15)',
      highlightText: '#e65c3e',
    },
    shadows: {
      sm: '0 2px 8px rgba(255, 126, 95, 0.12)',
      md: '0 4px 16px rgba(255, 126, 95, 0.18)',
      lg: '0 8px 32px rgba(255, 126, 95, 0.25)',
    },
    radius: {
      sm: '8px',
      md: '16px',
      lg: '20px',
    },
    background: {
      gradient: 'linear-gradient(135deg, #fff5f0 0%, #ffe8dc 50%, #ffd4c4 100%)',
      overlay: `radial-gradient(circle at 30% 20%, rgba(254, 180, 123, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 70% 80%, rgba(255, 126, 95, 0.25) 0%, transparent 50%)`,
    },
  },
  {
    id: 'ink-classic',
    name: '水墨古典',
    description: '传统水墨风格，古朴典雅',
    author: '系统',
    version: '1.0.0',
    colors: {
      primary: '#5c6b73',
      primaryLight: '#7a8b93',
      primaryDark: '#3e4a52',
      accent: '#9eb3c2',
      accentLight: '#b8cad6',
      bgPrimary: '#f5f5f0',
      bgSecondary: '#e8e8e0',
      bgCard: 'rgba(255, 255, 255, 0.6)',
      bgCardHover: 'rgba(255, 255, 255, 0.8)',
      textPrimary: '#2c3e50',
      textSecondary: '#546e7a',
      textMuted: '#90a4ae',
      border: 'rgba(92, 107, 115, 0.2)',
      highlight: 'rgba(92, 107, 115, 0.1)',
      highlightText: '#3e4a52',
    },
    shadows: {
      sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
      md: '0 4px 16px rgba(0, 0, 0, 0.12)',
      lg: '0 8px 32px rgba(0, 0, 0, 0.16)',
    },
    radius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
    background: {
      gradient: 'linear-gradient(180deg, #f5f5f0 0%, #e8e8e0 100%)',
    },
  },
  {
    id: 'dark-night',
    name: '深夜模式',
    description: '护眼深色主题，适合夜间使用',
    author: '系统',
    version: '1.0.0',
    colors: {
      primary: '#64b5f6',
      primaryLight: '#90caf9',
      primaryDark: '#42a5f5',
      accent: '#81c784',
      accentLight: '#a5d6a7',
      bgPrimary: '#1a1a2e',
      bgSecondary: '#16213e',
      bgCard: 'rgba(30, 40, 60, 0.8)',
      bgCardHover: 'rgba(40, 55, 80, 0.9)',
      textPrimary: '#e8eaed',
      textSecondary: '#b0b8c1',
      textMuted: '#7a8490',
      border: 'rgba(100, 181, 246, 0.2)',
      highlight: 'rgba(100, 181, 246, 0.15)',
      highlightText: '#90caf9',
    },
    shadows: {
      sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
      md: '0 4px 16px rgba(0, 0, 0, 0.4)',
      lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    radius: {
      sm: '8px',
      md: '16px',
      lg: '20px',
    },
    background: {
      gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      overlay: `radial-gradient(circle at 20% 80%, rgba(100, 181, 246, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(129, 199, 132, 0.08) 0%, transparent 50%)`,
    },
  },
];

const STORAGE_KEY = 'custom-themes';
const CURRENT_THEME_KEY = 'current-theme-id';

/**
 * 验证颜色格式
 */
function isValidColor(color: string): boolean {
  // 支持 hex, rgb, rgba, hsl, hsla
  const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
  const rgbRegex = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
  const hslRegex = /^hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(,\s*[\d.]+\s*)?\)$/;
  return hexRegex.test(color) || rgbRegex.test(color) || hslRegex.test(color);
}

/**
 * 验证主题 JSON 数据
 */
export function validateTheme(data: unknown): ThemeValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['主题数据必须是一个对象'] };
  }

  const theme = data as Record<string, unknown>;

  // 验证必需字段
  if (!theme.id || typeof theme.id !== 'string') {
    errors.push('缺少有效的 id 字段');
  }
  if (!theme.name || typeof theme.name !== 'string') {
    errors.push('缺少有效的 name 字段');
  }

  // 验证颜色配置
  if (!theme.colors || typeof theme.colors !== 'object') {
    errors.push('缺少 colors 配置');
  } else {
    const colors = theme.colors as Record<string, unknown>;
    const requiredColors: (keyof ThemeColors)[] = [
      'primary', 'primaryLight', 'primaryDark', 'accent', 'accentLight',
      'bgPrimary', 'bgSecondary', 'bgCard', 'bgCardHover',
      'textPrimary', 'textSecondary', 'textMuted',
      'border', 'highlight', 'highlightText',
    ];
    for (const key of requiredColors) {
      if (!colors[key] || typeof colors[key] !== 'string') {
        errors.push(`缺少颜色配置: colors.${key}`);
      }
    }
  }

  // 验证阴影配置
  if (!theme.shadows || typeof theme.shadows !== 'object') {
    errors.push('缺少 shadows 配置');
  } else {
    const shadows = theme.shadows as Record<string, unknown>;
    for (const key of ['sm', 'md', 'lg']) {
      if (!shadows[key] || typeof shadows[key] !== 'string') {
        errors.push(`缺少阴影配置: shadows.${key}`);
      }
    }
  }

  // 验证圆角配置
  if (!theme.radius || typeof theme.radius !== 'object') {
    errors.push('缺少 radius 配置');
  } else {
    const radius = theme.radius as Record<string, unknown>;
    for (const key of ['sm', 'md', 'lg']) {
      if (!radius[key] || typeof radius[key] !== 'string') {
        errors.push(`缺少圆角配置: radius.${key}`);
      }
    }
  }

  // 验证背景配置
  if (!theme.background || typeof theme.background !== 'object') {
    errors.push('缺少 background 配置');
  } else {
    const bg = theme.background as Record<string, unknown>;
    if (!bg.gradient || typeof bg.gradient !== 'string') {
      errors.push('缺少背景渐变配置: background.gradient');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], theme: theme as unknown as Theme };
}

/**
 * 将主题应用到 DOM
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const { colors, shadows, radius, background } = theme;

  // 应用颜色变量
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-light', colors.primaryLight);
  root.style.setProperty('--color-primary-dark', colors.primaryDark);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-light', colors.accentLight);
  root.style.setProperty('--color-bg-primary', colors.bgPrimary);
  root.style.setProperty('--color-bg-secondary', colors.bgSecondary);
  root.style.setProperty('--color-bg-card', colors.bgCard);
  root.style.setProperty('--color-bg-card-hover', colors.bgCardHover);
  root.style.setProperty('--color-surface', colors.bgCard);
  root.style.setProperty('--color-background', colors.bgCard);
  root.style.setProperty('--color-text-primary', colors.textPrimary);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  root.style.setProperty('--color-text-muted', colors.textMuted);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-highlight', colors.highlight);
  root.style.setProperty('--color-highlight-text', colors.highlightText);
  
  // 兼容旧变量名
  root.style.setProperty('--primary-color', colors.primary);
  root.style.setProperty('--primary-dark', colors.primaryDark);

  // 应用阴影变量
  root.style.setProperty('--shadow-sm', shadows.sm);
  root.style.setProperty('--shadow-md', shadows.md);
  root.style.setProperty('--shadow-lg', shadows.lg);

  // 应用圆角变量
  root.style.setProperty('--radius-sm', radius.sm);
  root.style.setProperty('--radius-md', radius.md);
  root.style.setProperty('--radius-lg', radius.lg);

  // 应用背景
  document.body.style.background = background.gradient;
  
  // 应用背景叠加层
  const overlay = document.body.querySelector('::before') as HTMLElement | null;
  if (background.overlay) {
    root.style.setProperty('--bg-overlay', background.overlay);
  }
}

/**
 * 从 localStorage 加载自定义主题
 */
export function loadCustomThemes(): Theme[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const themes = JSON.parse(stored);
      return Array.isArray(themes) ? themes : [];
    }
  } catch (e) {
    console.error('加载自定义主题失败:', e);
  }
  return [];
}

/**
 * 保存自定义主题到 localStorage
 */
export function saveCustomThemes(themes: Theme[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  } catch (e) {
    console.error('保存自定义主题失败:', e);
  }
}

/**
 * 获取当前主题 ID
 */
export function getCurrentThemeId(): string {
  try {
    return localStorage.getItem(CURRENT_THEME_KEY) || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

/**
 * 保存当前主题 ID
 */
export function saveCurrentThemeId(id: string): void {
  try {
    localStorage.setItem(CURRENT_THEME_KEY, id);
  } catch (e) {
    console.error('保存当前主题失败:', e);
  }
}

/**
 * 根据 ID 获取主题
 */
export function getThemeById(id: string, customThemes: Theme[] = []): Theme | undefined {
  return builtinThemes.find(t => t.id === id) || customThemes.find(t => t.id === id);
}

/**
 * 导出主题为 JSON 字符串
 */
export function exportTheme(theme: Theme): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * 从 JSON 字符串导入主题
 */
export function importTheme(jsonString: string): ThemeValidationResult {
  try {
    const data = JSON.parse(jsonString);
    return validateTheme(data);
  } catch (e) {
    return { valid: false, errors: ['JSON 格式无效'] };
  }
}

/**
 * 主题系统类型定义
 */

// 主题颜色配置
export interface ThemeColors {
  // 主色调
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;

  // 背景色
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgCardHover: string;

  // 文字颜色
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // 边框
  border: string;

  // 高亮
  highlight: string;
  highlightText: string;
}

// 主题阴影配置
export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
}

// 主题圆角配置
export interface ThemeRadius {
  sm: string;
  md: string;
  lg: string;
}

// 主题背景效果
export interface ThemeBackground {
  gradient: string;
  overlay?: string;
}

// 完整主题配置
export interface Theme {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  colors: ThemeColors;
  shadows: ThemeShadows;
  radius: ThemeRadius;
  background: ThemeBackground;
}

// 主题元数据（用于列表展示）
export interface ThemeMeta {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  previewColor: string; // 用于预览的主色
}

// 主题存储状态
export interface ThemeState {
  currentThemeId: string;
  themes: Theme[];
  customThemes: Theme[];
}

// 默认主题 ID
export const DEFAULT_THEME_ID = 'aqua-glass';

// 主题 JSON 导入验证结果
export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
  theme?: Theme;
}

// 主题服务器配置
export interface ThemeServer {
  name: string;
  url: string;
  enabled: boolean;
}

// 远程主题列表响应
export interface RemoteThemeListResponse {
  success: boolean;
  themes: ThemeMeta[];
  total: number;
  server?: {
    name: string;
    version: string;
  };
}

// 远程主题详情响应
export interface RemoteThemeResponse {
  success: boolean;
  theme: Theme;
}

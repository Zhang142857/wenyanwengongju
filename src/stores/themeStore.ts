/**
 * 主题状态管理 Store
 */

import { create } from 'zustand';
import type { Theme } from '../types/theme';
import { DEFAULT_THEME_ID } from '../types/theme';
import {
  builtinThemes,
  loadCustomThemes,
  saveCustomThemes,
  getCurrentThemeId,
  saveCurrentThemeId,
  getThemeById,
  applyTheme,
  importTheme,
  exportTheme,
} from '../services/themeService';

interface ThemeStore {
  // 状态
  currentThemeId: string;
  customThemes: Theme[];
  isLoaded: boolean;

  // 计算属性
  allThemes: () => Theme[];
  currentTheme: () => Theme | undefined;

  // 操作
  initialize: () => void;
  setTheme: (id: string) => void;
  addCustomTheme: (theme: Theme) => boolean;
  removeCustomTheme: (id: string) => boolean;
  updateCustomTheme: (id: string, theme: Theme) => boolean;
  importThemeFromJson: (json: string) => { success: boolean; error?: string };
  exportThemeToJson: (id: string) => string | null;
  resetToDefault: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  currentThemeId: DEFAULT_THEME_ID,
  customThemes: [],
  isLoaded: false,

  allThemes: () => [...builtinThemes, ...get().customThemes],

  currentTheme: () => {
    const { currentThemeId, customThemes } = get();
    return getThemeById(currentThemeId, customThemes);
  },

  initialize: () => {
    const customThemes = loadCustomThemes();
    const currentThemeId = getCurrentThemeId();
    
    set({ customThemes, currentThemeId, isLoaded: true });

    // 应用当前主题
    const theme = getThemeById(currentThemeId, customThemes);
    if (theme) {
      applyTheme(theme);
    } else {
      // 如果找不到主题，使用默认主题
      const defaultTheme = builtinThemes[0];
      if (defaultTheme) {
        applyTheme(defaultTheme);
        set({ currentThemeId: DEFAULT_THEME_ID });
        saveCurrentThemeId(DEFAULT_THEME_ID);
      }
    }
  },

  setTheme: (id: string) => {
    const { customThemes } = get();
    const theme = getThemeById(id, customThemes);
    
    if (theme) {
      applyTheme(theme);
      set({ currentThemeId: id });
      saveCurrentThemeId(id);
    }
  },

  addCustomTheme: (theme: Theme) => {
    const { customThemes, allThemes } = get();
    
    // 检查 ID 是否已存在
    if (allThemes().some(t => t.id === theme.id)) {
      return false;
    }

    const newCustomThemes = [...customThemes, theme];
    set({ customThemes: newCustomThemes });
    saveCustomThemes(newCustomThemes);
    return true;
  },

  removeCustomTheme: (id: string) => {
    const { customThemes, currentThemeId } = get();
    
    // 不能删除内置主题
    if (builtinThemes.some(t => t.id === id)) {
      return false;
    }

    const newCustomThemes = customThemes.filter(t => t.id !== id);
    set({ customThemes: newCustomThemes });
    saveCustomThemes(newCustomThemes);

    // 如果删除的是当前主题，切换到默认主题
    if (currentThemeId === id) {
      get().setTheme(DEFAULT_THEME_ID);
    }

    return true;
  },

  updateCustomTheme: (id: string, theme: Theme) => {
    const { customThemes, currentThemeId } = get();
    
    // 不能更新内置主题
    if (builtinThemes.some(t => t.id === id)) {
      return false;
    }

    const index = customThemes.findIndex(t => t.id === id);
    if (index === -1) {
      return false;
    }

    const newCustomThemes = [...customThemes];
    newCustomThemes[index] = { ...theme, id }; // 保持原 ID
    set({ customThemes: newCustomThemes });
    saveCustomThemes(newCustomThemes);

    // 如果更新的是当前主题，重新应用
    if (currentThemeId === id) {
      applyTheme(newCustomThemes[index]);
    }

    return true;
  },

  importThemeFromJson: (json: string) => {
    const result = importTheme(json);
    
    if (!result.valid || !result.theme) {
      return { success: false, error: result.errors.join('; ') };
    }

    const added = get().addCustomTheme(result.theme);
    if (!added) {
      return { success: false, error: '主题 ID 已存在' };
    }

    return { success: true };
  },

  exportThemeToJson: (id: string) => {
    const { customThemes } = get();
    const theme = getThemeById(id, customThemes);
    
    if (!theme) {
      return null;
    }

    return exportTheme(theme);
  },

  resetToDefault: () => {
    set({ currentThemeId: DEFAULT_THEME_ID });
    saveCurrentThemeId(DEFAULT_THEME_ID);
    
    const defaultTheme = builtinThemes[0];
    if (defaultTheme) {
      applyTheme(defaultTheme);
    }
  },
}));

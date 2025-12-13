/**
 * 远程主题服务 - 从服务器获取主题
 */

import type { Theme, ThemeMeta, ThemeServer, RemoteThemeListResponse, RemoteThemeResponse } from '../types/theme';

const THEME_SERVERS_KEY = 'theme-servers';

// 默认主题服务器
const DEFAULT_SERVERS: ThemeServer[] = [
  {
    name: '官方主题服务',
    url: 'https://update.156658.xyz',
    enabled: true,
  },
];

/**
 * 获取主题服务器列表
 */
export function getThemeServers(): ThemeServer[] {
  try {
    const stored = localStorage.getItem(THEME_SERVERS_KEY);
    if (stored) {
      const servers = JSON.parse(stored);
      return Array.isArray(servers) ? servers : DEFAULT_SERVERS;
    }
  } catch (e) {
    console.error('加载主题服务器列表失败:', e);
  }
  return DEFAULT_SERVERS;
}

/**
 * 保存主题服务器列表
 */
export function saveThemeServers(servers: ThemeServer[]): void {
  try {
    localStorage.setItem(THEME_SERVERS_KEY, JSON.stringify(servers));
  } catch (e) {
    console.error('保存主题服务器列表失败:', e);
  }
}

/**
 * 添加主题服务器
 */
export function addThemeServer(server: ThemeServer): boolean {
  const servers = getThemeServers();
  if (servers.some(s => s.url === server.url)) {
    return false; // 已存在
  }
  servers.push(server);
  saveThemeServers(servers);
  return true;
}

/**
 * 删除主题服务器
 */
export function removeThemeServer(url: string): boolean {
  const servers = getThemeServers();
  const filtered = servers.filter(s => s.url !== url);
  if (filtered.length === servers.length) {
    return false; // 未找到
  }
  saveThemeServers(filtered);
  return true;
}

/**
 * 从远程服务器获取主题列表
 */
export async function fetchRemoteThemeList(serverUrl: string): Promise<{
  success: boolean;
  themes?: ThemeMeta[];
  error?: string;
}> {
  try {
    const url = `${serverUrl.replace(/\/$/, '')}/api/themes`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `服务器返回错误: ${response.status}` };
    }

    const data: RemoteThemeListResponse = await response.json();
    
    if (!data.success) {
      return { success: false, error: '服务器返回失败状态' };
    }

    return { success: true, themes: data.themes };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '网络请求失败' 
    };
  }
}

/**
 * 从远程服务器下载单个主题
 */
export async function fetchRemoteTheme(serverUrl: string, themeId: string): Promise<{
  success: boolean;
  theme?: Theme;
  error?: string;
}> {
  try {
    const url = `${serverUrl.replace(/\/$/, '')}/api/themes/${themeId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `服务器返回错误: ${response.status}` };
    }

    const data: RemoteThemeResponse = await response.json();
    
    if (!data.success || !data.theme) {
      return { success: false, error: '主题数据无效' };
    }

    return { success: true, theme: data.theme };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '网络请求失败' 
    };
  }
}

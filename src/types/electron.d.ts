/**
 * Electron API 类型声明
 */

interface ElectronAPI {
  // 配置管理
  getAppConfig: () => Promise<any>
  saveAppConfig: (config: any) => Promise<boolean>
  getConfigDirectories: () => Promise<{
    root: string
    config: string
    temp: string
    cache: string
    backgrounds: string
  }>
  openConfigDirectory: () => Promise<boolean>
  clearCache: () => Promise<boolean>
  onConfigChange: (callback: (data: { filename: string; config: any }) => void) => void

  // 库数据管理
  getLibraries: () => Promise<any>
  saveLibraries: (libraries: any) => Promise<boolean>

  // 背景媒体
  getBackgroundMedia: (path: string) => Promise<{ success: boolean; data?: string }>
  saveBackgroundMedia: (data: string, filename: string, type: string) => Promise<{ success: boolean; path?: string }>
  deleteBackgroundMedia: (path: string) => Promise<boolean>

  // 更新检查
  checkForUpdates: () => Promise<any>
  downloadUpdate: (url: string) => Promise<any>
  installUpdate: (filePath: string) => Promise<void>

  // 文件操作
  openFile: (options?: any) => Promise<string | null>
  saveFile: (options?: any) => Promise<string | null>
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<boolean>

  // 系统
  getAppVersion: () => Promise<string>
  getPlatform: () => string
  openExternal: (url: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}

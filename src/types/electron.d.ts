/**
 * Electron API 类型声明
 */

export interface UpdateInfo {
  has_update?: boolean
  version: string
  download_url?: string
  file_hash?: string
  file_name?: string
  file_size?: number
  changelog: string
  force_update?: boolean
  forceUpdate?: boolean
  timestamp?: string
}

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
  getBackgroundMedia: (path: string) => Promise<{ success: boolean; data?: string; error?: string }>
  saveBackgroundMedia: (data: string, filename: string, type: string) => Promise<{ success: boolean; path?: string; error?: string }>
  deleteBackgroundMedia: (path: string) => Promise<{ success: boolean; error?: string }>
  listBackgroundMedia: () => Promise<{ success: boolean; files?: string[]; error?: string }>

  // 更新检查
  checkForUpdates: () => Promise<UpdateInfo | null>
  downloadUpdate: (downloadUrl: string, fileName: string) => Promise<string>
  installUpdate: (installerPath: string) => Promise<boolean>
  downloadAndInstall: (downloadUrl: string, fileName: string, version?: string) => Promise<boolean>
  onUpdateAvailable: (callback: (data: UpdateInfo) => void) => void
  onUpdateDownloadProgress: (callback: (progress: { 
    progress: number
    downloadedSize: number
    totalSize: number
    speed?: number
    speedText?: string
    eta?: string
    threads?: number
  }) => void) => void
  onUpdateDownloadStarted: (callback: (data: { version: string; downloadUrl: string }) => void) => void
  onUpdateDownloadError: (callback: (data: { error: string; version?: string }) => void) => void
  getPendingUpdate: () => Promise<UpdateInfo | null>
  clearPendingUpdate: () => Promise<boolean>
  removeUpdateListeners: () => void
  isDownloading: () => Promise<{ isDownloading: boolean; version: string | null }>
  cancelDownload: () => Promise<boolean>

  // 配置备份
  getConfigBackupStatus: () => Promise<{
    hasBackup: boolean
    latestBackup: string | null
    backupCount: number
    totalSize: number
  }>
  backupConfig: () => Promise<{ success: boolean; backupPath: string }>
  restoreConfig: (backupDir?: string) => Promise<{ success: boolean }>
  cleanupConfigBackups: (keepCount?: number) => Promise<{ success: boolean }>
  onConfigBackupStarted: (callback: () => void) => void
  onConfigBackupComplete: (callback: (data: { backupPath: string }) => void) => void

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

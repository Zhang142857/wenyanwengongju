const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用数据路径
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // 获取应用版本号
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 获取初始化数据
  getInitData: () => ipcRenderer.invoke('get-init-data'),
  
  // 平台信息
  platform: process.platform,
  
  // 版本信息
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // ==================== 新配置系统 API ====================
  
  // 获取配置目录信息
  getConfigDirectories: () => ipcRenderer.invoke('get-config-directories'),
  
  // 读取应用配置
  getAppConfig: () => ipcRenderer.invoke('config-get-app-config'),
  
  // 保存应用配置
  saveAppConfig: (config) => ipcRenderer.invoke('config-save-app-config', config),
  
  // 读取库数据
  getLibraries: () => ipcRenderer.invoke('config-get-libraries'),
  
  // 保存库数据
  saveLibraries: (libraries) => ipcRenderer.invoke('config-save-libraries', libraries),
  
  // 读取任意配置文件
  readConfig: (filename, defaultValue) => ipcRenderer.invoke('config-read', filename, defaultValue),
  
  // 保存任意配置文件
  saveConfig: (filename, data) => ipcRenderer.invoke('config-save', filename, data),
  
  // 清理缓存
  clearCache: () => ipcRenderer.invoke('config-clear-cache'),
  
  // 打开配置目录
  openConfigDirectory: () => ipcRenderer.invoke('open-config-directory'),
  
  // 监听配置变化
  onConfigChange: (callback) => {
    ipcRenderer.on('config-changed', (event, data) => callback(data));
  },
  
  // 移除配置变化监听
  removeConfigChangeListener: () => {
    ipcRenderer.removeAllListeners('config-changed');
  },

  // ==================== 更新相关 API ====================
  
  // 检查更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // 获取待处理的更新
  getPendingUpdate: () => ipcRenderer.invoke('get-pending-update'),
  
  // 清除待处理的更新
  clearPendingUpdate: () => ipcRenderer.invoke('clear-pending-update'),
  
  // 下载更新
  downloadUpdate: (downloadUrl, fileName) => ipcRenderer.invoke('download-update', downloadUrl, fileName),
  
  // 安装更新（下载完成后调用）
  installUpdate: (installerPath) => ipcRenderer.invoke('install-update', installerPath),
  
  // 下载并安装更新（一键操作，支持多线程）
  downloadAndInstall: (downloadUrl, fileName, version) => 
    ipcRenderer.invoke('download-and-install', downloadUrl, fileName, version),
  
  // 检查是否正在下载
  isDownloading: () => ipcRenderer.invoke('is-downloading'),
  
  // 取消下载
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  
  // 监听更新可用事件
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
  },
  
  // 监听下载进度事件
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, data) => callback(data));
  },
  
  // 监听下载开始事件
  onUpdateDownloadStarted: (callback) => {
    ipcRenderer.on('update-download-started', (event, data) => callback(data));
  },
  
  // 监听下载错误事件
  onUpdateDownloadError: (callback) => {
    ipcRenderer.on('update-download-error', (event, data) => callback(data));
  },
  
  // 移除更新监听器
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-download-started');
    ipcRenderer.removeAllListeners('update-download-error');
    ipcRenderer.removeAllListeners('config-backup-started');
    ipcRenderer.removeAllListeners('config-backup-complete');
  },

  // ==================== 配置备份 API ====================
  
  // 获取配置备份状态
  getConfigBackupStatus: () => ipcRenderer.invoke('get-config-backup-status'),
  
  // 手动备份配置
  backupConfig: () => ipcRenderer.invoke('backup-config'),
  
  // 手动恢复配置
  restoreConfig: (backupDir) => ipcRenderer.invoke('restore-config', backupDir),
  
  // 清理旧的配置备份
  cleanupConfigBackups: (keepCount) => ipcRenderer.invoke('cleanup-config-backups', keepCount),
  
  // 监听配置备份开始事件
  onConfigBackupStarted: (callback) => {
    ipcRenderer.on('config-backup-started', (event) => callback());
  },
  
  // 监听配置备份完成事件
  onConfigBackupComplete: (callback) => {
    ipcRenderer.on('config-backup-complete', (event, data) => callback(data));
  },

  // ==================== 日志相关 API ====================
  
  // 获取日志文件路径
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),
  
  // 获取日志目录
  getLogsDirectory: () => ipcRenderer.invoke('get-logs-directory'),
  
  // 打开日志目录
  openLogsDirectory: () => ipcRenderer.invoke('open-logs-directory'),
  
  // 读取当前日志内容
  readCurrentLog: () => ipcRenderer.invoke('read-current-log'),

  // ==================== 背景媒体管理 API ====================
  
  // 保存背景媒体文件
  saveBackgroundMedia: (data, filename, type) => 
    ipcRenderer.invoke('save-background-media', { data, filename, type }),
  
  // 读取背景媒体文件
  getBackgroundMedia: (filename) => 
    ipcRenderer.invoke('get-background-media', filename),
  
  // 删除背景媒体文件
  deleteBackgroundMedia: (filename) => 
    ipcRenderer.invoke('delete-background-media', filename),
  
  // 列出所有背景媒体文件
  listBackgroundMedia: () => 
    ipcRenderer.invoke('list-background-media'),
});

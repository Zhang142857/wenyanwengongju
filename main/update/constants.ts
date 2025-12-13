/**
 * Update System Constants
 * Configuration values and constants for the update system
 */

// Update Service API
export const UPDATE_SERVICE_URL = 'https://update.156658.xyz';
export const UPDATE_CHECK_ENDPOINT = '/api/check';
export const UPDATE_DOWNLOAD_ENDPOINT = '/api/download';

// Timing constants (in milliseconds)
export const UPDATE_CHECK_DELAY_ON_STARTUP = 30 * 1000; // 30 seconds
export const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
export const NETWORK_RETRY_DELAY = 10 * 60 * 1000; // 10 minutes
export const NOTIFICATION_REDISPLAY_DELAY = 24 * 60 * 60 * 1000; // 24 hours
export const RESTART_COUNTDOWN_SECONDS = 3;
export const DOWNLOAD_COMPLETE_DISPLAY_MS = 2000; // 2 seconds
export const BACKUP_RETENTION_DAYS = 7;

// Retry limits
export const MAX_UPDATE_CHECK_RETRIES = 3;
export const MAX_HASH_VERIFICATION_RETRIES = 3;

// Disk space requirements
export const DISK_SPACE_MULTIPLIER = 3; // Required space = package size * 3

// Progress update interval
export const PROGRESS_UPDATE_INTERVAL_MS = 100;

// File paths (relative to userData)
export const UPDATE_STATE_FILE = 'update-state.json';
export const BACKUPS_DIRECTORY = 'backups';
export const DOWNLOADS_DIRECTORY = 'downloads';
export const UPDATE_LOCK_FILE = 'update.lock';
export const DEFERRED_REPLACEMENTS_FILE = 'deferred-replacements.json';
export const CONFIG_BACKUP_DIRECTORY = 'config-backups';
export const CONFIG_RESTORE_PENDING_FILE = 'config-restore-pending.json';

// 需要备份的配置文件（相对于 config 目录）
export const CONFIG_FILES_TO_BACKUP = [
  'app-config.json',
  'libraries.json',
  'weights.json',
  '.migrated'
];

// 需要备份的目录
export const CONFIG_DIRECTORIES_TO_BACKUP = [
  'config',
  'cache/backgrounds'
];

// 配置备份保留数量
export const CONFIG_BACKUP_RETENTION_COUNT = 3;

// User data directories to exclude from backup/update
export const USER_DATA_DIRECTORIES = [
  'classical-chinese-data.json',
  'app-config.json',
  'init-data.json',
  '.initialized',
  'backups',
  'downloads',
  'update-state.json',
  'update.lock',
  'deferred-replacements.json',
  'logs'
];

// IPC Channel names
export const IPC_CHANNELS = {
  // Main -> Renderer
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_PROGRESS: 'update-progress',
  UPDATE_ERROR: 'update-error',
  UPDATE_COMPLETE: 'update-complete',
  
  // Renderer -> Main
  CHECK_UPDATES: 'check-updates',
  START_UPDATE: 'start-update',
  DISMISS_UPDATE: 'dismiss-update',
  CANCEL_UPDATE: 'cancel-update',
  GET_UPDATE_STATUS: 'get-update-status'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_UNAVAILABLE: '无法连接到更新服务器，请检查网络连接',
  NETWORK_TIMEOUT: '连接更新服务器超时，请稍后重试',
  HASH_MISMATCH: '下载的更新包校验失败，文件可能已损坏',
  INSUFFICIENT_DISK_SPACE: '磁盘空间不足，无法完成更新',
  PERMISSION_DENIED: '没有足够的权限执行更新操作',
  BACKUP_FAILED: '创建备份失败，更新已取消',
  EXTRACTION_FAILED: '解压更新包失败',
  RECOVERY_FAILED: '恢复备份失败，请手动恢复',
  UPDATE_IN_PROGRESS: '另一个更新正在进行中',
  VERSION_MISMATCH: '更新后版本验证失败，正在恢复...'
} as const;

// Recovery instructions
export const RECOVERY_INSTRUCTIONS = {
  MANUAL_RECOVERY: [
    '1. 关闭应用程序',
    '2. 找到备份目录（在用户数据目录的 backups 文件夹中）',
    '3. 将备份文件复制到应用程序安装目录',
    '4. 重新启动应用程序'
  ],
  CONTACT_SUPPORT: '如果问题持续存在，请联系技术支持'
} as const;

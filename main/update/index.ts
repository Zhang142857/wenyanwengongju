/**
 * Update System Module Index
 * Exports all update system components
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Utilities
export * from './utils';

// Managers
export { DownloadManager, downloadManager } from './downloadManager';
export { FileManager } from './fileManager';
export { RecoveryManager } from './recoveryManager';
export { ConfigBackupManager } from './configBackupManager';
export { UpdateManager, getUpdateManager } from './updateManager';
export { ErrorHandler } from './errorHandler';

// IPC
export { initializeUpdateIPC, cleanupUpdateIPC } from './ipcHandlers';

// Advanced Features
export {
  isElevated,
  launchElevated,
  launchWithSamePermissions,
  DiskSpaceMonitor,
  DeferredReplacementManager,
  checkAntivirusInterference,
  getAntivirusGuidance
} from './advancedFeatures';

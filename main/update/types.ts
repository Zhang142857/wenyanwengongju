/**
 * Update System Type Definitions
 * Defines interfaces for the automatic update system
 */

// Update information from the Update Service
export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  fileHash: string;
  changelog: string;
  forceUpdate: boolean;
  packageSize: number;
}

// Current update status
export interface UpdateStatus {
  state: 'idle' | 'checking' | 'downloading' | 'verifying' | 'backing-up' | 'installing' | 'restarting' | 'error';
  progress?: number;
  error?: string;
  errorType?: ErrorType;
}

// Download progress information
export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  speedMBps: number;
  estimatedSecondsRemaining: number;
}

// Update state persisted to disk
export interface UpdateState {
  lastCheckTime: string;  // ISO 8601 timestamp
  lastDismissTime?: string;
  currentVersion: string;
  pendingVersion?: string;
  updateInProgress: boolean;
  backupPath?: string;
  downloadPath?: string;
  retryCount: number;
  hashRetryCount?: number;
}

// Backup metadata
export interface BackupMetadata {
  version: string;
  createdAt: string;  // ISO 8601 timestamp
  fileCount: number;
  totalSize: number;
  appPath: string;
}

// Recovery status
export interface RecoveryStatus {
  recoveryNeeded: boolean;
  backupAvailable: boolean;
  lastUpdateAttempt?: Date;
  lastUpdateVersion?: string;
}

// Error types for categorization
export type ErrorType = 'network' | 'disk_space' | 'permissions' | 'corruption' | 'system';

// Error with additional context
export interface UpdateError {
  type: ErrorType;
  message: string;
  recoverable: boolean;
  actionableSteps?: string[];
  diagnosticInfo?: Record<string, unknown>;
}

// IPC event payloads
export interface IPCUpdateAvailable {
  updateInfo: UpdateInfo;
}

export interface IPCUpdateProgress {
  progress: DownloadProgress;
  stage: 'downloading' | 'verifying' | 'backing-up' | 'installing';
}

export interface IPCUpdateError {
  error: UpdateError;
}

// Deferred file replacement entry
export interface DeferredReplacement {
  sourcePath: string;
  targetPath: string;
  scheduledAt: string;
}

// Update lock file content
export interface UpdateLock {
  pid: number;
  startedAt: string;
  version: string;
}

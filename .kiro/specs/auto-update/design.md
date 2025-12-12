# Design Document

## Overview

The automatic update system provides a robust, user-friendly mechanism for keeping the Electron application current. The design emphasizes reliability, data safety, and graceful error recovery. The system operates primarily in the Electron main process, with UI components rendered in the application window.

### Key Design Principles

1. **Fail-Safe Operation**: Every update operation must be reversible; the application must remain functional even if updates fail
2. **Data Preservation**: User data and configurations are never modified or deleted during updates
3. **Atomic Updates**: Updates either complete fully or roll back completely; no partial states
4. **Progressive Enhancement**: Update checks happen in the background without blocking the application
5. **Clear Communication**: Users receive clear, actionable feedback at every stage

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  Main Process   │         │ Renderer Process │          │
│  │                 │         │                  │          │
│  │  ┌───────────┐  │  IPC    │  ┌────────────┐ │          │
│  │  │  Update   │◄─┼─────────┼─►│   Update   │ │          │
│  │  │  Manager  │  │         │  │     UI     │ │          │
│  │  └─────┬─────┘  │         │  └────────────┘ │          │
│  │        │        │         │                  │          │
│  │  ┌─────▼─────┐  │         └──────────────────┘          │
│  │  │ Download  │  │                                        │
│  │  │  Manager  │  │                                        │
│  │  └─────┬─────┘  │                                        │
│  │        │        │                                        │
│  │  ┌─────▼─────┐  │                                        │
│  │  │   File    │  │                                        │
│  │  │  Manager  │  │                                        │
│  │  └─────┬─────┘  │                                        │
│  │        │        │                                        │
│  │  ┌─────▼─────┐  │                                        │
│  │  │ Recovery  │  │                                        │
│  │  │  Manager  │  │                                        │
│  │  └───────────┘  │                                        │
│  └─────────────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │  File System    │                                        │
│  │  - App Files    │                                        │
│  │  - User Data    │                                        │
│  │  - Backups      │                                        │
│  └─────────────────┘                                        │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ Update Service│
        │ (HTTP API)    │
        └───────────────┘
```

### Component Responsibilities

**Update Manager**
- Schedules and executes version checks
- Coordinates the update workflow
- Manages update state persistence
- Handles retry logic and error recovery

**Download Manager**
- Downloads update packages from the Update Service
- Tracks download progress (bytes, speed, ETA)
- Verifies file integrity using SHA256
- Manages partial downloads and resume capability

**File Manager**
- Creates and manages backups
- Extracts update packages
- Replaces application files atomically
- Protects user data directories

**Recovery Manager**
- Detects failed updates on startup
- Restores from backups when necessary
- Validates application integrity
- Cleans up old backups

**Update UI**
- Displays non-intrusive update notifications
- Shows download progress dialog
- Presents error messages with recovery options
- Handles user interactions (update now, dismiss, retry)

## Components and Interfaces

### Update Manager

**Location**: `main/updateManager.js`

**Public Interface**:
```typescript
class UpdateManager {
  // Initialize the update system
  initialize(): Promise<void>
  
  // Check for updates immediately
  checkForUpdates(): Promise<UpdateInfo | null>
  
  // Start the update process
  startUpdate(version: string): Promise<void>
  
  // Cancel an in-progress update
  cancelUpdate(): void
  
  // Get current update status
  getStatus(): UpdateStatus
}

interface UpdateInfo {
  version: string
  downloadUrl: string
  fileHash: string
  changelog: string
  forceUpdate: boolean
  packageSize: number
}

interface UpdateStatus {
  state: 'idle' | 'checking' | 'downloading' | 'installing' | 'error'
  progress?: number
  error?: string
}
```

**Dependencies**:
- `DownloadManager` for file downloads
- `FileManager` for file operations
- `RecoveryManager` for failure handling
- Electron `app` module for version info and restart

### Download Manager

**Location**: `main/downloadManager.js`

**Public Interface**:
```typescript
class DownloadManager {
  // Download a file with progress tracking
  download(url: string, destination: string): Promise<void>
  
  // Get current download progress
  getProgress(): DownloadProgress
  
  // Cancel the current download
  cancel(): void
  
  // Verify file integrity
  verifyHash(filePath: string, expectedHash: string): Promise<boolean>
}

interface DownloadProgress {
  bytesDownloaded: number
  totalBytes: number
  percentage: number
  speedMBps: number
  estimatedSecondsRemaining: number
}
```

**Dependencies**:
- Node.js `https` module for HTTP requests
- Node.js `fs` module for file writing
- Node.js `crypto` module for hash computation

### File Manager

**Location**: `main/fileManager.js`

**Public Interface**:
```typescript
class FileManager {
  // Create a backup of current application
  createBackup(): Promise<string>
  
  // Extract update package
  extractUpdate(packagePath: string): Promise<void>
  
  // Restore from backup
  restoreFromBackup(backupPath: string): Promise<void>
  
  // Delete old backups
  cleanupBackups(olderThanDays: number): Promise<void>
  
  // Check available disk space
  checkDiskSpace(requiredBytes: number): Promise<boolean>
  
  // Get user data directories
  getUserDataPaths(): string[]
}
```

**Dependencies**:
- Node.js `fs` and `fs/promises` for file operations
- `adm-zip` library for ZIP extraction
- Electron `app.getPath()` for standard directories

### Recovery Manager

**Location**: `main/recoveryManager.js`

**Public Interface**:
```typescript
class RecoveryManager {
  // Check if recovery is needed on startup
  checkRecoveryNeeded(): Promise<boolean>
  
  // Perform recovery from backup
  performRecovery(): Promise<void>
  
  // Mark update as successful
  markUpdateSuccessful(): void
  
  // Get recovery status
  getRecoveryStatus(): RecoveryStatus
}

interface RecoveryStatus {
  recoveryNeeded: boolean
  backupAvailable: boolean
  lastUpdateAttempt?: Date
  lastUpdateVersion?: string
}
```

**Dependencies**:
- `FileManager` for backup restoration
- Node.js `fs` for state file management

### Update UI Components

**Location**: `src/components/UpdateNotification.tsx` and `src/components/UpdateProgressDialog.tsx`

**Update Notification**:
```typescript
interface UpdateNotificationProps {
  version: string
  changelog: string
  onUpdate: () => void
  onDismiss: () => void
}
```

**Update Progress Dialog**:
```typescript
interface UpdateProgressDialogProps {
  visible: boolean
  stage: 'downloading' | 'verifying' | 'installing' | 'complete' | 'error'
  progress: number
  speedMBps?: number
  estimatedSeconds?: number
  error?: string
  onRetry?: () => void
  onCancel?: () => void
}
```

### IPC Communication

**Channels**:
```typescript
// Main -> Renderer
'update-available': (updateInfo: UpdateInfo) => void
'update-progress': (progress: DownloadProgress) => void
'update-error': (error: string) => void
'update-complete': () => void

// Renderer -> Main
'check-updates': () => Promise<UpdateInfo | null>
'start-update': (version: string) => Promise<void>
'dismiss-update': () => void
'cancel-update': () => void
```

## Data Models

### Update State File

**Location**: `{userData}/update-state.json`

```typescript
interface UpdateState {
  lastCheckTime: string  // ISO 8601 timestamp
  lastDismissTime?: string
  currentVersion: string
  pendingVersion?: string
  updateInProgress: boolean
  backupPath?: string
  downloadPath?: string
  retryCount: number
}
```

### Backup Metadata

**Location**: `{userData}/backups/{version}/metadata.json`

```typescript
interface BackupMetadata {
  version: string
  createdAt: string  // ISO 8601 timestamp
  fileCount: number
  totalSize: number
  appPath: string
}
```

### Directory Structure

```
Application Root/
├── app.exe                    # Main executable
├── resources/                 # Application resources
│   └── app.asar              # Packaged application
└── ...

User Data Directory/
├── config.json               # User configuration
├── databases/                # User databases
├── update-state.json         # Update system state
├── downloads/                # Temporary download location
│   └── update-{version}.zip
└── backups/                  # Backup storage
    ├── {version}/
    │   ├── metadata.json
    │   └── files/
    └── ...
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Update check timing on startup
*For any* application startup, the Update_System should query the Update_Service within 30 seconds.
**Validates: Requirements 1.1**

### Property 2: Periodic update checks
*For any* 4-hour period while the application is running, the Update_System should query the Update_Service exactly once.
**Validates: Requirements 1.2**

### Property 3: Notification on version increase
*For any* version pair where the server version is greater than the current version, the Update_System should display an Update_Notification.
**Validates: Requirements 1.3**

### Property 4: Network failure retry timing
*For any* network connectivity failure, the Update_System should retry the version check after 10 minutes.
**Validates: Requirements 1.4**

### Property 5: Retry limit enforcement
*For any* sequence of 3 consecutive failed Update_Service requests, the Update_System should log the error and continue normal operation without further retries.
**Validates: Requirements 1.5**

### Property 6: Notification content completeness
*For any* available update, the Update_Notification should display both the Version_Number and changelog text.
**Validates: Requirements 2.2**

### Property 7: Notification re-display timing
*For any* dismissed Update_Notification, the notification should re-appear after exactly 24 hours.
**Validates: Requirements 2.5**

### Property 8: Download progress precision
*For any* download in progress, the Download_Dialog should display the percentage with exactly 1% precision (one decimal place).
**Validates: Requirements 3.2**

### Property 9: Download metrics display
*For any* active download, the Download_Dialog should display both speed in MB/s and estimated time remaining in minutes and seconds.
**Validates: Requirements 3.3, 3.4**

### Property 10: Hash computation on download completion
*For any* completed Update_Package download, the Update_System should compute the SHA256 Integrity_Hash of the file.
**Validates: Requirements 4.1**

### Property 11: Installation proceeds on hash match
*For any* Update_Package where the computed Integrity_Hash matches the expected hash, the Update_System should proceed with installation.
**Validates: Requirements 4.2**

### Property 12: Cleanup on hash mismatch
*For any* Update_Package where the computed Integrity_Hash does not match the expected hash, the Update_System should delete the file and display an error message.
**Validates: Requirements 4.3**

### Property 13: Hash verification retry limit
*For any* sequence of 3 consecutive hash verification failures, the Update_System should abort the update and log the failure.
**Validates: Requirements 4.5**

### Property 14: Backup creation after verification
*For any* Update_Package that passes integrity verification, the Update_System should create a Backup_Directory before proceeding.
**Validates: Requirements 5.1**

### Property 15: User data exclusion from backup
*For any* backup operation, all Application files should be copied to the Backup_Directory except User_Data directories.
**Validates: Requirements 5.2**

### Property 16: Update abort on backup failure
*For any* backup creation failure, the Update_System should abort the update and display an error message.
**Validates: Requirements 5.3**

### Property 17: Extraction after successful backup
*For any* successfully completed backup, the Update_System should proceed with extracting the Update_Package.
**Validates: Requirements 5.4**

### Property 18: Backup cleanup timing
*For any* successful update, the Backup_Directory should be deleted after exactly 7 days.
**Validates: Requirements 5.5**

### Property 19: Restart countdown display
*For any* successfully extracted Update_Package, the Update_System should display a restart message with a 3-second countdown.
**Validates: Requirements 6.1**

### Property 20: Version verification after update
*For any* application restart after update, the Update_System should verify the Version_Number matches the expected version.
**Validates: Requirements 6.4**

### Property 21: Recovery on version mismatch
*For any* post-update startup where the Version_Number does not match the expected version, the Recovery_Mechanism should restore from the Backup_Directory.
**Validates: Requirements 6.5**

### Property 22: User data preservation during extraction
*For any* Update_Package extraction, all User_Data directories should remain unchanged and unmodified.
**Validates: Requirements 7.1**

### Property 23: User data integrity verification
*For any* completed update, the hash of all User_Data files should be identical before and after the update.
**Validates: Requirements 7.2**

### Property 24: User data accessibility after update
*For any* application startup after update, all User_Data should be accessible and loadable without modification.
**Validates: Requirements 7.4**

### Property 25: Recovery check on startup
*For any* application startup, the Recovery_Mechanism should check for the presence of a Backup_Directory.
**Validates: Requirements 8.1**

### Property 26: Automatic recovery on startup failure
*For any* application startup where a Backup_Directory exists and normal startup fails, the Recovery_Mechanism should restore files from the backup.
**Validates: Requirements 8.2**

### Property 27: Complete file restoration
*For any* recovery operation, all files from the Backup_Directory should be copied to the Application directory.
**Validates: Requirements 8.3**

### Property 28: Error message on operation failure
*For any* failed update operation, the Update_System should display an error message describing the failure.
**Validates: Requirements 9.1**

### Property 29: Error type inclusion
*For any* error message, the message should include the specific error type (network, disk space, permissions, or corruption).
**Validates: Requirements 9.2**

### Property 30: Actionable steps for recoverable errors
*For any* recoverable error, the error message should include actionable next steps for the user.
**Validates: Requirements 9.3**

### Property 31: Diagnostic logging on errors
*For any* error occurrence, the Update_System should create a log entry with detailed diagnostic information.
**Validates: Requirements 9.5**

### Property 32: Package size query
*For any* update initiation, the Update_System should query the Update_Service for the Update_Package size.
**Validates: Requirements 10.1**

### Property 33: Disk space validation
*For any* known package size, the Update_System should verify available disk space is at least 3 times the package size before proceeding.
**Validates: Requirements 10.2**

### Property 34: Insufficient space error
*For any* update attempt where available disk space is less than 3 times the package size, the Update_System should display an error message indicating the required space.
**Validates: Requirements 10.3**

### Property 35: Download pause on space exhaustion
*For any* download where disk space becomes insufficient, the Update_System should pause the download and notify the user.
**Validates: Requirements 10.4**

### Property 36: Permission preservation
*For any* application running with elevated permissions, the updated version should be launched with the same elevated permissions.
**Validates: Requirements 11.1**

### Property 37: Concurrent update prevention
*For any* system state where multiple Application instances are running, only one instance should be allowed to perform an update.
**Validates: Requirements 11.2**

### Property 38: State persistence on shutdown
*For any* system shutdown during an update, the Update_System should save the current update state and resume on next startup.
**Validates: Requirements 11.3**

### Property 39: Deferred file replacement
*For any* Update_Package containing files currently in use, the Update_System should schedule their replacement for the next startup.
**Validates: Requirements 11.4**

## Error Handling

### Error Categories

**Network Errors**
- Connection timeout
- DNS resolution failure
- HTTP error responses (4xx, 5xx)
- SSL/TLS certificate errors

**File System Errors**
- Insufficient disk space
- Permission denied
- File in use / locked
- Corrupted file system

**Integrity Errors**
- Hash mismatch
- Corrupted download
- Invalid ZIP format
- Missing files in package

**System Errors**
- Insufficient memory
- Process spawn failure
- Antivirus interference
- System shutdown during update

### Error Handling Strategy

1. **Retry with Backoff**: Network errors use exponential backoff (10s, 30s, 60s)
2. **Graceful Degradation**: Application continues functioning if updates fail
3. **User Notification**: All errors result in clear, actionable messages
4. **Automatic Recovery**: System automatically restores from backup on critical failures
5. **Detailed Logging**: All errors logged with context for troubleshooting

### Error Recovery Flows

```
Network Error → Retry (3x) → Log & Continue
Hash Mismatch → Delete File → Offer Retry → Retry (3x) → Abort
Backup Failure → Abort Update → Display Error → Continue Normal Operation
Extraction Failure → Restore Backup → Restart → Verify Recovery
Startup Failure → Detect Backup → Restore → Restart → Success/Manual Recovery
```

## Testing Strategy

### Unit Testing

The update system will use **Vitest** for unit testing, consistent with the existing codebase. Unit tests will focus on:

**Update Manager Tests**
- Version comparison logic
- Update state transitions
- Retry logic and timing
- IPC message handling

**Download Manager Tests**
- Progress calculation accuracy
- Hash computation correctness
- Download cancellation
- Resume capability

**File Manager Tests**
- Backup creation and exclusion logic
- ZIP extraction
- File copying and atomic operations
- Disk space calculation

**Recovery Manager Tests**
- Backup detection
- Recovery decision logic
- State file management

**UI Component Tests**
- Notification rendering with various update info
- Progress dialog updates
- Error message display
- User interaction handling

### Property-Based Testing

The update system will use **fast-check** for property-based testing. This library is well-suited for JavaScript/TypeScript and integrates with Vitest.

**Configuration**:
- Each property test should run a minimum of 100 iterations
- Use appropriate generators for version numbers, file sizes, timestamps
- Seed tests for reproducibility

**Tagging Convention**:
Each property-based test must include a comment tag in this exact format:
```javascript
// Feature: auto-update, Property {number}: {property_text}
```

Example:
```javascript
// Feature: auto-update, Property 3: Notification on version increase
test('should display notification when server version is greater', () => {
  fc.assert(
    fc.property(
      fc.record({
        current: versionGenerator(),
        server: versionGenerator()
      }).filter(({current, server}) => compareVersions(server, current) > 0),
      ({current, server}) => {
        const result = shouldShowNotification(current, server);
        expect(result).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property Test Coverage**:
- Version comparison properties (Properties 3, 20, 21)
- Timing properties (Properties 1, 2, 4, 7, 18)
- Data preservation properties (Properties 22, 23, 24)
- Error handling properties (Properties 5, 13, 16, 28-31)
- Resource validation properties (Properties 32-35)

### Integration Testing

Integration tests will verify:
- End-to-end update flow with mock Update Service
- IPC communication between main and renderer processes
- File system operations with temporary directories
- Recovery scenarios with simulated failures

### Manual Testing Scenarios

Due to the complexity of system-level operations, some scenarios require manual testing:
- Antivirus interference detection
- System shutdown during update
- Multiple instance prevention
- Elevated permission handling

## Security Considerations

1. **HTTPS Only**: All communication with Update_Service uses HTTPS
2. **Hash Verification**: SHA256 verification prevents tampered packages
3. **Atomic Updates**: No partial states reduce attack surface
4. **Backup Protection**: Backups ensure recovery from malicious updates
5. **Permission Validation**: Update process respects system permissions
6. **Input Validation**: All Update_Service responses validated before use
7. **Path Traversal Prevention**: ZIP extraction validates file paths

## Performance Considerations

1. **Background Checks**: Update checks don't block UI or user operations
2. **Streaming Downloads**: Large files downloaded in chunks to manage memory
3. **Incremental Progress**: UI updates every 100ms to balance responsiveness and performance
4. **Lazy Backup Cleanup**: Old backups deleted asynchronously
5. **Efficient Hashing**: SHA256 computed in streaming mode for large files

## Deployment Considerations

1. **Version Format**: Application must use semantic versioning (x.y.z)
2. **Package Structure**: Update packages must maintain consistent directory structure
3. **User Data Location**: User data must be in separate directory from application files
4. **Backup Storage**: Sufficient disk space for backups (recommend 2x application size)
5. **Update Service Availability**: Service should have 99.9% uptime for good user experience

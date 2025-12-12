# Implementation Plan

- [x] 1. Set up update system infrastructure






  - Create directory structure for update modules in `main/` directory
  - Define TypeScript interfaces for update data models
  - Set up IPC channel definitions for main-renderer communication
  - Configure update service API endpoint constants
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement Download Manager


- [x] 2.1 Create DownloadManager class with progress tracking


  - Implement streaming HTTP download with progress events
  - Calculate download speed and ETA
  - Implement download cancellation
  - Handle network errors with retry logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2.2 Write property test for download progress calculation


  - **Property 8: Download progress precision**
  - **Validates: Requirements 3.2**

- [x] 2.3 Implement SHA256 hash verification

  - Create streaming hash computation for large files
  - Compare computed hash with expected hash
  - Handle hash mismatch errors
  - _Requirements: 4.1, 4.2, 4.3_


- [x] 2.4 Write property test for hash computation

  - **Property 10: Hash computation on download completion**
  - **Validates: Requirements 4.1**



- [ ] 2.5 Write property test for hash mismatch handling
  - **Property 12: Cleanup on hash mismatch**
  - **Validates: Requirements 4.3**

- [-] 3. Implement File Manager

- [x] 3.1 Create FileManager class for backup operations


  - Implement backup directory creation
  - Copy application files excluding user data
  - Create backup metadata file
  - _Requirements: 5.1, 5.2_

- [x] 3.2 Write property test for user data exclusion


  - **Property 15: User data exclusion from backup**
  - **Validates: Requirements 5.2**



- [ ] 3.3 Implement ZIP extraction with user data protection
  - Extract update package to temporary location
  - Exclude user data directories from replacement
  - Implement atomic file replacement
  - _Requirements: 7.1, 7.2_


- [ ] 3.4 Write property test for user data preservation
  - **Property 22: User data preservation during extraction**
  - **Validates: Requirements 7.1**


- [ ] 3.5 Write property test for user data integrity
  - **Property 23: User data integrity verification**
  - **Validates: Requirements 7.2**


- [x] 3.4 Implement disk space checking

  - Query available disk space
  - Validate space is at least 3x package size
  - Monitor space during download
  - _Requirements: 10.1, 10.2, 10.3, 10.4_


- [ ] 3.7 Write property test for disk space validation
  - **Property 33: Disk space validation**

  - **Validates: Requirements 10.2**


- [ ] 3.8 Implement backup cleanup
  - Find backups older than 7 days
  - Delete old backup directories
  - Handle cleanup errors gracefully
  - _Requirements: 5.5_

- [-] 4. Implement Recovery Manager


- [x] 4.1 Create RecoveryManager class for failure detection

  - Check for backup directory on startup
  - Detect failed update attempts
  - Read and validate recovery state
  - _Requirements: 8.1_

- [x] 4.2 Write property test for recovery check

  - **Property 25: Recovery check on startup**
  - **Validates: Requirements 8.1**


- [ ] 4.3 Implement automatic recovery from backup
  - Copy files from backup to application directory
  - Verify restoration success
  - Restart application after recovery
  - Handle recovery failures
  - _Requirements: 8.2, 8.3, 8.4, 8.5_


- [ ] 4.4 Write property test for automatic recovery
  - **Property 26: Automatic recovery on startup failure**
  - **Validates: Requirements 8.2**


- [ ] 4.5 Write property test for complete file restoration
  - **Property 27: Complete file restoration**
  - **Validates: Requirements 8.3**


- [ ] 4.6 Implement version verification after update
  - Read application version after restart
  - Compare with expected version
  - Trigger recovery if mismatch detected

  - _Requirements: 6.4, 6.5_

- [ ] 4.7 Write property test for version verification
  - **Property 20: Version verification after update**
  - **Validates: Requirements 6.4**


- [ ] 4.8 Write property test for recovery on version mismatch
  - **Property 21: Recovery on version mismatch**
  - **Validates: Requirements 6.5**

- [-] 5. Implement Update Manager


- [x] 5.1 Create UpdateManager class for orchestration

  - Initialize update system on application startup
  - Manage update state persistence
  - Coordinate between Download, File, and Recovery managers
  - _Requirements: 1.1, 1.2_


- [ ] 5.2 Implement version checking logic
  - Query update service API for latest version
  - Compare versions using semantic versioning
  - Handle network failures with retry logic
  - Schedule periodic checks every 4 hours
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5.3 Write property test for update check timing on startup

  - **Property 1: Update check timing on startup**
  - **Validates: Requirements 1.1**


- [ ] 5.4 Write property test for periodic update checks
  - **Property 2: Periodic update checks**
  - **Validates: Requirements 1.2**


- [ ] 5.5 Write property test for notification on version increase
  - **Property 3: Notification on version increase**

  - **Validates: Requirements 1.3**

- [x] 5.6 Write property test for network failure retry timing

  - **Property 4: Network failure retry timing**
  - **Validates: Requirements 1.4**

- [ ] 5.7 Write property test for retry limit enforcement
  - **Property 5: Retry limit enforcement**
  - **Validates: Requirements 1.5**


- [ ] 5.8 Implement update workflow orchestration
  - Coordinate download → verify → backup → extract → restart sequence
  - Handle errors at each stage
  - Persist state for recovery

  - _Requirements: 4.2, 5.3, 5.4, 6.1, 6.2, 6.3_

- [x] 5.9 Write property test for backup creation after verification

  - **Property 14: Backup creation after verification**
  - **Validates: Requirements 5.1**


- [ ] 5.10 Write property test for update abort on backup failure
  - **Property 16: Update abort on backup failure**
  - **Validates: Requirements 5.3**

- [ ] 5.11 Write property test for extraction after successful backup
  - **Property 17: Extraction after successful backup**

  - **Validates: Requirements 5.4**

- [x] 5.12 Implement application restart logic

  - Display countdown before restart
  - Terminate current process
  - Launch updated executable
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 5.13 Write property test for restart countdown display

  - **Property 19: Restart countdown display**
  - **Validates: Requirements 6.1**

- [x] 5.14 Implement concurrent update prevention

  - Create lock file to prevent multiple updates
  - Check for other running instances
  - Release lock on completion or failure
  - _Requirements: 11.2_


- [ ] 5.15 Write property test for concurrent update prevention
  - **Property 37: Concurrent update prevention**
  - **Validates: Requirements 11.2**


- [ ] 5.16 Implement state persistence for shutdown handling
  - Save update state to disk
  - Resume update on next startup
  - Handle incomplete downloads
  - _Requirements: 11.3_

- [ ] 5.17 Write property test for state persistence on shutdown
  - **Property 38: State persistence on shutdown**
  - **Validates: Requirements 11.3**

- [-] 6. Implement error handling and logging

- [x] 6.1 Create error classification system


  - Define error types (network, disk, integrity, system)
  - Create error message templates
  - Implement error logging with diagnostics
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 6.2 Write property test for error message on operation failure

  - **Property 28: Error message on operation failure**
  - **Validates: Requirements 9.1**

- [x] 6.3 Write property test for error type inclusion

  - **Property 29: Error type inclusion**
  - **Validates: Requirements 9.2**

- [x] 6.4 Write property test for diagnostic logging

  - **Property 31: Diagnostic logging on errors**
  - **Validates: Requirements 9.5**

- [x] 6.5 Implement actionable error messages

  - Add recovery steps for recoverable errors
  - Add support contact for unrecoverable errors
  - Provide retry options where appropriate

  - _Requirements: 9.3, 9.4_

- [ ] 6.6 Write property test for actionable steps
  - **Property 30: Actionable steps for recoverable errors**
  - **Validates: Requirements 9.3**

- [-] 7. Implement Update Notification UI component

- [x] 7.1 Create UpdateNotification React component


  - Display version number and changelog
  - Add "Update Now" button
  - Add "Dismiss" button
  - Style as non-intrusive banner
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7.2 Write property test for notification content completeness

  - **Property 6: Notification content completeness**
  - **Validates: Requirements 2.2**


- [ ] 7.3 Implement notification dismissal with re-display timing
  - Save dismissal timestamp
  - Schedule re-display after 24 hours
  - Handle application restarts
  - _Requirements: 2.5_

- [x] 7.4 Write property test for notification re-display timing

  - **Property 7: Notification re-display timing**
  - **Validates: Requirements 2.5**

- [-] 8. Implement Update Progress Dialog UI component

- [x] 8.1 Create UpdateProgressDialog React component


  - Display download percentage with 1% precision
  - Display download speed in MB/s
  - Display estimated time remaining
  - Show different stages (downloading, verifying, installing)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8.2 Write property test for download metrics display

  - **Property 9: Download metrics display**
  - **Validates: Requirements 3.3, 3.4**


- [ ] 8.3 Add error display and retry functionality
  - Show error messages in dialog
  - Add retry button for recoverable errors
  - Add cancel button
  - _Requirements: 4.4_

- [-] 9. Implement IPC communication layer

- [x] 9.1 Set up IPC handlers in main process


  - Handle 'check-updates' request
  - Handle 'start-update' request
  - Handle 'dismiss-update' request
  - Handle 'cancel-update' request
  - _Requirements: 1.1, 2.4, 3.1_

- [x] 9.2 Set up IPC events from main to renderer

  - Send 'update-available' event with update info
  - Send 'update-progress' events during download
  - Send 'update-error' events on failures
  - Send 'update-complete' event on success
  - _Requirements: 2.1, 3.2, 3.3, 3.4, 9.1_

- [-] 10. Implement advanced features


- [x] 10.1 Implement permission preservation

  - Detect if running with elevated permissions
  - Launch updated version with same permissions
  - _Requirements: 11.1_

- [x] 10.2 Write property test for permission preservation

  - **Property 36: Permission preservation**
  - **Validates: Requirements 11.1**

- [x] 10.3 Implement deferred file replacement for locked files

  - Detect files in use during extraction
  - Schedule replacement for next startup
  - Apply deferred replacements on startup
  - _Requirements: 11.4_

- [x] 10.4 Write property test for deferred file replacement

  - **Property 39: Deferred file replacement**
  - **Validates: Requirements 11.4**

- [x] 10.5 Implement disk space monitoring during download

  - Check space before download
  - Monitor space during download
  - Pause and notify if space becomes insufficient
  - Offer resume when space available
  - _Requirements: 10.4, 10.5_

- [x] 10.6 Write property test for download pause on space exhaustion

  - **Property 35: Download pause on space exhaustion**
  - **Validates: Requirements 10.4**


- [-] 11. Integration and testing

- [x] 11.1 Create mock Update Service for testing

  - Implement mock API endpoints
  - Simulate various response scenarios
  - Support configurable delays and errors
  - _Requirements: All_

- [x] 11.2 Write integration tests for complete update flow

  - Test successful update end-to-end
  - Test update with hash mismatch
  - Test update with backup failure
  - Test recovery from failed update
  - _Requirements: All_

- [x] 11.3 Test error scenarios

  - Test network failures
  - Test insufficient disk space
  - Test corrupted downloads
  - Test concurrent update attempts
  - _Requirements: 1.4, 1.5, 4.3, 4.5, 10.3, 11.2_

- [x] 12. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.


- [-] 13. Documentation and configuration

- [x] 13.1 Add update configuration to application

  - Add update service URL to config
  - Add update check interval setting
  - Add option to disable automatic checks
  - _Requirements: 1.2_


- [x] 13.2 Create user-facing documentation

  - Document update process for users
  - Create troubleshooting guide
  - Document manual recovery steps
  - _Requirements: 8.5, 9.4_

- [x] 13.3 Write developer documentation


  - Document update system architecture
  - Document testing procedures
  - Document deployment requirements
  - _Requirements: All_

- [x] 14. Final checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

/**
 * IPC Handlers for Update System
 * Sets up communication between main process and renderer
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './constants';
import { UpdateInfo, DownloadProgress, UpdateError, UpdateStatus } from './types';
import { getUpdateManager } from './updateManager';

let mainWindow: BrowserWindow | null = null;

/**
 * Initialize IPC handlers for the update system
 */
export function initializeUpdateIPC(window: BrowserWindow): void {
  mainWindow = window;
  
  const updateManager = getUpdateManager();
  
  // Set up event listeners from UpdateManager
  setupUpdateManagerListeners(updateManager);
  
  // Set up IPC handlers for renderer requests
  setupIPCHandlers(updateManager);
}

/**
 * Set up listeners for UpdateManager events
 */
function setupUpdateManagerListeners(updateManager: ReturnType<typeof getUpdateManager>): void {
  // Update available
  updateManager.on('update-available', (updateInfo: UpdateInfo) => {
    sendToRenderer(IPC_CHANNELS.UPDATE_AVAILABLE, { updateInfo });
  });
  
  // Download progress
  updateManager.on('download-progress', (progress: DownloadProgress) => {
    sendToRenderer(IPC_CHANNELS.UPDATE_PROGRESS, { 
      progress,
      stage: 'downloading'
    });
  });
  
  // Status changed
  updateManager.on('status-changed', (status: UpdateStatus) => {
    if (status.state === 'verifying') {
      sendToRenderer(IPC_CHANNELS.UPDATE_PROGRESS, { 
        progress: { percentage: 100 },
        stage: 'verifying'
      });
    } else if (status.state === 'backing-up') {
      sendToRenderer(IPC_CHANNELS.UPDATE_PROGRESS, { 
        progress: { percentage: 0 },
        stage: 'backing-up'
      });
    } else if (status.state === 'installing') {
      sendToRenderer(IPC_CHANNELS.UPDATE_PROGRESS, { 
        progress: { percentage: 0 },
        stage: 'installing'
      });
    }
  });
  
  // Update complete
  updateManager.on('update-complete', () => {
    sendToRenderer(IPC_CHANNELS.UPDATE_COMPLETE, {});
  });
  
  // Error
  updateManager.on('error', (error: UpdateError) => {
    sendToRenderer(IPC_CHANNELS.UPDATE_ERROR, { error });
  });
  
  // Restart countdown
  updateManager.on('restart-countdown', (seconds: number) => {
    sendToRenderer(IPC_CHANNELS.UPDATE_PROGRESS, {
      progress: { percentage: 100 },
      stage: 'complete',
      countdown: seconds
    });
  });
  
  // Recovery needed
  updateManager.on('recovery-needed', () => {
    sendToRenderer(IPC_CHANNELS.UPDATE_ERROR, {
      error: {
        type: 'system',
        message: '检测到上次更新失败，正在恢复...',
        recoverable: true
      }
    });
  });
  
  // Recovery complete
  updateManager.on('recovery-complete', () => {
    sendToRenderer(IPC_CHANNELS.UPDATE_COMPLETE, { recovered: true });
  });
}

/**
 * Set up IPC handlers for renderer requests
 */
function setupIPCHandlers(updateManager: ReturnType<typeof getUpdateManager>): void {
  // Check for updates
  ipcMain.handle(IPC_CHANNELS.CHECK_UPDATES, async () => {
    try {
      const updateInfo = await updateManager.checkForUpdates();
      return { success: true, updateInfo };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  // Start update
  ipcMain.handle(IPC_CHANNELS.START_UPDATE, async (_event, version?: string) => {
    try {
      await updateManager.startUpdate(version);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  // Dismiss update notification
  ipcMain.handle(IPC_CHANNELS.DISMISS_UPDATE, async () => {
    try {
      await updateManager.dismissUpdate();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  // Cancel update
  ipcMain.handle(IPC_CHANNELS.CANCEL_UPDATE, async () => {
    try {
      updateManager.cancelUpdate();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  // Get update status
  ipcMain.handle(IPC_CHANNELS.GET_UPDATE_STATUS, async () => {
    try {
      const status = updateManager.getStatus();
      return { success: true, status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

/**
 * Send message to renderer process
 */
function sendToRenderer(channel: string, data: any): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Clean up IPC handlers
 */
export function cleanupUpdateIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.CHECK_UPDATES);
  ipcMain.removeHandler(IPC_CHANNELS.START_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.DISMISS_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.CANCEL_UPDATE);
  ipcMain.removeHandler(IPC_CHANNELS.GET_UPDATE_STATUS);
  
  mainWindow = null;
}

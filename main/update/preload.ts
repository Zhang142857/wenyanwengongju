/**
 * Preload Script for Update System
 * Exposes update API to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './constants';

// Update API exposed to renderer
export const updateAPI = {
  // Check for updates
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_UPDATES),
  
  // Start update process
  startUpdate: (version?: string) => ipcRenderer.invoke(IPC_CHANNELS.START_UPDATE, version),
  
  // Dismiss update notification
  dismissUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.DISMISS_UPDATE),
  
  // Cancel ongoing update
  cancelUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_UPDATE),
  
  // Get current update status
  getUpdateStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_UPDATE_STATUS),
  
  // Event listeners
  onUpdateAvailable: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.UPDATE_AVAILABLE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_AVAILABLE, handler);
  },
  
  onUpdateProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.UPDATE_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_PROGRESS, handler);
  },
  
  onUpdateError: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.UPDATE_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_ERROR, handler);
  },
  
  onUpdateComplete: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.UPDATE_COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_COMPLETE, handler);
  }
};

/**
 * Expose update API to renderer via contextBridge
 * Call this function in your main preload.js file
 */
export function exposeUpdateAPI(): void {
  contextBridge.exposeInMainWorld('updateAPI', updateAPI);
}

// Type declaration for renderer process
declare global {
  interface Window {
    updateAPI: typeof updateAPI;
  }
}

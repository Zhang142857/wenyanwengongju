/**
 * Update System Configuration
 * Configurable settings for the update system
 */

import * as fs from 'fs';
import * as path from 'path';

export interface UpdateConfig {
  // Update service URL
  serviceUrl: string;
  
  // Check interval in milliseconds (default: 4 hours)
  checkInterval: number;
  
  // Whether to automatically check for updates
  autoCheck: boolean;
  
  // Whether to show notifications for updates
  showNotifications: boolean;
  
  // Delay before first check on startup (milliseconds)
  startupCheckDelay: number;
  
  // Network retry delay (milliseconds)
  networkRetryDelay: number;
  
  // Maximum retry attempts
  maxRetries: number;
  
  // Backup retention days
  backupRetentionDays: number;
  
  // Required disk space multiplier
  diskSpaceMultiplier: number;
}

// Default configuration
export const DEFAULT_UPDATE_CONFIG: UpdateConfig = {
  serviceUrl: 'https://update.156658.xyz',
  checkInterval: 4 * 60 * 60 * 1000, // 4 hours
  autoCheck: true,
  showNotifications: true,
  startupCheckDelay: 30 * 1000, // 30 seconds
  networkRetryDelay: 10 * 60 * 1000, // 10 minutes
  maxRetries: 3,
  backupRetentionDays: 7,
  diskSpaceMultiplier: 3
};

let currentConfig: UpdateConfig = { ...DEFAULT_UPDATE_CONFIG };

/**
 * Load update configuration from file
 */
export async function loadUpdateConfig(userDataPath: string): Promise<UpdateConfig> {
  const configPath = path.join(userDataPath, 'update-config.json');
  
  try {
    const content = await fs.promises.readFile(configPath, 'utf8');
    const savedConfig = JSON.parse(content);
    currentConfig = { ...DEFAULT_UPDATE_CONFIG, ...savedConfig };
  } catch {
    // Use default config if file doesn't exist
    currentConfig = { ...DEFAULT_UPDATE_CONFIG };
  }
  
  return currentConfig;
}

/**
 * Save update configuration to file
 */
export async function saveUpdateConfig(userDataPath: string, config: Partial<UpdateConfig>): Promise<void> {
  const configPath = path.join(userDataPath, 'update-config.json');
  
  currentConfig = { ...currentConfig, ...config };
  
  await fs.promises.writeFile(
    configPath,
    JSON.stringify(currentConfig, null, 2),
    'utf8'
  );
}

/**
 * Get current update configuration
 */
export function getUpdateConfig(): UpdateConfig {
  return { ...currentConfig };
}

/**
 * Update specific configuration values
 */
export function updateConfig(updates: Partial<UpdateConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
}

/**
 * Reset configuration to defaults
 */
export function resetUpdateConfig(): void {
  currentConfig = { ...DEFAULT_UPDATE_CONFIG };
}

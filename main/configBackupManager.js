/**
 * Config Backup Manager
 * 配置文件备份管理器
 * 
 * 在程序更新时安全地备份和恢复用户配置文件
 * 确保更新后用户的所有设置和数据不会丢失
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// 需要备份的配置文件（相对于 config 目录）
const CONFIG_FILES_TO_BACKUP = [
  'app-config.json',
  'libraries.json',
  'weights.json',
  '.migrated'
];

// 配置备份目录名
const CONFIG_BACKUP_DIRECTORY = 'config-backups';

class ConfigBackupManager {
  constructor(userDataPath, appPath) {
    this.userDataPath = userDataPath;
    this.appPath = appPath;
    
    // 配置目录位于程序目录中
    this.configDir = path.join(appPath, 'config');
    this.tempDir = path.join(appPath, 'temp');
    this.cacheDir = path.join(appPath, 'cache');
  }

  /**
   * 获取配置备份目录
   */
  getBackupDir() {
    return path.join(this.userDataPath, CONFIG_BACKUP_DIRECTORY);
  }

  /**
   * 确保目录存在
   */
  ensureDirectory(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 获取当前时间戳
   */
  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  /**
   * 安全删除文件或目录
   */
  safeDelete(targetPath) {
    try {
      if (fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(targetPath);
        }
      }
    } catch (error) {
      console.error(`删除失败: ${targetPath}`, error.message);
    }
  }

  /**
   * 检查文件是否存在
   */
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * 检查目录是否存在
   */
  directoryExists(dirPath) {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 复制目录
   */
  copyDirectory(source, dest) {
    let fileCount = 0;
    let size = 0;

    this.ensureDirectory(dest);
    
    const entries = fs.readdirSync(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        const result = this.copyDirectory(sourcePath, destPath);
        fileCount += result.fileCount;
        size += result.size;
      } else {
        fs.copyFileSync(sourcePath, destPath);
        const stat = fs.statSync(sourcePath);
        fileCount++;
        size += stat.size;
      }
    }

    return { fileCount, size };
  }

  /**
   * 在更新前备份所有配置文件
   */
  async backupBeforeUpdate(version) {
    const timestamp = Date.now();
    const backupDir = path.join(this.getBackupDir(), `${version}-${timestamp}`);
    
    console.log(`📦 开始备份配置文件到: ${backupDir}`);
    
    try {
      this.ensureDirectory(backupDir);
      
      const backedUpFiles = [];
      let totalSize = 0;

      // 备份 config 目录中的配置文件
      if (this.directoryExists(this.configDir)) {
        const configBackupDir = path.join(backupDir, 'config');
        this.ensureDirectory(configBackupDir);
        
        for (const file of CONFIG_FILES_TO_BACKUP) {
          const sourcePath = path.join(this.configDir, file);
          const destPath = path.join(configBackupDir, file);
          
          if (this.fileExists(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            const stat = fs.statSync(sourcePath);
            totalSize += stat.size;
            backedUpFiles.push(`config/${file}`);
            console.log(`   ✓ 备份配置文件: ${file}`);
          }
        }
      }

      // 备份背景媒体目录
      const backgroundsDir = path.join(this.cacheDir, 'backgrounds');
      if (this.directoryExists(backgroundsDir)) {
        const bgBackupDir = path.join(backupDir, 'cache', 'backgrounds');
        const { fileCount, size } = this.copyDirectory(backgroundsDir, bgBackupDir);
        totalSize += size;
        backedUpFiles.push(`cache/backgrounds (${fileCount} files)`);
        console.log(`   ✓ 备份背景媒体: ${fileCount} 个文件`);
      }

      // 备份 userData 中的配置文件（向后兼容）
      const userDataConfigs = ['app-config.json', 'classical-chinese-data.json', 'init-data.json'];
      const userDataBackupDir = path.join(backupDir, 'userData');
      this.ensureDirectory(userDataBackupDir);
      
      for (const file of userDataConfigs) {
        const sourcePath = path.join(this.userDataPath, file);
        const destPath = path.join(userDataBackupDir, file);
        
        if (this.fileExists(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          const stat = fs.statSync(sourcePath);
          totalSize += stat.size;
          backedUpFiles.push(`userData/${file}`);
          console.log(`   ✓ 备份用户数据: ${file}`);
        }
      }

      // 创建备份元数据
      const metadata = {
        version,
        createdAt: this.getCurrentTimestamp(),
        appVersion: app.getVersion(),
        files: backedUpFiles,
        totalSize,
        appPath: this.appPath,
        configDir: this.configDir
      };

      fs.writeFileSync(
        path.join(backupDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2),
        'utf8'
      );

      console.log(`✅ 配置备份完成: ${backedUpFiles.length} 项, 共 ${(totalSize / 1024).toFixed(2)} KB`);
      
      return backupDir;
    } catch (error) {
      console.error('❌ 配置备份失败:', error);
      this.safeDelete(backupDir);
      throw error;
    }
  }


  /**
   * 更新后恢复配置文件
   */
  async restoreAfterUpdate(backupDir) {
    const targetBackup = backupDir || await this.findLatestBackup();
    
    if (!targetBackup) {
      console.log('⚠ 没有找到配置备份，跳过恢复');
      return;
    }

    console.log(`📥 开始恢复配置文件从: ${targetBackup}`);

    try {
      // 读取备份元数据
      const metadataPath = path.join(targetBackup, 'metadata.json');
      if (!this.fileExists(metadataPath)) {
        throw new Error('备份元数据不存在');
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      let restoredCount = 0;

      // 恢复 config 目录
      const configBackupDir = path.join(targetBackup, 'config');
      if (this.directoryExists(configBackupDir)) {
        this.ensureDirectory(this.configDir);
        const files = fs.readdirSync(configBackupDir);
        for (const file of files) {
          const sourcePath = path.join(configBackupDir, file);
          const destPath = path.join(this.configDir, file);
          if (this.fileExists(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            restoredCount++;
            console.log(`   ✓ 恢复配置: ${file}`);
          }
        }
      }

      // 恢复背景媒体
      const bgBackupDir = path.join(targetBackup, 'cache', 'backgrounds');
      if (this.directoryExists(bgBackupDir)) {
        const bgDestDir = path.join(this.cacheDir, 'backgrounds');
        this.ensureDirectory(bgDestDir);
        const { fileCount } = this.copyDirectory(bgBackupDir, bgDestDir);
        restoredCount += fileCount;
        console.log(`   ✓ 恢复背景媒体: ${fileCount} 个文件`);
      }

      // 恢复 userData 中的配置文件
      const userDataBackupDir = path.join(targetBackup, 'userData');
      if (this.directoryExists(userDataBackupDir)) {
        const files = fs.readdirSync(userDataBackupDir);
        for (const file of files) {
          const sourcePath = path.join(userDataBackupDir, file);
          const destPath = path.join(this.userDataPath, file);
          if (this.fileExists(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            restoredCount++;
            console.log(`   ✓ 恢复用户数据: ${file}`);
          }
        }
      }

      // 同步配置到 temp 目录
      await this.syncConfigToTemp();

      console.log(`✅ 配置恢复完成: ${restoredCount} 项`);
      
      return { restoredCount, version: metadata.version };
    } catch (error) {
      console.error('❌ 配置恢复失败:', error);
      throw error;
    }
  }

  /**
   * 同步配置到 temp 目录
   */
  async syncConfigToTemp() {
    if (!this.directoryExists(this.configDir)) {
      return;
    }

    this.ensureDirectory(this.tempDir);
    
    const files = fs.readdirSync(this.configDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sourcePath = path.join(this.configDir, file);
        const destPath = path.join(this.tempDir, file);
        if (this.fileExists(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }
  }

  /**
   * 查找最新的配置备份
   */
  async findLatestBackup() {
    const backupsDir = this.getBackupDir();
    
    try {
      if (!this.directoryExists(backupsDir)) {
        return null;
      }

      const entries = fs.readdirSync(backupsDir, { withFileTypes: true });
      let latestBackup = null;

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const backupPath = path.join(backupsDir, entry.name);
        const metadataPath = path.join(backupPath, 'metadata.json');

        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          const createdAt = new Date(metadata.createdAt);
          
          if (!latestBackup || createdAt > latestBackup.date) {
            latestBackup = { path: backupPath, date: createdAt };
          }
        } catch {
          // 跳过无效的备份
        }
      }

      return latestBackup?.path || null;
    } catch {
      return null;
    }
  }

  /**
   * 清理旧的配置备份（保留最近 3 个）
   */
  async cleanupOldBackups(keepCount = 3) {
    const backupsDir = this.getBackupDir();
    
    try {
      if (!this.directoryExists(backupsDir)) {
        return;
      }

      const entries = fs.readdirSync(backupsDir, { withFileTypes: true });
      const backups = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const backupPath = path.join(backupsDir, entry.name);
        const metadataPath = path.join(backupPath, 'metadata.json');

        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          backups.push({
            path: backupPath,
            date: new Date(metadata.createdAt)
          });
        } catch {
          // 跳过无效的备份
        }
      }

      // 按日期排序，最新的在前
      backups.sort((a, b) => b.date.getTime() - a.date.getTime());

      // 删除超出保留数量的备份
      for (let i = keepCount; i < backups.length; i++) {
        this.safeDelete(backups[i].path);
        console.log(`   🗑️ 删除旧备份: ${path.basename(backups[i].path)}`);
      }

      if (backups.length > keepCount) {
        console.log(`✅ 清理了 ${backups.length - keepCount} 个旧配置备份`);
      }
    } catch (error) {
      console.error('清理配置备份失败:', error.message);
    }
  }

  /**
   * 标记需要恢复配置
   */
  async markPendingRestore(backupDir) {
    const pendingFlagPath = path.join(this.userDataPath, 'config-restore-pending.json');
    fs.writeFileSync(pendingFlagPath, JSON.stringify({
      backupDir,
      markedAt: this.getCurrentTimestamp()
    }, null, 2), 'utf8');
  }

  /**
   * 清除恢复标记
   */
  async clearPendingRestore() {
    const pendingFlagPath = path.join(this.userDataPath, 'config-restore-pending.json');
    this.safeDelete(pendingFlagPath);
  }

  /**
   * 在启动时检查并恢复配置
   */
  async checkAndRestoreOnStartup() {
    const pendingFlagPath = path.join(this.userDataPath, 'config-restore-pending.json');
    
    try {
      if (!this.fileExists(pendingFlagPath)) {
        return false;
      }

      const pendingData = JSON.parse(fs.readFileSync(pendingFlagPath, 'utf8'));

      console.log('🔄 检测到待恢复的配置，开始恢复...');
      
      await this.restoreAfterUpdate(pendingData.backupDir);
      await this.clearPendingRestore();
      
      // 清理旧备份
      await this.cleanupOldBackups();
      
      return true;
    } catch (error) {
      console.error('启动时恢复配置失败:', error);
      await this.clearPendingRestore();
      return false;
    }
  }

  /**
   * 获取备份状态信息
   */
  async getBackupStatus() {
    const backupsDir = this.getBackupDir();
    let backupCount = 0;
    let totalSize = 0;
    
    try {
      if (!this.directoryExists(backupsDir)) {
        return { hasBackup: false, latestBackup: null, backupCount: 0, totalSize: 0 };
      }

      const entries = fs.readdirSync(backupsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const metadataPath = path.join(backupsDir, entry.name, 'metadata.json');
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          backupCount++;
          totalSize += metadata.totalSize || 0;
        } catch {
          // 跳过无效备份
        }
      }

      const latestBackup = await this.findLatestBackup();
      
      return {
        hasBackup: backupCount > 0,
        latestBackup,
        backupCount,
        totalSize
      };
    } catch {
      return { hasBackup: false, latestBackup: null, backupCount: 0, totalSize: 0 };
    }
  }
}

module.exports = { ConfigBackupManager };

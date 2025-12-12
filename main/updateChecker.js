/**
 * 自动更新检查模块
 * 检查服务器是否有新版本可用
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MultiThreadDownloader } = require('./multiThreadDownloader');

// 更新服务器配置
const UPDATE_SERVER = 'https://update.156658.xyz';

// 全局下载状态（防止重复下载）
const globalDownloadState = {
  isDownloading: false,
  version: null,
  downloader: null,
  downloadUrl: null
};

/**
 * 检查是否正在下载
 */
function isDownloading() {
  return globalDownloadState.isDownloading;
}

/**
 * 获取当前下载状态
 */
function getDownloadState() {
  return {
    isDownloading: globalDownloadState.isDownloading,
    version: globalDownloadState.version
  };
}

/**
 * 取消当前下载
 */
function cancelDownload() {
  if (globalDownloadState.downloader) {
    globalDownloadState.downloader.cancel();
    globalDownloadState.isDownloading = false;
    globalDownloadState.version = null;
    globalDownloadState.downloader = null;
    globalDownloadState.downloadUrl = null;
    return true;
  }
  return false;
}

class UpdateChecker {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || UPDATE_SERVER;
    this.currentVersion = options.currentVersion || '1.0.0';
    this.platform = options.platform || 'windows';
    this.appId = options.appId || 'wenyanwen-tool';
    this.userDataPath = options.userDataPath || '';
  }

  /**
   * 检查更新
   * @returns {Promise<object|null>} 更新信息或 null
   */
  async checkUpdate() {
    return new Promise((resolve, reject) => {
      const url = `${this.serverUrl}/api/update/check?current_version=${this.currentVersion}&platform=${this.platform}&app_id=${this.appId}`;
      
      console.log(`🔍 检查更新: ${url}`);
      
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const req = httpModule.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            
            if (result.error) {
              console.log(`⚠ 检查更新失败: ${result.error}`);
              resolve(null);
              return;
            }

            if (result.has_update) {
              console.log(`🎉 发现新版本: ${result.version}`);
              console.log(`   更新说明: ${result.changelog}`);
              console.log(`   强制更新: ${result.force_update ? '是' : '否'}`);
              resolve(result);
            } else {
              console.log(`✓ 已是最新版本 (${this.currentVersion})`);
              resolve(null);
            }
          } catch (error) {
            console.error('解析更新响应失败:', error);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.error('检查更新请求失败:', error.message);
        resolve(null); // 网络错误不阻塞应用启动
      });

      req.setTimeout(10000, () => {
        req.destroy();
        console.log('⚠ 检查更新超时');
        resolve(null);
      });
    });
  }

  /**
   * 下载更新文件（使用多线程下载器）
   * @param {string} downloadUrl - 下载链接
   * @param {string} fileName - 文件名
   * @param {function} onProgress - 进度回调
   * @param {string} version - 版本号（用于防止重复下载）
   * @returns {Promise<string>} 下载的文件路径
   */
  async downloadUpdate(downloadUrl, fileName, onProgress, version = null) {
    // 检查是否已有下载任务
    if (globalDownloadState.isDownloading) {
      if (globalDownloadState.downloadUrl === downloadUrl) {
        console.log('⚠ 相同的下载任务已在进行中');
        throw new Error('DOWNLOAD_IN_PROGRESS');
      } else {
        console.log('⚠ 已有其他下载任务在进行中');
        throw new Error('ANOTHER_DOWNLOAD_IN_PROGRESS');
      }
    }

    // 保存为 .exe 安装程序
    const downloadPath = path.join(this.userDataPath, fileName || 'update-setup.exe');

    console.log(`📥 开始多线程下载: ${downloadUrl}`);
    console.log(`📁 保存到: ${downloadPath}`);

    // 设置全局下载状态
    globalDownloadState.isDownloading = true;
    globalDownloadState.version = version;
    globalDownloadState.downloadUrl = downloadUrl;

    try {
      // 创建多线程下载器
      const downloader = new MultiThreadDownloader({
        threads: 16,           // 16线程
        chunkSize: 2 * 1024 * 1024, // 2MB分块
        timeout: 30000,        // 30秒超时
        retries: 3,            // 3次重试
        maxConnections: 32     // 最大32连接
      });

      globalDownloadState.downloader = downloader;

      // 执行下载
      const result = await downloader.download(downloadUrl, downloadPath, (progress) => {
        if (onProgress) {
          onProgress({
            progress: progress.progress,
            downloadedSize: progress.downloadedSize,
            totalSize: progress.totalSize,
            speed: progress.speed,
            speedText: progress.speedText,
            eta: progress.eta,
            threads: progress.threads
          });
        }
      });

      console.log(`✓ 多线程下载完成: ${downloadPath}`);
      
      // 验证下载的文件
      if (!fs.existsSync(downloadPath)) {
        throw new Error('下载的文件不存在');
      }
      
      const fileSize = fs.statSync(downloadPath).size;
      console.log(`📊 下载文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
      
      if (fileSize === 0) {
        throw new Error('下载的文件大小为 0');
      }
      
      // 验证文件是否为有效的 PE 文件（Windows 可执行文件）
      const buffer = Buffer.alloc(2);
      const fd = fs.openSync(downloadPath, 'r');
      fs.readSync(fd, buffer, 0, 2, 0);
      fs.closeSync(fd);
      
      // PE 文件应该以 "MZ" 开头
      if (buffer.toString() !== 'MZ') {
        console.log(`⚠ 文件头: ${buffer.toString('hex')}`);
        throw new Error('下载的文件不是有效的 Windows 可执行文件');
      }
      
      console.log('✓ 文件完整性验证通过');
      
      // 清除下载状态
      globalDownloadState.isDownloading = false;
      globalDownloadState.version = null;
      globalDownloadState.downloader = null;
      globalDownloadState.downloadUrl = null;

      return result;
    } catch (error) {
      // 清除下载状态
      globalDownloadState.isDownloading = false;
      globalDownloadState.version = null;
      globalDownloadState.downloader = null;
      globalDownloadState.downloadUrl = null;

      // 清理可能的临时文件
      if (fs.existsSync(downloadPath)) {
        try { fs.unlinkSync(downloadPath); } catch (e) {}
      }
      if (fs.existsSync(downloadPath + '.tmp')) {
        try { fs.rmSync(downloadPath + '.tmp', { recursive: true, force: true }); } catch (e) {}
      }

      throw error;
    }
  }

  /**
   * 下载更新文件（单线程备用方案）
   * @param {string} downloadUrl - 下载链接
   * @param {string} fileName - 文件名
   * @param {function} onProgress - 进度回调
   * @returns {Promise<string>} 下载的文件路径
   */
  async downloadUpdateSingle(downloadUrl, fileName, onProgress) {
    return new Promise((resolve, reject) => {
      // 保存为 .exe 安装程序
      const downloadPath = path.join(this.userDataPath, fileName || 'update-setup.exe');

      console.log(`📥 单线程下载: ${downloadUrl}`);
      console.log(`📁 保存到: ${downloadPath}`);

      const urlObj = new URL(downloadUrl);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const file = fs.createWriteStream(downloadPath);

      const makeRequest = (url) => {
        const reqUrl = new URL(url);
        const options = {
          hostname: reqUrl.hostname,
          path: reqUrl.pathname + reqUrl.search,
          headers: { 'User-Agent': 'WenYanWen-Updater' }
        };

        const req = httpModule.get(options, (res) => {
          // 处理重定向
          if (res.statusCode === 301 || res.statusCode === 302) {
            const redirectUrl = res.headers.location;
            console.log(`↪ 重定向到: ${redirectUrl}`);
            file.close();
            makeRequest(redirectUrl);
            return;
          }

          if (res.statusCode !== 200) {
            file.close();
            if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
            reject(new Error(`下载失败: HTTP ${res.statusCode}`));
            return;
          }

          const totalSize = parseInt(res.headers['content-length'], 10);
          let downloadedSize = 0;

          res.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (onProgress && totalSize) {
              const progress = (downloadedSize / totalSize) * 100;
              onProgress({ progress, downloadedSize, totalSize });
            }
          });

          res.pipe(file);

          file.on('finish', () => {
            file.close();
            console.log(`✓ 下载完成: ${downloadPath}`);
            resolve(downloadPath);
          });
        });

        req.on('error', (error) => {
          file.close();
          if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
          reject(error);
        });

        req.setTimeout(300000, () => { // 5分钟超时
          req.destroy();
          reject(new Error('下载超时'));
        });
      };

      makeRequest(downloadUrl);
    });
  }

  /**
   * 安装更新（运行安装程序并退出应用）
   * @param {string} installerPath - 安装程序路径
   * @param {boolean} silent - 是否静默安装（默认 false，显示安装界面）
   */
  installUpdate(installerPath, silent = false) {
    const { spawn } = require('child_process');
    const { app } = require('electron');

    console.log(`🚀 启动安装程序: ${installerPath}`);
    console.log(`   安装模式: ${silent ? '静默' : '正常（显示进度）'}`);

    // 安装参数
    // 不使用 /S 静默模式，让用户看到安装进度
    // /D 指定安装目录（可选）
    const args = silent ? ['/S'] : [];
    
    // 启动安装程序
    const installer = spawn(installerPath, args, {
      detached: true,
      stdio: 'ignore',
      // 在 Windows 上以管理员权限运行（如果需要）
      shell: false
    });

    installer.unref();

    // 退出当前应用，让安装程序可以覆盖文件
    setTimeout(() => {
      console.log('📤 退出应用以完成更新...');
      app.quit();
    }, 500);
  }

  /**
   * 验证文件哈希
   * @param {string} filePath - 文件路径
   * @param {string} expectedHash - 期望的哈希值
   * @returns {Promise<boolean>}
   */
  async verifyHash(filePath, expectedHash) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const fileHash = hash.digest('hex');
        const isValid = fileHash === expectedHash;
        
        if (isValid) {
          console.log('✓ 文件哈希验证通过');
        } else {
          console.log(`✗ 文件哈希不匹配`);
          console.log(`  期望: ${expectedHash}`);
          console.log(`  实际: ${fileHash}`);
        }
        
        resolve(isValid);
      });
      stream.on('error', reject);
    });
  }

  /**
   * 保存更新信息到本地（供下次启动时使用）
   * @param {object} updateInfo - 更新信息
   */
  saveUpdateInfo(updateInfo) {
    const infoPath = path.join(this.userDataPath, 'pending-update.json');
    fs.writeFileSync(infoPath, JSON.stringify({
      ...updateInfo,
      savedAt: new Date().toISOString()
    }, null, 2));
    console.log('✓ 更新信息已保存');
  }

  /**
   * 获取待处理的更新信息
   * @returns {object|null}
   */
  getPendingUpdate() {
    const infoPath = path.join(this.userDataPath, 'pending-update.json');
    if (fs.existsSync(infoPath)) {
      try {
        return JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * 清除待处理的更新信息
   */
  clearPendingUpdate() {
    const infoPath = path.join(this.userDataPath, 'pending-update.json');
    if (fs.existsSync(infoPath)) {
      fs.unlinkSync(infoPath);
    }
  }
}

module.exports = { 
  UpdateChecker, 
  UPDATE_SERVER,
  isDownloading,
  getDownloadState,
  cancelDownload
};

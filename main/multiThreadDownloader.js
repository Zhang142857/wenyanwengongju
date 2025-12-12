/**
 * 多线程下载器
 * 支持分块并行下载，提升下载速度
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

class MultiThreadDownloader {
  constructor(options = {}) {
    this.threads = options.threads || 16; // 默认16线程，提升并发
    this.chunkSize = options.chunkSize || 2 * 1024 * 1024; // 2MB每块，更细粒度
    this.timeout = options.timeout || 30000; // 30秒超时
    this.retries = options.retries || 3; // 重试次数
    this.maxConnections = options.maxConnections || 32; // 最大连接数
    
    this.isDownloading = false;
    this.isPaused = false;
    this.isCancelled = false;
    
    this.totalSize = 0;
    this.downloadedSize = 0;
    this.startTime = 0;
    this.lastTime = 0;
    this.lastSize = 0;
    this.speed = 0;
    
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
  }

  /**
   * 获取文件大小和是否支持分块下载
   */
  async getFileInfo(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD',
        headers: { 'User-Agent': 'MultiThreadDownloader' }
      };

      const req = protocol.request(options, (res) => {
        // 处理重定向
        if (res.statusCode === 301 || res.statusCode === 302) {
          this.getFileInfo(res.headers.location).then(resolve).catch(reject);
          return;
        }

        const contentLength = parseInt(res.headers['content-length'], 10);
        const acceptRanges = res.headers['accept-ranges'] === 'bytes';
        
        resolve({
          size: contentLength || 0,
          supportsRange: acceptRanges,
          url: url // 可能经过重定向
        });
      });

      req.on('error', reject);
      req.setTimeout(this.timeout, () => {
        req.destroy();
        reject(new Error('获取文件信息超时'));
      });
      req.end();
    });
  }

  /**
   * 下载单个分块（优化版本，使用更大缓冲区）
   */
  async downloadChunk(url, start, end, chunkIndex, tempDir) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
      
      let retryCount = 0;
      
      const doDownload = () => {
        if (this.isCancelled) {
          reject(new Error('下载已取消'));
          return;
        }

        const options = {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          headers: {
            'User-Agent': 'MultiThreadDownloader',
            'Range': `bytes=${start}-${end}`,
            'Connection': 'keep-alive',
            'Accept-Encoding': 'identity' // 禁用压缩以获得准确的进度
          },
          // 优化连接参数
          agent: new (protocol === https ? https : http).Agent({
            keepAlive: true,
            maxSockets: this.maxConnections,
            timeout: this.timeout
          })
        };

        // 使用更大的写入缓冲区
        const file = fs.createWriteStream(chunkPath, {
          highWaterMark: 1024 * 1024 // 1MB 写入缓冲区
        });
        
        const req = protocol.get(options, (res) => {
          // 处理重定向
          if (res.statusCode === 301 || res.statusCode === 302) {
            file.close();
            this.downloadChunk(res.headers.location, start, end, chunkIndex, tempDir)
              .then(resolve)
              .catch(reject);
            return;
          }

          if (res.statusCode !== 206 && res.statusCode !== 200) {
            file.close();
            if (retryCount < this.retries) {
              retryCount++;
              setTimeout(doDownload, 500 * retryCount);
            } else {
              reject(new Error(`分块 ${chunkIndex} 下载失败: HTTP ${res.statusCode}`));
            }
            return;
          }

          res.on('data', (chunk) => {
            if (this.isPaused) return;
            this.downloadedSize += chunk.length;
            this.updateSpeed();
          });

          res.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve(chunkPath);
          });

          file.on('error', (err) => {
            file.close();
            fs.unlink(chunkPath, () => {});
            reject(err);
          });
        });

        req.on('error', (err) => {
          file.close();
          if (retryCount < this.retries) {
            retryCount++;
            setTimeout(doDownload, 500 * retryCount);
          } else {
            reject(err);
          }
        });

        req.setTimeout(this.timeout, () => {
          req.destroy();
          file.close();
          if (retryCount < this.retries) {
            retryCount++;
            setTimeout(doDownload, 500 * retryCount);
          } else {
            reject(new Error(`分块 ${chunkIndex} 下载超时`));
          }
        });
      };

      doDownload();
    });
  }

  /**
   * 单线程下载（不支持分块时使用）
   */
  async downloadSingle(url, destPath) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      const file = fs.createWriteStream(destPath);

      const doDownload = (downloadUrl) => {
        const reqUrl = new URL(downloadUrl);
        const options = {
          hostname: reqUrl.hostname,
          path: reqUrl.pathname + reqUrl.search,
          headers: { 'User-Agent': 'MultiThreadDownloader' }
        };

        const req = protocol.get(options, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            doDownload(res.headers.location);
            return;
          }

          if (res.statusCode !== 200) {
            file.close();
            reject(new Error(`下载失败: HTTP ${res.statusCode}`));
            return;
          }

          this.totalSize = parseInt(res.headers['content-length'], 10) || 0;

          res.on('data', (chunk) => {
            if (this.isCancelled) {
              req.destroy();
              file.close();
              reject(new Error('下载已取消'));
              return;
            }
            this.downloadedSize += chunk.length;
            this.updateSpeed();
          });

          res.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve(destPath);
          });
        });

        req.on('error', reject);
      };

      doDownload(url);
    });
  }

  /**
   * 更新下载速度（使用滑动窗口平均）
   */
  updateSpeed() {
    const now = Date.now();
    const elapsed = now - this.lastTime;
    
    if (elapsed >= 200) { // 每200ms更新一次，更流畅
      const sizeDiff = this.downloadedSize - this.lastSize;
      const instantSpeed = (sizeDiff / elapsed) * 1000; // bytes per second
      
      // 使用滑动窗口平均速度，更平滑
      if (!this.speedHistory) this.speedHistory = [];
      this.speedHistory.push(instantSpeed);
      if (this.speedHistory.length > 10) this.speedHistory.shift();
      
      this.speed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
      this.lastTime = now;
      this.lastSize = this.downloadedSize;
      
      if (this.onProgress) {
        const progress = this.totalSize > 0 
          ? (this.downloadedSize / this.totalSize) * 100 
          : 0;
        
        this.onProgress({
          progress,
          downloadedSize: this.downloadedSize,
          totalSize: this.totalSize,
          speed: this.speed,
          speedText: this.formatSpeed(this.speed),
          eta: this.calculateETA(),
          threads: this.activeThreads || this.threads
        });
      }
    }
  }

  /**
   * 格式化速度
   */
  formatSpeed(bytesPerSecond) {
    if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s';
    if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
    return (bytesPerSecond / 1024 / 1024).toFixed(1) + ' MB/s';
  }

  /**
   * 计算剩余时间
   */
  calculateETA() {
    if (this.speed <= 0 || this.totalSize <= 0) return '计算中...';
    const remaining = this.totalSize - this.downloadedSize;
    const seconds = remaining / this.speed;
    
    if (seconds < 60) return Math.ceil(seconds) + ' 秒';
    if (seconds < 3600) return Math.ceil(seconds / 60) + ' 分钟';
    return (seconds / 3600).toFixed(1) + ' 小时';
  }

  /**
   * 合并分块文件（使用同步方式，确保数据完整性）
   */
  async mergeChunks(chunkPaths, destPath) {
    return new Promise((resolve, reject) => {
      try {
        // 验证所有分块文件都存在
        console.log('🔍 验证分块文件...');
        for (let i = 0; i < chunkPaths.length; i++) {
          if (!chunkPaths[i] || !fs.existsSync(chunkPaths[i])) {
            reject(new Error(`分块 ${i} 文件不存在或下载失败`));
            return;
          }
          const chunkSize = fs.statSync(chunkPaths[i]).size;
          if (chunkSize === 0) {
            reject(new Error(`分块 ${i} 文件大小为 0`));
            return;
          }
        }
        console.log('✓ 所有分块文件验证通过');

        // 使用同步方式合并文件，确保顺序和完整性
        console.log('🔗 开始合并分块...');
        const fd = fs.openSync(destPath, 'w');
        let totalWritten = 0;

        for (let i = 0; i < chunkPaths.length; i++) {
          const chunkPath = chunkPaths[i];
          const chunkData = fs.readFileSync(chunkPath);
          const written = fs.writeSync(fd, chunkData);
          totalWritten += written;
          
          console.log(`✓ 分块 ${i + 1}/${chunkPaths.length} 已合并 (${(written / 1024 / 1024).toFixed(2)} MB)`);
          
          // 立即删除已合并的分块，释放空间
          try {
            fs.unlinkSync(chunkPath);
          } catch (e) {
            console.log(`⚠ 删除分块 ${i} 失败: ${e.message}`);
          }
        }

        fs.closeSync(fd);
        
        // 验证最终文件
        const finalSize = fs.statSync(destPath).size;
        console.log(`✓ 文件合并完成，大小: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  写入字节: ${totalWritten}, 文件大小: ${finalSize}`);
        
        if (finalSize === 0) {
          reject(new Error('合并后的文件大小为 0'));
          return;
        }
        
        if (this.totalSize > 0 && Math.abs(finalSize - this.totalSize) > 1024) {
          console.log(`⚠ 文件大小不完全匹配: 期望 ${this.totalSize}, 实际 ${finalSize}, 差异 ${Math.abs(finalSize - this.totalSize)} 字节`);
        }
        
        resolve(destPath);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 开始下载
   */
  async download(url, destPath, onProgress) {
    if (this.isDownloading) {
      throw new Error('已有下载任务进行中');
    }

    this.isDownloading = true;
    this.isCancelled = false;
    this.isPaused = false;
    this.downloadedSize = 0;
    this.speed = 0;
    this.startTime = Date.now();
    this.lastTime = this.startTime;
    this.lastSize = 0;
    this.onProgress = onProgress;

    try {
      // 获取文件信息
      console.log('📊 获取文件信息...');
      const fileInfo = await this.getFileInfo(url);
      this.totalSize = fileInfo.size;
      
      console.log(`📦 文件大小: ${(this.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`🔧 支持分块下载: ${fileInfo.supportsRange ? '是' : '否'}`);

      // 如果不支持分块或文件太小，使用单线程下载
      if (!fileInfo.supportsRange || this.totalSize < this.chunkSize * 2) {
        console.log('📥 使用单线程下载...');
        const result = await this.downloadSingle(url, destPath);
        this.isDownloading = false;
        return result;
      }

      // 动态调整线程数和分块大小
      // 对于大文件，使用更多线程和更大分块
      let effectiveThreads = this.threads;
      let effectiveChunkSize = this.chunkSize;
      
      if (this.totalSize > 100 * 1024 * 1024) { // > 100MB
        effectiveThreads = Math.min(32, this.threads * 2);
        effectiveChunkSize = 4 * 1024 * 1024; // 4MB
      } else if (this.totalSize > 50 * 1024 * 1024) { // > 50MB
        effectiveThreads = Math.min(24, Math.floor(this.threads * 1.5));
        effectiveChunkSize = 3 * 1024 * 1024; // 3MB
      }

      // 计算分块
      const chunks = [];
      let start = 0;
      while (start < this.totalSize) {
        const end = Math.min(start + effectiveChunkSize - 1, this.totalSize - 1);
        chunks.push({ start, end, index: chunks.length });
        start = end + 1;
      }

      console.log(`🧵 分块数: ${chunks.length}, 线程数: ${effectiveThreads}, 分块大小: ${(effectiveChunkSize / 1024 / 1024).toFixed(1)}MB`);
      this.activeThreads = effectiveThreads;

      // 创建临时目录
      const tempDir = destPath + '.tmp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 并行下载分块（优化调度）
      const downloadQueue = [...chunks];
      const chunkPaths = new Array(chunks.length);
      const activeDownloads = new Set();
      let hasError = false;

      await new Promise((resolve, reject) => {
        const startNextDownload = () => {
          if (this.isCancelled || hasError) {
            if (!hasError) reject(new Error('下载已取消'));
            return;
          }

          // 尽可能多地启动下载任务
          while (activeDownloads.size < effectiveThreads && downloadQueue.length > 0) {
            const chunk = downloadQueue.shift();
            activeDownloads.add(chunk.index);

            this.downloadChunk(url, chunk.start, chunk.end, chunk.index, tempDir)
              .then((chunkPath) => {
                chunkPaths[chunk.index] = chunkPath;
                activeDownloads.delete(chunk.index);

                if (downloadQueue.length === 0 && activeDownloads.size === 0) {
                  resolve();
                } else {
                  // 立即启动下一个下载
                  setImmediate(startNextDownload);
                }
              })
              .catch((err) => {
                hasError = true;
                activeDownloads.delete(chunk.index);
                reject(err);
              });
          }
        };

        // 启动初始批次
        startNextDownload();
      });

      // 合并分块
      console.log('🔗 合并分块文件...');
      await this.mergeChunks(chunkPaths, destPath);

      // 验证最终文件
      if (fs.existsSync(destPath)) {
        const finalSize = fs.statSync(destPath).size;
        console.log(`📊 最终文件大小: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        
        if (finalSize === 0) {
          throw new Error('下载的文件大小为 0');
        }
        
        if (this.totalSize > 0 && finalSize !== this.totalSize) {
          console.log(`⚠ 文件大小不完全匹配: 期望 ${this.totalSize}, 实际 ${finalSize}`);
        }
      } else {
        throw new Error('合并后的文件不存在');
      }

      // 清理临时目录
      try {
        fs.rmdirSync(tempDir);
      } catch (e) {}

      this.isDownloading = false;
      console.log('✅ 下载完成');
      return destPath;

    } catch (error) {
      this.isDownloading = false;
      throw error;
    }
  }

  /**
   * 取消下载
   */
  cancel() {
    this.isCancelled = true;
  }

  /**
   * 暂停下载
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * 恢复下载
   */
  resume() {
    this.isPaused = false;
  }
}

module.exports = { MultiThreadDownloader };

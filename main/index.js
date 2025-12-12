const { app, BrowserWindow, ipcMain, protocol, net, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { checkAndApplyUpdatePatch } = require('./updateConfig');
const { UpdateChecker, isDownloading, getDownloadState, cancelDownload } = require('./updateChecker');
const { configManager, CONFIG_FILES } = require('./configManager');

// 保持对窗口对象的全局引用
let mainWindow = null;

// 启动参数
let launchArgs = {};

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * 解析启动参数
 * 支持的参数：
 * --upload-config=<url>     更新后上传配置到指定服务器
 * --post-update             标记这是更新后的首次启动
 * --silent                  静默模式（不显示窗口）
 * --action=<action>         执行特定操作
 * --callback-url=<url>      操作完成后回调的 URL
 */
function parseArgs() {
  const args = process.argv.slice(app.isPackaged ? 1 : 2);
  
  for (const arg of args) {
    if (arg.startsWith('--upload-config=')) {
      launchArgs.uploadConfigUrl = arg.replace('--upload-config=', '');
    } else if (arg === '--post-update') {
      launchArgs.postUpdate = true;
    } else if (arg === '--silent') {
      launchArgs.silent = true;
    } else if (arg.startsWith('--action=')) {
      launchArgs.action = arg.replace('--action=', '');
    } else if (arg.startsWith('--callback-url=')) {
      launchArgs.callbackUrl = arg.replace('--callback-url=', '');
    } else if (arg.startsWith('--user-id=')) {
      launchArgs.userId = arg.replace('--user-id=', '');
    } else if (arg.startsWith('--token=')) {
      launchArgs.token = arg.replace('--token=', '');
    }
  }
  
  console.log('📋 启动参数:', launchArgs);
  return launchArgs;
}

// 获取应用根目录
function getAppPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar');
  }
  return path.join(__dirname, '..');
}

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '文言文查询',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // 允许在 file:// 协议下使用 localStorage
      webSecurity: false,
    },
    // 中国风配色 - 使用淡雅的背景色
    backgroundColor: '#faf8f5',
    show: false,
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // 开发环境下打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境使用自定义协议加载
    mainWindow.loadURL('app://./index.html');
  }

  // 窗口准备好后显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 窗口关闭时清理引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 注册自定义协议 - 使用新的 API
function registerProtocol() {
  // 注册为特权协议，允许使用 localStorage
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

// 处理自定义协议请求
function handleProtocol() {
  const appRoot = getAppPath();
  const outDir = path.join(appRoot, 'out');

  protocol.handle('app', (request) => {
    let urlPath = request.url.replace('app://./', '');
    
    // 解码 URL
    urlPath = decodeURIComponent(urlPath);
    
    // 移除查询参数
    urlPath = urlPath.split('?')[0];
    urlPath = urlPath.split('#')[0];
    
    // 处理路径
    let filePath;
    
    if (urlPath === '' || urlPath === 'index.html') {
      // 根路径
      filePath = path.join(outDir, 'index.html');
    } else if (urlPath.endsWith('.html')) {
      // 直接请求 HTML 文件
      filePath = path.join(outDir, urlPath);
    } else if (urlPath.startsWith('_next/')) {
      // Next.js 静态资源
      filePath = path.join(outDir, urlPath);
    } else if (urlPath.includes('.')) {
      // 其他静态资源（CSS, JS, 图片等）
      filePath = path.join(outDir, urlPath);
    } else {
      // 路由路径，加载对应目录的 index.html
      const routePath = urlPath.replace(/\/$/, '');
      filePath = path.join(outDir, routePath, 'index.html');
      
      // 如果文件不存在，尝试直接加载
      if (!fs.existsSync(filePath)) {
        filePath = path.join(outDir, urlPath + '.html');
      }
      
      // 如果还是不存在，加载 404
      if (!fs.existsSync(filePath)) {
        filePath = path.join(outDir, '404.html');
      }
    }

    // 返回文件
    return net.fetch('file://' + filePath);
  });
}

// 在 app ready 之前注册协议
if (!isDev) {
  registerProtocol();
}

// Electron 初始化完成后创建窗口
app.whenReady().then(async () => {
  // 解析启动参数
  parseArgs();
  
  // 处理自定义协议
  if (!isDev) {
    handleProtocol();
  }
  
  // 初始化配置管理器（新的配置系统）
  await configManager.initialize();
  
  // 初始化默认数据（向后兼容）
  initializeDefaultData();
  
  // 检查并应用更新补丁（更新时注入新配置）
  applyUpdatePatchIfNeeded();
  
  // 处理更新后的特殊操作
  if (launchArgs.postUpdate || launchArgs.action) {
    await handlePostUpdateActions();
  }
  
  // 如果不是静默模式，创建窗口
  if (!launchArgs.silent) {
    createWindow();
    
    // 设置配置变化通知
    setupConfigChangeNotification();
    
    // 窗口创建后检查更新（延迟执行，不阻塞启动）
    setTimeout(() => {
      checkForUpdates();
    }, 3000);
  } else {
    console.log('🔇 静默模式，不显示窗口');
    // 静默模式下，操作完成后退出
    if (launchArgs.action) {
      console.log('✓ 静默操作完成，退出应用');
      app.quit();
    }
  }

  // macOS 特殊处理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && !launchArgs.silent) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（Windows & Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 初始化默认数据
function initializeDefaultData() {
  const userDataPath = app.getPath('userData');
  const flagFile = path.join(userDataPath, '.initialized');
  
  // 如果已经初始化过，直接返回
  if (fs.existsSync(flagFile)) {
    console.log('✓ 应用已初始化，跳过');
    return;
  }
  
  console.log('🚀 首次运行，开始初始化...');
  
  try {
    // 1. 尝试加载预设的完整配置文件（包含配置和库数据）
    const appRoot = getAppPath();
    const outDir = path.join(appRoot, 'out');
    const presetConfigPath = path.join(outDir, 'default-config.json');
    
    if (fs.existsSync(presetConfigPath)) {
      console.log('📦 发现预设配置文件，正在加载...');
      
      const presetConfig = JSON.parse(fs.readFileSync(presetConfigPath, 'utf8'));
      
      // 保存配置到用户数据目录
      if (presetConfig.config) {
        const configPath = path.join(userDataPath, 'app-config.json');
        fs.writeFileSync(configPath, JSON.stringify(presetConfig.config, null, 2), 'utf8');
        console.log('✓ 配置已加载');
      }
      
      // 保存库数据到用户数据目录
      if (presetConfig.libraries) {
        const librariesPath = path.join(userDataPath, 'classical-chinese-data.json');
        fs.writeFileSync(librariesPath, JSON.stringify(presetConfig.libraries, null, 2), 'utf8');
        
        // 统计信息
        const libCount = presetConfig.libraries.libraries?.length || 0;
        const defCount = presetConfig.libraries.definitions?.length || 0;
        const linkCount = presetConfig.libraries.characterDefinitionLinks?.length || 0;
        
        console.log(`✓ 库数据已加载:`);
        console.log(`  - ${libCount} 个库`);
        console.log(`  - ${defCount} 个义项`);
        console.log(`  - ${linkCount} 个例句关联`);
      }
      
      // 创建标记文件
      fs.writeFileSync(flagFile, JSON.stringify({
        initializedAt: new Date().toISOString(),
        source: 'preset-config',
        version: presetConfig.config?.version || '1.0.0'
      }, null, 2), 'utf8');
      
      console.log('🎉 预设配置加载完成！\n');
      return;
    }
    
    // 2. 如果没有预设配置，尝试加载默认库文件（向后兼容）
    console.log('⚠ 未找到预设配置，尝试加载默认库...');
    
    const defaultLibrariesPath = path.join(__dirname, 'default-libraries.json');
    if (fs.existsSync(defaultLibrariesPath)) {
      const defaultLibraries = JSON.parse(fs.readFileSync(defaultLibrariesPath, 'utf8'));
      
      // 设置默认重点字列表
      const focusWords = '安卑备被鄙毕薄策长称诚惩驰出辞次箪当道得等敌吊度端恶发凡方分奉否夫扶拂福富更苟固故顾观冠光归过好号还患惠或极寂加间见将角借尽就居举具决绝开可苦乐类利隶良临鳞令妙名谋奇骑前强且清情请穷屈去阙容乳善尚少舍射甚胜施食使始市恃是适书数遂所所以通图徒推屯望为谓文闻下鲜贤相效屑谢信行许学寻焉艳夷遗已义异易诣益意因引盈用友余与欲援缘杂然再曾争指至志质致诸主属著缀资子自足卒作坐乎者以而其于焉虽然则因且乃矣之';
      
      // 准备初始化数据
      const initData = {
        libraries: defaultLibraries,
        focusWords: focusWords,
        timestamp: new Date().toISOString()
      };
      
      // 保存到文件
      const initDataPath = path.join(userDataPath, 'init-data.json');
      fs.writeFileSync(initDataPath, JSON.stringify(initData, null, 2), 'utf8');
      
      // 创建标记文件
      fs.writeFileSync(flagFile, JSON.stringify({
        initializedAt: new Date().toISOString(),
        source: 'default-libraries',
        version: '1.0.0'
      }, null, 2), 'utf8');
      
      console.log('✓ 默认库加载完成\n');
      return;
    }
    
    // 3. 如果都没有，创建空的初始化标记
    console.log('⚠ 未找到任何预设数据，将使用空数据启动');
    fs.writeFileSync(flagFile, JSON.stringify({
      initializedAt: new Date().toISOString(),
      source: 'empty',
      version: '1.0.0'
    }, null, 2), 'utf8');
    
  } catch (error) {
    console.error('❌ 初始化数据失败:', error);
    console.error(error.stack);
  }
}

// 应用更新补丁
function applyUpdatePatchIfNeeded() {
  const userDataPath = app.getPath('userData');
  const appRoot = getAppPath();
  
  try {
    const applied = checkAndApplyUpdatePatch(userDataPath, appRoot);
    if (applied) {
      console.log('🔄 更新补丁已应用');
    }
  } catch (error) {
    console.error('应用更新补丁失败:', error);
  }
}

/**
 * 处理更新后的特殊操作
 */
async function handlePostUpdateActions() {
  console.log('🔄 处理更新后操作...');
  
  // 确定当前操作类型
  const currentAction = launchArgs.action || (launchArgs.uploadConfigUrl ? 'config-upload' : 'post-update');
  
  try {
    // 上传配置到服务器
    if (launchArgs.uploadConfigUrl) {
      await uploadConfigToServer(launchArgs.uploadConfigUrl);
    }
    
    // 执行特定操作
    if (launchArgs.action) {
      await executeAction(launchArgs.action);
    }
    
    // 回调通知（成功）
    if (launchArgs.callbackUrl) {
      await sendCallback(launchArgs.callbackUrl, { success: true }, currentAction);
    }
    
    console.log('✓ 更新后操作完成');
  } catch (error) {
    console.error('❌ 更新后操作失败:', error);
    
    // 失败时也发送回调
    if (launchArgs.callbackUrl) {
      await sendCallback(launchArgs.callbackUrl, { 
        success: false, 
        error: error.message 
      }, currentAction);
    }
  }
}

/**
 * 上传配置到服务器
 */
async function uploadConfigToServer(url) {
  console.log(`📤 上传配置到: ${url}`);
  
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'app-config.json');
  const librariesPath = path.join(userDataPath, 'classical-chinese-data.json');
  
  // 读取配置
  let config = null;
  let libraries = null;
  
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  
  if (fs.existsSync(librariesPath)) {
    libraries = JSON.parse(fs.readFileSync(librariesPath, 'utf8'));
  }
  
  // 构建上传数据
  const uploadData = {
    timestamp: new Date().toISOString(),
    appVersion: app.getVersion(),
    userId: launchArgs.userId || 'anonymous',
    config: config,
    libraries: libraries ? {
      libraryCount: libraries.libraries?.length || 0,
      definitionCount: libraries.definitions?.length || 0,
      // 可选：上传完整库数据或只上传统计信息
      // data: libraries
    } : null
  };
  
  // 发送请求
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const postData = JSON.stringify(uploadData);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(launchArgs.token ? { 'Authorization': `Bearer ${launchArgs.token}` } : {})
      }
    };
    
    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✓ 配置上传成功');
          resolve(data);
        } else {
          reject(new Error(`上传失败: ${res.statusCode} ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 执行特定操作
 */
async function executeAction(action) {
  console.log(`🎯 执行操作: ${action}`);
  
  switch (action) {
    case 'upload-config':
      // 如果没有指定 URL，使用默认 URL
      const defaultUrl = 'https://update.156658.xyz/api/config/upload';
      await uploadConfigToServer(launchArgs.uploadConfigUrl || defaultUrl);
      break;
      
    case 'clear-cache':
      // 清理缓存
      const userDataPath = app.getPath('userData');
      const cacheDir = path.join(userDataPath, 'cache');
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        console.log('✓ 缓存已清理');
      }
      break;
      
    case 'reset-tour':
      // 重置引导状态
      const configPath = path.join(app.getPath('userData'), 'app-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.system = config.system || {};
        config.system.hasPlayedTour = false;
        config.tourPlayedRecord = {
          home: false,
          import: false,
          organize: false,
          aiOrganize: false,
          exam: false,
          manage: false,
          regexGenerator: false,
          query: false
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        console.log('✓ 引导状态已重置');
      }
      break;
      
    case 'export-logs':
      // 导出日志
      console.log('✓ 日志导出功能待实现');
      break;
      
    default:
      console.log(`⚠ 未知操作: ${action}`);
  }
}

/**
 * 发送回调通知
 * @param {string} url - 回调 URL
 * @param {object} data - 回调数据
 * @param {string} action - 操作类型
 */
async function sendCallback(url, data, action = 'unknown') {
  console.log(`📡 发送回调到: ${url}`);
  
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const postData = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      appVersion: app.getVersion(),
      userId: launchArgs.userId,
      action: action  // 服务端需要的 action 字段
    });
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(launchArgs.token ? { 'Authorization': `Bearer ${launchArgs.token}` } : {})
      }
    };
    
    const req = httpModule.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        console.log('✓ 回调发送成功');
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.error('⚠ 回调发送失败:', err.message);
      resolve(); // 回调失败不阻塞主流程
    });
    
    req.write(postData);
    req.end();
  });
}

// IPC 通信处理
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

// 获取应用版本号
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// ==================== 新配置系统 IPC ====================

// 获取配置目录信息
ipcMain.handle('get-config-directories', () => {
  return configManager.getDirectoryInfo();
});

// 读取应用配置
ipcMain.handle('config-get-app-config', () => {
  return configManager.getAppConfig();
});

// 保存应用配置
ipcMain.handle('config-save-app-config', (event, config) => {
  return configManager.saveAppConfig(config);
});

// 读取库数据
ipcMain.handle('config-get-libraries', () => {
  return configManager.getLibraries();
});

// 保存库数据
ipcMain.handle('config-save-libraries', (event, libraries) => {
  return configManager.saveLibraries(libraries);
});

// 读取任意配置文件
ipcMain.handle('config-read', (event, filename, defaultValue) => {
  return configManager.readConfig(filename, defaultValue);
});

// 保存任意配置文件
ipcMain.handle('config-save', (event, filename, data) => {
  return configManager.saveConfig(filename, data);
});

// 清理缓存
ipcMain.handle('config-clear-cache', () => {
  return configManager.clearCache();
});

// 打开配置目录
ipcMain.handle('open-config-directory', () => {
  const configDir = configManager.getConfigDir();
  if (configDir) {
    shell.openPath(configDir);
    return true;
  }
  return false;
});

// 设置配置变化监听，通知渲染进程
function setupConfigChangeNotification() {
  // 监听应用配置变化
  configManager.addListener('app-config.json', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('config-changed', {
        filename: 'app-config.json',
        config: data
      });
    }
  });

  // 监听库数据变化
  configManager.addListener('libraries.json', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('config-changed', {
        filename: 'libraries.json',
        config: data
      });
    }
  });
}

// ==================== 背景媒体文件管理 ====================

// 获取媒体存储目录
function getMediaDir() {
  // 优先使用新的配置管理器的缓存目录
  if (configManager && configManager.getBackgroundsDir) {
    const mediaDir = configManager.getBackgroundsDir();
    if (mediaDir && !fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    return mediaDir;
  }
  
  // 回退到旧的位置
  const userDataPath = app.getPath('userData');
  const mediaDir = path.join(userDataPath, 'backgrounds');
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  return mediaDir;
}

// 保存背景媒体文件
ipcMain.handle('save-background-media', async (event, { data, filename, type }) => {
  try {
    const mediaDir = getMediaDir();
    const ext = type === 'video' ? path.extname(filename) || '.mp4' : path.extname(filename) || '.jpg';
    const savedFilename = `background-${Date.now()}${ext}`;
    const filePath = path.join(mediaDir, savedFilename);
    
    // 如果是 base64 数据
    if (data.startsWith('data:')) {
      const base64Data = data.split(',')[1];
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    } else {
      // 如果是文件路径，复制文件
      fs.copyFileSync(data, filePath);
    }
    
    console.log(`✓ 背景媒体已保存: ${savedFilename}`);
    return { success: true, path: savedFilename };
  } catch (error) {
    console.error('❌ 保存背景媒体失败:', error);
    return { success: false, error: error.message };
  }
});

// 读取背景媒体文件
ipcMain.handle('get-background-media', async (event, filename) => {
  try {
    const mediaDir = getMediaDir();
    const filePath = path.join(mediaDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return { success: false, error: '文件不存在' };
    }
    
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'image/jpeg';
    
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.mp4') mimeType = 'video/mp4';
    else if (ext === '.webm') mimeType = 'video/webm';
    else if (ext === '.mov') mimeType = 'video/quicktime';
    
    const base64 = `data:${mimeType};base64,${data.toString('base64')}`;
    return { success: true, data: base64 };
  } catch (error) {
    console.error('❌ 读取背景媒体失败:', error);
    return { success: false, error: error.message };
  }
});

// 删除背景媒体文件
ipcMain.handle('delete-background-media', async (event, filename) => {
  try {
    const mediaDir = getMediaDir();
    const filePath = path.join(mediaDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✓ 背景媒体已删除: ${filename}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ 删除背景媒体失败:', error);
    return { success: false, error: error.message };
  }
});

// 列出所有背景媒体文件
ipcMain.handle('list-background-media', async () => {
  try {
    const mediaDir = getMediaDir();
    const files = fs.readdirSync(mediaDir);
    return { success: true, files };
  } catch (error) {
    console.error('❌ 列出背景媒体失败:', error);
    return { success: false, error: error.message, files: [] };
  }
});

// 获取初始化数据（向后兼容）
ipcMain.handle('get-init-data', () => {
  const userDataPath = app.getPath('userData');
  const initDataPath = path.join(userDataPath, 'init-data.json');
  
  if (fs.existsSync(initDataPath)) {
    try {
      const data = fs.readFileSync(initDataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('读取初始化数据失败:', error);
      return null;
    }
  }
  return null;
});

// 获取预设配置
ipcMain.handle('get-preset-config', () => {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'app-config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('读取预设配置失败:', error);
      return null;
    }
  }
  return null;
});

// 获取预设库数据
ipcMain.handle('get-preset-libraries', () => {
  const userDataPath = app.getPath('userData');
  const librariesPath = path.join(userDataPath, 'classical-chinese-data.json');
  
  if (fs.existsSync(librariesPath)) {
    try {
      const data = fs.readFileSync(librariesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('读取预设库数据失败:', error);
      return null;
    }
  }
  return null;
});

// ==================== 自动更新检查 ====================

let updateChecker = null;

/**
 * 检查更新
 */
async function checkForUpdates() {
  if (isDev) {
    console.log('🔧 开发模式，跳过更新检查');
    return;
  }

  try {
    const userDataPath = app.getPath('userData');
    
    updateChecker = new UpdateChecker({
      currentVersion: app.getVersion(),
      platform: 'windows',
      userDataPath: userDataPath
    });

    const updateInfo = await updateChecker.checkUpdate();
    
    if (updateInfo && updateInfo.has_update) {
      // 通知渲染进程有更新
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', updateInfo);
      }
      
      // 保存更新信息
      updateChecker.saveUpdateInfo(updateInfo);
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
}

/**
 * 显示更新通知（通过渲染进程）
 */
function notifyUpdateAvailable(updateInfo) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', updateInfo);
  }
}

// IPC: 检查更新
ipcMain.handle('check-for-updates', async () => {
  await checkForUpdates();
  return updateChecker?.getPendingUpdate() || null;
});

// IPC: 获取待处理的更新
ipcMain.handle('get-pending-update', () => {
  return updateChecker?.getPendingUpdate() || null;
});

// IPC: 清除待处理的更新
ipcMain.handle('clear-pending-update', () => {
  updateChecker?.clearPendingUpdate();
  return true;
});

// IPC: 下载更新
ipcMain.handle('download-update', async (event, downloadUrl, fileName) => {
  if (!updateChecker) {
    updateChecker = new UpdateChecker({
      currentVersion: app.getVersion(),
      platform: 'windows',
      userDataPath: app.getPath('userData')
    });
  }
  
  try {
    const filePath = await updateChecker.downloadUpdate(downloadUrl, fileName, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-progress', progress);
      }
    });
    return filePath;
  } catch (error) {
    console.error('下载更新失败:', error);
    throw error;
  }
});

// IPC: 安装更新
ipcMain.handle('install-update', async (event, installerPath) => {
  if (!updateChecker) return false;
  
  try {
    updateChecker.installUpdate(installerPath);
    return true;
  } catch (error) {
    console.error('安装更新失败:', error);
    throw error;
  }
});

// IPC: 下载并安装更新（一键操作，支持多线程）
ipcMain.handle('download-and-install', async (event, downloadUrl, fileName, version) => {
  // 检查是否已有下载任务
  if (isDownloading()) {
    const state = getDownloadState();
    console.log(`⚠ 已有下载任务进行中: ${state.version}`);
    throw new Error('DOWNLOAD_IN_PROGRESS');
  }

  if (!updateChecker) {
    updateChecker = new UpdateChecker({
      currentVersion: app.getVersion(),
      platform: 'windows',
      userDataPath: app.getPath('userData')
    });
  }
  
  try {
    // 通知渲染进程下载开始
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-started', { version, downloadUrl });
    }

    // 多线程下载
    const filePath = await updateChecker.downloadUpdate(downloadUrl, fileName, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-progress', progress);
      }
    }, version);
    
    // 安装
    updateChecker.installUpdate(filePath);
    return true;
  } catch (error) {
    console.error('下载并安装更新失败:', error);
    // 通知渲染进程下载失败
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-error', { 
        error: error.message,
        version 
      });
    }
    throw error;
  }
});

// IPC: 检查是否正在下载
ipcMain.handle('is-downloading', () => {
  return getDownloadState();
});

// IPC: 取消下载
ipcMain.handle('cancel-download', () => {
  return cancelDownload();
});

// 应用启动后延迟检查更新
app.whenReady().then(() => {
  // 延迟 5 秒检查更新，避免影响启动速度
  setTimeout(() => {
    checkForUpdates();
  }, 5000);
});
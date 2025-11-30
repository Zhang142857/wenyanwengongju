const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');

// 保持对窗口对象的全局引用
let mainWindow = null;

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
  const appRoot = getAppPath();
  const outDir = path.join(appRoot, 'out');

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
app.whenReady().then(() => {
  // 处理自定义协议
  if (!isDev) {
    handleProtocol();
  }
  
  createWindow();

  // macOS 特殊处理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
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

// IPC 通信处理（预留）
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

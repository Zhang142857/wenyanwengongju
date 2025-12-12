# 自动更新系统开发者指南

## 架构概述

自动更新系统由以下核心组件组成：

```
main/update/
├── types.ts              # 类型定义
├── constants.ts          # 常量配置
├── utils.ts              # 工具函数
├── config.ts             # 配置管理
├── downloadManager.ts    # 下载管理器
├── fileManager.ts        # 文件管理器
├── recoveryManager.ts    # 恢复管理器
├── updateManager.ts      # 更新管理器（主协调器）
├── errorHandler.ts       # 错误处理
├── advancedFeatures.ts   # 高级功能
├── ipcHandlers.ts        # IPC通信处理
├── preload.ts            # Preload脚本
└── index.ts              # 模块导出
```

## 组件说明

### UpdateManager

主协调器，负责整个更新流程的编排：

```typescript
import { getUpdateManager } from './update';

const updateManager = getUpdateManager();

// 初始化
await updateManager.initialize();

// 检查更新
const updateInfo = await updateManager.checkForUpdates();

// 开始更新
await updateManager.startUpdate();

// 取消更新
updateManager.cancelUpdate();
```

### DownloadManager

处理文件下载和哈希验证：

```typescript
import { DownloadManager } from './update';

const downloadManager = new DownloadManager();

// 下载文件
await downloadManager.download({
  url: 'https://example.com/update.zip',
  destination: '/path/to/file.zip',
  onProgress: (progress) => {
    console.log(`${progress.percentage}%`);
  }
});

// 验证哈希
const isValid = await downloadManager.verifyHash(filePath, expectedHash);
```

### FileManager

处理备份、解压和文件操作：

```typescript
import { FileManager } from './update';

const fileManager = new FileManager(userDataPath, appPath);

// 创建备份
const backupPath = await fileManager.createBackup('1.0.0');

// 解压更新包
await fileManager.extractUpdate(packagePath);

// 从备份恢复
await fileManager.restoreFromBackup(backupPath);

// 清理旧备份
await fileManager.cleanupBackups(7); // 7天前的备份
```

### RecoveryManager

处理更新失败后的恢复：

```typescript
import { RecoveryManager } from './update';

const recoveryManager = new RecoveryManager(userDataPath, appPath);

// 检查是否需要恢复
const needsRecovery = await recoveryManager.checkRecoveryNeeded();

// 执行恢复
await recoveryManager.performRecovery();

// 标记更新成功
await recoveryManager.markUpdateSuccessful();
```

## IPC通信

### 主进程设置

```typescript
import { initializeUpdateIPC } from './update';

// 在创建窗口后初始化
initializeUpdateIPC(mainWindow);
```

### 渲染进程使用

```typescript
// 检查更新
const result = await window.updateAPI.checkForUpdates();

// 开始更新
await window.updateAPI.startUpdate();

// 监听事件
const unsubscribe = window.updateAPI.onUpdateAvailable((data) => {
  console.log('Update available:', data.updateInfo);
});

// 取消订阅
unsubscribe();
```

## 事件

UpdateManager 发出以下事件：

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `initialized` | - | 更新系统初始化完成 |
| `update-available` | `UpdateInfo` | 发现新版本 |
| `download-progress` | `DownloadProgress` | 下载进度更新 |
| `update-complete` | - | 更新完成 |
| `error` | `UpdateError` | 发生错误 |
| `recovery-needed` | - | 需要恢复 |
| `recovery-complete` | - | 恢复完成 |
| `restart-countdown` | `number` | 重启倒计时 |

## 配置

```typescript
import { loadUpdateConfig, saveUpdateConfig, getUpdateConfig } from './update/config';

// 加载配置
const config = await loadUpdateConfig(userDataPath);

// 修改配置
await saveUpdateConfig(userDataPath, {
  autoCheck: false,
  checkInterval: 8 * 60 * 60 * 1000 // 8小时
});

// 获取当前配置
const currentConfig = getUpdateConfig();
```

## 测试

### 运行测试

```bash
# 运行所有更新系统测试
npm test -- --run main/update

# 运行特定测试文件
npm test -- --run main/update/__tests__/downloadManager.property.test.ts
```

### 使用Mock服务

```typescript
import { createMockService } from './update/__tests__/mockUpdateService';

const mockService = await createMockService({
  port: 3456,
  version: '2.0.0',
  changelog: '- Bug fixes'
});

// 创建模拟更新包
await mockService.createMockPackage(tempDir);

// 停止服务
await mockService.stop();
```

## 部署要求

### 更新服务API

更新服务需要提供以下端点：

#### GET /api/check

返回最新版本信息：

```json
{
  "version": "2.0.0",
  "downloadUrl": "https://update.example.com/api/download",
  "fileHash": "sha256-hash-of-package",
  "changelog": "- Bug fixes\n- New features",
  "forceUpdate": false,
  "packageSize": 10485760
}
```

#### GET /api/download

返回更新包文件（ZIP格式）。

### 更新包结构

更新包应为ZIP格式，包含完整的应用程序文件：

```
update-2.0.0.zip
├── app.exe
├── resources/
│   └── app.asar
└── ...
```

## 安全考虑

1. **HTTPS**: 所有通信必须使用HTTPS
2. **哈希验证**: 使用SHA256验证下载文件完整性
3. **原子更新**: 更新要么完全成功，要么完全回滚
4. **备份保护**: 更新前自动创建备份
5. **路径验证**: ZIP解压时验证文件路径，防止路径遍历攻击

## 错误处理

错误分为以下类型：

| 类型 | 说明 | 可恢复 |
|------|------|--------|
| `network` | 网络错误 | 是 |
| `disk_space` | 磁盘空间不足 | 是 |
| `permissions` | 权限错误 | 是 |
| `corruption` | 文件损坏 | 是 |
| `system` | 系统错误 | 视情况 |

```typescript
import { ErrorHandler } from './update';

const errorHandler = new ErrorHandler(userDataPath);

// 分类错误
const type = errorHandler.classifyError(error);

// 获取用户友好消息
const message = errorHandler.createUserMessage(error);

// 获取可操作步骤
const steps = errorHandler.getActionableSteps(error);

// 记录错误日志
await errorHandler.logError(error);
```

## 性能优化

1. **后台检查**: 更新检查在后台进行，不阻塞UI
2. **流式下载**: 大文件使用流式下载，控制内存使用
3. **增量进度**: UI每100ms更新一次，平衡响应性和性能
4. **异步清理**: 旧备份异步删除
5. **流式哈希**: SHA256使用流式计算，支持大文件

# 配置文件系统说明

## 概述

新的配置文件系统采用 **config/temp 双目录机制**，实现配置的长期存储和运行时热更新。

## 目录结构

```
程序目录/
├── config/                    # 长期配置目录（用户可直接操作）
│   ├── app-config.json       # 应用配置
│   ├── libraries.json        # 库数据
│   └── README.md             # 配置说明
├── temp/                      # 运行时配置目录
│   ├── app-config.json       # 运行时配置副本
│   └── libraries.json        # 运行时库数据副本
└── cache/                     # 缓存目录
    └── backgrounds/          # 背景媒体缓存
```

## 工作原理

### 1. 程序启动

```
config/ ──复制──> temp/
```

程序启动时，配置管理器会：
1. 检查 config 目录是否存在，不存在则创建
2. 检查配置文件是否存在，不存在则创建默认配置
3. 将 config 目录的配置复制到 temp 目录
4. 启动文件监听

### 2. 运行时读取

```
程序 <──读取── temp/
```

程序运行时始终从 temp 目录读取配置，确保读取速度和稳定性。

### 3. 外部修改配置

```
用户修改 config/ ──检测──> 自动同步到 temp/ ──通知──> 程序更新
```

当用户直接修改 config 目录的配置文件时：
1. 文件监听器检测到变化
2. 验证 JSON 格式
3. 复制到 temp 目录
4. 通知前端更新

### 4. 程序内修改配置

```
程序修改 ──同时保存──> config/ + temp/
```

当用户在程序设置页面修改配置时：
1. 同时保存到 config 和 temp 目录
2. 通知所有监听器

## 配置文件说明

### app-config.json

应用主配置文件，包含：

```json
{
  "schemaVersion": 2,           // 配置版本
  "version": "1.0.0",           // 应用版本
  "edition": "custom",          // 版本类型
  "ai": {                       // AI 配置
    "configGroups": [...],      // API 配置组
    "activeGroupId": "...",     // 当前激活的配置组
    "concurrency": {...}        // 并发设置
  },
  "libraries": {                // 库配置
    "focusWords": "...",        // 重点字
    "keyCharacters": [...]      // 用户添加的重点字
  },
  "system": {                   // 系统设置
    "appTitle": "...",          // 应用标题
    "theme": "...",             // 主题
    "backgroundSettings": {...} // 背景设置
  },
  "features": {...},            // 功能开关
  "tourPlayedRecord": {...}     // 教程播放记录
}
```

### libraries.json

库数据文件，包含：

```json
{
  "libraries": [...],                    // 文章库
  "quotes": [...],                       // 引用
  "definitions": [...],                  // 义项
  "translations": [...],                 // 翻译
  "characterDefinitionLinks": [...],     // 字-义项关联
  "sentenceTranslationLinks": [...],     // 句子-翻译关联
  "shortSentences": [...],               // 短句
  "keyCharacters": [...]                 // 重点字
}
```

## API 说明

### 主进程 API (configManager.js)

```javascript
const { configManager } = require('./configManager');

// 初始化
await configManager.initialize();

// 读取配置
const appConfig = configManager.getAppConfig();
const libraries = configManager.getLibraries();

// 保存配置
configManager.saveAppConfig(config);
configManager.saveLibraries(libraries);

// 获取目录信息
const dirs = configManager.getDirectoryInfo();

// 添加监听器
const unsubscribe = configManager.addListener('app-config.json', (data) => {
  console.log('配置已更新:', data);
});
```

### 渲染进程 API (configBridge.ts)

```typescript
import { configBridge } from '@/services/configBridge';

// 初始化
const config = await configBridge.initialize();

// 读取配置
const config = await configBridge.getConfig();
const libraries = await configBridge.getLibraries();

// 保存配置
await configBridge.saveConfig(config);
await configBridge.saveLibraries(libraries);

// 获取目录信息
const dirs = await configBridge.getDirectoryInfo();

// 打开配置目录
await configBridge.openConfigDirectory();

// 监听配置变化
const unsubscribe = configBridge.onChange((newConfig) => {
  console.log('配置已更新:', newConfig);
});
```

### IPC 通道

| 通道名 | 说明 |
|--------|------|
| `get-config-directories` | 获取配置目录信息 |
| `config-get-app-config` | 读取应用配置 |
| `config-save-app-config` | 保存应用配置 |
| `config-get-libraries` | 读取库数据 |
| `config-save-libraries` | 保存库数据 |
| `config-read` | 读取任意配置文件 |
| `config-save` | 保存任意配置文件 |
| `config-clear-cache` | 清理缓存 |
| `open-config-directory` | 打开配置目录 |

## 数据迁移

首次运行新版本时，配置管理器会自动从旧位置（%APPDATA%）迁移数据：

1. 检查 `config/.migrated` 标记文件
2. 如果不存在，执行迁移：
   - 迁移 `app-config.json`
   - 迁移 `classical-chinese-data.json` → `libraries.json`
   - 迁移背景媒体文件
3. 创建迁移标记文件

## 打包说明

electron-builder 配置中已添加 `extraResources`，会将 config 目录复制到安装目录：

```json
{
  "extraResources": [
    {
      "from": "config",
      "to": "../config",
      "filter": ["**/*"]
    }
  ]
}
```

## 注意事项

1. **不要手动编辑 temp 目录**：temp 目录的文件会被自动覆盖
2. **确保 JSON 格式正确**：修改配置文件时请验证 JSON 格式
3. **备份重要数据**：建议定期备份 config 目录
4. **权限问题**：确保程序对 config、temp、cache 目录有读写权限

# 远程配置指南

本文档说明如何使用远程配置功能。

## 概述

远程配置功能允许应用从远程服务器获取配置，支持：

- HTTP/HTTPS 协议获取配置
- 本地缓存机制
- 配置校验
- 自动刷新
- 条件请求 (ETag)

## 配置文件格式

```json
{
  "remoteConfig": {
    "enabled": true,
    "url": "https://your-domain.com/api/config",
    "refreshInterval": 3600000,
    "fallbackToLocal": true
  }
}
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enabled | boolean | false | 是否启用远程配置 |
| url | string | - | 远程配置 URL |
| refreshInterval | number | 3600000 | 刷新间隔 (毫秒) |
| fallbackToLocal | boolean | true | 网络失败时是否回退到本地缓存 |

## 使用方法

### 基本用法

```typescript
import { fetchRemoteConfig } from '@/services/remoteConfig';

const result = await fetchRemoteConfig({
  url: 'https://your-domain.com/api/config',
  refreshInterval: 3600000,
  fallbackToLocal: true
});

console.log(result.config); // 配置对象
console.log(result.fromCache); // 是否来自缓存
```

### 使用配置管理器

```typescript
import { RemoteConfigManager } from '@/services/remoteConfig';

const manager = new RemoteConfigManager({
  url: 'https://your-domain.com/api/config',
  refreshInterval: 3600000
});

// 添加配置更新监听器
const unsubscribe = manager.addListener((config) => {
  console.log('配置已更新:', config);
});

// 启动自动刷新
manager.startAutoRefresh();

// 手动获取配置
const config = await manager.getConfig();

// 清理
manager.destroy();
```

## 配置校验

远程配置必须包含以下必需字段：

- `schemaVersion` (number) - 配置模式版本
- `version` (string) - 配置版本号

如果包含 `ai.apiConfigs`，每个配置项必须包含：
- `provider` (string) - API 提供商
- `baseUrl` (string) - API 基础 URL

## 缓存机制

- 配置会自动缓存到 localStorage
- 缓存包含配置数据、时间戳和 ETag
- 在刷新间隔内会直接使用缓存
- 支持 ETag 条件请求，减少不必要的数据传输

## 错误处理

- 网络错误时会自动回退到本地缓存（如果启用）
- 配置校验失败会抛出错误
- 超时默认 10 秒

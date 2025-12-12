# 配置相关 API 接口文档

## 概述

本文档描述了应用更新服务中与配置管理相关的 API 接口。

**基础 URL**: `https://update.156658.xyz`

---

## 接口列表

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/config/upload` | POST | 上传用户配置 |
| `/api/callback` | POST | 回调通知 |
| `/api/config/:userId` | GET | 获取用户配置 |
| `/api/config/:userId/history` | GET | 获取配置历史 |

---

## 1. 配置上传接口

**接口**: `POST /api/config/upload`

**说明**: 客户端上传用户配置到服务器

### 请求头

```
Content-Type: application/json
Authorization: Bearer <token>  (可选)
```

### 请求体

```json
{
  "timestamp": "2025-12-07T10:00:00.000Z",
  "appVersion": "1.0.1",
  "userId": "user123",
  "config": {
    "version": "1.0.1",
    "schemaVersion": 1,
    "ai": {
      "apiConfigs": [
        {
          "provider": "openai",
          "baseUrl": "https://api.openai.com/v1",
          "apiKey": "",
          "model": "gpt-4"
        }
      ],
      "concurrency": {
        "maxConcurrent": 3,
        "delayBetweenRequests": 100
      }
    },
    "libraries": {
      "defaultLibraries": ["lib1", "lib2"],
      "focusWords": "重点词汇",
      "keyCharacters": ["字1", "字2"]
    },
    "system": {
      "appTitle": "文言文小工具",
      "theme": "gradient"
    },
    "features": {
      "enableAIOrganize": true
    }
  },
  "libraries": {
    "libraryCount": 5,
    "definitionCount": 1000
  }
}
```

### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `timestamp` | string | 否 | ISO 8601 格式时间戳 |
| `appVersion` | string | 是 | 应用版本号 |
| `userId` | string | 是 | 用户唯一标识 |
| `config` | object | 否 | 用户配置对象 |
| `libraries` | object | 否 | 库统计信息 |

### 成功响应 (200)

```json
{
  "success": true,
  "message": "配置已保存",
  "key": "configs/user123/1.0.1-1733569200000.json",
  "timestamp": "2025-12-07T10:00:00.000Z"
}
```

### 错误响应

**400 Bad Request**

```json
{
  "success": false,
  "error": "缺少必要参数: userId, appVersion"
}
```

**500 Internal Server Error**

```json
{
  "success": false,
  "error": "配置保存失败"
}
```

### 示例

**cURL**

```bash
curl -X POST https://update.156658.xyz/api/config/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "timestamp": "2025-12-07T10:00:00.000Z",
    "appVersion": "1.0.1",
    "userId": "user123",
    "config": {
      "version": "1.0.1",
      "system": {
        "theme": "dark"
      }
    },
    "libraries": {
      "libraryCount": 5,
      "definitionCount": 1000
    }
  }'
```

**JavaScript**

```javascript
async function uploadConfig(userId, config, libraries) {
  const response = await fetch('https://update.156658.xyz/api/config/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-token'
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      appVersion: '1.0.1',
      userId,
      config,
      libraries
    })
  });
  
  return response.json();
}
```

**Electron (Node.js)**

```javascript
const https = require('https');

function uploadConfig(userId, config, libraries, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      timestamp: new Date().toISOString(),
      appVersion: app.getVersion(),
      userId,
      config,
      libraries
    });

    const options = {
      hostname: 'update.156658.xyz',
      port: 443,
      path: '/api/config/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
```

---

## 2. 回调通知接口

**接口**: `POST /api/callback`

**说明**: 客户端操作完成后的回调通知

### 请求头

```
Content-Type: application/json
```

### 请求体

**成功回调**

```json
{
  "success": true,
  "timestamp": "2025-12-07T10:00:00.000Z",
  "appVersion": "1.0.1",
  "userId": "user123",
  "action": "config-upload"
}
```

**失败回调**

```json
{
  "success": false,
  "error": "网络连接失败",
  "timestamp": "2025-12-07T10:00:00.000Z",
  "appVersion": "1.0.1",
  "userId": "user123",
  "action": "config-upload"
}
```

### 参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `success` | boolean | 是 | 操作是否成功 |
| `error` | string | 否 | 错误信息（失败时） |
| `timestamp` | string | 否 | ISO 8601 格式时间戳 |
| `appVersion` | string | 否 | 应用版本号 |
| `userId` | string | 否 | 用户唯一标识 |
| `action` | string | 否 | 操作类型 |

### 成功响应 (200)

```json
{
  "received": true,
  "timestamp": "2025-12-07T10:00:00.000Z"
}
```

### 示例

**cURL**

```bash
curl -X POST https://update.156658.xyz/api/callback \
  -H "Content-Type: application/json" \
  -d '{
    "success": true,
    "timestamp": "2025-12-07T10:00:00.000Z",
    "appVersion": "1.0.1",
    "userId": "user123",
    "action": "config-upload"
  }'
```

**JavaScript**

```javascript
async function sendCallback(success, error = null, action = 'unknown') {
  const response = await fetch('https://update.156658.xyz/api/callback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success,
      error,
      timestamp: new Date().toISOString(),
      appVersion: '1.0.1',
      userId: 'user123',
      action
    })
  });
  
  return response.json();
}
```

---

## 3. 获取用户配置

**接口**: `GET /api/config/:userId`

**说明**: 获取用户最新配置

### 请求头

```
Authorization: Bearer <token>
```

### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `userId` | string | 用户唯一标识 |

### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "appVersion": "1.0.1",
    "config": {
      "version": "1.0.1",
      "system": {
        "theme": "dark"
      }
    },
    "libraries": {
      "libraryCount": 5,
      "definitionCount": 1000
    },
    "uploadedAt": "2025-12-07T10:00:00.000Z"
  }
}
```

### 错误响应

**401 Unauthorized**

```json
{
  "success": false,
  "error": "需要认证"
}
```

**404 Not Found**

```json
{
  "success": false,
  "error": "配置不存在"
}
```

### 示例

**cURL**

```bash
curl https://update.156658.xyz/api/config/user123 \
  -H "Authorization: Bearer your-token"
```

**JavaScript**

```javascript
async function getConfig(userId, token) {
  const response = await fetch(`https://update.156658.xyz/api/config/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
}
```

---

## 4. 获取配置历史

**接口**: `GET /api/config/:userId/history`

**说明**: 获取用户配置上传历史

### 请求头

```
Authorization: Bearer <token>
```

### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `userId` | string | 用户唯一标识 |

### 成功响应 (200)

```json
{
  "success": true,
  "count": 3,
  "history": [
    {
      "key": "configs/user123/1.0.1-1733569200000.json",
      "uploaded": "2025-12-07T10:00:00.000Z",
      "size": 1234,
      "appVersion": "1.0.1"
    },
    {
      "key": "configs/user123/1.0.0-1733482800000.json",
      "uploaded": "2025-12-06T10:00:00.000Z",
      "size": 1100,
      "appVersion": "1.0.0"
    }
  ]
}
```

### 示例

**cURL**

```bash
curl https://update.156658.xyz/api/config/user123/history \
  -H "Authorization: Bearer your-token"
```

---

## 客户端集成示例

### Electron 主进程

```javascript
// main/configUploader.js
const { app } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'update.156658.xyz';

class ConfigUploader {
  constructor(userId, token) {
    this.userId = userId;
    this.token = token;
  }

  async uploadConfig() {
    try {
      // 读取本地配置
      const configPath = path.join(app.getPath('userData'), 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // 读取库统计
      const libraries = await this.getLibraryStats();

      // 上传配置
      const result = await this.sendRequest('/api/config/upload', {
        timestamp: new Date().toISOString(),
        appVersion: app.getVersion(),
        userId: this.userId,
        config,
        libraries
      });

      // 发送回调
      await this.sendCallback(true, null, 'config-upload');

      return result;

    } catch (error) {
      // 发送失败回调
      await this.sendCallback(false, error.message, 'config-upload');
      throw error;
    }
  }

  async getLibraryStats() {
    // 实现获取库统计的逻辑
    return {
      libraryCount: 5,
      definitionCount: 1000
    };
  }

  sendRequest(path, data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);

      const options = {
        hostname: API_URL,
        port: 443,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${this.token}`
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid response'));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async sendCallback(success, error, action) {
    try {
      await this.sendRequest('/api/callback', {
        success,
        error,
        timestamp: new Date().toISOString(),
        appVersion: app.getVersion(),
        userId: this.userId,
        action
      });
    } catch (e) {
      console.error('Callback failed:', e);
    }
  }
}

module.exports = ConfigUploader;
```

### 启动参数处理

```javascript
// main/index.js
const { app } = require('electron');
const ConfigUploader = require('./configUploader');

// 解析启动参数
const args = process.argv.slice(2);
const params = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    params[key] = value || true;
  }
});

// 处理配置上传
if (params['upload-config']) {
  const uploader = new ConfigUploader(
    params['user-id'] || 'anonymous',
    params['token'] || ''
  );

  uploader.uploadConfig()
    .then(result => {
      console.log('Config uploaded:', result);
      if (params['silent']) {
        app.quit();
      }
    })
    .catch(error => {
      console.error('Upload failed:', error);
      if (params['silent']) {
        app.quit();
      }
    });
}
```

---

## 安全注意事项

1. **敏感数据**
   - 上传的配置可能包含 API 密钥
   - 服务端已加密存储
   - 建议客户端在上传前移除敏感字段

2. **认证**
   - 建议使用 `Authorization` 头传递 token
   - 获取配置接口需要认证

3. **HTTPS**
   - 所有接口都使用 HTTPS
   - 确保客户端验证 SSL 证书

4. **数据量**
   - 配置数据限制在 10MB 以内
   - 库数据默认只上传统计信息

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 更新日志

### 2025-12-07

- 新增配置上传接口
- 新增回调通知接口
- 新增获取配置接口
- 新增配置历史接口

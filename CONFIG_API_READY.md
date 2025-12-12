# ✅ 配置 API 已部署

服务端已更新，支持你的 APP 端新功能。

---

## 🎯 新增接口

### 1. 配置上传接口

```
POST https://update.156658.xyz/api/config/upload
```

**请求示例：**

```json
{
  "timestamp": "2025-12-07T10:00:00.000Z",
  "appVersion": "1.0.1",
  "userId": "user123",
  "config": {
    "version": "1.0.1",
    "ai": { ... },
    "libraries": { ... },
    "system": { ... }
  },
  "libraries": {
    "libraryCount": 5,
    "definitionCount": 1000
  }
}
```

**响应：**

```json
{
  "success": true,
  "message": "配置已保存",
  "key": "configs/user123/1.0.1-1733569200000.json",
  "timestamp": "2025-12-07T10:00:00.000Z"
}
```

### 2. 回调通知接口

```
POST https://update.156658.xyz/api/callback
```

**请求示例：**

```json
{
  "success": true,
  "timestamp": "2025-12-07T10:00:00.000Z",
  "appVersion": "1.0.1",
  "userId": "user123",
  "action": "config-upload"
}
```

**响应：**

```json
{
  "received": true,
  "timestamp": "2025-12-07T10:00:00.000Z"
}
```

### 3. 获取用户配置

```
GET https://update.156658.xyz/api/config/:userId
Authorization: Bearer <token>
```

### 4. 获取配置历史

```
GET https://update.156658.xyz/api/config/:userId/history
Authorization: Bearer <token>
```

---

## 📋 APP 端集成

### 启动参数

你的 APP 支持的启动参数：

```
--upload-config=<url>   上传配置到服务器
--post-update           标记更新后首次启动
--silent                静默模式
--action=<action>       执行特定操作
--callback-url=<url>    操作完成后回调
--user-id=<id>          用户标识
--token=<token>         认证令牌
```

### 配置上传示例

```javascript
// 在 Electron 主进程中
const https = require('https');

async function uploadConfig(userId, config, libraries, token) {
  const data = JSON.stringify({
    timestamp: new Date().toISOString(),
    appVersion: app.getVersion(),
    userId,
    config,
    libraries
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'update.156658.xyz',
      port: 443,
      path: '/api/config/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
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

### 回调通知示例

```javascript
async function sendCallback(success, error, action, userId) {
  const data = JSON.stringify({
    success,
    error,
    timestamp: new Date().toISOString(),
    appVersion: app.getVersion(),
    userId,
    action
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'update.156658.xyz',
      port: 443,
      path: '/api/callback',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
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

## 🔧 NSIS 安装后启动

在 electron-builder 配置中：

```json
{
  "nsis": {
    "runAfterFinish": true
  }
}
```

或自定义 NSIS 脚本：

```nsis
ExecShell "" "$INSTDIR\文言文工具.exe" "--post-update --upload-config=https://update.156658.xyz/api/config/upload --user-id=user123"
```

---

## 📊 数据存储

配置数据存储在 Cloudflare R2：

```
configs/
├── user123/
│   ├── latest.json           # 最新配置
│   ├── 1.0.1-1733569200000.json  # 历史版本
│   └── 1.0.0-1733482800000.json
├── user456/
│   └── ...
```

---

## 🔐 安全措施

✅ **HTTPS 加密** - 所有通信加密  
✅ **Token 认证** - 可选的 Bearer Token  
✅ **数据隔离** - 按用户 ID 隔离存储  
✅ **敏感数据** - 不存储完整 Token  

---

## 🧪 测试接口

### 测试配置上传

```bash
curl -X POST https://update.156658.xyz/api/config/upload \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-12-07T10:00:00.000Z",
    "appVersion": "1.0.1",
    "userId": "test-user",
    "config": {"test": true},
    "libraries": {"libraryCount": 1}
  }'
```

### 测试回调

```bash
curl -X POST https://update.156658.xyz/api/callback \
  -H "Content-Type: application/json" \
  -d '{
    "success": true,
    "userId": "test-user",
    "action": "test"
  }'
```

---

## 📚 完整文档

详细的 API 文档请查看：**API_CONFIG_ENDPOINTS.md**

---

## ✅ 部署状态

| 接口 | 状态 |
|------|------|
| `/api/config/upload` | ✅ 已部署 |
| `/api/callback` | ✅ 已部署 |
| `/api/config/:userId` | ✅ 已部署 |
| `/api/config/:userId/history` | ✅ 已部署 |

---

## 🎯 下一步

1. ✅ 服务端接口已部署
2. ⏭️ APP 端集成配置上传
3. ⏭️ 测试完整流程
4. ⏭️ 配置 NSIS 安装后启动

---

**服务端已准备就绪！** 🚀

现在可以在 APP 端调用这些接口了。

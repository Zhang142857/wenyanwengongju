# 更新配置系统说明

## 本次实现的功能

### 1. 配置补丁机制 (`main/updateConfig.js`)

**解决的问题**：发布新版本时，如何在不覆盖用户数据的情况下注入新配置？

**实现方案**：
- 在更新包中放置 `update-patch.json` 补丁文件
- 应用启动时自动检测并应用补丁
- 支持多种操作：添加、追加、合并、删除等
- 补丁应用后记录 ID，避免重复执行

**文件**：
- `main/updateConfig.js` - 补丁处理模块
- `update-patch.example.json` - 补丁文件示例

### 2. 启动参数系统 (`main/index.js`)

**解决的问题**：更新后如何自动执行特定操作（如上传配置到服务器）？

**实现方案**：
- 解析命令行启动参数
- 支持静默模式、配置上传、回调通知等
- 可在安装程序完成后自动触发

**支持的参数**：
```
--upload-config=<url>   上传配置到服务器
--post-update           标记更新后首次启动
--silent                静默模式（不显示窗口）
--action=<action>       执行特定操作
--callback-url=<url>    操作完成后回调
--user-id=<id>          用户标识
--token=<token>         认证令牌
```

### 3. 打包脚本更新 (`scripts/build-with-config.js`)

- 自动检测并复制 `update-patch.json` 到更新包
- 验证补丁文件格式

---

## 服务端需要支持的接口

### 1. 配置上传接口

**接口**：`POST /api/config/upload`

**请求头**：
```
Content-Type: application/json
Authorization: Bearer <token>  (可选)
```

**请求体**：
```json
{
  "timestamp": "2025-12-07T10:00:00.000Z",
  "appVersion": "1.0.1",
  "userId": "user123",
  "config": {
    "version": "1.0.1",
    "schemaVersion": 1,
    "ai": {
      "apiConfigs": [...],
      "concurrency": {...}
    },
    "libraries": {
      "defaultLibraries": [...],
      "focusWords": "...",
      "keyCharacters": [...]
    },
    "system": {
      "appTitle": "文言文小工具",
      "theme": "gradient",
      ...
    },
    "features": {
      "enableAIOrganize": true,
      ...
    }
  },
  "libraries": {
    "libraryCount": 5,
    "definitionCount": 1000
  }
}
```

**响应**：
```json
{
  "success": true,
  "message": "配置已保存"
}
```

**Node.js 示例**：
```javascript
const express = require('express');
const app = express();

app.use(express.json({ limit: '10mb' }));

app.post('/api/config/upload', (req, res) => {
  const { userId, appVersion, config, libraries, timestamp } = req.body;
  
  // 验证 token（可选）
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && !validateToken(token)) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  console.log(`[${timestamp}] 收到配置上传`);
  console.log(`  用户: ${userId}`);
  console.log(`  版本: ${appVersion}`);
  console.log(`  库数量: ${libraries?.libraryCount || 0}`);
  console.log(`  义项数量: ${libraries?.definitionCount || 0}`);
  
  // 保存到数据库
  saveUserConfig(userId, {
    appVersion,
    config,
    libraries,
    uploadedAt: timestamp
  });
  
  res.json({ success: true, message: '配置已保存' });
});
```

### 2. 回调通知接口

**接口**：`POST /api/callback`

**请求体**：
```json
{
  "success": true,
  "timestamp": "2025-12-07T10:00:00.000Z",
  "appVersion": "1.0.1",
  "userId": "user123"
}
```

或失败时：
```json
{
  "success": false,
  "error": "错误信息",
  "timestamp": "2025-12-07T10:00:00.000Z",
  "appVersion": "1.0.1",
  "userId": "user123"
}
```

**Node.js 示例**：
```javascript
app.post('/api/callback', (req, res) => {
  const { success, error, userId, appVersion, timestamp } = req.body;
  
  if (success) {
    console.log(`[${timestamp}] 用户 ${userId} 操作成功`);
  } else {
    console.error(`[${timestamp}] 用户 ${userId} 操作失败: ${error}`);
  }
  
  res.json({ received: true });
});
```

---

## 使用流程

### 发布新版本时添加配置

1. **创建补丁文件** `update-patch.json`：
```json
{
  "id": "patch-v1.0.1-20251207",
  "version": "1.0.1",
  "newVersion": "1.0.1",
  "description": "添加新 API 配置",
  "operations": [
    {
      "op": "append",
      "path": "ai.apiConfigs",
      "value": {
        "provider": "minimax",
        "baseUrl": "https://api.minimax.chat/v1",
        "apiKey": "",
        "model": "abab6.5s-chat"
      }
    }
  ]
}
```

2. **打包**：
```bash
npm run build:with-config
```

3. **发布更新**

### 更新后自动上传配置

在 electron-builder 配置中设置安装后启动参数：

```json
{
  "nsis": {
    "runAfterFinish": true
  }
}
```

或者通过自定义 NSIS 脚本传递参数：
```nsis
ExecShell "" "$INSTDIR\文言文工具.exe" "--post-update --upload-config=https://api.example.com/config"
```

---

## 安全注意事项

1. **敏感数据**：上传的配置可能包含 API 密钥，服务端应加密存储
2. **认证**：建议使用 `--token` 参数进行身份验证
3. **HTTPS**：生产环境必须使用 HTTPS
4. **数据量**：库数据可能很大，默认只上传统计信息

---

## 文件清单

| 文件 | 说明 |
|------|------|
| `main/updateConfig.js` | 配置补丁处理模块 |
| `main/index.js` | 主进程（含启动参数处理） |
| `scripts/build-with-config.js` | 打包脚本 |
| `update-patch.example.json` | 补丁文件示例 |
| `docs/CONFIG_UPDATE_GUIDE.md` | 详细使用文档 |
| `docs/UPDATE_CONFIG_SYSTEM.md` | 本文档 |

# 配置更新指南

## 概述

当发布新版本需要更新用户配置时（如添加新 API、新功能开关等），可以使用**配置补丁机制**，在不影响用户已有数据的情况下注入新配置。

## 工作原理

1. 在更新包的 `out/` 目录中放置 `update-patch.json` 文件
2. 用户更新后首次启动时，应用自动检测并应用补丁
3. 补丁应用后会记录到用户配置中，避免重复执行

## 补丁文件格式

```json
{
  "id": "patch-v1.0.1-20251207",
  "version": "1.0.1",
  "newVersion": "1.0.1",
  "description": "更新说明",
  "operations": [
    { "op": "操作类型", "path": "配置路径", "value": "值" }
  ]
}
```

## 支持的操作类型

### 1. `set` - 设置值（覆盖）

强制设置某个配置项，无论是否存在都会覆盖。

```json
{
  "op": "set",
  "path": "features.newFeature",
  "value": true
}
```

**适用场景**：更新系统配置、修复错误配置

### 2. `add` - 添加（仅当不存在时）

只有当配置项不存在时才添加，不会覆盖用户已有设置。

```json
{
  "op": "add",
  "path": "ai.newProvider",
  "value": {
    "enabled": false,
    "apiKey": ""
  }
}
```

**适用场景**：添加新功能的默认配置

### 3. `append` - 追加到数组

向数组末尾追加元素，不影响数组中已有的元素。

```json
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
```

**适用场景**：添加新的 API 配置、新的预设选项

### 4. `prepend` - 插入到数组开头

向数组开头插入元素。

```json
{
  "op": "prepend",
  "path": "ai.apiConfigs",
  "value": {
    "provider": "recommended",
    "baseUrl": "https://api.example.com",
    "apiKey": "",
    "model": "best-model"
  }
}
```

**适用场景**：添加推荐的配置到最前面

### 5. `merge` - 深度合并对象

将新值与现有对象深度合并，保留用户其他设置。

```json
{
  "op": "merge",
  "path": "system",
  "value": {
    "newSetting": "default-value",
    "anotherSetting": 123
  }
}
```

**适用场景**：向现有配置对象添加新字段

### 6. `delete` - 删除

删除某个配置项。

```json
{
  "op": "delete",
  "path": "deprecated.oldConfig"
}
```

**适用场景**：移除废弃的配置

## 使用步骤

### 1. 创建补丁文件

在项目根目录创建 `update-patch.json`：

```json
{
  "id": "patch-v1.0.1",
  "version": "1.0.1",
  "newVersion": "1.0.1",
  "description": "v1.0.1 更新：添加 MiniMax API 支持",
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

### 2. 修改打包脚本

在 `scripts/build-with-config.js` 中添加复制补丁文件的步骤：

```javascript
// 复制更新补丁文件（如果存在）
const patchSource = path.join(__dirname, '..', 'update-patch.json');
const patchDest = path.join(__dirname, '..', 'out', 'update-patch.json');
if (fs.existsSync(patchSource)) {
  fs.copyFileSync(patchSource, patchDest);
  console.log('✓ 更新补丁已复制');
}
```

### 3. 打包发布

```bash
npm run build:with-config
```

### 4. 用户更新后

- 应用启动时自动检测 `out/update-patch.json`
- 应用补丁操作到用户配置
- 记录补丁 ID 到 `_appliedPatches` 数组
- 用户数据保持不变

## 示例场景

### 场景 1：添加新的 AI 提供商

```json
{
  "id": "patch-add-minimax",
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

### 场景 2：启用新功能

```json
{
  "id": "patch-enable-feature",
  "operations": [
    {
      "op": "set",
      "path": "features.newExamMode",
      "value": true
    }
  ]
}
```

### 场景 3：更新并发配置

```json
{
  "id": "patch-update-concurrency",
  "operations": [
    {
      "op": "merge",
      "path": "ai.concurrency",
      "value": {
        "aiDefinitionConcurrency": 50,
        "newOption": true
      }
    }
  ]
}
```

### 场景 4：批量添加多个 API

```json
{
  "id": "patch-add-apis",
  "operations": [
    {
      "op": "append",
      "path": "ai.apiConfigs",
      "value": [
        {
          "provider": "provider1",
          "baseUrl": "https://api1.example.com",
          "apiKey": "",
          "model": "model1"
        },
        {
          "provider": "provider2",
          "baseUrl": "https://api2.example.com",
          "apiKey": "",
          "model": "model2"
        }
      ]
    }
  ]
}
```

## 注意事项

1. **补丁 ID 必须唯一**：相同 ID 的补丁只会执行一次
2. **路径使用点号分隔**：如 `ai.apiConfigs`、`system.theme`
3. **数组操作**：`append`/`prepend` 可以追加单个值或数组
4. **备份机制**：应用补丁前会自动备份用户配置
5. **测试建议**：发布前在测试环境验证补丁效果

## 调试

查看应用日志可以看到补丁应用过程：

```
🔍 发现更新补丁文件...
📦 应用配置补丁 v1.0.1...
   v1.0.1 更新：添加 MiniMax API 支持
  ✓ APPEND ai.apiConfigs
✓ 配置补丁应用完成
```

---

## 启动参数

应用支持通过启动参数触发特定操作，适用于更新后自动执行任务。

### 支持的参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--upload-config=<url>` | 上传配置到指定服务器 | `--upload-config=https://api.example.com/config` |
| `--post-update` | 标记更新后首次启动 | `--post-update` |
| `--silent` | 静默模式（不显示窗口） | `--silent` |
| `--action=<action>` | 执行特定操作 | `--action=upload-config` |
| `--callback-url=<url>` | 操作完成后回调 | `--callback-url=https://api.example.com/callback` |
| `--user-id=<id>` | 用户标识 | `--user-id=user123` |
| `--token=<token>` | 认证令牌 | `--token=abc123` |

### 支持的操作 (action)

| 操作 | 说明 |
|------|------|
| `upload-config` | 上传用户配置到服务器 |
| `clear-cache` | 清理应用缓存 |
| `reset-tour` | 重置引导状态 |
| `export-logs` | 导出日志（待实现） |

### 使用示例

#### 1. 更新后上传配置

```bash
# 更新后自动上传配置到服务器
"文言文工具.exe" --post-update --upload-config=https://api.example.com/config --user-id=user123 --token=secret
```

#### 2. 静默上传配置

```bash
# 静默模式，上传完成后自动退出
"文言文工具.exe" --silent --action=upload-config --upload-config=https://api.example.com/config
```

#### 3. 带回调的操作

```bash
# 执行操作后通知服务器
"文言文工具.exe" --action=clear-cache --callback-url=https://api.example.com/callback
```

### 在 NSIS 安装程序中配置

在 `package.json` 的 nsis 配置中添加：

```json
{
  "nsis": {
    "runAfterFinish": true,
    "installerSidebar": "build/installerSidebar.bmp"
  }
}
```

如果需要在安装后传递参数，可以创建自定义 NSIS 脚本。

### 服务端接收示例

服务端接收上传配置的示例（Node.js）：

```javascript
app.post('/api/config', (req, res) => {
  const { userId, appVersion, config, libraries, timestamp } = req.body;
  
  console.log(`收到配置上传: 用户=${userId}, 版本=${appVersion}`);
  console.log(`库数量: ${libraries?.libraryCount || 0}`);
  
  // 保存配置...
  
  res.json({ success: true });
});
```

### 上传数据格式

```json
{
  "timestamp": "2025-12-07T10:00:00.000Z",
  "appVersion": "1.0.1",
  "userId": "user123",
  "config": {
    "version": "1.0.1",
    "ai": { ... },
    "system": { ... }
  },
  "libraries": {
    "libraryCount": 5,
    "definitionCount": 1000
  }
}
```

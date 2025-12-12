# 📦 发布脚本说明

## 脚本列表

### 1. release-patch.js

**功能**: 自动化 PATCH 版本发布流程

**使用方法**:
```bash
npm run release:patch
```

**自动化步骤**:
1. 清理构建文件（dist, .next, out）
2. 构建 Next.js 应用
3. 打包 Electron 应用（Windows x64 + ia32）
4. 读取 CHANGELOG.md 中的更新说明
5. 自动上传到更新服务器
6. 自动更新服务端版本配置
7. 自动部署更新服务

**配置**:

编辑 `release-patch.js` 中的配置：

```javascript
const UPDATE_SERVER = {
  url: 'https://update.156658.xyz',  // 更新服务器地址
  apiKey: 'your-secret-api-key-here', // API 密钥
  platform: 'windows'                 // 平台
};
```

### 2. update-server-config.js

**功能**: 更新服务端版本配置

**使用方法**:
```bash
node scripts/update-server-config.js <version> <hash> <changelog>
```

**示例**:
```bash
node scripts/update-server-config.js 1.0.3 abc123def456 "修复bug"
```

**说明**:
- 自动修改 `update/src/handlers/updateCheck.js` 中的 VERSION_CONFIG
- 通常由 release-patch.js 自动调用，无需手动执行

### 3. build-with-config.js

**功能**: 带配置文件的打包

**使用方法**:
```bash
npm run build:with-config
```

**说明**:
- 验证配置文件
- 生成安装程序图片
- 构建并打包应用

---

## 配置说明

### 更新服务器配置

在 `release-patch.js` 中配置：

```javascript
const UPDATE_SERVER = {
  url: 'https://update.156658.xyz',
  apiKey: 'your-secret-api-key-here',
  platform: 'windows'
};
```

**参数说明**:
- `url`: 更新服务器地址
- `apiKey`: API 认证密钥（在 update/wrangler.toml 中配置）
- `platform`: 目标平台（windows/mac/linux）

### API 密钥

API 密钥在 `update/wrangler.toml` 中配置：

```toml
[env.production]
vars = { API_KEY = "your-secret-api-key-here" }
```

**重要**: 修改 API 密钥后需要：
1. 更新 `release-patch.js` 中的 `UPDATE_SERVER.apiKey`
2. 重新部署更新服务: `cd update && npm run deploy`

---

## 依赖

### Node.js 模块

- `form-data`: 用于文件上传
- `fs`: 文件系统操作
- `path`: 路径处理
- `child_process`: 执行命令
- `https/http`: HTTP 请求

### 安装依赖

```bash
npm install
```

---

## 故障排查

### 问题：上传失败

**可能原因**:
1. API 密钥错误
2. 网络连接问题
3. 文件过大（> 500MB）
4. 更新服务器未运行

**解决方法**:
```bash
# 1. 检查 API 密钥
# 编辑 release-patch.js，确认 UPDATE_SERVER.apiKey 正确

# 2. 测试服务器连接
curl https://update.156658.xyz/health

# 3. 手动上传
# 访问 https://update.156658.xyz/admin
```

### 问题：服务端配置更新失败

**可能原因**:
1. update 目录不存在
2. updateCheck.js 文件路径错误

**解决方法**:
```bash
# 手动更新配置
cd update
# 编辑 src/handlers/updateCheck.js
npm run deploy
```

### 问题：自动部署失败

**可能原因**:
1. Cloudflare 凭证未配置
2. wrangler 未安装

**解决方法**:
```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 手动部署
cd update
npm run deploy
```

---

## 最佳实践

### 1. 发布前检查

- ✅ 更新 package.json 中的版本号
- ✅ 更新 CHANGELOG.md
- ✅ 测试新功能
- ✅ 确认 API 密钥正确

### 2. 灰度发布

对于重大更新，建议使用灰度发布：

1. 首次发布设置 10%
2. 监控 24 小时
3. 逐步增加到 50%、100%

修改 `update/src/handlers/updateCheck.js`：

```javascript
{
  version: '1.0.3',
  rollout_percentage: 10  // 灰度 10%
}
```

### 3. 版本号规则

遵循语义化版本：

- **PATCH (x.y.Z)**: Bug 修复、小改进
- **MINOR (x.Y.z)**: 新功能、向后兼容
- **MAJOR (X.y.z)**: 重大更新、可能不兼容

### 4. 更新说明

在 CHANGELOG.md 中清晰描述：

```markdown
## [1.0.3] - 2024-12-07

### 新增
- 在右上角添加"检查更新"按钮

### 改进
- 优化更新检查逻辑

### 修复
- 修复某个 bug
```

---

## 快速参考

```bash
# 完整发布流程（推荐）
npm run release:patch

# 仅打包（不上传）
npm run build
npm run electron:build:win

# 手动更新服务端配置
node scripts/update-server-config.js 1.0.3 abc123 "更新说明"

# 手动部署更新服务
cd update
npm run deploy

# 测试更新服务
curl https://update.156658.xyz/health
curl "https://update.156658.xyz/api/update/check?current_version=1.0.0&platform=windows"
```

---

## 相关文档

- [发布新版本指南.md](../发布新版本指南.md) - 完整发布流程
- [打包命令.md](../打包命令.md) - 打包命令参考
- [update/README.md](../../update/README.md) - 更新服务文档
- [update/API_INTEGRATION.md](../../update/API_INTEGRATION.md) - API 对接文档

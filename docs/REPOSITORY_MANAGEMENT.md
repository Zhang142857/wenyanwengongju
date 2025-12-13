# 仓库管理指南

本项目维护两个仓库：私有仓库（客户版）和开源仓库（社区版）。

## 仓库结构

### 私有仓库（当前）
- **用途**：客户版本，包含预配置的 API 密钥
- **地址**：`github.com/Zhang142857/wenyanwengongju`
- **特点**：
  - 包含真实的 API 配置
  - 包含内部文档和打包脚本
  - 用于构建客户版安装包

### 开源仓库
- **用途**：社区版本，供开发者和用户自行配置使用
- **地址**：`github.com/YOUR_USERNAME/wenyanwen-tool`（需创建）
- **特点**：
  - 不包含任何 API 密钥
  - 使用示例配置文件
  - 文档更加详细，方便社区用户

## 文件差异

| 文件 | 私有仓库 | 开源仓库 |
|------|----------|----------|
| `config/app-config.json` | 真实配置 | 不包含 |
| `config.default.json` | 真实配置 | 不包含 |
| `config.example.json` | 示例 | 示例 |
| `README.md` | 简洁版 | 详细版 |
| `.gitignore` | 标准版 | 增强版（排除配置） |
| 内部文档（中文.md） | 包含 | 不包含 |
| 打包脚本（.bat） | 包含 | 不包含 |

## 同步流程

### 从私有仓库同步到开源仓库

```bash
# 在私有仓库目录下
node scripts/sync-to-opensource.js ../wenyanwen-opensource

# 进入开源仓库目录
cd ../wenyanwen-opensource

# 检查文件
git status
git diff

# 提交并推送
git add -A
git commit -m "sync: 同步最新代码"
git push origin main
```

### 同步脚本功能

`scripts/sync-to-opensource.js` 会自动：
1. 复制所有源代码
2. 排除敏感文件（API 密钥、内部文档）
3. 替换 README 为开源版本
4. 替换 .gitignore 为开源版本
5. 添加配置说明文档

## 发布流程

### 私有仓库发布（客户版）

```bash
# 1. 更新版本号
npm version patch  # 或 minor / major

# 2. 提交并推送
git add -A
git commit -m "release: vX.X.X"
git tag vX.X.X
git push origin main
git push origin vX.X.X

# 3. GitHub Actions 自动构建并发布
```

### 开源仓库发布（社区版）

```bash
# 1. 同步代码
node scripts/sync-to-opensource.js ../wenyanwen-opensource

# 2. 进入开源仓库
cd ../wenyanwen-opensource

# 3. 更新版本号（保持与私有仓库一致）
# 编辑 package.json

# 4. 提交并推送
git add -A
git commit -m "release: vX.X.X"
git tag vX.X.X
git push origin main
git push origin vX.X.X

# 5. GitHub Actions 自动构建并发布
```

## 敏感文件清单

以下文件包含敏感信息，**绝对不能**出现在开源仓库：

- `config/app-config.json` - 包含 API 密钥
- `config.default.json` - 包含 API 密钥
- `config-custom-*.json` - 自定义配置
- 任何包含 `sk-` 开头字符串的文件

## 检查清单

在同步到开源仓库前，请确认：

- [ ] 没有 API 密钥泄露
- [ ] 没有内部文档
- [ ] README 是开源版本
- [ ] .gitignore 排除了配置文件
- [ ] 配置说明文档完整

## 自动化建议

可以设置 GitHub Actions 自动同步：

```yaml
# .github/workflows/sync-opensource.yml
name: Sync to Opensource

on:
  push:
    tags:
      - 'v*'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run sync script
        run: node scripts/sync-to-opensource.js ./opensource-temp
      
      - name: Push to opensource repo
        uses: cpina/github-action-push-to-another-repository@main
        with:
          source-directory: './opensource-temp'
          destination-github-username: 'YOUR_USERNAME'
          destination-repository-name: 'wenyanwen-tool'
          target-branch: main
```

## 注意事项

1. **版本号同步**：两个仓库的版本号应保持一致
2. **功能同步**：新功能开发完成后及时同步到开源仓库
3. **安全检查**：每次同步前检查是否有敏感信息泄露
4. **文档更新**：开源仓库的文档应更加详细

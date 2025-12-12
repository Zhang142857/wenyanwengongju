# 📦 带预设配置的打包指南

本指南说明如何将你的配置和库数据打包到安装程序中，让用户安装后即可使用。

## 🎯 功能特点

- ✨ **美化的安装界面** - 渐变背景、动画效果
- 📦 **预设配置** - 包含你的 API 配置和所有库数据
- 🚀 **一键安装** - 用户安装后即可使用，无需额外配置
- 🎨 **自定义图标** - 自动生成安装程序图标和界面图片
- 📊 **安装统计** - 显示包含的库数量、义项数量等信息

## 📋 准备工作

### 1. 导出完整配置

1. 打开应用，进入 **设置页面**
2. 点击 **"💾 导出全部"** 按钮
3. 配置文件会保存到 `dist/config-custom-[时间戳].json`

### 2. 验证配置文件

确保配置文件包含以下内容：

```json
{
  "config": {
    "version": "1.0.0",
    "ai": { ... },
    "libraries": { ... },
    "system": { ... }
  },
  "libraries": {
    "libraries": [ ... ],
    "definitions": [ ... ],
    "characterDefinitionLinks": [ ... ]
  },
  "exportedAt": "2025-12-06T..."
}
```

## 🚀 开始打包

### 方法一：使用自动化脚本（推荐）

```bash
npm run build:with-config
```

这个命令会：
1. ✅ 检查配置文件是否存在
2. ✅ 验证配置文件格式
3. ✅ 生成安装程序图片资源
4. ✅ 构建 Next.js 应用
5. ✅ 复制配置文件到构建目录
6. ✅ 打包 Electron 应用
7. ✅ 生成安装程序

### 方法二：分步执行

```bash
# 1. 生成安装程序图片
npm run generate:images

# 2. 构建应用
npm run build

# 3. 手动复制配置文件
# 将 dist/config-custom-*.json 复制到 out/default-config.json

# 4. 打包
npm run electron:build:win
```

## 📦 输出文件

打包完成后，在 `dist/` 目录下会生成：

```
dist/
├── 文言文工具-1.0.0-x64-Setup.exe      # 64位安装程序
├── 文言文工具-1.0.0-ia32-Setup.exe     # 32位安装程序
└── 文言文工具-1.0.0-x64-Portable.exe   # 便携版（可选）
```

## 🎨 自定义安装界面

### 修改安装程序图片

如果你想自定义安装界面，可以替换以下文件：

```
build/
├── icon.ico              # 应用图标 (256x256)
├── installerHeader.bmp   # 安装程序顶部横幅 (150x57)
└── installerSidebar.bmp  # 安装程序侧边栏 (164x314)
```

### 修改安装程序文本

编辑 `build/installer.nsh` 文件：

```nsh
!define MUI_WELCOMEPAGE_TITLE "欢迎安装文言文工具"
!define MUI_WELCOMEPAGE_TEXT "这是一款专为教师设计的..."
```

## 🔧 高级配置

### 修改应用信息

编辑 `package.json` 中的 `build` 部分：

```json
{
  "build": {
    "appId": "com.wenyanwen.gongju",
    "productName": "文言文工具",
    "copyright": "Copyright © 2025"
  }
}
```

### 添加更多文件到安装包

编辑 `package.json`：

```json
{
  "build": {
    "files": [
      "main/**/*",
      "out/**/*",
      "public/**/*",
      "your-custom-files/**/*"
    ]
  }
}
```

## 📊 安装程序特性

### 用户体验

- ✅ 美化的欢迎界面
- ✅ 可选择安装路径
- ✅ 自动创建桌面快捷方式
- ✅ 自动创建开始菜单项
- ✅ 安装完成后可立即启动

### 首次运行

用户首次运行应用时：

1. 自动加载预设配置
2. 自动加载所有库数据
3. 显示加载统计信息
4. 无需任何额外配置即可使用

### 数据位置

- **配置文件**: `%APPDATA%/文言文工具/app-config.json`
- **库数据**: `%APPDATA%/文言文工具/classical-chinese-data.json`
- **初始化标记**: `%APPDATA%/文言文工具/.initialized`

## 🐛 故障排除

### 问题：找不到配置文件

**解决方案**：
1. 确保在 `dist/` 目录下有 `config-custom-*.json` 文件
2. 检查文件格式是否正确（必须是完整导出的 JSON）

### 问题：图片生成失败

**解决方案**：
```bash
# 手动安装依赖
npm install jimp png-to-ico --save-dev

# 重新生成图片
npm run generate:images
```

### 问题：打包失败

**解决方案**：
1. 清理旧的构建文件：
   ```bash
   rm -rf dist .next out
   ```
2. 重新安装依赖：
   ```bash
   npm install
   ```
3. 重新打包：
   ```bash
   npm run build:with-config
   ```

### 问题：安装后配置未加载

**检查步骤**：
1. 查看 `out/default-config.json` 是否存在
2. 检查主进程日志（开发者工具 Console）
3. 查看 `%APPDATA%/文言文工具/` 目录下的文件

## 📝 注意事项

1. **API Key 安全**：配置文件中包含 API Key，请注意保护
2. **文件大小**：包含库数据后，安装包会比较大（可能 100MB+）
3. **更新策略**：用户更新时不会覆盖已有的配置和数据
4. **兼容性**：支持 Windows 7/8/10/11

## 🎉 完成

打包完成后，你可以：

1. 测试安装程序
2. 分发给用户
3. 上传到网站或云盘

用户只需双击安装程序，即可获得一个预配置好的文言文工具！

---

**提示**：如果你需要更新配置，只需重新导出配置文件并重新打包即可。

# Inno Setup 安装程序指南

## 安装 Inno Setup

### 下载地址
https://jrsoftware.org/isdl.php

### 安装步骤
1. 下载 `innosetup-6.x.x.exe`
2. 运行安装程序
3. 安装时勾选 "Install Inno Setup Preprocessor"
4. 安装完成后，ISCC.exe 位于 `C:\Program Files (x86)\Inno Setup 6\`

## 使用方法

### 方法一：完整打包流程

```bash
npm run build:full-innosetup
```

这个命令会：
1. 构建 Next.js 应用
2. 打包 Electron 应用
3. 使用 Inno Setup 创建安装程序

### 方法二：仅创建安装程序

如果已经有 `dist/win-unpacked` 目录：

```bash
npm run build:innosetup
```

### 方法三：手动编译

```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" build\installer.iss
```

## 自定义安装程序

### 修改应用信息

编辑 `build/installer.iss`：

```iss
#define MyAppName "你的应用名称"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "发布者"
```

### 修改安装界面文字

在 `[Code]` 部分的 `InitializeWizard()` 函数中修改：

```pascal
WizardForm.WelcomeLabel1.Caption := '欢迎使用 你的应用';
WizardForm.WelcomeLabel2.Caption := '应用描述...';
```

### 修改向导图片

替换以下文件：
- `build/wizard-image.bmp` (164x314) - 左侧大图
- `build/wizard-small.bmp` (55x55) - 右上角小图

重新生成图片：
```bash
node build/generate-wizard-images.js
```

## 输出文件

打包完成后，安装程序位于：
```
dist/文言文工具-1.0.0-Setup.exe
```

## 常见问题

### Q: 提示找不到 ISCC.exe
A: 确保 Inno Setup 6 已正确安装，或设置环境变量 `INNO_SETUP_PATH`

### Q: 编译时提示找不到文件
A: 确保先运行 `npm run pack` 生成 `dist/win-unpacked` 目录

### Q: 安装程序太大
A: Inno Setup 使用 LZMA2 压缩，已经是最优压缩。如需更小，考虑排除不必要的文件。

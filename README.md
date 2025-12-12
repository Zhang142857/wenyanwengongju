# 文言文学习助手

[![Build and Release](https://github.com/Zhang142857/wenyanwengongju/actions/workflows/build-release.yml/badge.svg)](https://github.com/Zhang142857/wenyanwengongju/actions/workflows/build-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

面向教师和学生的文言文学习工具，集成文本导入、智能整理、AI辅助、自动出题等多项功能。

## 📥 下载安装

前往 [Releases](https://github.com/Zhang142857/wenyanwengongju/releases) 下载最新版本的安装包。

## 📚 文档导航

- **[用户指南](./USER_GUIDE.md)** - 完整的功能介绍和使用说明
- **[技术文档](./TECHNICAL_GUIDE.md)** - 详细的技术架构和实现细节
- **[贡献指南](./CONTRIBUTING.md)** - 如何参与项目开发
- **[更新日志](./CHANGELOG.md)** - 版本更新记录

## ✨ 核心功能

### 📥 导入与管理
- **文本导入**：支持纯文本和Word文档导入
- **智能分句**：自动识别文言文句子边界
- **层级管理**：库-集-文章三级结构
- **数据管理**：义项、短句、重点字管理

### 🎨 智能整理
- **思维导图**：可视化展示文章结构
- **AI辅助**：自动生成思维导图
- **手动编辑**：拖拽式编辑节点和关系
- **导出功能**：导出为图片或JSON

### 🤖 AI功能
- **AI生成义项**：批量生成字的义项解释
- **AI整理文章**：自动分析文章结构
- **正则生成器**：自然语言生成正则表达式
- **实时思考**：显示AI思考过程

### 📋 自动出题
- **多种题型**：同一个字/不同字题型
- **智能推荐**：根据数据推荐合适题型
- **灵活配置**：题目数量、选项数、短句数等
- **Word导出**：教师版/学生版/批量导出

### 🔍 搜索与查询
- **全局搜索**：搜索句子、义项、短句
- **高级筛选**：按库、类型筛选
- **实时过滤**：输入即搜索
- **高亮显示**：搜索结果高亮

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 配置
```bash
# 复制配置模板
cp config.example.json config.json

# 编辑配置文件，填入你的API密钥
```

### 开发模式
```bash
# Web版本
npm run dev

# Electron版本
npm run electron:dev
```

### 构建应用
```bash
# Web版本
npm run build

# Electron应用
npm run electron:build
```

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI框架**: React 18
- **桌面应用**: Electron
- **语言**: TypeScript
- **样式**: CSS Modules
- **测试**: Vitest
- **CI/CD**: GitHub Actions

## 📂 项目结构

```
├── src/                    # 源代码
│   ├── app/               # Next.js页面
│   ├── components/        # 可复用组件
│   ├── services/          # 业务逻辑
│   └── utils/             # 工具函数
├── main/                  # Electron主进程
├── tests/                 # 测试文件
│   ├── unit/             # 单元测试
│   ├── integration/      # 集成测试
│   └── fixtures/         # 测试数据
├── .github/               # GitHub配置
│   └── workflows/        # CI/CD工作流
└── config.example.json   # 配置模板
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

## 🔑 API配置

本应用需要配置AI API才能使用AI功能：

1. 复制 `config.example.json` 为 `config.json`
2. 填入你的API密钥和配置
3. 或在应用内进入"设置" → "API配置"进行配置

## 💻 系统要求

- **操作系统**: Windows 7/8/10/11
- **Node.js**: 18.x 或更高版本（开发）
- **内存**: 至少 2GB RAM
- **磁盘空间**: 至少 500MB

## 🤝 贡献

欢迎提交Issue和Pull Request！请先阅读 [贡献指南](./CONTRIBUTING.md)。

## 📄 许可证

[MIT License](./LICENSE)

## 📮 联系方式

如有问题或建议，请提交 [Issue](https://github.com/Zhang142857/wenyanwengongju/issues)。

---

**版本**: 1.2.0  
**最后更新**: 2024年12月

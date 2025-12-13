# 文言文学习助手 (开源版)

[![Build and Release](https://github.com/YOUR_USERNAME/wenyanwen-tool/actions/workflows/build-release.yml/badge.svg)](https://github.com/YOUR_USERNAME/wenyanwen-tool/actions/workflows/build-release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

面向教师和学生的文言文学习工具，集成文本导入、智能整理、AI辅助、自动出题等多项功能。

> 这是开源社区版本，需要自行配置 AI API 才能使用 AI 相关功能。

## 📥 下载安装

### 方式一：下载预编译版本
前往 [Releases](https://github.com/YOUR_USERNAME/wenyanwen-tool/releases) 下载最新版本的安装包。

### 方式二：从源码构建
```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/wenyanwen-tool.git
cd wenyanwen-tool

# 安装依赖
npm install

# 构建应用
npm run build
npm run electron:build
```

## ✨ 核心功能

### 📥 导入与管理
- **文本导入**：支持纯文本和Word文档导入
- **智能分句**：自动识别文言文句子边界
- **层级管理**：库-集-文章三级结构
- **数据管理**：义项、短句、重点字管理

### 🎨 智能整理
- **思维导图**：可视化展示文章结构
- **AI辅助**：自动生成思维导图（需配置API）
- **手动编辑**：拖拽式编辑节点和关系
- **导出功能**：导出为图片或JSON

### 🤖 AI功能（需配置API）
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

### 1. 安装依赖
```bash
npm install
```

### 2. 配置 API（可选，用于 AI 功能）

复制配置模板并编辑：
```bash
cp config.example.json config/app-config.json
```

编辑 `config/app-config.json`，填入你的 API 配置：
```json
{
  "ai": {
    "configGroups": [
      {
        "id": "default",
        "name": "默认配置",
        "provider": "openai",
        "baseUrl": "https://api.openai.com/v1",
        "apiKeys": ["your-api-key-here"],
        "model": "gpt-3.5-turbo"
      }
    ],
    "activeGroupId": "default"
  }
}
```

支持的 API 提供商：
- OpenAI / ChatGPT
- SiliconFlow（硅基流动）
- DeepSeek
- 其他兼容 OpenAI API 的服务

### 3. 开发模式
```bash
# Web版本
npm run dev

# Electron版本
npm run electron:dev
```

### 4. 构建应用
```bash
# Web版本
npm run build

# Electron应用（Windows）
npm run electron:build:win
```

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI框架**: React 18
- **桌面应用**: Electron
- **语言**: TypeScript
- **样式**: CSS Modules
- **状态管理**: Zustand
- **测试**: Vitest
- **CI/CD**: GitHub Actions

## 📂 项目结构

```
├── src/                    # 源代码
│   ├── app/               # Next.js 页面
│   ├── components/        # React 组件
│   ├── services/          # 业务逻辑服务
│   ├── stores/            # Zustand 状态管理
│   ├── types/             # TypeScript 类型定义
│   └── utils/             # 工具函数
├── main/                  # Electron 主进程
├── config/                # 配置文件目录
│   ├── libraries.json     # 示例文言文库
│   └── README.md          # 配置说明
├── tests/                 # 测试文件
├── public/                # 静态资源
├── .github/               # GitHub 配置
│   └── workflows/         # CI/CD 工作流
└── config.example.json    # 配置模板
```

## 🔑 API 配置说明

### 配置文件位置
- 开发时：`config/app-config.json`
- 安装后：`%APPDATA%/文言文查询/config/app-config.json`

### 配置项说明

| 字段 | 说明 |
|------|------|
| `provider` | API 提供商名称 |
| `baseUrl` | API 基础 URL |
| `apiKeys` | API 密钥数组（支持多个轮询） |
| `model` | 使用的模型名称 |
| `isThinkingModel` | 是否为思考模型（如 DeepSeek-R1） |
| `concurrency` | 并发配置 |

### 推荐的免费/低成本 API

1. **SiliconFlow（硅基流动）**
   - 注册送额度，部分模型免费
   - 支持多种开源模型
   - baseUrl: `https://api.siliconflow.cn/v1`

2. **DeepSeek**
   - 价格低廉
   - 中文效果好
   - baseUrl: `https://api.deepseek.com/v1`

## 🧪 测试

```bash
# 运行所有测试
npm test

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

## 💻 系统要求

- **操作系统**: Windows 7/8/10/11
- **Node.js**: 18.x 或更高版本（开发）
- **内存**: 至少 2GB RAM
- **磁盘空间**: 至少 500MB

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献流程
1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### 提交规范
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

## 📄 许可证

[MIT License](./LICENSE)

## 🙏 致谢

感谢所有贡献者和使用者的支持！

---

**版本**: 1.2.2  
**最后更新**: 2024年12月

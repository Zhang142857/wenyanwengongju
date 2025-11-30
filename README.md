# 文言文学习助手
 ZZQ制作

面向教师和学生的文言文学习工具，集成文本导入、智能整理、AI辅助、自动出题等多项功能。

## 📚 文档导航

- **[用户指南 (USER_GUIDE.md)](./USER_GUIDE.md)** - 完整的功能介绍和使用说明
- **[技术文档 (TECHNICAL_GUIDE.md)](./TECHNICAL_GUIDE.md)** - 详细的技术架构和实现细节
- **[其他指南](#其他指南)** - 导入、整理、出题等专项指南

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

### ⚙️ 系统设置
- **API配置**：支持多种AI模型
- **并发控制**：设置API并发数
- **数据备份**：导入导出JSON数据

## 🚀 快速开始

### 安装依赖
```bash
npm install
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
- **文档处理**: docx.js

## 📂 项目结构

```
src/
├── app/                    # Next.js页面
│   ├── page.tsx           # 首页
│   ├── import/            # 导入功能
│   ├── organize/          # 整理功能
│   ├── ai-organize/       # AI整理
│   ├── exam/              # 自动出题
│   ├── manage/            # 管理功能
│   └── regex-generator/   # 正则生成器
├── components/            # 可复用组件
├── services/             # 业务逻辑
└── tools/                # 工具函数
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

## 📖 其他指南

项目包含以下专项指南文档：

- **AI_ORGANIZE_GUIDE.md** - AI整理功能使用指南
- **AI_PROGRESS_GUIDE.md** - AI进度显示指南
- **EXAM_GUIDE.md** - 自动出题功能指南
- **IMPORT_GUIDE.md** - 文本导入指南
- **ORGANIZE_GUIDE.md** - 思维导图整理指南
- **MINIMAX_API_SETUP.md** - MiniMax API配置指南
- **MINIMAX_QUICK_START.md** - MiniMax快速开始
- **MULTI_API_GUIDE.md** - 多API配置指南

## 💻 系统要求

- **操作系统**: Windows 7/8/10/11, macOS, Linux
- **Node.js**: 16.x 或更高版本
- **内存**: 至少 2GB RAM
- **磁盘空间**: 至少 500MB

## 🔑 API配置

本应用需要配置AI API才能使用AI功能：

1. 进入"设置" → "API配置"
2. 选择API提供商（MiniMax/DeepSeek/自定义）
3. 输入API Key和相关配置
4. 点击"测试连接"验证配置

详见 [MINIMAX_API_SETUP.md](./MINIMAX_API_SETUP.md)

## 📝 开发规范

- 使用TypeScript严格模式
- 遵循ESLint规则
- 使用Prettier格式化代码
- 编写单元测试覆盖核心功能

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 📮 联系方式

如有问题或建议，请提交Issue或查看文档。

---

**版本**: 1.0.0  
**最后更新**: 2024年

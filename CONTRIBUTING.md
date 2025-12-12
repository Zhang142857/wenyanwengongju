# 贡献指南

感谢您对文言文小工具项目的关注！我们欢迎各种形式的贡献。

## 如何贡献

### 报告问题

1. 在提交新问题之前，请先搜索现有的 Issues
2. 使用清晰的标题描述问题
3. 提供详细的复现步骤
4. 包含相关的错误信息和截图

### 提交代码

1. Fork 本仓库
2. 创建功能分支: `git checkout -b feature/your-feature`
3. 提交更改: `git commit -m 'Add some feature'`
4. 推送分支: `git push origin feature/your-feature`
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 编写单元测试覆盖核心功能
- 保持代码简洁和可读性

### 提交信息规范

使用语义化的提交信息：

- `feat:` 新功能
- `fix:` 修复问题
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/Zhang142857/wenyanwengongju.git
cd wenyanwengongju

# 安装依赖
npm install

# 复制配置文件
cp config.example.json config.json

# 启动开发服务器
npm run dev

# 运行测试
npm test
```

## 项目结构

```
├── src/                # 源代码
│   ├── app/           # Next.js 页面
│   ├── components/    # React 组件
│   ├── services/      # 业务逻辑
│   └── utils/         # 工具函数
├── main/              # Electron 主进程
├── tests/             # 测试文件
├── docs/              # 文档
└── .github/           # GitHub 配置
```

## 许可证

通过贡献代码，您同意您的贡献将按照 MIT 许可证进行授权。

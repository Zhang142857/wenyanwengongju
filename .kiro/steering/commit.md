# Git 提交规范

## Commit Message 格式
```
<type>: <description>
```

## Type 类型
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关
- `release`: 版本发布

## 示例
```
feat: 添加文章权重编辑器
fix: 修复搜索结果导出问题
docs: 更新 README
release: v1.2.2
```

## 分支策略
- `main`: 主分支，保持稳定
- 功能开发在本地完成后直接推送到 main

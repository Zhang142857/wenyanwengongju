# 开发规范

## 本地开发
```bash
npm run dev          # 启动 Next.js 开发服务器
npm run electron:dev # 启动 Electron 开发模式
npm test             # 运行测试
```

## 构建命令
```bash
npm run build              # 构建 Next.js
npm run electron:build     # 构建 Electron 应用
npm run electron:build:win # 构建 Windows 安装包
```

## 组件开发规范
- 组件文件使用 PascalCase 命名
- 样式文件与组件同名，使用 `.module.css`
- Props 类型定义在组件文件顶部
- 使用函数组件 + Hooks

## 服务层规范
- 服务文件放在 `src/services/`
- 使用 camelCase 命名
- 导出纯函数或类

## 测试规范
- 测试文件使用 `.test.ts` 或 `.test.tsx`
- 放在对应文件同目录或 `__tests__` 目录
- 使用 Vitest 框架

# 文言文小工具项目规范

## 项目概述
这是一个面向教师的文言文字词查询工具，使用 Electron + Next.js 构建。

## 技术栈
- **前端框架**: Next.js 14 + React 18
- **桌面框架**: Electron
- **状态管理**: Zustand
- **样式**: CSS Modules
- **测试**: Vitest
- **构建**: electron-builder

## 目录结构
- `src/app/` - Next.js 页面
- `src/components/` - React 组件
- `src/services/` - 业务逻辑服务
- `src/stores/` - Zustand 状态管理
- `src/types/` - TypeScript 类型定义
- `main/` - Electron 主进程代码
- `public/` - 静态资源
- `config/` - 配置文件

## 代码规范
- 使用 TypeScript 编写所有代码
- 组件使用 `.tsx` 扩展名
- 样式使用 CSS Modules (`.module.css`)
- 每个组件一个文件夹或单独文件

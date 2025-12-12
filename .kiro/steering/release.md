# 发布流程规范

## 版本号规则
使用语义化版本 (SemVer): `主版本.次版本.修订版本`
- 主版本: 不兼容的 API 变更
- 次版本: 向下兼容的功能新增
- 修订版本: 向下兼容的问题修复

## 发布步骤
1. 更新 `package.json` 中的 version 字段
2. 提交所有代码: `git add -A && git commit -m "release: vX.X.X"`
3. 创建 tag: `git tag vX.X.X`
4. 推送代码和 tag: `git push origin main && git push origin vX.X.X`
5. GitHub Actions 自动构建并发布到 Releases

## GitHub Actions 触发条件
- push 到 main 分支: 仅构建，不发布
- push tag (v*): 构建并发布到 Releases
- workflow_dispatch: 手动触发构建

## 构建产物
- Windows 安装包 (x64, ia32)
- 发布到 GitHub Releases

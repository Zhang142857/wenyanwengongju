@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   📦 发布新版本 v1.0.3
echo ========================================
echo.
echo 当前操作：
echo   1. 清理构建文件
echo   2. 构建 Next.js 应用
echo   3. 打包 Electron 应用
echo   4. 生成安装程序
echo.
echo 预计耗时：5-10 分钟
echo.
pause

npm run release:patch

echo.
echo ========================================
echo   ✅ 打包完成！
echo ========================================
echo.
echo 📝 下一步操作：
echo   1. 测试安装程序
echo   2. 访问 https://update.156658.xyz/admin
echo   3. 上传新版本
echo.
pause

@echo off
chcp 65001 >nul
title 文言文工具 - Inno Setup 打包

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║           文言文工具 - Inno Setup 安装程序打包               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

:: 显示选项
echo 请选择打包方式：
echo.
echo   [1] 仅生成 Inno Setup 安装程序（需要先运行过 npm run pack）
echo   [2] 完整打包（构建 + 打包 + 生成安装程序）
echo   [3] 退出
echo.

set /p choice=请输入选项 (1/2/3): 

if "%choice%"=="1" goto innosetup_only
if "%choice%"=="2" goto full_build
if "%choice%"=="3" goto end
goto invalid

:innosetup_only
echo.
echo [开始] 生成 Inno Setup 安装程序...
echo.
call npm run build:innosetup
if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败！
    pause
    exit /b 1
)
goto success

:full_build
echo.
echo [开始] 完整打包流程...
echo 这可能需要几分钟时间，请耐心等待...
echo.
call npm run build:full-innosetup
if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败！
    pause
    exit /b 1
)
goto success

:invalid
echo.
echo [错误] 无效的选项，请重新运行
pause
exit /b 1

:success
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                      打包完成！                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 安装程序位于 dist 目录
echo.

:: 打开 dist 目录
explorer dist

pause
exit /b 0

:end
echo.
echo 已取消
exit /b 0

@echo off
chcp 65001 >nul
title 前端服务 - 职业规划智能体
cd /d "%~dp0"

if not exist "frontfiles\index.html" (
    echo [错误] 未找到 frontfiles\index.html，请确保在项目根目录运行本脚本。
    pause
    exit /b 1
)

echo ========================================
echo   职业规划智能体 - 前端服务
echo ========================================
echo.
echo 正在启动，请稍候...
echo.

cd frontfiles
set PORT=8888

where python >nul 2>&1
if %errorlevel% equ 0 (
    echo 使用: python -m http.server %PORT% --bind 127.0.0.1
    echo.
    echo 启动成功后，在浏览器打开: http://127.0.0.1:%PORT%
    echo 按 Ctrl+C 可停止服务
    echo ========================================
    python -m http.server %PORT% --bind 127.0.0.1
) else (
    where py >nul 2>&1
    if %errorlevel% equ 0 (
        echo 使用: py -m http.server %PORT% --bind 127.0.0.1
        echo.
        echo 启动成功后，在浏览器打开: http://127.0.0.1:%PORT%
        echo 按 Ctrl+C 可停止服务
        echo ========================================
        py -m http.server %PORT% --bind 127.0.0.1
    ) else (
        echo [错误] 未找到 Python。请先安装 Python 3 并加入 PATH。
        echo 下载: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

pause

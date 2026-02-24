@echo off
chcp 65001 >nul
title AI 服务 - 职业规划智能体
cd /d "%~dp0"

if not exist "AI算法\app.py" (
    echo [错误] 未找到 AI算法\app.py，请确保在项目根目录运行本脚本。
    pause
    exit /b 1
)

echo ========================================
echo   AI 职业规划智能体 - 后端服务
echo ========================================
echo.
echo 正在启动，请稍候...
echo.

cd "AI算法"

where python >nul 2>&1
if %errorlevel% equ 0 (
    echo 使用: python app.py
    echo 启动成功后，服务地址: http://127.0.0.1:5002
    echo 按 Ctrl+C 可停止服务
    echo ========================================
    python app.py
) else (
    where py >nul 2>&1
    if %errorlevel% equ 0 (
        echo 使用: py app.py
        echo 启动成功后，服务地址: http://127.0.0.1:5002
        echo 按 Ctrl+C 可停止服务
        echo ========================================
        py app.py
    ) else (
        echo [错误] 未找到 Python。请先安装 Python 3 并加入 PATH。
        pause
        exit /b 1
    )
)

pause

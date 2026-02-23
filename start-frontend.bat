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
    echo 使用: python -m http.server %PORT%
    echo.
    echo 请在浏览器中依次尝试以下地址（任选一个能打开的即可）:
    echo   http://127.0.0.1:%PORT%
    echo   http://localhost:%PORT%
    echo 若仍打不开，请检查: 控制面板 - 防火墙 - 允许应用 - 勾选 Python
    echo 按 Ctrl+C 可停止服务
    echo ========================================
    python -m http.server %PORT%
) else (
    where py >nul 2>&1
    if %errorlevel% equ 0 (
        echo 使用: py -m http.server %PORT%
        echo.
        echo 请在浏览器中依次尝试以下地址（任选一个能打开的即可）:
        echo   http://127.0.0.1:%PORT%
        echo   http://localhost:%PORT%
        echo 若仍打不开，请检查: 控制面板 - 防火墙 - 允许应用 - 勾选 Python
        echo 按 Ctrl+C 可停止服务
        echo ========================================
        py -m http.server %PORT%
    ) else (
        echo [错误] 未找到 Python。请先安装 Python 3 并加入 PATH。
        echo 下载: https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

pause

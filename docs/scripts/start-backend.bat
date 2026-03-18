@echo off
chcp 65001 >nul
title Java 后端 - 职业规划智能体
rem 本脚本位于 docs/scripts/，先切回项目根目录
cd /d "%~dp0..\.."

if not exist "backend\pom.xml" (
    echo [错误] 未找到 backend\pom.xml，请确保项目目录结构完整。
    pause
    exit /b 1
)

where mvn >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Maven (mvn)。请先安装 Maven 并加入 PATH，或用 IntelliJ IDEA 运行后端。
    echo 参考: https://maven.apache.org/download.cgi
    pause
    exit /b 1
)

echo ========================================
echo   Java 后端 - Spring Boot (5000)
echo ========================================
echo.
echo 正在启动，请稍候...
echo.
echo 启动成功后接口地址:
echo   http://127.0.0.1:5000/api/v1
echo 按 Ctrl+C 可停止服务
echo ========================================

cd backend
mvn spring-boot:run

pause


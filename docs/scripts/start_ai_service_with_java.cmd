@echo off
REM 启动 AI 服务（5002），并设置 JAVA_BACKEND_URL 以打通学生端与 HR 端
REM 先启动 Java 后端 (5000)，再运行本脚本
set JAVA_BACKEND_URL=http://127.0.0.1:5000
set AI_SERVICE_PORT=5002
echo JAVA_BACKEND_URL = %JAVA_BACKEND_URL%
echo 正在启动 AI 服务 (http://localhost:5002) ...
REM 本脚本位于 docs/scripts/，切回项目根目录后进入 AI算法
cd /d "%~dp0..\..\AI算法"
python app.py
pause

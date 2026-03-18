# 启动 AI 服务（5002），并设置 JAVA_BACKEND_URL 以打通学生端与 HR 端
# 使用方式：先启动 Java 后端 (5000)，再运行本脚本
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
$aiDir = Join-Path $root "AI算法"
if (-not (Test-Path $aiDir)) {
    Write-Host "错误: 未找到 AI算法 目录" -ForegroundColor Red
    exit 1
}
$env:JAVA_BACKEND_URL = "http://127.0.0.1:5000"
$env:AI_SERVICE_PORT = "5002"
Write-Host "JAVA_BACKEND_URL = $env:JAVA_BACKEND_URL (HR 学生列表将来自 Java/MySQL)" -ForegroundColor Cyan
Write-Host "正在启动 AI 服务 (http://localhost:5002) ..." -ForegroundColor Cyan
Set-Location $aiDir
python app.py

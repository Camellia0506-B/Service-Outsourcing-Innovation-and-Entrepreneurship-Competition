# 启动 AI 职业规划服务（端口 5002）
# 岗位匹配、测评、岗位画像等依赖此服务
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$aiDir = Join-Path $root "AI算法"
if (-not (Test-Path $aiDir)) {
    Write-Host "错误: 未找到 AI算法 目录" -ForegroundColor Red
    exit 1
}
Write-Host "正在启动 AI 服务 (http://localhost:5002) ..." -ForegroundColor Cyan
Set-Location $aiDir
$env:AI_SERVICE_PORT = "5002"
python app.py

#!/usr/bin/env pwsh
# PDF Agent 流式对话接口测试脚本

$BaseUrl = "http://localhost:8080/api/v1"
$PdfFilePath = "$PSScriptRoot\..\test_sample.pdf"  # 改为实际的 PDF 文件路径

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PDF Agent 流式对话测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. 上传 PDF 文件
Write-Host "`n[1] 上传 PDF 文件..." -ForegroundColor Yellow

# 检查 PDF 文件是否存在
if (-not (Test-Path $PdfFilePath)) {
    Write-Host "错误: PDF 文件不存在: $PdfFilePath" -ForegroundColor Red
    Write-Host "请提供有效的 PDF 文件路径" -ForegroundColor Red
    exit 1
}

try {
    $form = @{}
    $form["file"] = Get-Item -Path $PdfFilePath
    
    $response = Invoke-WebRequest -Uri "$BaseUrl/pdf/upload" `
        -Method POST `
        -Form $form `
        -ContentType "multipart/form-data"
    
    $uploadData = $response.Content | ConvertFrom-Json
    
    if ($uploadData.code -ne 200) {
        Write-Host "上传失败: $($uploadData.msg)" -ForegroundColor Red
        exit 1
    }
    
    $sessionId = $uploadData.data.session_id
    $pageCount = $uploadData.data.page_count
    $filename = $uploadData.data.filename
    
    Write-Host "✓ PDF 上传成功" -ForegroundColor Green
    Write-Host "  Session ID: $sessionId" -ForegroundColor Gray
    Write-Host "  文件名: $filename" -ForegroundColor Gray
    Write-Host "  页数: $pageCount" -ForegroundColor Gray
} catch {
    Write-Host "上传 PDF 失败: $_" -ForegroundColor Red
    exit 1
}

# 2. 测试常规对话接口
Write-Host "`n[2] 测试常规对话接口..." -ForegroundColor Yellow

$chatRequest = @{
    question = "这份文档的主要内容是什么？"
    session_id = $sessionId
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/pdf/chat" `
        -Method POST `
        -Body $chatRequest `
        -ContentType "application/json"
    
    $chatData = $response.Content | ConvertFrom-Json
    
    if ($chatData.code -ne 200) {
        Write-Host "常规对话失败: $($chatData.msg)" -ForegroundColor Red
    } else {
        Write-Host "✓ 常规对话成功" -ForegroundColor Green
        Write-Host "回答: $($chatData.data.answer.Substring(0, [Math]::Min(100, $chatData.data.answer.Length)))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "常规对话请求失败: $_" -ForegroundColor Red
}

# 3. 测试流式对话接口
Write-Host "`n[3] 测试流式对话接口..." -ForegroundColor Yellow

$streamRequest = @{
    question = "这份文档中最重要的信息是什么？"
    session_id = $sessionId
} | ConvertTo-Json

try {
    Write-Host "发送流式请求..." -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Uri "$BaseUrl/pdf/chat/stream" `
        -Method POST `
        -Body $streamRequest `
        -ContentType "application/json"
    
    Write-Host "✓ 流式对话连接成功" -ForegroundColor Green
    Write-Host "流式响应内容:" -ForegroundColor Gray
    
    $content = $response.Content
    $lines = $content -split "`n"
    
    $fullAnswer = ""
    $tokenCount = 0
    
    foreach ($line in $lines) {
        if ($line -match "^data: (.+)$") {
            $token = $matches[1]
            $fullAnswer += $token
            $tokenCount++
            Write-Host -NoNewline $token -ForegroundColor Cyan
        }
    }
    
    Write-Host "`n" -ForegroundColor Cyan
    Write-Host "✓ 流式对话完成" -ForegroundColor Green
    Write-Host "  Token 总数: $tokenCount" -ForegroundColor Gray
    Write-Host "  完整回答长度: $($fullAnswer.Length)" -ForegroundColor Gray
} catch {
    Write-Host "流式对话请求失败: $_" -ForegroundColor Red
}

# 4. 再次测试多轮对话
Write-Host "`n[4] 测试多轮对话..." -ForegroundColor Yellow

$followUpRequest = @{
    question = "能详细解释一下吗？"
    session_id = $sessionId
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/pdf/chat" `
        -Method POST `
        -Body $followUpRequest `
        -ContentType "application/json"
    
    $followUpData = $response.Content | ConvertFrom-Json
    
    if ($followUpData.code -ne 200) {
        Write-Host "多轮对话失败: $($followUpData.msg)" -ForegroundColor Red
    } else {
        Write-Host "✓ 多轮对话成功" -ForegroundColor Green
        Write-Host "回答: $($followUpData.data.answer.Substring(0, [Math]::Min(100, $followUpData.data.answer.Length)))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "多轮对话请求失败: $_" -ForegroundColor Red
}

# 5. 清除会话
Write-Host "`n[5] 清除会话..." -ForegroundColor Yellow

$clearRequest = @{
    session_id = $sessionId
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/pdf/clear" `
        -Method POST `
        -Body $clearRequest `
        -ContentType "application/json"
    
    $clearData = $response.Content | ConvertFrom-Json
    
    if ($clearData.code -ne 200) {
        Write-Host "清除会话失败: $($clearData.msg)" -ForegroundColor Red
    } else {
        Write-Host "✓ 会话已清除" -ForegroundColor Green
    }
} catch {
    Write-Host "清除会话请求失败: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "测试完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
